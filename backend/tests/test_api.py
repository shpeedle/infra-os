import asyncio
import json
from pathlib import Path

from starlette.requests import Request
from starlette.responses import JSONResponse

from backend.app.domain.scene import Scene
from backend.app.main import app, download_artifact, generate, health
from backend.app.services.generation import GenerationError, PublishedArtifacts


class FakeArtifactService:
    def __init__(self, failure: GenerationError | None = None) -> None:
        self.failure = failure

    def generate(self, scene: Scene) -> PublishedArtifacts:
        if self.failure:
            raise self.failure
        return PublishedArtifacts(
            artifact_id="artifact-0123456789abcdef",
            scene_revision=scene.revision,
            scene_digest="0123456789abcdef",
            duration_ms=42,
            object_ids=(scene.room.id, *(entity.id for entity in scene.entities)),
        )

    def path_for(self, artifact_id: str, file_format: str) -> Path | None:
        return None


def scene_payload() -> dict:
    return {
        "schema_version": "1.0",
        "project": {"project_id": "test-project", "name": "Test project", "description": ""},
        "revision": 3,
        "units": "m",
        "coordinate_system": "room-local-south-west",
        "canvas": {"pixels_per_meter": 50, "origin": "south-west"},
        "room": {
            "id": "room-main",
            "type": "room",
            "label": "Test room",
            "position_m": {"x": 0, "y": 0},
            "dimensions_m": {"x": 10, "y": 8, "z": 3},
        },
        "entities": [
            {
                "id": "pdu-a",
                "type": "power",
                "label": "PDU A",
                "position_m": {"x": 1, "y": 3},
                "dimensions_m": {"x": 1, "y": 1, "z": 2},
                "capacity_kw": 20,
            },
            {
                "id": "rack-01",
                "type": "rack",
                "label": "Rack 01",
                "position_m": {"x": 4, "y": 3},
                "dimensions_m": {"x": 0.6, "y": 1.1, "z": 2},
                "rack_u": 42,
                "power_draw_kw": 4,
            },
        ],
        "connections": [
            {
                "id": "power-a-rack-01",
                "type": "power",
                "source_id": "pdu-a",
                "target_id": "rack-01",
            }
        ],
    }


def make_request(
    body: bytes, path: str = "/generate", headers: dict[str, str] | None = None
) -> Request:
    body_consumed = False

    async def receive() -> dict[str, object]:
        nonlocal body_consumed
        if body_consumed:
            return {"type": "http.disconnect"}
        body_consumed = True
        return {"type": "http.request", "body": body, "more_body": False}

    scope = {
        "type": "http",
        "method": "POST",
        "path": path,
        "raw_path": path.encode(),
        "query_string": b"",
        "headers": [
            (key.lower().encode(), value.encode())
            for key, value in (headers or {"content-type": "application/json"}).items()
        ],
        "app": app,
        "server": ("test", 80),
        "client": ("test", 1234),
        "scheme": "http",
    }
    return Request(scope, receive)


async def invoke_generate(body: bytes, headers: dict[str, str] | None = None):
    return await generate(make_request(body, headers=headers))


def response_status(response: object) -> int:
    return getattr(response, "status_code", 200)


def response_json(response: object) -> dict:
    if isinstance(response, JSONResponse):
        return json.loads(response.body)
    return response.model_dump(mode="json")


def test_health_reports_local_prototype_status() -> None:
    response = asyncio.run(health())

    assert response.status == "ok"
    assert response.service == "infra-os-api"
    assert response.artifact_storage == "local"


def test_generate_returns_artifact_metadata_and_urls() -> None:
    app.state.artifact_service = FakeArtifactService()
    response = asyncio.run(invoke_generate(json.dumps(scene_payload()).encode()))

    assert response_status(response) == 200
    body = response_json(response)
    assert body["scene_revision"] == 3
    assert body["formats"][0]["download_url"] == "/artifacts/artifact-0123456789abcdef/step"
    assert body["formats"][1]["role"] == "browser-preview"


def test_malformed_and_semantically_invalid_scenes_have_actionable_errors() -> None:
    app.state.artifact_service = FakeArtifactService()
    malformed = asyncio.run(invoke_generate(b'{"schema_version":"9.0"}'))
    assert response_status(malformed) == 422
    assert response_json(malformed)["error"]["code"] == "scene_malformed"

    invalid_payload = scene_payload()
    invalid_payload["connections"] = []
    invalid = asyncio.run(invoke_generate(json.dumps(invalid_payload).encode()))
    assert response_status(invalid) == 422
    assert response_json(invalid)["error"]["code"] == "scene_invalid"
    assert "disconnected" in response_json(invalid)["error"]["issues"][0]["message"]


def test_oversized_input_and_generation_failure_are_distinguished() -> None:
    oversized = asyncio.run(
        invoke_generate(
            b"",
            headers={"content-type": "application/json", "content-length": "512001"},
        )
    )
    assert response_status(oversized) == 413
    assert response_json(oversized)["error"]["code"] == "scene_too_large"

    app.state.artifact_service = FakeArtifactService(
        GenerationError(
            "cadquery_unavailable",
            "CadQuery is not installed in the configured Python environment.",
        )
    )
    failed = asyncio.run(invoke_generate(json.dumps(scene_payload()).encode()))
    assert response_status(failed) == 503
    assert response_json(failed)["error"]["code"] == "cadquery_unavailable"


def test_missing_and_unsupported_artifacts_are_safe() -> None:
    app.state.artifact_service = FakeArtifactService()
    unsupported = asyncio.run(
        download_artifact("artifact-0123456789abcdef", "iges", make_request(b"", "/artifacts"))
    )
    missing = asyncio.run(
        download_artifact("artifact-0123456789abcdef", "glb", make_request(b"", "/artifacts"))
    )

    assert response_status(unsupported) == 422
    assert response_json(unsupported)["error"]["code"] == "unsupported_format"
    assert response_status(missing) == 404
    assert response_json(missing)["error"]["code"] == "artifact_not_found"

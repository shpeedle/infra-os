"""FastAPI entrypoint for the synchronous scene-to-CAD prototype."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from backend.app.api.models import (
    ArtifactFormatResponse,
    ErrorBody,
    ErrorResponse,
    GenerateResponse,
    HealthResponse,
    ValidationIssueResponse,
)
from backend.app.domain.scene import MAX_SCENE_BYTES, Scene, SceneIssue, validate_scene
from backend.app.services.generation import (
    GENERATOR_VERSION,
    SUPPORTED_FORMATS,
    ArtifactService,
    GenerationError,
)

app = FastAPI(
    title="Infra OS API",
    version="0.1.0",
    description="Validate data-center scenes and generate local STEP/GLB artifacts.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.state.artifact_service = ArtifactService()


@app.exception_handler(RequestValidationError)
async def request_validation_error(_: Request, exception: RequestValidationError) -> JSONResponse:
    issues = [
        ValidationIssueResponse(path=_format_error_path(error.get("loc", ())), message=error["msg"])
        for error in exception.errors()
    ]
    return _error_response(
        422, "scene_malformed", "The request is not a valid scene contract.", issues
    )


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="infra-os-api", artifact_storage="local")


@app.post("/generate", response_model=GenerateResponse, responses={413: {"model": ErrorResponse}})
async def generate(request: Request) -> GenerateResponse | JSONResponse:
    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            too_large = int(content_length) > MAX_SCENE_BYTES
        except ValueError:
            too_large = True
        if too_large:
            return _error_response(
                413,
                "scene_too_large",
                f"Scene JSON must be smaller than {MAX_SCENE_BYTES:,} bytes.",
            )
    body = await request.body()
    if len(body) > MAX_SCENE_BYTES:
        return _error_response(
            413,
            "scene_too_large",
            f"Scene JSON must be smaller than {MAX_SCENE_BYTES:,} bytes.",
        )
    try:
        scene = Scene.model_validate_json(body)
    except ValueError as exception:
        issues = [
            ValidationIssueResponse(
                path=_format_error_path(error.get("loc", ())), message=error["msg"]
            )
            for error in getattr(exception, "errors", lambda: [])()
        ]
        return _error_response(
            422,
            "scene_malformed",
            "The request is not a valid scene contract.",
            issues,
        )
    issues = validate_scene(scene)
    if issues:
        return _error_response(
            422,
            "scene_invalid",
            "The scene has validation issues that must be fixed before CAD generation.",
            [_issue_response(issue) for issue in issues],
        )

    service: ArtifactService = request.app.state.artifact_service
    try:
        # Generation is intentionally synchronous in the prototype. The subprocess
        # has a bounded timeout and publishes only complete artifacts.
        artifacts = service.generate(scene)
    except GenerationError as exception:
        status_code = {
            "generation_timeout": 504,
            "cadquery_unavailable": 503,
            "generator_unavailable": 503,
            "generator_invalid_scene": 422,
        }.get(exception.code, 500)
        return _error_response(status_code, exception.code, exception.message)

    return GenerateResponse(
        artifact_id=artifacts.artifact_id,
        scene_revision=artifacts.scene_revision,
        scene_digest=artifacts.scene_digest,
        generator_version=GENERATOR_VERSION,
        duration_ms=artifacts.duration_ms,
        formats=[
            ArtifactFormatResponse(
                format="step",
                role="engineering",
                units="mm",
                download_url=f"/artifacts/{artifacts.artifact_id}/step",
            ),
            ArtifactFormatResponse(
                format="glb",
                role="browser-preview",
                units="mm",
                download_url=f"/artifacts/{artifacts.artifact_id}/glb",
            ),
        ],
    )


@app.get("/artifacts/{artifact_id}/{file_format}", response_model=None)
async def download_artifact(
    artifact_id: str, file_format: str, request: Request
) -> FileResponse | JSONResponse:
    if file_format not in SUPPORTED_FORMATS:
        return _error_response(
            422,
            "unsupported_format",
            "Artifact format must be one of: step, glb.",
        )
    service: ArtifactService = request.app.state.artifact_service
    path = service.path_for(artifact_id, file_format)
    if path is None:
        return _error_response(
            404, "artifact_not_found", "The requested artifact is not available."
        )
    media_type = "application/step" if file_format == "step" else "model/gltf-binary"
    return FileResponse(path, media_type=media_type, filename=f"{artifact_id}.{file_format}")


def _issue_response(issue: SceneIssue) -> ValidationIssueResponse:
    return ValidationIssueResponse(path=issue.path, message=issue.message)


def _format_error_path(location: tuple[Any, ...]) -> str:
    path_parts: list[str] = []
    for part in location:
        if part in {"body", "scene"}:
            continue
        if isinstance(part, int):
            path_parts.append(f"[{part}]")
        elif path_parts:
            path_parts.append(f".{part}")
        else:
            path_parts.append(str(part))
    return "".join(path_parts) or "scene"


def _error_response(
    status_code: int,
    code: str,
    message: str,
    issues: list[ValidationIssueResponse] | None = None,
) -> JSONResponse:
    body = ErrorResponse(error=ErrorBody(code=code, message=message, issues=issues or []))
    return JSONResponse(status_code=status_code, content=body.model_dump(mode="json"))

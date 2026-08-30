"""Synchronous CadQuery orchestration and safe local artifact publication."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import uuid
from dataclasses import dataclass
from pathlib import Path

from backend.app.domain.scene import Scene, scene_digest

GENERATOR_VERSION = "prototype-0.1"
SUPPORTED_FORMATS = ("step", "glb")


class GenerationError(RuntimeError):
    """A safe, user-facing generation failure without process details."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class PublishedArtifacts:
    artifact_id: str
    scene_revision: int
    scene_digest: str
    duration_ms: int
    object_ids: tuple[str, ...]


class ArtifactService:
    """Run the isolated generator and publish only complete artifacts."""

    def __init__(
        self,
        artifact_root: Path | None = None,
        generator_script: Path | None = None,
        timeout_seconds: float | None = None,
        python_executable: str | None = None,
    ) -> None:
        project_root = Path(__file__).resolve().parents[3]
        self.artifact_root = artifact_root or project_root / "artifacts"
        self.generator_script = generator_script or project_root / "cadquery" / "generate.py"
        self.timeout_seconds = (
            timeout_seconds if timeout_seconds is not None else _configured_timeout()
        )
        self.python_executable = python_executable or sys.executable
        self.artifact_root.mkdir(parents=True, exist_ok=True)

    def generate(self, scene: Scene) -> PublishedArtifacts:
        artifact_id = f"artifact-{uuid.uuid4().hex[:16]}"
        digest = scene_digest(scene)
        object_ids = tuple(
            [scene.room.id]
            + [entity.id for entity in scene.entities]
            + [connection.id for connection in scene.connections]
        )
        temp_dir = Path(tempfile.mkdtemp(prefix=f"{artifact_id}-", dir=self.artifact_root))
        published_dir = self.artifact_root / artifact_id
        scene_path = temp_dir / "scene.json"
        step_path = temp_dir / "model.step"
        glb_path = temp_dir / "model.glb"
        metadata_path = temp_dir / "generator-metadata.json"
        scene_path.write_text(scene.model_dump_json(indent=2), encoding="utf-8")

        command = [
            self.python_executable,
            str(self.generator_script),
            str(scene_path),
            str(temp_dir),
            str(step_path),
            str(glb_path),
            str(metadata_path),
        ]

        start_time = _monotonic_seconds()
        try:
            completed = subprocess.run(
                command,
                check=False,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=self.timeout_seconds,
            )
        except subprocess.TimeoutExpired as exc:
            _remove_directory(temp_dir)
            raise GenerationError(
                "generation_timeout",
                f"CAD generation exceeded the {self.timeout_seconds:g}-second limit. Retry when the generator is available.",
            ) from exc
        except OSError as exc:
            _remove_directory(temp_dir)
            raise GenerationError(
                "generator_unavailable",
                "The CAD generator process could not be started. Check the CadQuery environment.",
            ) from exc

        if completed.returncode != 0:
            _remove_directory(temp_dir)
            if completed.returncode == 2:
                raise GenerationError(
                    "cadquery_unavailable",
                    "CadQuery is not installed in the configured Python environment.",
                )
            if completed.returncode == 3:
                raise GenerationError(
                    "generator_invalid_scene",
                    "The CAD generator rejected the validated scene contract.",
                )
            raise GenerationError(
                "generation_failed",
                "CAD generation failed before complete STEP and GLB artifacts were produced.",
            )

        if not _is_valid_step(step_path) or not _is_valid_glb(glb_path):
            _remove_directory(temp_dir)
            raise GenerationError(
                "incomplete_artifacts",
                "The generator did not produce complete STEP and GLB artifacts.",
            )

        duration_ms = max(1, round((_monotonic_seconds() - start_time) * 1000))
        metadata = {
            "artifact_id": artifact_id,
            "scene_revision": scene.revision,
            "scene_digest": digest,
            "generator_version": GENERATOR_VERSION,
            "units": "mm",
            "object_ids": list(object_ids),
            "formats": ["step", "glb"],
        }
        try:
            metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
            published_dir.mkdir(parents=True, exist_ok=False)
            os.replace(step_path, published_dir / "model.step")
            os.replace(glb_path, published_dir / "model.glb")
            os.replace(metadata_path, published_dir / "metadata.json")
        except OSError as exc:
            _remove_directory(published_dir)
            _remove_directory(temp_dir)
            raise GenerationError(
                "artifact_publish_failed",
                "The generated artifacts could not be published to local storage.",
            ) from exc

        _remove_directory(temp_dir)
        return PublishedArtifacts(
            artifact_id=artifact_id,
            scene_revision=scene.revision,
            scene_digest=digest,
            duration_ms=duration_ms,
            object_ids=object_ids,
        )

    def path_for(self, artifact_id: str, file_format: str) -> Path | None:
        """Resolve only generated IDs and known formats to local files."""

        if not artifact_id.startswith("artifact-") or len(artifact_id) != len("artifact-") + 16:
            return None
        if any(
            character not in "abcdefghijklmnopqrstuvwxyz0123456789-" for character in artifact_id
        ):
            return None
        if file_format not in SUPPORTED_FORMATS:
            return None
        path = self.artifact_root / artifact_id / f"model.{file_format}"
        return path if path.is_file() else None


def _configured_timeout() -> float:
    raw_value = os.environ.get("INFRA_CAD_TIMEOUT_SECONDS", "120")
    try:
        value = float(raw_value)
    except ValueError:
        return 120.0
    return min(max(value, 1.0), 600.0)


def _monotonic_seconds() -> float:
    # Kept in one function so deterministic tests can replace the clock at the boundary.
    import time

    return time.monotonic()


def _is_valid_step(path: Path) -> bool:
    if not path.is_file() or path.stat().st_size == 0:
        return False
    header = path.read_bytes()[:4096]
    return b"ISO-10303" in header or b"HEADER;" in header


def _is_valid_glb(path: Path) -> bool:
    return path.is_file() and path.stat().st_size > 20 and path.read_bytes()[:4] == b"glTF"


def _remove_directory(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)

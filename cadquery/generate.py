"""Generate a simple deterministic CadQuery assembly from a scene JSON file.

Usage:
    python3 cadquery/generate.py examples/seeded-scene.json artifacts/dev

The API supplies explicit output paths so it can publish files atomically. The
short CLI form is useful for the geometry-proof phase and local inspection.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    import cadquery as cq
except ModuleNotFoundError:
    cq = None

from backend.app.domain.scene import Scene, validate_scene  # noqa: E402

FLOOR_THICKNESS_MM = 120.0
CONNECTION_SIZE_MM = 35.0


def build_assembly(scene: Scene):
    """Build one assembly whose top-level child names are stable scene IDs."""

    if cq is None:
        raise RuntimeError("CadQuery is not installed")

    room_width_mm = scene.room.dimensions_m.x * 1000
    room_depth_mm = scene.room.dimensions_m.y * 1000
    floor = (
        cq.Workplane("XY")
        .box(room_width_mm, room_depth_mm, FLOOR_THICKNESS_MM)
        .translate((room_width_mm / 2, room_depth_mm / 2, -FLOOR_THICKNESS_MM / 2))
    )
    assembly = cq.Assembly(name=scene.project.project_id)
    assembly.add(floor, name=scene.room.id, color=cq.Color(0.68, 0.71, 0.75))

    entity_by_id = {entity.id: entity for entity in scene.entities}
    for entity in scene.entities:
        center = _entity_center_mm(entity)
        dimensions = _dimensions_mm(
            entity.dimensions_m.x, entity.dimensions_m.y, entity.dimensions_m.z
        )
        if entity.type == "rack":
            shape = build_rack(dimensions)
            color = cq.Color(0.14, 0.19, 0.25)
        else:
            shape = build_power_node(dimensions)
            color = cq.Color(0.72, 0.29, 0.12)
        assembly.add(shape, loc=cq.Location(cq.Vector(*center)), name=entity.id, color=color)

    for connection in scene.connections:
        source = entity_by_id[connection.source_id]
        target = entity_by_id[connection.target_id]
        shape, center = build_power_connection(source, target)
        assembly.add(
            shape,
            loc=cq.Location(cq.Vector(*center)),
            name=connection.id,
            color=cq.Color(0.92, 0.63, 0.12),
        )

    return assembly


def build_rack(dimensions_mm: tuple[float, float, float]):
    """Build a deliberately simple standard rack envelope."""

    width_mm, depth_mm, height_mm = dimensions_mm
    return cq.Workplane("XY").box(width_mm, depth_mm, height_mm)


def build_power_node(dimensions_mm: tuple[float, float, float]):
    """Build a compact power-equipment envelope."""

    width_mm, depth_mm, height_mm = dimensions_mm
    return cq.Workplane("XY").box(width_mm, depth_mm, height_mm)


def build_power_connection(source, target):
    source_x, source_y, _ = _entity_center_mm(source)
    target_x, target_y, _ = _entity_center_mm(target)
    delta_x = target_x - source_x
    delta_y = target_y - source_y
    length = math.hypot(delta_x, delta_y)
    if length <= 0:
        raise ValueError("Power connection endpoints must not overlap")
    angle = math.degrees(math.atan2(delta_y, delta_x))
    shape = cq.Workplane("XY").box(length, CONNECTION_SIZE_MM, CONNECTION_SIZE_MM)
    shape = shape.rotate((0, 0, 0), (0, 0, 1), angle)
    center = ((source_x + target_x) / 2, (source_y + target_y) / 2, 650.0)
    return shape, center


def _dimensions_mm(width_m: float, depth_m: float, height_m: float) -> tuple[float, float, float]:
    return width_m * 1000, depth_m * 1000, height_m * 1000


def _entity_center_mm(entity) -> tuple[float, float, float]:
    return (
        (entity.position_m.x + entity.dimensions_m.x / 2) * 1000,
        (entity.position_m.y + entity.dimensions_m.y / 2) * 1000,
        entity.dimensions_m.z * 500,
    )


def generate(
    scene_path: Path,
    step_path: Path,
    glb_path: Path,
    metadata_path: Path,
) -> int:
    """Validate, build, and export the two requested files."""

    if cq is None:
        return 2
    try:
        scene = Scene.model_validate_json(scene_path.read_bytes())
    except Exception:
        return 3
    if validate_scene(scene):
        return 3

    try:
        step_path.parent.mkdir(parents=True, exist_ok=True)
        assembly = build_assembly(scene)
        assembly.export(str(step_path), exportType="STEP", unit="MM", outputUnit="MM")
        assembly.export(str(glb_path), tolerance=0.2, angularTolerance=0.1)
        metadata_path.write_text(
            json.dumps(
                {
                    "scene_revision": scene.revision,
                    "units": "mm",
                    "object_ids": [
                        scene.room.id,
                        *[entity.id for entity in scene.entities],
                        *[connection.id for connection in scene.connections],
                    ],
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
    except Exception:
        return 4
    return 0


def main(arguments: list[str]) -> int:
    if len(arguments) == 2:
        scene_path = Path(arguments[0])
        output_dir = Path(arguments[1])
        return generate(
            scene_path,
            output_dir / "model.step",
            output_dir / "model.glb",
            output_dir / "generator-metadata.json",
        )
    if len(arguments) == 5:
        return generate(
            Path(arguments[0]),
            Path(arguments[2]),
            Path(arguments[3]),
            Path(arguments[4]),
        )
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

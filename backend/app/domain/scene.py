"""The versioned scene contract shared by the API and CAD generator.

The scene is expressed in metres in a room-local coordinate system. Positions
are the south-west lower-left corner of an object in the room's XY plane. The
CadQuery boundary converts these values to millimetres; the frontend converts
them to ReactFlow pixels using the scene's ``pixels_per_meter`` value.
"""

from __future__ import annotations

import hashlib
import json
from typing import Annotated, Literal, TypeAlias

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

SCHEMA_VERSION = "1.0"
MAX_SCENE_BYTES = 512_000
MAX_ENTITIES = 100
MAX_CONNECTIONS = 200

EntityId: TypeAlias = Annotated[
    str,
    StringConstraints(
        min_length=2,
        max_length=64,
        pattern=r"^[A-Za-z][A-Za-z0-9_-]{1,63}$",
    ),
]


class StrictModel(BaseModel):
    """Reject accidental fields at the external scene boundary."""

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        validate_assignment=True,
    )


class ProjectMetadata(StrictModel):
    project_id: EntityId
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)


class Point2D(StrictModel):
    x: float = Field(ge=0, le=100, allow_inf_nan=False)
    y: float = Field(ge=0, le=100, allow_inf_nan=False)


class Dimensions(StrictModel):
    x: float = Field(gt=0, le=100, allow_inf_nan=False)
    y: float = Field(gt=0, le=100, allow_inf_nan=False)
    z: float = Field(gt=0, le=20, allow_inf_nan=False)


class CanvasMetadata(StrictModel):
    pixels_per_meter: float = Field(gt=1, le=500, allow_inf_nan=False)
    origin: Literal["south-west"] = "south-west"


class Room(StrictModel):
    id: EntityId
    type: Literal["room"] = "room"
    label: str = Field(min_length=1, max_length=120)
    position_m: Point2D
    dimensions_m: Dimensions


class Rack(StrictModel):
    id: EntityId
    type: Literal["rack"] = "rack"
    label: str = Field(min_length=1, max_length=120)
    position_m: Point2D
    dimensions_m: Dimensions
    rack_u: int = Field(ge=1, le=60)
    power_draw_kw: float = Field(ge=0, le=1000, allow_inf_nan=False)


class PowerNode(StrictModel):
    id: EntityId
    type: Literal["power"] = "power"
    label: str = Field(min_length=1, max_length=120)
    position_m: Point2D
    dimensions_m: Dimensions
    capacity_kw: float = Field(gt=0, le=10_000, allow_inf_nan=False)


SceneEntity: TypeAlias = Annotated[
    Rack | PowerNode,
    Field(discriminator="type"),
]


class PowerConnection(StrictModel):
    id: EntityId
    type: Literal["power"] = "power"
    source_id: EntityId
    target_id: EntityId


class Scene(StrictModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    project: ProjectMetadata
    revision: int = Field(ge=0, le=2_000_000_000)
    units: Literal["m"] = "m"
    coordinate_system: Literal["room-local-south-west"] = "room-local-south-west"
    canvas: CanvasMetadata
    room: Room
    entities: list[SceneEntity] = Field(default_factory=list, max_length=MAX_ENTITIES)
    connections: list[PowerConnection] = Field(default_factory=list, max_length=MAX_CONNECTIONS)


class SceneIssue(StrictModel):
    path: str
    message: str


def validate_scene(scene: Scene) -> list[SceneIssue]:
    """Apply cross-field scene invariants after Pydantic shape validation."""

    issues: list[SceneIssue] = []
    room = scene.room
    room_ids = {room.id}

    if room.position_m.x != 0 or room.position_m.y != 0:
        issues.append(
            SceneIssue(
                path="room.position_m",
                message="The fixed room must start at the room-local south-west origin (0, 0).",
            )
        )

    entity_by_id: dict[str, SceneEntity] = {}
    for index, entity in enumerate(scene.entities):
        path = f"entities[{index}]"
        if entity.id in room_ids or entity.id in entity_by_id:
            issues.append(
                SceneIssue(path=f"{path}.id", message=f"Entity ID '{entity.id}' is not unique.")
            )
            continue

        entity_by_id[entity.id] = entity
        if entity.position_m.x + entity.dimensions_m.x > room.dimensions_m.x:
            issues.append(
                SceneIssue(
                    path=f"{path}.position_m.x",
                    message=f"{entity.id} extends beyond the room width of {room.dimensions_m.x:g} m.",
                )
            )
        if entity.position_m.y + entity.dimensions_m.y > room.dimensions_m.y:
            issues.append(
                SceneIssue(
                    path=f"{path}.position_m.y",
                    message=f"{entity.id} extends beyond the room depth of {room.dimensions_m.y:g} m.",
                )
            )
        if entity.dimensions_m.z > room.dimensions_m.z:
            issues.append(
                SceneIssue(
                    path=f"{path}.dimensions_m.z",
                    message=f"{entity.id} is taller than the room height of {room.dimensions_m.z:g} m.",
                )
            )

    connection_ids: set[str] = set()
    pairs: set[tuple[str, str]] = set()
    rack_sources: dict[str, list[str]] = {
        entity.id: [] for entity in scene.entities if entity.type == "rack"
    }
    power_targets: dict[str, list[Rack]] = {
        entity.id: [] for entity in scene.entities if entity.type == "power"
    }

    for index, connection in enumerate(scene.connections):
        path = f"connections[{index}]"
        if (
            connection.id in room_ids
            or connection.id in entity_by_id
            or connection.id in connection_ids
        ):
            issues.append(
                SceneIssue(
                    path=f"{path}.id",
                    message=f"Connection ID '{connection.id}' is not unique.",
                )
            )
        connection_ids.add(connection.id)

        pair = (connection.source_id, connection.target_id)
        if pair in pairs:
            issues.append(
                SceneIssue(
                    path=path,
                    message="Duplicate power connections between the same source and target are not allowed.",
                )
            )
        pairs.add(pair)

        source = entity_by_id.get(connection.source_id)
        target = entity_by_id.get(connection.target_id)
        if source is None:
            issues.append(
                SceneIssue(
                    path=f"{path}.source_id",
                    message=f"Source entity '{connection.source_id}' does not exist.",
                )
            )
        if target is None:
            issues.append(
                SceneIssue(
                    path=f"{path}.target_id",
                    message=f"Target entity '{connection.target_id}' does not exist.",
                )
            )
        if source is None or target is None:
            continue
        if source.type != "power" or target.type != "rack":
            issues.append(
                SceneIssue(
                    path=path,
                    message="Power connections must run from a power node to a rack.",
                )
            )
            continue
        rack_sources[target.id].append(source.id)
        power_targets[source.id].append(target)

    for index, entity in enumerate(scene.entities):
        if entity.type == "rack" and len(rack_sources[entity.id]) == 0:
            issues.append(
                SceneIssue(
                    path=f"entities[{index}].id",
                    message=f"Rack '{entity.id}' is disconnected; connect it to a power node before generating CAD.",
                )
            )
        if entity.type == "rack" and len(rack_sources[entity.id]) > 1:
            issues.append(
                SceneIssue(
                    path=f"entities[{index}].id",
                    message=f"Rack '{entity.id}' has more than one power connection in the prototype.",
                )
            )
        if entity.type == "power" and len(power_targets[entity.id]) == 0:
            issues.append(
                SceneIssue(
                    path=f"entities[{index}].id",
                    message=f"Power node '{entity.id}' is disconnected.",
                )
            )
        if entity.type == "power":
            load_kw = sum(rack.power_draw_kw for rack in power_targets[entity.id])
            if load_kw > entity.capacity_kw:
                issues.append(
                    SceneIssue(
                        path=f"entities[{index}].capacity_kw",
                        message=(
                            f"Power node '{entity.id}' carries {load_kw:g} kW, exceeding its "
                            f"{entity.capacity_kw:g} kW capacity."
                        ),
                    )
                )

    return issues


def scene_digest(scene: Scene) -> str:
    """Return a short deterministic identity for the exact validated scene."""

    canonical = json.dumps(
        scene.model_dump(mode="json"),
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()[:16]

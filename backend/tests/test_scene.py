import json
from pathlib import Path

from backend.app.domain.scene import Scene, validate_scene

EXAMPLE_PATH = Path(__file__).parents[2] / "examples" / "seeded-scene.json"


def load_example() -> Scene:
    return Scene.model_validate_json(EXAMPLE_PATH.read_bytes())


def test_seeded_scene_is_valid_and_preserves_stable_ids() -> None:
    scene = load_example()

    assert validate_scene(scene) == []
    assert scene.room.id == "room-main"
    assert {entity.id for entity in scene.entities} >= {"pdu-a", "rack-01", "rack-06"}
    assert scene.connections[0].source_id == "pdu-a"


def test_disconnected_rack_and_power_capacity_are_reported() -> None:
    scene = load_example()
    scene.entities[2].power_draw_kw = 31
    scene.connections = scene.connections[:-1]

    messages = [issue.message for issue in validate_scene(scene)]

    assert any("rack-06" in message and "disconnected" in message for message in messages)
    assert any("pdu-a" in message and "capacity" in message for message in messages)


def test_out_of_bounds_and_duplicate_ids_are_rejected() -> None:
    scene = load_example()
    scene.entities[2].id = scene.entities[0].id
    scene.entities[3].position_m.x = 23.8

    issues = validate_scene(scene)
    paths = {issue.path for issue in issues}

    assert "entities[2].id" in paths
    assert any("beyond the room width" in issue.message for issue in issues)


def test_connection_ids_cannot_collide_with_scene_ids() -> None:
    scene = load_example()
    scene.connections[0].id = scene.entities[0].id

    issues = validate_scene(scene)

    assert any(
        "Connection ID" in issue.message and "not unique" in issue.message for issue in issues
    )


def test_contract_rejects_unknown_fields() -> None:
    payload = json.loads(EXAMPLE_PATH.read_text(encoding="utf-8"))
    payload["unexpected"] = True

    try:
        Scene.model_validate(payload)
    except ValueError as exception:
        assert "unexpected" in str(exception)
    else:
        raise AssertionError("Unknown scene fields must be rejected")

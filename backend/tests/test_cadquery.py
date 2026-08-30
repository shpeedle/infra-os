import importlib.util
from pathlib import Path

import pytest

from backend.app.domain.scene import Scene

GENERATOR_PATH = Path(__file__).parents[2] / "cadquery" / "generate.py"
cad_generator_spec = importlib.util.spec_from_file_location(
    "infra_os_cad_generator", GENERATOR_PATH
)
if cad_generator_spec is None or cad_generator_spec.loader is None:
    raise RuntimeError("Could not load the CadQuery generator module")
cad_generator = importlib.util.module_from_spec(cad_generator_spec)
cad_generator_spec.loader.exec_module(cad_generator)

EXAMPLE_PATH = Path(__file__).parents[2] / "examples" / "seeded-scene.json"


def load_example() -> Scene:
    return Scene.model_validate_json(EXAMPLE_PATH.read_bytes())


def test_seeded_assembly_has_stable_objects_and_expected_placements() -> None:
    pytest.importorskip("cadquery")
    scene = load_example()
    assembly = cad_generator.build_assembly(scene)

    assert scene.room.id in assembly.objects
    assert {entity.id for entity in scene.entities} <= set(assembly.objects)
    assert {connection.id for connection in scene.connections} <= set(assembly.objects)
    assert assembly.objects["rack-01"].loc.toTuple()[0] == pytest.approx((5300, 9050, 1000))
    assert assembly.objects["rack-06"].loc.toTuple()[0] == pytest.approx((9300, 2850, 1000))

    room_box = assembly.objects[scene.room.id].obj.val().BoundingBox()
    assert room_box.xmax == pytest.approx(24000)
    assert room_box.ymax == pytest.approx(12000)


def test_generator_writes_step_and_glb(tmp_path: Path) -> None:
    pytest.importorskip("cadquery")
    step_path = tmp_path / "model.step"
    glb_path = tmp_path / "model.glb"
    metadata_path = tmp_path / "generator-metadata.json"

    result = cad_generator.generate(EXAMPLE_PATH, step_path, glb_path, metadata_path)

    assert result == 0
    assert step_path.read_bytes().startswith(b"ISO-10303-21;")
    assert glb_path.read_bytes()[:4] == b"glTF"
    assert "rack-01" in metadata_path.read_text(encoding="utf-8")

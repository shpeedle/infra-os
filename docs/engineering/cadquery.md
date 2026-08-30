# CadQuery Engineering

CadQuery is the geometry engine and the source of engineering CAD artifacts. It
must remain independent from ReactFlow and HTTP details.

## Input Boundary

The generator accepts only a validated, versioned scene contract. It should not
consume raw ReactFlow nodes, browser state, or arbitrary filesystem paths.

The initial contract uses a documented 2D grid-to-meter mapping. CadQuery
builders use explicit engineering units; the export boundary writes STEP in
millimeters and emits GLB for browser viewing. Never pass a bare number across a
unit boundary without documenting its unit.

## Deterministic Assemblies

- Generate the same geometry for the same scene revision and generator version.
- Use stable scene entity IDs as assembly object names or metadata where the
  CadQuery exporter supports it.
- Keep builders small and parametric: room/floor, standard 42U rack, power
  equipment, and optional connection visualization for the first slice.
- Keep topology and operational calculations out of geometry builders.
- Reject invalid dimensions, unsupported entity types, missing references, and
  out-of-bounds placements before geometry construction.

## Outputs

Produce both artifacts from one generated assembly:

- **STEP:** engineering source artifact for commercial CAD workflows.
- **GLB:** tessellated browser preview for the web viewer.

CadQuery builders use an XY floor with Z up. The GLB export applies the standard
glTF Y-up scene transform; browser viewers must use that exported orientation
when framing the model.

Write to a unique temporary/artifact directory and publish only completed files.
Associate each output with the scene revision, generator version, artifact ID,
format, and units. Do not trust user-provided filenames.

## Verification

CadQuery tests should verify:

- valid STEP and GLB files are produced;
- room and rack dimensions use the intended units;
- object counts and stable IDs are present;
- placements match the scene coordinate mapping;
- invalid scenes fail before partial output is presented;
- changing one rack position changes the expected object placement without
  unexpectedly changing unrelated objects.

Use representative scenes and inspect generated artifacts when changing
tessellation, assembly structure, or export settings.

The prototype implementation is `cadquery/generate.py`. It can be run directly
with `.venv/bin/python cadquery/generate.py examples/seeded-scene.json
artifacts/prototype-proof`, or is invoked by the FastAPI generation service in
a bounded subprocess. The output directory contains `model.step`, `model.glb`,
and `generator-metadata.json`; the service publishes those files atomically
under a generated artifact ID after checking their signatures.

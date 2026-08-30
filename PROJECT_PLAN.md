# Data Center Digital Twin MVP

## Summary

Build a small end-to-end vertical slice:

1. React/TypeScript ReactFlow editor
2. Seeded data-center diagram with rooms, racks, power nodes, and connections
3. Explicit “Generate CAD” action
4. FastAPI validates the diagram and invokes CadQuery
5. CadQuery produces engineering-grade STEP plus browser-ready GLB
6. React displays the GLB in an embedded orbit viewer

CadQuery supports both STEP and GLB assembly export, allowing STEP to remain the engineering artifact while GLB serves web visualization. See the [CadQuery export documentation](https://cadquery.readthedocs.io/en/latest/importexport.html).

## Implementation Changes

### Project foundation

Use a simple repository structure:

- `frontend/`: Vite, React, TypeScript, ReactFlow, and a WebGL viewer such as `@react-three/fiber`/`@react-three/drei`
- `backend/`: FastAPI service and Pydantic scene contracts
- `cadquery/`: Python geometry generator and component builders
- `examples/`: seeded scene JSON
- `artifacts/`: local generated STEP/GLB files during development

Add development documentation covering installation, running the frontend/backend, and the required CadQuery environment.

For TypeScript service and boundary code, use Effect where typed failures,
runtime decoding, retries, cancellation, structured concurrency, resource
cleanup, dependency injection, or observability make the workflow safer. Keep
ordinary React rendering and simple local UI state in plain React/TypeScript.

Use ESLint and Prettier for TypeScript/frontend code and Ruff for Python linting
and formatting. Keep the configuration simple and run formatting checks in the
normal development workflow.

### 2D schematic editor

Implement one seeded project containing:

- One fixed rectangular data-center room
- Several rack nodes positioned on a grid
- One or more upstream power nodes
- Power edges connecting racks to upstream nodes
- Basic node properties: ID, label, position, rack height, power draw, and dimensions

Support:

- Dragging and repositioning racks
- Adding/removing racks
- Connecting and deleting power edges
- Selecting a node and editing its basic properties
- Exporting/importing the scene as JSON
- Clear validation errors for disconnected or malformed nodes

Use stable entity IDs shared by the diagram and generated CAD assembly. ReactFlow coordinates should map to meters through one documented scale, with the room dimensions represented explicitly in the scene metadata.

### Scene contract and synchronization

Define a versioned JSON scene contract shared by frontend, FastAPI, and CadQuery. It should contain:

- Scene/project metadata and schema version
- Room dimensions
- Entity list
- Entity type and stable ID
- 2D position and dimensions
- Engineering properties such as rack U-height and power draw
- Connection list with source and target IDs

Synchronization is explicit: editing the diagram does not regenerate CAD automatically. The user clicks “Generate CAD,” which sends the current scene contract to FastAPI.

The UI should show:

- Idle, generating, success, and error states
- Generation duration or a simple progress indicator
- Links to download STEP and GLB
- The newly generated GLB in the viewer

### FastAPI service

Implement a thin API:

- `GET /health`
- `POST /generate`
- `GET /artifacts/{artifact_id}/{format}`

`POST /generate` should:

1. Validate the scene contract
2. Create an artifact/job identifier
3. Invoke the CadQuery generator synchronously
4. Return artifact metadata and download URLs
5. Return readable validation or generation errors

Use temporary/local filesystem storage initially. Do not add Postgres, Neo4j, or PostGIS to the first milestone.

### CadQuery model generation

Create reusable builders for:

- Room/floor volume
- Standard 42U rack
- Simple power equipment node
- Power connection visualization, if useful in the 3D scene

Generate an assembly using the stable entity IDs as assembly object names where supported. Export:

- STEP in millimeter units as the engineering artifact
- GLB as the browser visualization artifact

Keep geometry intentionally simple and parametric. The first model only needs to prove spatial placement, object identity, unit handling, and regeneration.

### 3D viewer

Add an embedded viewer with:

- Orbit, pan, and zoom
- Fit-to-scene
- Basic lighting and grid/axes
- Loading and error states
- Generated model replacement after each successful sync

The first milestone treats the viewer as independent from the 2D editor. Bidirectional selection and highlighting will be added later after the geometry and metadata pipeline is stable.

## Delivery Phases

### Phase 1 — Geometry proof

Create the CadQuery builders and a command-line scene-to-STEP/GLB generator using a fixed sample scene.

Acceptance criteria:

- A sample scene generates valid STEP and GLB files
- Room and rack dimensions are expressed in engineering units
- Multiple racks appear at expected coordinates

### Phase 2 — ReactFlow editor

Build the seeded editor and scene JSON serialization.

Acceptance criteria:

- User can move and edit racks
- User can add a rack and connect it to a power node
- Exported JSON reloads into the same diagram

### Phase 3 — FastAPI integration

Connect the editor to synchronous generation and artifact delivery.

Acceptance criteria:

- User clicks Generate CAD
- Backend validates and generates both artifacts
- UI displays the resulting GLB and exposes STEP/GLB downloads
- Generation failures are shown without losing the current diagram

### Phase 4 — Usability hardening

Add test coverage, consistent error handling, sample scenes, and documentation.

Acceptance criteria:

- Frontend tests cover scene editing and serialization
- Backend tests cover contract validation and artifact responses
- CadQuery tests verify object counts, placement, dimensions, and output existence
- A fresh developer can run the complete workflow from the README

## Future Phases

1. Editable room boundaries and multiple rooms
2. Cooling entities: CRAC units, chillers, loops, and thermal load calculations
3. 2D↔3D selection and focus using shared entity IDs
4. Cable trays and route generation
5. Postgres/PostGIS persistence and project revisions
6. Neo4j topology queries and dependency analysis
7. Power/cooling what-if simulations and overload warnings
8. Asset lifecycle data, rack U-slot placement, procurement, and operational workflows
9. Background generation jobs and scalable worker execution
10. Richer CAD assemblies, clash detection, and commercial CAD exchange workflows

## Assumptions and Defaults

- Frontend: Vite + React + TypeScript
- Diagram library: ReactFlow
- Browser model format: GLB
- Engineering source format: STEP
- CAD engine: CadQuery running in Python
- API: FastAPI with Pydantic models
- Persistence: local JSON and filesystem artifacts
- Generation: synchronous for the prototype
- Sync: explicit user-triggered regeneration
- Initial room: one fixed rectangular room
- Initial entities: rooms, racks, power nodes, and power edges
- Initial viewer: orbit/zoom/fit only
- No authentication, multi-user editing, databases, simulations, or production deployment in the MVP

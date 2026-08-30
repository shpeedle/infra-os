# Infra / OS prototype

Infra / OS is a small data-center digital-twin prototype. The browser edits a
versioned room scene, FastAPI validates the scene, and CadQuery produces a STEP
engineering artifact plus a GLB browser preview only when the user clicks
`Generate CAD`.

## Repository shape

- `frontend/` — Vite, React, ReactFlow, and the embedded GLB viewer.
- `backend/` — FastAPI routes, Pydantic scene contract, and local artifact service.
- `cadquery/` — deterministic CadQuery builders and the command-line generator.
- `examples/seeded-scene.json` — the scene loaded by the initial editor.
- `artifacts/` — ignored local STEP/GLB output.

## Run locally

Use Node 18+ and Python 3.11+ (Python 3.12 is also supported). Install the
JavaScript dependencies and create a Python environment with CadQuery:

```bash
pnpm install
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
```

Start the API and frontend together:

```bash
make dev
```

Open <http://localhost:5173>. Press Ctrl-C in the `make dev` terminal to stop
both services and clean up their processes. The Vite proxy forwards `/api`
generation calls and `/artifacts` downloads to FastAPI. Set `VITE_API_BASE` to
an API origin when the frontend is not using the development proxy.

The geometry proof can also be run directly after CadQuery is installed:

```bash
.venv/bin/python cadquery/generate.py examples/seeded-scene.json artifacts/local-proof
```

## Checks

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

The generated artifacts are intentionally local and ignored. The API stores
only completed outputs under an artifact ID; it never uses a user-provided
filename as a path.

## Contract and workflow

The scene contract is version `1.0`, uses metres, and defines positions from the
room-local south-west corner. The canvas uses `50 px = 1 m`; CadQuery converts
the same scene values to millimetres at export. Entity IDs are stable across the
diagram, API response metadata, and assembly object names.

The initial editor supports moving and inspecting racks, adding/removing scene
entities, drawing/deleting power edges, JSON import/export, a local browser
draft, and explicit synchronous generation. An invalid or failed generation
leaves the current 2D scene untouched.

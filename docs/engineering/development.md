# Development Guide

## Repository Shape

The initial prototype is organized by boundary and feature:

```text
frontend/                 React + TypeScript application
  src/
    domain/               versioned scene contract and validation
    features/workspace/   ReactFlow mapping and workspace types
    components/           shared UI primitives
    lib/                  API client and transport validation
backend/                  FastAPI application
  app/
    api/                  HTTP routes
    domain/               scene validation and use cases
    services/             orchestration and artifact handling
cadquery/                 Python geometry builders and generator entrypoint
examples/                 seeded scene JSON
artifacts/                local generated output during development
docs/                     durable project context
```

Keep this map updated as the implementation evolves. Feature-specific
code belongs near the feature; shared code must have more than one demonstrated
consumer.

The prototype runs with the following commands after creating `.venv` and
installing `backend/requirements.txt`:

- `pnpm run dev:frontend`: Vite development server on port 5173
- `.venv/bin/uvicorn backend.app.main:app --reload --port 8000`: FastAPI server
- `make dev`: start both local services; Ctrl-C stops and cleans up both
- `pnpm run build`: production frontend build
- `pnpm run test`: frontend and backend tests

The Vite server proxies `/api/*` to the FastAPI server and serves generated
artifacts through the API. Generated files remain under the ignored `artifacts/`
directory.

## Normal Workflow

1. Read `AGENTS.md` and the task-relevant handbook pages.
2. Inspect the existing implementation, callers, contract, and tests.
3. Identify ownership, units, side effects, and failure boundaries.
4. Implement the smallest complete vertical slice.
5. Add or update tests and documentation for changed behavior.
6. Run the narrowest checks first, then the repository checks that exist.
7. Review the diff for unrelated changes, generated artifacts, secrets, and stale
   documentation.

## GitHub Contribution Workflow

When the repository is under Git, use a task branch and merge through a pull
request:

1. Update the local default branch: `git switch main` followed by
   `git pull --ff-only origin main`.
2. Create a task branch: `git switch -c <type>/<short-description>`.
3. Implement the change, update tests and durable documentation, and run the
   repository checks.
4. Commit the change, push the branch with `git push -u origin <branch>`, and
   open a pull request targeting `main`.
5. After review and required checks pass, merge the pull request on GitHub.
6. Refresh the local default branch after the merge:
   `git switch main` followed by `git pull --ff-only origin main`.

Delete the local task branch when it is no longer needed with
`git branch -d <branch>`. Delete the remote branch only when the repository's
branch-retention policy allows it.

## Local Development

Local development uses the commands in the root package manifest and README. At
minimum, it needs:

- a React dev server;
- a FastAPI dev server;
- a Python environment with a pinned CadQuery-compatible dependency set;
- a development proxy or configured API origin;
- a safe local artifact directory.

Do not invent commands in documentation before the corresponding scripts exist.
The MVP does not require Postgres, PostGIS, Neo4j, authentication, or external
deployment services.

## Code Quality Commands

The baseline tooling is intentionally conventional:

- `pnpm run lint:ts`: ESLint for TypeScript and React code
- `pnpm run lint:python`: Ruff linting and import sorting for Python
- `pnpm run format`: Prettier plus Ruff formatting
- `pnpm run format:check`: verify formatting without changing files
- `pnpm run lint`: run both language lint suites

Install JavaScript dependencies from `package.json` and Python dependencies from
`backend/requirements.txt`. The root scripts intentionally invoke tools from
`.venv` so an IDE-selected interpreter cannot silently change which environment
runs the checks.

## Environment And Artifacts

- Keep secrets and machine-specific values in ignored environment files.
- Pin or document Node, Python, and CadQuery versions once the project is
  scaffolded.
- Store generated STEP/GLB files outside source modules and do not commit
  incidental outputs unless an example artifact is intentionally versioned.
- Use temporary directories and safe filenames for request-generated artifacts.
- Clean up temporary files after failed generation when they are not needed for
  diagnosis.

## Boundary Conventions

- FastAPI routes own HTTP parsing, status codes, response headers, and request
  validation entry points.
- Domain services own scene rules, generation orchestration, and state transitions.
- CadQuery modules own geometry construction and exports, not HTTP behavior.
- Frontend components render state and collect intent; API clients own transport
  and response parsing.
- Future database adapters must not leak storage-specific shapes into the UI or
  CAD builders.

See [`architecture-and-dependencies.md`](architecture-and-dependencies.md),
[`rest-api.md`](rest-api.md), and [`cadquery.md`](cadquery.md) for boundary rules.

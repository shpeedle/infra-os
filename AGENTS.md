# Data Center Digital Twin AI Guide

This is the short entry point for AI-assisted work. The canonical project
context lives in [`docs/`](docs/README.md). Read the documents relevant to the
task before changing code, contracts, behavior, or architecture. The current
implementation target is documented in [`PROJECT_PLAN.md`](PROJECT_PLAN.md).

## Project Direction

This is a greenfield React/TypeScript and FastAPI application for editing
data-center schematics and generating engineering CAD with CadQuery.

- ReactFlow is the 2D schematic workspace.
- FastAPI validates scene contracts and orchestrates generation.
- CadQuery generates STEP engineering artifacts and GLB browser previews.
- Browser-first JSON is the initial persistence model.
- Postgres/PostGIS and Neo4j are future phases, not current dependencies.

## Priorities

1. Protect user intent and preserve edits.
2. Make scene state, units, identity, and generation status explicit.
3. Prefer the smallest complete change that is easy to understand and debug.
4. Treat external input, imported JSON, API responses, CAD output, and future
   model output as untrusted until validated.
5. Keep the interface calm, rectangular, legible, and useful to technical users.

## TypeScript And Effect

Use [Effect](https://www.effect.website/) as the preferred TypeScript library
when it materially improves a non-trivial workflow: typed errors, runtime
decoding, retries, cancellation, structured concurrency, resource cleanup,
dependency injection, or observability. Keep Effect programs in service,
adapter, and boundary modules rather than putting Effect machinery in JSX or
simple local UI state.

Plain TypeScript is appropriate for pure transformations, simple component
logic, and one-shot operations where an Effect wrapper would add ceremony without
improving safety. Do not use both ad-hoc retry/error flows and Effect for the same
operation. Pin an intentional library version when the frontend is scaffolded;
do not follow a release candidate casually.

## Working Rules

- Inspect the surrounding implementation and relevant docs before proposing or
  applying a pattern.
- Follow existing conventions unless the task intentionally changes them.
- Keep domain scene logic separate from ReactFlow rendering, HTTP handlers, and
  CadQuery implementation details.
- Keep route handlers and UI event handlers thin; business rules belong in
  focused domain/service modules.
- Validate every external boundary: HTTP inputs, imported scene files, generated
  artifact metadata, and CAD geometry assumptions.
- Use stable entity IDs across the 2D scene, CAD assembly, artifact metadata, and
  future graph/database records.
- Make units explicit. Do not pass bare engineering numbers without documenting
  their unit and conversion boundary.
- Design external processes and future integrations for timeouts, retries,
  duplicate requests, partial failure, and cancellation.
- Never log secrets, tokens, credentials, raw customer content, or full imported
  files. Prefer stable internal IDs, operation IDs, statuses, and durations.
- Do not add a generic abstraction for one speculative future use case.
- Update docs when a change alters a product promise, system boundary, invariant,
  data contract, or durable engineering convention.

When this project is under Git, use a dedicated task branch/worktree for
implementation when the repository workflow supports it. This workspace is
currently a greenfield folder without Git metadata, so documentation and code
changes remain in the project root until version control is initialized.

## Verification

Use checks proportionate to the change and report exactly what ran:

- Documentation: inspect links, headings, and the final diff.
- TypeScript: use `pnpm run lint:ts` and `pnpm run format:check` once dependencies
  are installed.
- Python: use `pnpm run lint:python` and `ruff format --check .` once Ruff is
  installed.
- Frontend: run formatting/linting, type checking, tests, and a production build
  when those scripts exist; render changed views at narrow and desktop widths.
- API: test valid, invalid, oversized, timeout, and generation-failure requests.
- Scene contract: test round trips, unknown entity types, missing references,
  invalid units/dimensions, and stable IDs.
- CadQuery: generate representative STEP and GLB artifacts and verify geometry,
  units, object counts, placements, and output existence.
- Viewer: test loading, valid output, missing output, malformed output, and
  replacement after a later successful generation.

Do not claim tests, services, databases, or production behavior that do not yet
exist.

## Context Map

- Handbook index: [`docs/README.md`](docs/README.md)
- Engineering index: [`docs/engineering/README.md`](docs/engineering/README.md)
- Frontend rules: [`docs/engineering/frontend.md`](docs/engineering/frontend.md)
- Product and visual design: [`docs/product/design.md`](docs/product/design.md)
- CadQuery conventions: [`docs/engineering/cadquery.md`](docs/engineering/cadquery.md)
- Development workflow: [`docs/engineering/development.md`](docs/engineering/development.md)
- Testing strategy: [`docs/engineering/testing.md`](docs/engineering/testing.md)
- Debugging playbook: [`docs/engineering/debugging.md`](docs/engineering/debugging.md)

`docs/` is authoritative project context and should be maintained with the
implementation. Keep temporary task reasoning in the task or pull request;
promote it into the handbook only when it becomes a durable rule.

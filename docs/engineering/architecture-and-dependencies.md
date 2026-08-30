# Architecture And Dependencies

Keep the first implementation small while preserving clear boundaries between
the interactive editor, API, CAD generation, and future persistence systems.

## Current Boundary

```text
React/ReactFlow
      ↓ scene JSON contract
FastAPI validation and orchestration
      ↓ validated scene
CadQuery generator
      ↓ STEP + GLB artifacts
Local artifact storage → browser viewer/downloads
```

- React owns interaction and presentation, not CAD generation or server rules.
- FastAPI owns HTTP concerns, request validation, orchestration, and safe artifact
  delivery.
- CadQuery owns parametric geometry and engineering-unit conversion.
- The scene contract is the shared boundary. Do not pass ReactFlow nodes or
  database rows directly into CadQuery.
- Use stable entity IDs across the scene, CAD assembly, artifact metadata, and
  future graph records.

## Dependency Direction

Dependencies should point toward stable domain concepts:

- UI components depend on typed scene and API client code.
- API routes depend on scene validation and generation services.
- Generation services depend on a narrow CadQuery runner contract.
- CadQuery builders depend on validated domain geometry, not HTTP or React.
- Future Postgres/PostGIS and Neo4j adapters depend on domain contracts rather
  than changing the editor's internal representation.

For TypeScript workflows, use Effect at meaningful service boundaries where its
typed errors, structured concurrency, resource scopes, dependency injection, or
runtime schemas improve the contract. Do not make React components or simple
pure utilities depend on an Effect runtime without a concrete benefit.

Translate framework, transport, and library types at boundaries. Avoid letting
ReactFlow-specific shapes, Pydantic models, or CadQuery objects become accidental
public contracts.

## Abstraction Rules

- Start with concrete modules and extract an interface when a real second
  implementation or meaningful test boundary appears.
- Keep route handlers and UI event handlers thin.
- Keep side effects explicit: file writes, subprocess execution, network calls,
  and database operations should be easy to locate.
- Do not introduce a plugin system, event bus, repository layer, or generic
  geometry framework for one initial implementation.
- Before adding a layer, state which dependency or invariant it protects.

## Future Persistence Boundary

The MVP uses versioned JSON and local artifact files. Later systems may split
responsibilities as follows:

- Postgres: projects, revisions, assets, and operational records
- PostGIS: rooms, equipment placement, and spatial queries
- Neo4j: topology and dependency relationships

Adding a database must not silently change the scene contract or make the UI
dependent on storage-specific IDs.

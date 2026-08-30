# Performance

## Measure Before Optimizing

State the affected user journey, representative scene size, environment, metric,
and regression signal before making a performance change. Preserve correctness,
validation, accessibility, and failure behavior.

## Frontend Hot Paths

- Do not rerender the whole application while one ReactFlow node is dragged.
- Keep pan, zoom, selection, and pointer state local or transient where possible.
- Memoize node renderers when measurement shows repeated work.
- Avoid graph layout, edge routing, deep cloning, and scene serialization during
  every render or pointer event.
- Use viewport culling, incremental layout, throttling, or a worker for genuinely
  expensive diagrams.
- Lazy-load the GLB viewer and other heavy features when they are not needed.
- Revoke object URLs and clean up workers, listeners, timers, and subscriptions.

## API And CAD Hot Paths

- Bound scene size, request size, generation time, and artifact retention.
- Avoid repeated parsing or generation of the same scene revision.
- Keep synchronous generation clearly bounded in the MVP; move to a worker when
  measured generation time makes request blocking unacceptable.
- Write artifacts safely and avoid retaining duplicate full-size buffers.
- Measure GLB size and tessellation settings as scenes become more detailed.

Do not add caching without an owner, invalidation rule, stale behavior, and a
privacy boundary.

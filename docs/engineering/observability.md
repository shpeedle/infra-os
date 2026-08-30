# Observability

Important failures should be findable without logging sensitive content.

## Useful Fields

Use structured logs or diagnostics with stable fields such as:

- request ID and operation ID;
- scene revision and entity ID;
- artifact ID and output format;
- generation status and error category;
- CadQuery duration and total request duration;
- output size and validation result.

Instrument the meaningful boundaries: browser request, FastAPI validation,
CadQuery execution, artifact publication, and viewer load failure. Avoid logging
every render or pointer event.

When TypeScript workflows use Effect, use its structured tracing/logging
integration where it improves boundary visibility. Keep operation IDs and scene
IDs in the context, and keep raw scene content out of traces.

## Protect Telemetry

Never record credentials, tokens, cookies, authorization headers, raw imported
scene files, or unnecessary customer content. Keep metric labels bounded; do not
use arbitrary entity labels or filenames as high-cardinality dimensions.

Diagnostics should explain whether a failure was user input, a CAD/model issue,
a timeout, an unavailable dependency, or an application bug.

# Resilience

## Current Generation Boundary

The MVP uses synchronous FastAPI → CadQuery generation. Even this simple flow
must define a timeout, cancellation behavior, temporary-file cleanup, and clear
failure state. A failed request must not erase the user's current diagram.

## Safe Side Effects

- Generate into a unique temporary/artifact directory.
- Publish STEP and GLB only after each file is complete and validated enough to
  serve.
- Associate outputs with a scene revision and artifact ID.
- Prevent duplicate submissions in the UI and define duplicate behavior in the
  API before adding retries.
- Make retry guidance clear when a process may have completed after a timeout.
- Never use an unbounded retry loop.

In TypeScript, prefer Effect's structured error, retry, cancellation, concurrency,
and resource-lifetime tools for workflows that need them. Keep retry policy and
failure types in the service module so UI code receives an explicit result rather
than rebuilding recovery logic.

When generation becomes asynchronous, add a durable job state, bounded retries,
backoff, cancellation, and reconciliation for jobs that outlive the page.

Test timeout, cancellation, partial output, duplicate request, malformed output,
and retry paths.

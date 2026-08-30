# REST API Endpoints

The MVP API is intentionally small. FastAPI is the boundary between the browser,
scene contract, and CadQuery process.

## Initial Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Report that the API is reachable |
| `POST` | `/generate` | Validate a scene and synchronously generate STEP and GLB artifacts |
| `GET` | `/artifacts/{artifact_id}/{format}` | Download a generated `step` or `glb` artifact |

Keep the response contract explicit and versioned. A generation response should
identify the submitted scene revision, artifact ID, available formats, and safe
download locations.

The prototype accepts a JSON scene body and returns a response shaped like:

```json
{
  "artifact_id": "artifact-0123456789abcdef",
  "scene_revision": 1,
  "scene_digest": "0123456789abcdef",
  "generator_version": "prototype-0.1.0",
  "units": "mm",
  "formats": ["step", "glb"],
  "urls": {
    "step": "/artifacts/artifact-0123456789abcdef/step",
    "glb": "/artifacts/artifact-0123456789abcdef/glb"
  }
}
```

The request body is limited to 512 KiB. Pydantic handles structural contract
validation, then domain validation checks references, placement, connection
direction, and the prototype power topology before CadQuery runs.

## Validate Every External Input

Validate path parameters, format enums, request bodies, entity types, IDs,
references, dimensions, units, array sizes, and string lengths before business
logic or CadQuery execution. Reject malformed or unsupported input with a
consistent actionable 4xx response.

Do not trust frontend validation. Pydantic models and domain validation are the
authoritative boundary.

## HTTP And Domain Separation

- Routes own parsing, status codes, content headers, and transport errors.
- Domain services own scene invariants, generation orchestration, and artifact
  lifecycle.
- CadQuery runners own geometry generation behind a narrow service contract.
- The frontend API client owns response parsing and exposes typed success/error
  results to components.

There is no authentication or user ownership model in the MVP. If one is added,
authorization must be enforced in the API/domain boundary, never only by hiding
frontend controls.

## Error And Artifact Semantics

- Use field/entity-specific validation messages where possible.
- Distinguish invalid input, generation failure, timeout, missing artifact, and
  unsupported format.
- Do not expose stack traces, local paths, credentials, or command-line secrets
  in normal responses.
- Never use an unvalidated user filename as a filesystem path.
- Write artifacts atomically or mark them incomplete until generation finishes.
- Prevent duplicate generation requests while the frontend request is active;
  future async generation will need explicit idempotency semantics.

Test successful, malformed, oversized, unsupported-format, missing-artifact,
timeout, and CadQuery-failure requests.

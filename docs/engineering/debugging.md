# Debugging Playbook

## Trace The Actual Boundary

Describe the observable failure before editing code:

- scene revision and affected entity ID;
- expected and actual behavior;
- whether the failure is deterministic;
- the last successful boundary;
- whether an artifact may have been partially written;
- whether the user's current edits are still recoverable.

Trace the first vertical slice in order:

```text
ReactFlow editor
  → scene serialization
  → FastAPI request/validation
  → CadQuery generation
  → STEP/GLB artifact
  → browser viewer/download
```

Do not begin by changing the component that displays the error. Confirm which
boundary first diverged from the expected contract.

## Common Failure Paths

### Diagram state is wrong

- Compare the domain scene JSON with the rendered ReactFlow nodes and edges.
- Check stable IDs, coordinate conversion, and unit labels.
- Check whether form state was committed before serialization.
- Confirm a failed generation did not replace the current scene.

### Generation request is rejected

- Validate schema version, entity types, required properties, dimensions, and
  connection references.
- Confirm the request contains the intended scene revision.
- Keep validation errors attached to the relevant entity or field.

### CadQuery output is wrong or missing

- Reproduce from the same saved scene JSON outside the browser.
- Check the documented 2D-to-3D coordinate mapping and millimeter conversion.
- Verify object count, stable assembly names, placements, dimensions, and output
  file existence.
- Check whether the failure happened before STEP, before GLB, or while storing
  the artifact.

### Viewer does not update

- Confirm the API returned a new artifact ID and GLB URL.
- Check that the browser replaced the previous object URL and revoked stale URLs.
- Inspect network status and GLB load errors.
- Ensure an incomplete artifact is never presented as the current model.

## Safe Diagnostics

Prefer structured fields such as scene revision, entity ID, artifact ID, request
ID, operation status, duration, output format, and error category. Never log
secrets, credentials, raw imported files, or unnecessary customer content.

Change one hypothesis at a time. When a bug reveals a missing invariant, contract,
or runbook step, add a regression test and update this guide if the lesson is
durable.

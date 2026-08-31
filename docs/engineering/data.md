# Data And Scene Contracts

## Current Source Of Truth

The initial product uses a versioned JSON scene contract as the editable source
of truth. It represents the room, racks, power nodes, power edges, dimensions,
engineering properties, and scene metadata described in
[`../../PROJECT_PLAN.md`](../../PROJECT_PLAN.md).

Keep the contract:

- explicit about its schema version;
- explicit about units and coordinate conventions;
- stable in its entity IDs;
- independent of ReactFlow node IDs and component state;
- safe to import, validate, export, and regenerate;
- forward-compatible where practical.

The implemented `1.0` contract stores lengths in metres and uses a
`room-local-south-west` coordinate system. The room contains `position` and
`dimensions`; racks and power nodes have stable IDs, positions, dimensions,
and type-specific engineering fields; connections reference entity IDs. The
canvas records `pixels_per_meter` for the 2D projection but does not change the
engineering coordinates.

An imported file is untrusted input. Validate structure, entity types, references,
dimensions, numeric ranges, and collection sizes before using it.

## Identity And Invariants

- Entity IDs are unique within a scene and must remain stable through edits and
  regeneration.
- Every connection references existing source and target entities.
- Entity types determine which properties are valid.
- Dimensions and positions have documented units and finite, bounded values.
- A scene revision identifies the exact input used to generate an artifact.
- Generated artifacts are associated with an artifact ID and format; filenames
  must not be taken directly from user input.

Keep validation close to the contract boundary and test it independently from
React rendering and CadQuery geometry.

The frontend rejects malformed shape, version, unit, and numeric input at
import time. It keeps semantically incomplete drafts editable and surfaces
those issues through the validation panel; the API applies the authoritative
semantic checks before generation.

## Browser Persistence

Browser-first persistence may use JSON export/import and a local draft. Make the
behavior visible: distinguish an in-memory edit, a browser draft, and a generated
CAD artifact. Do not imply server persistence or multi-user collaboration before
those capabilities exist.

The frontend also keeps a bounded history of immutable scene snapshots in
browser storage, partitioned by `project_id`. The revision timeline can load a
past snapshot back into the editor; loading it does not regenerate CAD, and any
artifact from another revision remains explicitly stale until the user generates
again. This is a convenience history for the current browser, not durable
project history, audit provenance, or collaboration. The timeline can compare
two saved snapshots for the currently modeled fields; this comparison is
read-only and does not replace server-backed provenance or merge semantics.

## Future Storage

When durable storage is introduced:

- Postgres should own transactional project, revision, asset, and audit records.
- PostGIS should own spatial queries and geometry that needs database indexing.
- Neo4j should own topology traversals and dependency relationships.
- Cross-system writes need explicit consistency and retry behavior.
- Database identifiers must not replace the stable scene/entity IDs used by the
  frontend and CAD assembly.

Use additive migrations, explicit backfills, and tested upgrade paths. Do not add
database setup to the MVP merely to anticipate these phases.

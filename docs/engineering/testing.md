# Testing Strategy

The repository is greenfield, so there is no existing test suite or coverage
claim. Establish tests alongside the first implementation rather than treating
them as a later cleanup.

## Test Boundaries

| Risk | Preferred coverage |
|---|---|
| Scene validation or coordinate conversion | Focused Python/TypeScript unit test |
| JSON serialization and import/export | Contract and round-trip test |
| ReactFlow editing behavior | React interaction/component test |
| FastAPI request/response behavior | API test with a controlled generator |
| CadQuery geometry and exports | Generator test plus artifact inspection |
| Browser editor → generate → viewer flow | Browser integration test |
| Timeout, partial output, or duplicate generation | Failure-injection test |
| Visual layout and responsive regressions | Targeted rendered/browser check |

Use the ecosystem-native tools chosen during scaffolding, with a lightweight
TypeScript component runner (for example Vitest and Testing Library) and pytest
for FastAPI/CadQuery code unless the implementation establishes a better
repository-wide choice.

Test Effect programs through their observable success and typed failure results.
Inject clocks, random sources, API clients, filesystem access, and other
dependencies so retry, timeout, cancellation, and cleanup behavior is
deterministic. Do not couple tests to Effect's internal runtime representation.

## MVP Coverage

Test at least:

- valid seeded scenes round-trip through JSON;
- unknown entity types, duplicate IDs, invalid dimensions, missing references,
  unsupported units, and oversized input are rejected;
- moving/editing a rack updates the serialized domain scene;
- power connections create and delete predictably;
- generation preserves the current scene on validation or CAD failure;
- generation state prevents duplicate submissions;
- STEP and GLB artifacts are created with expected formats and stable object IDs;
- room and rack dimensions, units, and placements match the scene;
- the viewer handles loading, success, missing output, and malformed output;
- keyboard controls and visible focus work for important editor actions;
- the workspace remains usable at 320px and desktop widths.

Test observable behavior, not private component state or implementation details.

## Verification Reporting

For each change, report exactly what ran and what did not:

- Documentation-only: inspect changed links, headings, and diff.
- Frontend: run lint, type check, tests, build, and rendered narrow/desktop checks
  when those scripts exist.
- API: run contract tests and exercise invalid and generation-failure paths.
- CAD: generate representative STEP/GLB output and inspect geometry and units.
- Integration: exercise the complete seeded edit → generate → view workflow.

If dependencies, CadQuery installation, credentials, or services prevent a check,
state the unverified risk plainly.

# Coding Style

Optimize for the next engineer or AI agent understanding the behavior without
reconstructing hidden assumptions. Prefer clarity over compression and direct
domain language over framework jargon.

## General Rules

- Use names that reveal domain intent, units, state, and side effects.
- Keep functions focused on one coherent operation and one abstraction level.
- Keep validation and error handling close enough to explain the failed boundary.
- Use comments for rationale, constraints, and non-obvious tradeoffs, not narration.
- Remove dead code instead of commenting it out.
- Improve confusing code touched by a change without turning the task into an
  unrelated cleanup.

Clean code does not mean maximum decomposition. Do not fragment a readable flow
into tiny indirections or create generic layers for speculative reuse.

## TypeScript

- Treat decoded JSON, API responses, local storage, and third-party values as
  `unknown` until validated.
- Prefer [Effect](https://www.effect.website/) for non-trivial effectful code:
  typed errors, runtime decoding, retries, cancellation, structured concurrency,
  resource scopes, dependency injection, and boundary observability.
- Keep pure functions, ordinary React rendering, simple local state, and small
  one-shot operations in plain TypeScript when Effect would add more ceremony
  than safety.
- Keep Effect programs out of JSX. Put them in focused services/adapters and
  expose explicit results or state to the component layer.
- Avoid `any`; isolate it at an unavoidable library boundary and document why.
- Give exported functions and shared contracts explicit types.
- Represent finite states with unions or enums, not unconstrained strings.
- Keep scene domain types separate from ReactFlow's render types.
- Do not swallow exceptions or replace actionable failures with `undefined`.

## Python And CadQuery

- Use type hints on public functions and boundary objects.
- Name dimensions and coordinate values with units when ambiguity is possible,
  such as `room_width_m` or `rack_height_mm`.
- Keep CadQuery builders deterministic and free of HTTP or filesystem policy.
- Validate geometry inputs before constructing solids.
- Keep artifact export and temporary-file handling outside reusable component
  builders.
- Raise errors that identify the entity, property, unit, and failed operation.

## Shared Contracts

- Change the scene contract and all consumers together.
- Use Effect Schema or an equivalent typed runtime decoder at TypeScript input
  boundaries when it removes duplicated validation. The FastAPI/Pydantic boundary
  remains authoritative for API requests; client validation is not authorization.
- Version durable JSON formats and define migration behavior before changing them.
- Keep stable entity IDs through ReactFlow conversion, API requests, CAD assembly
  objects, and generated artifact metadata.
- Make side effects visible in names and control flow.

## Formatting And Linting

- Use ESLint for TypeScript and React lint rules.
- Use Prettier for TypeScript, JavaScript, JSON, CSS, and frontend configuration
  formatting.
- Use Ruff for Python linting, import sorting, and formatting. Do not add Black,
  isort, or Flake8 alongside it without an explicit project decision.
- Use the repository scripts: `pnpm run lint`, `pnpm run format`, and
  `pnpm run format:check`.
- Keep the shared baseline at 100 columns, LF line endings, spaces rather than
  tabs, and double quotes in formatted source.
- Do not disable a lint rule globally to resolve one local issue. Prefer a local,
  documented exception when the rule is genuinely wrong for a boundary.

# Engineering Guidelines

Read [`../../AGENTS.md`](../../AGENTS.md) first. Then load only the guidance
relevant to the task.

## Subject Map

| Subject | Document | Use it when |
|---|---|---|
| Architecture | [Architecture and dependencies](architecture-and-dependencies.md) | Defining boundaries, interfaces, or dependency direction |
| CAD generation | [CadQuery](cadquery.md) | Changing scene-to-CAD generation, units, assemblies, or artifacts |
| Coding style | [Coding style](coding-style.md) | Naming concepts, structuring code, or choosing abstractions |
| Data | [Data](data.md) | Changing scene persistence, schemas, graph data, or spatial data |
| Debugging | [Debugging](debugging.md) | Diagnosing failures across the browser/API/CAD boundary |
| Development | [Development](development.md) | Running the project or changing local tooling |
| Frontend | [Frontend](frontend.md) | Building React, ReactFlow, viewer, accessibility, or responsive behavior |
| AI systems | [AI systems](ai-systems.md) | Adding model-assisted design or automation behavior |
| Observability | [Observability](observability.md) | Adding logs, metrics, traces, or diagnostics |
| Performance | [Performance](performance.md) | Changing rendering, graph work, artifacts, or critical-path latency |
| Resilience | [Resilience](resilience.md) | Adding processes, retries, timeouts, or asynchronous work |
| REST API | [REST API](rest-api.md) | Adding FastAPI routes, validation, errors, or contracts |
| Testing | [Testing](testing.md) | Choosing coverage and reporting verification |

## Maintaining These Guides

Add a rule when it represents a recurring expectation, protects an important
boundary, or records a decision future work must preserve. Keep temporary context
in the task or pull request. Prefer types, schemas, tests, and tooling for rules
that can be enforced mechanically.

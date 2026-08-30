# AI Systems

AI-assisted authoring is a future capability, not part of the first editor/CAD
vertical slice. When it is introduced, treat model output as a proposed scene
change rather than an authoritative command.

## Bound Model Behavior

- Give a model only the scene context and tools required for the requested task.
- Require structured output that conforms to the versioned scene contract.
- Validate entity types, IDs, dimensions, units, references, and capacity rules
  deterministically after generation.
- Keep authorization, safety rules, and engineering constraints outside prompts.
- Show proposed changes and require explicit confirmation before destructive,
  customer-visible, or expensive operations.
- Preserve the original scene and make accepted changes reversible.

## Make Results Explainable

Record safe metadata such as model/prompt version, operation ID, timing, validation
result, and accepted/rejected outcome. Do not log secrets, raw customer content,
or sensitive prompts by default.

AI changes should have deterministic tests for schema compliance, unsupported
claims, missing context, prompt injection, invalid geometry, and prohibited
actions. Fluent output is not evidence that a proposed design is correct.

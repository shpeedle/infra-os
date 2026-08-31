# Frontend Engineering

This is the canonical frontend guide for the React/TypeScript application. Use
it for implementation and review. Use [`../product/design.md`](../product/design.md)
for the product's visual language and interaction character, and
[`../../AGENTS.md`](../../AGENTS.md) for repository-wide rules.

The project is a visual engineering tool: a ReactFlow 2D schematic editor, a
FastAPI boundary, and a browser viewer for CadQuery-generated GLB assemblies.
The interface should feel like a calm technical instrument rather than a
generic dashboard.

## AI-Assisted Implementation Workflow

Before changing a frontend surface:

1. Read `AGENTS.md`, this guide, and the product design guide.
2. Inspect the route, feature, components, state, API client, and tests involved.
3. State the screen's primary user task and the primary action.
4. Write down selection, loading, empty, success, error, retry, mobile, and
   keyboard behavior before adding UI.
5. Search for an existing component or pattern before creating one.
6. Implement the smallest complete slice, including failure handling.
7. Verify behavior at narrow and desktop widths and report the checks run.

Do not introduce a generic design system, global store, or abstraction for one
speculative future use case. Extract a shared pattern after repeated use proves
the concept is stable.

## Inspiration-Derived UX Principles

The visual references in [`../product/design.md`](../product/design.md) translate
into these implementation rules:

- **One decisive next action:** orient each screen around one task and one clear
  primary action, such as `Generate CAD` for the current scene. Supporting
  actions should not compete with it.
- **State is part of the interface:** show scene revision, selection, save state,
  generation state, artifact freshness, and failure recovery where they matter.
  Never make users infer state from a spinner, color, or a changed view.
- **Technical detail is structured, not noisy:** use typed labels, units, IDs,
  stages, and explicit error details. Put advanced detail in an inspector or
  expandable region instead of crowding every node.
- **Primitives compose into workflows:** keep buttons, panels, node types,
  inspectors, status treatments, and viewer controls consistent and small. Do
  not create one-off controls for every feature.
- **The product UI proves the product:** prefer a usable schematic, a real CAD
  preview, and inspectable generation output over decorative mockups.
- **Expert speed remains discoverable:** support keyboard shortcuts, fit/reset
  controls, direct manipulation, and predictable selection while keeping labels
  and visible affordances for first-time users.
- **Observability belongs near the operation:** generation errors should identify
  the scene revision, affected entity, output format, and recovery action without
  requiring a user to inspect browser logs.

These principles are adapted for an engineering editor. They do not authorize
copying any reference site's brand system or adding marketing-style animation to
the application workspace.

## Stack And Boundaries

- Use React and TypeScript for the UI.
- Use [Effect](https://www.effect.website/) for non-trivial TypeScript workflows
  involving typed failures, decoding, retries, cancellation, concurrency,
  resource lifetimes, or dependency injection. Keep simple rendering, local
  state, and pure view transformations in ordinary React/TypeScript.
- Use ReactFlow for 2D diagram interaction and viewport management.
- Keep the domain scene model separate from ReactFlow's internal node and edge
  shapes. Translate at the boundary.
- Keep API parsing, scene validation, and generation commands outside presentational
  components.
- Treat API responses, imported JSON, local storage, and GLB metadata as
  `unknown` until validated.
- Use explicit types for scene entities, connection kinds, generation states, and
  artifact formats. Avoid `any`.
- Keep the CadQuery process behind the FastAPI API. The browser does not execute
  CAD generation or assume that a generated artifact exists.
- Use a configured API client rather than scattering `fetch` calls through UI
  components. Use relative `/api` requests when the development proxy makes the
  frontend and API same-origin.
- Build Effect programs in service/adapter modules and execute them at a clear
  boundary. Components should consume explicit loading/success/error state, not
  coordinate retries or resource lifetimes themselves.

## Screen And Shell Design

Each screen has one primary job. A diagram workspace may contain a canvas and
an inspector because both serve editing the same diagram; it should not also
become a project list, report, or settings screen.

Keep pages calm as features accumulate. When supporting details become a
substantial task, need their own navigation or state, or begin competing with
the page's primary job, move them to a dedicated route. Use a modal dialog for
a focused, self-contained form or small group of settings when preserving the
current page context helps the user. Do not use dialogs as overflow containers
for large, deeply navigable, or routinely referenced content.

Use a stable shell:

```text
Sticky app header: project identity, save/generation state, primary action
--------------------------------------------------------------------------
Navigation | Main canvas or viewer                         | Inspector
```

- Keep the workspace larger than its supporting panels.
- Keep navigation shallow and persistent. Use a sidebar on wide screens and the
  same destinations in a drawer on narrow screens.
- Keep the header for identity, context, and page actions; do not turn it into a
  second navigation system.
- Make routes represent meaningful locations so refresh, back, and deep links
  preserve context.
- Make panes independently scrollable. Do not let a panel's content move the
  canvas or header unexpectedly.
- Follow the visual rules in `docs/product/design.md`: rectangular geometry,
  deliberate borders, and restrained technical artwork.

## Responsive Behavior

Design at 375px and verify at 320px, 768px, and a desktop width.

- Never create page-level horizontal scrolling. A canvas, table, code block, or
  other inherently wide surface may scroll or pan inside its own region.
- Reflow rather than shrink dense desktop controls until labels disappear.
- On tablet widths, collapse the inspector into a drawer or overlay when it
  competes with the canvas.
- On mobile, show one main pane at a time; expose navigation and inspection using
  drawers or a dedicated route with an obvious way back.
- Use fluid layout containers, `min-width: 0`, and `100dvh` or flex-owned height
  instead of assuming `100vh` is stable.
- Do not make hover the only way to discover or use an action.
- Keep controls reachable while the on-screen keyboard is open.
- Verify rendered layout, not only class names. At 320px, document width should
  equal viewport width unless the changed surface is an intentionally scrollable
  canvas or data region.

## ReactFlow Diagram Rules

The diagram is a primary work surface, not a decorative panel.

Provide familiar behavior:

- Click selects one entity; click the empty canvas clears selection.
- Shift-click extends selection when multi-select is supported.
- Drag moves a node; background drag pans; wheel or trackpad zooms.
- Escape cancels the active tool or clears selection.
- Delete/Backspace removes selected entities only after the interaction makes the
  scope clear.
- Provide zoom in, zoom out, reset, and fit-to-view controls.
- Make the active tool and selected entity unmistakable through more than color.
- Show a useful empty inspector when nothing is selected, or hide it; never show
  stale properties from an earlier selection.
- Use explicit connection affordances and visible invalid-connection feedback.
- Preserve the user's diagram when generation fails.

For this project's first slice, the diagram represents a room, racks, power
nodes, and power edges. Stable domain IDs must survive ReactFlow conversion and
be reused by the generated CAD assembly.

Keep high-frequency interaction local or transient. Dragging one rack must not
rerender unrelated application chrome, the whole graph, or the 3D viewer.

## CadQuery And 3D Viewer Rules

The viewer shows the result of an explicit generation action. It does not imply
that every 2D edit has already changed the CAD model.

The generation experience has explicit states:

```text
Ready → Generating → Generated
                 ↘ Failed → Retry
```

- Disable duplicate generation while a request is in flight.
- Show what is being generated and which scene revision was submitted.
- Keep the current 2D edits intact through validation, timeout, or generation
  failure.
- Replace the viewer only after a complete GLB artifact is available.
- Provide orbit, pan, zoom, fit-to-scene, and reset-view controls.
- Treat generated GLB scenes as glTF Y-up in the browser. The initial and reset
  views should use an elevated isometric camera, keep the floor below equipment,
  and frame the complete assembly.
- Give the viewer most of its area and keep chrome minimal.
- Show loading, empty, unavailable, and failed-model states distinctly.
- Keep STEP and GLB download actions explicit and distinguish engineering output
  from browser preview.
- Load the heavy viewer code only where a viewer is present when code splitting
  is available.

The first viewer is independent from the 2D selection model. Do not add
2D↔3D highlighting until object metadata and picking behavior are deliberately
specified.

## State And Data Flow

Keep these categories distinct:

- **Scene state:** the editable, serializable domain model.
- **Viewport state:** pan, zoom, selection, active tool, and panel visibility.
- **Form state:** in-progress property edits that may not yet be committed.
- **Server state:** generation status, artifact metadata, and API errors.
- **Local persistence:** imported/exported JSON or a browser draft, if enabled.

Prefer derived values during render over effects that mirror other state. Use an
effect for a real external synchronization boundary: API calls, browser APIs,
object URLs, workers, or subscriptions. Clean up object URLs, listeners,
workers, timers, and subscriptions.

Model complex workflows with explicit states rather than scattered booleans.
Prevent stale or out-of-order responses from replacing newer scene revisions.

## Controls, Forms, And Copy

- Buttons perform actions; links navigate.
- Use one visually dominant primary action per decision area.
- Label actions with explicit verbs: `Generate CAD`, `Download STEP`, `Fit view`,
  `Save diagram`.
- Give inputs persistent visible labels and show validation beside the field.
- Preserve valid edits after validation or network errors.
- Use a focused dialog for a short form or settings task that belongs to the
  current context. Use a dedicated page when the task needs substantial space,
  multiple sections or steps, deep linking, or frequent reference while working.
- Make unsaved state and save behavior visible.
- Keep destructive actions separated, clearly labeled, and reversible where the
  product allows it.
- Use tooltips to clarify visible controls, never to hide essential instructions.
- Do not show fake precision or progress. If CadQuery progress is not measurable,
  say `Generating CAD model…` instead of inventing a percentage.

Every asynchronous operation needs the states that apply to it: loading,
success, empty, partial, error, and retry. Do not show an empty state before the
initial load has completed.

## Lists And Data-Dense Views

Any user-browsable collection must answer how a user finds one item and what
happens when there are many. Add search, paging, and page size in the same change
unless the collection is genuinely bounded by a domain constraint.

- Search and page at the source for server-backed data.
- Treat cursors as opaque.
- Reset or reconcile paging when search or page size changes.
- Guard against out-of-order search responses.
- Do not silently truncate a collection.
- Align numeric values consistently and include units where they affect a
  decision.
- Use sticky headers only when they preserve orientation without consuming the
  workspace.
- Virtualize large lists, tables, logs, or trees rather than rendering an
  unbounded DOM.

## Accessibility

- Use semantic HTML and native controls where they express the behavior.
- Make every action keyboard reachable with visible focus.
- Give icon-only controls accessible names.
- Do not use color as the sole signal for selection, status, or errors.
- Announce meaningful asynchronous results and errors.
- Keep focus inside dialogs and restore it on close.
- Provide a non-drag path for essential diagram actions.
- Respect reduced-motion preferences.
- Maintain WCAG AA contrast and practical touch targets.
- Ensure errors identify the affected entity or action and the next recovery step.

## Performance And Debuggability

Measure before optimizing. Watch for:

- full-application rerenders during node drag, zoom, or resize;
- graph layout or route calculation during every render or pointer event;
- thousands of SVG/DOM nodes when viewport culling or virtualization is possible;
- repeated parsing, deep cloning, or serialization of the scene;
- large GLB payloads and unnecessary viewer code on non-viewer routes;
- uncleared object URLs, workers, subscriptions, or event listeners.

Use memoized node renderers, incremental layout, throttled visual updates, and a
worker for genuinely expensive graph work. Do not add memoization or a worker
without identifying the bottleneck.

Errors should name the boundary and stable IDs, for example:
`Rack rack-a4 references missing power node pdu-01`. Never log secrets or raw
customer content.

## Frontend Testing Checklist

Test observable behavior rather than private implementation details.

- Scene serialization and validation round-trip correctly.
- Node movement, property editing, connection creation, deletion, selection,
  pan, zoom, fit, and keyboard actions work.
- Generate CAD shows ready, generating, success, validation-error, timeout, and
  failure states without losing edits.
- STEP and GLB links use the returned artifact identity.
- The viewer handles loading, valid output, missing output, and malformed output.
- Important controls have labels and visible focus.
- The canvas, inspector, and generation toolbar reflow at 320px and remain usable
  at desktop width.
- Large diagrams do not rerender the entire application during drag.

## Review Checklist

- [ ] The primary task and primary action are obvious.
- [ ] Supporting detail does not make the page busy; substantial secondary tasks
      have a dedicated route and focused contextual forms use dialogs appropriately.
- [ ] Domain scene state is separate from UI and viewport state.
- [ ] Existing primitives and patterns were reused.
- [ ] Loading, empty, success, error, and retry behavior are explicit.
- [ ] The user's edits survive recoverable failures.
- [ ] The visual treatment follows `docs/product/design.md`.
- [ ] Keyboard, touch, screen-reader, and reduced-motion behavior were considered.
- [ ] Narrow and desktop layouts were rendered and checked.
- [ ] No unnecessary dependency, abstraction, or global state was introduced.
- [ ] Tests and verification limitations are reported accurately.

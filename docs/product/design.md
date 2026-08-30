# Product Design Guidance

This is the visual and interaction source of truth for the data-center
engineering application. Frontend implementation rules live in
[`../engineering/frontend.md`](../engineering/frontend.md). When a component
library or framework convention conflicts with this document, preserve the
user's clarity and the technical visual language first.

## Product Character

The product should feel like a calm, precise engineering instrument: direct,
legible, spatial, and slightly nerdy. It connects 2D schematics, CAD output,
topology, and operational data, so the interface may be technical without being
cryptic.

Prioritize:

1. Correctness and trustworthy state
2. Clarity and spatial orientation
3. Accessibility
4. Efficient expert workflows
5. Restrained visual polish

Do not make the interface look busy merely because the underlying system is
complex. Complexity should be revealed progressively.

## Visual Direction

Use a simple geometric language:

- Rectangular surfaces with sharp edges are the default.
- Use no border radius by default. If a component genuinely benefits from a
  radius, keep it subtle and never use pill-shaped UI for ordinary controls.
- Prefer flat surfaces, clear alignment, and whitespace over cards floating in
  space.
- Use thin and thick borders deliberately to establish hierarchy. A 1px border
  can define structure; a 2–3px border can mark selection, focus, a primary
  action, or an important boundary. Do not put thick borders on everything.
- Use a small, restrained shadow only when it clarifies elevation for a drawer,
  menu, or modal. Never use shadows as decoration.
- Keep controls rectangular and compact enough for expert workflows while
  retaining practical touch targets.

The visual goal is closer to a well-designed schematic, instrument panel, or
technical workstation than a consumer social app.

## Inspiration References

These references inform principles, not imitation. Do not copy their logos,
typefaces, colors, illustrations, layouts, or marketing language. Adapt only
the behaviors that make this product clearer.

| Reference | Principle to borrow | Application here |
|---|---|---|
| [Temporal](https://temporal.io/) | Lead with one powerful promise and make complex reliability concepts visible through clear technical stories and memorable geometric artwork. | Make the 2D-to-CAD round trip the central story; show generation stages, recovery, and model state plainly. Use occasional schematic or pixel-like artwork with purpose. |
| [Effect](https://www.effect.website/) | Make technical credibility interactive: structured examples, explicit types, visible failures, and composable primitives. | Expose units, entity types, validation messages, scene revisions, and artifact formats. Prefer small predictable controls over magical automation. |
| [Browserbase](https://www.browserbase.com/) | Organize a complex platform around a small set of understandable primitives and make observability part of the product. | Treat rooms, racks, power paths, scenes, generations, and artifacts as understandable building blocks. Give users useful generation status and diagnostics. |
| [Vercel](https://vercel.com/) | Use high-contrast restraint, generous whitespace, modular information, and one obvious next action. | Let the canvas/viewer dominate, keep chrome quiet, and make `Generate CAD` the clear action for the current scene. |
| [Linear](https://linear.app/homepage) | Combine a polished, dense workspace with strong hierarchy, keyboard fluency, contextual detail, and precise status language. | Make the editor efficient for expert users: sidebar, canvas, inspector, shortcuts, selection state, revision state, and compact technical metadata. |

### Synthesis

The resulting direction is **technical minimalism with instrument-like feedback**:

- simple monochrome foundations and one disciplined signal accent;
- sharp rectangular surfaces and deliberate border weight;
- a spacious primary workspace with dense detail available on demand;
- product UI and diagrams as the proof, rather than decorative hero imagery;
- visible states and recovery paths for every expensive or asynchronous action;
- keyboard-friendly interactions that remain discoverable to new users.

Avoid combining the references into a collage of recognizable brand traits. The
data-center scene, its geometry, and its engineering state are the identity.

## Color And State

Build the base from paper/white, ink/near-black, and a disciplined gray scale.
Use one primary signal accent for actions and selection, then reserve semantic
colors for meaning:

- Accent: active tools, selected entities, links, and primary actions
- Amber: warning, pending review, or capacity concern
- Green: verified or successfully generated
- Red: destructive action or failed operation

Color must never be the only indication of state. Pair it with borders, icons,
labels, patterns, or position. Do not introduce gradients, glass effects, glossy
surfaces, generic AI glows, or neon effects without a specific product reason.

The application supports a complete user-selectable dark theme alongside the
light theme. The theme toggle must apply to the shell, schematic canvas,
inspector, generation states, and 3D preview together; do not add one-off dark
surfaces that create a second visual language. Persist the user's choice and
use the system preference only as the initial default.

## Typography And Content

Use a highly legible sans-serif for interface text. Use a monospace face for
asset IDs, coordinates, measurements, units, scene revisions, status detail,
and code. Typography should support scanning rather than act as decoration.

- Use clear hierarchy instead of many font sizes.
- Keep technical values visually aligned and include units where they affect a
  decision.
- Use short, explicit verbs: `Generate CAD`, `Download STEP`, `Fit view`,
  `Add rack`, and `Save diagram`.
- Name the object, operation, and consequence in errors and confirmations.
- Avoid vague copy such as `Run`, `Something went wrong`, or `Are you sure?`.
- Never imply that a model, automation, or generated result is authoritative
  beyond what has actually been validated.

## Geometric Artwork

Artwork should appeal to engineers and reinforce the product's subject:

- grids, coordinate axes, orthographic views, isometric linework, rack outlines,
  circuit traces, topology links, floor tiles, and simple machine geometry;
- flat fills, technical line weights, measured spacing, and limited accent color;
- small schematic marks or patterns that can be understood as data, not generic
  decoration.

Do not use stock illustrations, soft blobs, photorealistic scenes, decorative
3D objects, or visual noise unrelated to the data-center model. A geometric
visual should clarify context or make an empty state feel intentional.

## Layout And Sticky Regions

Use a stable workspace hierarchy:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Sticky app header: identity, state, primary action                  │
├──────────────┬──────────────────────────────────────┬───────────────┤
│ Navigation   │ Main schematic or 3D viewer          │ Inspector     │
└──────────────┴──────────────────────────────────────┴───────────────┘
```

- The canvas or viewer receives most of the available space.
- Use sticky headers for project identity, save/generation state, and the most
  important workspace controls. The header must have an opaque background,
  clear bottom border, and a deliberate stacking order.
- A canvas toolbar may remain sticky within its canvas region when it preserves
  orientation or keeps essential actions reachable.
- Avoid stacking multiple sticky bars; they should not consume the work area.
- Supporting panels should have clear boundaries and their own scroll regions.
- Keep the header for context and page actions. Put persistent destinations in a
  sidebar, with a drawer treatment on narrow screens.
- On mobile, show one task or pane at a time and provide an obvious way back.

## Schematic Canvas

The ReactFlow canvas is the primary work surface for the first milestone.

- Make the grid, origin, zoom level, and current selection legible.
- Use node shapes and line weights that distinguish rooms, racks, power nodes,
  and connections without relying on color alone.
- Keep selection unmistakable with a strong outline or border treatment.
- Make connection handles discoverable and invalid connections visibly distinct.
- Provide fit-to-view, zoom, pan, selection, and active-tool feedback.
- Keep the inspector focused on the current selection; never show stale values.
- Use technical labels and units consistently. Do not crowd every node with all
  metadata; reveal detail in the inspector.
- Preserve the user's diagram when CAD generation or preview loading fails.

## CAD And 3D Viewer

The 3D viewer is a companion to the schematic, not a decorative hero image.

- Use a restrained technical scene: clear geometry, neutral materials, and
  meaningful accent colors for selected or relevant objects.
- Give the model room to breathe and keep controls minimal and rectangular.
- Provide orbit, pan, zoom, fit-to-scene, and reset-view controls.
- Distinguish the engineering STEP artifact from the browser GLB preview.
- State clearly whether the displayed model is current, generating, failed, or
  based on an earlier scene revision.
- Do not imply live synchronization when generation is explicitly user-triggered.
- Defer 2D↔3D highlighting until shared object identity and picking behavior are
  reliable.

## Interaction Principles

### Make The Work Legible

Users should understand what the system read, what it produced, what changed,
and what needs their decision. Prefer visible state and plain-language
consequences over magical transitions.

### Preserve Human Authority

Generation, overwrite, deletion, export, and other consequential actions should
name the target and outcome. Do not hide important actions in ambiguous menus or
make destructive actions look like routine navigation.

### Design Failure And Recovery

Every asynchronous operation needs the applicable loading, empty, success,
partial, error, and retry states. Preserve work through recoverable failures and
explain whether an operation completed, failed before execution, or may need
verification before retrying.

### Prefer One Clear Job

Each screen should have a primary task a user can name. A diagram workspace may
include an inspector because both support diagram editing; it should not also
serve as an unrelated project list or report.

### Disclose Complexity Progressively

Lead with the next decision. Keep advanced topology, capacity, CAD, and future
simulation details available without forcing every user to understand them
before they can place a rack or inspect a model.

## Accessibility Baseline

- Use semantic elements and native controls where possible.
- Make every interaction keyboard reachable with visible focus.
- Give icon-only controls accessible names.
- Do not use color alone for selection, status, warnings, or errors.
- Keep dialogs focused and restore focus when they close.
- Announce meaningful asynchronous status and errors.
- Provide a non-drag alternative for essential canvas actions.
- Respect reduced-motion preferences.
- Maintain WCAG AA contrast and practical touch targets.
- Keep primary actions reachable at narrow widths and with a keyboard open.

## Design Review Checklist

- [ ] Is the user's next decision obvious?
- [ ] Is the current project, scene revision, selection, and model status clear?
- [ ] Are the canvas/viewer and supporting panels hierarchically distinct?
- [ ] Are rectangular geometry and deliberate thin/thick borders used consistently?
- [ ] Are sticky regions useful without covering the work?
- [ ] Does artwork use simple technical geometry rather than generic decoration?
- [ ] Are loading, empty, success, partial, error, and retry states represented?
- [ ] Can a user recover without losing diagram edits or duplicating an action?
- [ ] Does the surface work with keyboard, screen reader, touch, and reduced motion?
- [ ] Does it follow the compact frontend guidance in `frontend.md`?

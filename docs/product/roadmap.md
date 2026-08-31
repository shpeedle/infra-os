# Product Roadmap

This document is the canonical long-range product roadmap. The current,
implementation-ready scope and acceptance criteria remain in
[`../../PROJECT_PLAN.md`](../../PROJECT_PLAN.md). Future phases here describe
direction and sequencing, not committed release dates.

## Product Vision

Build an open-source intelligence and automation platform for physical
data-center infrastructure, centered on a trustworthy digital twin.

The product begins as a 2D engineering workspace that produces deterministic
CAD. It should evolve into a system that understands facility state, simulates
proposed changes, explains constraints, recommends plans, and eventually
executes explicitly approved actions within policy limits.

The digital twin is the AI's world model. It—not an LLM—must remain the source
of truth for assets, geometry, topology, capacity, telemetry, history, failure
domains, policies, simulations, and operational changes.

The intended position is not another dashboard, generic chatbot, traditional
DCIM replacement, or 3D visualization product. It is an open, vendor-neutral
simulation and intelligence layer that can complement systems such as NetBox,
BMS/EPMS, telemetry platforms, schedulers, and existing DCIM tools.

## Roadmap Principles

### Deterministic twin, bounded AI

Engineering calculations belong in validated domain and simulation services.
Power and cooling capacity, redundancy, thermal limits, failure domains,
policy checks, and blast radius must not depend on an LLM's arithmetic or
unsupported claims. AI may select tools, correlate evidence, propose changes,
and explain deterministic results.

### Simulation before execution

Consequential operations follow one control path:

```text
propose → simulate → validate constraints → evaluate policy
        → approve → execute → verify → record outcome
```

Early AI capabilities are read-only or advisory. Any destructive,
customer-visible, expensive, or physical action requires an explicit review
path. High-risk physical controls may remain permanently human-approved.

### Human authority and reversible change

Protect current edits and production state. Model-generated changes are
proposals against a specific scene or facility revision. Show the evidence,
assumptions, constraints, and expected impact before acceptance, and retain a
reversible history after acceptance.

### Vendor-neutral and deployable on premises

Keep domain models independent of equipment vendors, data sources, and model
providers. The long-term platform should support fully offline operation,
local or customer-hosted models, and optional cloud providers without making
AI a prerequisite for the deterministic twin.

### Trust before breadth

Advance only after the preceding layer has explicit identity, units, revision
state, validation, observable failures, and representative tests. A reliable
vertical slice is more valuable than many partially connected features.

## How Progress Is Tracked

The roadmap records outcomes, while implementation plans and GitHub issues or
milestones record individual tasks, owners, and sequencing.

Use these phase statuses consistently:

- **Not started:** implementation has not begun.
- **In progress:** the phase has an active implementation plan and tracking
  work.
- **Blocked:** progress cannot continue until a named dependency or decision is
  resolved.
- **Complete:** every exit-gate checkbox is satisfied by linked evidence.
- **Deferred:** the phase or capability was intentionally moved out of the
  active sequence.
- **Horizon:** a long-term direction that is not yet an implementation
  commitment.

Only check an exit-gate item after its acceptance evidence exists in a merged
change, test result, demonstration record, or durable documentation. Add that
evidence to the phase's tracking issue or milestone. When work on a future phase
begins, replace `Not opened` with links to its scoped implementation plan and
tracking milestone before changing the status to `In progress`.

## Architecture Evolution

The current boundary is intentionally small:

```text
React/ReactFlow editor
        ↓ versioned scene JSON
FastAPI validation and orchestration
        ↓ validated scene
CadQuery generation
        ↓
STEP engineering artifact + GLB browser preview
```

Future phases extend this boundary without replacing its stable entity IDs or
engineering contracts:

```text
Operators and approved automations
                ↓
      Copilot / specialized agents
                ↓ tool and action APIs
        Digital twin services
  model · topology · history · policy
  capacity · simulation · forecasting
         ↙                 ↘
operational records      topology/spatial stores
         ↘                 ↙
       integration and telemetry layer
Redfish · SNMP · Modbus · BACnet · OPC UA
Prometheus · NetBox · BMS/EPMS · CSV/Excel
Kubernetes · Slurm · vendor adapters
```

Postgres/PostGIS, Neo4j, time-series storage, connector infrastructure, and
background workers are later implementation decisions. They are not current
MVP dependencies and must be introduced behind domain boundaries.

## Phase 0 — Editor-to-CAD Foundation (Current)

**Status:** In progress

**Tracking:** [`../../PROJECT_PLAN.md`](../../PROJECT_PLAN.md)

Goal: prove that a user-authored, versioned 2D scene can be validated and
turned into useful engineering and browser artifacts without losing intent.

### Milestones

1. CadQuery geometry proof with representative STEP and GLB output.
2. ReactFlow room, rack, power-node, and power-edge editor.
3. FastAPI scene validation, synchronous generation, and artifact delivery.
4. Embedded GLB viewer, failure recovery, tests, and usability hardening.

### Scope

- One fixed rectangular room with racks and upstream power nodes.
- Browser-first JSON import, export, and draft persistence.
- Stable entity IDs shared by the scene, API, CAD assembly, and artifacts.
- Explicit length, position, coordinate-system, rack-height, and power units.
- User-triggered generation rather than implied live synchronization.
- Visible idle, generating, success, and failure states.
- STEP as the engineering artifact and GLB as the browser preview.

### Exit gate

- [ ] Scene edits round-trip without changing IDs, positions, dimensions, or
  connections.
- [ ] Invalid imports and generation requests fail clearly without losing edits.
- [ ] Representative scenes generate inspectable STEP and GLB artifacts with the
  expected object count, placement, and units.
- [ ] A new developer can run the complete workflow from the repository docs.

## Phase 1 — Open Operational Twin

**Status:** Not started

**Tracking:** Not opened

Goal: evolve the scene into a trustworthy model of what is installed, where it
is, and how it is connected.

### 1A. Facility and asset model

- Add sites, buildings, data halls, rooms, rows, racks, devices, and rack-unit
  placement incrementally.
- Add editable room boundaries, multiple rooms, lifecycle metadata, and richer
  equipment templates only as required by concrete workflows.
- Preserve stable domain IDs across 2D, 3D, storage, telemetry, and topology.
- Introduce versioned facility revisions, comparison, audit history, and
  hypothetical branches.

### 1B. Dependency graph and engineering topology

- Treat power as a first-class path from utility, switchgear, generator, and
  UPS through distribution equipment to rack PDUs and server PSUs.
- Model A/B feeds, N/N+1/2N redundancy, breaker and distribution limits,
  reserve policy, rated versus observed load, path independence, and failure
  domains.
- Add cooling relationships for chillers, CRAH/CRAC equipment, pumps, CDUs,
  primary and secondary loops, air cooling, and direct-to-chip cooling.
- Add network and workload relationships after the supporting asset identities
  are reliable.
- Add cable trays and deterministic route generation only after physical
  connection endpoints and routing constraints are explicit.

### 1C. Import and integration foundation

- Make CSV and Excel import a first-class adoption path with field mapping,
  preview, validation, duplicate detection, missing-relationship detection,
  and reconciliation.
- Integrate with NetBox as a source of asset and network truth rather than
  attempting to replace it initially.
- Add Redfish and SNMP first; consider Modbus TCP, BACnet, OPC UA, MQTT,
  Prometheus, REST/webhooks, BMS, EPMS/PMS, smart PDUs, environmental sensors,
  CDUs, chillers, and existing DCIM systems as demand is proven.
- Define a narrow connector contract for discovery, inventory, telemetry,
  alarms, and relationships before creating a general plugin ecosystem.

### 1D. Current and historical state

- Distinguish desired, imported, observed, simulated, and generated state.
- Store bounded telemetry, events, alarms, configuration, maintenance,
  topology, capacity, and simulation history with source and timestamp.
- Detect drift between expected and observed assets, placement, connections,
  device information, and operating values.
- Provide a reconciliation workflow; never silently overwrite curated intent
  with an observed or imported value.
- Move artifact generation to observable background jobs only when synchronous
  generation no longer meets measured workload or reliability needs.

### Exit gate

For a representative real facility, the system can answer with provenance:

- [ ] Installed assets and their locations can be queried.
- [ ] The power and cooling path for each asset can be queried.
- [ ] Dependencies and shared failure domains can be queried.
- [ ] Designed, imported, observed, and stale values are distinguishable.
- [ ] Changes between two facility revisions can be explained.

## Phase 2 — Capacity and Failure Simulation

**Status:** Not started

**Tracking:** Not opened

Goal: make deterministic what-if analysis the first major operational product
wedge.

### Capacity engine

- Calculate deployable capacity rather than reporting only installed or
  nameplate capacity.
- Evaluate rack space, floor loading, A/B power headroom, cooling headroom,
  CDU capacity, thermal limits, network connectivity, redundancy, and policy.
- Identify stranded capacity and the primary and secondary constraints that
  prevent its use.
- Support high-density AI rack templates with power envelopes, liquid/air
  cooling split, required flow, supply and return temperatures, delta-T, and
  reserve requirements.
- Add facility-level AI infrastructure readiness only when its score can be
  decomposed into evidence-backed power, cooling, network, floor-loading, and
  redundancy measures.

### Simulation workflows

- Answer placement requests such as “Where can a 120 kW A+B rack go?” through
  deterministic tool calls.
- Simulate loss of power, cooling, network, rack, room, and sensor components.
- Calculate affected assets, redundancy loss, unavailable load, exposed
  workloads, and shared failure domains.
- Compare scenarios for expansions, retrofits, maintenance, and equipment
  modernization without changing production state.
- Start thermal analysis with fast, explainable approximations based on inlet
  and outlet temperature, delta-T, humidity, pressure, airflow, liquid
  temperature, and CDU utilization. Keep CFD an optional later backend.

### Product story

A representative demonstration should import or build a facility, evaluate a
high-density rack expansion, explain why candidate locations pass or fail,
show the power and cooling impact, simulate a component failure, and compare
the safest valid plans.

### Exit gate

- [ ] The same versioned input and policy set produce reproducible results.
- [ ] Every result identifies its source revision, units, assumptions, constraints,
  and calculation version.
- [ ] Invalid, incomplete, or stale evidence produces a bounded “unknown” result,
  not invented confidence.
- [ ] Simulation never mutates the production branch implicitly.

## Phase 3 — Explainable AI Copilot

**Status:** Not started

**Tracking:** Not opened

Goal: provide natural-language access to deterministic twin operations.

The copilot should answer questions about placement, capacity, utilization,
change history, redundancy, failure domains, anomalies, and facility limits by
calling typed tools. Initial tools may include:

- find valid capacity and explain rejected locations;
- trace power, cooling, network, and dependency paths;
- calculate a failure domain or blast radius;
- simulate placement, failure, or maintenance;
- compare facility revisions and scenario branches;
- find stranded capacity or thermal anomalies;
- explain an alarm from recorded evidence.

Model output must conform to versioned schemas. Authorization, engineering
constraints, policy, and validation remain outside prompts. Each response
should distinguish deterministic facts, retrieved evidence, assumptions,
inferences, and unknowns.

### Exit gate

- [ ] Answers cite the facility revision, telemetry window, policies, and tool
  results used.
- [ ] Schema-invalid or unauthorized tool requests fail closed.
- [ ] Prompt injection, missing context, invalid geometry, unsupported claims, and
  prohibited actions have deterministic tests.
- [ ] The twin and simulation workflows remain fully useful without an AI model.

## Phase 4 — Operational Analyst

**Status:** Not started

**Tracking:** Not opened

Goal: continuously surface meaningful changes and risks that operators may not
notice unaided.

Capabilities may include:

- power, cooling, thermal, and equipment anomaly detection;
- event correlation and evidence-backed root-cause assistance;
- equipment degradation and failure-risk signals;
- capacity, energy, and utilization forecasting;
- workload-to-infrastructure correlation;
- maintenance and facility-change summaries;
- sustainability measures such as PUE, WUE, energy, carbon intensity, and
  historical efficiency trends where source data supports them.

Recommendations must show the observation window, baseline, correlated events,
calculation or model version, confidence calibration, and plausible alternative
causes. Operators control acknowledgment, suppression, and escalation.

### Exit gate

- [ ] Offline evaluation shows useful precision and recall on representative data.
- [ ] Alerts are deduplicated, rate-limited, traceable, and safe under missing or
  delayed telemetry.
- [ ] Predictions never masquerade as observed state or deterministic calculation.

## Phase 5 — AI Engineer and Advisory Agents

**Status:** Not started

**Tracking:** Not opened

Goal: generate reviewable infrastructure plans and continuously recommend
improvements.

The AI engineer may produce multiple validated options for capacity additions,
rack moves, power balancing, cooling upgrades, maintenance, and retrofit work.
Each option should include required changes, capacity gained, policy results,
cost and schedule assumptions, risks, and simulated impact.

Specialized capacity, power, cooling, reliability, incident, maintenance, and
optimization agents may monitor bounded domains. They share the twin and tool
contracts rather than maintaining separate truths, and remain advisory in this
phase.

Workload-aware planning may later connect facility constraints to Kubernetes,
Slurm, OpenStack, VMware, storage, GPU orchestration, and network systems. This
can support thermal-, energy-, maintenance-, and infrastructure-aware workload
placement after the underlying facility model is trustworthy.

### Exit gate

- [ ] Plans are reproducible against a named scenario and cannot bypass simulation
  or policy checks.
- [ ] Competing plans expose their tradeoffs and unsupported assumptions.
- [ ] Agent activity is observable, cancellable, rate-limited, and auditable.
- [ ] No agent can modify an external system in this phase.

## Phase 6 — Controlled Autonomy

**Status:** Not started

**Tracking:** Not opened

Goal: permit a small set of bounded, policy-approved operational actions.

Begin with low-risk actions such as creating a ticket, notifying an operator,
updating a forecast, generating a maintenance plan, or opening a change
request. Later candidates may include workload migration, scheduler changes,
or cooling adjustments only after domain-specific safety review.

The policy engine must be version-controlled, testable, simulation-aware,
tenant-aware where relevant, and explicit about actions that are automatic,
approval-required, or prohibited. Execution requires idempotency, timeout and
retry policy, partial-failure handling, cancellation, least privilege,
verification, and a durable audit trail.

### Exit gate

- [ ] Every action is attributable to an operator, policy version, proposal,
  simulation, approval, and verification result.
- [ ] Dry-run, rollback or compensating action, and emergency-stop paths are tested.
- [ ] Loss of telemetry, model access, or a downstream integration fails safely.
- [ ] High-risk physical actions remain prohibited unless separately authorized by
  a mature safety case.

## Phase 7 — Self-Optimizing Operations (Horizon)

**Status:** Horizon

**Tracking:** Not opened

The long-term feedback loop is:

```text
telemetry → twin → analysis → simulation → policy → approved control
    ↑                                                    ↓
    └──────────────── verification ← physical facility ─┘
```

Potential capabilities include dynamic workload placement, thermal- and
energy-aware scheduling, cooling optimization, power balancing, predictive
maintenance, capacity optimization, and bounded remediation. This is a horizon,
not a current commitment; each control domain needs independent safety,
reliability, and operator-trust evidence.

## Capability Sequence

| Capability | Earliest phase | Status | Notes |
|---|---:|---|---|
| Scene model, stable identity, explicit units | 0 | In progress | Foundation for every later phase |
| 2D editing and STEP/GLB generation | 0 | In progress | Current implementation target |
| Facility hierarchy and richer assets | 1 | Not started | Added incrementally from real workflows |
| Versioned facility state and scenarios | 1 | Not started | Production and hypothetical state remain distinct |
| Dependency graph and power/cooling topology | 1 | Not started | Storage technology remains an implementation choice |
| CSV/Excel, NetBox, Redfish, and SNMP | 1 | Not started | Sequence connectors by validated demand |
| Live telemetry, history, and drift detection | 1 | Not started | Preserve source, timestamp, quality, and staleness |
| Usable and stranded capacity | 2 | Not started | Deterministic, policy-aware calculation |
| What-if placement and blast-radius simulation | 2 | Not started | Initial operational wedge |
| High-density rack and liquid-cooling planning | 2 | Not started | Avoid full CFD as an early dependency |
| Natural-language copilot | 3 | Not started | Typed, read-only tools first |
| Forecasting, anomaly, and root-cause assistance | 4 | Not started | Separate prediction from observed facts |
| AI-generated infrastructure plans | 5 | Not started | Multiple simulated options with tradeoffs |
| Specialized advisory agents | 5 | Not started | No external mutation |
| Controlled operational actions | 6 | Not started | Start with low-risk workflow actions |
| Autonomous optimization | 7 | Horizon | Long-term, domain-gated horizon |
| Photorealistic 3D and full CFD | Optional | Deferred | Useful only when they improve a proven workflow |

## Product and Ecosystem Strategy

### 3D supports understanding

The hierarchy may eventually span campus, building, hall, row, rack, and
device, with overlays for power, temperature, cooling, capacity, network,
risk, and failure domains. Reliable shared identity should eventually support
2D-to-3D selection and focus. The 3D view is an explanation and inspection
surface, not the system of record or the primary moat.

### Open interfaces compound adoption

Candidate open components include the twin data model, graph schema, APIs,
simulation and connector SDKs, agent tool protocol, core connectors, web UI,
and model-provider interface. A plugin ecosystem should emerge from multiple
real integrations rather than precede them.

The strongest long-term assets are the open infrastructure graph, connector
ecosystem, deterministic simulation engine, historical facility state,
failure model, policy engine, community device models, and trust earned through
explainable results.

### Commercial packaging must not weaken the core

Potential future enterprise services include support, hosted deployment,
fleet management, SSO/RBAC, multi-tenancy, enterprise connectors, advanced
forecasting and simulation, compliance packages, and managed model hosting.
These are not current commitments. The open twin, core simulation, and useful
local workflows should remain independently valuable.

## Explicit Deferrals

Until Phase 0 is reliable, do not pull the following into the current MVP:

- Postgres, PostGIS, Neo4j, or time-series infrastructure;
- live telemetry and vendor connector frameworks;
- automatic CAD regeneration or background job infrastructure;
- multi-user editing, authentication, tenancy, or enterprise controls;
- capacity, thermal, failure, or optimization simulations;
- AI authoring, copilots, agents, or model-provider abstractions;
- workload orchestration or physical control;
- photorealistic visualization or full CFD.

Roadmap items move into implementation only through a scoped plan with named
users, domain contracts, failure behavior, security boundaries, verification,
and acceptance criteria.

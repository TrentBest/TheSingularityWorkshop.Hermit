<!-- The Singularity Workshop animated moniker -->
<p align="center"><a href="https://github.com/TrentBest"><img src="https://raw.githubusercontent.com/TrentBest/TheSingularityWorkshop.Visualize/development/docs/assets/moniker.svg" alt="The Singularity Workshop animated moniker" width="720" /></a></p>

# Hermit — The Workshop's Persistent Creative Companion

[![Sith Policy](assets/sith-policy.svg)](https://github.com/TrentBest/TheSingularityWorkshop.Hermit/actions/workflows/sith-policy.yml)
**A developer should never create alone unless they choose to. Hermit is their persistent, embodied creative companion inside The Singularity Workshop.**

Like a hermit crab adopting a shell, Hermit is designed to inhabit different hosts without rewriting its intelligence, orchestration or capability model for each one.

The goal is a portable assistant runtime that can inhabit a desktop application, browser, server, developer workspace or another supported environment. Each host supplies a shell: presentation, identity, context, capabilities, lifecycle and policy. Hermit coordinates the assistant experience within that shell.

> **The environment owns its authority. Hermit discovers and uses capabilities; it does not acquire permission merely because a model suggested an action.**

## What Hermit owns

- Task orchestration, planning and bounded reasoning.
- Discovery and selection of environment capabilities.
- Model invocation through provider-neutral adapters.
- Deterministic validation of proposed actions.
- Policy checks, approval workflows and controlled execution.
- Memory coordination, provenance, retention and audit.
- Progress, evidence, cancellation and failure reporting.

Hermit is not another LLM provider client, GUI framework, runtime composition kernel or unrestricted model-to-shell bridge.

## Where it fits

```text
User / event
    |
    v
Environment shell (desktop / web / server / IDE / ...)
    | identity, context, capabilities, policy
    v
  HERMIT
  +---------------------------+
  | Task orchestration        |
  | Planning and routing      |
  | Capability discovery      |
  | Memory coordination       |
  | Policy and approval       |
  | Action execution          |
  | Evidence and audit        |
  +---------------------------+
       |       |        |
       v       v        v
   HeadlessAi FSM_API MicroBundles
       |       |        |
       +-------+--------+
               |
       Environment adapters
               |
         Actual environment
```

This is a target architecture, not a claim that every integration is already implemented. See the [Hermit × SURPS integration contract](docs/SURPS_INTEGRATION.md), the [read-only SURPS observation bridge](docs/SURPS_OBSERVATION.md), [Architecture and Boundaries](docs/ARCHITECTURE.md), [Hermit in the Workshop](docs/WORKSHOP_DOMAIN.md), [GOAP and Idle Life](docs/GOAP_AND_IDLE.md), [Microbundle Wrappers](docs/MICROBUNDLE_WRAPPERS.md), [Human-in-the-Loop Creation](docs/HUMAN_IN_THE_LOOP.md), [Task Checkpoints](docs/TASK_CHECKPOINTS.md), [Checkpoint Repository](docs/CHECKPOINT_REPOSITORY.md), [Cross-device Hermit Continuity](docs/CROSS_DEVICE_CONTINUITY.md), the [HeadlessAi Integration Boundary](docs/HEADLESSAI_INTEGRATION.md), and [Voice Interaction](docs/VOICE_INTERACTION.md), and the [Host Capability Catalog](docs/CAPABILITY_CATALOG.md) and [Host Capability Dispatch](docs/CAPABILITY_DISPATCH.md).

## Workshop building blocks

| Project | Existing responsibility | Hermit's relationship |
|---|---|---|
| [HeadlessAi](https://github.com/TrentBest/TheSingularityWorkshop.HeadlessAi) | Provider-neutral AI endpoint invocation | Inference transport; host retains planning and authority |
| [FSM_NeuralNetworks](https://github.com/TrentBest/TheSingularityWorkshop.FSM_NeuralNetworks) | Neural model, tensor, operation and inference contracts | Bounded computation capability; Hermit owns goals, policy and orchestration |
| [FSM_API](https://github.com/TrentBest/FSM_API) | State and processing lifecycle | Task and workflow lifecycle |
| [FSM_COS](https://github.com/TrentBest/TheSingularityWorkshop.FSM_COS) | Runtime composition | Assemble requested capabilities, not run the assistant loop |
| [MicroBundleDomain](https://github.com/TrentBest/TheSingularityWorkshop.MicroBundleDomain) | Neutral capability contract | Candidate capability packaging and discovery |
| [FSM_REST](https://github.com/TrentBest/TheSingularityWorkshop.FSM_REST) | REST capability and transport substrate | Remote environment adapters |
| [ProtocolAi](https://github.com/TrentBest/TheSingularityWorkshop.ProtocolAi) | Deterministic semantic identity | Resolve application-owned concepts |
| [GrammarAi](https://github.com/TrentBest/TheSingularityWorkshop.GrammarAi) | Deterministic structural constraints | Validate supported semantic structures |
| [GUI](https://github.com/TrentBest/TheSingularityWorkshop.GUI) | Semantic interface model and manifestations | Conversation, progress, approval and inspection surfaces |
| [DataWarehouse](https://github.com/TrentBest/TheSingularityWorkshop.DataWarehouse) | Data infrastructure | Storage candidate to evaluate against actual memory workloads |
| [CiAi](https://github.com/TrentBest/TheSingularityWorkshop.CiAi) | Build and verification automation | Validate Hermit and dependency health |

These are integration candidates, not mandatory dependencies. Keep Hermit's core independently testable and depend only on narrow contracts.

## The Workshop experience

A loaded microbundle may immediately add its semantic content to the environment, while an optional nested construction wrapper stages a visible build: Mini crews emerge from service doors, haul crates and assemble the contribution; a rare Titan crew may cross a portal for oversized rigging. The spectacle is an explanation of work, never a second installation or a reason to delay semantic correctness. Editors are microbundles too: they can request their target bundle, then edit its versioned data through host-controlled transactions.

Hermit's local behavior uses GOAP wherever known facts and affordances are sufficient. An LLM is consulted occasionally for semantic interpretation or creative reasoning, never for every movement, physics step, permission decision or routine action. A fully articulated body and GPU neural motion proposals are a long-term target; physics and host policy remain authoritative.

## First milestones

The public learning experience and the assistant-runtime proof are parallel tracks:

- **Public learning track:** the [Hermit Pages experience](https://github.com/TrentBest/TheSingularityWorkshop.Hermit/tree/development) opens with a deterministic Workshop playground backed by Hermit's capability registry and bounded execution loop. It now includes speech output, optional browser recognition, a typed request fallback, and a small voice-intent demonstration that preserves host approval. A separate 2-input / 2-output inference lesson remains available below it.
- **Runtime track:** [Build the first deterministic Hermit assistant vertical slice](https://github.com/TrentBest/TheSingularityWorkshop.Hermit/issues/1), using fake inference and a fake environment.

The broader runtime progression is:

1. Reconnaissance and contract comparison.
2. Deterministic assistant loop using fake inference and a fake environment.
3. Capability discovery, schema validation and safe execution.
4. Host-controlled permissions, approval, memory and audit.
5. First real Workshop shell.
6. Additional portable shells after the first proves the contracts.

The neural-network lesson is a separate educational presentation. It does not imply that neural inference is integrated into Hermit's assistant runtime. The Workshop playground exercises the existing deterministic runtime against local fixture objects; it is not a live model, physical robot, GPU motion system, or host-computer integration.

Every milestone must distinguish implemented, tested, specified and planned functionality. No NuGet publication without explicit authorization.

## Pages experience

See [the Pages experience guide](docs/PAGES_EXPERIENCE.md) for the scene model, capability boundary, host approval behavior, build assembly, and current limitations.

## Development

The repository follows the Workshop Sith branch policy: `master` and `development` only. Active work and local dependency integration belong on `development`; `master` is the stable line.

### Run the deterministic runtime proof

Requires Node.js 22 or later; the runtime has no third-party package dependencies.

```bash
npm test
node examples/deterministic-inspection.mjs
node examples/two-shell-continuity.mjs
node examples/surps-observation.mjs
```

The runtime proof is a small JavaScript implementation in `src/hermit-runtime.js`. The Pages playground composes it through `src/hermit-playground.js` and a browser adapter in `assets/hermit-playground.js`. It demonstrates a deterministic planner, explicit capability registry, structured argument validation, host-supplied policy, approval gating, bounded execution, cancellation/timeout propagation, bounded JSON output and an execution trace.

The runtime also exposes `executeLoop`: it observes the host environment, asks the planner for one capability at a time, runs the existing policy/approval gate for each action, and requires host verification before it records an outcome or replans. The loop has a total time budget and a hard action-count limit. This is still a deterministic adapter-driven proof, not a production assistant: it has no live model adapter, durable memory, real host shell, or provider integration. The tests use fake inference and environment adapters only. The Pages build tests both experiences, assembles the HTML, browser assets, runtime modules and documentation into `_site`, and uploads a GitHub Pages artifact. Deployment is limited to pushes on `development` and manual workflow runs. No package publishing is configured or authorized.

The versioned checkpoint contract has a host-supplied repository boundary and optional `executeLoop` integration. The loop persists before capability invocation, advances only after host verification, and marks verified completion. With `resume: true`, it restores a ready checkpoint's observation, verified outcomes and cursor; interrupted actions require the host's explicit reconciliation callback before continuation. Task mismatches and terminal checkpoints fail closed, and an in-flight action is never blindly replayed. Repository durability depends on the host adapter; tests currently use in-memory storage. Cross-device continuity now has a process-local two-shell reference adapter (`src/continuity-store.js`) and automated tests for shared identity, versioned state, event idempotency, checkpoint restore, capability isolation and stale-write rejection. The end-to-end `examples/two-shell-continuity.mjs` walkthrough now runs the actual `executeLoop` first on a phone/web shell and then resumes the same verified task through a desktop/AnyApp shell, where it performs a second desktop-only write action before completing. The automated tests cover the handoff, confirm the desktop action executes exactly once, verify that a phone-side policy denial prevents a desktop-only capability from being invoked, and prove that a newly created shell can restore shared state, events and task progress without inheriting the previous installation's local capabilities. This remains a process-local fixture, not durable or networked storage: authenticated identity, device enrollment, remote synchronization, production persistence and real web/AnyApp integration remain planned. A provider-neutral protocol module (`src/continuity-protocol.js`) now validates trusted-principal owner scoping, device/request envelopes, conditional state-write revisions, idempotency event identities, bounded opaque sync cursors and monotonic change pages. These are validation contracts only: authentication middleware, device authorization/revocation, durable atomic storage, network endpoints and cursor issuance remain host/service responsibilities and are not implemented. A host-injected orchestration layer (`src/continuity-service.js`) now composes those validators with injected authentication, per-request device authorization and an owner-scoped storage contract for sync, conditional state writes and idempotent event append. It rejects revoked/unknown devices, stale revisions, owner-mismatched adapter results and invalid change pages, and normalizes adapter failures without exposing storage details. Adapter-returned state and event records are defensively cloned and validated before their fields are used; authentication failures are normalized consistently across sync, state-write and event-append paths, and device authorization is rechecked on every request. This is an executable service boundary, not a deployed endpoint or production identity/storage implementation; host adapters must still provide real authentication, revocation checks, durable atomic CAS, event deduplication and cursor-safe change feeds.

---

<p align="center"><img src="https://raw.githubusercontent.com/TrentBest/FSM_API/master/Documentation/Branding/TheSingularityWorkshop.png" alt="The Singularity Workshop" width="420" /></p>

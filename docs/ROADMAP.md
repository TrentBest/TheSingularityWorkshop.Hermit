# Hermit domain roadmap

This roadmap distinguishes the domain vision from current executable evidence.

## Foundation: persistent companion and local planning
- [x] Define one personal full-size Hermit per developer.
- [x] Define Mini and Titan forms as coordinated worker manifestations.
- [x] Specify GOAP-first local planning and bounded idle behavior.
- [x] Add deterministic, bounded GOAP planning primitive and tests.
- [x] Add a versioned, immutable world-state snapshot contract for the deterministic Pages fixture.
- [ ] Define versioned affordance and action contracts and align them with Gestures/Physics ownership.
- [x] Add bounded plan execution with per-action policy, post-action verification and observation reconciliation.
- [x] Define and test versioned task-checkpoint serialization and recovery classification.
- [x] Add a host-backed checkpoint repository contract with atomic compare-and-swap, monotonic revisions, guarded deletion and recovery classification tests.
- [x] Integrate optional task-loop checkpoint writes before consequential invocation, after verified actions, and on verified completion; test that an existing task checkpoint is not overwritten.
- [x] Implement safe `executeLoop` resumption from ready checkpoints, including host-mediated reconciliation for interrupted actions; test restored state, task mismatch and terminal guards.
- [ ] Supply and verify a production durable adapter per host.
- [x] Specify cross-device continuity: shared companion identity/state separated from device presence and local capability authority.
- [x] Implement a process-local two-shell reference store with shared versioned state, idempotent events and shared checkpoint adapter.
- [x] Test that phone/web and desktop/AnyApp shell fixtures share identity and task progress without sharing local capabilities; test stale-write rejection.
- [ ] Define versioned continuity records, authenticated owner identity, device enrollment/revocation and host-scoped grants.
- [ ] Implement owner-scoped durable continuity storage, process-safe conditional writes, append-only events and paged change-feed cursors.
- [ ] Integrate real authenticated web and AnyApp shells with one Hermit identity and independent host policy.
- [ ] Add offline queue, conflict, revocation, deletion propagation and multi-device recovery tests.

## Cross-device continuity
- [x] Specify the shared-companion / local-authority architecture and threat boundaries.
- [x] Implement a process-local two-shell continuity reference proof.
- [x] Verify shared identity, shared state, duplicate event suppression, shared checkpoint restore, local capability isolation and stale-write rejection in automated tests.
- [ ] Implement authenticated server-side continuity and device enrollment.
- [ ] Connect the web shell and AnyApp desktop shell to one Hermit identity.
- [ ] Verify offline and conflict recovery.

## Embodiment and interaction
- [ ] Define articulated body, joint, reach, grip, force, balance and locomotion contracts.
- [ ] Integrate Gestures and Physics through narrow adapters.
- [ ] Define perception/affordance discovery and object interaction.
- [ ] Demonstrate safe object inspection and reversible play.
- [ ] Define GPU neural motion proposal interface and deterministic fallback.
- [ ] Demonstrate glass-container interaction from observation through verification.

## Workshop construction drama
- [x] Specify semantic payload versus optional nested wrappers.
- [x] Specify Mini/Titan scale, swarm LOD and aggregate progress.
- [ ] Align wrapper schema with MicroBundleDomain.
- [ ] Implement idempotent bundle-install construction event.
- [ ] Demonstrate volcano installation with immediate semantic placement and optional choreography.
- [ ] Add portals, worker staging, hauling and Titan rigging as presentation adapters.
- [ ] Ensure reduced-motion/low-resource mode preserves semantic result.

## Human-in-the-loop authoring
- [x] Define creator ownership, autonomy bands and approval boundaries.
- [ ] Build preview/diff/approve/undo for bundle edits.
- [ ] Implement editor microbundle target/version binding.
- [ ] Add shared-scene attribution and conflict handling.
- [ ] Add explicit pause, interrupt, dismiss and idle controls.

## Assistant development workflows
- [x] Preserve HeadlessAi as inference transport, not authority.
- [x] Preserve FSM_Foundry as durable ADP control plane.
- [ ] Align exact task/evidence/approval adapters with upstream contracts.
- [ ] Add repository tool capability contracts and adversarial tests.
- [ ] Demonstrate human-approved edit, CiAi verification and human review.

## Pages
- [x] Add a living page-level architecture map for Hermit intent, trust, environment and evidence boundaries.
- [ ] Extend the map with Mini crews, Titan portal and microbundle wrappers when their task/event contracts are implemented.
- [x] Add a deterministic Pages playground backed by Hermit's registered inspect/move capabilities, host policy, explicit approval, and post-action verification.
- [ ] Add volcano construction choreography timeline tied to a fixture task graph.
- [x] Keep the neural-network lesson separate; do not imply it controls Hermit's body.
- [x] Assemble Pages as a validated static artifact with documentation and deploy only from development pushes or manual runs.

## Definition of done for an embodied vertical slice

A user places a glass container on a counter. Hermit notices it, approaches within safe range, inspects it, proposes a harmless interaction, receives host policy approval where required, performs it through physics-aware adapters, verifies the actual result, and yields immediately when interrupted. Tests cover success, denial, unreachable object, physics rejection, interruption and recovery.

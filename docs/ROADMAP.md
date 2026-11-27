# Hermit domain roadmap

This roadmap distinguishes the domain vision from current executable evidence.

## Foundation: persistent companion and local planning
- [x] Define one personal full-size Hermit per developer.
- [x] Define Mini and Titan forms as coordinated worker manifestations.
- [x] Specify GOAP-first local planning and bounded idle behavior.
- [x] Add deterministic, bounded GOAP planning primitive and tests.
- [x] Add a versioned, immutable world-state snapshot contract for the deterministic Pages fixture.
- [x] Let the player author bounded scene objects; validate and version the world before making them observable to Hermit.
- [x] Upgrade world snapshots to schema v2 with bounded primitive shape, dimensions, transform, material, and explicit affordance metadata; expose these observations to Hermit's inspect capability and the Pages scene authoring UI.
- [x] Define a versioned provider-neutral physical-action proposal and environment-adapter boundary with stale-observation rejection and post-action verification ([contract](PHYSICAL_ENVIRONMENT_ADAPTER.md)); owner-domain alignment and production adapters remain open.
- [ ] Define canonical affordance and motion contracts with Gestures/Physics; the Hermit adapter is not a substitute for either owner.
- [x] Add bounded plan execution with per-action policy, post-action verification and observation reconciliation.
- [x] Define and test versioned task-checkpoint serialization and recovery classification.
- [x] Add a host-backed checkpoint repository contract with atomic compare-and-swap, monotonic revisions, guarded deletion and recovery classification tests.
- [x] Integrate optional task-loop checkpoint writes before consequential invocation, after verified actions, and on verified completion; test that an existing task checkpoint is not overwritten.
- [x] Implement safe `executeLoop` resumption from ready checkpoints, including host-mediated reconciliation for interrupted actions; test restored state, task mismatch and terminal guards.
- [ ] Supply and verify a production durable adapter per host.
- [x] Specify cross-device continuity: shared companion identity/state separated from device presence and local capability authority.
- [x] Implement a process-local two-shell reference store with shared versioned state, idempotent events and shared checkpoint adapter.
- [x] Test that phone/web and desktop/AnyApp shell fixtures share identity and task progress without sharing local capabilities; test stale-write rejection.
- [x] Demonstrate end-to-end `executeLoop` continuation from phone/web to desktop/AnyApp using one shared checkpoint authority.
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

## Capability discovery
- [x] Define and test a provider-neutral, versioned host capability catalog with shell-scoped discovery, bounded declarative input schemas, risk metadata and explicit approval metadata.
- [x] Validate untrusted capability arguments against the selected shell's declared schema and return a detached immutable snapshot before host handoff.
- [x] Add a provider-neutral host dispatcher that requires host authorization on every invocation, enforces approval if either host policy or catalog metadata requires it, and invokes only trusted host-injected handlers.
- [x] Test physical-environment adapter composition through the dispatcher, including authorization, explicit approval, post-approval policy recheck, and denial before environment execution.
- [x] Wire the browser playground's host-owned fixture catalog into voice capability discovery.
- [ ] Supply equivalent host-owned catalogs to AnyApp, server and VR shells.
- [ ] Integrate the tested dispatcher with the browser playground's real host policy and post-action verification.
- [ ] Inject host-owned capability catalogs into AnyApp, server and VR shells; keep authorization and execution in each host's policy boundary.
- [ ] Render live capability discovery through GUI and route selected capability IDs through Hermit's validated planner and execution loop.

## Voice interaction
- [x] Define host-neutral speech synthesis and streaming recognition adapter contracts with explicit cancellation and error outcomes.
- [x] Add browser speech output and optional recognition to the Pages shell, with a typed fallback.
- [x] Route a narrow fixture voice grammar through existing capabilities; keep world-changing actions behind host approval.
- [ ] Integrate a high-accuracy host-local recognizer (evaluate Whisper-class transcription) for AnyApp and other shells.
- [ ] Build a repeatable speech evaluation corpus for Workshop vocabulary, noisy environments, accents, interruptions, latency and offline behavior.
- [ ] Add natural-language "how can I?" capability discovery and GUI composition through the live Hermit planner/model boundary.

## SURPS companion and diegetic experience
- [x] Specify the Hermit × SURPS ownership boundary, companion roles, diegetic GUI direction, rig-neutral embodiment, Mini/Titan manifestations and retrieval-first Oracle strategy ([SURPS integration contract](SURPS_INTEGRATION.md)).
- [ ] Map the actual SURPS source types, versions and authoritative operations to a narrow Hermit host adapter.
- [x] Add a provider-neutral, read-only SURPS session/participant/knowledge observation contract with immutable snapshot and host-adapter tests ([contract](SURPS_OBSERVATION.md)); canonical SURPS type mapping remains open.
- [ ] Demonstrate Hermit controlling one companion action in a solo session, with SURPS adjudication and host verification.
- [ ] Add role-scoped NPC portrayal and a bounded GM facilitation loop.
- [ ] Build a living SURPS character sheet using GUI semantic state and Renderer/Visualize presentation.
- [ ] Build a rig-neutral pose-capture and Gesture timeline authoring surface.
- [ ] Demonstrate a safe, interruptible non-humanoid idle behavior after the required rig and Physics adapters exist.
- [ ] Tie Mini/Titan construction manifestations to idempotent microbundle task events and measured representation budgets.
- [ ] Evaluate an Oracle retrieval prototype against held-out Workshop API/contract questions; preserve provenance and explicit uncertainty.

## Embodiment and interaction
- [x] Add an isolated .NET consumer conformance harness for the Gestures v1 two-joint armature and NeuralNetworks stateless reach-proposal fixture ([adapter contract and limits](EMBODIED_REACH_ADAPTER.md); live Hermit shell integration is not claimed).
- [ ] Verify the pinned-source .NET harness through exact-commit CI and retain its test evidence ([Hermit #9](https://github.com/TrentBest/TheSingularityWorkshop.Hermit/issues/9)).
- [ ] Select and test the actual host/runtime handoff for Hermit's JavaScript shell; do not invent an in-process .NET reference or cross-process protocol.
- [ ] Define articulated body, joint, reach, grip, force, balance and locomotion contracts.
- [ ] Integrate the owner-supplied Physics implementation through the physical-environment adapter.
- [ ] Integrate Gestures-owned pose, posture and motion-evaluation contracts through a separate adapter.
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
- [x] Preserve FSM_Execution as durable ADP control plane.
- [ ] Align exact task/evidence/approval adapters with upstream contracts.
- [ ] Add repository tool capability contracts and adversarial tests.
- [ ] Demonstrate human-approved edit, CiAi verification and human review.

## Pages
- [x] Add a living page-level architecture map for Hermit intent, trust, environment and evidence boundaries.
- [ ] Extend the map with Mini crews, Titan portal and microbundle wrappers when their task/event contracts are implemented.
- [x] Add a deterministic Pages playground backed by Hermit's registered inspect/move capabilities, host policy, explicit approval, and post-action verification.
- [x] Allow players to add described objects to the scene and let Hermit inspect those objects through the existing read-only capability.
- [x] Let players author box, sphere, and cylinder props with bounded dimensions, XYZ transform, material, and affordance metadata; render a keyboard-selectable top-down SVG scene preview and expose structured observations to Hermit.
- [x] Add a voice interface with speech output, optional recognition, typed fallback, and approval-preserving fixture intent routing.
- [x] Add a diegetic party-awareness scene using versioned participant context, isolated knowledge, and CORE Spying evidence-state labels.
- [ ] Add volcano construction choreography timeline tied to a fixture task graph.
- [x] Keep the neural-network lesson separate; do not imply it controls Hermit's body.
- [x] Assemble Pages as a validated static artifact with documentation and deploy only from development pushes or manual runs.
- [x] Compare Hermit and GUI Pages workflow deployment mechanics and record the pre-step failure evidence.
- [ ] Identify and resolve the Hermit-specific Pages deployment job admission failure; verify a completed deployment.

## Definition of done for an embodied vertical slice

A user places a glass container on a counter. Hermit notices it, approaches within safe range, inspects it, proposes a harmless interaction, receives host policy approval where required, performs it through physics-aware adapters, verifies the actual result, and yields immediately when interrupted. Tests cover success, denial, unreachable object, physics rejection, interruption and recovery.


## Hermit cross-repository coordination register

- [x] Open owner-repository contract questions and track responses in [Hermit issue #7](https://github.com/TrentBest/TheSingularityWorkshop.Hermit/issues/7).
- [ ] Replace provisional host projections with canonical owner-domain contracts as those repositories answer.
- [ ] Prove one end-to-end, host-authorized action and verify its authoritative result.

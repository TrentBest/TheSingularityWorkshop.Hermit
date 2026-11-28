# Hermit–Gestures–NeuralNetworks: deterministic reach adapter

**Status: isolated .NET consumer conformance harness; not a live Hermit runtime integration.**

This proof closes one narrow seam without pretending that Hermit's current JavaScript runtime can directly load .NET assemblies or that a cross-process bridge exists.

## Ownership

- **Hermit/host:** task intent, target selection, capability policy, approval, orchestration, and evidence presentation.
- **Gestures:** authoritative kinematic armature definition, episode state, action envelope, legal joint ranges, speed limits, and achieved kinematic observation.
- **NeuralNetworks:** bounded, stateless CPU inference and optional evaluator trace.
- **Physics:** physical forces, contact, collision, load, and authoritative physical outcomes. This fixture does not invoke Physics and makes no physical-success claim.

The adapter is deliberately consumer-owned. Neither Gestures nor NeuralNetworks references Hermit, and no new package dependency is introduced between the domain libraries.

## Exact control mapping

The harness consumes the real PlanarArmatureObservation v1 and PlanarArmatureAction v1 contracts from Gestures. It validates the active episode, step index, observation version, finite values, and caller-supplied target and proposal bound before inference.

1. Read achieved shoulder and elbow angles in **radians**.
2. Derive two consumer inputs: target angle minus observed angle.
3. Evaluate the existing planar-reach-proposal-v1 graph: a 2×2 diagonal Dense layer with weights [0.5, 0, 0, 0.5] and zero bias.
4. Interpret each output as a **half-sized error correction**, not an absolute angle, torque, force, muscle activation, or completed action.
5. Clamp each correction to the explicit consumer-side per-step proposal bound.
6. Compose the bounded correction with the corresponding observed angle to create absolute JointAngleTargets.
7. Submit an action bound to the observed episode ID and expected step index.
8. Let Gestures independently clamp to legal joint ranges and enforce its configured angular-speed limits.
9. Record scenario and episode identity, seed, input/output step, target angles, measured errors, raw and bounded corrections, proposal bound, requested absolute targets, Gestures-accepted targets, achieved angles, end-effector coordinates, timestep, full bounded evaluator trace, and per-stage diagnostic timings.

The first fixture is joint-angle target conformance. It does not solve a world-space end-effector target or prove a physical reach/contact outcome. A later end-effector task must explicitly add and test a consumer-side IK target-to-joint mapping or consume a Gestures-owned target controller; it must not silently reinterpret the current two-angle contract.

## Reproducible source inputs

The CI harness checks out exact development snapshots:

- Gestures: 8ee61dc6bf07cc5dca072d6e7b91601ae9e807e8
- NeuralNetworks: 5b8c9163c8f33e3d5c26940942d96cb9316b9e2c

The pins make the consumer contract reproducible. Update them deliberately when either upstream contract changes, after auditing the source and rerunning the conformance tests.

## Run

The GitHub Actions workflow checks out those two source snapshots into integration/dependencies/, restores the .NET 10 test harness, and runs:

    dotnet test integration/embodied-reach/Hermit.EmbodiedReach.Tests.csproj --configuration Release

The test suite covers correction-versus-absolute-target semantics, consumer proposal bounds, Gestures range/speed enforcement, stale and wrong-version observations, non-finite inputs, trace-on/off numerical parity, provenance capture, and deterministic reset/replay.

Stage timings in ReachStepEvidence are diagnostic per-run measurements only. They are not benchmark results. A separate benchmark must compare trace-on and trace-off runs and report validation, inference, command mapping, and armature stepping independently before making performance claims.

## CI evidence

The pinned-source conformance workflow passed on Hermit commit `b6eece2d9c802cb9eb78ba83e6a43f3fa372780d`: all 6 tests passed, with 0 failures and 0 skips. The run compiled the adapter against both checked-out source projects using .NET SDK 10.0.404 and completed the test assembly in 51 ms. See [GitHub Actions run 46090780281](https://github.com/TrentBest/TheSingularityWorkshop.Hermit/actions/runs/46090780281). This is evidence for the isolated consumer harness only; it does not change the runtime-boundary limitations below.

## Runtime boundary

Hermit's Pages/runtime code remains JavaScript. This harness is an isolated .NET consumer test and evidence generator, not an in-process connection to the Pages runtime, AnyApp, a live simulation host, or a production Hermit shell. No transport protocol is invented here. A real shell integration must be selected and tested as a separate host decision.

## Explicit non-goals

- No trained policy, training loop, recurrence, or hidden neural state.
- No GPU backend or acceleration claim.
- No Physics simulation, torque/force control, contact, collision, or physical-success claim.
- No full Unity humanoid/finger rig.
- No package publication, release, Pages deployment, master update, or branch deletion.

# The Physical Environment: an ant farm for Hermit

**Status: design direction, 2026-11-05.** This document specifies a proposed interactive simulation experience. It is not a claim that a physics-backed Hermit environment has been implemented.

## The central idea

Give Hermit a small world to inhabit: objects it can see, touch, move, use, and learn about. The user builds that world from a palette of physical objects and mechanisms. Hermit exists inside the same world and must work within its physical laws.

The ant-farm analogy is intentional. We should be able to watch Hermit explore, attempt tasks, discover affordances, use tools, encounter limitations, and adapt. A cube is not just an icon or a button. It is an object with mass, shape, position, collision geometry, and physical behavior.

**Hermit has intentions; the simulated world determines what is physically possible.**

This combines a declarative scene builder, physics simulation, bounded embodied agent, tools and mechanisms, assistant reasoning, visible evidence of attempts and outcomes, and an educational experience in which users can observe how strategies emerge.

## 1. Build the world from objects

The initial palette can be deliberately familiar:

| Palette item | Physical / semantic role | What Hermit can learn or inspect |
|---|---|---|
| Cube | Rigid body with configurable dimensions and mass | Weight, size, pose, material, whether it can be lifted or pushed |
| Ball | Rigid body with radius, mass, rolling behavior and inertia | Whether it rolls, where it may travel, how to redirect it |
| Dolly | Wheeled load-support tool | Load rating, deck size, wheel behavior, handle/attachment affordance |
| Hamster wheel | Interactive mechanism with rotational state and resistance | Whether it can enter, push, run in, or otherwise actuate it; resulting motion/energy |
| Basketball hoop | Target with a defined opening, height and scoring/containment rules | Whether a ball or other object can be launched, rolled, bounced or placed through it |
| Ramp / platform | Static or movable geometry | Slope, height, support, route and stability |
| Barrier / wall | Collision and access constraint | Blocked paths, reachable regions, alternative routes |
| Gantry crane | User-operated delivery mechanism with a bounded placement region | How to work with an imperfectly positioned object and adapt to its actual pose |

Every object should have a stable identity, transform, physical definition, material/interaction properties, and optional registered behaviors. Visual appearance and physical behavior are separate concerns: a decorative object need not be physically active, and a physical body need not expose an action capability to Hermit.

The user should be able to place, move, configure, connect, duplicate, and remove objects in Build mode, then enter the environment and observe the simulation.

## 2. The gantry crane: user intent, Hermit's agency

The gantry crane introduces an important division of responsibility. The user controls the crane and chooses a **delivery region**, not an exact final pose. The crane's trolley, hoist, sway, release timing, collision clearance and placement tolerances make precision intentionally difficult. The resulting object pose is determined by the crane mechanics and simulation.

The user is therefore shaping Hermit's opportunity space. They might deliver a ball near a basketball hoop, a cube near a ramp, or a tool somewhere in the environment. They do not dictate what Hermit must do next.

Hermit receives the actual delivered object and its observed state. It may pursue the apparent intended task, but it may also choose a different strategy: use the ball as a counterweight, roll it somewhere else, stack the cube, investigate the crane, combine objects, or ignore the apparent goal while exploring another affordance. That divergence is a feature of the experiment, not a failure to follow instructions.

The interaction contract should make this distinction explicit:

- The user chooses a delivery target region and operates the crane.
- The crane controller exposes only the permitted controls and bounded operating envelope.
- The physics simulation determines the release trajectory, contacts and final object pose.
- Hermit observes the resulting world state; it is not told that the object landed at the intended location.
- Hermit chooses its own next action from its goals, observations, learned behavior and available capabilities.
- The user can inspect why the crane placed the object where it did and what Hermit subsequently tried.

The crane should be challenging but learnable. Show the region requested, the actual landing pose, and the difference between them. Allow reset/replay for experiments. Avoid hidden correction or snapping that makes a difficult placement look precise.

This gives the user meaningful influence without turning Hermit into a remote-controlled puppet. It also creates a teaching opportunity around momentum, pendulum motion, force, timing, collision, uncertainty and planning under imperfect conditions.

## 3. Hermit is embodied, but deliberately limited

Hermit's body is an explicit simulated mechanism, not an omnipotent cursor. Give it a parameterized armature and locomotion model.

Candidate body properties include body mass and dimensions; reach and joint range; grip type and grip force; maximum safe lift load; maximum push and pull force; traction and stability; movement speed and turning limits; energy/stamina or actuator budget; sensor range and field of view.

The distinction between lifting and pushing matters. A load that is too heavy to lift may still be movable by pushing if the required force is within Hermit's limits and the object can slide or roll. A tall or unstable object may be unsafe to push even when its mass alone looks manageable.

Do not reduce every action to a single mass threshold. Mass contributes to weight and inertia, but feasibility also depends on geometry, friction, slope, support, contact point, grip, leverage, and stability.

## 4. Tools change the mechanics, not the laws

The dolly is the key example.

Without a dolly, Hermit may be unable to lift a heavy cube and may be unable to push it safely or efficiently. With a suitable dolly, Hermit can load or otherwise secure the object within its lifting/gripping limits, then move the combined system using wheels. The dolly does not erase the cube's mass. It changes the force and energy required to transport it by replacing much of the sliding friction with rolling resistance and by changing the load support.

This creates meaningful tool use:

1. Hermit inspects the object and discovers its mass and dimensions.
2. Hermit recognizes that direct lifting exceeds its safe lift limit.
3. Hermit searches the environment for an appropriate tool.
4. Hermit inspects the dolly's load rating and dimensions.
5. Hermit determines whether it can safely position/load the object.
6. Hermit moves the supported load, subject to traction, slope, wheel resistance, stability and steering constraints.
7. The environment reports the actual outcome.

The same pattern generalizes to ramps, levers, pulleys, clamps, carts, bridges, switches and other mechanisms. Tools should create new affordances that Hermit can discover and reason about.

## 5. The hamster wheel and basketball hoop: open-ended affordances

The hamster wheel demonstrates that the environment can contain mechanisms with state and feedback. It can expose radius, inertia, bearing resistance, angular velocity, braking, and whether it is free-running or coupled to another mechanism. Hermit may enter or contact it and attempt to turn it. The simulation determines whether it moves, how fast, and what forces are exchanged.

A wheel could later power a generator, open a gate, move a platform, or operate a machine. That makes it a reusable mechanism with a typed input/output contract—not a one-off animation.

The basketball hoop demonstrates goal-directed play. When a ball and hoop are present, Hermit may discover the relationship and try to get the ball through the opening. It might learn to grasp and throw, push or roll the ball, use a ramp, or experiment with a smaller cube. We should not hard-code a basketball behavior as the only valid interpretation. The hoop is an affordance and an opportunity, not a mandatory script.

The first proof can be modest: a visible hoop, a ball, a physically meaningful opening and collision response, and an observable success condition. Later, vary ball mass/size, hoop height, distance, obstacles and available tools to explore how behavior changes.

## 6. Two learning tracks, one environment foundation

Hermit has two complementary product purposes. They should be treated as explicit tracks sharing the same core, not as unrelated products.

### Track A — teach through embodied learning

The user builds a world and observes Hermit learning to act within it. The system should make perception, experiments, action selection, motor control, failures, adaptation and physical outcomes inspectable. A user can change one condition—mass, friction, crane placement, reach, hoop height—and observe what changes.

This is not merely a game with scripted success. We want to explore how a relatively simple agent can develop useful behavior from observations, feedback, and repeated interaction. Early versions should make the learning mechanism and its limitations visible.

### Track B — assist in creating Workshop Experiences

The same Hermit core should eventually help develop Experiences across the Workshop ecosystem. In that environment, registered capabilities may expose project structure, domain catalogs, build/test results, rendering previews, or safe editing operations. Hermit can propose and perform authorized changes through host-controlled capabilities, then inspect the results.

The two tracks should share:
- the agent and learning interfaces;
- perception/observation contracts;
- goal and action representations;
- bounded planning and execution;
- capability discovery and host authorization;
- memory/provenance boundaries;
- inspectable traces and evaluation.

They should not share assumptions that do not belong together. A simulated grasp is not a repository write. Physical-world actions are resolved by Physics; ecosystem actions are resolved by their respective host capabilities and policies. Each environment supplies its own action space, risk model, permissions, and evidence.

The embodied world is the first teaching laboratory. The Workshop development environment is a later application of the same disciplined agent architecture.

## 7. Neural-network foundation before HeadlessAi

The proposed neural-network work should be isolated in a **private Workshop repository** before integrating model-provider orchestration through HeadlessAi. Its purpose is not to replace HeadlessAi or become another language-model endpoint. It is to provide a fast, testable neural-network foundation that we control and can use for Hermit's perception, policy experiments, and motor learning.

The repository should be GPU-first in architecture while retaining a deterministic CPU reference path for correctness tests and machines without a supported accelerator. "GPU-based" must be demonstrated by actual device execution and benchmark evidence, not inferred from a GPU-shaped API or a successful build.

The first scope should be deliberately bounded:
- tensor and memory abstractions with explicit shape, dtype, device and ownership;
- a small set of foundational operations and activation/loss functions;
- forward and backward passes for a compact feed-forward network;
- optimizer support for a small initial set of algorithms;
- deterministic seeded initialization and reproducible training/evaluation runs;
- CPU reference kernels and GPU kernels with numerical parity tolerances;
- batching, memory reuse and profiling so throughput claims are measurable;
- benchmarks that separate transfer, kernel, training-step and end-to-end costs;
- clear hardware/runtime capability detection and explicit unsupported-device behavior.

Do not begin by attempting to implement every modern architecture. First prove one small network can train, evaluate, save/load its parameters, and run on a supported GPU with reproducible evidence. Then expand based on Hermit's actual needs. The chosen GPU API, target hardware and language/runtime should be established by a source and environment audit before implementation.

Hermit's initial embodied controller should be a small neural network, not a giant language model. Keep the control loop distinct from high-level deliberation: sensors/observations become bounded inputs; the network proposes motor or action preferences; the host validates actions; the physics simulation computes outcomes; feedback is recorded for learning. Initially, the neural network can control a deliberately simple behavior such as reaching, grasping, balancing, or locomotion. It must not bypass physical limits or host policy.

A neural controller is not automatically intelligent or safe. We need explicit training objectives, evaluation scenarios, held-out variations, failure metrics, and comparisons against deterministic baselines. Keep learned weights, training data, evaluation records and model versions attributable and inspectable. Do not claim learning or generalization beyond what experiments demonstrate.

HeadlessAi remains a separate later integration for language-model inference and high-level reasoning. The neural-network foundation should be useful independently and should not be blocked on HeadlessAi.

## 8. Separate the world, the body, the planner, and the host

These responsibilities must not collapse into one AI prompt.

| Responsibility | Owner |
|---|---|
| Scene composition and visual editing | Environment builder |
| Object identity, physical properties and world state | Environment model / simulation host |
| Collision, contact, forces, constraints and integration | Physics engine |
| Body geometry, joints, actuators and sensor model | Hermit embodiment model |
| Learned motor policy / neural inference | Neural-network runtime |
| Goal decomposition and choice of next action | Hermit planner |
| Feasibility, collisions, force limits and actual outcomes | Deterministic simulation |
| Capability registration, permissions, lifecycle and approvals | Environment host |
| Rendering and interaction presentation | Shell / renderer |

Hermit may propose a physical action such as grasp, lift, push, pull, walk-to, load-onto, throw, or actuate. The host validates the action against registered capabilities and current state. The physics engine—not the language model or neural network—determines the result.

The model must never be allowed to declare that an object moved, a collision did not occur, or a load was successfully lifted. Those are simulation outcomes.

## 9. Reuse the Workshop Physics foundation deliberately

The Physics development branch already provides a useful but bounded foundation. Its articulated-mechanics integration contract records the current boundary: finite spatial vectors, normalized quaternion orientation, metre-based poses, timestamped rigid-body snapshots, a bounded 3D translational distance-link experiment, per-step contact observations, sphere-sphere narrowphase detection, a limited frictionless normal-impulse response for one contact at a time, and bounded single-contact positional correction.

That is not yet a general rigid-body engine. The documented omissions include angular inertia, friction, simultaneous contacts, broadphase, persistent contact manifolds, rigid joints, a rigid-body time integrator, and articulated constraint-reaction-load modeling. We must not present those as available simply because the concepts appear in a design contract.

Hermit's physical-world implementation should therefore proceed in two tracks:

1. **Use existing Physics capabilities where their tested contracts fit.** Preserve the Physics package's units, coordinate conventions, deterministic inputs, run records, and evidence discipline.
2. **Raise explicit Physics work for missing mechanics.** The ant-farm needs a coherent bounded body/rigid-body stepping path, contact and friction behavior, tool/load constraints, crane cable/hoist/trolley dynamics, and eventually articulated actuation. Each capability needs source, focused tests, declared assumptions, and a reproducible demonstration before Hermit depends on it.

Do not add a second physics authority inside Hermit. Hermit owns goals, planning and action proposals; Physics owns modeled physical outcomes. If a temporary fake adapter is used for the first assistant slice, label it as a deterministic test double and keep it separate from a real physical simulation.

Reference: [Physics articulated mechanics integration contract](https://github.com/TrentBest/TheSingularityWorkshop.Physics/blob/development/docs/ARTICULATED_MECHANICS_CONTRACT.md), [contact impulse experiment](https://github.com/TrentBest/TheSingularityWorkshop.Physics/blob/development/docs/experiments/contact-impulse.md), and [Physics capability catalog](https://github.com/TrentBest/TheSingularityWorkshop.Physics/blob/development/docs/PHYSICS_CAPABILITY_CATALOG.md).

## 10. Typed physical actions and affordances

A future action contract should identify actor/body identity; target object or mechanism identity; action kind; target pose, direction, or contact point where applicable; force/effort or duration bounds; preconditions and required affordances; expected outcome type (not a promised outcome); cancellation and timeout behavior.

The host resolves the action to a registered operation, validates the arguments and preconditions, and submits it to the simulation. The result should include observed state changes and a reason when the action fails or is blocked.

Examples of useful failure reasons:
- target is outside reach;
- grip cannot be established;
- requested lift exceeds safe actuator capacity;
- push force is insufficient;
- object is blocked or constrained;
- available traction is insufficient;
- load is incompatible with the dolly;
- attempted motion would violate a stability/safety constraint;
- crane delivery region is outside the permitted workspace;
- crane load, cable, trolley or clearance limits prevent the requested operation.

A failed attempt is useful information. Hermit should be able to inspect the reason, revise its plan, and try a different approach within bounded planning and execution limits.

## 11. A first vertical slice

Do not begin with a full sandbox, realistic robotics, or a complex physics package integration. Prove the concept with a tiny deterministic environment.

### Scene
- One Hermit body with a simple visible armature.
- One light cube that is liftable.
- One heavier cube that cannot be lifted by Hermit.
- One ball that can roll.
- One dolly with a declared load rating.
- One hamster wheel with a visible rotational state.
- One basketball hoop with a measurable opening and collision geometry.
- One gantry crane with bounded trolley travel, hoist length, load capacity and imperfect placement.
- A floor and one simple obstacle.

### Behaviors
1. The user operates the crane to deliver an object into a selected region; the simulation determines the actual landing pose.
2. Hermit inspects the delivered object and chooses what to do next without a forced script.
3. Hermit inspects the light cube and lifts it.
4. Hermit attempts to lift the heavy cube; the simulation rejects it with a clear force/capacity reason.
5. Hermit attempts to push the heavy cube; outcome depends on configured push force and surface friction.
6. Hermit discovers the dolly, checks compatibility, loads the cube if feasible, and moves it.
7. Hermit interacts with the wheel and the user can observe its state change.
8. Given a ball and hoop, Hermit may discover and attempt a shot; evaluation records whether the ball passes through, while allowing other valid strategies.

### Evidence and tests
- Deterministic initial scene and reproducible simulation step configuration.
- Unit tests for mass, force, friction/rolling resistance, collision and load constraints.
- Tests that distinguish lift capacity from push capacity.
- Tests that verify a dolly changes transport feasibility without changing object mass.
- Tests for incompatible/overloaded dolly use.
- Tests for wheel actuation and state transitions.
- Tests for crane workspace, load capacity, cable/trolley constraints, release dynamics and actual-vs-requested placement.
- Tests for hoop collision/opening and success detection.
- Action traces containing requested action, validated preconditions, simulation result, and resulting state.
- Explicit numerical assumptions and known limitations; do not imply engineering-grade physical accuracy.
- Evaluation scenarios that vary object properties and delivery placement so the controller cannot succeed only by memorizing one scene.

The first implementation can use simplified, deterministic physics if the limitations are visible and the action outcomes are internally consistent. Select or integrate a physics engine only after comparing its license, runtime targets, determinism, 2D/3D needs, collision support, and adapter surface.

## 12. The learning loop

The user should be able to watch the following cycle:

1. **Perceive:** Hermit receives a bounded view of objects and their inspectable properties.
2. **Understand:** Hermit identifies relevant affordances and constraints.
3. **Plan:** Hermit chooses an action or tool sequence.
4. **Attempt:** The host validates and submits the action.
5. **Experience:** The simulation advances and computes the physical result.
6. **Inspect:** Hermit receives the result and relevant state changes.
7. **Adapt:** Hermit updates its plan or learned policy based on evidence.

This can teach more than movement. It gives users a visible way to experiment with mechanics, forces, leverage, friction, stability, energy, uncertainty, control and learning. The environment becomes both a playground and an educational laboratory.

## 13. Safety and trust boundaries

- The simulation is authoritative for physical outcomes.
- Hermit cannot bypass body limits by describing an impossible result.
- User-defined object properties and tool ratings are validated and bounded.
- Simulation time, action duration, force, velocity, object count and planning rounds are bounded.
- External effects are not implied by simulated effects. A virtual wheel powering a virtual generator does not authorize real-world device control.
- Every action is attributable and inspectable; failed actions are recorded as outcomes, not hidden.
- Physical properties are data, not instructions. Object descriptions and labels cannot override host policy.
- Neural-network outputs are proposals, never authority; they are bounded and validated by the host before actuation.

## 14. Product direction

The experience should feel like a living ant farm: the user builds and modifies the world; Hermit explores and acts within it; physical rules make outcomes understandable; tools and mechanisms expand what is possible; users can pause, inspect, replay, and experiment; and the same underlying environment model can eventually be presented in a browser, desktop app, or spatial/VR shell.

Start with a 2D builder and live simulation preview. Keep the environment model and physics contracts independent of the renderer so a richer 3D or VR manifestation can be added without rewriting Hermit's reasoning and authority boundaries.

The goal is not to fake intelligence with scripted animations. The goal is to give Hermit a small, coherent world in which its decisions have observable consequences.

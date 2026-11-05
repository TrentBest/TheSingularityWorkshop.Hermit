# The Physical Environment: an ant farm for Hermit

**Status: design direction, 2026-11-05.** This document specifies a proposed interactive simulation experience. It is not a claim that a physics-backed Hermit environment has been implemented.

## The central idea

Give Hermit a small world to inhabit: objects it can see, touch, move, use, and learn about. The user builds that world from a palette of physical objects and mechanisms. Hermit exists inside the same world and must work within its physical laws.

The ant-farm analogy is intentional. We should be able to watch Hermit explore, attempt tasks, discover affordances, use tools, encounter limitations, and adapt. A cube is not just an icon or a button. It is an object with mass, shape, position, collision geometry, and physical behavior.

**Hermit has intentions; the simulated world determines what is physically possible.**

This combines a declarative scene builder, physics simulation, bounded embodied agent, tools and mechanisms, assistant reasoning, and visible evidence of attempts and outcomes.

## 1. Build the world from objects

The initial palette can be deliberately familiar:

| Palette item | Physical / semantic role | What Hermit can learn or inspect |
|---|---|---|
| Cube | Rigid body with configurable dimensions and mass | Weight, size, pose, material, whether it can be lifted or pushed |
| Ball | Rigid body with radius, mass, rolling behavior and inertia | Whether it rolls, where it may travel, how to redirect it |
| Dolly | Wheeled load-support tool | Load rating, deck size, wheel behavior, handle/attachment affordance |
| Hamster wheel | Interactive mechanism with rotational state and resistance | Whether it can enter, push, run in, or otherwise actuate it; resulting motion/energy |
| Ramp / platform | Static or movable geometry | Slope, height, support, route and stability |
| Barrier / wall | Collision and access constraint | Blocked paths, reachable regions, alternative routes |

Every object should have a stable identity, transform, physical definition, material/interaction properties, and optional registered behaviors. Visual appearance and physical behavior are separate concerns: a decorative object need not be physically active, and a physical body need not expose an action capability to Hermit.

The user should be able to place, move, configure, connect, duplicate, and remove objects in Build mode, then enter the environment and observe the simulation.

## 2. Hermit is embodied, but deliberately limited

Hermit's body is an explicit simulated mechanism, not an omnipotent cursor. Give it a parameterized armature and locomotion model.

Candidate body properties include body mass and dimensions; reach and joint range; grip type and grip force; maximum safe lift load; maximum push and pull force; traction and stability; movement speed and turning limits; energy/stamina or actuator budget; sensor range and field of view.

The distinction between lifting and pushing matters. A load that is too heavy to lift may still be movable by pushing if the required force is within Hermit's limits and the object can slide or roll. A tall or unstable object may be unsafe to push even when its mass alone looks manageable.

Do not reduce every action to a single mass threshold. Mass contributes to weight and inertia, but feasibility also depends on geometry, friction, slope, support, contact point, grip, leverage, and stability.

## 3. Tools change the mechanics, not the laws

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

## 4. The hamster wheel is an environment object, not a scripted gag

A hamster wheel demonstrates that the environment can contain mechanisms with state and feedback.

The wheel can expose physical properties such as radius, inertia, bearing resistance, angular velocity, braking, and whether it is free-running or coupled to another mechanism. Hermit may enter or contact it and attempt to turn it. The simulation determines whether it moves, how fast, and what forces are exchanged.

A wheel could later power a generator, open a gate, move a platform, or operate a machine. That makes it a reusable mechanism with a typed input/output contract—not a one-off animation. The first prototype need only demonstrate a visible, physically coherent interaction and an inspectable state change.

## 5. Separate the world, the body, the planner, and the host

These responsibilities must not collapse into one AI prompt.

| Responsibility | Owner |
|---|---|
| Scene composition and visual editing | Environment builder |
| Object identity, physical properties and world state | Environment model / simulation host |
| Collision, contact, forces, constraints and integration | Physics engine |
| Body geometry, joints, actuators and sensor model | Hermit embodiment model |
| Goal decomposition and choice of next action | Hermit planner |
| Feasibility, collisions, force limits and actual outcomes | Deterministic simulation |
| Capability registration, permissions, lifecycle and approvals | Environment host |
| Rendering and interaction presentation | Shell / renderer |

Hermit may propose a physical action such as grasp, lift, push, pull, walk-to, load-onto, or actuate. The host validates the action against registered capabilities and current state. The physics engine—not the language model—determines the result.

The model must never be allowed to declare that an object moved, a collision did not occur, or a load was successfully lifted. Those are simulation outcomes.

## 6. Typed physical actions and affordances

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
- attempted motion would violate a stability/safety constraint.

A failed attempt is useful information. Hermit should be able to inspect the reason, revise its plan, and try a different approach within bounded planning and execution limits.

## 7. A first vertical slice

Do not begin with a full sandbox, realistic robotics, or a complex physics package integration. Prove the concept with a tiny deterministic environment.

### Scene

- One Hermit body with a simple visible armature.
- One light cube that is liftable.
- One heavier cube that cannot be lifted by Hermit.
- One ball that can roll.
- One dolly with a declared load rating.
- One hamster wheel with a visible rotational state.
- A floor and one simple obstacle.

### Behaviors

1. Hermit inspects the light cube and lifts it.
2. Hermit attempts to lift the heavy cube; the simulation rejects it with a clear force/capacity reason.
3. Hermit attempts to push the heavy cube; outcome depends on configured push force and surface friction.
4. Hermit discovers the dolly, checks compatibility, loads the cube if feasible, and moves it.
5. Hermit interacts with the wheel and the user can observe its state change.

### Evidence and tests

- Deterministic initial scene and reproducible simulation step configuration.
- Unit tests for mass, force, friction/rolling resistance, collision and load constraints.
- Tests that distinguish lift capacity from push capacity.
- Tests that verify a dolly changes transport feasibility without changing object mass.
- Tests for incompatible/overloaded dolly use.
- Tests for wheel actuation and state transitions.
- Action traces containing requested action, validated preconditions, simulation result, and resulting state.
- Explicit numerical assumptions and known limitations; do not imply engineering-grade physical accuracy.

The first implementation can use simplified, deterministic physics if the limitations are visible and the action outcomes are internally consistent. Select or integrate a physics engine only after comparing its license, runtime targets, determinism, 2D/3D needs, collision support, and adapter surface.

## 8. The learning loop

The user should be able to watch the following cycle:

1. **Perceive:** Hermit receives a bounded view of objects and their inspectable properties.
2. **Understand:** Hermit identifies relevant affordances and constraints.
3. **Plan:** Hermit chooses an action or tool sequence.
4. **Attempt:** The host validates and submits the action.
5. **Experience:** The simulation advances and computes the physical result.
6. **Inspect:** Hermit receives the result and relevant state changes.
7. **Adapt:** Hermit updates its plan.

This can teach more than movement. It gives users a visible way to experiment with mechanics, forces, leverage, friction, stability, energy, and tool design. The environment becomes both a playground and an educational laboratory.

## 9. Safety and trust boundaries

- The simulation is authoritative for physical outcomes.
- Hermit cannot bypass body limits by describing an impossible result.
- User-defined object properties and tool ratings are validated and bounded.
- Simulation time, action duration, force, velocity, object count and planning rounds are bounded.
- External effects are not implied by simulated effects. A virtual wheel powering a virtual generator does not authorize real-world device control.
- Every action is attributable and inspectable; failed actions are recorded as outcomes, not hidden.
- Physical properties are data, not instructions. Object descriptions and labels cannot override host policy.

## 10. Product direction

The experience should feel like a living ant farm: the user builds and modifies the world; Hermit explores and acts within it; physical rules make outcomes understandable; tools and mechanisms expand what is possible; users can pause, inspect, replay, and experiment; and the same underlying environment model can eventually be presented in a browser, desktop app, or spatial/VR shell.

Start with a 2D builder and live simulation preview. Keep the environment model and physics contracts independent of the renderer so a richer 3D or VR manifestation can be added without rewriting Hermit's reasoning and authority boundaries.

The goal is not to fake intelligence with scripted animations. The goal is to give Hermit a small, coherent world in which its decisions have observable consequences.

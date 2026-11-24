# GOAP, persistence and idle life

## Why GOAP is the default

Hermit should not need an LLM call to decide whether to approach a visible object, inspect it, pick it up, or put it down. Those choices are local planning problems over known world facts and available actions.

Goal-Oriented Action Planning (GOAP) is the default local decision mechanism. The environment supplies a bounded world-state snapshot; perception exposes facts and affordances; actions declare preconditions, effects, costs, duration/resource estimates and risk metadata; a goal describes a desired world state; and a planner finds a bounded sequence. The executor rechecks preconditions and policy before every consequential step. The environment reports actual effects, and Hermit updates its belief state from observations rather than assuming success.

The current JavaScript planGoap module is a small deterministic least-cost planner over scalar facts. It is a planning primitive, not a full embodied agent or production physics integration. It does not execute actions or make permission decisions. The runtime's `executeLoop` provides the separate orchestration layer: observe, request one proposal, execute through the registered capability and host policy gate, verify the actual result, then replan. It stops at a bounded action count or total time budget and fails closed if verification is absent or negative. This is adapter-driven; the environment still owns observation truth and verification semantics.

## Local loop

1. Observe nearby objects, collaborators, scene state, current task and policy-limited capabilities.
2. Reconcile observations with the world model and mark stale facts.
3. Select a goal: continue approved work, satisfy a small maintenance need, pursue harmless curiosity, or rest.
4. Plan with GOAP against current facts and bounded affordances.
5. Gate each action through host policy, risk and resource budgets.
6. Execute one bounded action at a time.
7. Verify the environment's actual result.
8. Replan after changed conditions, failure, interruption or new observations.

Never execute a long open-loop sequence based only on the initial plan.

## Idle behavior

Idle is a first-class mode with a strict budget. It is not permission to edit the user's project. Safe examples include returning to a resting spot, looking around, inspecting a harmless object, playing with an approved sandbox prop, watching a machine, exploring a small allowed region, or practicing gestures in a safe area.

Idle has configurable limits for distance, duration, energy, action count, memory writes and concurrent activities. It yields immediately when the user speaks, edits, enters a critical interaction, pauses Hermit or revokes a capability.

Idle actions must be reversible or non-mutating, local, non-destructive, low-resource and non-disruptive. Project edits, file writes, bundle installation/removal, publication, deployment, external messages, purchases and other consequential operations are never idle curiosities.

## When to ask an LLM

An LLM is an occasional high-level interpreter, not the per-frame motor cortex. Use one when interpreting natural-language intent, resolving ambiguous goals, reasoning about unfamiliar objects without adequate affordance descriptions, coordinating multiple domains, inventing creative alternatives or narrating a plan.

Do not use a model for routine locomotion, balance, known action selection, deterministic state transitions, physics, collision, grasp constraints, safety checks or permission decisions.

A model may suggest a goal or candidate plan. It cannot register a capability, alter world state, waive policy, approve itself or bypass action validation.

## Neural computation boundary

Hermit does not implement neural-network mathematics, tensor storage, model graphs, training algorithms, or GPU execution. Those belong to [FSM_NeuralNetworks](https://github.com/TrentBest/TheSingularityWorkshop.FSM_NeuralNetworks).

The intended relationship is consumer/provider, not shared ownership:

- Hermit decides whether a neural computation is useful for a goal and submits a bounded, validated request through a registered capability.
- NeuralNetworks owns model semantics, tensor and operation contracts, model validation, immutable parameter versions, inference, future training, backend selection/conformance and optional traces from the actual computation.
- Foundry is the intended execution-lifecycle and scheduling owner for composed work; FSM_COS composes MicroBundles and returns a RuntimeAssembly. Neither is replaced by a Hermit scheduler.
- The host supplies resources, permissions, request budgets and cancellation policy. Neural output is data/proposal only; it cannot grant permission or directly command the environment.
- Gestures and Physics remain the owners of movement/embodiment interfaces and physical feasibility. A future neural motion model may propose poses or control parameters, but the host validates them through those domains before actuation.

The neural model graph remains internal to NeuralNetworks and should be evaluated as one bounded capability. Hermit must not turn each graph node into a GOAP action, FSM state or Foundry workflow step. GOAP selects what outcome to pursue; NeuralNetworks computes the requested model output. These are different abstractions.

**Current integration status:** Hermit's deterministic runtime currently supports an injected planner and registered capabilities, and its tests use fake inference/environment behavior. It does not yet contain a NeuralNetworks adapter. NeuralNetworks' development documentation describes a proposed MVP; its first CPU evaluator has not started, and the owner-acceptance gate remains open. Therefore this integration is intentionally deferred until the neural contract is accepted and the evaluator exists. Do not add a duplicate evaluator or claim GPU/body control integration in Hermit.

## Fully articulated body and neural movement

The intended Hermit is fully articulated. GOAP chooses a goal and action such as approach, inspect, reach, grasp, carry, place, gesture or rest. A motion/gesture planner selects a movement strategy. A GPU neural network may generate or refine coordinated pose proposals. Physics, joint limits, collision, contact and balance determine feasibility. The host accepts only bounded, validated motion commands.

The neural network is a motor proposal system, not an authority system. Deterministic fallback motion is required for reproducibility, accessibility, unsupported GPUs and failure recovery.

## Persistence and memory

Separate identity and appearance; current task and resumable checkpoints; learned object affordances and environment maps; user-approved preferences; interaction history and audit evidence; and transient perception or idle interests. Each category needs scope, provenance, retention, access control and deletion behavior. A model-generated guess is not a durable fact. The host owns persistence and identity; Hermit consumes a narrow adapter. NeuralNetworks explicitly uses DataWarehouse as its intended storage foundation rather than creating a competing general-purpose memory manager; Hermit should likewise use a host/storage adapter for assistant memory, not duplicate neural tensor storage.

## Failure and interruption

Re-check preconditions immediately before each action. Stop and replan when the world changes. Do not repeat failed actions indefinitely. Respect interruption and collaborator boundaries. Persist safe checkpoints, not partially applied assumptions. If the planner exceeds its budget, return to rest or ask the human rather than expanding without bound.

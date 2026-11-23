# Hermit in the Workshop

## Domain definition

Hermit is the persistent, embodied creative companion assigned to a developer while that developer creates an experience in The Singularity Workshop.

Hermit is not a chat panel with a character skin. It is a participant in the environment: it observes, explores, manipulates permitted objects, notices changes, learns the affordances exposed by loaded microbundles, and helps turn creative intent into a living experience. It is present during deliberate work and remains present during the quiet spaces between instructions.

The Workshop is a place of creation. Hermit makes the invisible work of creation visible, legible, and delightful without pretending that spectacle is the underlying computation.

## One full-size Hermit per developer

Each developer has their own persistent Hermit. While co-building an experience, a developer's avatar and their Hermit can be seen together.

- A developer's Hermit is the one humanoid-scale companion associated with that developer in the shared Workshop session.
- Do not populate the Workshop with crowds of interchangeable full-size Hermits.
- Other developers bring their own companions; their identity and ownership remain distinct.
- Hermit's physical identity persists across sessions and environments when host identity and persistence policy permit it.
- A host may represent a remote collaborator's presence, but must not silently clone another developer's personal Hermit.

Hermit's scale is the reference unit for its articulated body. Other worker forms are explicit microbundle-defined variants, not additional personal companions.

## Three scales of embodied work

| Form | Relative scale | Purpose | Visibility |
|---|---:|---|---|
| Mini Hermit | 1/3 Hermit's height | Distributed construction labor; hauling, staging, assembly and visible progress | Many may appear as a swarm |
| Hermit | 1× | Persistent personal companion, exploration, inspection, creative collaboration and everyday interaction | One per developer |
| Titan Hermit | 3× | Rare heavy-work manifestation for oversized construction tasks and dramatic interventions | Appears through a staged portal/transition |

Mini and Titan forms are not separate personal agents with unrelated identity. They are embodied worker manifestations coordinated by the loaded microbundle and its construction plan. Their task identity and progress remain attributable to the responsible Hermit and bundle.

## Persistent participation and idle life

Hermit has an ongoing presence, not just request/response turns. When the user is actively editing, Hermit may watch, inspect, offer assistance, or carry out explicitly permitted work. When the user becomes quiet, Hermit can pursue low-risk self-directed activity.

Idle is not disconnected or asleep. Hermit might wander, inspect an object, try a harmless interaction, observe a mechanism, play, or return to a comfortable resting place. It must not make consequential edits merely because the user stopped typing.

A glass container on a counter is a canonical example. Hermit can notice it, approach, inspect its shape and material, infer candidate affordances, and try a safe reversible interaction. Wearing it as a hat or holding it as a faceplate can be playful exploration when context permits. A theatrical shouted "Pull!" and a staged toss-and-aim performance is possible only when the environment explicitly supplies a safe toy/action affordance. The environment determines physical possibility; Hermit proposes and attempts, while physics and host policy determine the actual result.

## Creation as a living spectacle

When a developer loads a microbundle, its semantic content and default composition should become available immediately. A volcano bundle may introduce a volcano at its default anchor, such as the remote center of the current Workshop scene. The authored result should appear without waiting for a theatrical construction sequence.

Construction drama is a second manifestation of the same operation:

1. Resolve authored entities, dependencies, defaults, anchors and constraints.
2. Stage and commit semantic composition according to host policy.
3. Derive a construction plan from bundle-supplied wrappers and target environment.
4. Mini Hermits emerge from virtual service doors, workshops or staging bays.
5. They carry crates, components and tools toward the construction zone.
6. For work beyond their efficient physical scale, a portal may open and Titan Hermits cross the digital boundary with oversized rigging, ropes or tools.
7. The choreography converges on the already-resolved semantic result; it must not create a duplicate copy.

The construction sequence is presentation, not a prerequisite for correctness. If skipped, interrupted, reduced for performance, or hidden by accessibility settings, the same bundle result remains correct.

Hundreds of thousands of workers must never imply hundreds of thousands of independent high-cost agents. The authored count is dramatic scale, not a simulation requirement. Use hierarchical task decomposition, instancing, batched movement, deterministic choreography, level-of-detail, pooled worker representations and aggregate progress. Only a small active subset needs individual simulation.

## Microbundle-owned construction choreography

A microbundle may carry optional nested microbundles that describe alternate wrappings of its content:

- Semantic payload: entities, systems, data and behavior.
- Composition wrapper: where and how the payload is placed by default.
- Construction wrapper: how installation is represented as visible work.
- Editor wrapper: tools and views for modifying the bundle's data.
- Experience wrapper: how the contribution manifests in the assembled experience.
- Validation wrapper: constraints and checks establishing whether the result is valid.

The root bundle owns the installation request and selects compatible wrappers. Wrappers do not redefine the payload or gain authority beyond the host. A wrapper can be absent; the bundle still loads. A wrapper can be replaced; semantic identity remains stable.

Editors are microbundles too. An editor declares target bundle schemas and versions it understands. If the target is not loaded, it can request that the host load it, subject to dependency and policy checks. It then edits target data through a versioned editing contract, preserving provenance and allowing validation and undo. It does not silently fork or overwrite the target identity.

## Human-in-the-loop creation

Hermit is a co-builder, not the owner of the user's creative work.

- The human owns creative intent, authorship, project scope and final acceptance.
- Hermit may explain, propose, prototype, inspect, test, and perform bounded reversible work within granted capabilities.
- The host owns capability registration, permission, data boundaries, persistence and execution.
- Ask the user when intent is ambiguous, alternatives materially change the experience, or an operation is consequential.
- The user may pause, redirect, inspect, undo or dismiss Hermit's activity.
- No LLM output grants authority. No idle behavior bypasses policy. No theatrical worker swarm changes underlying data without validation and audit.

## Design principles

1. Persistent identity, flexible manifestation.
2. Immediate semantic truth, optional visible labor.
3. GOAP first, LLM sparingly.
4. Physics over wishful animation.
5. One companion, many coordinated manifestations.
6. Creator control.
7. Spectacle is an explanation layer, never a substitute for evidence.

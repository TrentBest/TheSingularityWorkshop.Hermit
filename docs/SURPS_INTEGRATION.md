# Hermit × SURPS — Diegetic companion integration

> **Status: integration architecture and delivery contract.** This document describes the intended boundary and build sequence. It does not claim a live SURPS adapter, game-master model, articulated Hermit, or diegetic GUI is implemented.

## The experience

Hermit is not a menu with a character attached. Hermit is the user's persistent, embodied interface to the experience.

A player can speak to Hermit, show Hermit an object, ask for an explanation, request a new adventure, ask for help building something, or simply play. Hermit may act as a companion, control the remaining party when the player is solo, portray NPCs, or facilitate the experience as game master. The same interaction model should work in the Workshop itself: Hermit helps users inspect, author, compose, test, and modify Workshop content without sending them to a detached control panel.

SURPS is a third rail for the Workshop's digital content: it adds a reusable roleplaying/game-experience interpretation to content that remains useful to the wider Workshop. SURPS must not become a hard dependency of unrelated Workshop domains, and Hermit must not absorb SURPS rules into its own runtime.

## Ownership boundaries

| Domain | Owns | Does not own |
|---|---|---|
| SURPS | Rulebook identity and composition, shared ontology/LOD/compatibility/selection, MicroBundle and audience-view contracts, and roleplaying interpretation of selected domain content | Embodiment, rendering, general-purpose assistant orchestration, or domain-specific physical execution |
| Character/NPC domain owners (currently SingularityCity for general residents/NPCs) | Canonical identity, capabilities, relationships, knowledge and behavior records for their domain | Rule adjudication, companion orchestration, or host authorization |
| Hermit | Companion identity and behavior, goal selection, party/NPC role orchestration, GM facilitation, dialogue routing, bounded autonomy, capability invocation, interruption and evidence | Rules adjudication, physical truth, model authority, rendering engine |
| Gestures | Reusable physical procedures, keyframes, named local transforms, deterministic evaluation and playback | Rig discovery, physical success, collision, balance, rendering |
| Physics | Reachability, contact, constraints, collision and achieved physical state | Narrative intent, character rules, presentation |
| GUI | Semantic controls, inspectors, timelines, contextual editing and approval surfaces | World simulation or scene rendering |
| Renderer | Observer context, representation selection and fidelity/update policy | Authoritative world state or pixel drawing |
| Visualize | Scene/frame manifestation, SVG evidence and GPU-facing presentation | Game rules or assistant authority |
| Host / FSM_COS / Foundry | Composition, identity, persistence, resource budgets, trusted capabilities, authorization and execution lifecycle | Creative intent or model-generated permission |

The current SURPS development branch confirms the important boundary: its C# `ISurpsRulebook : IMicroBundle` is still a minimal marker, and `SurpsRulebookDungeonsAndUnderground` is a composition wrapper rather than a general character/session runtime. SURPS has a real JSON MicroBundle/view resolver for CORE Spying, but its own sourcebook explicitly labels the 2d6 procedure as a provisional tabletop playtest and does not claim an automated digital spying evaluator. Its player and GM views select the same canonical records for different audiences. General NPC/person ontology ownership has moved to SingularityCity; SURPS provides the roleplaying presentation and procedures that consume that domain. FSM_COS owns runtime MicroBundle composition. Therefore the Hermit observation adapter is deliberately a host-projected read model: a trusted host combines selected SURPS MicroBundle provenance with canonical participant/world state from their owning domains. It is not a fabricated SURPS CLR API. Do not invent parallel character-sheet, skill, encounter, or adjudication schemas in Hermit.

## Hermit's SURPS roles

Hermit is one persistent companion identity with context-dependent roles. These are modes of participation, not separate unrelated agents.

### Solo-player companion

When the player is alone, Hermit can operate the rest of the party. It should understand each assigned character's goals, knowledge, current condition, relationships and tactical position from a host-assembled observation of the canonical character/world domains and the selected SURPS content. It can propose a bounded action through registered host capabilities; an action is only rules-adjudicated when the selected SURPS rule and its owning evaluator actually exist. Hermit must not pretend a tabletop procedure is already a digital evaluator.

The player remains the principal decision-maker for their own character. Hermit should preserve meaningful choices, explain party suggestions when useful, and avoid turning companion support into hidden player-character control.

### Non-player characters

Hermit can portray NPCs through a role-specific context: identity, current knowledge, motives, relationships, voice/personality guidance, and the facts the NPC is allowed to know. NPC dialogue is not a source of authoritative world facts. The host supplies observations and the rules system resolves consequential actions.

NPCs should not all sound or behave like the same assistant prompt. Role context, bounded memory, goals, and canonical data from the NPC's owning domain should shape each portrayal; SURPS supplies the selected roleplaying view and procedures.

### Game master

Hermit can facilitate or run an adventure: generate an opening situation, portray the world and its inhabitants, present meaningful choices, track unresolved threads, and request rule resolution from a registered SURPS/domain evaluator when one exists. A GM plan is a proposal and narrative structure, not a license to rewrite character or world state. Where only a tabletop procedure exists, the human GM remains the adjudicator.

The Gauntlet belongs beside this loop as campaign/probe/invariant evaluation and deterministic reporting; it should not be collapsed into Hermit's narrative planner. Domain repositories own their rule/capability/evidence, SURPS composes the selected rulebooks and profiles, and FSM_COS assembles the runtime MicroBundles.

The GM loop should separate:
1. **Situation** — current authoritative session/world snapshot.
2. **Intent** — what a player or NPC is trying to accomplish.
3. **Rule request** — the exact registered SURPS/domain operation, if an executable evaluator exists; otherwise a human-GM decision request.
4. **Adjudication** — an authoritative provider result, or an explicitly recorded human-GM decision; never an LLM-invented verdict.
5. **Consequence** — proposed world/session update, committed by the host.
6. **Presentation** — dialogue, diegetic controls, and embodied response.

This makes adventures reproducible and inspectable. It also allows a human GM to take over, collaborate with Hermit, or constrain Hermit's autonomy.

### Creator and Workshop guide

The same Hermit can help create characters, adventures, NPCs, locations, props, rules content, and Workshop microbundles. Creation should be conversational and diegetic: Hermit can bring up a character sheet as a living object, point to a value, show a timeline, place a preview in the world, or let the user manipulate a control.

Every edit has a draft/preview/commit distinction. The user owns creative intent and final acceptance. Hermit can propose and prototype; host policy owns permissions and the committed result.

## Diegetic GUI: no detached main menu

The default interaction surface is Hermit in the world. A control should appear when context makes it useful:

- A character sheet can manifest as a living, inspectable SVG/GUI object.
- Selecting a characteristic or skill can reveal its meaning, dependencies, and permitted editing controls.
- A party view can appear as a small in-world gathering, with each member's status available through interaction.
- A GM can lay out a map, clues, initiative order, or encounter state as objects and overlays in the scene.
- A creation request can produce a manipulable preview and a contextual inspector.
- Approval, undo, pause, and dismissal remain explicit and accessible.

This is not a ban on conventional accessibility surfaces. A compact text, keyboard, screen-reader, or fallback interface must remain available. "Diegetic first" means the world is the primary interaction metaphor, not that users are trapped in a 3D scene.

GUI owns semantic interface state. Renderer selects what is worth representing for the current observer. Visualize presents the selected scene. A UI control must never silently become a game action: it produces a validated request that passes through Hermit's capability boundary and the SURPS/host authority path.

## Embodiment: rig-neutral Hermit

Hermit should not be defined as a single humanoid mesh or skeleton. The identity persists while its physical manifestation can change.

The Gestures evaluator already works with named transforms and does not impose a humanoid bone list. Its current contract is deliberately narrower than a complete rig system: named local transforms can be evaluated, but target hierarchy, rest pose, rig compatibility, retargeting, IK, and physical success are not supplied automatically.

The intended authoring workflow is:

1. Select or create a target rig/profile (humanoid, snake, quadruped, bird, mechanism, or another topology).
2. Position the rig manually using a host rig-editing adapter.
3. Capture a named pose as a keyframe.
4. Capture subsequent poses and assign normalized times.
5. Compose the transition function and its parameters in a GUI timeline/inspector.
6. Preview deterministic Gesture evaluation at a scrubbed logical time.
7. Validate the target mapping and constraints; Physics decides feasibility and reports achieved state.
8. Save a versioned, reusable procedure only after explicit user acceptance.

The initial transition controls should expose the actual interpolation/easing parameters supported by the chosen evaluator. Do not present a slider as controlling an equation that the runtime does not yet implement. More sophisticated spring/damper or learned motion models remain experiments until they have defined inputs, units, stability bounds, and tests.

### The snake side quest

A harmless idle behavior can be a memorable embodiment test: Hermit notices an apple, looks around to see whether anyone is watching, morphs into a snake, and slithers toward it. It should be implemented as an authored, bounded sequence—not as an LLM improvising arbitrary joint motion.

The proof requires:
- a snake-specific rig/profile and validated transform mapping;
- a set of authored transition and slither Gestures;
- a safe-area and obstacle-aware route supplied by the environment;
- Physics/host confirmation of contact and apple interaction;
- deterministic, bounded idle budgets and immediate interruption;
- a non-destructive fallback if the snake rig or route is unavailable.

Hermit may be playful; it must not secretly mutate the Workshop or consume arbitrary world objects. The apple is an explicit sandbox affordance.

## Mini Hermits and Titans

Mini and Titan Hermits are manifestations of the same responsible companion/construction task, not new independent personal identities.

The first encounter should be delightful and legible:
- the full-size Hermit is immediately recognizable, friendly, and responsive;
- Mini crews appear as coordinated construction workers when a bundle task warrants visible labor;
- a Titan arrives rarely, through a staged portal, when the task genuinely exceeds Mini-scale work;
- the user can inspect what each crew is doing and why;
- aggregate progress is tied to the actual semantic task, not an animation timer.

The semantic microbundle result must be correct before optional construction spectacle begins. Mini/Titan choreography cannot install a second copy, claim completion early, or bypass host authority. Renderer and Visualize choose how many workers need individual representation; large authored counts are not a requirement to simulate every worker independently.

## Model and Oracle strategy

Hermit should not send every thought or movement to an LLM. Keep the existing architecture:

- Deterministic GOAP handles known facts, routine choices, bounded idle behavior and local action sequencing.
- SURPS resolves game rules and authoritative outcomes.
- Gestures evaluates authored motion procedures.
- Physics resolves physical feasibility and achieved state.
- LLMs are used for natural-language understanding, creative generation, unfamiliar semantic interpretation, NPC portrayal, and higher-level GM reasoning.
- The host validates all proposed actions and owns permission, execution and persistence.

An Agents.LLM / Oracle experiment is a promising Workshop knowledge service. The Oracle should retrieve versioned, provenance-bearing knowledge about Workshop concepts, APIs, contracts, examples and known limitations. It should return evidence and candidate structures to a consuming model; it should not be treated as infallible, as a permission service, or as a replacement for compiler/tests.

A practical Oracle retrieval result should include:
- canonical concept/package identity and version;
- relevant source paths and exact API examples;
- compatibility and dependency information;
- confidence/relevance signals and provenance;
- explicit unknowns or conflicting sources;
- a clear distinction between implemented behavior, proposal and roadmap.

The consuming LLM can then draft an integration using the Oracle's evidence. Compilation, tests, contract validation and human review establish whether the answer is correct. Fine-tuning can be explored later, but retrieval over curated Workshop documentation and source is the better first step: it is easier to update, cite, evaluate and correct as the ecosystem evolves.

## Delivery sequence

| Stage | First deliverable | Acceptance evidence |
|---|---|---|
| 0 — Domain mapping | Map SURPS source types and operations to Hermit roles | Source-backed ownership table; no duplicate rule schema |
| 1 — SURPS read bridge | Hermit receives a versioned session/character/party observation through a host adapter | Immutable snapshot tests; stale/unknown identity rejection |
| 2 — Solo companion | Hermit proposes one party-member action and routes it through SURPS | Rule result, action trace, host verification, interruption and denial tests |
| 3 — NPC portrayal | Role-scoped NPC context and bounded knowledge | NPC cannot claim inaccessible facts or directly mutate authoritative state |
| 4 — GM vertical slice | Hermit creates and facilitates one small adventure | Situation → intent → SURPS adjudication → verified consequence; human takeover |
| 5 — Diegetic sheet | Living character sheet with contextual GUI controls | GUI state bound to a versioned draft; preview, approve, undo and keyboard fallback |
| 6 — Motion studio | Rig selection, pose capture, keyframe timeline and deterministic preview | Humanoid and non-humanoid fixtures; CPU evaluator parity and rig-validation report |
| 7 — Living Hermit | One embodied interaction plus safe snake idle side quest | Gestures output separated from Physics achieved state; interrupt and safe fallback |
| 8 — Mini/Titan reveal | Construction crew manifestations tied to a real microbundle task | Idempotent task event, aggregate progress, LOD and reduced-motion parity |
| 9 — Oracle | Retrieval-first Workshop knowledge service for LLM-assisted integration | Versioned corpus, provenance, held-out API questions, citation/accuracy evaluation |

## First vertical slice recommendation

Build a deliberately small solo adventure before attempting the complete world:

1. Load one SURPS session and one player character.
2. Provide a small party of two companion characters and a handful of NPCs.
3. Give Hermit a read-only session observation and a narrow set of SURPS action capabilities.
4. Let the player ask Hermit to suggest or control one companion's next action.
5. Have SURPS adjudicate the action and return its authoritative result.
6. Let Hermit narrate and present the result through the current Workshop UI/scene.
7. Record the complete intent, proposal, policy, adjudication and verification trace.

This proves the central relationship: Hermit is a companion and facilitator; SURPS is the game system. It is a better foundation than starting with a large LLM, full campaign generation, or procedural animation.

## Non-negotiable boundaries

1. SURPS rules are not reimplemented in Hermit.
2. LLM output never grants permission or writes authoritative game state directly.
3. Player-character agency remains with the player unless they explicitly delegate a bounded action.
4. NPC knowledge is scoped; generated dialogue is not evidence.
5. Gesture evaluation is requested motion, not physical success.
6. Physics and the host own achieved state and interaction truth.
7. Diegetic UI remains accessible and interruptible.
8. Mini/Titan spectacle never changes semantic outcomes.
9. Oracle answers carry provenance and uncertainty; tests remain the final technical check.
10. Implemented, tested, specified and planned features are always labeled honestly.


## Cross-repository coordination

Hermit's consumer questions and owner-repository responses are tracked in [Hermit issue #7](https://github.com/TrentBest/TheSingularityWorkshop.Hermit/issues/7). The issue links directly to the open SURPS, SingularityCity, Gestures, Physics, FSM_COS, GUI, Renderer, Visualize, Gauntlet, and Agents.LLM work items. Implementation should consume the owning repository's confirmed contracts rather than duplicate them.

GitHub coordination convention:
- **Issue:** ask a question, record a requirement, propose work, or coordinate across repositories.
- **Pull request:** propose a concrete code/documentation change for review, usually against that repository's development branch.

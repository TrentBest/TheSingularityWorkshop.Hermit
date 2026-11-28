# Hermit as a StarCraft II strategic player

**Status: architecture and implementation plan. Not a live SC2 integration.**

Hermit should play StarCraft at the level of a strategic commander. It declares and explains intent, selects a validated composition of existing bot controllers, observes the match through the player's legitimate information boundary, and adapts the plan. SingularityBot remains the player runtime and executes all legal game actions.

This is deliberately not a per-unit micro interface. Hermit should not decide every Marine movement, SCV click, ability cast, or protocol action.

## Desired relationship

```text
                Hermit — strategic player
     goals • priorities • doctrine • explanation
             intent + composition proposal
                         |
                         v
       trusted host policy / proposal validation
                         |
                         v
             SingularityBot runtime
     registered hero + controller composition
       economy • production • scout • army
                         |
                existing action path
                         v
                    SC2 match
                         |
              player-safe observations
                         |
                         +-----------> Hermit
                         |
             host-only observer evidence
                         v
        ServerSC2 result / replay validation
```

Hermit is the strategic decision-maker; it is not the authority for SC2 legality, live feasibility, or match truth. SingularityBot remains the sole owner of gameplay semantics and SC2 action submission. ServerSC2 remains the match and evidence authority.

## What Hermit decides

Hermit reasons in strategic objectives and policies:

- **Economy:** safe/greedy posture, expansion appetite, worker and resource priorities.
- **Opening and production:** intended milestones, production focus, technology direction, timing windows.
- **Information:** what to scout, which uncertainty matters, and how much risk to accept for information.
- **Defense:** threatened assets, defensive posture, reinforcement priorities, and conditions for abandoning pressure.
- **Map control and pressure:** hold, contest, contain, attack, regroup, or retreat objectives.
- **Army direction:** desired composition and role allocation at the strategic level.
- **Transitions:** conditions, confidence, expiry, and supersession of one plan by another.

An intent should include its rationale, assumptions, desired outcomes, constraints, priority, transition predicates, confidence/uncertainty, and expiry. Readable explanation is useful to the player, but it is not executable evidence.

## What SingularityBot decides and executes

SingularityBot resolves strategic intent against current game state and its trusted catalogs. It determines whether a requested objective is feasible, which registered controllers can satisfy it, how resources and units are allocated, and which legal SC2 actions to submit.

Existing and planned bot work is directly reusable:

- [Issue #26](https://github.com/TrentBest/TheSingularityWorkshop.SingularityBot/issues/26) defines race heroes and matchup-specific hierarchies of economy, construction, production, research, scouting, intelligence, and army controllers.
- [Issue #16](https://github.com/TrentBest/TheSingularityWorkshop.SingularityBot/issues/16) establishes the distinction between high-level bot capabilities such as `Expand()`/`Build()` and low-level SC2 actions, while preserving existing runtime/action paths.
- [Issue #27](https://github.com/TrentBest/TheSingularityWorkshop.SingularityBot/issues/27) makes opening decisions measurable and experimentally tunable.

Hermit consumes the bot's versioned catalog and composition descriptors. It must not duplicate the catalog or invent controller IDs.

## Controller composition is the control surface

Hermit proposes data, never code. A proposal may select a registered hero/doctrine, select or replace supported modules, adjust schema-declared settings, or request a transition. Each selection is identified by a stable implementation ID and exact version.

SingularityBot validates:
- implementation identity and version;
- race and opponent-matchup compatibility;
- required capabilities and module dependencies;
- setting schemas, ranges, and cross-setting constraints;
- conflicts, resource budgets, and controller slot cardinality;
- whether the requested mutation is safe at the current lifecycle stage.

Not every controller can be hot-swapped. Each registered module must declare its mutability: pre-match only, safe at a phase/decision boundary, safely reconfigurable in place, or immutable for the match. If state migration is not explicitly supported and tested, defer the change or reject it. Never silently reset a live controller.

No arbitrary assembly/type loading, scripts, generated C#, shell commands, or model-written executable expressions are permitted. A human/host policy may deny, constrain, or require approval. A Hermit proposal is not authorization.

## Match observations and information fairness

Hermit-as-player receives only a versioned, provenance-bearing projection of information legitimately available to its assigned player/bot. The projection must preserve:
- game-loop/frame identity and monotonic observation revision;
- visible contacts versus remembered/last-seen contacts;
- uncertainty and missing information;
- player identity, race/match context, and observation source;
- resources, structures, units, production and map facts only as available to that player.

The independent ServerSC2 observer may hold host-only information for terminal results and replay evidence. That data must never be placed in Hermit's player context or leaked to the bot runner. The host must enforce the boundary, not rely on prompt instructions.

## Proposal and adaptation lifecycle

The target flow is:

1. Server/host provides an authenticated player-safe observation and current bot composition descriptor.
2. Hermit interprets the situation and records its strategic assessment.
3. Hermit emits a versioned, bounded intent and composition proposal with a stable proposal ID, base composition revision, expiry, and supersession semantics.
4. Host policy authorizes or denies the requested operation; the SingularityBot runtime validates it against its canonical catalogs and current state.
5. The bot returns a structured accepted/rejected/deferred result with diagnostics and the effective composition revision.
6. At a declared safe boundary, SingularityBot applies the accepted change using its existing scheduler and controllers.
7. Bot telemetry and subsequent player-safe observations let Hermit explain whether the intended outcome is being achieved and propose a revision.
8. ServerSC2 independently captures host-authoritative terminal result and replay evidence.

Duplicate proposal delivery must be idempotent. Stale base revisions, expired proposals, unknown IDs, invalid settings, policy denial, and incompatible race/matchup must fail closed. Partial application and controller transition failures must be explicit.

Any model/provider reasoning is asynchronous and outside the SC2 frame/action loop. Deterministic fake inference and recorded observations should prove the contracts before adding a live model adapter.

## First playable proof

Start narrow:
- one supported Terran bot build;
- one pinned 1v1 map and opponent configuration;
- one player-safe observation source;
- one small set of existing, registered controller compositions/settings;
- strategic objectives for economy posture, scouting, defense/pressure, and transition conditions.

Run a baseline bot with its current composition, then a Hermit-directed variant under matched conditions. Preserve exact bot build/configuration, map/game build, matchup, match identity, intent/proposal, composition revision, decision telemetry, observation references, and replay/result evidence. Compare strategic outcomes and time-series metrics; do not infer improvement from one win.

ServerSC2 already tracks the staged experiment direction in [issue #5](https://github.com/TrentBest/TheSingularityWorkshop.ServerSC2/issues/5). Its current documentation explicitly says live observer-hosted result/replay capture and batch execution remain gated. Keep those gates intact; infrastructure failures are not bot losses, and no candidate is automatically promoted.

## Repository ownership

| Repository | Responsibility |
|---|---|
| Hermit | Strategic intent, explanation, orchestration, proposal lifecycle, adaptation policy |
| SingularityBot | Canonical bot definition/catalogs, feasibility, controller composition, game strategy, SC2 actions |
| ServerSC2 | SC2 process/match lifecycle, player/observer separation, observations, terminal results, replay and experiment evidence |
| ServerApp / host | Match assignment, identity, admission, permissions, budgets and policy |
| HeadlessAi / model provider | Optional asynchronous inference only; never authority or frame-loop execution |



### Initial source audit (2026-11-28)

The exact SingularityBot `development` head inspected for this plan is [`b9543e3405e9982274050d28916eaefc4f696304`](https://github.com/TrentBest/TheSingularityWorkshop.SingularityBot/commit/b9543e3405e9982274050d28916eaefc4f696304).

- `CommandLayerComposition` exists as a bounded declarative type with strategic-to-unit layer kinds, stable slots, implementation/presentation IDs, accepts/emits contracts, and required/provided capabilities.
- `BotDefinition` v1 does **not** currently contain a `CommandLayerComposition` property. The composition type is therefore not yet the portable, persisted, executable controller composition Hermit needs.
- SingularityBot issue #26 explicitly records that the current Forge hierarchy is a preview, not serialized into BotDefinition v1 or executable at runtime; it also records that the runtime currently has a race-level module shape rather than a complete matchup-indexed hero/module matrix.
- `BotDefinition` already contains a bounded `BotAiPolicy` (provider/model labels, startup/in-match call budgets, timeout, minimum game-loop spacing, and allowed triggers). This is a bot-owned consultation policy, not a Hermit host adapter, not a controller-composition handoff, and not permission to put network inference in the frame/action loop.
- `ExecutiveController` enforces the per-observation stage order: executive reaction, subordinate controllers, executive review, then unit AI. This is a promising existing strategic control seam to investigate; it must not be bypassed or replaced.
- `NormalizedObservation` already carries player ID, game-loop identity, unit alliance and visibility classifications (Visible/Snapshot/Hidden), captured-field metadata, and economy fields. This is a useful source for a player-safe projection, but the host handoff still needs authentication, monotonic revision/provenance, and proof that observer-only data cannot enter the player context.
- The canonical bot definition remains strict JSON v1 and excludes unknown properties. Do not have Hermit send new composition fields until SingularityBot versions and validates the canonical contract.

**Immediate cross-repository dependency:** SingularityBot must turn the existing composition concept into a trusted, validated runtime contract (or expose an equally authoritative registered-controller API) before Hermit can safely add/modify controllers. Hermit should first define its provider-neutral strategic intent envelope and consume the bot's published descriptors; it must not invent a competing BotDefinition schema.

## Current implementation status

- Hermit's deterministic runtime and host capability registry exist, but this StarCraft integration is not implemented.
- Hermit's existing .NET Gestures/NeuralNetworks reach harness is an isolated consumer conformance test, not a live SC2 or Hermit runtime bridge.
- SingularityBot has declarative composition work and existing bot-domain controllers; its current state and executable composition support must be audited at the exact development revision before selecting the first supported modules.
- ServerSC2 has a documented target for bounded batch experiments, but its live observer/result/replay and production runner gates remain incomplete.
- No transport, model endpoint, hot-swap protocol, or live match capability is claimed by this document.

## Tracking

Implementation coordination: [Hermit #10 — Teach Hermit to play StarCraft through strategic intent and composable bot controllers](https://github.com/TrentBest/TheSingularityWorkshop.Hermit/issues/10).

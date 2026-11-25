# Hermit and the Workshop Ai technologies

## Purpose

Hermit must use the Workshop's Ai-branded technologies as the mechanisms through which applications communicate with, structure, and safely consume LLM output. They are not interchangeable provider wrappers, and Hermit must not recreate their responsibilities with generic prompt/JSON glue.

This document records the current development-branch contracts reviewed on 2026-11-25. It is an integration map, not a claim that Hermit has a live end-to-end connection to every package.

## The technologies and their ownership

| Technology | Owns | Hermit uses it for | Explicit non-goals |
|---|---|---|---|
| [HeadlessAi](https://github.com/TrentBest/TheSingularityWorkshop.HeadlessAi) | Configured direct-HTTP endpoint invocation, provider protocol adapters, bounded response extraction | Send a bounded request to a configured LLM endpoint and receive response content | Does not own Hermit's goals, memory, task planning, budgets, permissions, output policy, or actions |
| [ProtocolAi](https://github.com/TrentBest/TheSingularityWorkshop.ProtocolAi) | Application-owned vocabulary definitions and stable protocol-qualified integer symbol identities; protocol payloads and typed event-envelope contracts | Give model-facing concepts stable identities, resolve them against the expected catalog, preserve explicit unknown literals, and use compatible correlation/provenance envelopes where appropriate | No model/provider, grammar, authorization, authentication, or command execution |
| [GrammarAi](https://github.com/TrentBest/TheSingularityWorkshop.GrammarAi) | Grammar productions plus typed knowledge structures: node kinds, contextual slots, bounded relationships, versioned definitions, structural validation | Define and validate the shapes of knowledge maps and structured proposals | Does not own vocabulary meaning, host context, domain semantics, or execution; deliberately has no ProtocolAi dependency |
| [CommandAi](https://github.com/TrentBest/TheSingularityWorkshop.CommandAi) | Provider-neutral immutable command proposals, typed values, address-space descriptors, correlated exchanges/responses, bounded codecs | Give the model a deliberately limited input/context surface and a declared response surface; represent proposed actions as inert data | Address IDs are descriptors, not memory pointers. A valid response is not authorization, dispatch, or execution |
| [CiAi](https://github.com/TrentBest/TheSingularityWorkshop.CiAi) | CI-domain contracts, exact-source/run evidence observation, diagnostics, policy evaluation, and evidence verdicts; CODE RED development direction | When Hermit is helping develop the Workshop, consume verified CI facts and bounded development capabilities | Not an LLM-powered CI runner; not general game adjudication; model output cannot manufacture CI evidence, a green verdict, or permission |

**AiCi** is the repository-operation proposal-builder direction within CiAi's CODE RED design. It composes deterministic repository-operation intent using CommandAi's generic proposal model; it is not a Git executor. The host must independently validate repository, branch, base SHA, paths, content digests, and authorization before any operation.

## How they compose

These are complementary responsibilities, not a mandatory monolithic dependency chain:

1. **The host defines the task.** Hermit and its trusted host decide what question is being answered, which context is relevant, which capabilities may be exposed, and the request's size/time/cost limits.
2. **HeadlessAi transports one bounded invocation.** The host selects a configured profile and matching adapter for the endpoint protocol. The host owns credentials and conversation/session state. HeadlessAi returns content; it does not decide what that content permits.
3. **ProtocolAi identifies known concepts.** The host supplies the expected vocabulary definition/catalog. Known values resolve to protocol-qualified integer references; unknown values remain explicit literals; undefined or wrong-protocol references fail validation. The meaning of every published identity remains application-owned.
4. **GrammarAi constrains structure.** A host-selected grammar or typed structure definition determines which nodes and relationships are valid. External ProtocolAi references are resolved by a host-supplied lookup bound to the exact request/catalog snapshot. GrammarAi can validate structure without importing ProtocolAi.
5. **CommandAi bounds the exchange and proposal.** The host declares readable and writable address descriptors and supplies only the values intended for that invocation. CommandAi validates declared addresses, access direction, value kinds, required slots, bounds, and exchange correlation. It does not dereference an address or interpret application meaning.
6. **Hermit and the domain host decide what happens.** The host converts only recognized, validated inert values into an internal proposal. Hermit resolves a pre-registered capability and validates arguments. The trusted host/domain policy decides whether it is allowed, requires human approval, or must be rejected.
7. **The owning domain evaluates and commits.** SURPS owns selected roleplaying semantics and rulebook selection; City owns resident/NPC state; Gestures owns procedure evaluation; Physics owns physical truth; FSM_COS owns MicroBundle composition. A model response or a well-formed command is never itself an authoritative world-state change.
8. **CiAi supplies development evidence when relevant.** GitHub Actions remains the build/test executor and source of run facts. CiAi observes and evaluates provenance-bound evidence. A model can propose a repair, but only the trusted host can authorize repository operations, and the exact candidate must earn a fresh evidence verdict.

## Important protocol and version distinctions

- `CommandAi/1` is the CommandAi wire/protocol identity; it is not the NuGet package version.
- GrammarAi structure definitions have their own definition ID and schema version. Those are not ProtocolAi symbol IDs.
- ProtocolAi integer addresses are meaningful only within their owning protocol definition. The application must preserve the meaning of published IDs.
- GrammarAi's external-reference resolver must be bound to the expected catalog snapshot; never resolve an LLM-supplied reference against an ambient, changing catalog.
- ProtocolAi event-envelope kinds are defined contracts, not a license to turn them into a universal Workshop event bus. Hermit conversation/session events and domain events remain with their owners unless a compatible extension is explicitly designed.
- A digest proves byte consistency only when the trusted host has authenticated and accepted the referenced artifact. A hash, valid JSON document, model assertion, or provider echo does not prove authority.

## Hermit's current status and integration gates

The current Hermit runtime is a JavaScript development proof with injected planning and registered host capabilities. The SURPS observation bridge is a synthetic, read-only host-projection fixture. Neither is yet a live HeadlessAi + ProtocolAi + GrammarAi + CommandAi end-to-end runtime integration.

The existing [HeadlessAi integration boundary](HEADLESSAI_INTEGRATION.md) also records the separate CODE RED ownership split: Foundry owns durable task lifecycle, leases, retries, budgets, repository authorization and human handoff; CiAi owns CI evidence semantics; HeadlessAi owns provider invocation; Hermit owns capability mediation inside the trusted host. Hermit must not create a competing durable task state machine.

Integration should proceed in evidence-backed slices:

1. Keep the existing injected planner and deterministic fake path as the baseline.
2. Add a narrow HeadlessAi adapter only after aligning with its current merged development API; use deterministic fake HTTP/provider responses in tests.
3. Define the smallest Hermit-owned ProtocolAi vocabulary needed for a specific task, with compatibility tests and explicit literal handling.
4. Define a versioned GrammarAi structure only where a real consumer needs typed relationships; validate external references against a fixed host catalog snapshot.
5. Use CommandAi address-space exchanges for a concrete bounded model task; test missing/extra slots, wrong value kinds, stale correlation, malformed payloads, and size limits.
6. Translate validated inert proposals into pre-registered Hermit capabilities; adversarially prove that model output cannot register capabilities, widen scope, satisfy approval, or mutate domain state.
7. Add owner-domain evaluators and authoritative observation tests one domain at a time.
8. Use CiAi only for the development/CI use case, and align CODE RED task/evidence/authorization fields with Foundry and HeadlessAi before connecting any repository mutation path.

Do not add all sibling NuGet packages as unconditional Hermit dependencies merely to demonstrate the architecture. Prefer source-pinned contract tests or narrow host-injected ports where they fit the existing repository and build model. Any new runtime package dependency must be justified by an actual consumer requirement and reviewed against target frameworks and dependency direction.

## Source documentation reviewed

- [HeadlessAi usage guide](https://github.com/TrentBest/TheSingularityWorkshop.HeadlessAi/blob/development/docs/usage.md) and [provider adapters](https://github.com/TrentBest/TheSingularityWorkshop.HeadlessAi/blob/development/docs/provider-adapters.md)
- [ProtocolAi README](https://github.com/TrentBest/TheSingularityWorkshop.ProtocolAi/blob/development/README.md), `ProtocolDefinition.cs`, `ProtocolReference.cs`, and event-envelope source
- [GrammarAi README](https://github.com/TrentBest/TheSingularityWorkshop.GrammarAi/blob/development/README.md), [typed structural schema](https://github.com/TrentBest/TheSingularityWorkshop.GrammarAi/blob/development/docs/STRUCTURAL_SCHEMA.md), and [knowledge mapping model](https://github.com/TrentBest/TheSingularityWorkshop.GrammarAi/blob/development/docs/KNOWLEDGE_MAPPING_MODEL.md)
- [CommandAi README](https://github.com/TrentBest/TheSingularityWorkshop.CommandAi/blob/development/README.md), [architecture](https://github.com/TrentBest/TheSingularityWorkshop.CommandAi/blob/development/docs/ARCHITECTURE.md), `CommandExchange.cs`, `CommandExchangeTextCodec.cs`, and `CommandProposal.cs`
- [CiAi README](https://github.com/TrentBest/TheSingularityWorkshop.CiAi/blob/development/README.md) and [CODE RED next steps](https://github.com/TrentBest/TheSingularityWorkshop.CiAi/blob/development/docs/CODE_RED_NEXT_STEPS.md)
- [Hermit × SURPS integration](SURPS_INTEGRATION.md) and [HeadlessAi integration boundary](HEADLESSAI_INTEGRATION.md)


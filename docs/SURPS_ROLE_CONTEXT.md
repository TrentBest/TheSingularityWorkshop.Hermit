# SURPS role-context projection (development)

## Status

Implemented as a deterministic, versioned role-context builder in `src/surps-role-context.js`, with synthetic Embassy Reception fixtures and browser presentation. It is a tested context-selection seam, **not a live LLM adapter, live campaign session, canonical character schema, or secure remote host**.

## Ownership

- SURPS owns portable character semantics, selected rulebook content, evidence states, and roleplaying contracts.
- Experience/domain owners supply participant identity, current session facts, motives, goals, relationships, and permitted knowledge from their authoritative records.
- Hermit owns its persistent agent identity and context-dependent portrayal profiles: voice guidance, role mode, goals, motives, and bounded planning/dialogue behavior.
- The host owns session identity, trusted observations, persistence, access control, human approval, and committed consequences.

A role profile is not a character definition. It references one stable participant identity and selects a subset of that participant's already-projected knowledge. It does not create a second character ontology.

## Context contract

`createSurpsRoleContext(observation, profile)` first revalidates the immutable `createSurpsObservation` snapshot, then verifies:

1. The profile has a stable ID, version, persistent `agentId`, mode, participant ID, and source provenance.
2. The selected participant exists in the observed session.
3. The role mode matches the participant's declared role: `player-observer`, `companion`, or `npc-portrayal`.
4. Every permitted knowledge ID belongs to that participant's own known-fact collection.
5. Every relationship points to a participant present in the same observation.
6. All output is copied into a deeply immutable context tied to the selected MicroBundle, session identity, and exact observed revision.

The resulting context contains only the selected participant and the explicitly permitted knowledge entries. It never copies another participant's knowledge into that role context.

## Persistent identity, changing roles

The fixture uses one stable agent identity, `hermit`, with separate versioned profiles for:
- observing the active player character without speaking or deciding for them;
- portraying the player's companion;
- portraying the courier NPC;
- portraying the kitchen-contact NPC.

The two NPC profiles have distinct voice guidance, motives, goals, relationships, and knowledge scopes. They are separate portrayal contexts for one Hermit—not separate assistants with duplicated identity.

## Deterministic proof and limitations

The Pages demo uses authored sample lines and synthetic participant/session fixtures. It displays the profile and scoped facts that a future model adapter would receive. The sample line is explicitly labelled deterministic and not LLM-generated.

The synthetic fixture is public test data. It does not demonstrate secure storage of referee-only facts. A production host must enforce role-specific access before returning an observation to Hermit; a browser-side toggle or client-side filter is not authorization.

The role context is read-only. It cannot adjudicate a SURPS action, authorize a capability, or mutate session state. The CORE Spying 2d6 procedure remains a provisional tabletop procedure and uncertain outcomes still require a human GM/referee.

## Canonical character contract

SURPS issue #7 remains the authority for portable character identity and serialization. This role-context module does not define or replace that schema. It consumes stable participant IDs and owner-projected knowledge only. The synthetic fixture is a host observation example, not a canonical character document.

## Next integration gates

1. Map the accepted SURPS #7 character contract and any host/session contract by exact source revision.
2. Replace the synthetic observation provider with a trusted host adapter that enforces role-specific access and monotonic revisions.
3. Add a live model adapter behind Hermit's existing bounded inference boundary; keep deterministic tests.
4. Route consequential actions through registered host capabilities and human approval.
5. Keep uncertain rule adjudication with the human GM until an owning evaluator exists.

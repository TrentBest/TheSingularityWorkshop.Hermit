# SURPS observation bridge (development)

## Status

Implemented as a selected-content-aware, read-only host projection contract in `src/surps-observation.js`. The fixture tests use synthetic data. This is **not** a live SURPS package integration and does not claim the canonical SURPS repository's concrete types have been mapped.

## Contract

The host supplies one trusted `readSession(sessionId, { signal })` function. It projects the selected MicroBundle's identity/version (for the current fixture, `surps.microbundle.core.spying@0.1.0`) alongside participant records assembled from their owning domains. Hermit wraps that result in a bounded immutable observation containing:

- selected MicroBundle identity and version;
- session identity and monotonic session revision;
- the active player-character identity;
- participant identity, display name, role, condition summary and location;
- explicitly scoped knowledge entries, each with an identity and source reference.

The projection intentionally excludes characteristics, skills, derived values, rule procedures, inventory mutation, action resolution and arbitrary extension bags. Those remain in canonical SURPS and owner-domain records. This contract is a host projection that combines the selected MicroBundle's identity/version with participant and knowledge records supplied by their owning domains; it is context for planning and portrayal, not a substitute rules model.

## Safety properties

- Plain data only; accessors, symbols and unsupported properties are rejected without invoking getters.
- Stable participant and knowledge identities must be unique within a snapshot.
- The active identity must refer to a player-character.
- Participant and knowledge counts and text fields are bounded.
- The adapter is read-only and binds each request to the requested session identity. A role-context projection exposes only the selected participant's own scoped knowledge; it does not leak another participant's facts into NPC portrayal.
- A single adapter instance rejects revision rollback for a session.
- Every result is revalidated and copied into a deeply frozen snapshot.
- No observation value grants a capability or authorizes an action.

The adapter's revision memory is process-local. A durable host must enforce authoritative revision ordering and session access on every read. Cancellation is forwarded to the host adapter, which must honor it.

## Next integration gate

Before replacing the fixture with real SURPS data, map the canonical SURPS development branch's exported session, participant, knowledge/provenance and revision contracts. Implement a thin projection in the SURPS/host adapter, then add contract tests against actual SURPS fixtures. Do not guess type names or serialize private rulebook internals into Hermit's neutral contract.

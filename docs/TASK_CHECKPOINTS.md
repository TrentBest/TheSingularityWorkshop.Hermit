# Versioned task checkpoints

Hermit can represent a bounded task checkpoint as portable JSON without serializing executable adapters, policy callbacks, planner functions, timers, or host credentials.

## Implemented contract

`src/task-checkpoint.js` defines schema version 1:

- stable task identity and bounded task text;
- monotonically increasing checkpoint revision;
- a bounded phase and next-step cursor;
- a JSON-only observation snapshot;
- a bounded list of verified outcomes;
- an optional pending action for the `execution-started` phase.

The contract rejects cycles, accessors, symbols, non-finite numbers, sparse arrays, non-plain objects, unsupported fields, excessive nesting and payloads larger than 64 KiB. Returned snapshots are deeply immutable. Serialization and parsing both validate the complete record.

## Recovery semantics

| Phase | Recovery classification | Required behavior |
|---|---|---|
| `ready` | `resume` | Continue from the recorded observation and next-step cursor. |
| `execution-started` | `reconcile-required` | Inspect the authoritative environment before deciding whether the action happened. Never blindly replay it. |
| `completed`, `failed`, `cancelled` | `terminal` | Do not resume execution. |

An execution-started checkpoint carries a stable idempotency key. It is a correlation value for a host adapter, not proof that the adapter supports deduplication. The host must reconcile the actual environment and enforce its own idempotency policy before any retry.

## Deliberate limitations

This is a tested data and recovery-classification contract, not durable task persistence or automatic restart. There is no storage adapter, atomic write protocol, encryption, retention policy, checkpoint callback in `executeLoop`, or automatic replay. The host remains responsible for durable storage, authorization, conflict handling, and reconciliation with the authoritative environment.

Automatic executeLoop resumption remains open. The next step is to reload a ready checkpoint, restore its verified outcomes and next-step cursor, and require host reconciliation before resuming an interrupted action. Cross-device use additionally requires authenticated identity, owner-scoped durable storage and device-local authority; see [Cross-device Hermit continuity](CROSS_DEVICE_CONTINUITY.md).

## Verification

Run `npm test`. The checkpoint tests cover round-trip validation, immutability, interrupted-action reconciliation, terminal phases, invalid versions, hostile object properties, cycles and size limits.

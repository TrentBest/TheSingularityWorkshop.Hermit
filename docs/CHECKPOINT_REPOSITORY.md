# Durable checkpoint repository

Hermit separates the checkpoint contract from persistence. The core package does not
choose a database, browser store, filesystem, or cloud service. A host supplies an
adapter implementing:

- `read(taskId)` → serialized checkpoint or `null`.
- `compareAndSwap(taskId, expectedRevision, serialized)` → `true` only when the
  revision matched and the replacement was durably committed atomically.
- Optional `deleteIfRevision(taskId, expectedRevision)` for guarded cleanup.

Use `createCheckpointRepository(adapter)` from `src/checkpoint-repository.js`.
Writes must advance exactly one revision and use compare-and-swap to prevent stale
workers from overwriting newer state. The repository validates the serialized
checkpoint on every read and verifies that the storage key matches the embedded task
identity.

## Recovery boundary

- `ready` → `resume`: the host may re-enter planning from the persisted observation.
- `execution-started` → `reconcile-required`: inspect the real environment and resolve
  the pending action using its idempotency key. Hermit never automatically replays it.
- `completed`, `failed`, `cancelled` → `terminal`.

The repository does not itself resume a task, invoke capabilities, encrypt data, define
retention, or provide a production storage engine. Atomicity and durability are adapter
responsibilities and must be verified for each host. The included in-memory adapter is
a deterministic test fixture, not durable storage.

## Execution-loop integration

`HermitRuntime.executeLoop` accepts an optional `checkpointRepository` and stable `taskId`. Supply both together. For a new task, the loop refuses to overwrite an existing checkpoint, records the initial observation as `ready`, writes an `execution-started` checkpoint after policy/approval succeeds but immediately before capability invocation, and returns to `ready` only after the host verifies the result. A verified completion is persisted as `completed`.

If invocation or verification is interrupted after the `execution-started` write, the checkpoint remains `reconcile-required`; the loop does not retry the action. If policy denies the action, invocation is never reached and the last checkpoint remains `ready`. A failed persistence write prevents the consequential invocation.

This integration provides durable boundary writes only when the supplied host adapter actually satisfies the atomic durability contract. It does not yet implement automatic resume, recovery reconciliation, a production adapter, encryption or retention policy.

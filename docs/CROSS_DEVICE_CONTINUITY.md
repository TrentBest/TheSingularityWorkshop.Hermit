# Cross-device Hermit continuity

> One companion, many shells. Hermit's identity and durable progress follow the user; authority and device presence remain local to each host.

This document specifies the next portability boundary. It is an architecture contract, not a claim that remote synchronization, account authentication, browser persistence, or AnyApp integration already exists.

## Experience goal

A user can begin a conversation or task with Hermit in a phone browser, close that browser, open AnyApp on a desktop, and continue with the same companion and its verified progress. A later device-specific AnyApp is another shell, not another independently initialized Hermit.

The user should not need to export a transcript, manually copy task state, or explain the same project context again merely because the active device changed.

## Separate identity, state, presence, and authority

These concerns must not be collapsed into one device profile:

| Concern | Scope | Owner |
|---|---|---|
| Hermit identity | Stable across devices for one owner | Account/identity service, mediated by the host |
| Durable companion state | Shared, versioned and provenance-aware | Authoritative continuity service and its storage |
| Task checkpoints | Per task, portable and recoverable | Checkpoint repository contract; host supplies durable adapter |
| Conversation/session view | May be resumed or opened independently | Client shell and continuity service |
| Device presence | Per browser/app installation | That device's host adapter |
| Capability grants | Per device, session, capability and expiry | Host policy; never copied as ambient authority |
| Secrets and credentials | Host/service-specific | Host-owned secret provider; never synchronized as ordinary memory |

A device identifier is not a user identity. A session token is not a capability grant. A synchronized memory record is not permission to act on the device that receives it.

## Target topology

```text
Phone browser ── Web shell ───────┐
                                  │
Desktop AnyApp ─ Desktop shell ───┼── Authenticated continuity API
                                  │        │
Future mobile app ─ Mobile shell ┘        ├── Hermit identity
                                           ├── Versioned companion state
                                           ├── Conversation/task index
                                           ├── Checkpoint repository
                                           └── Change feed / sync cursor
                                                    │
                                           Durable storage

Each shell separately supplies:
  local context + device identity + capabilities + policy + approvals
                         │
                         v
                    Hermit runtime
```

The continuity service is the shared state authority, not a remote-control tunnel into every connected device. A desktop shell may expose desktop-only capabilities while it is active and authorized; a phone shell cannot inherit them merely by sharing the same Hermit identity.

## State model and synchronization

Shared state should be explicit, typed and versioned rather than one opaque serialized Hermit object.

1. **Identity and ownership:** stable owner and Hermit identifiers, with explicit account recovery and device enrollment.
2. **Companion profile:** user-approved preferences and durable facts, each with provenance, scope, timestamps, schema version and retention/deletion semantics.
3. **Conversation history:** append-oriented messages/events with stable IDs and ordering metadata. A client can request a bounded history window rather than downloading everything.
4. **Task progress:** versioned checkpoints, verified outcomes, pending-action identity and task status. The existing checkpoint contract is a useful foundation, but its repository adapter must provide real atomic durable storage.
5. **Change feed:** monotonically advancing server cursor for changes since the last successful sync. Clients apply changes idempotently and persist the cursor only after applying the corresponding page.
6. **Device-local state:** UI layout, local cache, temporary drafts and device-specific capabilities remain local unless explicitly promoted to shared state.

Every synchronized record needs an owner, record ID, schema version, revision, update metadata and provenance. Avoid relying on wall-clock timestamps alone to resolve concurrency.

### Conflict policy

- Server-assigned revisions and conditional writes detect stale updates.
- Append-only conversation events merge by stable event identity; duplicate delivery is harmless.
- Task checkpoints use compare-and-swap. Conflicting writers reload and reconcile; they do not overwrite newer progress.
- Concurrent edits to the same preference or memory record produce an explicit conflict or a documented deterministic policy. Do not silently use last-write-wins for consequential state.
- A device that returns after a long offline period first downloads current authoritative state, then submits its queued changes with their base revisions. Conflicts remain inspectable.
- Never merge an uncertain in-flight action as if it were verified. Use the checkpoint repository's host-mediated reconciliation against the authoritative environment.

## Device enrollment and trust

- Authenticate the owner through a host-supported sign-in flow; do not invent a second Hermit password system.
- Enroll each app/browser installation as a revocable device presence.
- Issue short-lived, scoped access tokens and rotate them through the identity service.
- Bind each capability grant to the current host, device, session, capability identity/version, resource scope and expiry.
- Re-evaluate policy on the device that will perform the action. Shared identity or task history never grants permission.
- Keep API credentials, refresh tokens, private keys and host secrets out of checkpoints, conversation history, browser storage intended for general content, logs and model context.
- Support device revocation. A revoked device must lose access on its next authenticated request; hosts should also expire local grants promptly.
- Provide explicit user-visible controls for enrolled devices, active sessions, sign-out and revocation.

## Offline behavior

Offline support is useful, but it must be honest about authority.

- Read-only cached history and profile data may remain available subject to local protection and retention rules.
- Draft messages and explicitly offline-safe work may queue locally with stable IDs.
- A local Hermit may plan against a clearly labeled snapshot, but may not claim that remote state is current.
- Consequential capabilities require the relevant host and policy to be online, unless a separately designed offline grant explicitly permits that operation.
- On reconnect, sync changes idempotently, detect revision conflicts and reconcile checkpoints before continuing.
- Never replay an action merely because a queued request was not acknowledged. Its outcome may be uncertain.

## Privacy, retention and deletion

Cross-device continuity increases the impact of account compromise and accidental retention. Define data classes before selecting storage:

- encrypt transport and durable storage;
- isolate owners and authorize every record access server-side;
- minimize what each device caches and protect local caches with platform facilities;
- define export, retention, deletion and account-recovery behavior;
- propagate deletion/tombstone events to enrolled devices and expire stale offline copies within a documented bound;
- preserve provenance and audit for consequential actions without retaining unnecessary sensitive content;
- make shared versus device-local storage visible to the user.

## Suggested contract boundaries

Keep these as separate adapters/contracts rather than coupling the runtime to a particular cloud provider:

- HermitIdentity: stable owner and companion identity.
- DevicePresence: enrolled device identity, host type, last-seen metadata and revocation state.
- ContinuityStore: read records, conditional writes, append events and enumerate changes from a cursor.
- SyncCursor: opaque server-issued position scoped to owner and feed.
- HostGrant: short-lived, narrowly scoped authority local to one host/device/session.
- CheckpointRepository: existing task persistence and compare-and-swap boundary.

These names are design vocabulary, not implemented exported APIs. Do not add a provider-specific dependency to Hermit's deterministic core.

## Implementation sequence

1. **Contract and threat model:** define identity ownership, data classes, record schemas, conflict semantics, device revocation and host-grant boundaries.
2. **Local continuity adapter:** prove stable Hermit identity and versioned state can be loaded across two local shells without a network service.
3. **Server authority:** add authenticated owner-scoped storage, conditional writes, append-only events and a paged change feed. Select infrastructure only after the contract and workload are tested.
4. **Web shell:** make the phone-sized browser experience a real authenticated shell with safe session resume and explicit local/offline status.
5. **AnyApp desktop shell:** enroll the desktop, sync the same companion/task state, and independently register desktop capabilities.
6. **Offline and conflict tests:** simulate duplicate delivery, stale revisions, reconnect, revoked devices, partial sync, process termination and uncertain actions.
7. **Device-specific apps:** add platform shells only after the web and desktop contracts prove portable.

## Verification gates

- Two distinct shells resolve to the same owner and Hermit identity without sharing device credentials.
- A task started on one shell appears on another with verified outcomes and a correct next-step cursor.
- A task interrupted during an action requires authoritative reconciliation before either shell can continue.
- Simultaneous stale writes cannot silently overwrite a newer revision.
- Duplicate change-feed delivery is idempotent; cursor advancement cannot skip unapplied changes.
- A phone cannot invoke a desktop-only capability unless the desktop host separately authorizes it.
- Revocation blocks subsequent sync and capability use.
- Offline drafts are visibly pending; uncertain actions are never blindly replayed.
- Owner isolation, deletion propagation and credential redaction have automated tests.

## Explicitly not implemented yet

The current repository has versioned task checkpoints and a host-supplied atomic compare-and-swap repository contract, plus explicit host-mediated reconciliation. It does not yet provide account identity, device enrollment, a network continuity API, shared memory/conversation storage, sync cursors, offline queues, production encryption, device revocation, a web sign-in flow, or AnyApp integration. The existing in-memory checkpoint adapter is a test fixture, not durable multi-device storage.

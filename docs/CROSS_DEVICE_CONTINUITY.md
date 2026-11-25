# Cross-device Hermit continuity

> One companion, many shells. Hermit's identity and shared progress follow the owner; authority and device presence remain local to each host.

This is an architecture contract plus a deliberately limited in-memory reference proof. It is not a claim that remote synchronization, account authentication, browser persistence, or AnyApp integration exists.

## Local two-shell proof (implemented reference)

`src/continuity-store.js` provides a process-local shared authority for tests and demonstrations:

- stable owner and Hermit identifiers returned to each shell;
- versioned shared companion state with compare-and-swap revisions;
- append-only event identity with duplicate-delivery suppression;
- one shared checkpoint adapter that can be wrapped by the existing checkpoint repository;
- separate shell instances with private capability sets.

The tests create a phone-like web shell and a desktop-like AnyApp shell. They prove that both see the same identity, shared state and task checkpoint, while their capability sets remain distinct. An end-to-end task begins with a verified phone action, resumes on desktop, performs a desktop-only write exactly once, and completes. A separate policy test proves a shell cannot invoke a capability it has not been granted. Stale shared-state writes fail rather than overwriting newer revisions.

**Important limits:** this adapter is volatile process memory. It is not durable, authenticated, encrypted, owner-isolated across tenants, multi-process safe, a browser storage implementation, or a production security boundary. Device enrollment in this fixture is descriptive only. The shell capability set is a testable local boundary, not a substitute for real host policy, approval, secret management or OS permissions.

## Experience goal

A user can begin a conversation or task with Hermit in a phone browser, close that browser, open AnyApp on a desktop, and continue with the same companion and its verified progress. A later device-specific AnyApp is another shell, not another independently initialized Hermit.

The user should not need to export a transcript, manually copy task state, or explain the same project context again merely because the active device changed.

## Separate identity, state, presence, and authority

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

- Read-only cached history and profile data may remain available subject to local protection and retention rules.
- Draft messages and explicitly offline-safe work may queue locally with stable IDs.
- A local Hermit may plan against a clearly labeled snapshot, but may not claim that remote state is current.
- Consequential capabilities require the relevant host and policy to be online, unless a separately designed offline grant explicitly permits that operation.
- On reconnect, sync changes idempotently, detect revision conflicts and reconcile checkpoints before continuing.
- Never replay an action merely because a queued request was not acknowledged. Its outcome may be uncertain.

## Privacy, retention and deletion

- Encrypt transport and durable storage.
- Isolate owners and authorize every record access server-side.
- Minimize device caches and protect them with platform facilities.
- Define export, retention, deletion and account-recovery behavior.
- Propagate deletion/tombstone events to enrolled devices and expire stale offline copies within a documented bound.
- Preserve provenance and audit for consequential actions without retaining unnecessary sensitive content.
- Make shared versus device-local storage visible to the user.

## Suggested contract boundaries

Keep these as separate adapters/contracts rather than coupling the runtime to a particular cloud provider:

- HermitIdentity: stable owner and companion identity.
- DevicePresence: enrolled device identity, host type, last-seen metadata and revocation state.
- ContinuityStore: read records, conditional writes, append events and enumerate changes from a cursor.
- SyncCursor: opaque server-issued position scoped to owner and feed.
- HostGrant: short-lived, narrowly scoped authority local to one host/device/session.
- CheckpointRepository: existing task persistence and compare-and-swap boundary.

The names above are design vocabulary, not all implemented exported APIs. The local reference adapter is intentionally smaller and provider-neutral.

## Remaining implementation sequence

1. Define authenticated owner identity, data classes, device revocation and host-grant boundaries.
2. Replace the volatile reference store with owner-scoped durable storage and process-safe atomic conditional writes.
3. Add append-only conversation events and a paged change feed with durable sync cursors.
4. Integrate a real authenticated phone-sized web shell with explicit online/offline status.
5. Integrate AnyApp desktop as another shell with independent capability registration.
6. Test offline queues, duplicate delivery, stale revisions, reconnect, revocation, partial sync, process termination and uncertain actions.
7. Add device-specific apps after web and desktop contracts prove portable.

## Verification gates

- Two distinct shells resolve to the same owner and Hermit identity without sharing device credentials.
- A task started on one shell appears on another with verified outcomes and a correct next-step cursor; the receiving shell can perform its own separately authorized action.
- A task interrupted during an action requires authoritative reconciliation before either shell can continue.
- Simultaneous stale writes cannot silently overwrite a newer revision.
- Duplicate change-feed delivery is idempotent; cursor advancement cannot skip unapplied changes.
- A phone cannot invoke a desktop-only capability unless the desktop host separately authorizes it.
- Revocation blocks subsequent sync and capability use.
- Offline drafts are visibly pending; uncertain actions are never blindly replayed.
- Owner isolation, deletion propagation and credential redaction have automated tests.

## Explicitly not implemented yet

There is now a process-local two-shell reference adapter and automated tests for shared identity/state/events/checkpoints plus capability isolation and stale-write rejection. The repository still does not provide account identity, device enrollment or revocation, a network continuity API, durable shared memory/conversation storage, sync cursors, offline queues, production encryption, a web sign-in flow, or AnyApp integration. The in-memory adapter is a deterministic test/demo fixture, not durable multi-device storage.

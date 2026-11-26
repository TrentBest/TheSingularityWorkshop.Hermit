# Physical environment adapter contract

**Status: implemented as a provider-neutral boundary; no Physics engine is integrated.**

Hermit owns intent, planning, and the interpretation of observations. The environment owner owns physical truth. This adapter is the seam between them; it does not calculate collision, mass, reachability, contact, force, or motion.

## Contract

- createPhysicalActionRequest validates a versioned, immutable proposal containing actor, action, target, parameters, environment identity, and expected observation revision.
- createPhysicalEnvironmentAdapter accepts owner-supplied observe and execute callbacks. The production host injects the real environment implementation.
- Before dispatch, the adapter reads a fresh observation and rejects a mismatched environment or stale expected revision.
- The owner callback returns achieved, rejected, or interrupted, plus its authoritative post-action observation and optional scalar evidence.
- An achieved result is verified only when the returned observation belongs to the same environment and has a strictly newer revision. A claimed achievement without a newer observation is downgraded to unverified.
- Regressing observations and environment identity changes fail closed.

The host must authorize the proposal before calling perform(), preferably through the existing host-owned capability dispatcher. The adapter itself is not an authorization service. Approval, cancellation, lifecycle interruption, and trusted handler registration remain host responsibilities.

## Deliberate non-goals

This contract does not implement a physics engine, simulate a fixture outcome, infer affordances, or grant Hermit a capability. A test fixture can exercise the protocol, but only an owner-supplied Physics implementation can provide physical evidence. Gestures remains the owner of posture, pose, motion procedures, and motion evaluation; this contract does not replace that domain.

See PHYSICAL_ENVIRONMENT.md for the experience direction and ROADMAP.md for remaining integration work.

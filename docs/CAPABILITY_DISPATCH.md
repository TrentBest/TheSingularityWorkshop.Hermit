# Host capability dispatch

The capability catalog describes what a shell can present. The dispatcher is the next, deliberately narrow boundary between that declaration and trusted host code.

## Contract

`src/capability-dispatcher.js` exports `createCapabilityDispatcher({ catalog, shell, handlers, authorize, requestApproval })`.

- The catalog is validated and snapshotted when the dispatcher is created.
- The shell is fixed for the dispatcher's lifetime; capabilities from other shells are unsupported.
- `handlers` is a host-owned plain object of functions. Catalog data never supplies executable code.
- Every invocation validates its input and calls the required host `authorize` callback before any handler can run.
- A denied, malformed, or throwing policy decision fails closed.
- Approval is required if either the catalog declares it or host policy independently requires it. Catalog metadata can increase friction but cannot weaken host policy.
- The approval callback must resolve to the literal boolean `true`; truthy objects or strings are not approval.
- After a human approval wait, host authorization is checked again immediately before handler dispatch. A revoked grant or changed policy therefore stops the action.
- Only after authorization and any required approval does the dispatcher invoke the host-owned handler.
- Inputs are detached, frozen snapshots. Caller-supplied context and permission objects are not accepted as authority inputs.
- Handler results are detached, recursively frozen JSON-data snapshots with structural and 16 KiB serialized-size limits; accessors, symbols, cycles, non-finite numbers, unsupported objects, and oversized results fail closed.

The invocation result uses bounded statuses: `unsupported`, `invalid-input`, `unavailable`, `denied`, `approval-required`, `approval-denied`, `completed`, or `failed`. Host policy and handler exceptions are not copied into user-facing error messages.

## What this does not do

This is a provider-neutral dispatch primitive, not a complete security system. The host callbacks must authenticate the active principal, resolve current environment context from trusted host state, enforce grants and policy, present meaningful approval details, and verify consequential outcomes. An approval callback must be tied to the exact capability and validated input it receives; it must not approve a different or subsequently modified action. The post-approval policy recheck closes the authorization-revocation window, but the host handler must still revalidate rapidly changing domain invariants. The host handler must still enforce domain invariants and verify the actual environment.

The dispatcher does not connect the browser voice demo or Pages playground to live execution. It is covered by focused unit tests, while production host integration, authenticated identity, durable audit, and post-action environment verification remain separate work.

## Tests

Run `npm test`. `tests/capability-dispatcher.test.mjs` covers authorization ordering, policy denial and malformed decisions, catalog-versus-policy approval requirements, strict approval results, invalid input, missing adapters, handler failures, and trusted handler registry validation.

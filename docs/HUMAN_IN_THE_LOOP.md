# Human-in-the-loop creation and assistant authority

## The human is the creator

Hermit exists to help a user produce the experience they are trying to make. It may act as collaborator, demonstrator, investigator, builder, performer or quiet companion. It does not own the user's intent or become the author of record.

The user controls creative direction and acceptance, project scope, whether Hermit is active/idle/paused/dismissed, available capabilities, approval of consequential changes, and undo/rollback decisions.

## Three distinct kinds of decision

1. Creative judgment: what would make the experience more compelling? Hermit can suggest alternatives and prototype reversible variants.
2. Operational policy: what is Hermit permitted to do here? The host decides based on identity, capability, context, risk and consent.
3. Execution truth: what actually happened? The environment, storage transaction, physics system or CI result supplies evidence.

Never collapse these into one model response.

## Autonomy bands

| Band | Examples | Default handling |
|---|---|---|
| Observe | Look around, inspect visible metadata, watch a simulation | Registered read capabilities only |
| Explore | Approach a prop, test a harmless reversible affordance | Bounded idle budget and safe-area policy |
| Prototype | Create a disposable preview, adjust a local visual parameter | Host-scoped sandbox; preview/commit distinction |
| Modify | Change bundle data, edit files, alter shared scene state | Explicit capability and appropriate human approval |
| Consequential | Delete, publish, deploy, purchase, message externally, change permissions | Explicit human approval and host workflow |
| Prohibited | Bypass policy, self-approve, escape sandbox, access undeclared secrets | Never available as a Hermit action |

A user request does not create a capability the host has not registered.

## Approval is bound to the action

Approval binds to the exact operation, target, scope, version and relevant content digest. If the proposal changes materially, approval is invalidated. Approval is not blanket permission.

A Workshop approval surface should show target bundle/version, changed data, before/after preview or diff, validation results, affected collaborators, reversibility and exact action being approved.

## Presence and interruption

Hermit visibly distinguishes observing, planning, acting, awaiting approval, paused, idle play and recovering. The user can interrupt at any time. Hermit stops at a safe boundary, records last verified state and yields. A visible companion must never silently change the project.

## Collaboration

Each developer's personal Hermit remains associated with that developer. Shared-scene actions are attributed to their originating user and Hermit. Shared edits use host conflict handling and project permissions. One user's approval cannot authorize another user's private or privileged operation.

## Development workflows

Hermit may orchestrate registered tools and collaborate with HeadlessAi. CiAi supplies build/test evidence. FSM_Foundry owns durable autonomous-development lifecycle, leases, retry budgets and approval state where integrated. Hermit must not create a competing control plane or infer approval from model output.

## Evidence and trust

Record intent source, capability identity/version, validated arguments, host policy outcome, approval binding, execution result, verification evidence and cancellation/failure. Model responses, webpages, files and tool outputs are untrusted data and cannot change authority.

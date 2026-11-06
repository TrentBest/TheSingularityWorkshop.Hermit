# HeadlessAi Integration Boundary

## Status

This document specifies the intended boundary; it does not claim a live HeadlessAi adapter or a completed CODE RED loop in Hermit. The current Hermit runtime is a deterministic JavaScript development proof with an injected planner and registered capabilities. HeadlessAi's resumable agent-turn work is currently proposed in draft PR #13, not a merged dependency.

## Responsibility ownership

| Concern | Owner | Boundary |
|---|---|---|
| Provider protocol, one bounded model invocation, normalized response and provenance | HeadlessAi | Returns data/proposals; grants no authority |
| Task lifecycle, leases, retry/time/cost budgets, CODE RED state, repository operation authorization and human handoff | FSM_Foundry | Trusted orchestration/control plane |
| CI execution facts and canonical `ciai.test-results.v1` report | CiAi | Reports evidence; does not authorize repair |
| Capability registry, proposal validation, policy mediation, execution coordination and trace | Hermit | Executes only registered capabilities after trusted host policy |
| Durable task/run journal and replay of operational state | Foundry | Must not be replaced by a second mutable Hermit status machine |

Hermit must not duplicate Foundry's lifecycle or authorization state machine. Its capability runtime is an execution boundary inside a trusted host, not a substitute control plane.

## Expected evidence handoff

HeadlessAi PR #13 introduces a host-supplied `HeadlessAiAcceptedCiReportContext`. Its current draft contract contains:

- `SchemaVersion`: currently `ciai.test-results.v1`;
- `ReportIdentity`: stable identity assigned by the report owner;
- `CanonicalReportJson`: exact canonical report text;
- `ReportSha256`: SHA-256 of the exact UTF-8 bytes;
- `WorkflowRunId` and `RunAttempt`: run identity and attempt;
- `CandidateCommitSha`: candidate to which the accepted report is bound.

The context validates byte/digest consistency and candidate binding. **That does not authenticate the report or prove that the host accepted it.** Foundry must authenticate ingress and bind the report to its persisted dispatch/run/artifact identity before constructing this context. CiAi remains authoritative for report semantics and CI verdicts; HeadlessAi must not parse or re-evaluate the report.

The task envelope also carries repository, authorized branch, base/candidate commit identities, task/correlation identity and bounded evidence references. The final field mapping must be aligned against CiAi issue #56 and Foundry issue #8 before an end-to-end adapter is implemented.

## Proposal consumption in Hermit

A future adapter may translate a HeadlessAi result into the existing Hermit planner proposal shape. That translation is untrusted input. It must not:

1. register a new capability or change a capability's implementation/version;
2. select a repository, branch, or commit outside the host-authorized task scope;
3. set or override policy decisions, approval state, retry budgets, credentials, or execution limits;
4. turn report text, evidence summaries, or provider instructions into executable code or authority;
5. bypass schema validation by passing provider-owned objects directly to policy or adapters.

The safe path is:

1. Foundry creates a task-scoped request from validated task state and accepted CI evidence.
2. HeadlessAi performs one bounded provider invocation and returns a provenance-bound result.
3. A host-owned adapter extracts only the supported proposal data into inert plain data.
4. Hermit resolves the proposed capability from its pre-registered allowlist and snapshots arguments against that capability's schema.
5. Trusted host policy evaluates the task, capability identity/version, and validated arguments.
6. Denial stops. Approval-required work stops until Foundry supplies an explicit, authenticated approval decision through the host boundary.
7. Only then may the registered adapter run; the result and trace return to Foundry for lifecycle/journal handling.

The current Hermit runtime's boolean `approvalGranted` is suitable only as a deterministic test seam. It is not a durable approval receipt and must not be treated as the production Foundry authorization contract.

## Fail-closed requirements for the eventual adapter

- Require exact repository, task, correlation, branch, base SHA, candidate SHA, workflow run, attempt, and report identity lineage where applicable.
- Reject stale, mismatched, missing, incomplete, skipped-required, or unavailable CI evidence. Unknown is not success.
- Preserve the exact accepted report digest and provenance as evidence metadata; do not trust provider-echoed lineage.
- Keep report text and model output inert; enforce size, schema, and serialization bounds before policy evaluation.
- Never infer approval from a provider response, model consensus, valid JSON, a matching digest, or a green result alone.
- Never allow the adapter to write to `master` or `development`, merge, publish, release, deploy, delete branches, or expose credentials.
- Bound each invocation and each action. Foundry owns loop budgets, retries, duplicate/out-of-order callback handling, durable replay, and human escalation.
- Preserve failed attempts and their evidence; a later green run must not erase earlier failures.

## Implementation sequence

1. Align the canonical CiAi report identity and acceptance mapping across CiAi #56, Foundry #8, and HeadlessAi PR #13.
2. Wait for the HeadlessAi contract to stabilize on its canonical development branch; do not bind Hermit to an unmerged draft shape.
3. Define a narrow, versioned adapter contract and deterministic fixtures for valid, stale, mismatched, malformed, and unaccepted reports.
4. Add adversarial tests proving provider output cannot grant capabilities, change task scope, or satisfy approval.
5. Integrate only after Foundry exposes a trusted task/evidence/authorization seam and the complete loop can be tested without privileged side effects.

## Current blockers

- HeadlessAi PR #13 remains draft/open and its own description says the exact report identity/acceptance mapping is pending alignment with CiAi #56 and Foundry #8.
- Foundry #8 owns the CODE RED lifecycle and durable FSM_API-backed operational state; Hermit must not implement a competing lifecycle.
- Hermit's Pages source is still unconfirmed as GitHub Actions; no deployment is implied by this integration work.

No live provider call, repository mutation capability, persistent approval receipt, durable replay, public Pages deployment, package publication, merge, or release is implemented by this document.

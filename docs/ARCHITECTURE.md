# Hermit Architecture and Boundaries

> Hermit is an environment-resident assistant runtime. The host supplies a shell; Hermit coordinates intelligence and permitted work within it.

This document separates target architecture from implemented behavior. A proposed integration is not evidence of a working integration.

## 1. Assistant plus shell

A shell is not merely a visual skin. It adapts a real environment to Hermit's neutral contracts.

The host supplies:
- stable environment and user/session identity;
- relevant context and lifecycle signals;
- registered capabilities and invocation adapters;
- policy decisions and approval interaction;
- presentation, cancellation and audit destinations;
- optional memory services.

Potential shells include AnyApp, a browser host, ServerApp, a developer workspace and eventually a VR client. Hermit's core should not know whether a capability ultimately reads a repository, manipulates a GUI, queries a service or changes an in-memory object.

## 2. Existing responsibility boundaries

| Concern | Existing owner / candidate | Hermit's responsibility |
|---|---|---|
| Model/provider HTTP invocation | HeadlessAi | Supply bounded task context; interpret returned proposals |
| State and processing lifecycle | FSM_API | Coordinate task lifecycle without recreating the FSM |
| Capability composition | FSM_COS | Consume composed runtime; do not duplicate dependency resolution |
| Capability domain contract | MicroBundleDomain | Reuse if sufficient; otherwise define a narrow adapter |
| REST description and transport | FSM_REST | Provide remote capability adapters |
| Semantic identity | ProtocolAi | Resolve application-owned names and symbols |
| Structural constraints | GrammarAi | Validate supported structures, not truth or authorization |
| Presentation | GUI and host adapters | Present conversation, progress, approvals and inspection |
| Persistence | DataWarehouse / host storage | Evaluate against actual memory workload |
| Build verification | CiAi | Verify Hermit and dependency health |

HeadlessAi deliberately leaves planning, memory, permissions, tool mediation and consequential actions to its host. Hermit is a natural orchestration owner for these concerns. HeadlessAi should remain independently useful.

FSM_COS composes a runtime and returns an assembly; it does not own the host's application loop, scheduling, GUI or presentation.

## 3. Proposed contracts

Names here are conceptual until compared with existing Workshop contracts and implemented with tests.

### Environment shell

The shell exposes identity, environment context, capability registrations, policy, user interaction, cancellation/lifecycle, and optional memory/audit services. Ambient process privileges must never substitute for explicit capability registration.

### Capability descriptor

A capability should describe:
- stable identity and version;
- human-readable purpose;
- input and output schemas;
- required permissions and risk classification;
- side-effect classification;
- timeout and resource bounds;
- approval requirements;
- registered invocation adapter.

A descriptor is metadata, not executable authority.

### Proposal versus execution

1. Model/planner proposes an action.
2. Hermit resolves it to a registered capability.
3. Hermit validates identity, arguments, schema and bounds.
4. Host policy evaluates current authority and risk.
5. Host obtains explicit approval when required.
6. Registered adapter executes the operation.
7. Hermit records result, evidence and side effects.

Never execute arbitrary model-generated shell commands, scripts, URLs, paths or code merely because the model returned them. Unknown capabilities fail closed. Destructive or externally consequential operations require host-mediated approval.

### Task lifecycle

A task needs observable states such as created, gathering context, planning, awaiting approval, executing, verifying, completed, failed and cancelled. FSM_API is a strong candidate for representing this lifecycle. Define transitions, invariants, cancellation and bounds before selecting implementation details.

### Memory

Memory is not simply a transcript or vector database. Separate:
- current task context;
- session/conversation history;
- durable user-approved preferences;
- environment/project knowledge;
- execution records and evidence.

Every category needs an owner, scope, retention policy, provenance, access policy and deletion behavior. Model-generated statements must not silently become durable facts. DataWarehouse is a candidate to investigate, not an assumed solution.

## 4. Trust and security

- **No ambient authority:** model output cannot inherit the host process's full permissions.
- **Least privilege:** expose narrow capabilities, not unrestricted access.
- **Explicit registration:** unknown tools and identities fail closed.
- **Validation:** validate inputs and outputs at deterministic boundaries.
- **Approval:** consequential actions require an appropriate approval policy.
- **Secret isolation:** credentials stay in host-owned secret providers, never prompts, transcripts or logs.
- **Resource limits:** bound requests, response sizes, concurrency, execution time, planning rounds and storage.
- **Auditability:** record requester, capability/version, policy outcome, approval evidence, result and failure.
- **Cancellation:** propagate cancellation across inference, planning and execution.
- **Untrusted content:** files, webpages, tool output and model responses are data, not instructions that override policy.

## 5. Integration map

```text
Hermit.Core
   |
   +-- inference adapter -------- HeadlessAi
   +-- task lifecycle adapter --- FSM_API
   +-- composition adapter ----- FSM_COS
   +-- capability adapters ----- MicroBundleDomain / FSM_REST
   +-- semantic adapters ------- ProtocolAi / GrammarAi
   +-- host shell --------------- AnyApp / Web host / ServerApp
   +-- presentation adapter ----- GUI
   +-- memory adapter ----------- selected storage
```

This is a dependency map to test, not a mandate that every arrow becomes a project reference. Keep package boundaries acyclic and avoid pulling GUI, storage or provider dependencies into the core.

## 6. First runnable proof

Use deterministic fake inference and a fake environment. No paid endpoint, credentials, NuGet publication or destructive action should be required.

1. User asks Hermit to inspect a named item in a fake environment.
2. Shell exposes a read-only `inspect-item` capability.
3. Fake inference proposes that capability with structured arguments.
4. Hermit resolves and validates capability and arguments.
5. Policy permits the read-only operation.
6. Fake adapter returns a known result.
7. Hermit responds with the answer and an execution trace.

Negative tests: unknown capability, malformed arguments, denied permission, missing approval, timeout, cancellation, oversized output, adapter failure, and untrusted tool output attempting to alter policy.

Only after this proof should a real HeadlessAi adapter and a real host shell be added.

## 7. Verification requirements

| Area | Minimum evidence |
|---|---|
| Core contracts | Unit tests for identity, schemas, transitions and invalid inputs |
| Planning | Deterministic fake planner; bounded rounds; no unbounded recursion |
| Capability registry | Duplicate identity/version handling; unknown capability rejection |
| Policy | Allow/deny/approval tests; no model-argument bypass |
| Execution | Cancellation, timeout, concurrency and output bounds |
| Memory | Scope isolation, provenance, retention and deletion |
| Audit | Complete traces for success, denial and failure |
| Adapters | Contract tests against fake implementations |
| Host shell | End-to-end proof of actual environment interaction |
| Performance | Baselines for planning overhead, allocations and dispatch |
| Supply chain | Dependency/build verification through CiAi where supported |

A green build is not proof of correct authorization. A successful inference request is not proof of a functioning assistant.

## 8. Staged roadmap

### Stage 0 — reconnaissance and contracts
- Inventory relevant source, tests, workflows, dependency versions and branch health.
- Compare MicroBundle and GUI contracts against shell and capability needs.
- Select the first host and smallest end-to-end use case.
- Record gaps before adding overlapping abstractions.

### Stage 1 — deterministic assistant core
- Task lifecycle and cancellation.
- Capability registry and descriptors.
- Structured action proposal and validation.
- Policy decision interface.
- Fake inference and fake environment adapters.
- End-to-end test and trace.

### Stage 2 — safe tool interaction
- Read-only capabilities.
- Approval-gated side effects.
- Bounded execution, timeouts and audit.
- Host-visible progress and blocked-state reporting.

### Stage 3 — memory and persistence
- Define memory categories, provenance and retention.
- Benchmark actual query/write patterns.
- Select host storage or a Workshop adapter based on evidence.

### Stage 4 — first shell
- Choose the host that exposes a useful, testable environment with least new infrastructure.
- Demonstrate discovery, inspection, action, verification and reporting.
- Add other shells only after the contracts prove portable.

### Stage 5 — portable ecosystem
- Add shells and capability providers.
- Integrate CiAi dependency/build evidence.
- Publish only after explicit authorization.

## 9. Repository discipline

- Only `master` and `development` branches.
- Active work and local project references on `development`.
- NuGet publication only at an explicitly authorized gate.
- No accidental package publishing from CI.
- Keep implementation, tests, theory, usage docs and status aligned.
- Mark claims implemented, tested, specified, planned or externally owned.
- Prefer a working vertical slice over unverified abstractions.

## 10. Decisions to resolve through evidence

1. Which first shell is best: AnyApp, WebApp/WebPage or ServerApp?
2. Does MicroBundleDomain already provide enough lifecycle and invocation semantics for tools?
3. What is the smallest useful read-only capability for the first end-to-end test?
4. Which memory workloads require DataWarehouse, and which remain host-owned?
5. What is shared across shells, and what remains local to each host?
6. How should multiple Hermit instances coordinate without sharing authority or private context?

## 11. Implemented deterministic runtime slice (development)

The first executable slice lives in `src/hermit-runtime.js` and is intentionally independent of the Pages neural-network lesson.

Implemented in this slice:
- an explicit capability registry with stable identity, version, input contract and registered adapter;
- deterministic planner injection (the sample planner is fake and local);
- bounded structured argument validation, including rejection of undeclared fields;
- host-supplied `allow`, `deny` or `approval-required` policy decisions;
- approval gating before invocation;
- cancellation and an overall execution timeout;
- bounded JSON-serializable capability output;
- success/failure traces containing capability identity/version and policy outcome;
- a fake in-memory `inspect-item` example and automated Node tests.

Not implemented by this slice:
- a real HeadlessAi/model-provider adapter or model-driven planning;
- multi-round planning, task persistence or durable memory;
- a real AnyApp/WebApp/server shell or external capability adapter;
- a full JSON Schema implementation, concurrent scheduling or production-grade audit storage;
- verified integration with FSM_API, FSM_COS, MicroBundleDomain or GUI.

The current schema validator deliberately supports only object, string, finite number and boolean fields. Expand it only alongside explicit contract tests. The runtime is a development proof, not a production security boundary: host policy and approval must remain in trusted host code, and any real adapter must independently enforce its own resource and authority limits.

Verification command: `npm test`. Example: `node examples/deterministic-inspection.mjs`. CI runs the Node test suite on pushes and pull requests targeting `development`.

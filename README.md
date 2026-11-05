<!-- The Singularity Workshop animated moniker -->
<p align="center"><a href="https://github.com/TrentBest"><img src="https://raw.githubusercontent.com/TrentBest/TheSingularityWorkshop.Visualize/development/docs/assets/moniker.svg" alt="The Singularity Workshop animated moniker" width="720" /></a></p>

# Hermit — Environment-Resident AI Assistant Infrastructure

[![Sith Policy](assets/sith-policy.svg)](https://github.com/TrentBest/TheSingularityWorkshop.Hermit/actions/workflows/sith-policy.yml)
**An assistant should not be confined to a chat window. It should enter an environment, understand the capabilities that environment exposes, and work there under the environment's rules.**

Like a hermit crab adopting a shell, Hermit is designed to inhabit different hosts without rewriting its intelligence, orchestration or capability model for each one.

The goal is a portable assistant runtime that can inhabit a desktop application, browser, server, developer workspace or another supported environment. Each host supplies a shell: presentation, identity, context, capabilities, lifecycle and policy. Hermit coordinates the assistant experience within that shell.

> **The environment owns its authority. Hermit discovers and uses capabilities; it does not acquire permission merely because a model suggested an action.**

## What Hermit owns

- Task orchestration, planning and bounded reasoning.
- Discovery and selection of environment capabilities.
- Model invocation through provider-neutral adapters.
- Deterministic validation of proposed actions.
- Policy checks, approval workflows and controlled execution.
- Memory coordination, provenance, retention and audit.
- Progress, evidence, cancellation and failure reporting.

Hermit is not another LLM provider client, GUI framework, runtime composition kernel or unrestricted model-to-shell bridge.

## Where it fits

```text
User / event
    |
    v
Environment shell (desktop / web / server / IDE / ...)
    | identity, context, capabilities, policy
    v
  HERMIT
  +---------------------------+
  | Task orchestration        |
  | Planning and routing      |
  | Capability discovery      |
  | Memory coordination       |
  | Policy and approval       |
  | Action execution          |
  | Evidence and audit        |
  +---------------------------+
       |       |        |
       v       v        v
   HeadlessAi FSM_API MicroBundles
       |       |        |
       +-------+--------+
               |
       Environment adapters
               |
         Actual environment
```

This is a target architecture, not a claim that these integrations are already implemented. See [Architecture and Boundaries](docs/ARCHITECTURE.md).

## Workshop building blocks

| Project | Existing responsibility | Hermit's relationship |
|---|---|---|
| [HeadlessAi](https://github.com/TrentBest/TheSingularityWorkshop.HeadlessAi) | Provider-neutral AI endpoint invocation | Inference transport; host retains planning and authority |
| [FSM_API](https://github.com/TrentBest/FSM_API) | State and processing lifecycle | Task and workflow lifecycle |
| [FSM_COS](https://github.com/TrentBest/TheSingularityWorkshop.FSM_COS) | Runtime composition | Assemble requested capabilities, not run the assistant loop |
| [MicroBundleDomain](https://github.com/TrentBest/TheSingularityWorkshop.MicroBundleDomain) | Neutral capability contract | Candidate capability packaging and discovery |
| [FSM_REST](https://github.com/TrentBest/TheSingularityWorkshop.FSM_REST) | REST capability and transport substrate | Remote environment adapters |
| [ProtocolAi](https://github.com/TrentBest/TheSingularityWorkshop.ProtocolAi) | Deterministic semantic identity | Resolve application-owned concepts |
| [GrammarAi](https://github.com/TrentBest/TheSingularityWorkshop.GrammarAi) | Deterministic structural constraints | Validate supported semantic structures |
| [GUI](https://github.com/TrentBest/TheSingularityWorkshop.GUI) | Semantic interface model and manifestations | Conversation, progress, approval and inspection surfaces |
| [DataWarehouse](https://github.com/TrentBest/TheSingularityWorkshop.DataWarehouse) | Data infrastructure | Storage candidate to evaluate against actual memory workloads |
| [CiAi](https://github.com/TrentBest/TheSingularityWorkshop.CiAi) | Build and verification automation | Validate Hermit and dependency health |

These are integration candidates, not mandatory dependencies. Keep Hermit's core independently testable and depend only on narrow contracts.

## First milestones

The public learning experience and the assistant-runtime proof are parallel tracks:

- **Public learning track:** [Build Hermit's first GitHub Pages learning experience](https://github.com/TrentBest/TheSingularityWorkshop.Hermit/issues/3). Begin with a fixed 2-input / 2-output inference lesson whose living SVG is driven by the actual calculation.
- **Runtime track:** [Build the first deterministic Hermit assistant vertical slice](https://github.com/TrentBest/TheSingularityWorkshop.Hermit/issues/1), using fake inference and a fake environment.

The broader runtime progression is:

1. Reconnaissance and contract comparison.
2. Deterministic assistant loop using fake inference and a fake environment.
3. Capability discovery, schema validation and safe execution.
4. Host-controlled permissions, approval, memory and audit.
5. First real Workshop shell.
6. Additional portable shells after the first proves the contracts.

The Pages lesson is a separate educational presentation. It does not imply that neural inference is already integrated into Hermit's assistant runtime.

Every milestone must distinguish implemented, tested, specified and planned functionality. No NuGet publication without explicit authorization.

## Development

The repository follows the Workshop Sith branch policy: `master` and `development` only. Active work and local dependency integration belong on `development`; `master` is the stable line.

Build and test instructions will be added with the first executable project. Hermit is currently an architecture and contract foundation, not a releasable package.

---

<p align="center"><img src="https://raw.githubusercontent.com/TrentBest/FSM_API/master/Documentation/Branding/TheSingularityWorkshop.png" alt="The Singularity Workshop" width="420" /></p>

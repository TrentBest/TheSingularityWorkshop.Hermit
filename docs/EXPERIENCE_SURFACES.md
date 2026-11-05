# Experience surfaces: what the Workshop already demonstrates

**Status: source-checked exploration, 2026-11-05.** This document records what the inspected repositories actually show. It is not a claim that every linked experience was executed in a browser during this review.

## The useful distinction

A GitHub Pages site, a gallery of reproducible evidence, and an executable application are three different things:

- **Pages shell:** a browser-delivered entry point and presentation surface.
- **Evidence gallery:** diagrams, generated artifacts, source links, and reproducible commands that explain and substantiate a capability.
- **Runtime host:** the application that owns state, input, policy, execution, and lifecycle.

Hermit should be able to inhabit different shells without confusing these responsibilities or assuming that a visual page is itself an assistant runtime.

## What the inspected projects demonstrate

| Project | Source-backed experience | What it proves | Important boundary |
|---|---|---|---|
| Learning | First-person Singularity University campus, course doors, semantic movement/inspection/enrollment, browser WebGPU campus rendering | A browser shell can combine a spatial environment, host-owned learning state, semantic input, and a real rendering backend | Enrollment is session-local; no student account or durable progress. WebGPU support is browser/device dependent. |
| Physics | Evidence-led Gallery, experiment pages, generated SVGs and run records, reproducible .NET commands | Scientific experiences can expose model assumptions, actual computed samples, numerical checks, and reproducibility | The Gallery is documentation/evidence, not by itself a deployed interactive simulation. A visualization is only as strong as its stated evidence. |
| Economy | Creator-shop composition proof, test fixture, Gallery recipe, theory and capability-catalog documentation | A shared economic identity can be composed into multiple Experience-owned presentations, with tests defining the exact proof | The inspected Pages workflow builds a Jekyll artifact but explicitly does not deploy it. The gallery proof is a test fixture, not a running storefront or city economy. |
| FSM_COS | Runtime composition Gallery with dependency, preflight, arbitration, and handoff diagrams; minimal consumer | Composition can be explained visually and verified with a runnable consumer | Gallery animations are explanatory, not live telemetry. FSM_COS returns a RuntimeAssembly; the host owns execution and presentation. |

## Deployment and implementation evidence

### Learning: the strongest live-shell precedent

The Learning README links to its Pages entry point:

https://trentbest.github.io/TheSingularityWorkshop.Learning/

Its Pages workflow builds and deploys the site. It checks out Physics, Visualize, WebPage, and FSM_UserIO source; generates a Physics acoustic run record and city/campus maps; builds the Blazor showcase; then publishes the assembled static site. The main page opens the first-person campus and the `/demo/` path hosts the behavior showcase.

The campus implementation is particularly instructive:

- The Blazor host owns campus/course state.
- Browser controls become FSM_UserIO `SemanticIntent` values.
- Visualize's `VisualizerFrame` and `Visualizer.RenderAsync` form the rendering boundary.
- A host-owned WebGPU backend performs indexed mesh drawing with depth testing.
- The site reports WebGPU initialization failure rather than silently pretending another renderer was used.

This is a concrete example of an environment as an interface—not proof that the full Singularity City or University runtime exists.

### Physics: experiments as inspectable evidence

The Physics Gallery points to deterministic celestial mechanics, seeded point sets, Mandelbrot sampling, and experiment records. Its recipes include commands that generate versioned run records and verify serialized samples against in-memory results. The Gallery explicitly distinguishes numerical tests from long-horizon accuracy and data generation from GPU rendering.

This suggests a Hermit pattern: every environment action or generated artifact should have an inspectable explanation and, where practical, a replayable evidence record.

### Economy: identity separate from presentation

The Economy Gallery's creator-shop proof is deliberately a consumer-owned test fixture. It demonstrates one canonical shop identity referenced by two Experience placements with different presentation skins. It does not prove persistent creator projects, a visual editor, a production storefront, inventory, payment execution, or a running city economy.

The inspected `.github/workflows/pages-build.yml` runs Jekyll and uploads a Pages artifact **without deploying it**. Treat Economy's Gallery as source/test evidence for now, not as a verified live Pages experience.

### FSM_COS: composition is not the shell

FSM_COS's Gallery is a collection of explanatory diagrams and recipes. It says explicitly that animated elements are not live runtime telemetry. Its minimal consumer demonstrates dependency-first composition, while its WebPage integration guide says the host owns lifecycle, UI, routing, permissions, execution, and presentation.

That is an important guardrail for Hermit: composing capabilities is not the same as running an assistant or rendering its environment.

## What Hermit can borrow

1. **Multiple shells, one assistant core.** A browser campus, desktop workspace, command line, or service can present the same task and capability contracts.
2. **Environment-owned authority.** The shell supplies identity, context, permissions, approval, and available capabilities. Model output is a proposal, never ambient authority.
3. **Semantic input and inspectable output.** Convert user actions into named intents; show proposed actions, validated arguments, policy decisions, results, and provenance.
4. **Evidence as a first-class artifact.** Keep an execution trace and allow a user to inspect/replay deterministic parts of a task. Do not label a generated illustration as runtime telemetry.
5. **Capability composition without presentation coupling.** Reuse domain capabilities while each Experience owns its own world rules, state, and presentation.
6. **Explicit persistence boundaries.** Distinguish browser-session state, local environment state, durable user-approved memory, and execution evidence.

## Recommended Hermit exploration

Do not start by building a full virtual world or a universal autonomous agent. Start with one deterministic task that can be presented in two shells:

- A minimal browser/workspace shell with a visible environment item.
- A read-only `inspect-item` capability registered by that environment.
- A deterministic fake model that proposes inspection.
- A host policy check and structured execution trace.
- A second, non-visual shell that runs the same task contract.

The first comparison should be whether the same task, capability identity, policy decision, and result survive a change of shell. Only then add model providers, durable memory, editing capabilities, or richer 3D presentation.

## Sources inspected

- [Learning README](https://github.com/TrentBest/TheSingularityWorkshop.Learning/blob/master/README.md)
- [Learning Pages workflow](https://github.com/TrentBest/TheSingularityWorkshop.Learning/blob/master/.github/workflows/pages.yml)
- [Campus WebGPU proof](https://github.com/TrentBest/TheSingularityWorkshop.Learning/blob/master/docs/CAMPUS_GPU_RENDERER.md)
- [Singularity University experience notes](https://github.com/TrentBest/TheSingularityWorkshop.Learning/blob/master/docs/SINGULARITY_UNIVERSITY.md)
- [Physics Gallery](https://github.com/TrentBest/TheSingularityWorkshop.Physics/blob/development/docs/GALLERY.md)
- [Economy Gallery](https://github.com/TrentBest/TheSingularityWorkshop.Economy/blob/development/docs/GALLERY.md)
- [Economy Pages preview workflow](https://github.com/TrentBest/TheSingularityWorkshop.Economy/blob/development/.github/workflows/pages-build.yml)
- [FSM_COS Gallery](https://github.com/TrentBest/TheSingularityWorkshop.FSM_COS/blob/master/docs/GALLERY.md)
- [FSM_COS WebPage integration boundary](https://github.com/TrentBest/TheSingularityWorkshop.FSM_COS/blob/master/docs/WEBPAGE_INTEGRATION.md)

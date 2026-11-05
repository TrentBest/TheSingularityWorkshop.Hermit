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


## New direction: a visual environment builder

The intended experience is not merely a chat panel embedded in a page. The Workshop should provide a **builder surface** where a person can drag available things into a workspace, compose an environment, and then enter or run that environment with Hermit resident inside it.

This introduces two distinct modes:

- **Build mode:** a palette/catalog of available objects, tools, data sources, capabilities, and presentation elements; a composition surface where the user can drag, drop, connect, arrange, and configure them; and an inspector for the selected element's properties and permissions.
- **Environment mode:** the composed environment becomes an explorable/usable space. Hermit is present within it, can discover the environment's registered capabilities, understand the selected context, and assist through the same policy-controlled capability pipeline.

The builder should create a declarative environment description, not execute arbitrary code assembled by drag-and-drop. A placed item is initially a visual/compositional object. It gains operational meaning only when the host binds it to a registered, versioned capability or environment service. Connections should be typed and validated; invalid or unresolved connections remain visible as design-time errors.

### Candidate interaction model

1. Choose an environment template or start with an empty workspace.
2. Drag items from a categorized palette onto the composition surface.
3. Arrange items spatially and connect compatible ports/relationships.
4. Select an item to inspect its description, configuration, data boundaries, permissions, and available actions.
5. Validate the composition and show missing dependencies or policy concerns before activation.
6. Enter the environment. The host instantiates the approved composition and Hermit becomes available as its resident assistant.
7. Select an object or area, ask Hermit about it, and see the capability proposal, approval requirement, action result, and evidence trace.

The first prototype should be deliberately small: a workspace containing a few visible objects, one read-only inspect capability, typed connections, a property inspector, and a Hermit presence panel/avatar. Dragging an object into the environment should make it discoverable to Hermit; selecting it should scope the assistant's context to that object. The fake model and host policy remain deterministic for this first proof.

### Architectural implications

- The **builder** edits a declarative composition; it is not itself the runtime.
- The **environment host** owns instantiation, lifecycle, state, input, authorization, and execution.
- **Hermit** is a resident assistant service/presence within the host, not a privileged owner of the environment.
- The **palette** should be populated from registered descriptors/catalogs, not from arbitrary executable snippets.
- **Visual objects** and **operational capabilities** must remain distinct. A beautiful object with no registered behavior is still valid as presentation; it simply has no actions.
- **Connections** need explicit type/contract compatibility and validation.
- The same composition should eventually be renderable in more than one shell. A browser drag-and-drop builder is one shell; a desktop or spatial shell could present the same environment description differently.

This makes the Learning campus relevant as a spatial presentation precedent, Economy's shop-placement proof relevant to reusable objects and presentation skins, Physics relevant to inspectable properties and evidence, and FSM_COS relevant only where its composition/runtime boundary genuinely fits. None of those projects alone supplies the complete visual builder or Hermit-resident experience; that is the new product direction to prove.

### Open design questions to resolve through prototypes

- Is the initial composition surface a 2D node/workspace editor, a spatial 3D scene, or a 2D builder that can preview a 3D environment?
- Which palette categories are essential for the first slice: objects, capabilities, data, agents, layouts, or connectors?
- Does Hermit appear as a panel, an avatar/character in the scene, or both—with one underlying assistant session?
- Which environment state is ephemeral, locally persisted, or explicitly saved as a project?
- How should users distinguish a visual connection from a live data flow or an authorized action?

These are prototype questions, not assumptions to hard-code into the core assistant contracts.


## Physical environment: the ant-farm direction

The next design refinement is an embodied, physics-backed environment: users place cubes, balls, tools and mechanisms into a small world; Hermit inhabits that world with a deliberately limited armature. Its lift capacity, push force, reach, grip, traction and stability constrain what it can do. A dolly changes the mechanics of moving a heavy load without changing the load's mass. A hamster wheel is a stateful mechanism Hermit can discover and actuate.

This is not intended to be a scripted toy animation. The environment simulation must determine collisions, forces, constraints and outcomes; Hermit proposes actions and adapts to observed results. The builder, environment host, physics engine, Hermit embodiment/planner and renderer have separate responsibilities.

The design and first proposed vertical slice are documented in [The Physical Environment](PHYSICAL_ENVIRONMENT.md). This remains a design specification, not implemented functionality. The initial assistant proof in issue #1 should remain small and deterministic; the physics-backed ant-farm experience is a richer follow-on environment, not a reason to bypass the safe capability and host-policy foundation.

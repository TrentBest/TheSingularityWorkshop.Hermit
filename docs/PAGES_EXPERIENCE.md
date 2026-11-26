# Hermit Pages experience

**Site:** [https://trentbest.github.io/TheSingularityWorkshop.Hermit/](https://trentbest.github.io/TheSingularityWorkshop.Hermit/)

The public Pages site is an executable learning surface for Hermit's boundaries, not a mock chat window. The entry experience introduces a front-facing, expressive Hermit character with a direct typed conversation surface before the technical playground.

## Entry experience

The home page now begins with an introduction to Hermit before asking visitors to interact with the playground. It explains Hermit as a persistent, embodied creative companion and portable assistant runtime; describes the host-provided "shell" model; distinguishes Hermit's planning and capability coordination from the host's authority; and introduces the intended continuity and Mini/Hermit/Titan manifestations.

The introduction also separates the long-term Workshop vision from the current executable proof. The playground is a deterministic local fixture with fake objects and bounded capabilities—not a live model, physical body, or production host integration. The existing neural-network lesson remains a separate educational module below the playground; its inference visualization is not presented as Hermit's planner or body controller.

## Playground composition

The page also includes a three-lane architecture map: intent/planning, capability/trust, and environment/evidence. It labels which behaviors the local fixture demonstrates and which integrations remain future work, so the diagram does not imply that planned adapters are already connected.

| Layer | Responsibility |
|---|---|
| `index.html` | Semantic page structure, accessible controls, environment zones, status, and trace |
| `assets/hermit-playground.js` | Browser interaction, drag/drop selection, rendering, and event presentation |
| `assets/hermit-voice.js` | Browser voice controls, feature detection, transcript display, typed fallback, and intent routing |
| `src/voice.js` | Host-neutral speech adapters, cancellation/error contracts, and fixture intent grammar |
| `src/hermit-playground.js` | Fixture world, capability registration, host policy, and post-action verification |
| `src/world-state.js` | Immutable, versioned environment snapshot contract |
| `src/hermit-runtime.js` | Bounded execution, argument validation, cancellation, approval gate, and auditable trace |
| `tests/hermit-playground.test.mjs` | Runtime-level behavior tests, including world revision progression |
| `tests/world-state.test.mjs` | Versioning, immutability, identity, bounds and hostile-input contract tests |
| `tests/pages-experience.test.mjs` | Page composition and browser wiring tests |

The browser adapter imports the same runtime module exercised by Node tests. Players can add structured primitive props to the local scene: box, sphere, or cylinder, with bounded dimensions, XYZ position and rotation, a declared material, and an explicit affordance list. Insertion validates the candidate full-world snapshot before committing it, advances the revision, and makes the geometry and affordances available to Hermit's existing inspection path. The browser renders a keyboard-selectable top-down SVG scene preview using X/Z placement, primitive silhouettes, and material colors; it exposes the complete authored transform in the selected-object detail. This is a schematic editor view, not a 3D renderer or physics simulation. The playground environment also emits immutable schema-versioned world snapshots (environment identity, revision and bounded object records); this is a fixture-level observation contract, not a complete ontology or physics model. The static Pages artifact therefore includes both `assets/` and the required `src/` modules.

## Available interactions

- Add player-authored box, sphere, or cylinder props with name, description, material, dimensions, position, and rotation; the host validates the complete proposed world snapshot before insertion.
- Select an object by keyboard-operable list button, spatial SVG prop, or drag it to the interaction pad.
- Ask Hermit to inspect newly authored objects through the same registered read-only capability as fixture objects.
- Ask Hermit to inspect it through the registered read-only `inspect-object` capability.
- Request a move to the workbench through `move-object`.
- Explicitly approve a world-changing move; host policy is still evaluated by the runtime.
- Observe the actual environment state after execution and require verification before the loop reports completion.
- Inspect the trace of observation, proposal, policy, execution, and verification events.

Player-authored insertion is a direct creator action, validated against the versioned world-state contract and its object-count, identity, text, primitive, vector, material, and affordance bounds. It advances the environment revision. This is separate from Hermit authority. The schema is now version 2 and keeps primitive geometry as data; it does not load arbitrary meshes, scripts, shaders, or external assets. The affordance list is descriptive capability metadata, not an authorization grant. Host policy still decides whether a registered operation may run. No collision, mass, reachability, balance, or physical outcome is simulated by this fixture.

Dragging only selects an object. It never changes world state. The move capability is the only path that updates the fixture object's location.

## Live task presence

The playground streams runtime lifecycle events to Hermit's presentation as they occur: task creation, fresh observation, proposal, host-policy decision, execution start and completion, environment verification, and terminal completion or failure. The activity trace updates during execution rather than appearing only after the operation returns. Presentation observers are isolated: an exception in a visual or speech observer cannot change the runtime's authority decision or execution result.

If a visitor speaks or types while a host action is already underway, Hermit acknowledges the interruption but does not pretend that the in-flight action was cancelled. The current fixture has no safe user-facing cancellation control for an already-dispatched host operation. Hermit waits for the operation's verified outcome before accepting another playground request. This preserves the distinction between interrupting conversation and cancelling a physical or host-side action; a future physical adapter must define and verify its own cancellation and reconciliation contract.

## Voice interaction

The page includes a voice panel with speech synthesis, optional speech recognition, and a typed request fallback. Speech synthesis uses the browser's installed voices. Recognition is feature-detected through `SpeechRecognition` / `webkitSpeechRecognition`; it is not available in every browser. The panel reports unsupported recognition instead of pretending the microphone worked.

The fixture grammar understands a small set of requests such as `inspect the glass vessel` and `move the glass vessel to the workbench`. A read-only inspection may run through the existing runtime. A move only selects the object and asks for approval; the existing host approval checkbox and runtime policy remain mandatory. See [Voice Interaction](VOICE_INTERACTION.md) for provider contracts and the plan for a higher-quality host-local recognizer.

## Safety and truthfulness boundary

The playground uses local fixture objects and deterministic adapters. It does not invoke a live model, connect to the user's computer, control a physical device, use GPU motion inference, or establish that Gestures/Physics integration is complete. The environment host supplies the policy decision; a model proposal would not grant authority.

## Pages build and deployment

The workflow follows the GUI showcase's artifact pattern:

1. Check out the repository and set up Node.js 22.
2. Run the runtime, playground, and lesson tests plus the deterministic inspection example.
3. Assemble `_site` from the home page, browser assets, runtime modules, and documentation.
4. Validate required files and both module entry points.
5. Upload `_site` as a GitHub Pages artifact.
6. Deploy only for pushes to `development` or manual workflow dispatch. Pull requests build and validate without deploying.

The deployment job delegates to CiAi's pinned reusable `deploy-pages.yml` workflow. CiAi owns the shared `github-pages` deployment step; Hermit owns its site-specific tests, artifact assembly, and upload. The reusable deployment job uses the `github-pages` environment with only `pages: write` and `id-token: write` permissions. The site remains a static browser experience; no server-side assistant process is hosted by Pages. The most recent verified build-and-deploy run completed successfully at commit `99bb6375fdffde8a7f39e10c038f5662b66bb253` ([workflow run](https://github.com/TrentBest/TheSingularityWorkshop.Hermit/actions/runs/45748742913)). The physical-adapter follow-up commits are newer; their workflow results must be checked before treating that newer revision as deployment-verified. See [Pages deployment diagnostics](PAGES_DEPLOYMENT_DIAGNOSTICS.md) for the historical cross-repository comparison.

## Next embodiment work

The next vertical slice should progress from fixture objects toward a versioned world-state/affordance contract and narrow Gestures/Physics adapters. The glass-vessel scenario remains the acceptance target: observe, approach safely, inspect, request an approved interaction, execute through physics-aware adapters, verify, and yield immediately when interrupted.


## Face-to-face companion

The first screen gives Hermit a visible character rather than a seashell placeholder: a front-facing hermit crab with a readable face, shell, claws, legs, antennae, breathing/blinking motion, and state-driven expressions. The direct message field uses the same deterministic intent resolver as the voice panel, so this is one interaction path rather than a second assistant implementation.

The companion presentation has explicit idle, listening, thinking, speaking, working, and concerned states. Conversation turns are interruptible: a new typed or recognized request cancels older speech, and stale asynchronous results cannot overwrite the current turn. Stopping recognition or speech returns Hermit to a neutral presence; microphone and speech failures are surfaced honestly with a typed fallback, and listening controls are restored after interruption. Hermit's pupils make a small, bounded glance toward a mouse/pen pointer within the encounter panel and offer a gentle downward glance when a visitor focuses the conversation controls; leaving the panel or focus restores a neutral gaze. This is local presentation feedback only, does not transmit pointer coordinates, and remains covered by the page's reduced-motion preference. Voice recognition, typed requests, fixture inspection/movement, and participant-scoped role-context previews update that presentation. Animation is presentation only: it never authorizes a capability, changes world state, or substitutes for host/domain verification. A live model, persistent personality/memory service, and physics-driven body are not claimed by this browser fixture.


## Primary experience architecture

The current site is still a scrolling document with a detached character panel. The target is a full-viewport inhabited environment: the scene is the home surface, Hermit remains anchored in it, and conversation/tools/documentation appear as contextual surfaces without displacing the encounter. The design decision, phased implementation, ownership boundaries, and acceptance criteria are recorded in [Hermit as an inhabited environment](HERMIT_EXPERIENCE_ARCHITECTURE.md). This is a target architecture, not a claim that the 3D scene, live model, Physics, or Gestures integrations are already implemented.

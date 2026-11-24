# Hermit Pages experience

The public Pages site is an executable learning surface for Hermit's boundaries, not a mock chat window.

## Entry experience

The home page introduces the Workshop companion and opens with a deterministic local environment. The existing neural-network lesson remains a separate module below the playground. Its inference visualization is not presented as Hermit's planner or body controller.

## Playground composition

The page also includes a three-lane architecture map: intent/planning, capability/trust, and environment/evidence. It labels which behaviors the local fixture demonstrates and which integrations remain future work, so the diagram does not imply that planned adapters are already connected.

| Layer | Responsibility |
|---|---|
| `index.html` | Semantic page structure, accessible controls, environment zones, status, and trace |
| `assets/hermit-playground.js` | Browser interaction, drag/drop selection, rendering, and event presentation |
| `src/hermit-playground.js` | Fixture world, capability registration, host policy, and post-action verification |\n| `src/world-state.js` | Immutable, versioned environment snapshot contract |
| `src/hermit-runtime.js` | Bounded execution, argument validation, cancellation, approval gate, and auditable trace |
| `tests/hermit-playground.test.mjs` | Runtime-level behavior tests, including world revision progression |\n| `tests/world-state.test.mjs` | Versioning, immutability, identity, bounds and hostile-input contract tests |
| `tests/pages-experience.test.mjs` | Page composition and browser wiring tests |

The browser adapter imports the same runtime module exercised by Node tests. The playground environment also emits immutable schema-versioned world snapshots (environment identity, revision and bounded object records); this is a fixture-level observation contract, not a complete ontology or physics model. The static Pages artifact therefore includes both `assets/` and the required `src/` modules.

## Available interactions

- Select an object by keyboard-operable button or drag it to the interaction pad.
- Ask Hermit to inspect it through the registered read-only `inspect-object` capability.
- Request a move to the workbench through `move-object`.
- Explicitly approve a world-changing move; host policy is still evaluated by the runtime.
- Observe the actual environment state after execution and require verification before the loop reports completion.
- Inspect the trace of observation, proposal, policy, execution, and verification events.

Dragging only selects an object. It never changes world state. The move capability is the only path that updates the fixture object's location.

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

The deployment job uses the `github-pages` environment with only `pages: write` and `id-token: write` permissions. The site remains a static browser experience; no server-side assistant process is hosted by Pages.

## Next embodiment work

The next vertical slice should progress from fixture objects toward a versioned world-state/affordance contract and narrow Gestures/Physics adapters. The glass-vessel scenario remains the acceptance target: observe, approach safely, inspect, request an approved interaction, execute through physics-aware adapters, verify, and yield immediately when interrupted.

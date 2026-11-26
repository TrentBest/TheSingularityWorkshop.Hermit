# Hermit as an inhabited environment

## Decision

The primary Hermit experience is not a long web page with a character section at its top. It is a persistent, full-viewport environment in which Hermit and the visitor share the same presented space. The browser page is the host shell; it should not be the experience's organizing metaphor.

The existing scrolling page remains useful as documentation, an accessible fallback, and a place to inspect the engineering proof. It should no longer define the primary encounter.

## Experience model

- **Hermit is continuously present.** His presence is anchored in the environment while scene content, tools, and supporting panels change around him. He is not a banner that disappears when the visitor scrolls.
- **The scene is the home surface.** The visitor enters a place, sees Hermit in that place, and can look around, approach scene objects, select them, or speak. Scene interaction is primary; forms and technical controls are contextual tools.
- **Conversation belongs to the space.** Speech, typed conversation, gaze, attention, silence, interruption, and task narration share one conversation/session model. A chat transcript may be available, but it is not the whole environment.
- **Tools are places or temporary work surfaces.** Inspection, creation, documentation, settings, and diagnostics open as contextual panels or destinations without replacing the encounter or losing scene context.
- **Continuity is explicit.** Session context records the current scene revision, selected/focused entity, recent visitor intent, active task, and verified outcomes. Session context is bounded and host-scoped; it must not be described as durable personal memory unless a real persistence service is connected.
- **Awareness is evidence-based.** Hermit may react to selection, focus, pointer proximity, scene changes, and host events only when those signals are actually supplied. The interface must distinguish observed facts, inferred intent, and unknown state. No fabricated perception.
- **Embodiment is a layered contract.** Presentation owns rendering and expression; Gestures owns posture/pose/motion procedures and evaluation; Physics owns physical state and outcomes; the host owns lifecycle, permissions, and authoritative environment state. Hermit coordinates these contracts without impersonating their owners.

## Primary layout

The initial browser implementation should use a full-viewport application shell with three persistent concepts:

1. **World surface:** the largest area, showing the active room/scene and its objects. It supports camera movement and object focus as the renderer evolves.
2. **Hermit presence:** an always-visible embodied anchor in the scene, not a detached card. The character's scale and position should feel grounded relative to scene objects. Until a true 3D body exists, a carefully composed 2.5D/illustrated environment is acceptable as an intentional first environment—not as a claim of physics embodiment.
3. **Context rail:** compact, collapsible access to conversation, current task, selected object, tools, and documentation. It must not consume the world surface by default or turn the experience into a dashboard.

The shell must fit the viewport without requiring page scrolling for the core encounter. On narrow screens, the world remains primary and the context rail becomes a sheet or focused overlay. Keyboard navigation, screen-reader labels, reduced-motion behavior, and a usable no-audio path are required.

## Interaction loop

1. The host supplies an initial, versioned scene observation and the capabilities available in this environment.
2. Hermit arrives in the scene and acknowledges the visitor without pretending to know more than the host supplied.
3. Visitor attention and scene interactions produce explicit focus/selection events.
4. Hermit can acknowledge a meaningful change, ask a clarifying question, or propose an action.
5. Host policy authorizes or rejects each operation; domain systems execute their owned behavior.
6. Hermit narrates progress from actual lifecycle events and reports only verified outcomes.
7. The session context is updated with the new scene revision and the interaction can continue naturally.

A conversation interruption and cancellation of an already-dispatched host operation remain separate operations. A future cancellation path must be defined by the adapter and reconciled against the environment before the interface claims cancellation.

## Phased implementation

### Phase 1 — Stop treating the document as the experience
- Create a full-viewport shell and make the scene the default home surface.
- Keep Hermit's presence anchored while secondary surfaces open and close.
- Move long-form explanations, neural-network lessons, architecture maps, and detailed controls out of the primary encounter and into explicit Workshop destinations.
- Preserve the current accessible page as a fallback until the new shell passes its acceptance checks.

### Phase 2 — Shared attention and context
- Define versioned host events for scene entered/changed, entity focused/selected/deselected, visitor attention, and task lifecycle.
- Maintain bounded session context with provenance and revision checks.
- Make Hermit respond to meaningful context changes rather than every pointer movement.
- Resume naturally after an interruption using the last verified state.

### Phase 3 — Embodied movement
- Replace the detached portrait with a scene-grounded representation.
- Integrate Gestures for pose and motion procedures and Physics for authoritative movement, collision, reachability, and physical outcomes.
- Keep animation proposals distinct from executed movement and verified physical state.
- Support idle behavior and small autonomous acts only within host-granted scope and explicit resource limits.

### Phase 4 — Real conversation and continuity
- Connect a live conversation provider through a host-owned adapter.
- Give the conversation model scene observations and bounded session context, not arbitrary browser state.
- Define persistence, identity, consent, retention, and deletion semantics before claiming long-term memory.
- Keep typed conversation available as a first-class fallback.

## Acceptance criteria for the primary encounter

- Initial load presents a full-viewport inhabited scene, not a document introduction followed by a playground.
- Hermit remains visible and contextually anchored while the visitor opens tools, documentation, and conversation.
- Core scene interaction does not require scrolling.
- Selecting or focusing a real scene entity updates Hermit's attention and the selected-entity context.
- Scene changes and task events update the same session context with source and revision.
- Hermit does not claim to see, hear, move, remember, or complete anything unless the corresponding host/domain evidence exists.
- Host approval and domain ownership boundaries remain intact.
- The legacy document/fallback remains reachable and usable.
- Desktop, narrow viewport, keyboard-only, reduced-motion, and no-audio paths are tested.

## Current reality

The current Pages experience has a front-facing SVG character, local gaze response, speech synthesis/optional recognition, deterministic fixture intent routing, a schematic object scene, and verified task lifecycle narration. It is still a scrolling document with a detached character panel, local fixture objects, and no live model, 3D scene, Physics integration, or Gestures integration. This decision records the intended architectural change; it does not claim those integrations already exist.


## Host scene observation contract

The inhabited Workshop now exposes a deliberately narrow browser event boundary. A host may dispatch `hermit:host-observation` with a detail object matching `hermit.scene-observation.v1`:

```js
window.dispatchEvent(new CustomEvent("hermit:host-observation", {
  detail: {
    schema: "hermit.scene-observation.v1",
    source: "host",
    revision: 12,
    kind: "entity-focused",
    entityId: "workbench",
    observedAt: new Date().toISOString()
  }
}));
```

The adapter delegates to the pure `src/hermit-scene-observation.js` validator, which accepts only host-sourced events, strictly increasing positive integer revisions, recognized event kinds, parseable observation timestamps, and entity identifiers in the current scene allowlist. The validator is covered by executable Node tests for forged sources, malformed timestamps, unknown entities/kinds, and stale or fractional revisions. Accepted events are re-emitted as `hermit:host-observation-accepted`; rejected events produce a generic rejection event without forwarding untrusted payload data. Hermit's world session keeps the host revision separately from its local presentation revision.

This is an integration seam, not proof that a real host is connected. The current page does not manufacture host observations, and browser-side event validation is not an authorization boundary. A production host must authenticate its own event source and enforce permissions server-side. The current allowlist is intentionally small and must be extended alongside the scene/entity contract, not bypassed with arbitrary object identifiers.

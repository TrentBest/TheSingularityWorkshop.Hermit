# Microbundle wrappers and visible construction

## Purpose

A microbundle describes its experience contribution and may optionally carry nested microbundles that define alternate ways to compose, edit, validate and visibly construct that contribution. The semantic payload remains authoritative; wrappers add presentation or tooling without changing its meaning.

## Conceptual package shape

- Manifest: identity, version, dependencies and defaults.
- Payload: semantic entities, systems, data and behavior.
- Composition wrapper: anchors, placement and assembly rules.
- Construction wrapper: Mini/Titan choreography and progress mapping.
- Editor wrapper: data editing experience.
- Experience wrapper: final user-facing manifestation.
- Validation wrapper: invariants, checks and evidence.

This is a conceptual layout, not a claim about the current MicroBundleDomain serialization format. The concrete manifest and nested-bundle schema must be aligned with that repository before implementation.

## Installation transaction

1. Resolve manifest identity, version, dependencies, wrapper compatibility and host policy.
2. Validate payload and resolve default anchors/placement.
3. Stage semantic change and compute resulting world state.
4. Commit through the host's composition transaction.
5. Emit a provenance-bound construction event with bundle identity/version, target region, task identity and progress contract.
6. If a compatible construction wrapper is present and presentation is enabled, render staged choreography.
7. Reconcile presentation against committed semantic state; never apply the payload twice.
8. Complete, skip or cancel presentation without changing the committed result.

If the host uses a staged/preview transaction, visible construction must not claim completion before commit.

## Volcano example

A volcano bundle can provide a default anchor such as the remote center of the active Workshop scene. On load, the volcano becomes part of the scene under bundle placement and host composition rules.

The construction wrapper can open authored service doors, stream Mini crews toward the region, stage crates/tools/scaffolds, batch distant crews into instanced groups, simulate a small number of nearby workers, and open a portal for rare Titan-scale hauling and rigging. Choreography converges on the already-installed volcano.

The mini swarm is not a requirement to instantiate hundreds of thousands of autonomous agents. The manifest may describe dramatic workforce scale while renderer and simulation choose a bounded representation.

## Editors are microbundles too

An editor declares target bundle identities and compatible schema versions, data surfaces it can inspect or modify, edit operations and validation rules, target-load requirements, dependencies, undo/redo semantics and provenance. If the target is not loaded, the editor may ask the host to resolve and load it. The user sees the editor operating over the target bundle's data, not an untracked shadow copy.

All edits use the host's versioned mutation contract. An editor cannot silently replace bundle identity, discard unknown fields or bypass target validation. Human approval is required where risk or scope warrants it.

## Scaling the spectacle

Use a hierarchy rather than one brain per worker: one bundle-level coordinator; work packages divided into zones, phases and crews; deterministic choreography templates with seeded variation; full articulation only for nearby/interactive workers; instancing and impostors for distant crews; progress aggregated from task completion evidence. LOD and reduced-motion settings change presentation, never semantic completion.

## Contracts to settle with MicroBundleDomain

Nested wrapper discovery and compatibility; wrapper precedence; anchor resolution; construction event identity/idempotency; task decomposition and cancellation; editor target/version and transactional mutation; worker budgets/LOD; authoritative progress evidence and reconciliation.

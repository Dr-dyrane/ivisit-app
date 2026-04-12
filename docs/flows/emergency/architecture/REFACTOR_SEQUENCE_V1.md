# Refactor Sequence (v1)

> Status: Active implementation sequence
> Scope: welcome + map cleanup

## Phase 1

Document the architecture and create the first grouped folders.

Done when:

- architecture docs exist
- read order is explicit
- first welcome-owned subfolder exists
- first map-flow helper split exists

## Phase 2

Welcome cleanup.

Target:

- move welcome-owned install UI under `components/welcome/install/`
- keep welcome orchestrator and variants unchanged behaviorally

## Phase 3

Map flow cleanup.

Target:

- group `/map` flow internals under `hooks/map/exploreFlow/`
- extract constants/helpers first
- extract pure derivations and loading-state builders next
- extract isolated side-effect hooks when they do not need the whole flow in one file
- keep the old public import path stable during transition

## Phase 4

Store boundary.

Target:

- split sheet/search/selection/surface/map-readiness state into a store boundary
- keep the current hook API stable while actions move behind that boundary
- reduce the size of the main flow hook

## Phase 5

Folder normalization.

Target:

- move map chrome, surfaces, tokens, and core config toward stable grouped folders
- keep root compatibility wrappers for widely referenced paths during the transition
- remove mixed files only after replacements are in place

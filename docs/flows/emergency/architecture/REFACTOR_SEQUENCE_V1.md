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

## Phase 6

Doc alignment for modal-to-sheet swap.

Target:

- remove contradictory “search/hospitals remain modals” language
- lock collapsed-state rules per sheet phase
- define one explicit pre-dispatch sheet-phase model

## Phase 7

State-model alignment.

Target:

- move from modal booleans toward `sheet.phase` and `sheet.payload`
- keep the current runtime stable while the new names become canonical
- preserve the public flow hook contract during the transition

## Phase 8

Search and hospital surface migration.

Target:

- move `search` into the persistent sheet
- move hospital list into the persistent sheet
- move hospital detail into the persistent sheet

## Phase 9

Bridge removal.

Target:

- remove pre-dispatch sibling modal surfaces from `MapScreen.jsx`
- keep only true non-core bridge surfaces if product still requires them

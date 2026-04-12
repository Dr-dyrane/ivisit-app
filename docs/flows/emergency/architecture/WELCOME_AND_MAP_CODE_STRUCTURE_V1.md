# Welcome And Map Code Structure (v1)

> Status: Active structure rule
> Scope: `components/welcome`, `components/map`, `hooks/map`

## Core Rule

Routes should be thin.

Feature roots should own state and view switching.

Views should render.

Helpers, constants, content, and styles should not live inline inside large JSX files once the split is known.

## Route Shape

Use routes as entrypoints only:

- route file mounts the feature root
- feature root chooses state and surface mode
- variants live below that root

## Welcome Structure

Preferred shape:

```text
components/welcome/
  WelcomeScreenOrchestrator.jsx
  buildWideWebWelcomeTheme.js
  welcomeContent.js
  hooks/
  install/
  shared/
  styles/
  variants/
```

Current start point:

- `views/` remains the active variant layer
- `install/` is the first extracted welcome-specific subfolder
- `shared/` is now the home for `WelcomeStageBase` and ambient shared surfaces

Working rule:

- welcome-owned install surfaces must live under `components/welcome/install/`
- do not keep welcome-only UI in generic `components/web/` once ownership is clear

## Map Structure

Preferred shape:

```text
components/map/
  chrome/
  content/
  core/
  state/
  surfaces/
  tokens/
  views/

hooks/map/
  exploreFlow/
  state/
```

Current start point:

- `views/exploreIntent/` is already a good variant family
- `hooks/map/exploreFlow/` is the first grouping layer for the main map flow
- `hooks/map/state/` is now the reducer-backed store boundary for `/map` UI flow state
- `components/map/chrome/` now owns `MapControls`
- `components/map/core/` now owns sheet orchestration, sheet constants, and viewport config
- `components/map/surfaces/` now owns shared modal/loading surfaces
- `components/map/surfaces/search/` now owns search-specific surfaces and helpers
- `components/map/tokens/` now owns glass, motion, render, sheet, and UI token modules
- `hooks/map/exploreFlow/useMapExploreFlow.js` remains the internal orchestrator
- `hooks/map/exploreFlow/mapExploreFlow.derived.js` now owns pure list/count/meta builders
- `hooks/map/exploreFlow/mapExploreFlow.loading.js` now owns loading-surface construction
- side-effect hooks such as `useMapExploreDemoBootstrap.js` and `useMapExploreGuestProfileFab.js` now sit beside the flow instead of inside it

Working rule:

- large map hooks should not keep growing as one file with embedded helper math
- extract helpers and constants first
- then extract pure derivations and isolated side-effect hooks
- keep the current public entrypoint stable while internal files move underneath it

## Compatibility Rule

If a path is widely referenced:

- keep a compatibility wrapper at the old entrypoint
- move the real implementation into the new grouped folder
- update docs to mention both the public entrypoint and the internal implementation path

This lets the codebase get cleaner without forcing a full path rewrite in one pass.

## Current Compatibility Wrappers

Root `components/map/` paths still exist for compatibility where they are widely referenced.

Those root files are now thin wrappers for grouped implementations such as:

- `MapControls.jsx` -> `chrome/MapControls.jsx`
- `MapSheetOrchestrator.jsx` -> `core/MapSheetOrchestrator.jsx`
- `MapModalShell.jsx` -> `surfaces/MapModalShell.jsx`
- `MapExploreLoadingOverlay.jsx` -> `surfaces/MapExploreLoadingOverlay.jsx`
- `MapSearchSheet.jsx` -> `surfaces/search/MapSearchSheet.jsx`
- `MapLocationModal.jsx` -> `surfaces/search/MapLocationModal.jsx`
- `MapPublicSearchModal.jsx` -> `surfaces/search/MapPublicSearchModal.jsx`
- token/config exports -> `core/` and `tokens/`

Working cleanup rule:

- internal runtime imports should target grouped paths directly
- root `components/map/` wrappers stay only for compatibility, docs, and gradual migration

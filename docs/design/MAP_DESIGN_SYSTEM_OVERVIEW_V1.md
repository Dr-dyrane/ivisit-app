# Map Design System Overview (v1)

> Status: Active contributor reference
> Scope: public `/map` and future emergency map states

Related:

- [../flows/emergency/EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md](../flows/emergency/EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md)
- [../flows/emergency/MAP_FLOW_IMPLEMENTATION_V1.md](../flows/emergency/MAP_FLOW_IMPLEMENTATION_V1.md)

## Goal

Keep the map flow visually familiar at a glance while making its structure, motion, and materials production-grade.

## Core Pieces

### 1. Screen Controller

- [MapScreen.jsx](../../screens/MapScreen.jsx)

Responsibility:

- compose the persistent map, persistent sheet, and modal layer
- avoid owning business logic directly

### 2. Flow Controller

- [useMapExploreFlow.js](../../hooks/map/useMapExploreFlow.js)

Responsibility:

- phase state
- modal state
- profile/auth handoff
- location handoff
- hospital selection
- readiness gating
- explicit demo bootstrap for `/map`

### 3. Persistent Sheet

- [MapSheetOrchestrator.jsx](../../components/map/MapSheetOrchestrator.jsx)
- [mapSheetTokens.js](../../components/map/mapSheetTokens.js)

Responsibility:

- one persistent floating sheet shell
- one mode
- one snap state
- content changes without replacing the shell

### 4. Modal Family

- [MapModalShell.jsx](../../components/map/MapModalShell.jsx)
- [mapModalShell.styles.js](../../components/map/mapModalShell.styles.js)

Responsibility:

- same open/close motion
- same backdrop behavior
- same close affordance
- same top-row alignment

### 5. Loading Family

- [MapExploreLoadingOverlay.jsx](../../components/map/MapExploreLoadingOverlay.jsx)
- [mapExploreLoadingOverlay.styles.js](../../components/map/mapExploreLoadingOverlay.styles.js)

Responsibility:

- believable pre-map skeleton
- same map + header + half-sheet silhouette as the real screen
- hides partial data states until readiness is satisfied

### 6. Motion Tokens

- [mapMotionTokens.js](../../components/map/mapMotionTokens.js)

Current shared tokens:

- modal spring
- sheet snap spring
- modal fade timings
- care pulse timing

## Design Rules

- One persistent map render.
- One persistent sheet shell.
- Modals are tasks, not separate mini-apps.
- Supporting text should default to `400` weight unless emphasis is truly required.
- The map should wait for meaningful readiness, not just mount.
- The hospital list shown on `/map` should come from the full discovered nearby set, not the display-trimmed subset.

## Current Reuse Standard

New map surfaces should reuse these first:

1. `MapModalShell`
2. `mapMotionTokens`
3. `mapSheetTokens`
4. `useMapExploreFlow`

Only create new one-off modal or motion behavior if the shared contract truly cannot express the state.

# Map Design System Overview (v1)

> Status: Active contributor reference
> Scope: public `/map` and future emergency map states

Related:

- [../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md](../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md)
- [../flows/emergency/EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md](../flows/emergency/EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md)
- [../flows/emergency/MAP_FLOW_IMPLEMENTATION_V1.md](../flows/emergency/MAP_FLOW_IMPLEMENTATION_V1.md)
- [../flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](../flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md)
- [../WELCOME_AND_INTAKE_FLOW_MAP.md](../WELCOME_AND_INTAKE_FLOW_MAP.md)

## Goal

Keep the map flow visually familiar at a glance while making its structure, motion, materials, and active-header behavior production-grade.

## Main guiding docs for map / sheet / active-header UI

Use this reading order before changing `/map` UI, sheet behavior, or the active header contract.

1. [../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md](../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md)
   - external Apple behavior + latest visual-language reference
2. [../flows/emergency/EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md](../flows/emergency/EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md)
   - iVisit product doctrine for map, sheet, and state transitions
3. [../flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](../flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md)
   - implementation contract for map shell, sheet shell, and smart/active header
4. [../flows/emergency/MAP_FLOW_IMPLEMENTATION_V1.md](../flows/emergency/MAP_FLOW_IMPLEMENTATION_V1.md)
   - ownership map for runtime files and orchestration
5. [../WELCOME_AND_INTAKE_FLOW_MAP.md](../WELCOME_AND_INTAKE_FLOW_MAP.md)
   - cross-flow reference for header/intake continuity outside `/map`

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
- [MapSheetShell.jsx](../../components/map/MapSheetShell.jsx)
- [mapSheet.constants.js](../../components/map/mapSheet.constants.js)
- [mapSheetShell.styles.js](../../components/map/mapSheetShell.styles.js)
- [mapSheetTokens.js](../../components/map/mapSheetTokens.js)

Responsibility:

- `MapSheetOrchestrator` routes by mode
- `MapSheetShell` owns one persistent floating sheet shell
- one mode
- one snap state
- content changes without replacing the shell

Current view decomposition example:

- [components/map/views/exploreIntent](../../components/map/views/exploreIntent)

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
5. `MapLocationModal` / `MapHospitalModal` task-sheet patterns

Only create new one-off modal or motion behavior if the shared contract truly cannot express the state.

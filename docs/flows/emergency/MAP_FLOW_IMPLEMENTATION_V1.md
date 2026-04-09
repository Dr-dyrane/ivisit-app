# Map Flow Implementation (v1)

> Status: Active implementation note
> Scope: `/map` -> `explore_intent`

Related:

- [EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md](./EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md)
- [MAP_EXPLORE_INTENT_AUDIT_AND_SYSTEM_V1.md](./MAP_EXPLORE_INTENT_AUDIT_AND_SYSTEM_V1.md)
- [../../design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md](../../design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md)

## Current Architecture

The public map flow now follows this shape:

- [MapScreen.jsx](../../../screens/MapScreen.jsx)
  - thin composition layer only
- [useMapExploreFlow.js](../../../hooks/map/useMapExploreFlow.js)
  - owns explore-intent state, modal state, profile/auth handoff, hospital selection, explicit demo bootstrap, and readiness gating
- [EmergencyLocationPreviewMap.jsx](../../../components/emergency/intake/EmergencyLocationPreviewMap.jsx)
  - owns the persistent map render and route preview
- [MapSheetOrchestrator.jsx](../../../components/map/MapSheetOrchestrator.jsx)
  - owns the persistent sheet shell and current phase rendering

## Readiness Contract

The screen should not expose a partial or broken first state.

`/map` now stays in loading until:

- location is resolved
- hospital discovery is resolved
- map instance is ready
- route is ready when a route is expected
- explicit demo coverage bootstrap is finished when needed

Supporting files:

- [MapExploreLoadingOverlay.jsx](../../../components/map/MapExploreLoadingOverlay.jsx)
- [EmergencyLocationPreviewMap.jsx](../../../components/emergency/intake/EmergencyLocationPreviewMap.jsx)

## Modal Contract

Map-specific modal tasks now share one shell:

- [MapModalShell.jsx](../../../components/map/MapModalShell.jsx)
- [mapModalShell.styles.js](../../../components/map/mapModalShell.styles.js)

Applied to:

- [MapPublicSearchModal.jsx](../../../components/map/MapPublicSearchModal.jsx)
- [MapCareHistoryModal.jsx](../../../components/map/MapCareHistoryModal.jsx)
- [MapGuestProfileModal.jsx](../../../components/map/MapGuestProfileModal.jsx)
- [MapLocationModal.jsx](../../../components/map/MapLocationModal.jsx)
- [MapHospitalModal.jsx](../../../components/map/MapHospitalModal.jsx)

Shared behavior:

- same spring-up motion
- same backdrop fade
- same close affordance
- same top-row header contract
- same bottom-sheet surface treatment

## Hospital Data Consistency Fix

The inconsistent “one hospital vs several hospitals” behavior had three causes:

1. `useHospitals` caches by location bucket, and the previous bucket precision was too coarse for map exploration.
2. `useHospitals` exposes both a display subset and the full discovered set, but `EmergencyContext` was consuming the display subset.
3. `/map` was not explicitly bootstrapping demo coverage when demo mode was allowed and discovery came back empty.

Current fixes:

- [useHospitals.js](../../../hooks/emergency/useHospitals.js)
  - location bucket precision raised from `2` to `3`
- [EmergencyContext.jsx](../../../contexts/EmergencyContext.jsx)
  - now prefers the full discovered hospital set for emergency state, then sorts by distance
- [useMapExploreFlow.js](../../../hooks/map/useMapExploreFlow.js)
  - explicitly calls `ensureDemoEcosystemForLocation(...)` for `/map` when demo is enabled and no hospitals are available yet

## Next Steps

For `ios-mobile` solidification, build in this order:

1. keep `MapScreen.jsx` thin
2. add more sheet modes into `useMapExploreFlow.js`
3. keep new modal tasks on `MapModalShell`
4. add a `MapScreenOrchestrator` once Android and web variants start to diverge
5. migrate any remaining map-adjacent legacy overlays only if they are reintroduced into `/map`

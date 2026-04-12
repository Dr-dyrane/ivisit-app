# Map Flow Implementation (v1)

> Status: Active implementation note
> Scope: `/map` -> `explore_intent`

Related:

- [EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md](./EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md)
- [MAP_EXPLORE_INTENT_AUDIT_AND_SYSTEM_V1.md](./MAP_EXPLORE_INTENT_AUDIT_AND_SYSTEM_V1.md)
- [MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](./MAP_SCREEN_IMPLEMENTATION_RULES_V1.md)
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
  - thin mode router only
- [MapSheetShell.jsx](../../../components/map/MapSheetShell.jsx)
  - owns persistent sheet shell behavior
- [components/map/views/exploreIntent](../../../components/map/views/exploreIntent)
  - owns the current first mode using variant-based files

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
  - now prefers the full discovered hospital set for emergency state, but ranks it in nearby-first order so `0-15 km` hospitals stay ahead of extended browse results
- [useMapExploreFlow.js](../../../hooks/map/useMapExploreFlow.js)
  - explicitly calls `ensureDemoEcosystemForLocation(...)` for `/map` when live nearby coverage is weak and demo nearby support is still insufficient

## Nearby Priority Contract

The map keeps the full discovered set available, but it should not treat every discovered hospital as equally relevant.

- `0-5 km` = immediate nearby care
- `>5-15 km` = nearby support
- `>15-50 km` = extended browse only
- The current `/map` sheet should aim for about **5 nearby hospitals** so the summary card, hospital rail, and modal list all feel comfortably populated.
- The hospital rail and the hospital modal should now read from the same full discovered nearby set; the rail is no longer an artificially clipped preview subset.
- Any visible difference between rail and modal should come only from viewport/card layout, not from different hospital collections.
- Live coverage quality is decided from the `0-15 km` window.
- Demo bootstrap sufficiency is decided from the `0-15 km` window and should keep filling while the nearby set is still below that map comfort target.
- One faraway demo hospital must not suppress bootstrap.
- Mixed live/demo hospital lists should rank close-by hospitals ahead of extended browse results, even in `hybrid` mode.

## Hospital Media Contract

Hospital media should remain a data-layer concern.

- Emergency and `/map` surfaces continue to read the existing `hospital.image` field.
- `hospital.image` is now expected to be a canonical render URL, often backed by the public [`hospital-media`](../../../supabase/functions/hospital-media/index.ts) proxy.
- New provider-discovered hospitals may use a direct `place_id` proxy path immediately.
- Existing hospitals should be normalized through [`backfill_hospital_media.js`](../../../supabase/scripts/backfill_hospital_media.js) so the current UI receives stable image delivery without per-surface image logic.
- When no trustworthy real image exists, deterministic fallback remains valid and should be preferred over misleading random media.

## Next Steps

For `ios-mobile` solidification, build in this order:

1. keep `MapScreen.jsx` thin
2. add more sheet modes into `useMapExploreFlow.js`
3. keep new modal tasks on `MapModalShell`
4. add a `MapScreenOrchestrator` once Android and web variants start to diverge
5. migrate any remaining map-adjacent legacy overlays only if they are reintroduced into `/map`

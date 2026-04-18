# Map Flow Implementation (v1)

> Status: Active implementation note
> Scope: `/map` -> `explore_intent`, `ambulance_decision`, `bed_decision`

Related:

- [EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md](./EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md)
- [MAP_EXPLORE_INTENT_AUDIT_AND_SYSTEM_V1.md](./MAP_EXPLORE_INTENT_AUDIT_AND_SYSTEM_V1.md)
- [MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](./MAP_SCREEN_IMPLEMENTATION_RULES_V1.md)
- [architecture/MAP_SHEET_IMPLEMENTATION_NOTES_V1.md](./architecture/MAP_SHEET_IMPLEMENTATION_NOTES_V1.md)
- [../../design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md](../../design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md)

## Current Architecture

The public map flow now follows this shape:

- [MapScreen.jsx](../../../screens/MapScreen.jsx)
  - thin composition layer only
- [useMapExploreFlow.js](../../../hooks/map/useMapExploreFlow.js)
  - owns explore-intent state, sheet phase state, profile/auth handoff, hospital selection, explicit demo bootstrap, and readiness gating
- [EmergencyLocationPreviewMap.jsx](../../../components/emergency/intake/EmergencyLocationPreviewMap.jsx)
  - owns the persistent map render and route preview
- [MapSheetOrchestrator.jsx](../../../components/map/core/MapSheetOrchestrator.jsx)
  - thin sheet-phase router only
- [MapSheetShell.jsx](../../../components/map/MapSheetShell.jsx)
  - owns persistent sheet shell behavior
- [components/map/views/exploreIntent](../../../components/map/views/exploreIntent)
  - owns the current first mode using variant-based files
- [components/map/views/ambulanceDecision](../../../components/map/views/ambulanceDecision)
  - owns the dispatch-decision phase after the ambulance CTA
- [components/map/views/bedDecision](../../../components/map/views/bedDecision)
  - owns the room decision phase after `bed`, and after ambulance selection in the combined flow

## Readiness Contract

The screen should not expose a partial or broken first state.

`/map` now stays in loading until:

- location is resolved
- hospital discovery is resolved
- map instance is ready
- route is ready when a route is expected
- explicit demo coverage bootstrap is finished when needed

Supporting files:

- [MapExploreLoadingOverlay.jsx](../../../components/map/surfaces/MapExploreLoadingOverlay.jsx)
- [EmergencyLocationPreviewMap.jsx](../../../components/emergency/intake/EmergencyLocationPreviewMap.jsx)

## Sheet And Modal Contract

The persistent pre-dispatch map flow now routes `search`, `hospital_list`, `hospital_detail`, `ambulance_decision`, and `bed_decision` through the shared sheet shell.

Persistent sheet path:

- [MapSheetOrchestrator.jsx](../../../components/map/core/MapSheetOrchestrator.jsx)
- [components/map/views/search](../../../components/map/views/search)
- [components/map/views/hospitalList](../../../components/map/views/hospitalList)
- [components/map/views/hospitalDetail](../../../components/map/views/hospitalDetail)
- [components/map/views/ambulanceDecision](../../../components/map/views/ambulanceDecision)
- [components/map/views/bedDecision](../../../components/map/views/bedDecision)

Bridge modals that still share one shell:

- [MapModalShell.jsx](../../../components/map/surfaces/MapModalShell.jsx)
- [mapModalShell.styles.js](../../../components/map/surfaces/mapModalShell.styles.js)

Applied to:

- [MapPublicSearchModal.jsx](../../../components/map/surfaces/search/MapPublicSearchModal.jsx)
- [MapCareHistoryModal.jsx](../../../components/map/MapCareHistoryModal.jsx)
- [MapGuestProfileModal.jsx](../../../components/map/MapGuestProfileModal.jsx)
- [MapLocationModal.jsx](../../../components/map/surfaces/search/MapLocationModal.jsx)
- [MapHospitalModal.jsx](../../../components/map/MapHospitalModal.jsx)
- [MapHospitalDetailsModal.jsx](../../../components/map/MapHospitalDetailsModal.jsx)

Shared behavior:

- same spring-up motion
- same backdrop fade
- same close affordance
- same top-row header contract
- same bottom-sheet surface treatment

Responsive sizing contract:

- shared sizing truth now lives in [viewportSurfaceMetrics.js](../../../utils/ui/viewportSurfaceMetrics.js)
- web mobile and tablet flows must size against the visible viewport via [useAuthViewport.js](../../../hooks/ui/useAuthViewport.js) / [useWebViewportMetrics.js](../../../hooks/ui/useWebViewportMetrics.js), not the large viewport
- child map modals and welcome helpers should consume [useResponsiveSurfaceMetrics.js](../../../hooks/ui/useResponsiveSurfaceMetrics.js) or a phase-level responsive hook before adding any new fixed dimensions
- current responsive adoption now covers:
  - `/welcome` stage composition and install helpers
  - `/map` shell and bridge modals
  - `MapPublicSearchModal`
  - `explore_intent`
  - `ambulance_decision`
  - `bed_decision`
  - `service_detail`
  - shared search sheet surfaces

Shared implementation note:

- `search`, `hospital_list`, and `hospital_detail` now share a stage body-scroll wrapper through [`MapStageBodyScroll.jsx`](../../../components/map/views/shared/MapStageBodyScroll.jsx)
- `ambulance_decision` now reuses the same shell, detent, route, and service-detail seam as the existing map phases
- `bed_decision` now reuses that same shell, route seam, and service-detail seam for room-first booking only
- `ambulance + bed` now uses a sequential flow: `ambulance_decision -> bed_decision -> legacy booking`
- `hospital_detail` remains the visual exception where expanded hero/title/body structure must be preserved exactly even if other stage internals are refactored
- `ambulance_decision` currently confirms into the existing legacy ambulance-request route after the sheet decision; `COMMIT_DETAILS` is still the next in-map phase to build
- `bed_decision` currently confirms into the existing legacy bed-booking route after the sheet decision; room preselection is forwarded
- in the combined flow, paired ambulance selection is preserved from `ambulance_decision` and then forwarded when `bed_decision` confirms
- that saved ambulance selection is hospital-scoped; if the user changes hospitals during `bed_decision`, the flow must return to `ambulance_decision` for the new hospital before step 2 can continue
- flow ownership stays in `useMapExploreFlow.js`; stage components should not own cross-phase invalidation rules

## Bed Decision Data Contract

The current `/map` `bed_decision` phase is room-first only.

Current runtime path:

- [useMapBedDecisionModel.js](../../../components/map/views/bedDecision/useMapBedDecisionModel.js)
  - calls `hospitalsService.getRooms(...)`
- [hospitalsService.js](../../../services/hospitalsService.js)
  - reads `room_pricing`, `bed_availability`, and hospital bed counts
- [mapHospitalDetail.helpers.js](../../../components/map/surfaces/hospitals/mapHospitalDetail.helpers.js)
  - maps room rows into room service cards
- [mapBedDecision.helpers.js](../../../components/map/views/bedDecision/mapBedDecision.helpers.js)
  - derives room hero + route content from those rows plus route data

Current backend-backed fields available to the sheet:

- room side:
  - `room_type`
  - `room_label` / `room_name`
  - `available_units` / `available`
  - `price_per_night` / `base_price`

Current derived UI fields:

- selected room title
- room availability label
- room price label

Current flow rule:

- `bed` CTA now opens `bed_decision`
- half state stays room-first for smaller screens
- expanded state exposes alternate room options
- service detail can drill into room items and returns back into `bed_decision`
- hospital list can now return to `bed_decision` with its original payload instead of dropping back to explore

## Combined Care Flow Note

The current `/map` `ambulance + bed` experience is intentionally sequential:

- `ambulance + bed` first opens `ambulance_decision`
- ambulance selection is saved in map state
- confirm then advances into `bed_decision`
- `bed_decision` stays room-only in UI
- final bed confirm forwards both the chosen room and the previously chosen ambulance into the legacy bed-booking route

## Ambulance Decision Data Contract

The current `/map` `ambulance_decision` phase intentionally does not read a live assigned ambulance unit.

Current runtime path:

- [useMapAmbulanceDecisionModel.js](../../../components/map/views/ambulanceDecision/useMapAmbulanceDecisionModel.js)
  - calls `hospitalsService.getServicePricing(...)`
- [hospitalsService.js](../../../services/hospitalsService.js)
  - reads `service_pricing`
- [mapHospitalDetail.helpers.js](../../../components/map/surfaces/hospitals/mapHospitalDetail.helpers.js)
  - maps ambulance pricing rows into the three dispatch tiers
- [mapAmbulanceDecision.helpers.js](../../../components/map/views/ambulanceDecision/mapAmbulanceDecision.helpers.js)
  - derives hero + option content from those rows plus route data

Current backend-backed fields available to the sheet:

- `id`
- `service_name`
- `service_type`
- `description`
- `base_price`

Current derived UI fields:

- selected tier title
- crew label / crew count presentation
- `Ready` / enabled state
- confidence label
- price text

Legacy compatibility note:

- [EmergencyRequestModal.jsx](../../../components/emergency/EmergencyRequestModal.jsx) already made the same product decision
- it fetches `service_pricing`, filters ambulance rows, and synthesizes the user-facing crew copy from `service_type`
- this means the new map sheet is aligned with the legacy pre-dispatch contract instead of inventing a second source of truth

RLS / survivability note:

- `service_pricing` currently has public read RLS:
  - [20260219000800_emergency_logic.sql](../../../supabase/migrations/20260219000800_emergency_logic.sql)
- `ambulances` also currently has public read RLS:
  - [20260219000700_security.sql](../../../supabase/migrations/20260219000700_security.sql)
- even so, pre-dispatch UI should continue to depend on `service_pricing`, not `ambulances`

Reason:

- `service_pricing` is stable pre-authorization metadata
- `ambulances` is live logistics inventory and may be tightened later without breaking the public map flow
- the pre-dispatch sheet should survive future hardening where live ambulance-unit visibility becomes authenticated-only or dispatch-only

Practical rendering rule for the current hero:

- header owns hospital + away line
- hero owns selected ambulance tier
- hero pill 1 should be crew
- hero pill 2 should be price
- do not render live unit identity in pre-dispatch phases

Practical selector rule for the current dispatch choice row:

- selected state should read from the whole pill, not a nested trailing affordance
- selected pill uses the shared app CTA color
- selected tier icon may switch from outline to filled
- unselected pills stay tier-tinted and quieter
- first tap selects
- second tap on the already-selected tier advances
- do not add a trailing chevron to compact 3-up selector pills; it crowds web and small-phone layouts

Current parity note for `service_detail`:

- half state now follows the same compact icon + text selector grammar as `ambulance_decision`
- expanded state switches to flatter comparison blades
- the primary CTA now sits inline at the bottom of scroll content instead of staying sticky

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
3. build `COMMIT_DETAILS` so ambulance confirmation no longer hands off to the legacy request screen
4. keep remaining bridge modal tasks on `MapModalShell`
5. add a `MapScreenOrchestrator` once Android and web variants start to diverge
6. migrate any remaining map-adjacent legacy overlays only if they are reintroduced into `/map`

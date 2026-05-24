---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Map Location, Nearby, and Route Failure Audit

Date: 2026-05-07
Scope: live `/map` flow only
Primary owner: `screens/MapScreen.jsx` -> `hooks/map/exploreFlow/useMapExploreFlow.js` -> `components/emergency/intake/EmergencyLocationPreviewMap.jsx`

## Problem Statement

Tester feedback in this pass converged on four runtime failures:

1. Turning location off can leave `/map` stuck behind the "Locating you" skeleton.
2. "Nearby hospitals" can resolve to obviously wrong distances like `13 km`, even in Lagos.
3. Route requests still hit Mapbox `422` and OSRM `400`.
4. Ambulance service-selection pricing still shows canonical USD pricing instead of the billing-quote display currency.

## Findings

### 1. Location-off deadlock is still possible

Root cause:
- `MapScreen` auto-opens the location search gate when `locationControl.requiresLocationSelection` is true.
- But `useMapLoadingState` still keeps the full-screen overlay visible until `hasCompletedInitialMapLoad` flips true.
- `hasCompletedInitialMapLoad` only flips when `isMapFrameReady` becomes true.
- `isMapFrameReady` still requires an active coordinate plus `mapReadiness.mapReady`.

Files:
- `hooks/map/exploreFlow/useMapLoadingState.js`
- `hooks/map/exploreFlow/mapExploreFlow.loading.js`
- `contexts/GlobalLocationContext.jsx`
- `screens/MapScreen.jsx`

Why this fails:
- If the user launches with location off and no valid manual pickup yet, the app is correctly honest about missing location, but the loading overlay still behaves like the app is waiting for successful geolocation.
- That means the user can be trapped behind a loading state instead of being moved fully into the manual-pickup UX.

Guardrail interpretation:
- This is a state-contract defect, not a styling defect.
- `requiresLocationSelection` should be a terminal UI state, not a perpetual loading state.

### 2. "Nearby hospital count" is not actually "nearby"

Root cause:
- `useMapDerivedData` derives `nearbyHospitalCount` from `getNearbyHospitalCount(discoveredHospitals)`.
- `getNearbyHospitalCount` currently returns the count of all discovered hospitals, not hospitals within a nearby radius.

Files:
- `hooks/map/exploreFlow/useMapDerivedData.js`
- `hooks/map/exploreFlow/mapExploreFlow.derived.js`

Why this fails:
- The UI badge says `nearby`, but the code currently means `all hospitals returned from the 50km discovery set`.
- That hides the real distance-quality problem and overstates locality.

Guardrail interpretation:
- Naming and selector truth are out of sync.
- This should be a pure selector correction, not a component patch.

### 3. The hospital discovery lane is broad and can surface far hospitals first

Root cause:
- `useHospitals` fetches against `hospitalsService.discoverNearby(..., 50000)`, which is a `50km` search radius.
- The edge function asks `discover-hospitals` with `limit: 15`.
- The RPC `nearby_hospitals` itself sorts by distance, but the merge layer appends provider rows, dedupes, and then slices to `limit`.
- The UI then treats the merged `allHospitals` set as the discovered set for the live `/map`.

Files:
- `hooks/emergency/useHospitals.js`
- `services/hospitalsService.js`
- `supabase/functions/discovery/discover-hospitals/index.ts`
- `supabase/migrations/20260219010000_core_rpcs.sql`

Why this fails:
- The app currently optimizes for "some hospitals within 50km" rather than "best local hospitals first within a tight nearby radius."
- In sparse or filtered coverage scenarios, users can get a technically valid but UX-bad first hospital that is much farther away than expected.
- Coverage/demo filtering can further shrink the true close set before the UI picks the nearest visible hospital.

Guardrail interpretation:
- This is a canonical query + selector issue.
- "Nearest hospital" should be derived from a locally scoped candidate lane, not from the entire broad discovery payload.

### 4. Route API errors are slipping through because the validity gate is too weak

Root cause:
- `routeService.buildRouteKey` only checks that latitude/longitude are finite numbers.
- `useMapRoute.calculateRoute` proceeds if `buildRouteKey` returns a key.
- `EmergencyLocationPreviewMap` immediately calls `calculateRoute(routeOriginCoordinate, routeDestinationCoordinate)` whenever both coordinates exist.

Files:
- `services/routeService.js`
- `hooks/emergency/useMapRoute.js`
- `components/emergency/intake/EmergencyLocationPreviewMap.jsx`

Why this fails:
- Coordinates can be finite but still invalid for routing:
  - stale fallback coordinates
  - malformed manual pickup data
  - out-of-range latitude/longitude
  - effectively degenerate same-point or garbage-point pairs
- That leads to provider-visible 422/400 errors instead of being rejected locally first.

Guardrail interpretation:
- This belongs in the service validation layer.
- The fetch layer should reject invalid route inputs before the network boundary.

### 5. Ambulance service selection is not fully on the billing-quote lane

Root cause:
- Map payment/checkout surfaces use the billing quote lane.
- Ambulance service-selection cards still build `priceText` through hospital-detail helper formatting and hospital/service row currency.
- They do not consume `useBillingQuoteQuery` or a quoted display projection.

Files:
- `components/map/views/ambulanceDecision/mapAmbulanceDecision.helpers.js`
- `components/map/surfaces/hospitals/mapHospitalDetail.helpers.js`

Why this fails:
- The user sees converted/quoted currency later in the checkout lane, but still sees canonical USD-like pricing during service selection.
- That breaks trust and makes the earlier currency work look incomplete.

Guardrail interpretation:
- Quote truth has not been applied uniformly across the read path.
- The decision-stage selector/helper should receive quoted display pricing, not raw canonical service pricing.

## Severity Order

| # | Issue | Status |
|---|-------|--------|
| 1 | **Location-off deadlock behind loading overlay** | âœ… **IMPLEMENTED 2026-05-07** â€” Converted to terminal state with auto-open location search |
| 2 | Broad/far hospital discovery being presented as "nearby" | Client-side remediation in place (strict 5km nearby lane) |
| 3 | **Route API invalid-input leakage** | âœ… **IMPLEMENTED 2026-05-07** â€” Strict coordinate validation added to routeService |
| 4 | Billing quote not fully adopted in ambulance service selection | âœ… **IMPLEMENTED 2026-05-07** â€” Quoted prices now in ambulance/bed decision models |

## Recommended Fix Order

### âœ… Completed
1. ~~Convert `requiresLocationSelection` into a real non-loading terminal state for `/map`.~~ **DONE**
5. ~~Thread billing-quote display projection into ambulance service-selection cards.~~ **DONE**

### ðŸ”„ Remaining
2. Split `discovered hospitals` from `nearby hospitals` in selectors. *(Client-side remediation in place)*
4. Introduce a short-radius `local candidate` selection pass for the first hospital shown on explore intent. *(Policy decision)*

### Implementation Details â€” Route Validation

**Files Modified:**
- `services/routeService.js`

**Approach:**
- Added strict coordinate validation at the start of `getMapboxRoute()` and `getOSRMRoute()`
- Uses existing `isValidRouteCoordinate()` helper (validates lat/lng ranges and finite numbers)
- Returns `null` early before network fetch if coordinates are invalid
- Prevents HTTP 422 (Mapbox) and 400 (OSRM) errors from invalid input
- Falls back to `buildFallbackRoute()` which creates straight-line estimate

### Implementation Details â€” Location-Off Terminal State

**Files Modified:**
- `hooks/map/exploreFlow/useMapLoadingState.js`
- `hooks/map/exploreFlow/useMapExploreFlow.js`

**Approach:**
- Added `isLocationOffTerminal` flag: `requiresLocationSelection && !isLoadingLocation && !hasActiveLocation`
- Modified `shouldShowMapLoadingOverlay` to return `false` when `isLocationOffTerminal`
- Added auto-open effect: when `isLocationOffTerminal` becomes true, immediately open search sheet in `LOCATION` mode
- User now sees manual-pickup UX instead of being trapped behind loading overlay

## Do Not Regress

- Do not reintroduce silent default-location behavior to hide missing GPS.
- Do not keep the "nearby" label on a selector that counts the whole 50km set.
- Do not patch route errors only at the UI; fix the validation contract before fetch.
- Do not add more ad hoc `$` formatting in service-selection surfaces; adopt the billing-quote lane there too.

## Addendum - 2026-05-07 Runtime Follow-up

Two additional runtime failures were confirmed during live testing after the first audit draft.

### A. Search blur analytics was writing the wrong schema contract

Root cause:
- `SearchContext.commitQuery()` emits a plain query commit when the search field blurs.
- `services/discoveryService.js` was trying to write that event into `search_selections`.
- `search_selections` requires both `result_type` and `result_id`.
- one legacy caller in `hooks/search/useSearchRanking.js` was also sending `key` / `extra` instead of canonical `resultType` / `resultId`.

Implemented fix:
- plain query commits now go to `search_events`
- real result selections stay on `search_selections`
- hospital result ranking now sends canonical selection fields

Files:
- `services/discoveryService.js`
- `hooks/search/useSearchRanking.js`

### B. Fresh pickup changes could keep a stale hospital alive during refetch

Root cause:
- when a user changed pickup to a fresh uncached location, `useHospitals` kept the previous hospital lane mounted until the new fetch settled
- `useMapHospitalSelection` also kept the prior `selectedHospitalId` / `featuredHospital` alive if the new discovered lane went empty

Why that matters:
- a Nigerian pickup could still trigger a route request toward an old remote hospital coordinate
- the route provider error was downstream noise from stale state surviving a pickup boundary

Implemented fix:
- fresh uncached location changes now clear the prior hospital lane immediately
- empty discovered lanes now clear stale selection and featured-hospital focus

Files:
- `hooks/emergency/useHospitals.js`
- `hooks/map/exploreFlow/useMapHospitalSelection.js`

### C. Cross-session pickup and hospital state could still trigger impossible routes

Root cause:
- changing pickup did not immediately clear the focused hospital / sheet payload lane
- `EmergencyLocationPreviewMap` still attempted route fetches whenever both coordinates existed, even if the selected hospital's stored distance clearly belonged to a different pickup session

Why that matters:
- a California pickup could still try to route to a Nigeria hospital during the brief handoff between pickup change and hospital reconciliation
- Mapbox then returned `422` because the app asked for an impossible intercontinental driving route

Implemented fix:
- meaningful pickup changes now clear location-scoped hospital focus before the next fetch cycle
- the preview map now rejects cross-session pickup/hospital pairs locally when the live direct distance is incompatible with the hospital's recorded local distance

Files:
- `hooks/map/exploreFlow/useMapLocation.js`
- `hooks/map/exploreFlow/useMapExploreFlow.js`
- `components/emergency/intake/EmergencyLocationPreviewMap.jsx`

### Addendum Guardrails

- query commits and result selections are different analytics events and must not share a partial insert contract
- a pickup location change without a warm hospital cache is a state reset boundary, not a keep-rendering-old-data boundary
- a route fetch needs both valid coordinates and a consistent pickup/hospital session pair

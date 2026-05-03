# Map Route State Hardening Checkpoint (2026-04-29)

Status: Implemented in code, runtime repro confirmation still pending

## Scope

This pass hardened `/map` route calculation ownership so the app stops paying duplicate directions cost across overlapping map surfaces and stops relying on private per-hook route caches.

Primary surfaces affected:

- `components/emergency/intake/EmergencyLocationPreviewMap.jsx`
- `components/map/surfaces/hospitals/useMapHospitalDetailModel.js`
- `components/map/views/ambulanceDecision/useMapAmbulanceDecisionModel.js`
- `components/map/views/bedDecision/useMapBedDecisionModel.js`
- other `useMapRoute()` consumers that render route previews from the same origin/destination pair

## What Landed

### 1. Canonical route service

- `services/routeService.js` now owns:
  - route key generation
  - Mapbox directions fetch
  - OSRM fallback on non-browser runtimes
  - direct-line fallback shaping
  - route TTL rules
  - route freshness checks

### 2. Shared query contract

- `hooks/emergency/mapRoute.queryKeys.js` now defines the canonical TanStack Query key for route snapshots.
- the query key now defaults to `MAP_ROUTE_PROFILE` from `services/routeService.js` so cache identity cannot drift from the actual routing profile.

### 3. Shared runtime cache/status lane

- `stores/mapRouteStore.js` now provides:
  - `routesByKey`
  - `statusesByKey`
  - `setRouteLoading`
  - `setRouteResolved`
  - `setRouteError`
  - `getRouteSnapshot`
  - `getRouteStatus`
  - `pruneExpiredRoutes`

This converts route calculation from a private hook-local cache into a shared runtime lane that multiple map surfaces can read.

### 4. Hook rewrite

- `hooks/emergency/useMapRoute.js` no longer owns:
  - a private `Map` cache
  - a private in-flight route key guard
  - private route fetch helpers
  - private fallback route shaping
- `useMapRoute()` now:
  - resolves through TanStack Query
  - reads shared route snapshots from Zustand
  - reuses fresh route data across mounted consumers
  - writes route status once into the shared store

### 5. Stabilization follow-up

The first shared-store version introduced a real React depth risk. This pass also includes the corrective follow-up:

- `stores/mapRouteStore.js` now exports a stable `IDLE_MAP_ROUTE_STATUS` constant instead of relying on fresh inline idle objects
- `useMapRoute.js` now reads that stable idle object in its selector path
- cached shared-store hits no longer perform a redundant `setRouteResolved(...)`
- the dead `lastRouteFitKey` contract was removed from `useMapRoute()`

This follow-up is specifically meant to prevent `useSyncExternalStore` churn and the `Maximum update depth exceeded` error observed from `EmergencyLocationPreviewMap`.

## Outcome

After this pass:

- repeated same-route mounts can reuse one canonical snapshot
- simultaneous same-route fetches can dedupe on one query key
- fallback routes are cached briefly instead of immediately re-fanning into repeat retries
- route state is now much closer to the project’s five-layer direction than the previous hook-local model

## Verification Performed

- static code review of the shared route lane
- `prettier --write` / `prettier --check` on touched route files
- `git diff --check`
- `npx expo export --platform web --output-dir .tmp-route-hardening-web-check`
- `npx expo export --platform web --output-dir .tmp-route-loop-web-check`
- cleanup of the temporary export directories after verification

## Not Yet Verified

- live browser confirmation of the previous `Maximum update depth exceeded` repro
- runtime/device interaction smoke across all `useMapRoute()` consumers
- measured before/after directions call count in a live session

## Residual Notes

- The directions profile remains `mapbox/driving`. This pass deduplicates cost; it does not change the traffic-vs-road-following routing policy.
- Production web environment setup for `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` was handled outside this repo pass. That deployment concern is adjacent, but not part of the code diff here.

## Next Architectural Defaulters

The biggest remaining non-page state lanes after this pass are:

1. `VisitsContext` / `useVisitsData` / `visitsService`
2. `useMedicalProfile` / `medicalProfileService`

Those two domains still sit below the stronger five-layer bar and have broad cross-surface blast radius.

# Map Entity Render State Checkpoint (2026-05-01)

Status: Implemented in code, runtime device/browser repro confirmation still pending

## Scope

This pass hardened map entity rendering after route-state ownership was already moved onto the shared five-layer lane.

Precommit snapshot:

- branch: `main`
- HEAD: `28dea4b`

Primary surfaces affected:

- `components/map/FullScreenEmergencyMap.jsx`
- `components/map/HospitalMarkers.jsx`
- `components/emergency/intake/EmergencyLocationPreviewMap.jsx`
- `components/emergency/intake/EmergencyHospitalRoutePreview.jsx`
- `components/map/MapComponents.web.js`
- `hooks/map/useMarkerRenderPulse.js`
- `utils/emergencyContextHelpers.js`

## Why This Pass Was Needed

The remaining map defect class was not route calculation anymore. It was render-state divergence:

- route geometry could persist while endpoint markers disappeared
- hospital markers expected a stricter coordinate shape than route consumers
- the full-screen map still depended on native `showsUserLocation`
- image/custom markers were frozen too aggressively with `tracksViewChanges={false}`
- web marker rerenders could destroy and recreate markers on harmless prop churn

That meant `/map` had stronger route truth than marker truth.

## What Landed

### 1. Shared coordinate normalization for marker consumers

- `normalizeCoordinate()` in `utils/emergencyContextHelpers.js` now accepts the same broader coordinate shapes that route-owning map surfaces already tolerate:
  - `latitude/longitude`
  - `lat/lng`
  - `lon`
  - `coords.*`
  - `coordinate.*`
  - `location.*`
  - nested `coordinates.*`
  - GeoJSON-style coordinate arrays

Result:

- hospital markers and route consumers no longer disagree on whether a hospital has valid coordinates

### 2. App-owned user marker fallback on the full-screen map

- `FullScreenEmergencyMap.jsx` no longer relies on native `showsUserLocation`
- the user marker now renders from app-owned normalized coordinates through the shared `Marker` surface

Result:

- the user location marker can still render when the app has valid location truth but the provider-owned blue-dot layer does not

### 3. Controlled native marker render pulse for image-based markers

- `hooks/map/useMarkerRenderPulse.js` was added as the shared image-marker recovery hook
- `HospitalMarkers.jsx`
- `EmergencyLocationPreviewMap.jsx`
- `EmergencyHospitalRoutePreview.jsx`

now briefly enable `tracksViewChanges` after meaningful marker-key changes, then settle back to `false`

Result:

- first-paint and rebind failures for image/custom markers are less likely without keeping marker view tracking permanently hot

### 4. Web marker effect stabilization

- `MapComponents.web.js` marker creation no longer depends on a fresh spread `props` object
- marker lifecycle now tracks explicit option fields instead of rerender-noise
- invisible markers bail early before mount

Result:

- web marker destroy/recreate churn is reduced on harmless rerenders

### 5. Guardrail cleanup in the full-screen map owner

- `FullScreenEmergencyMap.jsx` now mirrors `mapPaddingRef.current = mapPadding` inline instead of through a no-op syncing effect
- stale dead imports and stale marker props were removed while landing the render-state fix

Result:

- this pass reduces one of the documented `useEffect` guardrail violations in the map runtime

### 6. Native and web marker sizing normalization

- `HospitalMarkers.jsx` now renders native hospital image markers as explicit child views with fixed `width`/`height` and bottom-center anchor geometry.
- `RouteLayer.jsx` now renders the ambulance marker as a fixed-size native image child on mobile and passes `imageSize` on web.
- `MapComponents.web.js` already supports explicit `imageSize`; this pass supplies it for raw asset markers so web marker icons no longer scale from full source pixel dimensions.
- **Additional fix**: Modified `buildResolvedMarkerIcon` in `MapComponents.web.js` to respect explicit `imageSize` props instead of overriding them with automatic scaling logic.
- **Android-specific fix**: Added `image={null}` to native markers and moved sizing to View wrapper to prevent default marker image conflicts and ensure exact sizing control.

Result:

- Android native marker scale is constrained to the intended design size instead of rendering enormous asset dimensions.
- Web marker size behavior now matches the same explicit sizing contract used by native marker children, with proper respect for `imageSize` parameters.
- Native markers explicitly disable default images to prevent scaling conflicts.

## Outcome

After this pass:

- route and marker consumers share the same coordinate normalization contract
- full-screen user-marker presence is app-owned instead of provider-owned
- preview/detail marker layers get controlled recovery pulses after coordinate or selection changes
- web marker rendering is less fragile under rerender churn

## Verification Performed

- static review of the touched map entity render owners
- `prettier --write` / `prettier --check` on touched files
- `git diff --check`
- `npm run build:web`

## Not Yet Verified

- live browser confirmation of the disappearing-marker repro
- live iOS and Android confirmation that image-marker pulses fully remove the first-paint miss
- confirmation that no additional marker pulse tuning is needed for lower-end Android devices

## Remaining Map Debt

This pass improves render reliability, but it does not finish the whole map backlog.

Still outstanding:

1. `EmergencyRequestModal` and its legacy ambulance/bed bridge ownership are still live compatibility surfaces
2. `EmergencyIOSMobileIntakeView` still owns too much local route-preview and hospital-switch state through effect-driven synchronization
3. map entity render state is stronger now, but it is still not yet modeled as its own full five-layer feature lane with a dedicated lifecycle machine and UI atoms

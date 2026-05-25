---
status: living
owner: architecture
last_updated: 2026-05-24
---

# Phase 6d Post-Mortem — iOS Map Loading Regression

> **Severity**: Critical — full app unusable on iOS for several hours.
> **Date**: 2026-04-26
> **Discovered**: Immediately after Phase 6d landed in dev.
> **Resolved**: Same session via 4 minimal upstream fixes + 1 store-level guard.
> **Extracted to standalone postmortem**: 2026-05-24 (was inline in `architecture/state/GOLD_STANDARD_STATE_ROADMAP.md`).

## Symptom Surface

- iOS only — Android worked throughout.
- Map screen stuck on `"Loading map / Live surface"` overlay forever.
- Even after overlay dismissal experiment, map showed only the static `loadingBackgroundImageUri` — no live tiles.
- Authenticated users were also bounced back to Welcome screen on cold start (separate but co-occurring issue).
- Worked on Metro restart sometimes; reload often re-broke it.
- `react-native-maps` itself worked when isolated (bare `MapView` test rendered tiles + fired `onMapReady`).

## Debugging Journey (the struggles)

This took **multiple iterative log + reload cycles** to isolate. Notable wrong turns:

1. **First hypothesis** — overlay state machine bug. Added a session latch in `useMapLoadingState`. Helped overlay dismiss but underlying `mapReadiness.mapReady` was never propagating.
2. **Second hypothesis** — store re-render not firing. Added `[MapCB]` log. Confirmed `setMapReadiness` IS dispatching and the parent IS re-rendering with new `mapReadiness`. So why wasn't `useMapLoadingState`'s effect firing?
3. **Third hypothesis** — native map module broken. Added a bare `<MapView>` directly in `MapScreen`. It rendered tiles and fired `onMapReady` — proving `react-native-maps` was fine.
4. **Fourth hypothesis (WRONG — noted for honesty)** — suspected `mapType="mutedStandard"` was silently failing on iOS dev clients. Switched to `"standard"` and observed tiles loading. **This was a misattribution.** The map was actually rendering all along; the loading overlay was just covering it. The latch and validity fixes I added in parallel were what actually unblocked rendering. `mutedStandard` is a valid Apple Maps style with no entitlement requirements. Decision: keep `"standard"` for now since it's the simpler default, but `mutedStandard` can be used freely in iOS dev or prod.
5. **Real cause finally surfaced** via `[MapLoad] render` log: `hasActiveLocation` was flipping from `true` → `false` between renders, **even though `[MapLoc] sources` reported `activeLocation: "set"`**. The `||` chain was picking up a truthy-but-empty `emergencyUserLocation` object from the Zustand store.

The deceptive thing: each component's logging looked locally consistent, but the boolean derivation `hasActiveLocation = Boolean(loc.latitude && loc.longitude)` quietly disagreed with the upstream `||` chain that only checked truthiness.

## Root Causes (multi-layered)

1. **`useMapLocation` `||` chain accepted truthy-but-coordinate-less objects.** Phase 6d migrated `userLocation` from local `useState` → Zustand `useLocationStore`. The store could hold a partial/empty object that was truthy but had no valid `latitude`/`longitude`. The `||` chain `manualLocation?.location || emergencyUserLocation || globalUserLocation` picked the empty store object and short-circuited — masking `globalUserLocation`'s real coordinates. `hasActiveLocation = Boolean(lat && lng)` then evaluated `false`, blocking `isMapFrameReady` forever.

2. **`isMapReady` fallback timeout was guarded by `hasLocation`.** The 900ms safety timer in `EmergencyLocationPreviewMap` would only schedule if `hasLocation` was already truthy at the time the effect ran. If location arrived later, the timer never fired and there was no compensation if `onMapReady` was delayed by other render churn. Compounded with #1 to leave the overlay stuck.

3. **AuthContext race window on iOS.** `loading` flipped to `false` (in `finally`) before `user`/`token` were set from the slower iOS network `getCurrentUser()` call. `/(user)/_layout` saw `loading=false && isAuthenticated=false` and redirected authenticated users to `/(auth)`. Independent of map issue but co-occurring on iOS only because the iOS network path is slower.

## Fixes Applied (all minimal, upstream)

| File | Fix |
|---|---|
| `hooks/map/exploreFlow/useMapLocation.js` | Added `hasValidCoords()` guard. Each location source must have finite `latitude`/`longitude` before being accepted by the `\|\|` chain. |
| `hooks/map/exploreFlow/useMapLoadingState.js` | Added `hadLocationLatchRef` so once we've ever had a valid location this mount, it stays effective. Defends against transient flapping mid-render. |
| `components/emergency/intake/EmergencyLocationPreviewMap.jsx` | Removed `!hasLocation` guard from `isMapReady` fallback timeout so it always fires. (Switched `mapType` to `"standard"` during debugging — retained as a simpler default, but `mutedStandard` is also valid; this was not a real fix.) |
| `contexts/AuthContext.jsx` | Seed `user`/`token` from `database.read(StorageKeys.CURRENT_USER)` synchronously before the async `getCurrentUser()` API call. |
| `stores/locationStore.js` (defense-in-depth) | `setUserLocation` and `patchUserLocation` now reject objects without finite `latitude`/`longitude`. Empty/partial objects can no longer enter the store as truthy sentinels. |

## Permanent Architectural Rules (added to canon)

1. **Never use `||` chains over objects when you actually need field validity, not truthiness.** Always validate the field consumers will gate on (`lat/lng`, `id`, `requestId`). Empty-object sentinels in stores are a recurring pitfall.
2. **Zustand stores migrated from `useState` MUST preserve null-vs-set semantics.** Don't store `{}`. Store `null`. Validate at the action entry point.
3. **Don't assert hypotheses as root causes without isolated verification.** During this session I claimed `mutedStandard` was the bug because the symptom went away when I changed it — but I had also changed two other things. Always isolate one variable at a time before declaring root cause.
4. **Auth guards in route layouts must not rely on `loading` alone.** Always seed from cache before async network sync, so `loading=false` implies authoritative state. The `loading→false` transition is a contract, not a hint.
5. **Fallback timers must not be guarded by the very state they're meant to compensate for.** If a 900ms timeout exists to ensure readiness when `onMapReady` doesn't fire, it must not be conditional on `hasLocation`.
6. **When derivation of a downstream boolean disagrees with an upstream "set/null" log, the bug is in the predicate.** Always log the predicate components, not just truthiness.

## Audit of Sibling Stores (post-fix)

| Store | Truthy-empty risk | Verdict |
|---|---|---|
| `modeStore.js` | Primitives only (`string \| null`) | ✅ Safe |
| `coverageStore.js` | `coverageModeOperation` always written with full shape | ✅ Safe |
| `emergencyTripStore.js` | Trip objects always carry `requestId`; consumers gate on it | ✅ Contained |
| `locationStore.js` | **Was vulnerable** | ✅ Now hardened (validity guard added) |

## Outstanding Tech Debt

- [ ] Consider adding a runtime dev-only assertion: if a Zustand store action receives an object missing required fields, throw in `__DEV__` to surface bugs at write time.
- [ ] Optional: re-enable `mutedStandard` on iOS for the muted Apple Maps look — fully supported, no entitlements required.

## Related Documents

- Originating phase: `architecture/state/GOLD_STANDARD_STATE_ROADMAP.md` § Phase 6d
- Architectural rules added: see `REFACTORING_GUARDRAILS.md` (5-layer doctrine)

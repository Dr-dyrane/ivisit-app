# Map Route State Implementation Checkpoint (2026-04-29)

Status: Implemented in code, live browser/device repro confirmation still pending

## Scope

This pass finishes the route-state migration beyond the earlier shared-cache hardening.

The prior pass already landed:

- `routeService`
- shared TanStack Query key
- shared Zustand cache/status lane
- rewritten `useMapRoute()`
- selector-stability fix for the max-depth loop risk

This checkpoint covers the missing lifecycle and UI layers.

## What Landed

### Layer 1–3 follow-through stayed intact

The existing route hardening remains the base:

- `services/routeService.js`
- `hooks/emergency/mapRoute.queryKeys.js`
- `stores/mapRouteStore.js`
- `hooks/emergency/useMapRoute.js`

This pass extends those layers instead of replacing them.

### Layer 4: global route lifecycle machine

- `machines/mapRouteMachine.js`
- `hooks/emergency/useMapRouteLifecycle.js`
- `hooks/emergency/useMapRouteBootstrap.js`

The routing infrastructure now has a real shared lifecycle:

- `idle`
- `resolving`
- `resolved`
- `fallback`
- `error`

This is intentionally a shared infrastructure machine, not a per-route-key XState actor.

### Layer 5: route UI atoms

- `atoms/mapRouteAtoms.js`

Current atom ownership:

- `mapRouteFitModeAtom`
- `mapRouteAutoFitSuppressedAtom`
- `mapRouteRetryBannerVisibleAtom`
- `mapRouteLastSourceAtom`

`useMapRoute()` now exposes the route UI lane alongside the shared data lane, and the route bootstrap keeps the shared retry/fallback atoms in sync with the lifecycle machine.

### Store/runtime completion

`stores/mapRouteStore.js` now also owns shared lifecycle facts:

- `activeRequestCount`
- `lastRouteKey`
- `lastResolvedRouteKey`
- `lastResolvedWasFallback`
- `lastResolvedSource`
- `lastError`
- `lifecycleState`
- `lifecycleError`

### Service metadata refinement

`services/routeService.js` now tags route results with `source`:

- `mapbox`
- `osrm`
- `fallback`

That metadata is now preserved through the store, machine, and atoms.

## Verification Performed

- static review of route machine/store/hook integration
- `prettier --write` on touched route/runtime files
- `git diff --check`
- `npx expo export --platform web --output-dir .tmp-state-pass-web-check`

## Not Yet Verified

- live repro confirmation that the earlier `Maximum update depth exceeded` case stays fixed after the machine/atom completion
- live browser/device confirmation of fallback/error UI behavior
- measured directions call count after the full five-layer route completion

## Residual Notes

- Route state is now a real five-layer feature, but the current UI still does not surface every new atom. The contract is in place so future map surfaces can consume route presentation state without rebuilding the data lane.
- This pass keeps the non-traffic `mapbox/driving` policy. It improves ownership and dedupe, not routing product policy.

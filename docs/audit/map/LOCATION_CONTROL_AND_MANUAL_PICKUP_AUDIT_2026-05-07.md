---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Location Control And Manual Pickup Audit 2026-05-07

## Problem Statement

Testers hit the live `/map` flow with location services off and the app still behaved as if it had a trustworthy pickup area. That caused three linked failures:

1. stale fallback coordinates were treated like current location
2. users were not clearly shown how to change pickup manually
3. hospital discovery and billing-country changes did not reliably follow a manual pickup change

This pass hardens the live location contract before broader `/map` decomposition continues.

## Root Causes

### 1. Silent fallback disguised as live location

- `GlobalLocationContext` previously fell back into cached coordinates without keeping the UX in an error/degraded state.
- A tester with location off could still see a pickup card and hospital tags as if device location was healthy.

### 2. Hydrated device coordinates stayed trusted after relaunch

- `locationStore` could rehydrate a previously saved device coordinate with a `device` source.
- That made stale stored coordinates look like live GPS on a new launch.

### 3. Broken location propagation into the hospital query lane

- Some code paths still called Zustand `setUserLocation` like React state:
  - `setUserLocation((current) => ...)`
- In the store lane, that pattern is invalid and can no-op.
- Result: manual pickup changes could fail to propagate into hospital discovery.

### 4. Manual search did not preserve country truth

- Mapbox suggestions were not consistently preserving `countryCode`.
- Billing-country override and remote-booking verification could not reliably follow a manual pickup change.

### 5. Explore intent and search copy were too generic

- `/map` still looked like a generic care search even when pickup truth was missing.
- Users expecting an address form were not being guided into the location-search path.

## Guardrail Alignment

This pass follows the location control doctrine:

- canonical shared truth lives in store/service lanes
- contexts orchestrate and expose runtime state
- UI derives from explicit permission/source/error state
- no blind `useEffect` mirroring for location updates where direct action/store writes are sufficient

## Implemented Fixes

### Canonical location truth

- `hooks/map/exploreFlow/mapPickupLocationTruth.js`
  - live `/map` pickup truth is now normalized through one pure resolver
  - explicit trust order:
    1. session manual pickup
    2. live device location
    3. saved manual fallback
    4. saved device fallback
    5. missing pickup
  - raw context/store source strings no longer decide `/map` behavior directly

- `stores/locationStore.js`
  - persisted device coordinates now hydrate as `persisted`, not `device`
  - only explicit manual selections remain trusted as manual across relaunch

- `contexts/GlobalLocationContext.jsx`
  - explicit permission and services-off states remain visible
  - request flow now returns a deterministic result object
  - app no longer treats denied/services-off state as a healthy current location path

- `hooks/emergency/useEmergencyLocationSync.js`
  - only seeds emergency location from global location when the source is truly `device`

### Live `/map` pickup control

- `hooks/map/exploreFlow/useMapLocation.js`
  - now consumes the normalized pickup truth contract instead of resolving competing sources inline
  - manual pickup writes directly to the shared location store
  - manual pickup updates billing-country override when country truth exists
  - current-location CTA uses returned permission truth instead of guesswork

- `hooks/map/exploreFlow/useMapExploreFlow.js`
  - passes permission/source/place/error inputs into the live location hook
  - returns `locationControl` as a first-class UI contract

- `screens/MapScreen.jsx`
  - auto-opens location mode once on `/map` when no trusted pickup exists
  - search CTA now opens location mode when pickup selection is still unresolved

### Explore intent UX

- `components/map/views/exploreIntent/*`
  - hospital summary card now flips into a pickup-setup card when location is unresolved
  - primary CTA: device location / settings route
  - secondary CTA: manual address search

### Manual search UX

- `components/map/surfaces/search/*`
  - search sheet location mode is now pickup-focused
  - clearer pickup copy and placeholder
  - location-off and manual-entry guidance is visible inside the live search surface

### Country metadata propagation

- `services/mapboxService.js`
- `components/map/surfaces/search/mapSearchSheet.helpers.js`
- `utils/locationHelpers.js`

Manual pickup results now preserve `countryCode` where available, so billing-country overrides can follow the selected pickup area.

### Remaining broken setter sites removed

- `screens/MapEntryLoadingScreen.jsx`
- `screens/RequestAmbulanceScreen.jsx`

These legacy/bridge paths now use direct store writes instead of invalid functional updater calls.

## Scope Boundaries

This pass improves:

- location-off honesty
- manual pickup discoverability
- canonical pickup propagation
- nearest-hospital refresh reliability
- billing-country readiness for remote booking tests

This pass does **not** yet fully cover:

- downstream `change location` affordances in hospital detail and service detail
- upstream quoted-price propagation into hospital detail and service detail
- full `/map` five-layer decomposition of camera, marker, route, and controls
- retirement of legacy emergency intake owners

## Verification

- `npm run build:web` passed
- `git diff --check` clean apart from existing LF/CRLF warnings
- no remaining runtime `setUserLocation((current) => ...)` call sites remain in code

## Follow-On

Recommended next pass after tester confirmation:

1. finish hospital detail and service detail pickup-edit affordances
2. keep tracking read-only for pickup edits unless a real request-destination mutation path is added
3. finish location truth ownership migration so provider-local state shrinks further
4. continue `/map` decomposition into clearer camera/marker/route controllers

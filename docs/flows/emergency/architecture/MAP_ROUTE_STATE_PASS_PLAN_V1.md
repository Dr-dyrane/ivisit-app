# Map Route State Pass Plan (v1)

Status: Implemented in code on 2026-04-29, live verification pending

Checkpoint:

- `docs/audit/MAP_ROUTE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`

## Intent

Complete the route-calculation lane from its current three-layer hardening state into a true five-layer feature.

This pass should keep the shared dedupe/cost fix already landed and add only the missing layers that have real ownership value.

## Scope

Primary owners in scope:

- `services/routeService.js`
- `hooks/emergency/useMapRoute.js`
- `hooks/emergency/mapRoute.queryKeys.js`
- `stores/mapRouteStore.js`
- route consumers across preview, detail, decision, and tracking-adjacent surfaces

## Current Posture

Already landed:

- Layer 1 provider/service
- Layer 2 query contract
- Layer 3 shared runtime store

Missing:

- Layer 4 lifecycle machine
- Layer 5 shared ephemeral UI atoms

## Target Architecture

### Layer 1: provider / backend service

Keep `services/routeService.js` as the canonical route provider adapter:

- route key generation
- road route fetch
- provider fallback
- direct-line fallback
- TTL/freshness helpers

### Layer 2: TanStack Query

Keep and extend the existing route query contract:

- `hooks/emergency/mapRoute.queryKeys.js`
- `useMapRoute()` or successor hooks built on top of the same key contract

Minimum contract:

- one query key per `origin + destination + profile`
- shared fetch dedupe
- consistent stale/fresh rules

### Layer 3: Zustand

Extend `stores/mapRouteStore.js` so it owns not just route snapshots but shared route-intent runtime state where that state is not purely ephemeral.

Potential ownership:

- `routesByKey`
- `statusesByKey`
- `activeRouteIntent`
- `activeRouteKeyByIntent`
- `lastResolvedAtByIntent`

### Layer 4: XState

Add a dedicated route lifecycle machine:

- `machines/mapRouteMachine.js`
- `hooks/emergency/useMapRouteLifecycle.js`

Minimum states:

- `idle`
- `loading`
- `resolved`
- `fallback`
- `error`
- `stale`
- `retrying`

This machine should own legality and transitions, not the coordinates themselves.

### Layer 5: Jotai

Add named atoms only for shared ephemeral route UI concerns, for example:

- `routeFitModeAtom`
- `routeRetryBannerVisibleAtom`
- `routeWarningsDismissedAtom`
- `routeSourceDisclosureVisibleAtom`
- `routeAutoRefitSuppressedAtom`

These should stay UI-only and should not duplicate route geometry truth.

## Consumer Contract Direction

The current imperative model is:

- each consumer effect calls `calculateRoute(origin, destination)`

The stronger end state should move toward:

- declarative route intent registration
- consumers read canonical route result by intent
- lifecycle and UI state are no longer reinvented per surface

That does not require changing every consumer at once, but it should be the directional contract.

## Required Deliverables

### 1. State management

- route lifecycle machine
- named route UI atoms
- clearer intent contract above raw route cache keys

### 2. UI quality

- retry/fallback messaging becomes truthful and shared
- route loading/retry behavior stays consistent across route-owning surfaces
- no blank route-state pauses

### 3. DRY / modular code

- route lifecycle legality leaves consumer effects
- consumers stop owning their own route warning/retry semantics

### 4. Documentation

- keep the existing hardening checkpoint as the baseline
- add an implementation checkpoint when the full five-layer completion lands

## Suggested Execution Order

1. define route intent contract
2. add route lifecycle machine
3. add route UI atoms
4. adapt `useMapRoute()` or add a higher-level route facade hook
5. migrate preview/detail/decision surfaces to the stronger contract
6. write checkpoint and verification notes

## Verification Target

- no duplicate same-route calls across preview/detail/decision surfaces
- consistent fallback/error/retry legality across route-owning surfaces
- shared route UI state no longer lives ad hoc in consumers
- route state is explicitly documented as full five-layer after completion

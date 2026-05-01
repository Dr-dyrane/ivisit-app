# Map Route State Architecture Audit (2026-04-29)

Status: Baseline captured after the shared route dedupe hardening pass and before full five-layer completion

## Scope

Audit the canonical route-calculation lane that now powers shared map route previews and directional context.

Primary owners audited:

- `services/routeService.js`
- `hooks/emergency/useMapRoute.js`
- `hooks/emergency/mapRoute.queryKeys.js`
- `stores/mapRouteStore.js`
- route-owning consumers such as preview map, hospital detail, ambulance decision, and bed decision

## Current Posture

The route-calculation lane is materially better than before, but it is not yet a full five-layer feature.

Today the route lane is:

- Layer 1: `services/routeService.js`
- Layer 2: TanStack Query via `useMapRoute.js` + `mapRoute.queryKeys.js`
- Layer 3: shared runtime cache/status lane in `stores/mapRouteStore.js`

It is not yet:

- machine-owned lifecycle legality
- Jotai-owned shared ephemeral route UI state

## Strengths Already Present

1. Duplicate directions calls are now structurally reduced.
   Same-route mounts can reuse a shared query/store result instead of each hook instance owning its own fetch/cache lane.

2. Fallback behavior is now centralized.
   Mapbox fetch, OSRM fallback, direct-line fallback, and TTL freshness rules all live in one service layer.

3. Shared runtime truth now exists.
   Route snapshots and route statuses are no longer private to one hook instance.

4. The max-depth selector loop was already corrected.
   The shared store now uses a stable idle status constant and no longer trips `useSyncExternalStore` with fresh inline default objects.

## Core Gaps

### 1. No lifecycle machine

There is no explicit route lifecycle machine yet.

The current store status values are useful, but they do not model a richer shared lifecycle such as:

- `idle`
- `loading`
- `resolved`
- `fallback`
- `error`
- `stale`
- `retrying`

This matters because route state is now shared across multiple surfaces and no longer just a local fetch detail.

### 2. No named Jotai lane

There is no explicit shared UI-state lane for route-specific ephemeral concerns such as:

- auto-refit suppression
- retry-banner visibility
- route-source disclosure
- user-dismissed route warnings
- active fit mode

Right now those concerns either do not exist yet or remain local in consumers.

### 3. Route ownership is still imperative per consumer

Consumers still call `calculateRoute(origin, destination)` in their own effects.

That is acceptable after dedupe hardening, but it is still weaker than a declarative route-intent model where the shared route lane knows:

- which route intent is primary
- which route source owns the active preview
- when a route is stale vs intentionally suppressed

### 4. No canonical intent model

The system currently keys by `origin + destination + profile`, which is the correct cache identity.

But it does not yet own higher-level intent concepts like:

- preview route
- hospital detail route
- ambulance decision route
- bed decision route
- tracking route

That means the lane is cache-correct but not yet product-semantic.

## Product Risk

The pass already solved the most urgent cost/dedupe issue, but the route lane is still less mature than the project's strongest five-layer features.

That creates two follow-on risks:

1. future route UI complexity could reappear in consumers instead of a canonical state lane
2. lifecycle legality may stay implicit across many route-owning surfaces

## Required Outcome

The next route-state pass should produce:

- a true route lifecycle machine
- a named Jotai lane for shared ephemeral route UI concerns
- a clearer shared route-intent contract above raw cache keys

## Non-Goals

This pass should not:

- reintroduce per-hook private caches
- change the road-following routing profile without an explicit product/cost decision
- over-persist route UI state that should remain ephemeral

## Pass Direction

Route state is now five-layer-ready, but not fully five-layer yet.

The next pass should complete it deliberately, not just add machine/atoms ceremonially.

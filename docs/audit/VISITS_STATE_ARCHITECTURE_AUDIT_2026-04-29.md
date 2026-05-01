# Visits State Architecture Audit (2026-04-29)

Status: Baseline captured before the five-layer visits-domain migration

## Scope

Audit the canonical `visits` domain as it exists today, after the map/history ownership pass but before a full state-lane modernization.

Primary owners audited:

- `contexts/VisitsContext.jsx`
- `hooks/visits/useVisitsData.js`
- `services/visitsService.js`
- `/map` history and visit-detail consumers
- `Book Visit`, `Notifications`, `Search`, `Mini Profile`, and tracking consumers that still read the shared provider lane

## Current Posture

The visits product surface is more modern than before, but the canonical state lane is still legacy-shaped.

Today the domain is effectively:

- Layer 1: `services/visitsService.js`
- Layer 2.5: `hooks/visits/useVisitsData.js` with local `useState`
- Compatibility boundary: `contexts/VisitsContext.jsx`

It is not yet:

- Query-backed canonical collection truth
- persisted shared store truth
- explicit lifecycle machine
- named Jotai UI ownership per major consumer surface

## Strengths Already Present

1. The backend and service truth are real.
   `visitsService` already owns list, create, update, cancel, complete, delete, request/display-id resolution, lifecycle notifications, and emergency-linked hydration.

2. Realtime already exists.
   `useVisitsData.js` subscribes to `public.visits` for the authenticated user and merges inserts, updates, and deletes back into the shared collection.

3. Product ownership is already corrected at the UX layer.
   `/map` owns primary history/detail experience and the legacy `visits` routes are compatibility bridges.

4. `Book Visit` already hardened its own draft surface.
   The booking route now has its own stronger screen-level state lane, but it still submits through the shared visits provider.

## Core Gaps

### 1. Shared provider still owns canonical collection truth

`VisitsContext` is now thinner than before, but it is still the app-wide owner of:

- collection state
- loading state
- CRUD entry points
- lifetime stats

That means:

- every consumer depends on a React context collection
- query dedupe and invalidation are not first-class
- collection hydration and mutation behavior are still hidden inside one hook/provider pair

### 2. Query layer does not exist

`useVisitsData.js` fetches with local `useState`, not TanStack Query.

Consequences:

- no canonical query key
- no shared stale/fresh semantics
- no optimistic mutation contract
- no explicit refetch policy after auth or lifecycle mutation
- no route-level or surface-level query composition for downstream consumers

### 3. No persisted collection/runtime store

There is no visits-domain Zustand store that owns:

- collection snapshot
- hydration timestamp
- mutation timestamp
- active grouped history buckets
- shared selected visit snapshot for `/map` and notification-details consumers

The current provider is runtime-only and re-derives collection state through the hook.

### 4. No lifecycle machine

There is no XState lane that models visits-domain legality such as:

- bootstrapping
- awaiting auth
- syncing
- mutation pending
- realtime stale
- error recovery

This matters because the visits domain now feeds:

- map history
- visit details
- tracking/rating flows
- notification-details visit handoff
- search ranking
- mini-profile history preview

### 5. No named Jotai ownership for shared visits UI concerns

Screen-local UI work is still scattered across consumers.

There is no explicit Jotai lane for shared visits-domain ephemeral UI like:

- selected history group
- selected visit id for map-owned details
- route-backed revisit focus
- notification-to-visit deep-link handoff state
- history sort/display preferences if those become shared

### 6. Blast radius remains wide

Current direct consumers of `useVisits()` include:

- `MapScreen`
- `MapHistoryModal`
- `MapTrackingStageBase`
- `MapExploreIntentRecents`
- `MiniProfileModal`
- `Search` ranking/model
- `NotificationDetails`
- `Book Visit`
- request / commit controllers

So the current provider lane is not a small legacy pocket. It is still a cross-product backbone.

## Product Risk

The app has already corrected the surface ownership of history and visit details, but the state lane under that product correction is still weaker than the surrounding architecture direction.

That creates three risks:

1. visits remain harder to reason about than emergency contacts, notifications, or the newer route-state lane
2. new consumers will keep coupling themselves to `VisitsContext`
3. the app can modernize more UI while still carrying one oversized cross-surface collection hook underneath it

## Required Outcome

The next visits-domain pass should produce:

- one canonical query-backed visits collection
- one persisted shared runtime store
- one explicit lifecycle machine
- one compatibility facade for legacy consumers while migration is underway
- one named Jotai layer for shared visits UI handoff state where that state is truly cross-surface

## Non-Goals

This pass should not:

- resurrect the deprecated full-screen visits route as the product owner
- create a second history collection beside `visits`
- move list-only UI back into the canonical collection provider
- treat `Book Visit` draft state as identical to canonical visits collection truth

## Pass Direction

The correct next move is a true visits-domain architecture pass, not another UI-only history polish pass.

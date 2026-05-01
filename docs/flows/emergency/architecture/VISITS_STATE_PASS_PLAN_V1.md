# Visits State Pass Plan (v1)

Status: Implemented in code on 2026-04-29, live verification pending

Checkpoint:

- `docs/audit/VISITS_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`

## Intent

Bring the canonical `visits` domain up to the real five-layer state standard so the app's map-owned history, visit details, notifications handoff, booking completion, and search ranking all read from one coherent lane.

This is not another screen pass.

This is the visits-domain state migration that should follow the product ownership work already completed in the map/history wave.

## Scope

Primary owners in scope:

- `contexts/VisitsContext.jsx`
- `hooks/visits/useVisitsData.js`
- `services/visitsService.js`
- map-owned history and visit details
- notification-details visit handoff
- search ranking / search screen reads
- booking submit handoff into canonical collection truth
- emergency request/commit flows that write or read visit lifecycle truth

## Target Architecture

### Layer 1: provider / backend service

Keep `services/visitsService.js` as the canonical backend mapping and mutation lane, but make its role explicit:

- list
- create
- update
- cancel
- complete
- delete
- rating update
- request/display-id resolution
- notification side effects
- emergency-linked hydration

Add a dedicated realtime helper if needed instead of burying all subscription logic in the data hook.

### Layer 2: TanStack Query

Create a canonical visits query lane:

- `hooks/visits/visits.queryKeys.js`
- `hooks/visits/useVisitsQuery.js`
- `hooks/visits/useVisitsRealtime.js`
- `hooks/visits/useVisitsMutations.js`

Minimum query contract:

- collection key: `["visits", userId]`
- detail key: `["visit", userId, visitKey]`
- explicit post-mutation invalidation or optimistic updates
- explicit auth gating
- shared freshness semantics for all consumers

### Layer 3: Zustand

Create a persisted runtime store, for example:

- `stores/visitsStore.js`
- `stores/visitsSelectors.js`

Minimum store ownership:

- canonical collection snapshot
- `ownerUserId`
- `hydrated`
- `lastSyncAt`
- `lastMutationAt`
- collection stats
- grouped-history projection inputs or cached selectors where useful
- optional selected-visit snapshot for shared handoff surfaces if that proves cross-surface, not screen-local

### Layer 4: XState

Create a visits-domain lifecycle machine:

- `machines/visitsMachine.js`
- `hooks/visits/useVisitsLifecycle.js`

Minimum states:

- `bootstrapping`
- `awaitingAuth`
- `syncing`
- `ready`
- `mutationPending`
- `stale`
- `error`

This machine should own legality, not the collection itself.

### Layer 5: Jotai

Add Jotai only for real shared ephemeral UI concerns, not just to satisfy doctrine cosmetically.

Probable candidates:

- selected map-history group
- selected visit id for cross-surface handoff
- notification-originated detail focus
- deep-link-origin metadata
- history presentation mode if shared across map/history/detail surfaces

If a concern stays screen-local, keep it local.

## Compatibility Strategy

`VisitsContext` should become a compatibility facade, not the canonical state owner.

Target end state during migration:

- `useVisits()` still works for existing consumers
- internally it resolves through Query + Zustand + machine-backed facade behavior
- legacy consumers are migrated incrementally without breaking the app in one sweep

## Consumer Convergence

Primary consumers to move onto the canonical facade/store selectors:

- `MapHistoryModal`
- map-owned visit details
- `MiniProfileModal`
- `NotificationDetails`
- `Search` ranking/model
- `Book Visit` success handoff
- emergency request and commit controllers that write lifecycle truth
- any remaining compatibility visit bridge screens

## Required Deliverables

### 1. State management

- real Query lane
- real persisted store lane
- real lifecycle machine
- compatibility facade

### 2. UI quality

- no user-facing regression in map history, visit details, booking completion, or notifications handoff
- loading states should stay structural and believable

### 3. DRY / modular code

- collection fetch/realtime/mutation logic must leave `useVisitsData.js`
- provider becomes thin compatibility boundary
- grouped selectors live in named selectors, not scattered ad hoc derivations

### 4. Documentation

- keep the existing history ownership docs
- add implementation checkpoint when the migration lands
- explicitly record what stayed outside scope

## Suggested Execution Order

1. carve query keys and canonical query hooks
2. add visits store and selectors
3. add lifecycle machine
4. convert `VisitsContext` to compatibility facade
5. migrate map history + notification-details + search reads
6. migrate booking/emergency mutation consumers
7. write checkpoint and verification notes

## Verification Target

- one canonical visits collection read path across map, notifications, search, and booking completion
- realtime updates converge through Query/store instead of a hook-local list
- notification to visit details opens against canonical collection truth
- booking success updates the canonical collection cleanly
- no direct product-critical consumers remain coupled to `useVisitsData()` internals

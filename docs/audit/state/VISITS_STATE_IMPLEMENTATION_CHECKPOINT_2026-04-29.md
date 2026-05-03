# Visits State Implementation Checkpoint (2026-04-29)

Status: Implemented in code, runtime interaction verification still pending

## Scope

This pass migrated the canonical `visits` domain from a hook-local provider lane to a real five-layer feature.

Primary owners touched:

- `services/visitsService.js`
- `hooks/visits/*`
- `stores/visitsStore.js`
- `stores/visitsSelectors.js`
- `machines/visitsMachine.js`
- `contexts/VisitsContext.jsx`
- `components/map/history/MapHistoryModal.jsx`
- runtime bootstrap and hydration hosts

## What Landed

### Layer 1: canonical service + realtime bridge

- `services/visitsService.js` now:
  - accepts explicit `userId` on `list(...)`
  - throws query errors instead of silently swallowing them
  - exposes a user-scoped realtime `subscribe(...)` helper

### Layer 2: shared query + mutations

- `hooks/visits/visits.queryKeys.js`
- `hooks/visits/useVisitsQuery.js`
- `hooks/visits/useVisitsRealtime.js`
- `hooks/visits/useVisitsMutations.js`

The mutation lane now owns optimistic create, update, cancel, complete, and delete behavior against canonical visit keys (`id`, `requestId`, `displayId`).

### Layer 3: persisted runtime snapshot

- `stores/visitsStore.js`
- `stores/visitsSelectors.js`

The store now owns:

- canonical visit snapshot
- `ownerUserId`
- hydration
- lifecycle metadata
- mutation counts
- retry signaling
- persisted cache via `StorageKeys.VISITS_CACHE`

Legacy `StorageKeys.VISITS` hydration is still supported as a fallback source.

### Layer 4: lifecycle machine

- `machines/visitsMachine.js`
- `hooks/visits/useVisitsLifecycle.js`

The visits lane now has legal shared states for:

- `bootstrapping`
- `awaitingAuth`
- `syncing`
- `ready`
- `mutationPending`
- `error`

### Layer 5: ephemeral UI atoms

- `atoms/visitsAtoms.js`

This pass kept the visits-domain Jotai layer intentionally small and real:

- `visitHistoryFilterAtom` now owns the shared history filter preference used by `MapHistoryModal`

### Compatibility + bootstrap

- `hooks/visits/useVisitsBootstrap.js`
- `hooks/visits/useVisitsFacade.js`
- `contexts/VisitsContext.jsx`
- `hooks/visits/useVisitsData.js`

`VisitsContext` is now a thin compatibility facade. Query/realtime/lifecycle bootstraps run once in `RootBootstrapEffects`, while existing `useVisits()` consumers keep the same broad contract.

## Consumer Outcome

The following consumers now read from the canonical visits facade instead of a hook-local collection owner:

- `MapScreen`
- `MapHistoryModal`
- `MapTrackingStageBase`
- `Search`
- `MiniProfileModal`
- `NotificationDetails`
- `Book Visit`
- emergency request/commit flows

## Verification Performed

- `prettier --write` on touched visits/runtime files
- `git diff --check`
- `npx expo export --platform web --output-dir .tmp-state-pass-web-check`

## Not Yet Verified

- live runtime interaction smoke across map history, booking completion, notification handoff, and tracking updates
- before/after realtime behavior confirmation on device

## Residual Notes

- `VisitsProvider` was being mounted twice in the user tree. This pass added `VisitsBoundary` so nested mounts no longer duplicate the compatibility facade.
- The global visits lane is now ready to absorb future detail-query work if a dedicated `visit` query key becomes necessary.

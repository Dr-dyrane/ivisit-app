---
status: living
owner: architecture
last_updated: 2026-05-24
---

# iVisit Gold Standard State Architecture â€” Migration Roadmap

> **Reconciliation Note â€” 2026-05-24:** Phases 1â€“7 complete. `EmergencyContext.jsx` was **not deleted** â€” it remains as a thin compatibility/orchestration shell (~228 lines) over `hooks/emergency/*`, exposing a stable consumer surface during the long-tail migration of remaining screens. New domain state must go to the correct five-layer owner (L1â€“L5) and **not** back into `EmergencyContext`. See [`../overview/ARCHITECTURE.md`](../overview/ARCHITECTURE.md) Â§9 (Compatibility Layer â€” Contexts) and [`AGENTS.md`](../../../AGENTS.md) Â§Migration Awareness.

**Status**: Phase 6 COMPLETE â€” EmergencyContext retired as state owner (kept as thin orchestrator)
**Documented**: 2026-04-26 (last reconciled 2026-05-24)
**Context**: iVisit is a global emergency medical app ($10M valuation, $15M post-revamp).
Gold standard is non-negotiable. One hospital onboarding via ivisit-console triggers store launch.

---

## Why This Migration

### Current limitations

- `activeAmbulanceTrip`, `activeBedBooking`, `pendingApproval`, `commitFlow` are all `useState`
- A Metro restart wipes trip state â€” user loses tracking context
- Payment â†’ tracking transition is non-deterministic (relies on `syncActiveTripsFromServer` timing)
- Any `useEmergency()` subscriber re-renders when any context value changes
- Hospital data is re-fetched imperatively, not cached
- No illegal-state prevention â€” boolean flags can contradict each other

### What apps at this scale actually use

Uber, Apple Maps, Google Maps all share the same architectural pattern:

```
Server Truth  â†’  Local Cache  â†’  UI Projection  â†’  Trip Lifecycle
  Supabase       TanStack Query    Jotai atoms       XState machine
  Realtime       + Zustand         (derived,          (trip state
  subscriptions  persist           never stored)       as events)
```

---

## Target Architecture

| Layer            | Technology                           | What it owns                    |
| ---------------- | ------------------------------------ | ------------------------------- |
| Server truth     | Supabase Realtime (already in place) | Live subscriptions              |
| Server cache     | TanStack Query                       | Hospitals, visits, server sync  |
| Global app state | Zustand + persist                    | Trip state (survives app kill)  |
| Local UI state   | Jotai atoms                          | Sheet phase, modals, snap state |
| Trip lifecycle   | XState machine                       | State machine for trip events   |

---

## Emergency Contacts Five-Layer Track

`EmergencyContacts` is now part of the gold-standard migration surface.

Required ownership split:

- Supabase / Realtime -> canonical `public.emergency_contacts`
- TanStack Query -> `["emergencyContacts", userId]`
- Zustand -> persisted contact snapshot, migration metadata, skipped legacy rows
- XState -> feature readiness, migration legality, mutation/sync state
- Jotai -> editor, modal, selection, and wizard state

Canonical rule:

- phone-first contact model
- no canonical `email` field
- legacy rows missing `phone` must surface in review instead of being dropped

This feature follows the same no-silent-drop discipline used in the trip-state migration.

Carry-forward for remaining stack pages:

- keep feature bootstrap at the app/runtime shell when hydration or migration is global
- keep route screens thin; wide-screen extra canvas should become context panels, not wider forms
- keep task/editor modals centered and width-bounded when the page itself already owns a desktop/tablet shell
- use canonical selectors for derived concepts instead of per-screen filtering
- document fallback/degraded modes explicitly when backend truth is unavailable

---

## Pre-Implementation Baseline

**Pre-gold-standard commit hash**: `0303a6e`  
`refactor(map): complete exploreFlow modularization â€” Passes 10-16 + docs`

This is the clean, stable state before any state migration begins.  
Restore or diff at any time:

```bash
# View any file at this baseline
git show 0303a6e:<path_to_file>

# Diff current vs pre-migration baseline
git diff 0303a6e -- <path_to_file>
```

---

## Migration Phases

### RULE: Never combine phases. Complete + verify one before starting next.

---

### Phase 1 â€” Zustand + persist for trip state âœ… COMPLETE

**Commit**: `7c4c1a9`  
**Priority**: Highest  
**Effort**: Low  
**Risk**: Low â€” EmergencyContext still wraps it, zero consumer blast radius

**What it fixes**:

- Metro restart bug â€” trip state persists to AsyncStorage via Zustand `persist` middleware
- Payment â†’ tracking timing â€” state update is synchronous, no async sync needed

**What changes**:

- `useState` in `useEmergencyTripState` â†’ reads/writes to `useEmergencyTripStore`
- `EmergencyContext` still exists and still provides `useEmergency()` â€” no consumer changes

**Stash reference**: `stores/emergencyTripStore.js` (available, needs review before use)

---

### Phase 2 â€” TanStack Query for hospitals + server sync âœ… COMPLETE

**Stash commit**: `8bdce65`  
**Hospital migration completed**: 2026-05-17  
**Priority**: High  
**Effort**: Medium  
**Risk**: Medium

**What it fixes**:

- Replaces `syncActiveTripsFromServer` with deterministic `invalidateQueries`
- Background refetch, stale-while-revalidate, automatic retry
- Hospital data cached â€” no redundant fetches on navigation

**What changes**:

- `useEmergencyHospitalSync` + `useEmergencyServerSync` â†’ TanStack Query hooks
- Payment completion calls `queryClient.invalidateQueries(['activeTrip'])` â€” deterministic

**Stash reference**:

- `hooks/emergency/useHospitalsQuery.ts`
- `hooks/emergency/useActiveTripQuery.ts`

**âš ï¸ Partial migration discovered 2026-05-17**:  
The stash created `useHospitalsQuery.ts` but `useEmergencyHospitalSync.js` was never updated to import it. `useHospitals.js` (useState + module-level SWR cache â€” full L2 violation) survived as a zombie alongside the `.ts` replacement. Fixed by:
- Adding `useEmergencyHospitalsQuery` to `useHospitalsQuery.ts` â€” full-featured variant with `allHospitals` split, 3dp bucket queryKey, `discoverNearby` (50km), demo bootstrap in isolated `useEffect`
- Updating `useEmergencyHospitalSync.js` to import `useEmergencyHospitalsQuery`
- Deleting `useHospitals.js` (zero live importers confirmed)
- See `TRACKING_SHEET_LEARNINGS.md Â§2.23` for full defect analysis

---

### Phase 3 â€” Jotai atoms for map UI state

**Priority**: Medium  
**Effort**: Low  
**Risk**: Low â€” pure UI state, no server interaction

**What it fixes**:

- `useMapExploreFlowStore` (Zustand) â†’ Jotai atoms
- Surgical re-renders â€” only the component subscribed to a specific atom re-renders
- Derived atoms replace boolean `useState` chains

**Example â€” derived atom pattern**:

```js
// Instead of separate boolean state:
export const trackingVisibleAtom = atom(
  (get) => get(sheetPhaseAtom) === "TRACKING", // derived, never set directly
);
```

**Stash reference**: `atoms/mapFlowAtoms.js` (already written, needs review)

---

### Phase 4 â€” XState for trip lifecycle âœ… COMPLETE

**Commit**: `7c898f7`  
**Priority**: High value, lower urgency  
**Effort**: High  
**Risk**: Medium â€” well-defined contract, eliminates entire bug classes

**What it fixes**:

- Illegal states become impossible by design
- `IDLE â†’ PENDING_APPROVAL â†’ ACTIVE â†’ COMPLETING â†’ COMPLETED` â€” explicit machine
- Eliminates scattered boolean flag coordination
- XState snapshot persistence works with Zustand or AsyncStorage
- Full DevTools support â€” time-travel debugging, visual state chart

**Scope**:

- Must cover both ambulance AND bed booking flows
- All state transitions must be observable via DevTools
- XState `@xstate/react` `useMachine` hook replaces trip boolean coordination

**Example machine states**:

```
IDLE
  â†’ on PAYMENT_COMPLETE â†’ PENDING_APPROVAL
PENDING_APPROVAL
  â†’ on APPROVED â†’ ACTIVE
  â†’ on REJECTED / TIMEOUT â†’ IDLE
ACTIVE
  â†’ on COMPLETE_REQUESTED â†’ COMPLETING
  â†’ on CANCEL â†’ IDLE
COMPLETING
  â†’ on RATING_SUBMITTED / SKIPPED â†’ IDLE
```

---

### Phase 5 â€” Retire EmergencyContext

**Priority**: Final cleanup  
**Effort**: High  
**Risk**: High â€” 19 direct consumers, 75 raw status string comparisons across 23 app files

**Audit findings** (recorded `dcad33c`):

- 19 files call `useEmergency()` directly
- 75 raw `activeAmbulanceTrip?.status === 'in_progress'` etc. comparisons in app code
- Heaviest consumers: `EmergencyScreen.jsx`, `useMapExploreFlow.js`, `useMapTrackingRuntime.js`, `PaymentScreenComponents.jsx`
- `EmergencyContext.jsx` itself is already lean (190 lines) â€” all plumbing delegated to sub-hooks
- `useEmergency()` API surface stays unchanged â€” consumers never know what changes underneath

**Sub-pass plan**:

- **5a** âœ… COMPLETE â€” Migrate raw string comparisons to `TripState` constants (non-breaking, mechanical)
- **5b** âœ… COMPLETE â€” Migrate heavy consumers to use `isActive`, `isArrived`, `hasActiveTrip` from `useEmergency()`
- **5c** âœ… COMPLETE (`ddd655b`) â€” Strip `useEmergency()` from tracking subtree; raw trips now flow via `activeMapRequest.raw.*`
  - `MapTrackingStageBase`: removed `useEmergency()`, raw trip data from `activeMapRequest.raw`, actions as props
  - `MapSheetOrchestrator`: added `tracking*` prop interface, threads to `MapTrackingOrchestrator`
  - `useMapExploreFlow`: exposes action callbacks + lifecycle flags for prop-drilling
  - `MapScreen`: passes `trackingXxx` props down to `MapSheetOrchestrator`
  - Context value strip deferred: `EmergencyRequestModal` + commit controllers still consumers â†’ 5d
- **5d** âœ… COMPLETE (`6ea20f8`) â€” Strip `activeAmbulanceTrip`, `activeBedBooking`, `pendingApproval`, `patchPendingApproval` from `EmergencyContext` useMemo value + deps
  - `useMapCommitTriageController`: raw trips + patch\* â†’ `useEmergencyTripStore()` selectors
  - `useMapCommitPaymentController`: raw trips + `setPendingApproval` â†’ `useEmergencyTripStore()` selectors
  - `EmergencyRequestModal`: raw trips + `setPendingApproval` â†’ `useEmergencyTripStore()` selectors
  - `setPendingApproval`, `patchActiveAmbulanceTrip`, `patchActiveBedBooking` retained in context value â€” `useMapExploreFlow` still reads them â†’ 5e
- **5e** âœ… COMPLETE (`d18139b`) â€” Migrate `useMapExploreFlow` raw trip reads off `EmergencyContext`
  - `useMapExploreFlow`: `activeAmbulanceTrip`, `activeBedBooking`, `pendingApproval`, `commitFlow`, `patchActiveAmbulanceTrip`, `setCommitFlow`, `clearCommitFlow`, `setPendingApproval` â†’ `useEmergencyTripStore()` selectors
  - `EmergencyContext` value: removed `commitFlow`, `patchActiveAmbulanceTrip`, `patchActiveBedBooking`, `setPendingApproval`, `setCommitFlow`, `clearCommitFlow`
  - `EmergencyContext` now broadcasts **zero raw trip data** â€” only XState lifecycle flags, start/stop actions, hospital/UI state
  - `useMapCommitDetailsController` still reads `setCommitFlow` from context â†’ 5f
- **5f** âœ… COMPLETE â€” Migrate `useMapCommitDetailsController` `setCommitFlow` off context
  - 1 field (`setCommitFlow`) â†’ `useEmergencyTripStore((s) => s.setCommitFlow)` selector
  - `useEmergency()` import fully removed from `useMapCommitDetailsController`
  - **No remaining active-path consumer reads any trip field from `useEmergency()`**

**Do last â€” after all 4 layers above are stable and verified in production.**

---

## Full Consumer Map â€” Remaining `useEmergency()` Callers

> Audited post-Phase-5d. Each file's reads categorised: âœ… safe in context | ðŸ”´ raw trip (needs migration)

### `hooks/map/exploreFlow/useMapExploreFlow.js` â†’ Phase 5e target

| Field                                            | Category           | Action  |
| ------------------------------------------------ | ------------------ | ------- |
| `activeAmbulanceTrip`                            | ðŸ”´ raw trip        | â†’ store |
| `activeBedBooking`                               | ðŸ”´ raw trip        | â†’ store |
| `pendingApproval`                                | ðŸ”´ raw trip        | â†’ store |
| `commitFlow`                                     | ðŸ”´ raw trip        | â†’ store |
| `patchActiveAmbulanceTrip`                       | ðŸ”´ raw trip action | â†’ store |
| `setCommitFlow` / `clearCommitFlow`              | ðŸ”´ raw trip action | â†’ store |
| `setPendingApproval`                             | ðŸ”´ raw trip action | â†’ store |
| `ambulanceTelemetryHealth`                       | âœ… derived         | stays   |
| `stopAmbulanceTrip` / `stopBedBooking`           | âœ… action          | stays   |
| `setAmbulanceTripStatus` / `setBedBookingStatus` | âœ… action          | stays   |
| `isArrived` / `isPendingApproval`                | âœ… XState flag     | stays   |
| hospitals / UI fields                            | âœ… context-owned   | stays   |

### `components/map/views/commitDetails/useMapCommitDetailsController.js` â†’ Phase 5e or 5f

| Field           | Category           | Action                                    |
| --------------- | ------------------ | ----------------------------------------- |
| `setCommitFlow` | ðŸ”´ raw trip action | â†’ store (after 5e strips it from context) |

### Screens â€” all safe in context (no raw trip reads)

| File                                    | Reads from `useEmergency()`                                                                              | Status                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `screens/SearchScreen.jsx`              | `specialties`, `selectedSpecialty`, `selectSpecialty`                                                    | âœ… stays                                                                        |
| `screens/WelcomeScreen.jsx`             | `setUserLocation`, `refreshHospitals`, `userLocation`                                                    | âœ… stays                                                                        |
| `screens/RequestAmbulanceScreen.jsx`    | coverage/mode fields only                                                                                | âœ… stays                                                                        |
| `screens/NotificationsScreen.jsx`       | `setMode`                                                                                                | âœ… stays                                                                        |
| `screens/NotificationDetailsScreen.jsx` | `setMode`                                                                                                | âœ… stays                                                                        |
| `screens/MoreScreen.jsx`                | coverage/mode fields only                                                                                | âœ… stays                                                                        |
| `screens/MapEntryLoadingScreen.jsx`     | `refreshHospitals`, `effectiveDemoModeEnabled`                                                           | âœ… stays                                                                        |
| `screens/EmergencyScreen.jsx`           | `activeAmbulanceTrip`, `activeBedBooking`, `pendingApproval`, `patchActiveAmbulanceTrip` + coverage/mode | âš ï¸ DEPRECATED â€” zero router entry points, dead code, safe to delete post-5f     |
| `screens/BookBedRequestScreen.jsx`      | `clearSelectedHospital`, `setMode`, `effectiveDemoModeEnabled`                                           | âœ… stays                                                                        |
| `screens/MapScreen.jsx`                 | reads from `useMapExploreFlow()` only â€” zero direct `useEmergency()` calls                               | âš ï¸ 1,434 lines â€” architectural violation (mandate: 500), decomposition required |

### Hooks â€” all safe in context (no raw trip reads)

| File                                      | Reads                                          | Status   |
| ----------------------------------------- | ---------------------------------------------- | -------- |
| `hooks/visits/useBookVisit.js`            | `allHospitals`, `effectiveDemoModeEnabled`     | âœ… stays |
| `hooks/search/useSearchRanking.js`        | `allHospitals`, `setMode`, `selectedSpecialty` | âœ… stays |
| `hooks/emergency/useHospitalSelection.js` | `mode`                                         | âœ… stays |

### Components â€” already migrated

| File                                                                  | Status               |
| --------------------------------------------------------------------- | -------------------- |
| `components/emergency/EmergencyRequestModal.jsx`                      | âœ… Phase 5d complete |
| `components/map/views/commitTriage/useMapCommitTriageController.js`   | âœ… Phase 5d complete |
| `components/map/views/commitPayment/useMapCommitPaymentController.js` | âœ… Phase 5d complete |
| `components/map/views/tracking/MapTrackingStageBase.jsx`              | âœ… Phase 5c complete |

---

## Phase 6 â€” Retire `EmergencyContext.jsx` shell

- After Phase 5f: context value contains zero raw trip data, no active-path consumer reads trip fields
- Remaining `useEmergency()` callers all read context-owned fields: `mode`, `hospitals`, `coverage`, `specialties`, `userLocation`, XState actions
- **Architecture**: Zustand stores (not atoms) for persistent client state, TanStack Query for server state
- **Gate**: Phases 5aâ€“5f verified in production

### 6a âœ… COMPLETE (`bd9fa38`, fix `923f931`) â€” Create `useModeStore` (Zustand) + hydration integration

- Store: `stores/modeStore.js` â€” `mode`, `serviceType`, `viewMode`, `selectedSpecialty`
- Persistence: `MODE_PREFERENCES` storage key (database abstraction)
- Pattern: equality-guarded setters, immer middleware, follows `emergencyTripStore.js` structure
- Hydration: `hydrateModeStore()` wired into `runtime/RootRuntimeGate.jsx` `prepare()` â€” deterministic, before first render
- Stash audit: stash `@{0}` contained same files â€” no additional logic to adopt

### 6b âœ… COMPLETE (`cca3647`) â€” Create `useCoverageStore` + `useLocationStore`

- `stores/coverageStore.js` â€” `coverageModePreference`, `demoOwnerSlug`, `coverageModeOperation`, `forceDemoFetch`
- `stores/locationStore.js` â€” `userLocation`, `locationPermission`, `isTrackingLocation`
- Both hydrated in `RootRuntimeGate.jsx` via `Promise.all` â€” parallel, deterministic
- Stash audit: `useCoverageMode.js` (useState pattern) rejected; `useEmergencyLocationSync.js` GPS logic noted for consumer migration

### 6c â€” Consumer migration (one screen at a time)

#### 6c-1 âœ… COMPLETE (`3821ee3`) SearchScreen (pilot)

- `mode`, `setMode`, `selectedSpecialty`, `selectSpecialty` â†’ `useModeStore` direct selectors
- `allHospitals`, `specialties` remain on `useEmergency()` â€” server state, separate migration
- Pattern: surgical `useModeStore((s) => s.x)` selectors, no context blast radius

#### 6c-2 âœ… COMPLETE (`96a43a5`) NotificationsScreen

- `setMode` â†’ `useModeStore((s) => s.setMode)` â€” `useEmergency()` import fully removed

#### Blocked screens â€” context-owned computed/service fields, not raw store fields

- `WelcomeScreen` â€” `setUserLocation` uses functional updater `(current) => newValue`; needs store API extension or Phase 6d resolution
- `MoreScreen` â€” `coverageMode` (resolved effective mode), `setCoverageMode` (async service action), `coverageStatus`/`isLiveOnlyAvailable`/`hasComfortableDemoCoverage` (server-derived) â€” all context-level, migrate in 6d

#### 6c complete â€” remaining screens deferred to 6d

- `RequestAmbulanceScreen` â€” `setMode` migratable but 8 other context service fields block partial migration
- `MapEntryLoadingScreen` â€” `coverageModePreferenceLoaded` migratable but `effectiveDemoModeEnabled`, `refreshHospitals`, `setUserLocation` block partial migration
- `BookBedRequestScreen` â€” `setMode` migratable but same service field blockers
- **Decision**: all 3 migrate transparently via `EmergencyContextAdapter` shim in 6d â€” no partial churn

### 6d âœ… COMPLETE (`42933ab`) â€” Wire existing EmergencyContext internals to Zustand stores

- **Stash adapter rejected**: stash `EmergencyContextAdapter.jsx` â†’ `useEmergencyHospitals` â†’ `useCoverageMode` (âŒ REJECTED). Wholesale adoption would reintroduce rejected pattern.
- **Approach**: wire Zustand stores into the existing hook layer, not above it â€” `useEmergency()` signature unchanged, zero consumer blast radius

#### 6d-1 âœ… `useEmergencyTripState` â€” mode/serviceType/selectedSpecialty/viewMode â†’ `useModeStore`

- All 4 `useState` calls replaced with `useModeStore` selectors
- `toggleMode`, `selectSpecialty`, `selectServiceType`, `toggleViewMode`, `resetFilters` updated to call store setters directly (no functional updaters needed)
- `selectedHospitalId` remains local `useState` â€” ephemeral UI selection, not persisted

#### 6d-2 âœ… `useEmergencyLocationSync` â€” `userLocation`/`setUserLocation` â†’ `useLocationStore`

- `useState(null)` replaced with `useLocationStore` selector
- Functional updater pattern `setUserLocation((current) => ...)` replaced with `useLocationStore.getState()` read + direct `setUserLocation(value)` call
- Resolves `WelcomeScreen` blocker

#### 6d-3 âœ… `WelcomeScreen` â€” now fully off `useEmergency()` for location fields

- `setUserLocation` + `emergencyUserLocation` â†’ `useLocationStore`
- `refreshHospitals` remains on `useEmergency()` â€” server action

### 6e âœ… COMPLETE â€” Dead code cleanup

#### 6e-1 (`5d83a7a`) `screens/EmergencyScreen.jsx`

- 1,482 lines deleted â€” zero router entry points, zero source imports confirmed
- **Recovery**: `git show 5d83a7a~1:screens/EmergencyScreen.jsx`

#### 6e-2 (`7f260f8`) EmergencyBottomSheet cluster â€” orphaned by EmergencyScreen deletion

All files below were exclusively owned by `EmergencyScreen`. `MapScreen` uses `MapSheetOrchestrator` â€” confirmed independent.

**Components deleted:**

- `components/emergency/EmergencyBottomSheet.jsx` â€” main sheet host (~540 lines)
- `components/emergency/BottomSheetController.jsx` â€” ref-forwarding wrapper
- `components/emergency/bottomSheet/EmergencySheetHandle.jsx`
- `components/emergency/bottomSheet/EmergencySheetBackground.jsx`
- `components/emergency/bottomSheet/EmergencySheetTopRow.jsx`
- `components/emergency/bottomSheet/EmergencySheetFilters.jsx`
- `components/emergency/bottomSheet/EmergencySheetSectionHeader.jsx`
- `components/emergency/bottomSheet/EmergencySheetHospitalList.jsx`
- `components/emergency/bottomSheet/TripSummaryCard.jsx`
- `components/emergency/bottomSheet/BedBookingSummaryCard.jsx`
- `components/emergency/bottomSheet/ActiveVisitsSwitcher.jsx`

**Hooks deleted:**

- `hooks/emergency/useBottomSheetSnap.js`
- `hooks/emergency/useBottomSheetScroll.js`
- `hooks/emergency/useBottomSheetSearch.js`
- `hooks/emergency/useEmergencySheetController.js`

**Recovery**: `git show <6e-2 hash>^` to browse all deleted files, or `git checkout <6e-2 hash>~ -- <path>` to restore any individual file

## MapScreen Decomposition â€” Parallel Track (not Phase 6)

- `MapScreen.jsx` is **1,434 lines** â€” architectural violation (mandate: max 500 for screen files)
- No direct `useEmergency()` calls â€” all data flows via `useMapExploreFlow()`
- Decomposition scope: extract inline logic into sub-hooks/controllers (rating, history, route reconciliation, tracking timeline)
- **Gate**: independent of Phase 6 â€” can be scoped and executed separately
- **Stash warning**: stash attempted this via `hooks/map/shell/` (14 files) bundled with everything else â€” do NOT repeat that pattern. Scope as its own dedicated phase.

---

## Non-Negotiable Principles

1. **Never combine phases** â€” stash proved this breaks the app
2. **Behaviour parity before proceeding** â€” verify each phase before starting next
3. **EmergencyContext.jsx stays alive until Phase 5**
4. **XState machine covers ambulance AND bed booking**
5. **All state transitions logged/observable via DevTools**
6. **PULLBACK NOTE comments on every change** â€” clear OLD/NEW for rollback
7. **No blast radius** â€” each phase has zero or minimal consumer changes until Phase 5
8. **Never commit without explicit user permission** â€” stage â†’ show summary â†’ await "commit"
9. **Always add commit hash to roadmap doc** as part of phase deliverable
10. **Before writing any new store/service** â€” verify exact API methods from an existing working file (`emergencyTripStore.js` is canonical). Database API is `.read/.write`, not `.get/.set`

### File Line Count Rules (Apple HIG Architecture Standards)

Flag any file exceeding its target â€” mandatory refactor above max:

| File type                 | Target  | Max | Violation threshold                    |
| ------------------------- | ------- | --- | -------------------------------------- |
| Route / Layout            | 20â€“100  | 150 | >150 â†’ flag                            |
| Screen                    | 250â€“400 | 500 | >500 â†’ flag, >800 â†’ mandatory refactor |
| UI Component              | 80â€“250  | 350 | >350 â†’ flag                            |
| Complex Feature Component | 150â€“300 | 450 | >450 â†’ flag                            |
| Hook                      | 80â€“200  | 300 | >300 â†’ flag                            |
| Controller                | 150â€“300 | 400 | >400 â†’ flag                            |
| State file (store/atom)   | 30â€“150  | 250 | >250 â†’ flag                            |
| Service                   | 100â€“300 | 500 | >500 â†’ flag                            |
| Utils / helpers           | 30â€“150  | 200 | >200 â†’ flag                            |

> **Hard rules**: >800 lines â†’ mandatory refactor candidate. >1000 lines â†’ architectural violation (unless generated).  
> Never judge by line count alone â€” flag **responsibility leakage** too.

---

## Known Pre-existing Bugs (Fix During Migration)

These bugs exist today and will be resolved by the migration â€” not separate fixes:

### Bug 1 â€” Payment â†’ Tracking gap

**Root cause**: `syncActiveTripsFromServer` not awaited after payment.  
**Fixed by**: Phase 1 (Zustand sync) + Phase 2 (TanStack Query invalidation).  
**Location**: `usePaymentScreenModel.js` lines 227â€“245.

### Bug 2 â€” Rating modal timing

**Root cause**: `stopAmbulanceTrip` clears state before rating modal renders.  
**Fixed by**: Phase 4 (XState â€” `COMPLETING` state holds context until rating submitted).  
**Location**: `useEmergencyHandlers.js` lines 91â€“119.

### Bug 3 â€” Metro restart wipes trip state

**Root cause**: `useState` in `useEmergencyTripState` is in-memory only.  
**Fixed by**: Phase 1 (Zustand + persist middleware).  
**Location**: `useEmergencyTripState.js`.

### Bug 4 â€” Hospital marker intermittent visibility

**Root cause**: Loading race â€” `nearestHospital` null on first render before hospitals load.  
`selectHospital` fires from auto-select effect but `selectedHospital` hasn't propagated
back through `EmergencyContext` yet.  
**Fixed by**: Phase 2 (TanStack Query â€” deterministic hospital load state).

---

## Phase 6d Post-Mortem â€” iOS Map Loading Regression

> **Extracted 2026-05-24** to its own postmortem file for institutional memory.
> **Severity**: Critical Â· **Date**: 2026-04-26 Â· **Resolved**: same session.
>
> **Full post-mortem:** [`audit/postmortems/2026-04-26_PHASE_6D_IOS_MAP_LOADING.md`](../../audit/postmortems/2026-04-26_PHASE_6D_IOS_MAP_LOADING.md)

The 6 permanent architectural rules that came out of this incident are summarized below. They are now canonical and referenced from `REFACTORING_GUARDRAILS.md`:

1. Never use `||` chains over objects when you need field validity, not truthiness.
2. Zustand stores migrated from `useState` MUST preserve null-vs-set semantics (store `null`, not `{}`).
3. Don't assert hypotheses as root causes without isolated verification.
4. Auth guards must seed from cache before async sync (`loading=false` must imply authoritative state).
5. Fallback timers must not be guarded by the state they're meant to compensate for.
6. When a derived boolean disagrees with an upstream set/null log, the bug is in the predicate.

---

## Stash Files Available (Review Before Use)

| File                                    | Phase   | Status                                |
| --------------------------------------- | ------- | ------------------------------------- |
| `stores/emergencyTripStore.js`          | Phase 1 | Available â€” review for feature parity |
| `hooks/emergency/useHospitalsQuery.ts`  | Phase 2 | Available â€” review for feature parity |
| `hooks/emergency/useActiveTripQuery.ts` | Phase 2 | Available â€” review for feature parity |
| `atoms/mapFlowAtoms.js`                 | Phase 3 | Available â€” review for feature parity |
| `contexts/EmergencyContextAdapter.jsx`  | Phase 5 | Available â€” use LAST                  |

**Warning**: The stash attempted all 5 phases simultaneously and broke the app.  
Use stash files as reference only â€” do not apply wholesale.

---

## Phase 7 â€” Deprecation Register

> **Rule**: Do NOT delete. Mark deprecated in-file with a `@deprecated` header comment.  
> Files are kept for quick reference and git recovery. Deletion only after MapScreen decomposition confirms zero live usage.

---

### 7a â€” Screens deprecated (router entry still exists but surface is superseded)

| File                                 | Lines | Superseded By                                       | Status                                                                              |
| ------------------------------------ | ----- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `screens/MoreScreen.jsx`             | 1,492 | `MiniProfileModal` + `(user)/(stacks)/*` direct nav | âš ï¸ DEPRECATED â€” router entry `app/(user)/(stacks)/more.js` still live, mark in-file |
| `screens/RequestAmbulanceScreen.jsx` | 802   | `MapSheetOrchestrator` commit flow                  | âš ï¸ DEPRECATED â€” still routed from stacks, mark in-file                              |
| `screens/BookBedRequestScreen.jsx`   | ~400  | `MapSheetOrchestrator` bed decision flow            | âš ï¸ DEPRECATED â€” still routed from stacks, mark in-file                              |
| `screens/MapEntryLoadingScreen.jsx`  | ~80   | `MapExploreLoadingOverlay` inside MapScreen         | âš ï¸ DEPRECATED â€” confirm router entry before marking                                 |

---

### 7b â€” Components deprecated (exclusively owned by deprecated screens)

#### Owned by `RequestAmbulanceScreen` / `BookBedRequestScreen`

| File                                             | Notes                                                                                                                                               |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/emergency/EmergencyRequestModal.jsx` | **2,926 lines** â€” entire legacy request modal. Used only by `RequestAmbulanceScreen` + `BookBedRequestScreen`. Map sheet flow replaces it entirely. |
| `components/emergency/requestModal/*`            | All sub-components of `EmergencyRequestModal` (12 files)                                                                                            |
| `components/emergency/triage/*`                  | `TriageIntakeModal` and helpers â€” owned by `EmergencyRequestModal`                                                                                  |
| `components/emergency/RequestAmbulanceFAB.jsx`   | No live import found outside deprecated screens                                                                                                     |
| `components/emergency/emergencyFlowContent.js`   | Only imported by `EmergencyRequestModal` + `EmergencyIOSMobileIntakeView`                                                                           |

#### Owned by `EmergencyScreen` (deleted in 6e) or no live consumers

| File                                              | Notes                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| `components/emergency/HospitalDetailView.jsx`     | No live import â€” only imported by itself (self-ref)                             |
| `components/emergency/HospitalCard.jsx`           | Only imported by `HospitalDetailView` (also deprecated)                         |
| `components/emergency/Call911Card.jsx`            | No live import found                                                            |
| `components/emergency/ServiceTypeSelector.jsx`    | No live import found â€” `SearchScreen` now uses `SearchSpecialtyStrip`, not this |
| `components/emergency/EmergencyMapContainer.jsx`  | Only used inside `EmergencyIOSMobileIntakeView` (intake flow)                   |
| `components/emergency/ServiceRatingModal-old.jsx` | Old file â€” superseded by `ServiceRatingModal.jsx`                               |

#### Still live â€” DO NOT deprecate

| File                                               | Notes                                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------------- |
| `components/emergency/MiniProfileModal.jsx`        | âœ… LIVE â€” used in `MapScreen` as MoreScreen replacement                         |
| `components/emergency/ServiceRatingModal.jsx`      | âœ… LIVE â€” used in `MapScreen` (history + recovered rating)                      |
| `components/emergency/SpecialtySelector.jsx`       | No live import found â€” replaced by `components/search/SearchSpecialtyStrip.jsx` |
| `components/emergency/EmergencySearchBar.jsx`      | âœ… LIVE â€” used in `SearchMainContent`                                           |
| `components/emergency/ContactCard.jsx`             | âœ… LIVE â€” used in `EmergencyContactsScreen`                                     |
| `components/emergency/CoverageDisclaimerModal.jsx` | âš ï¸ REVIEW â€” no source import found, confirm before deprecating                  |
| `components/emergency/DemoBootstrapModal.jsx`      | âš ï¸ REVIEW â€” no source import found, confirm before deprecating                  |
| `components/emergency/intake/*`                    | âš ï¸ REVIEW â€” owned by `RequestAmbulanceScreen` intake flow, deprecates with it   |

---

### 7c â€” Cleanup order (follow MapScreen decomposition passes)

1. After each MapScreen pass confirms zero regression â†’ mark that pass's displaced component deprecated
2. `MoreScreen` â†’ mark deprecated after `MiniProfileModal` covers all nav entry points
3. `RequestAmbulanceScreen` + `BookBedRequestScreen` â†’ mark deprecated after map sheet commit flow is proven stable
4. `EmergencyRequestModal` cluster â†’ mark deprecated with `RequestAmbulanceScreen`
5. Orphaned leaf components (HospitalDetailView, Call911Card, etc.) â†’ delete, not just deprecate â€” no consumers, no value in keeping

---

## Tracking Sheet Phase â€” Canonical Decision Diagram

**Purpose**: Single source of truth for "what sheet phase should be active" as a function of the
5-layer state. Use this when reasoning about any tracking-related auto-open / auto-close defect.

### Inputs (in priority order)

| #   | Input                  | Layer     | Source                                                                      |
| --- | ---------------------- | --------- | --------------------------------------------------------------------------- |
| 1   | `hasActiveTrip`        | XState    | `useTripLifecycle()` â€” canonical "are we tracking?"                         |
| 2   | `isRatingPending`      | XState    | `useTripLifecycle()` â€” completion â†’ rate gate                               |
| 3   | `trackingRequestKey`   | Zustand   | `activeMapRequest.requestId` â€” identity for hospital resolution             |
| 4   | `sheetPhase`           | Jotai     | `mapSheetPhaseAtom` â€” current sheet (EXPLORE*INTENT / TRACKING / COMMIT*\*) |
| 5   | `trackingDismissedRef` | React ref | User explicitly closed tracking sheet for this request                      |
| 6   | History selection      | Call site | `handleSelectHistoryItem(historyItem)`                                      |
| 7   | Payment commit         | Call site | `useMapCommitFlow.finishCommitPayment()`                                    |

### Decision rules (evaluated each render)

```
IF !hasActiveTrip OR !trackingRequestKey:
    IF sheetPhase == TRACKING: revert â†’ EXPLORE_INTENT
    ELSE: leave sheetPhase unchanged
    (rating modal may still render â€” driven by trackingRatingStateAtom)

ELSE IF sheetPhase IN { COMMIT_DETAILS, COMMIT_TRIAGE, COMMIT_PAYMENT }:
    leave sheetPhase unchanged (commit flow owns the sheet)

ELSE IF sheetPhase == TRACKING:
    leave sheetPhase unchanged

ELSE IF sheetPhase == EXPLORE_INTENT AND prevSheetPhase WAS COMMIT_*:
    openTracking()                    # forced auto-open after payment

ELSE IF sheetPhase == EXPLORE_INTENT AND !trackingDismissedRef:
    openTracking()                    # cold-start auto-open

ELSE:
    leave sheetPhase unchanged
```

Implemented in `@hooks/map/exploreFlow/useMapTracking.js` (Pass C â€” XState gate).

### Cross-cutting renderers (NOT gated on sheetPhase)

| Renderer               | Gating signal                                 | Location         |
| ---------------------- | --------------------------------------------- | ---------------- |
| In-flow rating modal   | `trackingRatingStateAtom.visible` (persisted) | `MapScreen` root |
| Recovered rating modal | `recoveredRatingState`                        | `MapScreen` root |
| History rating modal   | `historyRatingState`                          | `MapScreen` root |

These survive sheet phase transitions by mounting at `MapScreen` root, not inside
`MapTrackingStageBase` (Pass B â€” rating modal lift).

### History "Resume tracking" routing

`handleSelectHistoryItem` (`@screens/MapScreen.jsx`) gates resume on:

```
matchesActiveEmergencyRequest =
    sourceKind == "emergency" &&
    historyItem.requestId in activeHistoryRequestKeys
```

- Match â†’ `openTracking()`
- Mismatch â†’ `openVisitDetail(historyItem)`

This prevents the auto-revert race where `openTracking` would fire for a stale request
and `useMapTracking`'s effect would immediately revert to EXPLORE_INTENT (Pass E).

### Tracking-Sheet-Phase Audit

See `docs/audit/TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md` for the full audit, defect
classes, and pass-by-pass implementation plan.

---

## Related Docs

- `docs/./architecture/map/MAP_EXPLORE_FLOW_MODULARIZATION.md` â€” completed hook extraction
- `docs/./architecture/refactoring/REFACTORING_BIBLE.md` â€” overall refactoring principles
- `docs/architecture/roadmap/IMPLEMENTATION_ROADMAP.md` â€” product roadmap
- `docs/audit/TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md` â€” tracking sheet audit + pass plan
- `docs/./architecture/refactoring/TRACKING_SHEET_LEARNINGS.md` â€” cross-cutting defect classes from tracking audit

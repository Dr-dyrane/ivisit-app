# iVisit Gold Standard State Architecture — Migration Roadmap

**Status**: Phase 5e complete — EmergencyContext value now broadcasts zero raw trip data  
**Documented**: 2026-04-26  
**Context**: iVisit is a global emergency medical app ($10M valuation, $15M post-revamp).  
Gold standard is non-negotiable. One hospital onboarding via ivisit-console triggers store launch.

---

## Why This Migration

### Current limitations
- `activeAmbulanceTrip`, `activeBedBooking`, `pendingApproval`, `commitFlow` are all `useState`
- A Metro restart wipes trip state — user loses tracking context
- Payment → tracking transition is non-deterministic (relies on `syncActiveTripsFromServer` timing)
- Any `useEmergency()` subscriber re-renders when any context value changes
- Hospital data is re-fetched imperatively, not cached
- No illegal-state prevention — boolean flags can contradict each other

### What apps at this scale actually use
Uber, Apple Maps, Google Maps all share the same architectural pattern:

```
Server Truth  →  Local Cache  →  UI Projection  →  Trip Lifecycle
  Supabase       TanStack Query    Jotai atoms       XState machine
  Realtime       + Zustand         (derived,          (trip state
  subscriptions  persist           never stored)       as events)
```

---

## Target Architecture

| Layer | Technology | What it owns |
|-------|-----------|--------------|
| Server truth | Supabase Realtime (already in place) | Live subscriptions |
| Server cache | TanStack Query | Hospitals, visits, server sync |
| Global app state | Zustand + persist | Trip state (survives app kill) |
| Local UI state | Jotai atoms | Sheet phase, modals, snap state |
| Trip lifecycle | XState machine | State machine for trip events |

---

## Pre-Implementation Baseline

**Pre-gold-standard commit hash**: `0303a6e`  
`refactor(map): complete exploreFlow modularization — Passes 10-16 + docs`

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

### Phase 1 — Zustand + persist for trip state ✅ COMPLETE
**Commit**: `7c4c1a9`  
**Priority**: Highest  
**Effort**: Low  
**Risk**: Low — EmergencyContext still wraps it, zero consumer blast radius  

**What it fixes**:
- Metro restart bug — trip state persists to AsyncStorage via Zustand `persist` middleware
- Payment → tracking timing — state update is synchronous, no async sync needed

**What changes**:
- `useState` in `useEmergencyTripState` → reads/writes to `useEmergencyTripStore`
- `EmergencyContext` still exists and still provides `useEmergency()` — no consumer changes

**Stash reference**: `stores/emergencyTripStore.js` (available, needs review before use)

---

### Phase 2 — TanStack Query for hospitals + server sync ✅ COMPLETE
**Commit**: `8bdce65`  
**Priority**: High  
**Effort**: Medium  
**Risk**: Medium  

**What it fixes**:
- Replaces `syncActiveTripsFromServer` with deterministic `invalidateQueries`
- Background refetch, stale-while-revalidate, automatic retry
- Hospital data cached — no redundant fetches on navigation

**What changes**:
- `useEmergencyHospitalSync` + `useEmergencyServerSync` → TanStack Query hooks
- Payment completion calls `queryClient.invalidateQueries(['activeTrip'])` — deterministic

**Stash reference**: 
- `hooks/emergency/useHospitalsQuery.ts`
- `hooks/emergency/useActiveTripQuery.ts`

---

### Phase 3 — Jotai atoms for map UI state
**Priority**: Medium  
**Effort**: Low  
**Risk**: Low — pure UI state, no server interaction  

**What it fixes**:
- `useMapExploreFlowStore` (Zustand) → Jotai atoms
- Surgical re-renders — only the component subscribed to a specific atom re-renders
- Derived atoms replace boolean `useState` chains

**Example — derived atom pattern**:
```js
// Instead of separate boolean state:
export const trackingVisibleAtom = atom((get) =>
  get(sheetPhaseAtom) === 'TRACKING'  // derived, never set directly
);
```

**Stash reference**: `atoms/mapFlowAtoms.js` (already written, needs review)

---

### Phase 4 — XState for trip lifecycle ✅ COMPLETE
**Commit**: `7c898f7`  
**Priority**: High value, lower urgency  
**Effort**: High  
**Risk**: Medium — well-defined contract, eliminates entire bug classes  

**What it fixes**:
- Illegal states become impossible by design
- `IDLE → PENDING_APPROVAL → ACTIVE → COMPLETING → COMPLETED` — explicit machine
- Eliminates scattered boolean flag coordination
- XState snapshot persistence works with Zustand or AsyncStorage
- Full DevTools support — time-travel debugging, visual state chart

**Scope**:
- Must cover both ambulance AND bed booking flows
- All state transitions must be observable via DevTools
- XState `@xstate/react` `useMachine` hook replaces trip boolean coordination

**Example machine states**:
```
IDLE
  → on PAYMENT_COMPLETE → PENDING_APPROVAL
PENDING_APPROVAL
  → on APPROVED → ACTIVE
  → on REJECTED / TIMEOUT → IDLE
ACTIVE
  → on COMPLETE_REQUESTED → COMPLETING
  → on CANCEL → IDLE
COMPLETING
  → on RATING_SUBMITTED / SKIPPED → IDLE
```

---

### Phase 5 — Retire EmergencyContext
**Priority**: Final cleanup  
**Effort**: High  
**Risk**: High — 19 direct consumers, 75 raw status string comparisons across 23 app files  

**Audit findings** (recorded `dcad33c`):
- 19 files call `useEmergency()` directly
- 75 raw `activeAmbulanceTrip?.status === 'in_progress'` etc. comparisons in app code
- Heaviest consumers: `EmergencyScreen.jsx`, `useMapExploreFlow.js`, `useMapTrackingRuntime.js`, `PaymentScreenComponents.jsx`
- `EmergencyContext.jsx` itself is already lean (190 lines) — all plumbing delegated to sub-hooks
- `useEmergency()` API surface stays unchanged — consumers never know what changes underneath

**Sub-pass plan**:
- **5a** ✅ COMPLETE — Migrate raw string comparisons to `TripState` constants (non-breaking, mechanical)
- **5b** ✅ COMPLETE — Migrate heavy consumers to use `isActive`, `isArrived`, `hasActiveTrip` from `useEmergency()`
- **5c** ✅ COMPLETE (`ddd655b`) — Strip `useEmergency()` from tracking subtree; raw trips now flow via `activeMapRequest.raw.*`
  - `MapTrackingStageBase`: removed `useEmergency()`, raw trip data from `activeMapRequest.raw`, actions as props
  - `MapSheetOrchestrator`: added `tracking*` prop interface, threads to `MapTrackingOrchestrator`
  - `useMapExploreFlow`: exposes action callbacks + lifecycle flags for prop-drilling
  - `MapScreen`: passes `trackingXxx` props down to `MapSheetOrchestrator`
  - Context value strip deferred: `EmergencyRequestModal` + commit controllers still consumers → 5d
- **5d** ✅ COMPLETE (`6ea20f8`) — Strip `activeAmbulanceTrip`, `activeBedBooking`, `pendingApproval`, `patchPendingApproval` from `EmergencyContext` useMemo value + deps
  - `useMapCommitTriageController`: raw trips + patch* → `useEmergencyTripStore()` selectors
  - `useMapCommitPaymentController`: raw trips + `setPendingApproval` → `useEmergencyTripStore()` selectors
  - `EmergencyRequestModal`: raw trips + `setPendingApproval` → `useEmergencyTripStore()` selectors
  - `setPendingApproval`, `patchActiveAmbulanceTrip`, `patchActiveBedBooking` retained in context value — `useMapExploreFlow` still reads them → 5e
- **5e** ✅ COMPLETE (`d18139b`) — Migrate `useMapExploreFlow` raw trip reads off `EmergencyContext`
  - `useMapExploreFlow`: `activeAmbulanceTrip`, `activeBedBooking`, `pendingApproval`, `commitFlow`, `patchActiveAmbulanceTrip`, `setCommitFlow`, `clearCommitFlow`, `setPendingApproval` → `useEmergencyTripStore()` selectors
  - `EmergencyContext` value: removed `commitFlow`, `patchActiveAmbulanceTrip`, `patchActiveBedBooking`, `setPendingApproval`, `setCommitFlow`, `clearCommitFlow`
  - `EmergencyContext` now broadcasts **zero raw trip data** — only XState lifecycle flags, start/stop actions, hospital/UI state
  - `useMapCommitDetailsController` still reads `setCommitFlow` from context → 5f
- **5f** — Migrate `useMapCommitDetailsController` `setCommitFlow` off context
  - **Scope**: 1 field (`setCommitFlow`) → `useEmergencyTripStore((s) => s.setCommitFlow)` selector
  - **After 5f**: no remaining active-path consumer reads any trip field from `useEmergency()`

**Do last — after all 4 layers above are stable and verified in production.**

---

## Full Consumer Map — Remaining `useEmergency()` Callers

> Audited post-Phase-5d. Each file's reads categorised: ✅ safe in context | 🔴 raw trip (needs migration)

### `hooks/map/exploreFlow/useMapExploreFlow.js` → Phase 5e target
| Field | Category | Action |
|---|---|---|
| `activeAmbulanceTrip` | 🔴 raw trip | → store |
| `activeBedBooking` | 🔴 raw trip | → store |
| `pendingApproval` | 🔴 raw trip | → store |
| `commitFlow` | 🔴 raw trip | → store |
| `patchActiveAmbulanceTrip` | 🔴 raw trip action | → store |
| `setCommitFlow` / `clearCommitFlow` | 🔴 raw trip action | → store |
| `setPendingApproval` | 🔴 raw trip action | → store |
| `ambulanceTelemetryHealth` | ✅ derived | stays |
| `stopAmbulanceTrip` / `stopBedBooking` | ✅ action | stays |
| `setAmbulanceTripStatus` / `setBedBookingStatus` | ✅ action | stays |
| `isArrived` / `isPendingApproval` | ✅ XState flag | stays |
| hospitals / UI fields | ✅ context-owned | stays |

### `components/map/views/commitDetails/useMapCommitDetailsController.js` → Phase 5e or 5f
| Field | Category | Action |
|---|---|---|
| `setCommitFlow` | 🔴 raw trip action | → store (after 5e strips it from context) |

### Screens — all safe in context (no raw trip reads)
| File | Reads from `useEmergency()` | Status |
|---|---|---|
| `screens/SearchScreen.jsx` | `specialties`, `selectedSpecialty`, `selectSpecialty` | ✅ stays |
| `screens/WelcomeScreen.jsx` | `setUserLocation`, `refreshHospitals`, `userLocation` | ✅ stays |
| `screens/RequestAmbulanceScreen.jsx` | coverage/mode fields only | ✅ stays |
| `screens/NotificationsScreen.jsx` | `setMode` | ✅ stays |
| `screens/NotificationDetailsScreen.jsx` | `setMode` | ✅ stays |
| `screens/MoreScreen.jsx` | coverage/mode fields only | ✅ stays |
| `screens/MapEntryLoadingScreen.jsx` | `refreshHospitals`, `effectiveDemoModeEnabled` | ✅ stays |
| `screens/EmergencyScreen.jsx` | coverage/mode fields, no raw trips | ✅ stays |
| `screens/BookBedRequestScreen.jsx` | `clearSelectedHospital`, `setMode`, `effectiveDemoModeEnabled` | ✅ stays |
| `screens/MapScreen.jsx` | reads from `useMapExploreFlow()` only | ✅ stays |

### Hooks — all safe in context (no raw trip reads)
| File | Reads | Status |
|---|---|---|
| `hooks/visits/useBookVisit.js` | `allHospitals`, `effectiveDemoModeEnabled` | ✅ stays |
| `hooks/search/useSearchRanking.js` | `allHospitals`, `setMode`, `selectedSpecialty` | ✅ stays |
| `hooks/emergency/useHospitalSelection.js` | `mode` | ✅ stays |

### Components — already migrated
| File | Status |
|---|---|
| `components/emergency/EmergencyRequestModal.jsx` | ✅ Phase 5d complete |
| `components/map/views/commitTriage/useMapCommitTriageController.js` | ✅ Phase 5d complete |
| `components/map/views/commitPayment/useMapCommitPaymentController.js` | ✅ Phase 5d complete |
| `components/map/views/tracking/MapTrackingStageBase.jsx` | ✅ Phase 5c complete |

---

## Phase 6 — Retire `EmergencyContext.jsx` shell
- After Phase 5e: context value contains zero raw trip data
- Remaining `useEmergency()` callers all read only context-owned fields (hospitals, mode, coverage, XState flags, actions)
- Phase 6 scope: migrate those callers to direct store/machine reads, remove `EmergencyContext.Provider` from tree
- **Gate**: Phase 5e must be verified in production first
- **Complexity**: High — 10+ screen-level consumers, but all reads are safe/small

---

## Non-Negotiable Principles

1. **Never combine phases** — stash proved this breaks the app
2. **Behaviour parity before proceeding** — verify each phase before starting next
3. **EmergencyContext.jsx stays alive until Phase 5**
4. **XState machine covers ambulance AND bed booking**
5. **All state transitions logged/observable via DevTools**
6. **PULLBACK NOTE comments on every change** — clear OLD/NEW for rollback
7. **No blast radius** — each phase has zero or minimal consumer changes until Phase 5

---

## Known Pre-existing Bugs (Fix During Migration)

These bugs exist today and will be resolved by the migration — not separate fixes:

### Bug 1 — Payment → Tracking gap
**Root cause**: `syncActiveTripsFromServer` not awaited after payment.  
**Fixed by**: Phase 1 (Zustand sync) + Phase 2 (TanStack Query invalidation).  
**Location**: `usePaymentScreenModel.js` lines 227–245.

### Bug 2 — Rating modal timing
**Root cause**: `stopAmbulanceTrip` clears state before rating modal renders.  
**Fixed by**: Phase 4 (XState — `COMPLETING` state holds context until rating submitted).  
**Location**: `useEmergencyHandlers.js` lines 91–119.

### Bug 3 — Metro restart wipes trip state
**Root cause**: `useState` in `useEmergencyTripState` is in-memory only.  
**Fixed by**: Phase 1 (Zustand + persist middleware).  
**Location**: `useEmergencyTripState.js`.

### Bug 4 — Hospital marker intermittent visibility
**Root cause**: Loading race — `nearestHospital` null on first render before hospitals load.  
`selectHospital` fires from auto-select effect but `selectedHospital` hasn't propagated
back through `EmergencyContext` yet.  
**Fixed by**: Phase 2 (TanStack Query — deterministic hospital load state).

---

## Stash Files Available (Review Before Use)

| File | Phase | Status |
|------|-------|--------|
| `stores/emergencyTripStore.js` | Phase 1 | Available — review for feature parity |
| `hooks/emergency/useHospitalsQuery.ts` | Phase 2 | Available — review for feature parity |
| `hooks/emergency/useActiveTripQuery.ts` | Phase 2 | Available — review for feature parity |
| `atoms/mapFlowAtoms.js` | Phase 3 | Available — review for feature parity |
| `contexts/EmergencyContextAdapter.jsx` | Phase 5 | Available — use LAST |

**Warning**: The stash attempted all 5 phases simultaneously and broke the app.  
Use stash files as reference only — do not apply wholesale.

---

## Related Docs

- `docs/architecture/MAP_EXPLORE_FLOW_MODULARIZATION.md` — completed hook extraction
- `docs/architecture/REFACTORING_BIBLE.md` — overall refactoring principles
- `docs/architecture/roadmap/IMPLEMENTATION_ROADMAP.md` — product roadmap

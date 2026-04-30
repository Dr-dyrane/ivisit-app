# iVisit Gold Standard State Architecture — Migration Roadmap

**Status**: Phase 6 COMPLETE — EmergencyContext retired  
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
export const trackingVisibleAtom = atom(
  (get) => get(sheetPhaseAtom) === "TRACKING", // derived, never set directly
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
  - `useMapCommitTriageController`: raw trips + patch\* → `useEmergencyTripStore()` selectors
  - `useMapCommitPaymentController`: raw trips + `setPendingApproval` → `useEmergencyTripStore()` selectors
  - `EmergencyRequestModal`: raw trips + `setPendingApproval` → `useEmergencyTripStore()` selectors
  - `setPendingApproval`, `patchActiveAmbulanceTrip`, `patchActiveBedBooking` retained in context value — `useMapExploreFlow` still reads them → 5e
- **5e** ✅ COMPLETE (`d18139b`) — Migrate `useMapExploreFlow` raw trip reads off `EmergencyContext`
  - `useMapExploreFlow`: `activeAmbulanceTrip`, `activeBedBooking`, `pendingApproval`, `commitFlow`, `patchActiveAmbulanceTrip`, `setCommitFlow`, `clearCommitFlow`, `setPendingApproval` → `useEmergencyTripStore()` selectors
  - `EmergencyContext` value: removed `commitFlow`, `patchActiveAmbulanceTrip`, `patchActiveBedBooking`, `setPendingApproval`, `setCommitFlow`, `clearCommitFlow`
  - `EmergencyContext` now broadcasts **zero raw trip data** — only XState lifecycle flags, start/stop actions, hospital/UI state
  - `useMapCommitDetailsController` still reads `setCommitFlow` from context → 5f
- **5f** ✅ COMPLETE — Migrate `useMapCommitDetailsController` `setCommitFlow` off context
  - 1 field (`setCommitFlow`) → `useEmergencyTripStore((s) => s.setCommitFlow)` selector
  - `useEmergency()` import fully removed from `useMapCommitDetailsController`
  - **No remaining active-path consumer reads any trip field from `useEmergency()`**

**Do last — after all 4 layers above are stable and verified in production.**

---

## Full Consumer Map — Remaining `useEmergency()` Callers

> Audited post-Phase-5d. Each file's reads categorised: ✅ safe in context | 🔴 raw trip (needs migration)

### `hooks/map/exploreFlow/useMapExploreFlow.js` → Phase 5e target

| Field                                            | Category           | Action  |
| ------------------------------------------------ | ------------------ | ------- |
| `activeAmbulanceTrip`                            | 🔴 raw trip        | → store |
| `activeBedBooking`                               | 🔴 raw trip        | → store |
| `pendingApproval`                                | 🔴 raw trip        | → store |
| `commitFlow`                                     | 🔴 raw trip        | → store |
| `patchActiveAmbulanceTrip`                       | 🔴 raw trip action | → store |
| `setCommitFlow` / `clearCommitFlow`              | 🔴 raw trip action | → store |
| `setPendingApproval`                             | 🔴 raw trip action | → store |
| `ambulanceTelemetryHealth`                       | ✅ derived         | stays   |
| `stopAmbulanceTrip` / `stopBedBooking`           | ✅ action          | stays   |
| `setAmbulanceTripStatus` / `setBedBookingStatus` | ✅ action          | stays   |
| `isArrived` / `isPendingApproval`                | ✅ XState flag     | stays   |
| hospitals / UI fields                            | ✅ context-owned   | stays   |

### `components/map/views/commitDetails/useMapCommitDetailsController.js` → Phase 5e or 5f

| Field           | Category           | Action                                    |
| --------------- | ------------------ | ----------------------------------------- |
| `setCommitFlow` | 🔴 raw trip action | → store (after 5e strips it from context) |

### Screens — all safe in context (no raw trip reads)

| File                                    | Reads from `useEmergency()`                                                                              | Status                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `screens/SearchScreen.jsx`              | `specialties`, `selectedSpecialty`, `selectSpecialty`                                                    | ✅ stays                                                                        |
| `screens/WelcomeScreen.jsx`             | `setUserLocation`, `refreshHospitals`, `userLocation`                                                    | ✅ stays                                                                        |
| `screens/RequestAmbulanceScreen.jsx`    | coverage/mode fields only                                                                                | ✅ stays                                                                        |
| `screens/NotificationsScreen.jsx`       | `setMode`                                                                                                | ✅ stays                                                                        |
| `screens/NotificationDetailsScreen.jsx` | `setMode`                                                                                                | ✅ stays                                                                        |
| `screens/MoreScreen.jsx`                | coverage/mode fields only                                                                                | ✅ stays                                                                        |
| `screens/MapEntryLoadingScreen.jsx`     | `refreshHospitals`, `effectiveDemoModeEnabled`                                                           | ✅ stays                                                                        |
| `screens/EmergencyScreen.jsx`           | `activeAmbulanceTrip`, `activeBedBooking`, `pendingApproval`, `patchActiveAmbulanceTrip` + coverage/mode | ⚠️ DEPRECATED — zero router entry points, dead code, safe to delete post-5f     |
| `screens/BookBedRequestScreen.jsx`      | `clearSelectedHospital`, `setMode`, `effectiveDemoModeEnabled`                                           | ✅ stays                                                                        |
| `screens/MapScreen.jsx`                 | reads from `useMapExploreFlow()` only — zero direct `useEmergency()` calls                               | ⚠️ 1,434 lines — architectural violation (mandate: 500), decomposition required |

### Hooks — all safe in context (no raw trip reads)

| File                                      | Reads                                          | Status   |
| ----------------------------------------- | ---------------------------------------------- | -------- |
| `hooks/visits/useBookVisit.js`            | `allHospitals`, `effectiveDemoModeEnabled`     | ✅ stays |
| `hooks/search/useSearchRanking.js`        | `allHospitals`, `setMode`, `selectedSpecialty` | ✅ stays |
| `hooks/emergency/useHospitalSelection.js` | `mode`                                         | ✅ stays |

### Components — already migrated

| File                                                                  | Status               |
| --------------------------------------------------------------------- | -------------------- |
| `components/emergency/EmergencyRequestModal.jsx`                      | ✅ Phase 5d complete |
| `components/map/views/commitTriage/useMapCommitTriageController.js`   | ✅ Phase 5d complete |
| `components/map/views/commitPayment/useMapCommitPaymentController.js` | ✅ Phase 5d complete |
| `components/map/views/tracking/MapTrackingStageBase.jsx`              | ✅ Phase 5c complete |

---

## Phase 6 — Retire `EmergencyContext.jsx` shell

- After Phase 5f: context value contains zero raw trip data, no active-path consumer reads trip fields
- Remaining `useEmergency()` callers all read context-owned fields: `mode`, `hospitals`, `coverage`, `specialties`, `userLocation`, XState actions
- **Architecture**: Zustand stores (not atoms) for persistent client state, TanStack Query for server state
- **Gate**: Phases 5a–5f verified in production

### 6a ✅ COMPLETE (`bd9fa38`, fix `923f931`) — Create `useModeStore` (Zustand) + hydration integration

- Store: `stores/modeStore.js` — `mode`, `serviceType`, `viewMode`, `selectedSpecialty`
- Persistence: `MODE_PREFERENCES` storage key (database abstraction)
- Pattern: equality-guarded setters, immer middleware, follows `emergencyTripStore.js` structure
- Hydration: `hydrateModeStore()` wired into `runtime/RootRuntimeGate.jsx` `prepare()` — deterministic, before first render
- Stash audit: stash `@{0}` contained same files — no additional logic to adopt

### 6b ✅ COMPLETE (`cca3647`) — Create `useCoverageStore` + `useLocationStore`

- `stores/coverageStore.js` — `coverageModePreference`, `demoOwnerSlug`, `coverageModeOperation`, `forceDemoFetch`
- `stores/locationStore.js` — `userLocation`, `locationPermission`, `isTrackingLocation`
- Both hydrated in `RootRuntimeGate.jsx` via `Promise.all` — parallel, deterministic
- Stash audit: `useCoverageMode.js` (useState pattern) rejected; `useEmergencyLocationSync.js` GPS logic noted for consumer migration

### 6c — Consumer migration (one screen at a time)

#### 6c-1 ✅ COMPLETE (`3821ee3`) SearchScreen (pilot)

- `mode`, `setMode`, `selectedSpecialty`, `selectSpecialty` → `useModeStore` direct selectors
- `allHospitals`, `specialties` remain on `useEmergency()` — server state, separate migration
- Pattern: surgical `useModeStore((s) => s.x)` selectors, no context blast radius

#### 6c-2 ✅ COMPLETE (`96a43a5`) NotificationsScreen

- `setMode` → `useModeStore((s) => s.setMode)` — `useEmergency()` import fully removed

#### Blocked screens — context-owned computed/service fields, not raw store fields

- `WelcomeScreen` — `setUserLocation` uses functional updater `(current) => newValue`; needs store API extension or Phase 6d resolution
- `MoreScreen` — `coverageMode` (resolved effective mode), `setCoverageMode` (async service action), `coverageStatus`/`isLiveOnlyAvailable`/`hasComfortableDemoCoverage` (server-derived) — all context-level, migrate in 6d

#### 6c complete — remaining screens deferred to 6d

- `RequestAmbulanceScreen` — `setMode` migratable but 8 other context service fields block partial migration
- `MapEntryLoadingScreen` — `coverageModePreferenceLoaded` migratable but `effectiveDemoModeEnabled`, `refreshHospitals`, `setUserLocation` block partial migration
- `BookBedRequestScreen` — `setMode` migratable but same service field blockers
- **Decision**: all 3 migrate transparently via `EmergencyContextAdapter` shim in 6d — no partial churn

### 6d ✅ COMPLETE (`42933ab`) — Wire existing EmergencyContext internals to Zustand stores

- **Stash adapter rejected**: stash `EmergencyContextAdapter.jsx` → `useEmergencyHospitals` → `useCoverageMode` (❌ REJECTED). Wholesale adoption would reintroduce rejected pattern.
- **Approach**: wire Zustand stores into the existing hook layer, not above it — `useEmergency()` signature unchanged, zero consumer blast radius

#### 6d-1 ✅ `useEmergencyTripState` — mode/serviceType/selectedSpecialty/viewMode → `useModeStore`

- All 4 `useState` calls replaced with `useModeStore` selectors
- `toggleMode`, `selectSpecialty`, `selectServiceType`, `toggleViewMode`, `resetFilters` updated to call store setters directly (no functional updaters needed)
- `selectedHospitalId` remains local `useState` — ephemeral UI selection, not persisted

#### 6d-2 ✅ `useEmergencyLocationSync` — `userLocation`/`setUserLocation` → `useLocationStore`

- `useState(null)` replaced with `useLocationStore` selector
- Functional updater pattern `setUserLocation((current) => ...)` replaced with `useLocationStore.getState()` read + direct `setUserLocation(value)` call
- Resolves `WelcomeScreen` blocker

#### 6d-3 ✅ `WelcomeScreen` — now fully off `useEmergency()` for location fields

- `setUserLocation` + `emergencyUserLocation` → `useLocationStore`
- `refreshHospitals` remains on `useEmergency()` — server action

### 6e ✅ COMPLETE — Dead code cleanup

#### 6e-1 (`5d83a7a`) `screens/EmergencyScreen.jsx`

- 1,482 lines deleted — zero router entry points, zero source imports confirmed
- **Recovery**: `git show 5d83a7a~1:screens/EmergencyScreen.jsx`

#### 6e-2 (`7f260f8`) EmergencyBottomSheet cluster — orphaned by EmergencyScreen deletion

All files below were exclusively owned by `EmergencyScreen`. `MapScreen` uses `MapSheetOrchestrator` — confirmed independent.

**Components deleted:**

- `components/emergency/EmergencyBottomSheet.jsx` — main sheet host (~540 lines)
- `components/emergency/BottomSheetController.jsx` — ref-forwarding wrapper
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

## MapScreen Decomposition — Parallel Track (not Phase 6)

- `MapScreen.jsx` is **1,434 lines** — architectural violation (mandate: max 500 for screen files)
- No direct `useEmergency()` calls — all data flows via `useMapExploreFlow()`
- Decomposition scope: extract inline logic into sub-hooks/controllers (rating, history, route reconciliation, tracking timeline)
- **Gate**: independent of Phase 6 — can be scoped and executed separately
- **Stash warning**: stash attempted this via `hooks/map/shell/` (14 files) bundled with everything else — do NOT repeat that pattern. Scope as its own dedicated phase.

---

## Non-Negotiable Principles

1. **Never combine phases** — stash proved this breaks the app
2. **Behaviour parity before proceeding** — verify each phase before starting next
3. **EmergencyContext.jsx stays alive until Phase 5**
4. **XState machine covers ambulance AND bed booking**
5. **All state transitions logged/observable via DevTools**
6. **PULLBACK NOTE comments on every change** — clear OLD/NEW for rollback
7. **No blast radius** — each phase has zero or minimal consumer changes until Phase 5
8. **Never commit without explicit user permission** — stage → show summary → await "commit"
9. **Always add commit hash to roadmap doc** as part of phase deliverable
10. **Before writing any new store/service** — verify exact API methods from an existing working file (`emergencyTripStore.js` is canonical). Database API is `.read/.write`, not `.get/.set`

### File Line Count Rules (Apple HIG Architecture Standards)

Flag any file exceeding its target — mandatory refactor above max:

| File type                 | Target  | Max | Violation threshold                    |
| ------------------------- | ------- | --- | -------------------------------------- |
| Route / Layout            | 20–100  | 150 | >150 → flag                            |
| Screen                    | 250–400 | 500 | >500 → flag, >800 → mandatory refactor |
| UI Component              | 80–250  | 350 | >350 → flag                            |
| Complex Feature Component | 150–300 | 450 | >450 → flag                            |
| Hook                      | 80–200  | 300 | >300 → flag                            |
| Controller                | 150–300 | 400 | >400 → flag                            |
| State file (store/atom)   | 30–150  | 250 | >250 → flag                            |
| Service                   | 100–300 | 500 | >500 → flag                            |
| Utils / helpers           | 30–150  | 200 | >200 → flag                            |

> **Hard rules**: >800 lines → mandatory refactor candidate. >1000 lines → architectural violation (unless generated).  
> Never judge by line count alone — flag **responsibility leakage** too.

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

## Phase 6d Post-Mortem — iOS Map Loading Regression

> **Severity**: Critical — full app unusable on iOS for several hours.  
> **Date**: 2026-04-26  
> **Discovered**: Immediately after Phase 6d landed in dev.  
> **Resolved**: Same session via 4 minimal upstream fixes + 1 store-level guard.

### Symptom Surface

- iOS only — Android worked throughout.
- Map screen stuck on `"Loading map / Live surface"` overlay forever.
- Even after overlay dismissal experiment, map showed only the static `loadingBackgroundImageUri` — no live tiles.
- Authenticated users were also bounced back to Welcome screen on cold start (separate but co-occurring issue).
- Worked on Metro restart sometimes; reload often re-broke it.
- `react-native-maps` itself worked when isolated (bare `MapView` test rendered tiles + fired `onMapReady`).

### Debugging Journey (the struggles)

This took **multiple iterative log + reload cycles** to isolate. Notable wrong turns:

1. **First hypothesis** — overlay state machine bug. Added a session latch in `useMapLoadingState`. Helped overlay dismiss but underlying `mapReadiness.mapReady` was never propagating.
2. **Second hypothesis** — store re-render not firing. Added `[MapCB]` log. Confirmed `setMapReadiness` IS dispatching and the parent IS re-rendering with new `mapReadiness`. So why wasn't `useMapLoadingState`'s effect firing?
3. **Third hypothesis** — native map module broken. Added a bare `<MapView>` directly in `MapScreen`. It rendered tiles and fired `onMapReady` — proving `react-native-maps` was fine.
4. **Fourth hypothesis (WRONG — noted for honesty)** — suspected `mapType="mutedStandard"` was silently failing on iOS dev clients. Switched to `"standard"` and observed tiles loading. **This was a misattribution.** The map was actually rendering all along; the loading overlay was just covering it. The latch and validity fixes I added in parallel were what actually unblocked rendering. `mutedStandard` is a valid Apple Maps style with no entitlement requirements. Decision: keep `"standard"` for now since it's the simpler default, but `mutedStandard` can be used freely in iOS dev or prod.
5. **Real cause finally surfaced** via `[MapLoad] render` log: `hasActiveLocation` was flipping from `true` → `false` between renders, **even though `[MapLoc] sources` reported `activeLocation: "set"`**. The `||` chain was picking up a truthy-but-empty `emergencyUserLocation` object from the Zustand store.

The deceptive thing: each component's logging looked locally consistent, but the boolean derivation `hasActiveLocation = Boolean(loc.latitude && loc.longitude)` quietly disagreed with the upstream `||` chain that only checked truthiness.

### Root Causes (multi-layered)

1. **`useMapLocation` `||` chain accepted truthy-but-coordinate-less objects.** Phase 6d migrated `userLocation` from local `useState` → Zustand `useLocationStore`. The store could hold a partial/empty object that was truthy but had no valid `latitude`/`longitude`. The `||` chain `manualLocation?.location || emergencyUserLocation || globalUserLocation` picked the empty store object and short-circuited — masking `globalUserLocation`'s real coordinates. `hasActiveLocation = Boolean(lat && lng)` then evaluated `false`, blocking `isMapFrameReady` forever.

2. **`isMapReady` fallback timeout was guarded by `hasLocation`.** The 900ms safety timer in `EmergencyLocationPreviewMap` would only schedule if `hasLocation` was already truthy at the time the effect ran. If location arrived later, the timer never fired and there was no compensation if `onMapReady` was delayed by other render churn. Compounded with #1 to leave the overlay stuck.

3. **AuthContext race window on iOS.** `loading` flipped to `false` (in `finally`) before `user`/`token` were set from the slower iOS network `getCurrentUser()` call. `/(user)/_layout` saw `loading=false && isAuthenticated=false` and redirected authenticated users to `/(auth)`. Independent of map issue but co-occurring on iOS only because the iOS network path is slower.

### Fixes Applied (all minimal, upstream)

| File                                                          | Fix                                                                                                                                                                                                                                    |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | -------- |
| `hooks/map/exploreFlow/useMapLocation.js`                     | Added `hasValidCoords()` guard. Each location source must have finite `latitude`/`longitude` before being accepted by the `                                                                                                            |     | ` chain. |
| `hooks/map/exploreFlow/useMapLoadingState.js`                 | Added `hadLocationLatchRef` so once we've ever had a valid location this mount, it stays effective. Defends against transient flapping mid-render.                                                                                     |
| `components/emergency/intake/EmergencyLocationPreviewMap.jsx` | Removed `!hasLocation` guard from `isMapReady` fallback timeout so it always fires. (Switched `mapType` to `"standard"` during debugging — retained as a simpler default, but `mutedStandard` is also valid; this was not a real fix.) |
| `contexts/AuthContext.jsx`                                    | Seed `user`/`token` from `database.read(StorageKeys.CURRENT_USER)` synchronously before the async `getCurrentUser()` API call.                                                                                                         |
| `stores/locationStore.js` (defense-in-depth)                  | `setUserLocation` and `patchUserLocation` now reject objects without finite `latitude`/`longitude`. Empty/partial objects can no longer enter the store as truthy sentinels.                                                           |

### Permanent Architectural Rules (added to canon)

1. **Never use `||` chains over objects when you actually need field validity, not truthiness.** Always validate the field consumers will gate on (`lat/lng`, `id`, `requestId`). Empty-object sentinels in stores are a recurring pitfall.
2. **Zustand stores migrated from `useState` MUST preserve null-vs-set semantics.** Don't store `{}`. Store `null`. Validate at the action entry point.
3. **Don't assert hypotheses as root causes without isolated verification.** During this session I claimed `mutedStandard` was the bug because the symptom went away when I changed it — but I had also changed two other things. Always isolate one variable at a time before declaring root cause.
4. **Auth guards in route layouts must not rely on `loading` alone.** Always seed from cache before async network sync, so `loading=false` implies authoritative state. The `loading→false` transition is a contract, not a hint.
5. **Fallback timers must not be guarded by the very state they're meant to compensate for.** If a 900ms timeout exists to ensure readiness when `onMapReady` doesn't fire, it must not be conditional on `hasLocation`.
6. **When derivation of a downstream boolean disagrees with an upstream "set/null" log, the bug is in the predicate.** Always log the predicate components, not just truthiness.

### Audit of Sibling Stores (post-fix)

| Store                   | Truthy-empty risk                                           | Verdict                                |
| ----------------------- | ----------------------------------------------------------- | -------------------------------------- |
| `modeStore.js`          | Primitives only (`string \| null`)                          | ✅ Safe                                |
| `coverageStore.js`      | `coverageModeOperation` always written with full shape      | ✅ Safe                                |
| `emergencyTripStore.js` | Trip objects always carry `requestId`; consumers gate on it | ✅ Contained                           |
| `locationStore.js`      | **Was vulnerable**                                          | ✅ Now hardened (validity guard added) |

### Outstanding Tech Debt

- [ ] Consider adding a runtime dev-only assertion: if a Zustand store action receives an object missing required fields, throw in `__DEV__` to surface bugs at write time.
- [ ] Optional: re-enable `mutedStandard` on iOS for the muted Apple Maps look — fully supported, no entitlements required.

---

## Stash Files Available (Review Before Use)

| File                                    | Phase   | Status                                |
| --------------------------------------- | ------- | ------------------------------------- |
| `stores/emergencyTripStore.js`          | Phase 1 | Available — review for feature parity |
| `hooks/emergency/useHospitalsQuery.ts`  | Phase 2 | Available — review for feature parity |
| `hooks/emergency/useActiveTripQuery.ts` | Phase 2 | Available — review for feature parity |
| `atoms/mapFlowAtoms.js`                 | Phase 3 | Available — review for feature parity |
| `contexts/EmergencyContextAdapter.jsx`  | Phase 5 | Available — use LAST                  |

**Warning**: The stash attempted all 5 phases simultaneously and broke the app.  
Use stash files as reference only — do not apply wholesale.

---

## Phase 7 — Deprecation Register

> **Rule**: Do NOT delete. Mark deprecated in-file with a `@deprecated` header comment.  
> Files are kept for quick reference and git recovery. Deletion only after MapScreen decomposition confirms zero live usage.

---

### 7a — Screens deprecated (router entry still exists but surface is superseded)

| File                                 | Lines | Superseded By                                       | Status                                                                              |
| ------------------------------------ | ----- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `screens/MoreScreen.jsx`             | 1,492 | `MiniProfileModal` + `(user)/(stacks)/*` direct nav | ⚠️ DEPRECATED — router entry `app/(user)/(stacks)/more.js` still live, mark in-file |
| `screens/RequestAmbulanceScreen.jsx` | 802   | `MapSheetOrchestrator` commit flow                  | ⚠️ DEPRECATED — still routed from stacks, mark in-file                              |
| `screens/BookBedRequestScreen.jsx`   | ~400  | `MapSheetOrchestrator` bed decision flow            | ⚠️ DEPRECATED — still routed from stacks, mark in-file                              |
| `screens/MapEntryLoadingScreen.jsx`  | ~80   | `MapExploreLoadingOverlay` inside MapScreen         | ⚠️ DEPRECATED — confirm router entry before marking                                 |

---

### 7b — Components deprecated (exclusively owned by deprecated screens)

#### Owned by `RequestAmbulanceScreen` / `BookBedRequestScreen`

| File                                             | Notes                                                                                                                                               |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/emergency/EmergencyRequestModal.jsx` | **2,926 lines** — entire legacy request modal. Used only by `RequestAmbulanceScreen` + `BookBedRequestScreen`. Map sheet flow replaces it entirely. |
| `components/emergency/requestModal/*`            | All sub-components of `EmergencyRequestModal` (12 files)                                                                                            |
| `components/emergency/triage/*`                  | `TriageIntakeModal` and helpers — owned by `EmergencyRequestModal`                                                                                  |
| `components/emergency/RequestAmbulanceFAB.jsx`   | No live import found outside deprecated screens                                                                                                     |
| `components/emergency/emergencyFlowContent.js`   | Only imported by `EmergencyRequestModal` + `EmergencyIOSMobileIntakeView`                                                                           |

#### Owned by `EmergencyScreen` (deleted in 6e) or no live consumers

| File                                              | Notes                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| `components/emergency/HospitalDetailView.jsx`     | No live import — only imported by itself (self-ref)                             |
| `components/emergency/HospitalCard.jsx`           | Only imported by `HospitalDetailView` (also deprecated)                         |
| `components/emergency/Call911Card.jsx`            | No live import found                                                            |
| `components/emergency/ServiceTypeSelector.jsx`    | No live import found — `SearchScreen` now uses `SearchSpecialtyStrip`, not this |
| `components/emergency/EmergencyMapContainer.jsx`  | Only used inside `EmergencyIOSMobileIntakeView` (intake flow)                   |
| `components/emergency/ServiceRatingModal-old.jsx` | Old file — superseded by `ServiceRatingModal.jsx`                               |

#### Still live — DO NOT deprecate

| File                                               | Notes                                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------------- |
| `components/emergency/MiniProfileModal.jsx`        | ✅ LIVE — used in `MapScreen` as MoreScreen replacement                         |
| `components/emergency/ServiceRatingModal.jsx`      | ✅ LIVE — used in `MapScreen` (history + recovered rating)                      |
| `components/emergency/SpecialtySelector.jsx`       | No live import found — replaced by `components/search/SearchSpecialtyStrip.jsx` |
| `components/emergency/EmergencySearchBar.jsx`      | ✅ LIVE — used in `SearchMainContent`                                           |
| `components/emergency/ContactCard.jsx`             | ✅ LIVE — used in `EmergencyContactsScreen`                                     |
| `components/emergency/CoverageDisclaimerModal.jsx` | ⚠️ REVIEW — no source import found, confirm before deprecating                  |
| `components/emergency/DemoBootstrapModal.jsx`      | ⚠️ REVIEW — no source import found, confirm before deprecating                  |
| `components/emergency/intake/*`                    | ⚠️ REVIEW — owned by `RequestAmbulanceScreen` intake flow, deprecates with it   |

---

### 7c — Cleanup order (follow MapScreen decomposition passes)

1. After each MapScreen pass confirms zero regression → mark that pass's displaced component deprecated
2. `MoreScreen` → mark deprecated after `MiniProfileModal` covers all nav entry points
3. `RequestAmbulanceScreen` + `BookBedRequestScreen` → mark deprecated after map sheet commit flow is proven stable
4. `EmergencyRequestModal` cluster → mark deprecated with `RequestAmbulanceScreen`
5. Orphaned leaf components (HospitalDetailView, Call911Card, etc.) → delete, not just deprecate — no consumers, no value in keeping

---

## Tracking Sheet Phase — Canonical Decision Diagram

**Purpose**: Single source of truth for "what sheet phase should be active" as a function of the
5-layer state. Use this when reasoning about any tracking-related auto-open / auto-close defect.

### Inputs (in priority order)

| #   | Input                  | Layer     | Source                                                                      |
| --- | ---------------------- | --------- | --------------------------------------------------------------------------- |
| 1   | `hasActiveTrip`        | XState    | `useTripLifecycle()` — canonical "are we tracking?"                         |
| 2   | `isRatingPending`      | XState    | `useTripLifecycle()` — completion → rate gate                               |
| 3   | `trackingRequestKey`   | Zustand   | `activeMapRequest.requestId` — identity for hospital resolution             |
| 4   | `sheetPhase`           | Jotai     | `mapSheetPhaseAtom` — current sheet (EXPLORE*INTENT / TRACKING / COMMIT*\*) |
| 5   | `trackingDismissedRef` | React ref | User explicitly closed tracking sheet for this request                      |
| 6   | History selection      | Call site | `handleSelectHistoryItem(historyItem)`                                      |
| 7   | Payment commit         | Call site | `useMapCommitFlow.finishCommitPayment()`                                    |

### Decision rules (evaluated each render)

```
IF !hasActiveTrip OR !trackingRequestKey:
    IF sheetPhase == TRACKING: revert → EXPLORE_INTENT
    ELSE: leave sheetPhase unchanged
    (rating modal may still render — driven by trackingRatingStateAtom)

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

Implemented in `@hooks/map/exploreFlow/useMapTracking.js` (Pass C — XState gate).

### Cross-cutting renderers (NOT gated on sheetPhase)

| Renderer               | Gating signal                                 | Location         |
| ---------------------- | --------------------------------------------- | ---------------- |
| In-flow rating modal   | `trackingRatingStateAtom.visible` (persisted) | `MapScreen` root |
| Recovered rating modal | `recoveredRatingState`                        | `MapScreen` root |
| History rating modal   | `historyRatingState`                          | `MapScreen` root |

These survive sheet phase transitions by mounting at `MapScreen` root, not inside
`MapTrackingStageBase` (Pass B — rating modal lift).

### History "Resume tracking" routing

`handleSelectHistoryItem` (`@screens/MapScreen.jsx`) gates resume on:

```
matchesActiveEmergencyRequest =
    sourceKind == "emergency" &&
    historyItem.requestId in activeHistoryRequestKeys
```

- Match → `openTracking()`
- Mismatch → `openVisitDetail(historyItem)`

This prevents the auto-revert race where `openTracking` would fire for a stale request
and `useMapTracking`'s effect would immediately revert to EXPLORE_INTENT (Pass E).

### Tracking-Sheet-Phase Audit

See `docs/audit/TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md` for the full audit, defect
classes, and pass-by-pass implementation plan.

---

## Related Docs

- `docs/architecture/MAP_EXPLORE_FLOW_MODULARIZATION.md` — completed hook extraction
- `docs/architecture/REFACTORING_BIBLE.md` — overall refactoring principles
- `docs/architecture/roadmap/IMPLEMENTATION_ROADMAP.md` — product roadmap
- `docs/audit/TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md` — tracking sheet audit + pass plan
- `docs/architecture/TRACKING_SHEET_LEARNINGS.md` — cross-cutting defect classes from tracking audit

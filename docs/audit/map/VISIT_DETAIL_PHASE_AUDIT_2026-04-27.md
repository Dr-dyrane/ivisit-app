# Visit Detail Phase Audit
**Date**: 2026-04-27  
**Status**: ALL PASSES COMPLETE (VD-A through VD-G)  
**Scope**: Wide — tracking → visit detail handoff · rating modal chain · re-booking entry · visit stack pages  
**Method**: Three-angle convergent review — (1) data flow & layer assignment, (2) adversarial edge cases & state machine contracts, (3) Apple HIG & UX quality.  
**Guide**: `TRACKING_SHEET_LEARNINGS.md` defect classes 2.1–2.14 · `PRE_TRACKING_PHASE_AUDIT_2026-04-27_FINAL.md` constraint list.

---

## 0. Scope Chain

```
Tracking sheet (useMapTrackingController)
  → Complete CTA → handleCompleteAmbulanceWithRating / handleCompleteBedWithRating
    → deferCleanup → writeTrackingRatingRecoveryClaim → setRatingState (Jotai atom)
      → ServiceRatingModal (lifted to MapScreen via useTrackingRatingFlow)
        → submitRating / skipRating → finalizeCompletedTracking (stopAmbulanceTrip / stopBedBooking)
          → Zustand cleared → tracking auto-open effect fires (isTripActive=false) → EXPLORE_INTENT

History item tap (MapScreen handleSelectHistoryItem)
  → canResumeLiveRequest? → openTracking()
  → else → setSelectedHistoryVisitKey → openVisitDetail(historyItem)
    → MapVisitDetailStageBase → useMapVisitDetailModel
      → canResume → onResume (handleResumeHistoryRequest → openTracking)
      → canRate → onRateVisit (handleRateHistoryVisit → historyRatingState modal)
      → canBookAgain → onBookAgain (handleBookAgainFromVisit)
        → [BRIDGE] router.push('/(user)/(stacks)/book-visit')

Recovery path (MapScreen useEffect)
  → pendingRecoveredRatingVisit → setRecoveredRatingState → recovered ServiceRatingModal
```

**Files audited**:
- `hooks/visits/useVisitHistorySelectors.js` — `canResume`, `canRate`, `canBookAgain` derivation
- `components/map/surfaces/visitDetail/useMapVisitDetailModel.js` (1402 lines)
- `components/map/views/tracking/useMapTrackingController.js` — rating flow
- `hooks/map/exploreFlow/useTrackingRatingFlow.js` — screen-level rating handler
- `hooks/map/exploreFlow/useMapTracking.js` — auto-open + closeTracking
- `hooks/map/exploreFlow/useMapSheetNavigation.js` — openVisitDetail / closeVisitDetail
- `screens/MapScreen.jsx` — orchestration, selectedHistoryVisitKey, recovery rating
- `components/map/views/visitDetail/MapVisitDetailStageBase.jsx` — shell

---

## 1. Defect Register

Priority order: CRITICAL → HIGH → MEDIUM → LOW.

---

### VD-1 — `canResume` derived from visit status only — not from live Zustand trip state
**Severity**: 🔴 HIGH  
**Defect class**: 2.2 (data race at state transition boundary)  
**Files**: `useVisitHistorySelectors.js` line 506, `useMapVisitDetailModel.js` line 1018, `MapScreen.jsx` lines 376–383

```js
// useVisitHistorySelectors.js line 506
canResume: status === "active" || status === "pending",
```

`canResume` is derived from the **visit's Supabase `lifecycleState`** field (`active` / `pending`), not from whether `activeAmbulanceTrip` / `activeBedBooking` is set in Zustand.

**The gap**: After `stopAmbulanceTrip` runs (Zustand cleared), the visit's `lifecycleState` in Supabase may remain `active` until the server write (`updateVisit(MONITORING)` or the completion write) propagates and the local visits selector re-derives. During this window:
- Zustand: `activeAmbulanceTrip = null` → `hasActiveTrip = false` → tracking auto-open effect fires → EXPLORE_INTENT
- Visit selector: `canResume = true` (status still `active` in local cache)
- Visit detail sheet: "Track" button enabled → user taps → `handleResumeHistoryRequest` → `openTracking()` → tracking sheet opens with no active trip → blank/empty tracking surface

**MapScreen double-check (line 376–383)**: `handleSelectHistoryItem` has its own `canResumeLiveRequest` guard that checks `activeMapRequest?.hasActiveRequest`. This guard is correct — it bypasses visit detail and calls `openTracking()` directly. **But it only runs at tap time**. If the user already has the visit detail sheet open when the trip completes, `canResume` stays true until the visit selector re-derives. The "Track" button in the already-open detail stays live.

**Gold Standard fix**: `canResume` in the model must be gated on BOTH `historyItem.canResume` (visit status) AND `Boolean(activeMapRequest?.hasActiveRequest && matchesActiveEmergencyRequest)` (Zustand identity). The model needs the live `activeMapRequest` threaded in. **Pass: VD-B**.

---

### VD-2 — `handleRateHistoryVisit` opens a separate `historyRatingState` modal — parallel rating path
**Severity**: 🔴 HIGH  
**Defect class**: 2.14 (duplicate state machine for same operation)  
**Files**: `MapScreen.jsx` lines 1054–1080, `useTrackingRatingFlow.js`

There are **two independent rating paths** in the codebase:

1. **In-flow path** (from tracking sheet completion): `setRatingState` (Jotai `trackingRatingStateAtom`) → `useTrackingRatingFlow` → lifted `ServiceRatingModal` at screen root. Has `deferCleanup`, `completionCommitted`, recovery claim write/delete.

2. **History visit detail path** (from visit detail "Rate" button): `handleRateHistoryVisit` → `setHistoryRatingState` (`useState` in `MapScreen`) → separate `ServiceRatingModal` instance. Does NOT call `updateVisit`. Does NOT write/delete recovery claim. Does NOT call `stopAmbulanceTrip`/`stopBedBooking`. Does NOT check `completionCommitted`.

```js
// MapScreen line 1054-1059
const handleRateHistoryVisit = useCallback(() => {
  if (!selectedHistoryVisit?.id || !selectedHistoryVisit?.canRate) return;
  setHistoryRatingState({
    visible: true,
    ...
  });
}, [selectedHistoryVisit]);
```

**If a user taps Rate from the visit detail sheet**: rating modal opens, user submits — but `updateVisit` to `COMPLETED` may not fire (depends on which `ServiceRatingModal` submit handler is wired). The visit stays `rating_pending` in Supabase. Next time the visit detail opens, `canRate` is still true. Duplicate ratings possible.

**Gold Standard fix**: Consolidate both rating paths into `useTrackingRatingFlow`. History visit detail "Rate" button should call `openRatingForVisit(historyItem)` — a new entrypoint on the single rating flow that sets `completionCommitted: true` (completion already happened), skips `deferCleanup`, and runs the same `resolveTrackingRatingSubmit` path. **Pass: VD-C**.

---

### VD-3 — `selectedHistoryVisitKey` is `useState` — survives across sheet phases, bleeds into wrong surface
**Severity**: 🟡 MEDIUM  
**Defect class**: 2.8 (state surviving wrong mount cycle)  
**Files**: `MapScreen.jsx` lines 170, 253–256, 386–388, 400–404

```js
const [selectedHistoryVisitKey, setSelectedHistoryVisitKey] = useState(null);
```

`selectedHistoryVisitKey` drives `selectedHistoryVisit` (the `useMemo` at line 247). When the visit detail sheet is closed via `closeHistoryVisitDetails`, it calls `setSelectedHistoryVisitKey(null)` + `closeVisitDetail()`.

**But**: if the user navigates away from visit detail by opening a different sheet phase (e.g., tapping a hospital → HOSPITAL_DETAIL), the sheet phase changes but `selectedHistoryVisitKey` is NOT cleared (only `closeHistoryVisitDetails` clears it). When the user later taps back to EXPLORE_INTENT and then opens a visit, `selectedHistoryVisit` still resolves to the previous visit until `handleSelectHistoryItem` sets a new key.

**Compound**: `historyFocusedHospital` (line 686) is derived from `selectedHistoryVisit` and directly controls which hospital is focused on the map. Stale `selectedHistoryVisitKey` means the map focuses the wrong hospital pin even after the user has navigated away.

**Gold Standard fix**: `selectedHistoryVisitKey` belongs in a Jotai atom reset on `closeVisitDetail`. Alternatively — reset it whenever `sheetPhase !== VISIT_DETAIL`. **Pass: VD-B**.

---

### VD-4 — `useMapVisitDetailModel` has two `useState` + async `useEffect` API calls — layer violations
**Severity**: 🟡 MEDIUM  
**Defect class**: V-1 (API-derived state in useState + useEffect)  
**Files**: `useMapVisitDetailModel.js` lines 514–536, 823–860

**Violation 1 — Hospital detail fetch** (lines 514–536):
```js
const [hospitalDetails, setHospitalDetails] = useState(null);
useEffect(() => {
  ...
  const record = await hospitalsService.getById(hospitalId);
  setHospitalDetails(record);
}, [hospitalId]);
```
Belongs in TanStack Query. No loading/error state, no dedup, no cache. Every time the sheet opens for the same hospital, it re-fetches.

**Violation 2 — Payment history fallback fetch** (lines 823–860):
```js
const [fetchedPriceLabel, setFetchedPriceLabel] = useState(null);
useEffect(() => {
  ...
  const entry = await paymentService.getPaymentHistoryEntry({...});
  setFetchedPriceLabel(label);
}, [paymentLookupKey, localPaymentTotalLabel, ...]);
```
Belongs in TanStack Query. The `localPaymentTotalLabel` dep means this fires again whenever the local label changes — including when the same visit is re-rendered after unrelated state changes.

**Gold Standard fix**: Both → `useQuery` with stable keys. `useHospitalDetailQuery(hospitalId)` and `usePaymentHistoryEntryQuery(paymentLookupKey)`. **Pass: VD-D**.

---

### VD-5 — `canBookAgain` bridges to legacy full-screen route — sheet-native re-booking not implemented
**Severity**: 🟡 MEDIUM  
**Defect class**: architectural gap  
**Files**: `MapScreen.jsx` line 344–350 (comment + handler), `useVisitHistorySelectors.js` line 512

```js
// MapScreen — "temporarily bridged"
const handleBookVisitFromHistory = useCallback(() => {
  setRecentVisitsVisible(false);
  router.push("/(user)/(stacks)/book-visit");
}, []);
```

The visit detail "Book again" button (`canBookAgain`) calls `onBookAgain` which is wired to... nothing on the visit detail sheet props in `MapScreen`. Checking the prop threading:

`MapSheetOrchestrator` → `MapVisitDetailStageBase` props → `onBookAgain` — need to verify this is actually wired or silently null. If null, the "Book again" button in the detail sheet is dead but shows as enabled because `canRevisit = Boolean(historyItem?.canBookAgain && typeof onBookAgain === "function")` — if `onBookAgain` is undefined, `canRevisit = false` and button is disabled. But if a stub `() => {}` is passed, the button appears active and does nothing.

**Gold Standard fix**: Wire `onBookAgain` from visit detail to `openBookingFromVisit(historyItem)` — a new handler that pre-fills the commit wizard with the previous visit's hospital and service type. **Pass: VD-E (future — depends on sheet-native booking pass)**.

---

### VD-6 — `handleResumeHistoryRequest` calls `openTracking()` without verifying `hasActiveTrip`
**Severity**: 🔴 HIGH  
**Defect class**: 2.2 (data race)  
**Files**: `MapScreen.jsx` lines 1049–1052

```js
const handleResumeHistoryRequest = useCallback(() => {
  closeHistoryVisitDetails();
  openTracking?.();
}, [closeHistoryVisitDetails, openTracking]);
```

`openTracking()` reads `activeMapRequest` from Zustand at call time to resolve the hospital for `buildTrackingSheetView`. If `activeAmbulanceTrip` has been cleared (trip completed) but the visit's `canResume` is still `true` (VD-1), `openTracking()` will call `activeMapRequest.hospital` — which is now `null`. `resolveMapFlowHospital` receives no preferred hospital and falls back to `featuredHospital`/`nearestHospital`. The tracking sheet opens pointed at a random hospital — not the completed trip's hospital.

**Gold Standard fix**: `handleResumeHistoryRequest` must guard on `activeMapRequest?.hasActiveRequest` before calling `openTracking()`. If guard fails, stay on visit detail (or transition to EXPLORE_INTENT with a toast). Compound with VD-1 fix. **Pass: VD-B**.

---

### VD-7 — Recovery rating mechanism uses `useState` + `useMemo` chain with non-deterministic trigger
**Severity**: 🟡 MEDIUM  
**Defect class**: 2.2 (non-deterministic state trigger)  
**Files**: `MapScreen.jsx` lines 166–169, 926–957

```js
const [handledRecoveredRatingVersion, setHandledRecoveredRatingVersion] = useState(0);
const [ratingRecoveryClaims, setRatingRecoveryClaims] = useState({});
const [recoveredRatingState, setRecoveredRatingState] = useState(null);
```

`pendingRecoveredRatingVisit` (`useMemo`) derives from `visits` (selector) filtered by `ratingRecoveryClaims` (AsyncStorage-backed state). The `useEffect` at line 948 fires when `pendingRecoveredRatingVisit` changes and sets `recoveredRatingState`. The `canRecoverTrackingRating` guard (line 918) blocks recovery when `hasActiveMapModal` is true or `sheetPhase !== EXPLORE_INTENT`.

**Problem**: `ratingRecoveryClaims` is `useState` seeded from AsyncStorage — loaded asynchronously on mount. If the `visits` selector resolves before `ratingRecoveryClaims` loads, `pendingRecoveredRatingVisit` returns null (no claims to match against) → no recovery modal. When claims load, `useMemo` re-runs but may not retrigger the `useEffect` if `pendingRecoveredRatingVisit` identity hasn't changed. The recovery window is non-deterministic.

**Also**: `handledRecoveredRatingVersion` is a `useState` counter used as a useMemo dep to force re-evaluation. This is an anti-pattern — a version counter as a reactive dep is a `useReducer` / Jotai atom in disguise.

**Gold Standard fix**: `ratingRecoveryClaims` belongs in a Jotai atom seeded from AsyncStorage on app hydrate (same pattern as `trackingRatingStateAtom`). `handledRecoveredRatingVisitIdsRef` + version counter replaced by a single `handledRatingVisitIdsAtom` (Set-valued Jotai atom). **Pass: VD-C**.

---

### VD-8 — `useMapVisitDetailModel` is 1402 lines — architectural violation
**Severity**: 🟡 MEDIUM  
**Defect class**: file architecture violation (>1000 lines = mandatory refactor candidate)  
**Files**: `useMapVisitDetailModel.js`

Per gold standard rules: >1000 lines = architectural violation (unless generated). This file owns: theme tokens, 12+ pure helper functions (200 lines), two async data fetches (violations VD-4), presentation builders for hero/journey/triage/payment/actions/stats — all in one hook.

**Gold Standard fix**: Split into:
- `visitDetail.helpers.js` — pure formatters (`formatHumanWhen`, `resolveJourneyProgress`, etc.)
- `visitDetail.builders.js` — `buildJourney`, `buildTriageRows`, `buildVisitCollapsedAction`, etc.
- `useHospitalDetailQuery` / `usePaymentHistoryEntryQuery` — extracted queries (VD-4)
- `useMapVisitDetailModel.js` — slim orchestration only (~200 lines)

**Pass: VD-D**.

---

### VD-9 — `finalizeCompletedTracking` is duplicated in controller and screen-level flow
**Severity**: 🟡 LOW  
**Defect class**: DRY violation  
**Files**: `useMapTrackingController.js` lines 411–422, `useTrackingRatingFlow.js` lines 56–67

Identical `finalizeCompletedTracking` function:
```js
const finalizeCompletedTracking = useCallback((completeKind) => {
  if (completeKind === "ambulance") { stopAmbulanceTrip?.(); return; }
  if (completeKind === "bed") { stopBedBooking?.(); }
}, [stopAmbulanceTrip, stopBedBooking]);
```

Exists verbatim in both files. If the logic changes (e.g., adding bed check-out to both), it must be updated in two places.

**Gold Standard fix**: Extract to `mapTracking.rating.js` as `buildFinalizeCompletedTracking(stopAmbulanceTrip, stopBedBooking)` factory or export the function directly. **Pass: VD-G (low)**.

---

### VD-10 — `skipRating` / `submitRating` duplicated between controller and screen-level flow
**Severity**: 🟡 MEDIUM  
**Defect class**: DRY violation + dual ownership  
**Files**: `useMapTrackingController.js` lines 424–535, `useTrackingRatingFlow.js` lines 73–156

Both files implement `skipRating` and `submitRating` with nearly identical logic. The controller version has an extra `completionCommitted` guard (for the case where rating is opened from the recovery path before trip completion). The screen-level flow in `useTrackingRatingFlow` omits this because Pass B (tracking sheet audit) lifted the modal and assumed completion always happens before the modal opens.

**Risk**: If the screen-level `submitRating` is called on a visit where `completionCommitted = false` (recovery path where completion hasn't run), `stopAmbulanceTrip` is called via `finalizeCompletedTracking` without first calling `onCompleteAmbulanceTrip`. The trip is cleared from Zustand without the server write completing.

**Gold Standard fix**: Single `useTrackingRatingFlow` at screen root owns all rating logic. Remove `skipRating`/`submitRating`/`closeRating`/`finalizeCompletedTracking` from `useMapTrackingController` — controller only sets `ratingState` atom (open). Screen-level flow handles all close/skip/submit paths. **Pass: VD-C**.

---

### EC-VD-1 — Tracking → visit detail handoff: no `historyItem` at sheet open time for live trips
**Severity**: 🔴 HIGH  
**Files**: `MapScreen.jsx` lines 352–389, `useMapSheetNavigation.js` lines 237–248

`openVisitDetail(historyItem)` requires a fully-normalized `historyItem` object. This object comes from `useVisitHistorySelectors` which processes the Supabase `visits` table.

**For live emergency trips**: The visit may not exist in the local visits cache at the moment the user taps a history row, because the Supabase trigger `sync_emergency_to_visit` fires asynchronously after request creation. Between payment completion and the first Realtime push updating the visits cache, tapping a visit row returns a partially populated or missing item.

`handleSelectHistoryItem` calls `openVisitDetail(historyItem)` even if `historyItem` is sparse. `useMapVisitDetailModel` receives a sparse object → hero renders blank facility name → payment row shows null → journey is null. No error thrown.

**Gold Standard fix**: `handleSelectHistoryItem` should guard `historyItem` completeness before calling `openVisitDetail`. Minimum required fields: `requestId`, `requestType`, `facilityName`. If sparse, show skeleton or refetch before opening sheet. **Pass: VD-B**.

---

### EC-VD-2 — `closeVisitDetail` goes directly to EXPLORE_INTENT — back navigation breaks
**Severity**: 🟡 MEDIUM  
**Files**: `useMapSheetNavigation.js` lines 246–248

```js
const closeVisitDetail = useCallback(() => {
  setSheetView(buildExploreIntentSheetView(defaultExploreSnapState));
}, [defaultExploreSnapState, setSheetView]);
```

If visit detail was opened **from the MapHistoryModal** (not from the map), closing it goes to EXPLORE_INTENT instead of re-opening the history modal. The user loses their place in the history list.

**Gold Standard fix**: `openVisitDetail` should push a `sourcePhase` breadcrumb (same pattern as `buildSourceReturnSheetView` already in `mapExploreFlow.transitions.js`). `closeVisitDetail` returns to `sourcePhase` instead of hardcoding EXPLORE_INTENT. **Pass: VD-B**.

---

## 2. UX Problem Register (Apple HIG)

### UX-VD-1 — "Track" button enabled for completed trip (maps to VD-1, VD-6)
**HIG standard**: A CTA must only be enabled when the action is possible. Showing "Track" when no trip is live misleads the user and produces a broken surface.  
**Fix path**: VD-B.

### UX-VD-2 — "Rate" opens different modal depending on entry path (maps to VD-2)
**HIG standard**: Identical actions must produce identical outcomes. Two rating paths with different outcomes violate consistency principle.  
**Fix path**: VD-C.

### UX-VD-3 — Closing visit detail loses history list context (maps to EC-VD-2)
**HIG standard**: Back navigation returns to the previous context. A surface opened from a list should return to that list on dismiss.  
**Fix path**: VD-B.

### UX-VD-4 — Visit detail shows blank/sparse hero for live trips during Realtime sync gap (maps to EC-VD-1)
**HIG standard**: A surface in a loading state should communicate loading, not render empty/broken content.  
**Fix path**: VD-B — skeleton guard + minimum field check.

### UX-VD-5 — Recovery rating modal can interrupt new booking flow (prior audit finding)
**HIG standard**: A modal from a prior session must not interrupt an active user intent.  
**Fix path**: VD-C — `canRecoverTrackingRating` guard already partially handles this; needs `sheetPhase === COMMIT_PAYMENT` added to the block list.

---

## 3. Layer Contract Audit

| State | Current layer | Correct layer | Defect |
|---|---|---|---|
| `selectedHistoryVisitKey` | `useState` (MapScreen) | Jotai atom | VD-3 |
| `recoveredRatingState` | `useState` (MapScreen) | Jotai atom | VD-7 |
| `historyRatingState` | `useState` (MapScreen) | Merge into `trackingRatingStateAtom` | VD-2 |
| `handledRecoveredRatingVersion` | `useState` counter | Remove — Jotai atom | VD-7 |
| `ratingRecoveryClaims` | `useState` (MapScreen) | Jotai atom seeded from AsyncStorage | VD-7 |
| `hospitalDetails` (model) | `useState` + `useEffect` | TanStack Query | VD-4 |
| `fetchedPriceLabel` (model) | `useState` + `useEffect` | TanStack Query | VD-4 |
| `canResume` (selector) | visit status only | visit status AND Zustand live trip | VD-1 |
| Rating skip/submit logic | duplicated in 2 hooks | single `useTrackingRatingFlow` | VD-10 |
| `finalizeCompletedTracking` | duplicated in 2 hooks | `mapTracking.rating.js` | VD-9 |

---

## 4. Pass Plan

One PR per pass. Behaviour parity verified before proceeding.

| Pass | Name | Defects | Files | Risk |
|---|---|---|---|---|
| **VD-A** | Diagnostic logging | All | `useMapTrackingController`, `MapScreen`, `useMapVisitDetailModel` | None |
| **VD-B** | `canResume` + handoff guard + back navigation | VD-1, VD-3, VD-6, EC-VD-1, EC-VD-2, UX-VD-1, UX-VD-3, UX-VD-4 | `useVisitHistorySelectors.js`, `MapScreen.jsx`, `useMapSheetNavigation.js`, `useMapVisitDetailModel.js` | Medium |
| **VD-C** | Rating path consolidation | VD-2, VD-7, VD-10, UX-VD-2, UX-VD-5 | `MapScreen.jsx`, `useTrackingRatingFlow.js`, `useMapTrackingController.js` | Medium |
| **VD-D** | TanStack Query + model split | VD-4, VD-8 | `useMapVisitDetailModel.js` (split) | Low-Medium |
| **VD-E** | Re-booking wiring | VD-5 | `MapScreen.jsx`, booking entry point | Low (bridge only) |
| **VD-G** | HIG polish + DRY | VD-9, UX-VD-1–5 | `mapTracking.rating.js`, UI components | Low |

---

## 5. Verified Clean

- **`useMapTrackingController` deferCleanup pattern** ✅ — `onCompleteAmbulanceTrip({ deferCleanup: true })` correctly defers `stopAmbulanceTrip` until after rating modal closes. `finalizeCompletedTracking` only runs post-submit/skip. Rating state context (hospitalTitle, providerName) is captured from Zustand BEFORE `stopAmbulanceTrip` clears it.
- **`trackingRatingStateAtom` persistence** ✅ — Jotai atom survives sheet phase transitions. `ServiceRatingModal` lifted to screen root by Pass B. Rating modal cannot be interrupted by sheet phase change.
- **`writeTrackingRatingRecoveryClaim` before `setRatingState`** ✅ — claim is persisted to AsyncStorage BEFORE the atom is set, so a crash between the two still has a recoverable claim.
- **`handleSelectHistoryItem` live trip guard** ✅ — `canResumeLiveRequest` guard correctly routes live trips to `openTracking()` instead of `openVisitDetail()` at tap time.

---

## 6. New Defect Classes (Append to TRACKING_SHEET_LEARNINGS.md)

- **2.15** — Duplicate rating paths. Two independent rating state machines (`trackingRatingStateAtom` path + `historyRatingState` useState path) for the same operation with divergent post-completion side effects. Rule: one operation = one state machine = one entrypoint. Extra entrypoints must funnel into the canonical path.
- **2.16** — `canResume` derived from visit DB status only, not live Zustand trip state. After trip cleanup, visit DB status lags Zustand by one Realtime cycle. Any CTA derived from visit status alone is incorrect for live-trip transitions. Rule: live-trip action capability must be gated on Zustand identity, not visit row status.

---

## 7. Checkpoint

```
PLAN: Visit Detail Phase Audit
STATUS: AUDIT COMPLETE — READY FOR VD-A

DEFECT SUMMARY:
  HIGH:    VD-1 (canResume stale — Track button enabled post-trip)
           VD-2 (dual rating paths — divergent side effects)
           VD-6 (handleResumeHistoryRequest no Zustand guard)
           EC-VD-1 (sparse historyItem for live trips at open time)
  MEDIUM:  VD-3 (selectedHistoryVisitKey wrong layer)
           VD-4 (two useState+useEffect API violations in model)
           VD-5 (canBookAgain bridge — sheet-native not wired)
           VD-7 (recovery rating mechanism non-deterministic)
           VD-8 (model file 1402 lines — architectural violation)
           VD-10 (skipRating/submitRating duplicated — risk: completionCommitted gap)
           EC-VD-2 (closeVisitDetail hardcoded to EXPLORE_INTENT)
  LOW:     VD-9 (finalizeCompletedTracking DRY violation)
  UX:      UX-VD-1 through UX-VD-5

VERIFIED CLEAN:
  - deferCleanup pattern in tracking controller
  - trackingRatingStateAtom persistence
  - writeTrackingRatingRecoveryClaim ordering
  - handleSelectHistoryItem live trip guard

NEW DEFECT CLASSES:
  2.15 — Duplicate rating paths
  2.16 — canResume from visit status only (not Zustand)

NEXT:
  VD-A — Add diagnostic logging only:
  - useMapTrackingController: log completeKind + visitId at handleCompleteAmbulanceWithRating entry
  - MapScreen: log canResumeLiveRequest vs canResume (visit) discrepancy at handleSelectHistoryItem
  - useMapVisitDetailModel: log canResume + historyItem.status + requestId at model build time
  - MapScreen: log selectedHistoryVisitKey changes + sheetPhase mismatch
  - MapScreen: log recoveredRatingState trigger (pendingRecoveredRatingVisit change)

FILES CHANGED IN THIS AUDIT (docs only):
  - docs/audit/VISIT_DETAIL_PHASE_AUDIT_2026-04-27.md (this file)
```

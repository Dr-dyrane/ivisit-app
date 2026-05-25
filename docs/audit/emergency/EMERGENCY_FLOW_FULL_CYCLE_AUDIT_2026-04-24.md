---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

> **HISTORICAL NOTICE — 2026-05-19**
> This is a completed audit from 2026-04-24. The issues it identified have been addressed in subsequent passes.
> Retained for historical context only.
> **Current reference:** [`docs/audit/map/passes/TRACKING_STATE_TIGHTENING_PASS_2026-05-19.md`](../map/passes/TRACKING_STATE_TIGHTENING_PASS_2026-05-19.md)
> **Working truth:** [`docs/flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md`](../../flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md)

---

# Emergency Flow Full Cycle Audit

**Date:** 2026-04-24
**Scope:** Complete data flow from payment completion -> tracking -> ride completion -> rating
**Objective:** Identify blockers to a fluid, seamless emergency flow

---

## 1. Full Flow Map

```
User taps "Request Ambulance"
  -> MapScreen: openAmbulanceDecision()
    -> User selects hospital
      -> openCommitDetails()
        -> User confirms
          -> openCommitTriage()
            -> User completes triage
              -> openCommitPayment()
                -> PaymentScreen (router push)
                  -> handlePayment() [usePaymentScreenModel.js:200]
                    -> processWalletPayment() / processPayment()
                      -> SUCCESS
                        -> Alert: "Track Now"
                          -> onPress: router.push('/(auth)/map') [LINE 235]
                            -> MapScreen mounts
                              -> useMapExploreFlow [hooks/map/exploreFlow/useMapExploreFlow.js]
                                -> useEffect watches trackingRequestKey [LINE 660]
                                  -> IF trackingRequestKey changes AND sheetPhase === EXPLORE_INTENT
                                    -> openTracking() [LINE 679]
                                      -> setSheetView(buildTrackingSheetView()) [LINE 642]
                                        -> Sheet shows tracking UI
                                          -> User watches ambulance approach
                                            -> User taps "Mark Arrived" / auto-arrived
                                              -> User taps "Complete Ride"
                                                -> handleCompleteAmbulanceTripWithRating() [EmergencyScreen.jsx:1178]
                                                  -> onCompleteAmbulanceTrip() [useEmergencyHandlers.js:91]
                                                    -> setRequestStatus(COMPLETED)
                                                    -> completeVisit(requestId)
                                                    -> setVisitLifecycle(RATING_PENDING)
                                                    -> stopAmbulanceTrip() -> CLEARS STATE [LINE 113]
                                                  -> setRatingState({ visible: true, ... }) [LINE 1183]
                                                    -> Rating modal appears
                                                      -> User submits rating
                                                        -> Rating modal closes
                                                          -> Flow complete
```

---

## 2. Files Involved in Full Cycle

| File | Role | Lines of Interest |
|------|------|-------------------|
| `hooks/payment/usePaymentScreenModel.js` | Payment completion, "Track Now" alert | 200-249 |
| `hooks/map/exploreFlow/useMapExploreFlow.js` | Map explore/tracking state machine | 575-687 |
| `components/map/core/mapActiveRequestModel.js` | Derives active request from state | 318-397 |
| `contexts/EmergencyContextAdapter.jsx` | Emergency state provider | 1-115 |
| `stores/emergencyTripStore.js` | Zustand store for trip state | 1-337 |
| `hooks/emergency/useEmergencySyncEngine.js` | Server sync, subscriptions | 20-255 |
| `hooks/emergency/useEmergencyTripRuntime.js` | Computed runtime values | 1-50 |
| `hooks/emergency/useEmergencyHandlers.js` | Trip lifecycle handlers | 91-129 |
| `hooks/emergency/useEmergencyLifecycle.js` | Trip lifecycle (newer version) | 76-100 |
| `screens/EmergencyScreen.jsx` | Rating modal trigger | 1178-1195 |
| `contexts/EmergencyUIContext.jsx` | Sheet snap index, UI state | 88-175 |

---

## 3. Critical Issues

### Issue 1: Payment -> Tracking Gap (SEVERITY: HIGH)

**Location:** `hooks/payment/usePaymentScreenModel.js:227-238`

**Current Code:**
```javascript
if (result.success) {
  Alert.alert(
    'Payment Successful',
    'Your request has been processed securely. Track your service real-time.',
    [
      {
        text: 'Track Now',
        onPress: () => router.push('/(auth)/map')  // -> NO STATE SYNC
      }
    ]
  );
}
```

**Problem:** After payment success, the app navigates to `/map` WITHOUT ensuring emergency state is populated. The map screen expects `activeAmbulanceTrip` to be set to trigger tracking automatically. But in production:
- Payment creates a request with status `pending_approval`
- Admin must manually approve (no auto-approval for non-demo hospitals)
- `syncActiveTripsFromServer` hasn't completed yet
- Map loads with `activeAmbulanceTrip = null`
- `trackingRequestKey = null`
- Tracking sheet doesn't open automatically

**Why Demo Works:**
- Demo hospitals use `demoEcosystemService.shouldSimulatePayments()`
- After 2.6s, `requestDemoCashAutoApproval()` calls edge function
- Edge function auto-approves payment
- Realtime subscription picks up the status change
- Triggers `syncActiveTripsFromServer('realtime_approval_to_active')`
- State is updated BEFORE user can tap "Track Now"

**Fix:**
```javascript
// In usePaymentScreenModel.js
import { useEmergency } from "../../contexts/EmergencyContext";

// In handlePayment:
const { syncActiveTripsFromServer } = useEmergency();

// After payment success:
onPress: async () => {
  await syncActiveTripsFromServer?.('payment_completion');
  router.push('/(auth)/map');
}
```

---

### Issue 2: Rating Modal Loses Context (SEVERITY: HIGH)

**Location:** `screens/EmergencyScreen.jsx:1178-1195`

**Current Code:**
```javascript
const handleCompleteAmbulanceTripWithRating = useCallback(async () => {
  const visitId = activeAmbulanceTrip?.id ?? activeAmbulanceTrip?.requestId ?? null;
  const hospitalName = activeAmbulanceTrip?.hospitalName ?? null;
  await onCompleteAmbulanceTrip?.();  // -> NO deferCleanup!
  if (!visitId) return;
  setRatingState({ visible: true, ... });
}, [...]);
```

**Problem:** `onCompleteAmbulanceTrip()` is called WITHOUT `{ deferCleanup: true }`. This means `stopAmbulanceTrip()` is called IMMEDIATELY, clearing `activeAmbulanceTrip` state. The rating modal is then shown, but:
- `activeAmbulanceTrip` is now `null`
- The rating modal's context (hospital name, provider, etc.) was read BEFORE the state clear
- But if any child component re-renders and reads from `activeAmbulanceTrip`, it gets null
- The `EmergencyContextAdapter` rebuilds context value, but the rating modal's local `visitId` variable is captured

**Secondary Issue:** The `useEmergencyHandlers` hook has `deferCleanup` support (line 94), but `useEmergencyLifecycle` (the newer version) ALSO has it (line 80). The `EmergencyScreen` uses `useEmergencyHandlers` (imported from old file), NOT `useEmergencyLifecycle`.

**Fix:**
```javascript
// In EmergencyScreen.jsx:1178
await onCompleteAmbulanceTrip?.({ deferCleanup: true });
// After rating is submitted/skipped:
stopAmbulanceTrip(); // clear state
```

---

### Issue 3: Dual Lifecycle Handler Implementations (SEVERITY: MEDIUM)

**Files:**
- `hooks/emergency/useEmergencyHandlers.js` (old, used by EmergencyScreen)
- `hooks/emergency/useEmergencyLifecycle.js` (new, used by EmergencyContextAdapter)

**Problem:** Two implementations of the same logic. `useEmergencyHandlers` is still used by `EmergencyScreen.jsx` while `useEmergencyLifecycle` is what `EmergencyContextAdapter` passes to context. This creates a split where fixes in one don't apply to the other.

**Evidence:**
- `EmergencyScreen.jsx` imports `useEmergencyHandlers` at ~line 1160
- `EmergencyContextAdapter.jsx` uses `useEmergencyLifecycle` at line 19

**Fix:** Consolidate on `useEmergencyLifecycle` and update `EmergencyScreen` to use the context-provided handlers directly.

---

### Issue 4: `useMapExploreFlow` Tracking UseEffect Race (SEVERITY: MEDIUM)

**Location:** `hooks/map/exploreFlow/useMapExploreFlow.js:660-687`

```javascript
useEffect(() => {
  if (!trackingRequestKey) {
    // If no request key and we're in tracking, reset to explore
    if (sheetPhase === MAP_SHEET_PHASES.TRACKING) {
      setSheetView(buildExploreIntentSheetView(defaultExploreSnapState));
    }
    return;
  }

  if (trackingDismissedRef.current || ...) {
    return;
  }

  if (sheetPhase === MAP_SHEET_PHASES.EXPLORE_INTENT) {
    openTracking();
  }
}, [..., trackingRequestKey]);
```

**Problem:** If the user taps "Track Now" quickly, the map may still be in `EXPLORE_INTENT` phase when `syncActiveTripsFromServer` completes. But if the user taps anything else (a hospital, search bar) before sync completes, the phase changes and tracking won't auto-open.

**Also:** `trackingDismissedRef` is module-level (or ref-level) and persists across re-renders but NOT across Metro reloads. However, after Pass 6, the store is now hydrated from storage, so the `trackingRequestKey` should be available on reload.

---

## 4. State Ownership Map

```
Zustand Store (emergencyTripStore.js)
â”œâ”€â”€ activeAmbulanceTrip     -> mutated by sync, start/stop
â”œâ”€â”€ activeBedBooking        -> mutated by sync, start/stop
â”œâ”€â”€ pendingApproval         -> mutated by sync
â”œâ”€â”€ commitFlow              -> mutated by commit flow
â”œâ”€â”€ eventGates              -> mutated by realtime events
â”œâ”€â”€ isSyncing               -> sync status
â”œâ”€â”€ lastSyncAt              -> sync timestamp
â””â”€â”€ hydrated                -> storage hydration status (Pass 6)

EmergencyContextAdapter
â”œâ”€â”€ Reads from store via useEmergencyTripRuntime()
â”œâ”€â”€ Adds: syncActiveTripsFromServer (from useEmergencySyncEngine)
â”œâ”€â”€ Adds: lifecycle handlers (from useEmergencyLifecycle)
â”œâ”€â”€ Adds: provider proxies (from useEmergencyProviders)
â””â”€â”€ Exposes all via EmergencyContext

useMapExploreFlow (MapScreen)
â”œâ”€â”€ Reads activeAmbulanceTrip from EmergencyContext
â”œâ”€â”€ Computes: activeMapRequest (via buildActiveMapRequestModel)
â”œâ”€â”€ Derives: trackingRequestKey = activeMapRequest.requestId
â”œâ”€â”€ Effect: watches trackingRequestKey -> opens tracking sheet
â””â”€â”€ Manages: sheetPhase, sheetView, snapPoints

EmergencyScreen
â”œâ”€â”€ Reads activeAmbulanceTrip from EmergencyContext
â”œâ”€â”€ Calls: onCompleteAmbulanceTrip() from useEmergencyHandlers
â”œâ”€â”€ Manages: ratingState (local useState)
â””â”€â”€ Shows: RatingModal when ratingState.visible
```

---

## 5. Recommended Fixes (Priority Order)

### Fix 1: Payment -> State Sync (HIGH)
**File:** `hooks/payment/usePaymentScreenModel.js:234-235`

Add explicit server sync before navigation to ensure tracking state is available when the map mounts.

### Fix 2: Rating State Preservation (HIGH)
**File:** `screens/EmergencyScreen.jsx:1181`

Pass `{ deferCleanup: true }` to `onCompleteAmbulanceTrip()` and clear state after rating is dismissed.

### Fix 3: Consolidate Lifecycle Handlers (MEDIUM)
**Files:** `screens/EmergencyScreen.jsx`, `hooks/emergency/useEmergencyHandlers.js`

Remove `useEmergencyHandlers` and use the context-provided `onCompleteAmbulanceTrip` from `useEmergency()`. This ensures single source of truth.

### Fix 4: Add Loading State During Payment Sync (LOW)
**File:** `hooks/payment/usePaymentScreenModel.js`

Show a loading indicator while `syncActiveTripsFromServer` runs after payment, so the user knows something is happening before navigation.

---

## 6. Validation Checklist

After fixes are applied:
- [ ] Payment success -> tap "Track Now" -> map opens -> tracking sheet auto-opens
- [ ] Complete ride -> rating modal appears immediately with correct context
- [ ] Rating modal shows hospital name, provider name, duration
- [ ] Submit rating -> state clears -> can start new booking
- [ ] Metro reload during active trip -> tracking sheet restores
- [ ] Demo flow still works (backward compatibility)
- [ ] Production flow works (manual approval scenario)

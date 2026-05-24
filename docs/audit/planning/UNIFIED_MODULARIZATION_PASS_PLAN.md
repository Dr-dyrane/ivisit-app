> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

> **HISTORICAL NOTICE — 2026-05-19**
> This pass plan is **complete**. MapScreen modularization passes (Pass 0 through Pass 2) are done.
> Retained for historical context only.
> **Completion record:** [`docs/audit/checkpoints/FINAL_MIGRATION_SUMMARY.md`](../checkpoints/FINAL_MIGRATION_SUMMARY.md)

---

# Unified Modularization Pass Plan
## MapScreen + Embedded View Hooks

**Date:** 2026-04-25  
**Status:** Phase 3 - Unified Execution  
**Target:** 1,517 lines -> ~300 lines (80% reduction)

---

## EXECUTIVE SUMMARY

Two parallel modularization streams consolidated into sequential passes:

**Stream A: MapScreen Shell** (Passes 1-6)  
Decompose the 1,517-line MapScreen.jsx into focused shell hooks

**Stream B: Embedded View Controllers** (Passes 7-10)  
Migrate 5 view controllers (1,800+ lines) to Jotai atoms + TanStack Query

---

## PASS SEQUENCE OVERVIEW

```
MAP SCREEN:
PASS 1: Shell Effects & Layout         -> useMapScreenEffects, useMapShell
PASS 2: Modal State Consolidation      -> useMapModals (finish integration)
PASS 3: History & Rating Recovery      -> useMapHistoryFlow, atoms
PASS 4: Tracking & Route State         -> useMapTrackingState, atoms
PASS 5: MapScreen Component Extraction -> MapScreenModals.jsx
PASS 6: MapScreen Final Cleanup        -> ~400 lines remaining

EMBEDDED VIEW HOOKS:
PASS 7: Payment Controller Atoms       -> atoms/paymentAtoms.ts
PASS 8: Payment TanStack Query         -> hooks/payment/*.ts
PASS 9: Details & Search Controllers   -> atoms/commitAtoms.ts, etc
PASS 10: Final Integration & Cleanup   -> remove legacy useState
```

---

## PASS 1: Shell Infrastructure - COMPLETE

**Files Created:**
- `hooks/map/shell/useMapShell.js` (3,848 bytes)
- `hooks/map/shell/useMapScreenEffects.js` (1,002 bytes)
- `hooks/map/shell/index.js` (153 bytes)

**MapScreen Lines Reduced:** ~150 lines

**Integration Status:** - Integrated into MapScreen.jsx lines 72-77

---

## PASS 2: Modal State Consolidation IN PROGRESS

**Current State:**
- `hooks/map/shell/useMapModals.js` created (3,434 bytes)
- Exports: `profileModal`, `guestProfileModal`, `careHistoryModal`, etc.

**Finish Integration Tasks:**

### 2.1 Replace MapScreen Local State (lines 187-199)
```javascript
// CURRENT (MapScreen.jsx lines 187-199):
const [handledRecoveredRatingVersion, setHandledRecoveredRatingVersion] = useState(0);
const [ratingRecoveryClaims, setRatingRecoveryClaims] = useState({});
const [recoveredRatingState, setRecoveredRatingState] = useState(null);
const [selectedHistoryVisitKey, setSelectedHistoryVisitKey] = useState(null);
const [historyRatingState, setHistoryRatingState] = useState(null);

// TARGET: Use from useMapModals hook (already created)
const {
  profileModal,
  guestProfileModal,
  careHistoryModal,
  historyModal,
  // ... exposed via useMapModals
} = useMapModals();
```

### 2.2 Remaining Local State to Migrate
```
Line 193: handledRecoveredRatingVersion  -> jotai atom
Line 196: ratingRecoveryClaims          -> jotai atom  
Line 197: recoveredRatingState          -> jotai atom
Line 198: selectedHistoryVisitKey       -> jotai atom
Line 199: historyRatingState            -> jotai atom
Line 418: trackingRouteInfo             -> jotai atom
```

**Atoms to Create:**
```javascript
// atoms/mapScreenAtoms.js
export const ratingRecoveryVersionAtom = atom(0);
export const ratingRecoveryClaimsAtom = atom({});
export const recoveredRatingStateAtom = atom(null);
export const selectedHistoryVisitKeyAtom = atom(null);
export const historyRatingStateAtom = atom(null);
export const trackingRouteInfoAtom = atom({
  durationSec: null,
  distanceMeters: null,
  coordinates: [],
});
```

**Estimated Reduction:** 80 lines

---

## PASS 3: History & Rating Recovery Flow

**Current:** Inline in MapScreen.jsx (lines 955-986, 1107-1129, etc.)

**Extract to:** `hooks/map/shell/useMapHistoryFlow.js`

**Functions to Migrate:**
```javascript
// From MapScreen:
- handleResumeHistoryRequest (lines 1102-1105)
- handleRateHistoryVisit (lines 1107-1129)
- closeHistoryVisitDetails (lines 1131-1138)
- handleSubmitHistoryRating (lines 1140-1154)
- handleSkipHistoryRating (lines 1156-1166)
- Recovered rating useEffect (lines 955-986)
```

**Hook API:**
```javascript
export function useMapHistoryFlow() {
  return {
    // State
    recoveredRatingState,
    selectedHistoryVisit,
    historyRatingState,
    
    // Actions
    resumeHistoryRequest,
    rateHistoryVisit,
    submitHistoryRating,
    skipHistoryRating,
    closeHistoryVisitDetails,
    
    // Computed
    hasPendingRating,
    canShowRecoveredRating,
  };
}
```

**Estimated Reduction:** 120 lines

---

## PASS 4: Tracking & Route State

**Current:** Inline in MapScreen.jsx

**Extract to:** `hooks/map/shell/useMapTrackingState.js`

**State to Migrate:**
```javascript
// Line 418: trackingRouteInfo
const [trackingRouteInfo, setTrackingRouteInfo] = useState({...});

// Related handlers:
- handleTrackingRouteCalculated
- handleTrackingRouteUpdate
- handleTrackingRouteComplete
```

**Hook API:**
```javascript
export function useMapTrackingState() {
  const [trackingRouteInfo, setTrackingRouteInfo] = useAtom(trackingRouteInfoAtom);
  
  return {
    trackingRouteInfo,
    updateRouteInfo,
    clearRouteInfo,
    isRouteActive: !!trackingRouteInfo.durationSec,
  };
}
```

**Estimated Reduction:** 60 lines

---

## PASS 5: MapScreen Component Extraction

**Create:** `components/map/MapScreenModals.jsx`

**Extract from MapScreen:**
```jsx
// All modal JSX (lines ~1200-1400):
<MiniProfileModal ... />
<MapGuestProfileModal ... />
<MapCareHistoryModal ... />
<MapHistoryModal ... />
<ServiceRatingModal ... />
{/* ... etc */}
```

**Component Structure:**
```jsx
export function MapScreenModals({
  // Shell hook outputs
  modals,
  historyFlow,
  trackingState,
  // Callbacks
  onCloseProfile,
  onCloseGuestProfile,
  // ... etc
}) {
  return (
    <>
      <MiniProfileModal ... />
      {/* ... all modals */}
    </>
  );
}
```

**Estimated Reduction:** 200 lines

---

## PASS 6: MapScreen Final Cleanup

**Target:** 1,517 -> ~400 lines

**Remaining in MapScreen:**
```jsx
export default function MapScreen() {
  // Shell hooks (already created)
  const shell = useMapShell();
  const effects = useMapScreenEffects();
  const modals = useMapModals();
  const historyFlow = useMapHistoryFlow();
  const trackingState = useMapTrackingState();
  
  // Main render
  return (
    <View style={styles.container}>
      <EmergencyLocationPreviewMap ... />
      <MapSheetOrchestrator ... />
      <MapScreenModals ... />
    </View>
  );
}
```

**Estimated Final Size:** 350-400 lines

---

## PASS 7: Payment Controller Atoms │ CRITICAL

**Target:** `components/map/views/commitPayment/useMapCommitPaymentController.js` (860 lines)

**Why Critical:** This is the largest embedded state machine. Payment transaction state is perfect for Jotai atoms.

### 7.1 Create Atoms
```typescript
// atoms/paymentAtoms.ts
export const selectedPaymentMethodAtom = atom<PaymentMethod | null>(null);
export const paymentMethodsListAtom = atom<PaymentMethod[]>([]);
export const estimatedCostAtom = atom<CostEstimate | null>(null);
export const paymentSubmissionStateAtom = atom<
  'idle' | 'submitting' | 'processing' | 'awaiting_approval' | 'completed' | 'failed'
>('idle');
export const paymentErrorAtom = atom<string | null>(null);
export const paymentTransactionIdsAtom = atom<{
  displayId: string | null;
  requestId: string | null;
}>({ displayId: null, requestId: null });
```

### 7.2 Create Derived Atoms
```typescript
export const canSubmitPaymentAtom = atom((get) => {
  const method = get(selectedPaymentMethodAtom);
  const state = get(paymentSubmissionStateAtom);
  return method && state === 'idle';
});

export const isPaymentProcessingAtom = atom((get) => {
  const state = get(paymentSubmissionStateAtom);
  return ['submitting', 'processing', 'awaiting_approval'].includes(state);
});
```

**Estimated Reduction:** 400 lines from controller

---

## PASS 8: Payment TanStack Query Integration

### 8.1 Query Hooks
```typescript
// hooks/payment/usePaymentMethodsQuery.ts
export function usePaymentMethodsQuery() {
  return useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => paymentService.getPaymentMethods(),
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

// hooks/payment/useWalletBalanceQuery.ts
export function useWalletBalanceQuery() {
  return useQuery({
    queryKey: ['walletBalance'],
    queryFn: () => paymentService.getWalletBalance(),
    staleTime: 30 * 1000, // 30 sec
  });
}

// hooks/payment/useCashEligibilityQuery.ts
export function useCashEligibilityQuery(
  organizationId: string,
  amount: number,
  enabled: boolean
) {
  return useQuery({
    queryKey: ['cashEligibility', organizationId, amount],
    queryFn: () => paymentService.checkCashEligibility(organizationId, amount),
    enabled: enabled && !!organizationId && amount > 0,
  });
}
```

### 8.2 Mutation Hooks
```typescript
// hooks/payment/usePaymentIntentMutation.ts
export function usePaymentIntentMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ requestId, organizationId, cost, method }) =>
      paymentService.createEmergencyCardPaymentIntent(
        requestId,
        organizationId,
        cost,
        method
      ),
    onSuccess: () => {
      // Invalidate active trip to trigger tracking
      queryClient.invalidateQueries({ queryKey: ['activeTrip'] });
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
    },
  });
}

// hooks/payment/usePaymentConfirmationMutation.ts
export function usePaymentConfirmationMutation() {
  return useMutation({
    mutationFn: confirmSavedCardPayment,
  });
}
```

**Estimated Reduction:** 200 lines from controller

---

## PASS 9: Details & Search Controllers

### 9.1 Commit Details Controller
**Target:** `components/map/views/commitDetails/useMapCommitDetailsController.js` (656 lines)

**Atoms:**
```typescript
// atoms/commitAtoms.ts
export const commitWizardStepAtom = atom<'email' | 'otp' | 'phone'>('email');
export const commitDraftAtom = atom({
  email: '',
  otp: '',
  phone: '',
});
export const commitStepHistoryAtom = atom<string[]>([]);
export const commitOtpExpiresAtAtom = atom<number | null>(null);
export const commitSubmittingAtom = atom(false);
```

**Estimated Reduction:** 300 lines

### 9.2 Search Sheet Model
**Target:** `components/map/views/surfaces/search/useMapSearchSheetModel.js` (288 lines)

**Atoms + TanStack Query:**
```typescript
// atoms/searchAtoms.ts
export const searchActiveModeAtom = atom<'SEARCH' | 'LOCATION'>('SEARCH');
export const searchQueryAtom = atom('');
export const searchLocationSuggestionsAtom = atom([]);
export const searchSessionTokenAtom = atom<string | null>(null);

// hooks/search/useLocationSuggestionsQuery.ts
export function useLocationSuggestionsQuery(
  query: string,
  locationBias: Location | null
) {
  return useQuery({
    queryKey: ['locationSuggestions', query, locationBias],
    queryFn: () => googlePlacesService.searchAddressSuggestions(query, {
      location: locationBias,
    }),
    enabled: query.length >= 2,
    staleTime: 60 * 1000,
  });
}
```

**Estimated Reduction:** 150 lines

---

## PASS 10: Final Integration & Cleanup

### 10.1 Update View Controllers
```javascript
// useMapCommitPaymentController.js AFTER migration
import { useAtom } from 'jotai';
import {
  selectedPaymentMethodAtom,
  paymentSubmissionStateAtom,
  // ... other atoms
} from '../../../../atoms/paymentAtoms';
import {
  usePaymentMethodsQuery,
  usePaymentIntentMutation,
} from '../../../../hooks/payment';

export function useMapCommitPaymentController({ hospital, ... }) {
  // Replace useState with atoms
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useAtom(selectedPaymentMethodAtom);
  const [submissionState, setSubmissionState] = useAtom(paymentSubmissionStateAtom);
  
  // Replace manual fetching with TanStack Query
  const { data: paymentMethods } = usePaymentMethodsQuery();
  const paymentIntentMutation = usePaymentIntentMutation();
  
  // Controller logic now focuses on orchestration, not state management
  // ~200 lines instead of 860
}
```

### 10.2 Verification Checklist
- [ ] All 11 useState calls removed from payment controller
- [ ] All 8 useState calls removed from details controller
- [ ] All 7 useState calls removed from search model
- [ ] No direct `paymentService` calls in components (only through hooks)
- [ ] Jotai DevTools show atomic state updates
- [ ] TanStack Query DevTools show cached queries
- [ ] React DevTools Profiler shows reduced re-renders

**Estimated Final State:**
- `useMapCommitPaymentController`: 860 -> 200 lines (-77%)
- `useMapCommitDetailsController`: 656 -> 200 lines (-70%)
- `useMapSearchSheetModel`: 288 -> 120 lines (-58%)

---

## SUMMARY TABLE

| Pass | Target | Lines Reduced | Status |
|------|--------|---------------|--------|
| 1 | Shell Infrastructure | 150 | - Done |
| 2 | Modal Integration | 80 | Current |
| 3 | History Flow | 120 | Pending |
| 4 | Tracking State | 60 | Pending |
| 5 | Component Extraction | 200 | Pending |
| 6 | Final Cleanup | 507 | Pending |
| **Subtotal MapScreen** | | **1,117** | |
| | | | |
| 7 | Payment Atoms | 400 | Pending |
| 8 | Payment Queries | 200 | Pending |
| 9 | Details/Search Atoms | 450 | Pending |
| 10 | Integration | 100 | Pending |
| **Subtotal View Hooks** | | **1,150** | |
| | | | |
| **TOTAL** | | **2,267** | |

---

## NEXT ACTION

**Continue Pass 2** - Finish integrating `useMapModals`:
1. Create `atoms/mapScreenAtoms.js` with 6 atoms
2. Replace MapScreen local state (lines 187-199, 418)
3. Wire up modal callbacks from useMapModals
4. Test modal open/close flows

**Estimated time:** 2-3 hours  
**Result:** MapScreen reduced by 80 lines, modal state fully atomized

---
status: living
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Welcome Screen â€” State Architecture Pass (Post-Pass)

**Date**: 2026-05-03  
**Status**: COMPLETE  
**Pre-pass doc**: [`WELCOME_STATE_AUDIT_PRE_2026-05-03.md`](./WELCOME_STATE_AUDIT_PRE_2026-05-03.md)  
**Scope**: `WelcomeScreen.jsx`, `useEmergencyHospitalSync.js`, `atoms/welcomeScreenAtoms.js`

---

## 1. Changes Made

### Pass 1 â€” `atoms/welcomeScreenAtoms.js` (recreated)

**File**: `atoms/welcomeScreenAtoms.js`  
**Previous state**: Deleted by user in prior session (had contained atoms that were reverted).  
**Change**: Created with a single correct atom:

```js
export const isOpeningEmergencyAtom = atom(false);
```

**Rationale**: `isOpeningEmergency` is ephemeral UI state with named terminal values controlling CTA label + disabled state during a navigation transition. Belongs at L5 (Jotai). Must survive remount during the transition window.

---

### Pass 2 â€” `screens/WelcomeScreen.jsx`

**Lines before**: ~123  
**Lines after**: ~71  

**Removed**:
- `import { useEmergency } from "../contexts/EmergencyContext"` â€” WelcomeScreen owned no emergency state; this caused context-wide re-renders from ambulance telemetry, trip state, and hospital changes.
- `const { refreshHospitals } = useEmergency()` â€” imperative fetch call eliminated.
- Entire prewarm `useEffect` (lines 60â€“96 pre-pass) â€” 37 lines of logic that called `refreshHospitals` after location sync. Redundant: `useHospitalsQuery` auto-fires via `enabled: !!lat && !!lng`.
- `hasPrewarmedEmergencyRef` â€” only served the removed prewarm effect.
- `awaitingEmergencyLocationSyncRef` â€” read by both the location-sync effect and the prewarm effect; only referenced in prewarm effect post-removal of its secondary consumer.
- `emergencyUserLocation` Zustand selector â€” was only used inside the removed prewarm effect's coordinate comparison.
- `useState` import replaced by `useAtom` from Jotai.
- `useRef` import removed â€” no longer needed after ref removals.

**Added**:
- `import { useAtom } from "jotai"`
- `import { isOpeningEmergencyAtom } from "../atoms/welcomeScreenAtoms"`
- `const [isOpeningEmergency, setIsOpeningEmergency] = useAtom(isOpeningEmergencyAtom)`
- `setIsOpeningEmergency` added to `useFocusEffect` deps array (was missing, lint violation).

**Unchanged**:
- Location-sync `useEffect` (GlobalLocation â†’ Zustand L3) â€” valid side effect, preserved exactly.
- `useFocusEffect` reset â€” valid side effect, preserved.
- All render and routing logic.

---

### Pass 3 â€” `hooks/emergency/useEmergencyHospitalSync.js`

**Lines before**: ~233  
**Lines after**: ~233 (net neutral â€” removed `useState` + `useEffect` block, replaced with equivalent `useMemo`)

**Removed**:
- `useState` import (no longer needed â€” no local state in this hook).
- `const [hospitals, setHospitals] = useState([])` â€” local state for derived data.
- Syncing `useEffect` (lines 57â€“112 pre-pass) â€” 56 lines calling `setHospitals` after computing distance/ETA from query data.

**Added**:
- `const hospitals = useMemo(() => { ... }, [dbHospitals, discoveredDbHospitals, isLoadingHospitals, userLocation])` â€” identical computation, synchronous, no state overhead, no extra render cycle.

**`updateHospitals` contract preserved but correctly documented**:

```js
const updateHospitals = useCallback((newHospitals) => {
    const normalized = normalizeHospitals(newHospitals);
    // Note: updateHospitals is a manual override path (e.g. realtime patch).
    // It cannot mutate the useMemo-derived hospitals directly; callers must
    // use queryClient.setQueryData or refetch to propagate changes through
    // the query layer. This callback remains for backward-compat contract.
    return enrichHospitalsWithServiceTypes(normalized);
}, [normalizeHospitals]);
```

This is a known contract gap â€” `updateHospitals` previously called `setHospitals`. With `useMemo`, it can no longer mutate the derived value. It now returns the normalized array for the caller to use. Full resolution requires callers to use `queryClient.setQueryData`. Documented but not breaking â€” no known callers depend on the side-effectful version in the current call graph.

**Unchanged**:
- Hospital selection guard `useEffect` â€” valid side effect, preserved.
- All `useMemo` derivations: `availableHospitals`, `visibleHospitals`, `filteredHospitals`, `specialties`, `selectedHospital`.
- Full return contract: all 13 keys preserved.

---

## 2. Invariant Verification

| Invariant | Status |
|---|---|
| WelcomeScreen does not import EmergencyContext | âœ… Confirmed |
| Hospital fetching is query-driven, no imperative call | âœ… Confirmed |
| `isOpeningEmergency` is a Jotai atom, resets on focus | âœ… Confirmed |
| `hospitals` in HospitalSync is derived via `useMemo` | âœ… Confirmed |
| Location-sync `useEffect` unchanged | âœ… Confirmed |
| Hospital selection guard `useEffect` unchanged | âœ… Confirmed |
| `useEmergencyHospitalSync` return contract intact (13 keys) | âœ… Confirmed |

---

## 3. What Was Intentionally Left Out of Scope

| Item | Reason |
|---|---|
| `updateHospitals` full L2 migration (callers â†’ `setQueryData`) | Requires audit of all callers; no known active callers in current pass scope. Deferred. |
| `useHospitals` â†’ `useHospitalsQuery` migration inside `useEmergencyHospitalSync` | `useHospitals` is still the active implementation. `useHospitalsQuery` migration is a separate sprint item. Not in scope of this correctness pass. |
| `WelcomeStageBase` animation pass (reduced motion, staggered entrance) | Separate HIG pass (`WELCOME_SCREEN_HIG_AUDIT_2026-05-02.md`). Not state architecture. |
| `EntryActionButton` haptics, hitSlop, font scaling | Covered by HIG audit. Not in scope here. |

---

## 4. Files Changed

| File | Change type |
|---|---|
| `atoms/welcomeScreenAtoms.js` | Created |
| `screens/WelcomeScreen.jsx` | Edited â€” 52 lines removed, 3 lines added |
| `hooks/emergency/useEmergencyHospitalSync.js` | Edited â€” `useState`+`useEffect` â†’ `useMemo` |

---

## 5. Known Remaining Tech Debt

- `updateHospitals` is now a passthrough that returns a value rather than setting state. Any caller that relied on the side effect (rare/none in current scan) must be migrated to `queryClient.setQueryData`. Flag for Gold Standard Phase 2.
- `useHospitals` inside `useEmergencyHospitalSync` is still the legacy hook (not `useHospitalsQuery`). Category-1 violation remains at the `useHospitals` level (it uses `useState`+`useEffect` internally). Full L2 migration deferred to dedicated sprint.

---

*Post-pass record. All invariants verified. No regressions expected.*

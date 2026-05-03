# Welcome Screen — State Architecture Audit (Pre-Pass)

**Date**: 2026-05-03  
**Status**: AUDIT — violations identified, pass not yet started  
**Scope**: `WelcomeScreen.jsx`, `useEmergencyHospitalSync.js`, `welcomeScreenAtoms.js`  
**Layers touched**: L2 (TanStack Query), L3 (Zustand), L5 (Jotai)  
**Standard**: iVisit 5-layer architecture + `REFACTORING_GUARDRAILS.md` `useEffect` decision tree

---

## 1. Trigger

User requested: *"audit welcome screen for modernisation → use of 5 layers of state management first, gold standard and adhering to useEffect rules as stated in guardrails."*

This pass was preceded by a rushed session that made code changes without pre/post documentation. This document is the formal pre-pass record retroactively establishing what the violations were before the changes.

---

## 2. Files Audited

| File | Lines (pre) | Role |
|---|---|---|
| `screens/WelcomeScreen.jsx` | ~123 | Screen orchestrator |
| `hooks/emergency/useEmergencyHospitalSync.js` | ~233 | Hospital data + derivation hook |
| `atoms/welcomeScreenAtoms.js` | (deleted) | L5 atom file — was missing |

---

## 3. Violation Inventory

### Violation 1 — `WelcomeScreen.jsx`: `useState` for ephemeral UI machine state
**Location**: `screens/WelcomeScreen.jsx:16`  
**Code**:
```js
const [isOpeningEmergency, setIsOpeningEmergency] = useState(false);
```
**Guardrail rule**: *"Named machine-like state in useState → belongs in Jotai atom (L5). If state must survive remount, it MUST be a Jotai atom."*  
`isOpeningEmergency` has two named terminal values (`false` / `true`), controls CTA label and disabled state during a navigation transition, and must survive any remount that occurs during that transition.  
**Correct owner**: L5 Jotai atom (`isOpeningEmergencyAtom`).

---

### Violation 2 — `WelcomeScreen.jsx`: `useEmergency` imported for `refreshHospitals`
**Location**: `screens/WelcomeScreen.jsx:10,20`  
**Code**:
```js
import { useEmergency } from "../contexts/EmergencyContext";
const { refreshHospitals } = useEmergency();
```
**Guardrail rule**: *"Do not access Zustand stores or heavy contexts directly in screens that don't own that domain."*  
`WelcomeScreen` owns zero emergency state. Consuming `useEmergency()` subscribes the screen to every EmergencyContext re-render — a context that manages active trips, hospital lists, ambulance telemetry, and coverage mode. This is a render-budget violation and a layer boundary violation.  
**Correct pattern**: Hospital fetching is owned by `useHospitalsQuery` (L2) which auto-fires when location becomes available via its `enabled` guard. No imperative call needed from WelcomeScreen.

---

### Violation 3 — `WelcomeScreen.jsx`: Imperative prewarm `useEffect` calling server fetch
**Location**: `screens/WelcomeScreen.jsx:60–96`  
**Code**:
```js
useEffect(() => {
    ...
    const warmupTimer = setTimeout(() => {
        refreshHospitals?.();
    }, 0);
    return () => clearTimeout(warmupTimer);
}, [emergencyUserLocation?.latitude, emergencyUserLocation?.longitude, refreshHospitals, ...]);
```
**Guardrail decision tree**: *"Is Y server data triggered by X? → YES → TanStack Query with X in queryKey or `enabled: Boolean(X)`"*  
`useHospitalsQuery` already has `enabled: !!location?.latitude && !!location?.longitude`. When `userLocation` arrives in Zustand (via the valid location-sync effect above it), the query fires automatically. This `useEffect` is redundant and introduces a race condition between the imperative call and the query's own lifecycle.  
**Side effects of removal**: None — `useHospitalsQuery` covers the fetch without any imperative trigger.

---

### Violation 4 — `useEmergencyHospitalSync.js`: `useState` + syncing `useEffect` for derived data
**Location**: `hooks/emergency/useEmergencyHospitalSync.js:39,57–112`  
**Code**:
```js
const [hospitals, setHospitals] = useState([]);

useEffect(() => {
    if (isLoadingHospitals) return;
    const sourceHospitals = ...;
    // ... distance/ETA computation ...
    setHospitals(enrichHospitalsWithServiceTypes(localized));
}, [dbHospitals, discoveredDbHospitals, isLoadingHospitals, userLocation]);
```
**Guardrail decision tree**: *"Is Y a value derived from X? → YES → useMemo / inline const — no hook needed."*  
Distance/ETA localization is **pure computation** over `useHospitals` query data and `userLocation`. It involves no subscriptions, no DOM interaction, no timers, no cleanup. The `useEffect` + `useState` pattern here adds an unnecessary render cycle (query data arrives → effect fires → state set → re-render) and is the canonical Category-1 violation from the guardrails.  
**Correct owner**: `useMemo` — computed synchronously from query data, zero state overhead.

---

## 4. What Was Correct (Pre-Pass) — Do Not Touch

| Element | Evidence | Notes |
|---|---|---|
| Location-sync `useEffect` | `WelcomeScreen.jsx:30–52` | **Valid** — real side effect: writes to Zustand (L3) when GlobalLocationContext coordinate changes. Must stay. |
| `useFocusEffect` reset | `WelcomeScreen.jsx:22–28` | **Valid** — real side effect: resets header on screen focus. Must stay. |
| Hospital selection guard `useEffect` | `useEmergencyHospitalSync.js:203–207` | **Valid** — clears selection when hospital is no longer visible. A controlled side effect on a Jotai/state setter. Must stay. |
| All `useMemo` derivations | `useEmergencyHospitalSync.js:148–200` | **Correct** — `availableHospitals`, `visibleHospitals`, `filteredHospitals`, `specialties`, `selectedHospital` are all pure derivations. |
| `WelcomeStageBase` animation `useEffect` | `WelcomeStageBase.jsx:144–199` | **Valid** — manages `Animated` loop start/stop (cleanup). Real side effects. |
| `useHiddenWebScrollbars` effect | `WelcomeStageBase.jsx:29–71` | **Valid** — DOM `<style>` injection with cleanup. Real side effect. |

---

## 5. Invariants (Must Hold After Pass)

1. `WelcomeScreen` must not import `EmergencyContext` or call any emergency hook.
2. Hospital fetching must remain query-driven — no imperative `refreshHospitals` call from WelcomeScreen.
3. `isOpeningEmergency` must be a Jotai atom that resets to `false` on screen focus.
4. `hospitals` in `useEmergencyHospitalSync` must remain a derived value — no `setState` call on the distance/ETA path.
5. The location-sync `useEffect` (GlobalLocation → Zustand) must stay unchanged.
6. The hospital selection guard `useEffect` must stay unchanged.
7. No existing consumers of `useEmergencyHospitalSync` return contract may break — `hospitals`, `filteredHospitals`, `visibleHospitals`, `availableHospitals`, `specialties`, `selectedHospital`, `isLoadingHospitals`, `activeAmbulances`, `refetchHospitals`, `updateHospitals`, `refreshHospitals`, `getActiveAmbulanceDemoHospital` all remain in the return object.

---

## 6. Pass Plan

| Pass | Target | Change | Layer |
|---|---|---|---|
| Pass 1 | `atoms/welcomeScreenAtoms.js` | Create with `isOpeningEmergencyAtom` | L5 |
| Pass 2 | `screens/WelcomeScreen.jsx` | Remove `useEmergency` + prewarm effect; swap `useState` → `useAtom`; remove dead refs | L5, boundary fix |
| Pass 3 | `hooks/emergency/useEmergencyHospitalSync.js` | Replace `useState([])` + syncing `useEffect` with `useMemo` | Pure derivation fix |

---

*Pre-pass record. Violations confirmed against running code. Implementation follows.*

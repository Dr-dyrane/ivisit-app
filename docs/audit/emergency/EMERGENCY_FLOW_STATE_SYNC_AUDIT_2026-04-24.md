> **HISTORICAL NOTICE — 2026-05-19**
> This is a completed audit from 2026-04-24. The state sync and animation issues it identified have been addressed in the tracking sheet passes (A–G) and tracking tightening pass.
> Retained for historical context only.
> **Current reference:** [`docs/audit/map/passes/TRACKING_STATE_TIGHTENING_PASS_2026-05-19.md`](../map/passes/TRACKING_STATE_TIGHTENING_PASS_2026-05-19.md)
> **Working truth:** [`docs/flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md`](../../flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md)

---

# Emergency Flow State Sync & Animation Audit

**Date:** 2026-04-24
**Scope:** Animation timing sync, phase state management, code modularization
**Objective:** Fix desync between ambulance animation and progress UI, improve phase tracking

---

## 1. Core Issues Identified

### Issue 1: Animation Timing Desync (CRITICAL)

**The Problem:**
The ambulance marker animation and the tracking sheet progress bar use **different time bases** and **different update frequencies**.

| Component | Update Frequency | Time Base | Calculation |
|-----------|-----------------|-----------|-------------|
| Ambulance Animation | 100ms | `Date.now() - animationStartTimeRef.current` | `elapsedRatio = elapsedMs / (etaSeconds * 1000)` |
| Sheet Progress | 1000ms | `trackingHeaderNowMs - startedAtMs` | `progressValue = elapsedSeconds / etaSeconds` |

**Source Locations:**
- Ambulance: `hooks/emergency/useAmbulanceAnimation.js:386`
- Sheet: `components/map/core/mapActiveRequestModel.js:407-411`

**Why They Desync:**
1. **Different intervals:** 100ms vs 1000ms = ambulance updates 10x more frequently
2. **Different start times:** `animationStartTimeRef.current` is set when animation STARTS, but `startedAt` is from the API record (trip creation time)
3. **No shared progress atom:** Each computes independently

**Example Scenario:**
- Trip created at T+0 (startedAt = now)
- User opens map 30 seconds later
- Animation starts at T+30, thinks elapsed = 0
- Sheet progress sees `now - startedAt = 30s`, shows 30s progress
- **Result:** Sheet shows 30% complete, ambulance at start position

---

### Issue 2: Monolithic useMapExploreFlow (CRITICAL)

**Current State:**
- File: `hooks/map/exploreFlow/useMapExploreFlow.js`
- **Lines: 1,737**
- Concerns mixed: UI state, sheet orchestration, hospital selection, tracking logic, animation coordination

**Why This Hurts:**
1. **Cognitive load:** Cannot understand the flow without reading 1700+ lines
2. **Refactoring fear:** Changes risk breaking unknown dependencies
3. **Testing impossibility:** Cannot unit test specific behaviors
4. **State ownership unclear:** Mix of Zustand, local state, refs, context

**Current Mixed Responsibilities:**
```
useMapExploreFlow.js
├── Sheet phase management (sheetPhase, sheetView, snapPoints)
├── Hospital selection logic (selectedHospital, featuredHospital, nearestHospital)
├── Tracking coordination (trackingRequestKey, trackingVisible, openTracking)
├── Header component generation (trackingHeaderLeftComponent, trackingHeaderRightComponent)
├── Layout computation (usesSidebarLayout, surfaceConfig)
├── Visit/history integration (recentVisits, openVisitDetail)
├── Search integration (searchQuery, setSearchSheetMode)
├── Commit flow state (commitFlow, setCommitFlow, clearCommitFlow)
└── 45+ useCallbacks, 15+ useEffects, 12+ useMemos
```

---

### Issue 3: Phase State Machine Gaps (HIGH)

**Current Phase Management:**
```javascript
// useMapExploreFlow.js:660-687
useEffect(() => {
  if (!trackingRequestKey) {
    if (sheetPhase === MAP_SHEET_PHASES.TRACKING) {
      setSheetView(buildExploreIntentSheetView(defaultExploreSnapState));
    }
    return;
  }
  // ... auto-open tracking if conditions met
}, [..., trackingRequestKey]);
```

**Problems:**
1. **Implicit phase transitions:** No explicit state machine, just effects watching dependencies
2. **No phase history:** Cannot implement "back" properly without fragile payload.sourcePhase
3. **Race conditions:** `trackingDismissedRef` is a ref, not state - not reactive
4. **No entry/exit guards:** Can enter TRACKING phase without valid request

**Missing Phases:**
- No `ARRIVED` phase (handled implicitly by status check)
- No `RATING` phase (rating modal is separate component, not sheet phase)
- No `COMPLETING` phase (transition between arrived -> completed)

---

### Issue 4: State Ownership Confusion (HIGH)

**Current State Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    EMERGENCY STATE SOURCES                      │
├─────────────────────────────────────────────────────────────────┤
│  Zustand Store (emergencyTripStore.js)                         │
│  ├── activeAmbulanceTrip     -> Server sync writes here        │
│  ├── activeBedBooking                                          │
│  ├── pendingApproval                                           │
│  ├── commitFlow                                                │
│  └── eventGates                                                  │
├─────────────────────────────────────────────────────────────────┤
│  useMapExploreFlow Local State                                   │
│  ├── sheetPhase              -> UI phase                        │
│  ├── sheetView               -> Current sheet config            │
│  ├── sheetSnapState          -> Collapsed/expanded              │
│  ├── commitFlow              -> Duplicated with store??         │
│  └── selectedHospital        -> Also in global search state     │
├─────────────────────────────────────────────────────────────────┤
│  useMapExploreFlow Refs                                          │
│  ├── trackingDismissedRef    -> Not reactive, causes bugs       │
│  ├── suppressCommitRestoreRef  -> Commit flow guard             │
│  └── lastTrackingRequestKeyRef -> For detecting changes         │
├─────────────────────────────────────────────────────────────────┤
│  EmergencyUIContext (contexts/EmergencyUIContext.jsx)            │
│  ├── snapIndex               -> Bottom sheet position           │
│  ├── isAnimating             -> Animation lock                  │
│  └── searchQuery             -> Search state                    │
└─────────────────────────────────────────────────────────────────┘
```

**Problems:**
1. `sheetPhase` in `useMapExploreFlow` is **derived from** `sheetView.sheetPhase`, but also set independently
2. `commitFlow` exists in BOTH Zustand store AND local state
3. `selectedHospital` is managed in `useMapExploreFlow` but also needed by global search
4. `trackingDismissedRef` prevents auto-open but is not persisted - lost on reload

---

## 2. Recommended Architecture Changes

### Phase 1: Extract Animation Sync State (Jotai)

**New Atoms:** `stores/emergencyAnimationAtoms.js`
```javascript
// Single source of truth for animation progress
export const animationProgressAtom = atom(0); // 0-1
export const animationBaseTimeAtom = atom(null); // timestamp when animation started
export const animationEtaSecondsAtom = atom(null);

// Derived: current progress based on now
export const computedProgressAtom = atom((get) => {
  const baseTime = get(animationBaseTimeAtom);
  const etaSeconds = get(animationEtaSecondsAtom);
  if (!baseTime || !etaSeconds) return null;
  const elapsedMs = Date.now() - baseTime;
  return Math.min(1, Math.max(0, elapsedMs / (etaSeconds * 1000)));
});
```

**Benefits:**
- Ambulance animation and sheet progress read from SAME atom
- No desync possible
- Easy to pause/resume (just stop updating baseTime)

---

### Phase 2: Modularize useMapExploreFlow

**Target Structure:**
```
hooks/map/exploreFlow/
├── useMapExploreFlow.js              -> 200 lines max, orchestrates sub-hooks
├── useMapSheetPhase.js               -> Phase state machine
├── useMapHospitalSelection.js        -> Hospital picker logic
├── useMapTracking.js                 -> Tracking coordination (replaces lines 575-687)
├── useMapTrackingHeader.js            -> Header component generation (lines 1087-1209)
├── useMapCommitFlow.js               -> Commit flow state management
└── useMapAnimationSync.js            -> Bridges Jotai atoms to map components
```

**useMapExploreFlow.js After:**
```javascript
export function useMapExploreFlow() {
  const { phase, transitionTo } = useMapSheetPhase();
  const { selectedHospital, selectHospital } = useMapHospitalSelection();
  const { trackingState, openTracking, closeTracking } = useMapTracking();
  const { headerComponents } = useMapTrackingHeader(trackingState);
  const { commitFlow, startCommit, clearCommit } = useMapCommitFlow();
  const { progress, syncProgress } = useMapAnimationSync();
  
  // Just compose and return
  return {
    phase,
    selectedHospital,
    trackingState,
    headerComponents,
    commitFlow,
    progress,
    // ...actions
  };
}
```

---

### Phase 3: Proper Phase State Machine

**New File:** `hooks/map/exploreFlow/useMapSheetPhase.js`
```javascript
const PHASES = {
  EXPLORE: 'explore',
  HOSPITAL_DETAIL: 'hospital_detail',
  AMBULANCE_DECISION: 'ambulance_decision',
  BED_DECISION: 'bed_decision',
  COMMIT_DETAILS: 'commit_details',
  COMMIT_TRIAGE: 'commit_triage',
  COMMIT_PAYMENT: 'commit_payment',
  TRACKING: 'tracking',
  TRACKING_ARRIVED: 'tracking_arrived',
  RATING: 'rating',
};

// Explicit transitions, no implicit effects
const VALID_TRANSITIONS = {
  [PHASES.EXPLORE]: [PHASES.HOSPITAL_DETAIL, PHASES.AMBULANCE_DECISION, PHASES.BED_DECISION],
  [PHASES.AMBULANCE_DECISION]: [PHASES.COMMIT_DETAILS, PHASES.EXPLORE],
  [PHASES.COMMIT_PAYMENT]: [PHASES.TRACKING, PHASES.EXPLORE], // Payment success -> tracking
  [PHASES.TRACKING]: [PHASES.TRACKING_ARRIVED, PHASES.EXPLORE],
  [PHASES.TRACKING_ARRIVED]: [PHASES.RATING, PHASES.EXPLORE],
  [PHASES.RATING]: [PHASES.EXPLORE], // Rating complete -> back to explore
};
```

**Entry/Exit Guards:**
```javascript
const PHASE_GUARDS = {
  [PHASES.TRACKING]: {
    canEnter: (context) => Boolean(context.trackingRequestKey),
    onEnter: (context) => {
      context.startAnimationSync();
      context.dismissHeader();
    },
    onExit: (context) => {
      context.stopAnimationSync();
    },
  },
};
```

---

### Phase 4: Consolidate State Ownership

**New Ownership Map:**

| State | Owner | Reason |
|-------|-------|--------|
| `activeAmbulanceTrip` | Zustand + Server | Source of truth from DB |
| `phase` | Jotai atom | UI-only, reactive, time-travel debuggable |
| `animationProgress` | Jotai atom | Shared between ambulance + sheet |
| `selectedHospital` | Zustand | Needed across sessions |
| `sheetSnapIndex` | EmergencyUIContext | Pure UI, no persistence needed |
| `trackingDismissed` | Zustand | Must persist across reloads |

**Remove:**
- `useMapExploreFlow` local `commitFlow` -> use store
- `trackingDismissedRef` -> replace with Zustand persisted flag
- `suppressCommitRestoreRef` -> derive from phase history

---

## 3. Implementation Priority

1. **Jotai atoms for animation sync** (1 day)
   - Create `stores/emergencyAnimationAtoms.js`
   - Update `useAmbulanceAnimation` to write to atoms
   - Update `mapActiveRequestModel` to read from atoms

2. **Extract useMapTracking** (1 day)
   - Move lines 575-687 from `useMapExploreFlow`
   - Use new animation atoms
   - Test in isolation

3. **Extract useMapSheetPhase** (2 days)
   - Define phase machine
   - Migrate existing phase logic
   - Add entry/exit guards

4. **Consolidate state** (1 day)
   - Move `trackingDismissed` to Zustand
   - Remove duplicate `commitFlow`
   - Clean up refs

---

## 4. Validation Criteria

- [ ] Ambulance marker and progress bar move in perfect sync
- [ ] No drift after 60 seconds of tracking
- [ ] Pause/resume animation maintains sync
- [ ] Phase transitions are explicit and logged
- [ ] Invalid transitions are rejected with clear errors
- [ ] useMapExploreFlow under 300 lines
- [ ] Each sub-hook under 200 lines
- [ ] All hooks have isolated unit tests

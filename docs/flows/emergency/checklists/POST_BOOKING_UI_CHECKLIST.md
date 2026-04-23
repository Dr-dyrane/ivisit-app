# Post-booking UI/UX Checklist (Ambulance + Bed Booking)

## Context
This document tracks issues and desired behavior for the post-booking experience on the Emergency flow.

Primary goals:
- Bottom sheet snap states must produce distinct, intentional UI.
- Map must remain stable during the entire post-booking lifecycle.
- The post-booking experience should match the rest of iVisit’s high-polish UI.

## Core UX requirements

### Bottom sheet snapping (must be consistent)
- **Collapsed (snap index 0)**
  - Show the best minimal summary for the active state.
  - Ambulance: “Waiting / En route” + ETA + key identifier.
  - Bed booking: “Reserved / Waiting” + ETA + key identifier.
  - Should feel like an Uber-style mini card.
  - Must not hide critical trip status.

- **Half (snap index 1) — default**
  - Should show a clean summary that’s immediately useful.
  - This is the default state after completing the request.
  - Must be visually aligned with the rest of the app.

- **Full (snap index 2)**
  - Must show a detailed view.
  - Ambulance: include ambulance + hospital details.
  - Bed booking: include hospital + reservation details.
  - Content should use the available vertical space (no awkward small card floating at the top).

### Map stability requirements
- No crashes during:
  - route calculation
  - polyline rendering
  - bottom sheet snapping
  - animated ambulance marker updates
  - responder realtime updates from Supabase

- During active ambulance trip:
  - show polyline between patient and hospital.
  - show animated ambulance moving towards the destination.

## Current issues observed

### Visual quality / UI polish
- **Post-booking UI looks “ugly” compared to the rest of the app UI**
  - Summary cards feel visually inconsistent with iVisit theme.

- **Trip card full state not using full screen**
  - Full snap should show a detailed layout that fills the space.

- **Need different content for each snap state**
  - Collapsed vs half vs full must be clearly different.

### Functional issues
- **Ambulance marker animation not visible**
  - Logs show `WARN [useAmbulanceAnimation] Invalid animation params`.
  - Animation should run using ETA from trip, or fallback to route duration.

- **Google Directions API key not used**
  - Logs show `Google API key not available`.
  - Expo environment variables must be configured correctly.

### Interaction issues
- Bottom sheet + map interaction can feel buggy/janky.
- Snapping should not cause repeated heavy map operations.

---

## ✅ SOLVED: Snap Index Out of Range Error

**Date Solved:** 2026-02-01
**Status:** FIXED ✅

### The Problem

When transitioning between bottom sheet modes (e.g., selecting a hospital, entering detail mode, or after Call 911), the app would crash with:

```
Invariant Violation: 'index' was provided but out of the provided snap points range! expected value to be between -1, 1
```

**Error Logs observed:**
```
[EmergencyBottomSheet] clampSheetIndex called with: 2 snapPoints: ["55%"] length: 1
[EmergencyBottomSheet] Final clamped index: 0 maxIndex: 0
[EmergencyBottomSheet] Restoring to safe index: 0 from original: 2
ERROR Global Error Boundary caught an error: [Invariant Violation: 'index'...
```

### Root Cause

The bottom sheet uses different snap point arrays depending on the mode:

| Mode | Snap Points | Valid Indices |
|------|-------------|---------------|
| Standard | `["22%", "50%", "82%"]` | 0, 1, 2 |
| Detail (hospital selected) | `["55%"]` | 0 only |
| Active trip/bed booking | `["40%", "50%"]` | 0, 1 |

The global `EmergencyUIContext` stored `snapIndex` which could be `2` in standard mode. When transitioning to detail mode (1 snap point), the stored index `2` was passed to `@gorhom/bottom-sheet`, which crashed because index `2` doesn't exist in `["55%"]`.

**React batching issue:** Even with `useMemo` for `derivedIndex`, React could batch state updates, causing the native bottom sheet component to receive the stale global index before React had a chance to recalculate the derived value.

### The Solution

Implemented a multi-layered defensive approach:

#### 1. Added `resetSnapIndex()` to `EmergencyUIContext.jsx`

```javascript
// contexts/EmergencyUIContext.jsx
const resetSnapIndex = useCallback(() => {
    setSnapIndex(0);
}, []);

// Exported in context value
const value = useMemo(() => ({
    snapIndex,
    handleSnapChange,
    resetSnapIndex, // NEW
    // ...
}), [...]);
```

#### 2. Proactive reset on mode transition in `EmergencyBottomSheet.jsx`

```javascript
// components/emergency/EmergencyBottomSheet.jsx
useEffect(() => {
    if (isDetailMode && newSnapIndex > 0) {
        resetSnapIndex();
    }
}, [isDetailMode, newSnapIndex, resetSnapIndex]);
```

#### 3. Improved `derivedIndex` calculation with defensive clamping

```javascript
const derivedIndex = useMemo(() => {
    const maxIdx = Math.max(0, snapPoints.length - 1);

    // For detail mode or single snap point scenarios, ALWAYS return 0
    if (isDetailMode || snapPoints.length <= 1) {
        return 0;
    }

    // For trip/bed booking mode with 2 snap points
    if (hasAnyVisitActive && snapPoints.length === 2) {
        return Math.min(newSnapIndex, 1);
    }

    // Standard mode: clamp to valid range
    return Math.min(Math.max(0, newSnapIndex), maxIdx);
}, [isDetailMode, hasAnyVisitActive, newSnapIndex, snapPoints.length, snapPoints]);
```

### Files Modified

| File | Change |
|------|--------|
| `contexts/EmergencyUIContext.jsx` | Added `resetSnapIndex()` function |
| `components/emergency/EmergencyBottomSheet.jsx` | Added proactive reset effect + improved `derivedIndex` |

### Why This Works

1. **Proactive Reset:** When entering detail mode, the effect immediately resets the global index to 0, preventing invalid values from persisting.

2. **Defensive Clamping:** Even if a stale index reaches the `derivedIndex` calculation, it's always clamped to the valid range for the current snap points array.

3. **Mode-Aware Logic:** Each mode has specific handling to ensure the derived index is always valid for that mode's snap points.

### Testing Verification

- ✅ Selecting a hospital (standard → detail mode) no longer crashes
- ✅ Pressing Call 911 and transitioning modes works correctly
- ✅ Completing/canceling trips returns to appropriate snap state
- ✅ Rapid mode switching does not cause index errors

## Desired high-level flow

### Ambulance (post request)
- User taps request.
- Sheet returns to **half**.
- Map shows:
  - route polyline
  - ambulance marker
  - marker animates smoothly
- Sheet:
  - collapsed: minimal status + ETA
  - half: summary + key details
  - full: detailed card with hospital + ambulance details

### Bed booking (post request)
- User taps reserve.
- Sheet returns to **half**.
- Map shows:
  - route polyline (patient <-> hospital)
- Sheet:
  - collapsed: minimal reservation summary
  - half: summary
  - full: detailed reservation + hospital info

## Notes / constraints
- Live app connected to Supabase.
- Hospitals originate from Supabase, and there is logic to "localize"/shift hospital coordinates near the user for a “5 nearby hospitals” effect.
- iOS on Expo is the primary platform for this work.

---

## Competitive Latency UX Targets

- Camera actions should settle within 300–450ms with no visible jitter.
- Sheet snap transitions must not trigger more than one camera re-fit per user action.
- Route/ETA updates coalesced; avoid re-rendering polyline for minor coordinate jitter.
- Marker animation runs smoothly at 60fps; clamp updates under unstable network.

---

## Mitigations & Implementation Notes

- Camera hysteresis:
  - Skip scheduled offset-center if `onPanDrag` occurred within last 500ms.
  - Use a monotonic `cameraActionId` to ignore late actions.
- Padding freshness:
  - Read `mapPaddingRef` at execution time in offset-center; avoid stale captures.
- Animation collapse:
  - Prefer single `animateToRegion` with computed deltas; otherwise align delay to fit completion.
- Availability gates:
  - Keep route when toggling mode if capacity is unchanged; re-evaluate only on material changes.
- Server gates:
  - Enforce arrived/occupied before complete; reject invalid transitions at DB trigger layer.

---

## Expanded QA Checklist

- Rapid snap changes (collapsed ↔ half ↔ full) under active route should not cause multiple camera jumps.
- User pans during scheduled camera action should cancel or defer programmatic moves.
- Switching modes with an active visit preserves route unless capacity changes.
- Realtime responder updates do not stutter marker; frame pacing remains stable.
- Low-end device test: ensure back-to-back fit + offset does not stutter; clamp deltas.

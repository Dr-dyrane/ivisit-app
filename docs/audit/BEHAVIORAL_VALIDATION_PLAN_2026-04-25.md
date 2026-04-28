# Behavioral Validation Plan (2026-04-25)

**Status:** Architecture Complete -> Behavioral Validation Required  
**Risk Level:** MEDIUM (Potential silent drops in animation sync)

---

## Issues to Validate (Pre-Refactor Concerns)

### Critical - Animation Sync Gap

| Issue | Location | Current State | Risk |
|-------|----------|---------------|------|
| **Animation/Progress Sync** | `useAmbulanceAnimation` -> `TeamHeroCard` | Animation uses `onAmbulanceUpdate` but NOT connected to progress indicator | **HIGH** - Visual drift between ambulance position and progress bar |

**Root Cause:**
```javascript
// useAmbulanceAnimation.js - has callback
onAmbulanceUpdateRef.current?.({ coordinate, heading });

// MapTrackingParts.jsx - time-based progress, NOT synced
const { tripProgress: ambulanceTripProgress } = useTripProgress({...});
// TeamHeroCard receives progressValue from time-based calculation
```

**Evidence:** No connection found between:
- `onAmbulanceUpdate` callback in `useAmbulanceAnimation`
- `progressValue` prop in `TeamHeroCard`

---

## Validation Checklist

### 1. Animation Sync Test

**Steps:**
1. Book ambulance trip
2. Watch tracking sheet hero card
3. Observe ambulance animation vs. progress bar

**Expected:** Progress bar fills proportionally to ambulance position on route  
**Actual (suspected):** Progress bar fills based on time, may drift from animation

**Fix Required:**
```javascript
// Option A: Connect animation to progress
const [animationProgress, setAnimationProgress] = useState(0);
useAmbulanceAnimation({
  onAmbulanceUpdate: ({ coordinate, heading, progress }) => {
    setAnimationProgress(progress); // Need to add progress to callback
  }
});

// Option B: Drive animation from time progress
// Use useTripProgress.progress to calculate coordinate instead of elapsed time
```

### 2. Payment -> Tracking Flow

**Steps:**
1. Complete payment
2. Tap "Track Now"
3. Verify MapScreen opens with tracking active

**Expected:** Tracking sheet auto-expands, shows active trip  
**Implementation:** `await syncActiveTripsFromServer()` before navigation - ### 3. Rating Modal Timing (Android)

**Steps:**
1. Complete ambulance trip
2. Verify rating modal appears immediately
3. Check on Android specifically

**Expected:** Modal shows within 100ms of completion  
**Implementation:** `deferCleanup: true` in completion handlers - ### 4. Ride Arrived Stability

**Steps:**
1. Wait for ambulance to arrive
2. Verify status stays "arrived"
3. Check no automatic restart

**Expected:** Status stable, manual completion required  
**Risk:** State machine may auto-transition

### 5. Metro Reload State

**Steps:**
1. Start trip
2. Press Ctrl+R / Cmd+R
3. Verify state restores correctly

**Expected:** Active trip state persists  
**Implementation:** Zustand store with hydration - (needs testing)

---

## Silent Drop Risk Areas

Based on git diff analysis:

| File | Lines Changed | Risk |
|------|---------------|------|
| `useAmbulanceAnimation.js` | -902 | **HIGH** - Animation/progress sync |
| `EmergencyLocationPreviewMap.jsx` | -2,042 | **MEDIUM** - Map integration |
| `useMapExploreFlow.js` | -1,878 | **MEDIUM** - Flow orchestration |

---

## Recommended Immediate Actions

### Option A: Quick Validation (30 min)
1. Run app on simulator
2. Test 5 validation scenarios above
3. Document any regressions
4. Fix only broken behaviors

### Option B: Full Stabilization (2-3 hours)
1. Add animation progress sync
2. Add E2E tests for critical flows
3. Verify all 5 behaviors
4. Add analytics for flow tracking

### Option C: Hybrid (Recommended)
1. **Immediate:** Quick validation (Option A)
2. **If animation sync broken:** Fix it (30 min)
3. **Next sprint:** Full stabilization (Option B)

---

## Next Steps

1. Run through validation checklist
2. Mark each item: - PASS / - FAIL
3. If any fail -> create targeted fix plan
4. Update this document with results

---

## Related Documents

- Current State: `CURRENT_STATE_ORCHESTRATOR_REFACTOR_2026-04-25.md`
- Risk Tracker: `RISK_STATUS_2026-04-23.md`
- Map Flow: `../flows/emergency/MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md`

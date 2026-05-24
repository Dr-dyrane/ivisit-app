> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

> **HISTORICAL NOTICE — 2026-05-19**
> This modularization plan is **complete**. EmergencyContext.jsx has been fully retired (Gold Standard Phase 5, all sub-passes 5a–5f done).
> Retained for historical context only.
> **See:** [`docs/architecture/state/GOLD_STANDARD_STATE_ROADMAP.md`](../../architecture/state/GOLD_STANDARD_STATE_ROADMAP.md) for Phase 5 completion record.

---

# EmergencyContext.jsx Modularization Plan

**Current:** `contexts/EmergencyContext.jsx` - **2,168 lines**

**Goal:** Split into focused hooks, each under 200 lines, single responsibility.

---

## Current State Analysis

### Hook Count (approximate)
- `useState`: ~35
- `useEffect`: ~30
- `useCallback`: ~20
- `useRef`: ~10
- `useMemo`: ~15

### Mixed Responsibilities

| Domain | Lines | Current Location |
|--------|-------|------------------|
| Coverage/Demo Mode Management | 100-180 | Lines 277-360 |
| Hospital Discovery & Location | 180-450 | Lines 295-450 |
| Active Trip State (Ambulance/Bed) | 500-650 | Lines 500-650 |
| Realtime Subscriptions | 1000-1150 | Lines 1000-1150 |
| Telemetry Health Tracking | 650-705 | Lines 686-705 |
| Server Sync | 706-955 | Lines 706-955 |
| Location Sync to Server | 1147-1204 | Lines 1147-1204 |
| Request Lifecycle (create/cancel/complete) | 1400-1800 | Scattered |
| Demo Responder Heartbeat | 1205-1260 | Lines 1205-1260 |
| UI State (selected hospital, mode, etc.) | 500-670 | Lines 500-670 |

---

## Proposed New Structure

### Step 1: Extract Coverage Mode Hook

**New File:** `hooks/emergency/useCoverageMode.js`
```javascript
export function useCoverageMode(userId) {
  const [coverageModePreference, setCoverageModePreference] = useState(null);
  const [coverageModePreferenceLoaded, setCoverageModePreferenceLoaded] = useState(false);
  const [coverageModeOperation, setCoverageModeOperation] = useState({ isPending: false, targetMode: null });
  const [demoOwnerSlug, setDemoOwnerSlug] = useState("");
  
  // Load preference from storage
  // Resolve demo owner slug
  // Provide operations (switch mode)
  
  return {
    coverageMode: coverageModePreference,
    coverageModeLoaded: coverageModePreferenceLoaded,
    coverageModeOperation,
    demoOwnerSlug,
    setCoverageMode: setCoverageModeOperation,
  };
}
```

**Removes from EmergencyContext:** ~80 lines

---

### Step 2: Extract Hospital Discovery Hook

**New File:** `hooks/emergency/useHospitalDiscovery.js`
```javascript
export function useHospitalDiscovery({ 
  userLocation, 
  coverageMode, 
  forceDemoFetch,
  userId 
}) {
  const { hospitals: dbHospitals, allHospitals, isLoading, refetch } = useHospitals({...});
  const [hospitals, setHospitals] = useState([]);
  
  // Effect: Compute distances, localize, enrich with service types
  // Effect: Sync DB hospitals when discovery changes
  
  return { hospitals, allHospitals, isLoading, refetch };
}
```

**Removes from EmergencyContext:** ~150 lines

---

### Step 3: Extract Active Trip State Hook (Move to Zustand)

**Already Exists:** `stores/emergencyTripStore.js`

**But EmergencyContext duplicates this state.** Need to consolidate.

**Current in Context:**
```javascript
const [activeAmbulanceTrip, setActiveAmbulanceTrip] = useState(null);
const [activeBedBooking, setActiveBedBooking] = useState(null);
const [pendingApproval, setPendingApproval] = useState(null);
const [commitFlow, setCommitFlow] = useState(null);
```

**Action:** Remove from Context, use Zustand store exclusively.

**Removes from EmergencyContext:** ~200 lines (state + effects + refs)

---

### Step 4: Extract Realtime Subscription Hook

**New File:** `hooks/emergency/useEmergencyRealtime.js`
```javascript
export function useEmergencyRealtime({ 
  activeAmbulanceTrip, 
  onTripUpdate,
  onBedUpdate 
}) {
  const [realtimeStatus, setRealtimeStatus] = useState({});
  const [telemetryHealth, setTelemetryHealth] = useState({});
  
  // Effect: Subscribe to emergency_requests table
  // Effect: Subscribe to ambulance_telemetry (if assigned)
  // Effect: Telemetry health monitoring (stale/lost detection)
  // Effect: Update trip state from realtime events
  
  return { realtimeStatus, telemetryHealth };
}
```

**Removes from EmergencyContext:** ~300 lines

---

### Step 5: Extract Server Sync Hook

**New File:** `hooks/emergency/useEmergencyServerSync.js`
```javascript
export function useEmergencyServerSync({ userId, activeRequestId }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  
  const syncActiveTrips = useCallback(async (reason = 'manual') => {
    // Fetch active trips from server
    // Merge with current state
    // Handle edge cases (pause/resume logic)
  }, []);
  
  // Effect: Initial hydrate
  // Effect: Periodic sync if stale
  
  return { syncActiveTrips, isSyncing, lastSyncAt };
}
```

**Removes from EmergencyContext:** ~250 lines

---

### Step 6: Extract Location Sync Hook

**New File:** `hooks/emergency/useEmergencyLocationSync.js`
```javascript
export function useEmergencyLocationSync({ 
  activeAmbulanceTrip, 
  userLocation 
}) {
  // Effect: Watch user location during active trip
  // Effect: Send location updates to server
  // Cleanup: Remove subscription on trip end
}
```

**Removes from EmergencyContext:** ~60 lines

---

### Step 7: Extract Request Lifecycle Actions

**New File:** `hooks/emergency/useEmergencyRequestActions.js`
```javascript
export function useEmergencyRequestActions({ 
  userId, 
  userLocation,
  coverageMode 
}) {
  const createAmbulanceRequest = useCallback(async (params) => {
    // Create request via service
    // Handle demo vs production
    // Return request object
  }, []);
  
  const cancelAmbulanceRequest = useCallback(async (requestId) => {
    // Cancel via service
    // Cleanup state
  }, []);
  
  const completeAmbulanceRequest = useCallback(async (requestId) => {
    // Complete via service
    // Trigger rating
  }, []);
  
  // Same for bed bookings
  
  return {
    createAmbulanceRequest,
    cancelAmbulanceRequest,
    completeAmbulanceRequest,
    createBedBooking,
    cancelBedBooking,
    completeBedBooking,
  };
}
```

**Removes from EmergencyContext:** ~400 lines

---

### Step 8: Extract Demo Responder Heartbeat

**New File:** `hooks/emergency/useDemoResponderHeartbeat.js`
```javascript
export function useDemoResponderHeartbeat({ 
  activeAmbulanceTrip, 
  coverageMode 
}) {
  // Effect: If demo mode and active trip
  // Effect: Poll demo responder endpoint
  // Effect: Update ambulance location on map
  
  return { responderLocation, responderHeading };
}
```

**Removes from EmergencyContext:** ~60 lines

---

## Refactored EmergencyContext.jsx

**After modularization:** ~200 lines

```javascript
export function EmergencyProvider({ children }) {
  // 1. Coverage mode
  const coverageModeData = useCoverageMode(user?.id);
  
  // 2. Hospital discovery
  const hospitalData = useHospitalDiscovery({
    userLocation: globalUserLocation,
    coverageMode: coverageModeData.coverageMode,
    userId: user?.id,
  });
  
  // 3. Active trip state (from Zustand, not local state)
  const tripState = useEmergencyTripStore();
  
  // 4. Realtime subscriptions
  const realtimeData = useEmergencyRealtime({
    activeAmbulanceTrip: tripState.activeAmbulanceTrip,
    onTripUpdate: tripState.setActiveAmbulanceTrip,
  });
  
  // 5. Server sync
  const syncData = useEmergencyServerSync({
    userId: user?.id,
    activeRequestId: tripState.activeAmbulanceTrip?.requestId,
  });
  
  // 6. Location sync
  useEmergencyLocationSync({
    activeAmbulanceTrip: tripState.activeAmbulanceTrip,
    userLocation: globalUserLocation,
  });
  
  // 7. Request actions
  const requestActions = useEmergencyRequestActions({
    userId: user?.id,
    userLocation: globalUserLocation,
    coverageMode: coverageModeData.coverageMode,
  });
  
  // 8. Demo responder
  const demoResponderData = useDemoResponderHeartbeat({
    activeAmbulanceTrip: tripState.activeAmbulanceTrip,
    coverageMode: coverageModeData.coverageMode,
  });
  
  // Compose context value
  const value = useMemo(() => ({
    // Coverage
    ...coverageModeData,
    
    // Hospitals
    hospitals: hospitalData.hospitals,
    allHospitals: hospitalData.allHospitals,
    isLoadingHospitals: hospitalData.isLoading,
    refetchHospitals: hospitalData.refetch,
    
    // Trips (from store)
    activeAmbulanceTrip: tripState.activeAmbulanceTrip,
    activeBedBooking: tripState.activeBedBooking,
    pendingApproval: tripState.pendingApproval,
    
    // Realtime
    telemetryHealth: realtimeData.telemetryHealth,
    realtimeStatus: realtimeData.realtimeStatus,
    
    // Sync
    syncActiveTripsFromServer: syncData.syncActiveTrips,
    isSyncing: syncData.isSyncing,
    
    // Actions
    ...requestActions,
    
    // Demo
    responderLocation: demoResponderData.responderLocation,
    responderHeading: demoResponderData.responderHeading,
  }), [...]);
  
  return (
    <EmergencyContext.Provider value={value}>
      {children}
    </EmergencyContext.Provider>
  );
}
```

---

## Implementation Order

1. **Extract useCoverageMode** (low risk, isolated)
2. **Extract useHospitalDiscovery** (low risk, isolated)
3. **Migrate trip state to Zustand** (medium risk, test thoroughly)
4. **Extract useEmergencyRealtime** (high risk, test realtime)
5. **Extract useEmergencyServerSync** (medium risk)
6. **Extract useEmergencyLocationSync** (low risk)
7. **Extract useEmergencyRequestActions** (medium risk, test CRUD)
8. **Extract useDemoResponderHeartbeat** (low risk, demo only)
9. **Clean up EmergencyContext** (remove dead code)

---

## Risk Mitigation

- **Each extraction:** Create unit tests BEFORE moving code
- **Zustand migration:** Keep old state as backup during transition
- **Realtime:** Test with actual Supabase subscriptions
- **Demo mode:** Verify demo responder still animates correctly

---

## Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| EmergencyContext.jsx | 2,168 lines | ~200 lines |
| New hook files | 0 | 8 files |
| Avg hook size | N/A | ~150 lines |
| Test coverage | Low | High (each hook testable) |
| Bundle impact | None | Slight increase (more files) |

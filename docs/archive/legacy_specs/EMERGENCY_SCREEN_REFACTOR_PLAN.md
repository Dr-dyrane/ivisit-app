# Emergency Screen Modularization & Refactoring Plan

**Last Updated**: 2026-01-10 (superseded 2026-04-23)
**Status**: ⚠️ Superseded — kept for historical context only
**Priority**: n/a

## ⚠️ Superseded Notice

This plan targeted the legacy monolithic `EmergencyScreen.jsx`. The emergency surface has since moved to a map-first runtime under `/map`, and the active refactor work is tracked in:

- [../../flows/emergency/architecture/MAP_RUNTIME_PASS_PLAN_V1.md](../../flows/emergency/architecture/MAP_RUNTIME_PASS_PLAN_V1.md) — live pass plan (Pass 12 in progress as of 2026-04-23)
- [../../flows/emergency/MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md](../../flows/emergency/MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md) — current-state truth
- [../../flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](../../flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md) — runtime contract

Use the pass plan and polish audit as the authoritative refactor guidance. The content below is preserved only to document how the team thought about modularization before the `/map` migration locked in.

---


---

## Executive Summary

The **EmergencyScreen** is currently a **monolithic component** with mixed concerns (UI state, data flow, handlers, navigation, animations). This refactoring extracts concerns into **specialized modules, custom hooks, and presentational components** to achieve:

✅ **Better Readability**: Single responsibility per component/hook  
✅ **Easier Testing**: Isolated logic in custom hooks  
✅ **Bug Reduction**: Separated state management prevents race conditions  
✅ **DRY Principles**: Reusable handlers and utilities  
✅ **Snappy Animations**: Centralized animation control  
✅ **Scalability**: Easy to extend without touching main screen  

---

## Current Architecture Problems

### 🔴 **Monolithic Component**
- EmergencyScreen manages: navigation, refs, handlers, state logic, UI rendering
- 727 lines of mixed concerns
- Hard to test individual pieces
- Race conditions in async handlers

### 🔴 **Duplicated Logic**
```javascript
// Lines 505-517: onCancelAmbulanceTrip
setRequestStatus(...);
cancelVisit(...);
stopAmbulanceTrip();
setTimeout(() => bottomSheetRef.current?.snapToIndex?.(1), 0);

// Lines 531-554: onCancelBedBooking (similar pattern)
setRequestStatus(...);
cancelVisit(...);
stopBedBooking();
// ... plus extra notification logic
```
**Same pattern repeated across 4 handlers** ❌

### 🔴 **Tightly Coupled References**
- Direct ref manipulation: `bottomSheetRef.current?.snapToIndex?.(1)`
- Direct context access throughout component
- Hard to control animation timing
- Bottom sheet doesn't own its own state

### 🔴 **Mixed Responsibilities**
- Hospital selection + map animation + bottom sheet snapping
- Request creation + visit creation + notification creation
- Search filtering + specialty selection + hospital filtering

---

## New Architecture: Module Breakdown

```
screens/
  EmergencyScreen.jsx          ← Lightweight orchestrator (100 lines)

hooks/
  emergency/
    useEmergencyHandlers.js    ← All handler callbacks (DRY)
    useHospitalSelection.js    ← Hospital selection + map animation
    useSearchFiltering.js      ← Search + filter logic
    useRequestFlow.js          ← Request creation + visit + notification
    useTripCompletion.js       ← Trip completion logic (reusable)
    
components/
  emergency/
    EmergencyMapContainer.js   ← Map + controls
    BottomSheetController.js   ← Sheet with isolated handlers
    EmergencyContent.js        ← Hospital list + filters
    
constants/
  emergencyAnimations.js       ← Centralized timing + easing
  emergencyHandlers.js         ← Handler templates
```

---

## Phase 1: Extract Custom Hooks (DRY Principle)

### Hook 1: `useEmergencyHandlers` - Centralize All Handlers

**File**: `hooks/emergency/useEmergencyHandlers.js`

**Purpose**: One place for all handler logic. Eliminates code duplication across 4 handlers.

```javascript
export const useEmergencyHandlers = ({
  activeAmbulanceTrip,
  activeBedBooking,
  setRequestStatus,
  cancelVisit,
  completeVisit,
  stopAmbulanceTrip,
  stopBedBooking,
  addNotification,
  onSheetSnap, // Callback from parent
}) => {
  const createBaseHandler = useCallback(
    (type, actions) => {
      return async () => {
        try {
          await Promise.all(actions.requests);
          actions.onSuccess?.();
          console.log(`[EmergencyHandlers] ${type} success`);
        } catch (err) {
          console.error(`[EmergencyHandlers] ${type} failed:`, err);
        } finally {
          actions.cleanup?.();
          onSheetSnap(1);
        }
      };
    },
    [onSheetSnap]
  );

  const onCancelAmbulanceTrip = useCallback(
    () =>
      createBaseHandler("CancelAmbulanceTrip", {
        requests: [
          setRequestStatus(activeAmbulanceTrip?.requestId, "CANCELLED"),
          cancelVisit(activeAmbulanceTrip?.requestId),
        ],
        cleanup: stopAmbulanceTrip,
      })(),
    [activeAmbulanceTrip, createBaseHandler, ...]
  );

  const onCompleteBedBooking = useCallback(
    () =>
      createBaseHandler("CompleteBedBooking", {
        requests: [
          setRequestStatus(activeBedBooking?.requestId, "COMPLETED"),
          completeVisit(activeBedBooking?.requestId),
          addNotification({ /* ... */ }),
        ],
        cleanup: stopBedBooking,
      })(),
    [activeBedBooking, createBaseHandler, ...]
  );

  return {
    onCancelAmbulanceTrip,
    onCompleteAmbulanceTrip,
    onCancelBedBooking,
    onCompleteBedBooking,
  };
};
```

**Benefits**:
- ✅ Single pattern for all handlers
- ✅ Consistent error handling
- ✅ Promise.all prevents race conditions
- ✅ Easy to add logging/analytics
- ✅ Reusable `createBaseHandler` template

---

### Hook 2: `useHospitalSelection` - Isolate Hospital Logic

**File**: `hooks/emergency/useHospitalSelection.js`

**Purpose**: Keep hospital selection and map animation together.

```javascript
export const useHospitalSelection = ({
  selectedHospital,
  hospitals,
  selectHospital,
  clearSelectedHospital,
  mapRef,
  onListStateChange, // Callback to save list state
}) => {
  const lastListStateRef = useRef({ snapIndex: 1, scrollY: 0 });

  const handleHospitalSelect = useCallback(
    (hospital) => {
      if (!hospital?.id) return;

      lastListStateRef.current = {
        snapIndex: getCurrentSnapIndex(),
        scrollY: getCurrentScrollY(),
      };

      selectHospital(hospital.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Animate map to hospital
      mapRef.current?.animateToHospital(hospital, {
        bottomPadding: screenHeight * 0.5,
        includeUser: true,
      });

      onListStateChange?.(lastListStateRef.current);
    },
    [selectHospital, mapRef, onListStateChange]
  );

  const handleCloseFocus = useCallback(() => {
    clearSelectedHospital();
    return lastListStateRef.current;
  }, [clearSelectedHospital]);

  return {
    handleHospitalSelect,
    handleCloseFocus,
    getLastListState: () => lastListStateRef.current,
  };
};
```

**Benefits**:
- ✅ Hospital logic isolated in one hook
- ✅ Easy to test hospital selection
- ✅ Ref management contained
- ✅ Reusable in other screens

---

### Hook 3: `useSearchFiltering` - Centralize Search Logic

**File**: `hooks/emergency/useSearchFiltering.js`

**Purpose**: Search and filter logic (currently duplicated in 2 places).

```javascript
export const useSearchFiltering = ({
  hospitals,
  mode,
  selectedSpecialty,
  searchQuery,
  setSearchQuery,
}) => {
  // This logic is repeated in handleSearch and searchFilteredHospitals useMemo
  // Move it here to DRY

  const filterByQuery = useCallback(
    (query, baseHospitals) => {
      if (!query.trim()) return baseHospitals;

      const q = query.toLowerCase();
      return baseHospitals.filter((h) => {
        const name = typeof h?.name === "string" ? h.name.toLowerCase() : "";
        const address =
          typeof h?.address === "string" ? h.address.toLowerCase() : "";
        const specialtiesMatch =
          Array.isArray(h?.specialties) &&
          h.specialties.some((s) =>
            (typeof s === "string" ? s.toLowerCase() : "").includes(q)
          );
        const typeMatch =
          typeof h?.type === "string" && h.type.toLowerCase().includes(q);

        return (
          name.includes(q) ||
          address.includes(q) ||
          specialtiesMatch ||
          typeMatch
        );
      });
    },
    []
  );

  const getSearchFiltered = useCallback(
    (query) => {
      const base =
        mode === "booking"
          ? selectedSpecialty
            ? hospitals.filter((h) =>
                h?.specialties?.includes?.(selectedSpecialty)
              )
            : hospitals
          : hospitals;

      return filterByQuery(query, base);
    },
    [mode, selectedSpecialty, hospitals, filterByQuery]
  );

  return {
    searchFilteredHospitals: getSearchFiltered(searchQuery),
    handleSearch: setSearchQuery,
    filterByQuery, // Exported for reuse
  };
};
```

**Benefits**:
- ✅ Filter logic defined once
- ✅ Reusable in other screens
- ✅ Easy to optimize filtering performance
- ✅ Testable in isolation

---

### Hook 4: `useRequestFlow` - Request + Visit + Notification

**File**: `hooks/emergency/useRequestFlow.js`

**Purpose**: Extract the `handleRequestComplete` logic into a clean, reusable hook.

```javascript
export const useRequestFlow = ({
  createRequest,
  addVisit,
  user,
  preferences,
  medicalProfile,
  emergencyContacts,
  currentRoute,
}) => {
  const handleRequestComplete = useCallback(
    async (request, hospitalId, hospital, selectedSpecialty) => {
      if (!request?.serviceType || !hospitalId) {
        console.warn("[useRequestFlow] Missing required params");
        return;
      }

      const visitId = request?.requestId
        ? String(request.requestId)
        : `local_${Date.now()}`;

      try {
        // Create request in DB
        await createRequest({
          id: visitId,
          requestId: visitId,
          serviceType: request.serviceType,
          hospitalId,
          // ... other fields
        });

        // Create corresponding visit
        const date = new Date().toISOString().slice(0, 10);
        const time = new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        });

        const visitData = {
          id: visitId,
          visitId,
          requestId: visitId,
          hospitalId: String(hospitalId),
          // ... shared fields
        };

        if (request.serviceType === "ambulance") {
          await addVisit({
            ...visitData,
            type: VISIT_TYPES.AMBULANCE_RIDE,
            // ...
          });
        } else if (request.serviceType === "bed") {
          await addVisit({
            ...visitData,
            type: VISIT_TYPES.BED_BOOKING,
            // ...
          });
        }

        console.log(`[useRequestFlow] Request created: ${visitId}`);
        return visitId;
      } catch (err) {
        console.error("[useRequestFlow] Request creation failed:", err);
        throw err;
      }
    },
    [createRequest, addVisit, user, preferences, medicalProfile, emergencyContacts]
  );

  return { handleRequestComplete };
};
```

**Benefits**:
- ✅ Async IIFE removed → clean function
- ✅ Better error handling with proper logging
- ✅ Reusable across different screens
- ✅ Returns visitId for chaining operations

---

## Phase 2: Extract Presentational Components

### Component 1: `EmergencyMapContainer` - Isolated Map

**File**: `components/emergency/EmergencyMapContainer.js`

```javascript
export const EmergencyMapContainer = forwardRef((props, ref) => {
  const {
    hospitals,
    selectedHospitalId,
    routeHospitalId,
    showControls,
    mode,
    activeTrip,
    onHospitalSelect,
    onMapReady,
    onRouteCalculated,
  } = props;

  return (
    <View style={styles.container}>
      <FullScreenEmergencyMap
        ref={ref}
        hospitals={hospitals}
        onHospitalSelect={onHospitalSelect}
        selectedHospitalId={selectedHospitalId}
        routeHospitalId={routeHospitalId}
        mode={mode}
        showControls={showControls}
        onMapReady={onMapReady}
        onRouteCalculated={onRouteCalculated}
        // ... all map-specific props
      />
    </View>
  );
});
```

**Benefits**:
- ✅ Map logic isolated
- ✅ Single place to add map-specific features
- ✅ Easy to test map interactions
- ✅ Can be reused in other screens

---

### Component 2: `BottomSheetController` - Wrapped with Handlers

**File**: `components/emergency/BottomSheetController.js`

```javascript
export const BottomSheetController = forwardRef((props, ref) => {
  const {
    mode,
    selectedHospital,
    activeAmbulanceTrip,
    activeBedBooking,
    onCancelAmbulanceTrip,
    onCompleteAmbulanceTrip,
    onCancelBedBooking,
    onCompleteBedBooking,
    // ... other sheet props
  } = props;

  const handleSheetSnap = useCallback((index) => {
    ref.current?.snapToIndex?.(index);
  }, [ref]);

  return (
    <EmergencyBottomSheet
      ref={ref}
      // Inject handlers with snapping capability
      onCancelAmbulanceTrip={async () => {
        await onCancelAmbulanceTrip();
        handleSheetSnap(1);
      }}
      onCompleteAmbulanceTrip={async () => {
        await onCompleteAmbulanceTrip();
        handleSheetSnap(1);
      }}
      onCancelBedBooking={async () => {
        await onCancelBedBooking();
        handleSheetSnap(1);
      }}
      onCompleteBedBooking={async () => {
        await onCompleteBedBooking();
        handleSheetSnap(1);
      }}
      // ... pass all other props
      {...props}
    />
  );
});
```

**Benefits**:
- ✅ Sheet handlers centralized
- ✅ Animation control in one place
- ✅ Easy to add shared sheet logic
- ✅ Clean separation from main screen

---

## Phase 3: Simplify Main Screen

### Refactored `EmergencyScreen.jsx` - ~150 lines (from 727)

```javascript
export default function EmergencyScreen() {
  // Context hooks
  const { resetTabBar, lockTabBarHidden } = useTabBarVisibility();
  const { resetHeader, setHeaderState } = useScrollAwareHeader();
  const { registerFAB } = useFAB();
  const { mode, selectedHospital, activeAmbulanceTrip, ...emergencyState } =
    useEmergency();
  const { user } = useAuth();

  // Refs
  const mapRef = useRef(null);
  const bottomSheetRef = useRef(null);

  // Custom hooks - all DRY logic extracted
  const { onCancelAmbulanceTrip, onCompleteAmbulanceTrip, ... } =
    useEmergencyHandlers({
      activeAmbulanceTrip,
      activeBedBooking,
      setRequestStatus,
      // ... deps
    });

  const { handleHospitalSelect, handleCloseFocus } = useHospitalSelection({
    selectedHospital,
    hospitals,
    selectHospital,
    mapRef,
    // ... deps
  });

  const { searchFilteredHospitals, handleSearch } = useSearchFiltering({
    hospitals,
    mode,
    searchQuery,
    // ... deps
  });

  // Setup header and FAB
  useFocusEffect(useCallback(() => {
    resetHeader();
    setHeaderState({ /* ... */ });
  }, [mode]));

  useFocusEffect(useCallback(() => {
    registerFAB({
      icon: mode === "emergency" ? "bed-patient" : "medical",
      visible: !shouldHideFAB,
      onPress: () => toggleMode(),
    });
  }, [mode, shouldHideFAB]));

  // Render clean hierarchy
  return (
    <View style={styles.container}>
      <EmergencyMapContainer
        ref={mapRef}
        hospitals={searchFilteredHospitals}
        selectedHospitalId={selectedHospital?.id}
        onHospitalSelect={handleHospitalSelect}
        // ... other props
      />

      <BottomSheetController
        ref={bottomSheetRef}
        mode={mode}
        selectedHospital={selectedHospital}
        activeAmbulanceTrip={activeAmbulanceTrip}
        onCancelAmbulanceTrip={onCancelAmbulanceTrip}
        onCompleteAmbulanceTrip={onCompleteAmbulanceTrip}
        // ... other props
      />

      <EmergencyRequestModal
        visible={showEmergencyRequestModal}
        selectedHospital={requestHospital}
        onRequestComplete={handleRequestComplete}
        onClose={handleCloseEmergencyRequestModal}
      />
    </View>
  );
}
```

**Benefits**:
- ✅ Down to ~150 lines from 727
- ✅ Clear separation of concerns
- ✅ Each hook has single responsibility
- ✅ Easy to read and understand flow

---

## Phase 4: Animation Control Centralization

### File: `constants/emergencyAnimations.js`

```javascript
export const EMERGENCY_ANIMATIONS = {
  SHEET_SNAP_DURATION: 300,
  HOSPITAL_SELECT: {
    duration: 300,
    easing: [0.21, 0.47, 0.32, 0.98], // Apple easing
  },
  BOTTOM_SHEET: {
    snapPoints: [
      Dimensions.get("window").height * 0.15,  // Collapsed
      Dimensions.get("window").height * 0.5,   // Half
      Dimensions.get("window").height * 0.92,  // Expanded
    ],
  },
  MAP_PADDING: {
    collapsed: Dimensions.get("window").height * 0.15,
    half: Dimensions.get("window").height * 0.5,
    expanded: Dimensions.get("window").height * 0.92,
  },
};

export const getMapPaddingForSnapIndex = (snapIndex) => {
  const { MAP_PADDING } = EMERGENCY_ANIMATIONS;
  switch (snapIndex) {
    case 0:
      return MAP_PADDING.collapsed;
    case 1:
      return MAP_PADDING.half;
    case 2:
      return MAP_PADDING.expanded;
    default:
      return MAP_PADDING.half;
  }
};
```

**Benefits**:
- ✅ Single source of truth for timings
- ✅ Easy to adjust animations globally
- ✅ Consistent behavior across components
- ✅ No magic numbers scattered everywhere

---

## Implementation Roadmap

### Phase 1: Extract Hooks (4-5 hours)
- [ ] Create `useEmergencyHandlers.js` with `createBaseHandler` pattern
- [ ] Create `useHospitalSelection.js`
- [ ] Create `useSearchFiltering.js`
- [ ] Create `useRequestFlow.js`
- [ ] Export all hooks from `hooks/emergency/index.js`
- [ ] Test: Verify each hook works in isolation

### Phase 2: Extract Components (3-4 hours)
- [ ] Create `EmergencyMapContainer.js`
- [ ] Create `BottomSheetController.js`
- [ ] Create `EmergencyContent.js` (if needed)
- [ ] Test: Verify component props and callbacks work

### Phase 3: Refactor Main Screen (2-3 hours)
- [ ] Replace inline handlers with hook versions
- [ ] Replace inline components with extracted components
- [ ] Remove duplicate logic
- [ ] Update imports and dependencies
- [ ] Run lint and typecheck

### Phase 4: Animation Control (1-2 hours)
- [ ] Create `emergencyAnimations.js`
- [ ] Replace hardcoded values
- [ ] Update padding calculations
- [ ] Test: Verify animations are still snappy

### Phase 5: Testing & QA (3-4 hours)
- [ ] Unit tests for each hook
- [ ] Integration tests for handler flow
- [ ] Manual testing: Ambulance flow end-to-end
- [ ] Manual testing: Bed booking flow end-to-end
- [ ] Performance: Verify no animation jank

---

## Code Quality Standards

### ✅ DRY Principle
- No duplicated handler patterns → `useEmergencyHandlers` template
- No duplicated search logic → `useSearchFiltering`
- No duplicated trip logic → `useTripCompletion`

### ✅ Separation of Concerns
- Map logic → `EmergencyMapContainer`
- Bottom sheet logic → `BottomSheetController`
- Handlers → `useEmergencyHandlers`
- Search → `useSearchFiltering`
- Hospital selection → `useHospitalSelection`

### ✅ Error Handling
- All async operations wrapped in try/catch
- Consistent logging with `[ModuleName]` prefix
- Errors propagate up with context

### ✅ Dependencies
- All useCallback dependencies properly listed
- No missing deps in useMemo
- No unnecessary re-renders

---

## Benefits Summary

| Before | After |
|--------|-------|
| 727 lines in one file | ~150 in main screen + modular hooks |
| 4 duplicate handler patterns | 1 reusable pattern |
| Race conditions in async | Promise.all pattern centralized |
| Silent error catches | Consistent error logging |
| Tight coupling to refs | Loose coupling via callbacks |
| Hard to test | Easy to test each hook |
| Animations scattered | Centralized timing constants |

---

## Testing Strategy

### Unit Tests
```javascript
// useEmergencyHandlers.test.js
describe('useEmergencyHandlers', () => {
  it('should create handlers that properly await async operations', async () => {
    // Test createBaseHandler pattern
  });
  
  it('should call onSheetSnap after completion', async () => {
    // Verify snap is called
  });
});

// useHospitalSelection.test.js
describe('useHospitalSelection', () => {
  it('should save list state on hospital select', () => {
    // Verify lastListStateRef is updated
  });
});
```

### Integration Tests
1. Start ambulance → complete trip → verify all data persisted
2. Start bed booking → cancel → verify notification created
3. Search hospitals → select → verify map animates

### Manual QA
- [ ] Hospital selection smooth and snappy
- [ ] Bottom sheet snaps without stuttering
- [ ] No race conditions in completion
- [ ] All notifications appear correctly
- [ ] No console errors during flows

---

## Risk Assessment

### Low Risk Changes
- Extracting hooks (doesn't change behavior)
- Extracting pure components
- Centralizing constants

### Medium Risk Changes
- Refactoring handlers (need careful testing)
- Changing ref management
- Modifying async patterns

### Mitigation
- Comprehensive integration tests before deploying
- Feature flag to switch between old/new
- Manual QA on both flows
- Monitor error logs for 24 hours post-deploy

---

## Future Enhancements

1. **Reusable Handler Pattern**: Use `useEmergencyHandlers` pattern in other screens
2. **Custom Hook Library**: Build library of domain-specific hooks
3. **Error Boundary**: Wrap main screen with error boundary
4. **Analytics Integration**: Add tracking to handler hook
5. **Loading States**: Add visual feedback during async operations
6. **Undo Functionality**: Implement cancellation of recent actions

---

## References

- **Current**: `screens/EmergencyScreen.jsx` (727 lines)
- **Contexts**: EmergencyContext, EmergencyUIContext, NotificationsContext
- **Components**: FullScreenEmergencyMap, EmergencyBottomSheet, EmergencyRequestModal
- **Services**: emergencyRequestsService, useVisits, useEmergencyRequests

---

## Success Criteria

✅ Main screen reduced to ~150 lines  
✅ All handlers follow DRY pattern  
✅ Each hook has single responsibility  
✅ No duplicated logic  
✅ Proper error handling throughout  
✅ All animations remain snappy  
✅ All flows work end-to-end  
✅ Linting and type checking pass  
✅ Tests pass  

---

## Sign-Off

**Created By**: Zencoder  
**Date**: 2026-01-10  
**Status**: Ready for Implementation  
**Estimated Duration**: 13-18 hours (phased implementation)  
**Priority**: High (maintainability + bug reduction)

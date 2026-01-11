# EmergencyBottomSheet & FullScreenEmergencyMap Modularization Plan

**Date**: 2026-01-10  
**Status**: Planning → Implementation  
**Priority**: High - 2551 lines to modularize (1472 + 1079)

---

## Current State Analysis

### 📊 File Sizes & Complexity

| File | Lines | Concerns | Hooks | State |
|------|-------|----------|-------|-------|
| EmergencyBottomSheet.jsx | 1472 | 8+ | 4 | 10+ |
| FullScreenEmergencyMap.jsx | 1079 | 7+ | 3 | 11+ |
| **Total** | **2551** | **15+** | **7** | **21+** |

### 🔴 Current Problems

#### EmergencyBottomSheet Issues
1. **Mixed concerns** (1472 lines)
   - Bottom sheet snap/animation logic
   - Search/filter UI
   - Hospital list rendering
   - Trip summary card rendering
   - Bed booking summary card rendering
   - Scroll awareness (header/tab bar hiding)
   - Profile modal management
   - Keyboard handling

2. **Duplicated calculations** (multiple useMemo)
   - Trip progress/status calculation
   - ETA formatting (appears twice for ambulance + bed booking)
   - Phone normalization logic
   - Hospital resolution (trip vs booking)

3. **Complex state management**
   - 10+ useState/useContext hooks
   - Interdependent state updates
   - Hard to trace data flow

4. **Tight coupling**
   - Direct ref manipulation
   - Hardcoded styles scattered throughout
   - No reusable sub-components

#### FullScreenEmergencyMap Issues
1. **Mixed concerns** (1079 lines)
   - Map initialization & lifecycle
   - Location permissions & tracking
   - Route calculation (Google + OSRM fallback)
   - Polyline decoding
   - Bearing calculations
   - Ambulance animation loop
   - Marker management
   - Map controls UI

2. **Utility functions mixed with component**
   - `decodeGooglePolyline()` - Should be utility
   - `calculateBearing()` - Should be utility
   - `getDrivingRoute()` - Should be hook
   - `getFormattedDuration()` - Should be utility

3. **Multiple responsibilities**
   - Route calculation logic
   - Ambulance simulation logic
   - Map rendering
   - Location permission handling

4. **Complex async operations**
   - Location permission flow
   - Route fetching with race condition handling
   - Ambulance coordinate updates with timer
   - Multiple API fallbacks

---

## Modularization Strategy

### 🎯 Goals
- ✅ Reduce each file to ~300-400 lines
- ✅ Single responsibility per hook/component
- ✅ Extract all utilities to separate files
- ✅ Reusable sub-components
- ✅ Centralized constants
- ✅ Better testability

### Phase 1: Extract Bottom Sheet Hooks (4-5 hours)

#### Hook 1: `useBottomSheetSnap.js`
**Purpose**: Manage snap points, animations, and state

```javascript
export const useBottomSheetSnap = ({
  isDetailMode,
  isTripMode,
  isBedBookingMode,
  onSnapChange,
}) => {
  const {
    snapPoints,      // [collapsed, half, expanded]
    animationConfigs,
    currentSnapIndex,
    updateSnapIndex,
  } = useEmergencySheetController({
    isDetailMode,
    onSnapChange,
  });

  const handleSheetChange = useCallback((index) => {
    // All snap change logic here
  }, [deps]);

  return { snapPoints, animationConfigs, handleSheetChange, currentSnapIndex };
};
```

#### Hook 2: `useBottomSheetScroll.js`
**Purpose**: Handle scroll awareness, header/tab bar hiding

```javascript
export const useBottomSheetScroll = () => {
  const {
    handleScroll: handleTabBarScroll,
    resetTabBar,
    hideTabBar,
  } = useTabBarVisibility();
  
  const {
    handleScroll: handleHeaderScroll,
    resetHeader,
    hideHeader,
    showHeader,
    lockHeaderHidden,
    unlockHeaderHidden,
  } = useScrollAwareHeader();

  const handleScroll = useCallback((event) => {
    // Optimized scroll handling
  }, [deps]);

  return {
    handleScroll,
    hideTabBar,
    resetTabBar,
    hideHeader,
    showHeader,
    lockHeaderHidden,
    unlockHeaderHidden,
  };
};
```

#### Hook 3: `useTripProgress.js`
**Purpose**: Calculate trip ETA, progress, status, formatting

```javascript
export const useTripProgress = ({ activeAmbulanceTrip, nowMs }) => {
  // Consolidates:
  // - remainingSeconds calculation
  // - tripProgress calculation
  // - computedStatus calculation
  // - formattedRemaining formatting

  return {
    remainingSeconds,
    tripProgress,
    computedStatus,
    formattedRemaining,
  };
};
```

#### Hook 4: `useBedBookingProgress.js`
**Purpose**: Calculate bed booking ETA, progress, status

```javascript
export const useBedBookingProgress = ({ activeBedBooking, nowMs }) => {
  // Similar pattern to useTripProgress
  // Consolidates bed booking calculations
  
  return {
    remainingBedSeconds,
    bedProgress,
    bedStatus,
    formattedBedRemaining,
  };
};
```

#### Hook 5: `useBottomSheetSearch.js`
**Purpose**: Handle search input, focus, clearing

```javascript
export const useBottomSheetSearch = ({ onSearch }) => {
  const { updateSearch, clearSearch } = useEmergencyUI();

  const handleSearchChange = useCallback((text) => {
    updateSearch(text);
    if (onSearch) onSearch(text);
  }, [deps]);

  const handleSearchFocus = useCallback(() => {
    // Focus logic
  }, [deps]);

  const handleSearchBlur = useCallback(() => {
    // Blur logic
  }, [deps]);

  const handleSearchClear = useCallback(() => {
    // Clear logic
  }, [deps]);

  return {
    handleSearchChange,
    handleSearchFocus,
    handleSearchBlur,
    handleSearchClear,
  };
};
```

---

### Phase 2: Extract Bottom Sheet Sub-Components (3-4 hours)

#### Component 1: `TripSummaryCard.jsx`
**Purpose**: Render ambulance trip details

```javascript
export const TripSummaryCard = ({
  activeAmbulanceTrip,
  tripProgress,
  computedStatus,
  formattedRemaining,
  onCall,
  onSMS,
  onCancel,
  onComplete,
  isDarkMode,
}) => {
  // Clean rendering of trip card
};
```

#### Component 2: `BedBookingSummaryCard.jsx`
**Purpose**: Render bed booking details

```javascript
export const BedBookingSummaryCard = ({
  activeBedBooking,
  bedProgress,
  bedStatus,
  formattedBedRemaining,
  onCancel,
  onComplete,
  isDarkMode,
}) => {
  // Clean rendering of bed booking card
};
```

#### Component 3: `HospitalListSection.jsx`
**Purpose**: Render scrollable hospital list with filters

```javascript
export const HospitalListSection = ({
  hospitals,
  selectedHospital,
  hasActiveFilters,
  onHospitalSelect,
  onSearch,
  searchQuery,
  mode,
  // ... filter props
}) => {
  // Hospital list rendering
};
```

#### Component 4: `SheetSearchBar.jsx`
**Purpose**: Search input with clear button

```javascript
export const SheetSearchBar = ({
  searchQuery,
  onSearchChange,
  onSearchFocus,
  onSearchBlur,
  onSearchClear,
  isCollapsed,
}) => {
  // Search bar UI
};
```

---

### Phase 3: Extract Map Hooks (5-6 hours)

#### Hook 1: `useMapLocation.js`
**Purpose**: Location permission & current position tracking

```javascript
export const useMapLocation = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const hasCenteredOnUser = useRef(false);

  const requestLocationPermission = useCallback(async () => {
    // Permission flow
  }, []);

  const startLocationTracking = useCallback(() => {
    // Start listening to location updates
  }, []);

  return {
    userLocation,
    locationPermission,
    requestLocationPermission,
    startLocationTracking,
  };
};
```

#### Hook 2: `useMapRoute.js`
**Purpose**: Route calculation and management

```javascript
export const useMapRoute = ({ getDrivingRoute, decodePolyline }) => {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeInfo, setRouteInfo] = useState({ durationSec: null, distanceMeters: null });
  const routeFetchIdRef = useRef(0);

  const calculateRoute = useCallback(
    async (origin, destination) => {
      // Route calculation with race condition handling
    },
    [getDrivingRoute, decodePolyline]
  );

  return {
    routeCoordinates,
    routeInfo,
    calculateRoute,
  };
};
```

#### Hook 3: `useAmbulanceAnimation.js`
**Purpose**: Animate ambulance movement along route

```javascript
export const useAmbulanceAnimation = ({
  routeCoordinates,
  animateAmbulance,
  ambulanceTripEtaSeconds,
  responderLocation,
  responderHeading,
}) => {
  const [ambulanceCoordinate, setAmbulanceCoordinate] = useState(null);
  const [ambulanceHeading, setAmbulanceHeading] = useState(0);
  const ambulanceTimerRef = useRef(null);

  const startAmbulanceAnimation = useCallback(() => {
    // Animate ambulance along route
  }, [routeCoordinates, ambulanceTripEtaSeconds]);

  return {
    ambulanceCoordinate,
    ambulanceHeading,
    startAmbulanceAnimation,
  };
};
```

---

### Phase 4: Extract Map Utilities (2-3 hours)

#### File 1: `mapUtils.js`
**Purpose**: Reusable map math functions

```javascript
// Polyline decoding
export const decodeGooglePolyline = (encoded) => {
  // Google polyline algorithm
};

// Bearing calculation
export const calculateBearing = (from, to) => {
  // Calculate heading between two coordinates
};

// Coordinate validation
export const isValidCoordinate = (coordinate) => {
  // Check if lat/lng are finite numbers
};

// Distance calculation
export const calculateDistance = (from, to) => {
  // Haversine formula
};

// Bounds calculation
export const getCoordinateBounds = (coordinates) => {
  // Get min/max lat/lng
};
```

#### File 2: `routeService.js`
**Purpose**: Route calculation with fallbacks

```javascript
export const getDrivingRoute = async ({ origin, destination }) => {
  try {
    // Google Directions API
  } catch (err) {
    // OSRM fallback
  }
};

export const formatDuration = (seconds) => {
  // Format duration in human-readable way
};

export const formatDistance = (meters) => {
  // Format distance (km or mi)
};
```

#### File 3: `mapConstants.js`
**Purpose**: Centralized map configuration

```javascript
export const MAP_CONFIG = {
  DEFAULT_ZOOM: 15,
  HOSPITAL_ZOOM: 16,
  CITY_ZOOM: 12,
  INITIAL_LATITUDE: 37.7749,  // Or user location
  INITIAL_LONGITUDE: -122.4194,
  ANIMATION_DURATION: 500,
  ROUTE_ANIMATION_DURATION: 3000,
};

export const MARKER_CONFIG = {
  HOSPITAL_SIZE: 40,
  USER_SIZE: 50,
  AMBULANCE_SIZE: 45,
  CLUSTER_SIZE: 45,
};

export const MAP_STYLES = {
  DARK: [/* dark theme styles */],
  LIGHT: [/* light theme styles */],
};
```

---

### Phase 5: Refactor Main Components (2-3 hours)

#### Refactored `EmergencyBottomSheet.jsx` (~350 lines)
```javascript
export const EmergencyBottomSheet = forwardRef((props, ref) => {
  // Hook-based logic
  const { snapPoints, handleSheetChange } = useBottomSheetSnap({...});
  const { handleScroll, hideTabBar, resetTabBar } = useBottomSheetScroll();
  const { tripProgress, computedStatus } = useTripProgress({...});
  const { bedProgress, bedStatus } = useBedBookingProgress({...});
  const { handleSearchChange, handleSearchFocus } = useBottomSheetSearch({...});

  // Minimal JSX - just compose sub-components
  return (
    <BottomSheet snapPoints={snapPoints} onChange={handleSheetChange}>
      {isDetailMode && <HospitalDetailView {...props} />}
      {isTripMode && (
        <TripSummaryCard tripProgress={tripProgress} {...props} />
      )}
      {isBedBookingMode && (
        <BedBookingSummaryCard bedProgress={bedProgress} {...props} />
      )}
      {!isDetailMode && !isTripMode && !isBedBookingMode && (
        <>
          <SheetSearchBar {...props} />
          <HospitalListSection {...props} />
        </>
      )}
    </BottomSheet>
  );
});
```

#### Refactored `FullScreenEmergencyMap.jsx` (~300 lines)
```javascript
export const FullScreenEmergencyMap = forwardRef((props, ref) => {
  // Hook-based logic
  const { userLocation, requestLocationPermission } = useMapLocation();
  const { routeCoordinates, calculateRoute } = useMapRoute({...});
  const { ambulanceCoordinate, ambulanceHeading } = useAmbulanceAnimation({...});

  // Minimal JSX - compose map with markers and overlays
  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map}>
        {/* Hospitals */}
        {/* User location */}
        {/* Route polyline */}
        {/* Ambulance */}
      </MapView>
      {/* Map controls */}
    </View>
  );
});
```

---

## Implementation Roadmap

### Phase 1: Bottom Sheet Hooks (4-5 hours)
- [ ] Create `useBottomSheetSnap.js`
- [ ] Create `useBottomSheetScroll.js`
- [ ] Create `useTripProgress.js`
- [ ] Create `useBedBookingProgress.js`
- [ ] Create `useBottomSheetSearch.js`
- [ ] Test: Verify snap behavior, scroll, progress calculations

### Phase 2: Bottom Sheet Sub-Components (3-4 hours)
- [ ] Create `TripSummaryCard.jsx`
- [ ] Create `BedBookingSummaryCard.jsx`
- [ ] Create `HospitalListSection.jsx`
- [ ] Create `SheetSearchBar.jsx`
- [ ] Test: Component rendering, props passing

### Phase 3: Map Hooks (5-6 hours)
- [ ] Create `useMapLocation.js`
- [ ] Create `useMapRoute.js`
- [ ] Create `useAmbulanceAnimation.js`
- [ ] Test: Location flow, route calculation, animation

### Phase 4: Map Utilities (2-3 hours)
- [ ] Create `mapUtils.js` (polyline, bearing, etc.)
- [ ] Create `routeService.js` (route calculation, formatting)
- [ ] Create `mapConstants.js` (config, markers, styles)
- [ ] Test: Utility functions in isolation

### Phase 5: Refactor Components (2-3 hours)
- [ ] Refactor `EmergencyBottomSheet.jsx` to use hooks
- [ ] Refactor `FullScreenEmergencyMap.jsx` to use hooks
- [ ] Update all imports in EmergencyScreen
- [ ] Lint, typecheck, verify

**Total Duration**: 16-21 hours (estimated)

---

## Expected Benefits

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| EmergencyBottomSheet | 1472 | ~350 | -76% |
| FullScreenEmergencyMap | 1079 | ~300 | -72% |
| Total Lines | 2551 | ~700 | -73% |
| Extracted Hooks | 0 | 8 | 8 new |
| Extracted Utils | 0 | 2 files | Reusable |
| Sub-Components | 0 | 4 | Modular |
| Testable Units | ~2 | 14+ | Easier testing |

---

## Code Quality Standards

### ✅ DRY Principle
- No duplicated calculations (trip progress, bed progress, ETA formatting)
- Utilities exported and reused
- Constants centralized

### ✅ Separation of Concerns
- Snap point logic → `useBottomSheetSnap`
- Scroll awareness → `useBottomSheetScroll`
- Trip progress → `useTripProgress`
- Location → `useMapLocation`
- Route → `useMapRoute`
- Animation → `useAmbulanceAnimation`

### ✅ Performance
- Proper memoization in hooks
- Race condition handling for routes
- Optimized scroll event handling
- Efficient re-render patterns

---

## Success Criteria

✅ EmergencyBottomSheet reduced to ~350 lines  
✅ FullScreenEmergencyMap reduced to ~300 lines  
✅ All utilities extracted to separate files  
✅ All sub-components extracted  
✅ All hooks follow standard patterns  
✅ Zero duplicated logic  
✅ All flows work end-to-end  
✅ No breaking changes to public API  
✅ Linting and typecheck pass  

---

**Status**: Ready for Phase 1 implementation

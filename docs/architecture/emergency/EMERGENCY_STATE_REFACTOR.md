---
status: living
owner: architecture
last_updated: 2026-05-24
---

# Emergency State Management Architecture Refactor

> **Reconciliation Note — 2026-05-24:** This document describes the **Phase 1 parallel-implementation** state. The migration has since completed through **Phase 6+**. Reality update:
>
> - `EmergencyContextAdapter.jsx` and `EmergencyContextProviders.jsx` referenced below **no longer exist** as separate files; their roles collapsed back into a single thin `contexts/EmergencyContext.jsx` (~228 lines) that orchestrates `hooks/emergency/*`.
> - `useMapExploreFlow` and the broader map flow now consume the five-layer architecture directly (stores + atoms + machines + query) — the parallel-implementation phasing is complete.
> - The "Next Steps" list at the bottom of this doc has been fully executed except for the optional final deletion (intentionally retained as a thin shell).
>
> Current entry-point references:
>
> - [`../overview/ARCHITECTURE.md`](../overview/ARCHITECTURE.md) — system overview (v2.0)
> - [`../state/GOLD_STANDARD_STATE_ROADMAP.md`](../state/GOLD_STANDARD_STATE_ROADMAP.md) — full migration phases
> - [`../stores/STORES_README.md`](../stores/STORES_README.md) — 22-store Layer 3 inventory
>
> The body below is retained for historical context.

---

## Summary

Refactored the emergency flow state management from a monolithic 2168-line `EmergencyContext.jsx` into a clean, layered architecture with separated concerns.

## New Architecture

### 1. Store Layer (Zustand)
**File**: `stores/emergencyTripStore.js`
- Holds full trip state: `activeAmbulanceTrip`, `activeBedBooking`, `pendingApproval`, `commitFlow`
- Event gates for realtime ordering: `ambulance`, `bed`
- Loading/sync states: `isSyncing`, `lastSyncAt`
- CRUD actions with Immer for immutable updates
- Patch methods for partial updates

### 2. Selectors Layer (Pure Functions)
**File**: `stores/emergencyTripSelectors.js`
- Pure selectors for derived state (can be used outside React)
- Telemetry health computation
- Trip progress calculations
- Capability flags (canMarkArrived, canComplete, etc.)
- React hooks that wrap selectors with `useMemo`

### 3. Sync Engine Hook
**File**: `hooks/emergency/useEmergencySyncEngine.js`
- Real-time subscription management
- Truth sync from server with debouncing
- Event ordering with version gates
- Recovery handling for connection issues

### 4. Lifecycle Hooks
**File**: `hooks/emergency/useEmergencyLifecycle.js`
- Complete/cancel/arrived handlers
- Base handler pattern for consistent error handling
- Haptic feedback integration
- Proper cleanup sequencing

### 5. Runtime Hook
**File**: `hooks/emergency/useEmergencyTripRuntime.js`
- Combines store + selectors for React components
- Auto-refreshing `nowMs` for progress calculations
- Single hook for all trip-related state

### 6. Context Adapter (Thin Layer)
**File**: `contexts/EmergencyContextAdapter.jsx`
- Provides backward-compatible `useEmergency` hook
- Bridges store + hooks + providers
- No business logic, just wiring

### 7. Provider Proxies
**File**: `contexts/EmergencyContextProviders.jsx`
- Service method wrappers
- Hospital/ambulance resolution helpers

## Key Fixes

### 1. Stale Closure in `finishCommitPayment`
**Location**: `hooks/map/exploreFlow/useMapExploreFlow.js:1256`

**Problem**: `trackingRequestKey` captured from closure was stale after payment completion.

**Fix**: Read current state from store at execution time:
```javascript
const store = useEmergencyTripStore.getState();
const hasActiveTrip = !!(store.activeAmbulanceTrip?.requestId || store.activeBedBooking?.requestId);
```

### 2. Gradient Unmasking Issue
**Location**: `components/map/views/tracking/mapTracking.theme.js:61-107`

**Problem**: Hardcoded rgba values didn't properly mask content against card backgrounds.

**Fix**: 
- Compute fade colors from surface color dynamically
- Connector colors now derive from tracking kind (ambulance vs bed)
- Proper alpha interpolation for smooth masking

### 3. Store-Based State in useMapExploreFlow
**Location**: `hooks/map/exploreFlow/useMapExploreFlow.js:282-285`

**Changes**:
- Import `useEmergencyTripRuntime` and `useEmergencyTripStore`
- Use store selectors for `activeAmbulanceTrip`, `activeBedBooking`, etc.
- Import `syncActiveTripsFromServer` from context for payment flow

## Integration Points

### useMapExploreFlow Changes
1. Added imports for new store/hooks
2. Removed store-based values from `useEmergency` destructuring
3. Added `tripRuntime` hook call
4. Fixed `finishCommitPayment` stale closure
5. All trip state now reactive via Zustand store

### Backward Compatibility
- Original `EmergencyContext.jsx` remains unchanged
- New code uses `EmergencyContextAdapter` internally
- Gradual migration path: components can use new hooks directly

## Migration Path

### Phase 1 (Current): Parallel Implementation
- New architecture files created
- `useMapExploreFlow` updated to use new hooks
- Original context still works

### Phase 2: Component Migration
- Update components to use new hooks directly:
  ```javascript
  import { useEmergencyTripRuntime } from '../hooks/emergency/useEmergencyTripRuntime';
  const { activeAmbulanceTrip } = useEmergencyTripRuntime();
  ```

### Phase 3: Context Replacement
- Replace `EmergencyContext.jsx` with adapter
- Remove legacy code

## File Structure

```
stores/
â”œâ”€â”€ emergencyTripStore.js         # Zustand store with full CRUD
â”œâ”€â”€ emergencyTripSelectors.js     # Pure selectors + React hooks
â””â”€â”€ index.js                      # Barrel exports

hooks/emergency/
â”œâ”€â”€ useEmergencySyncEngine.js     # Realtime sync + subscriptions
â”œâ”€â”€ useEmergencyLifecycle.js      # Complete/cancel/arrived handlers
â”œâ”€â”€ useEmergencyTripRuntime.js    # Combined runtime hook
â”œâ”€â”€ bedBookingRuntime.js            # Bed booking normalization (existing)
â””â”€â”€ index.js                      # Barrel exports

contexts/
â”œâ”€â”€ EmergencyContextAdapter.jsx   # Thin context adapter
â”œâ”€â”€ EmergencyContextProviders.jsx # Service proxies
â””â”€â”€ EmergencyContext.jsx          # Original (preserved)
```

## Benefits

1. **Separation of Concerns**: Server state, UI flow, and animation state are now separate
2. **No Stale Closures**: Store state accessed via `getState()` at execution time
3. **Better Performance**: Selectors memoized with `useMemo`
4. **Easier Testing**: Pure selectors can be unit tested
5. **Type Safety**: Easier to add TypeScript to smaller modules
6. **Maintainability**: Each file has a single responsibility

## Next Steps

1. Test the new architecture in payment flow
2. Verify tracking triggers correctly after payment
3. Test rating modal timing with new lifecycle hooks
4. Gradually migrate remaining components to new hooks
5. Remove legacy EmergencyContext.jsx when migration complete

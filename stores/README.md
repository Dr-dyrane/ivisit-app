# Global State Stores

Zustand-based global state stores for cross-cutting concerns.

## Files

- `emergencyTripStore.js` - Trip state: active ambulance trips, bed bookings, pending approvals
- `emergencyTripSelectors.js` - Pure selectors for derived trip state
- `index.js` - Barrel exports

## Design Principles

1. **Separation of Concerns**: Server state, UI flow, and animation state are separate
2. **Pure Selectors**: Derived state computed in pure functions, memoized in React
3. **Event Gates**: Version tracking for realtime event ordering
4. **No Stale Closures**: Use `getState()` for fresh reads at execution time

## Usage

```javascript
import { useEmergencyTripStore } from '../stores';
import { useEmergencyTripRuntime } from '../hooks/emergency';

// In components: use the runtime hook
const { activeAmbulanceTrip } = useEmergencyTripRuntime();

// For fresh reads (avoiding stale closures):
const store = useEmergencyTripStore.getState();
const hasTrip = !!store.activeAmbulanceTrip;
```

## Migration from EmergencyContext

See [docs/architecture/EMERGENCY_STATE_REFACTOR.md](../docs/architecture/EMERGENCY_STATE_REFACTOR.md) for full migration guide.

// stores/emergencyTripStore.js
// PULLBACK NOTE: Phase 1 — Gold Standard State Migration
// OLD: trip state lived in useState inside useEmergencyTripState (in-memory, lost on Metro restart)
// NEW: owned here in Zustand — persisted via database abstraction, survives app kill/Metro restart
// EmergencyContext still wraps this — zero consumer blast radius

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
// PULLBACK NOTE: Phase 1 — use database abstraction, not raw AsyncStorage
// OLD: import AsyncStorage from '@react-native-async-storage/async-storage'
// NEW: import { database, StorageKeys } from '../database'
import { database, StorageKeys } from '../database';
import { normalizeEmergencyState } from '../utils/domainNormalize';
import { areRuntimeStateValuesEqual } from '../utils/emergencyContextHelpers';

// Storage key — reuses same key as useEmergencyTripState for seamless migration
// PULLBACK NOTE: StorageKeys.EMERGENCY_STATE maps to the same key previously used
const STORAGE_KEY = StorageKeys.EMERGENCY_STATE;

// PULLBACK NOTE: Tracking sheet — startedAt preservation invariant.
const getRequestIdentityKeys = (record) => {
  if (!record || typeof record !== "object") return [];
  return [
    record.id,
    record.requestId,
    record.displayId,
    record.display_id,
    record._realId,
    record.bookingId,
    record.request?.id,
    record.request?.display_id,
  ]
    .filter((value) => value != null && value !== "")
    .map((value) => String(value));
};

// Returns a trip-like object (or null) where `startedAt` is preserved from the
// previous value when (a) both refer to the same requestId, and (b) the next
// value's `startedAt` is missing/non-finite. Falls through unchanged otherwise.
// Identifies "same trip" by requestId or id (loose-string compare to absorb
// number/string drift across server payloads).
const sameTripIdentity = (a, b) => {
  const aKeys = getRequestIdentityKeys(a);
  const bKeys = getRequestIdentityKeys(b);
  if (!aKeys.length || !bKeys.length) return false;
  return aKeys.some((key) => bKeys.includes(key));
};

// `startedAt` is an immutable real-world moment for a given trip identity
// (requestId/id). Once it's set, any later writer targeting the same trip
// MUST keep the original value — even when the "new" value is also a finite
// timestamp (e.g. a later `Date.now()` from a rebuilt snapshot). Without this,
// Metro reloads race between hydration and server merges, and a fresh
// `Date.now()` from the query's fallback path ends up replacing the persisted
// start time, visually resetting trip progress.
const hasUsableEtaSeconds = (value) =>
  Number.isFinite(Number(value)) && Number(value) > 0;

const preserveTripTrackingRuntime = (prev, next) => {
  if (!next) return next;
  if (!prev) return next;
  if (!sameTripIdentity(prev, next)) return next;

  const merged = { ...next };

  if (Number.isFinite(prev.startedAt)) {
    merged.startedAt = prev.startedAt;
  }

  if (!hasUsableEtaSeconds(merged.etaSeconds) && hasUsableEtaSeconds(prev.etaSeconds)) {
    merged.etaSeconds = Number(prev.etaSeconds);
  }

  if (!merged.estimatedArrival && prev.estimatedArrival) {
    merged.estimatedArrival = prev.estimatedArrival;
  }

  if (!merged.etaSource && prev.etaSource) {
    merged.etaSource = prev.etaSource;
  }

  if (
    (!Array.isArray(merged.route) || merged.route.length < 2) &&
    Array.isArray(prev.route) &&
    prev.route.length >= 2
  ) {
    merged.route = prev.route;
  }

  return merged;
};

const mergeHydratedTripState = (current, stored) => {
  if (!current) return stored;
  if (!stored) return current;
  if (!sameTripIdentity(current, stored)) return current;
  return preserveTripTrackingRuntime(stored, current);
};

// Trip state shape
const createInitialTripState = () => ({
  activeAmbulanceTrip: null,
  activeBedBooking: null,
  pendingApproval: null,
});

// Event gate for realtime ordering
const createInitialEventGate = () => ({
  ambulance: { requestKey: null, versionMs: 0 },
  bed: { requestKey: null, versionMs: 0 },
});

// Hydration state (outside store for synchronous access)
let hydrationPromise = null;
let isHydrated = false;
const hydrationListeners = new Set();

export const useEmergencyTripStore = create(
  immer((set, get) => ({
    // Core state
    ...createInitialTripState(),
    
    // Event gates for ordering
    eventGates: createInitialEventGate(),
    
    // Loading states
    isSyncing: false,
    lastSyncAt: null,
    hydrated: false,
    
    // CRUD Actions — equality-guarded to match useEmergencyTripState stable setter behaviour
    // PULLBACK NOTE: Phase 1 — added areRuntimeStateValuesEqual guard (same as useEmergencyTripState)
    // PULLBACK NOTE: Tracking sheet — preserve `startedAt` invariant.
    //   Multiple writers (TanStack queryFn, hydration, realtime patches) can replace
    //   the trip object. If the new value targets the SAME requestId but lacks a
    //   finite `startedAt`, the old `startedAt` is kept. This protects against the
    //   cold-start race where the first server fetch arrives before hydration and
    //   reports `startedAt = null` (or a fresh Date.now()) — which would otherwise
    //   reset trip progress on every Metro reload.
    setActiveAmbulanceTrip: (nextValueOrUpdater) => {
      set((state) => {
        const prev = state.activeAmbulanceTrip;
        const raw = typeof nextValueOrUpdater === 'function' ? nextValueOrUpdater(prev) : nextValueOrUpdater;
        const next = preserveTripTrackingRuntime(prev, raw);

        if (!areRuntimeStateValuesEqual(next, prev)) state.activeAmbulanceTrip = next;
      });
    },

    setActiveBedBooking: (nextValueOrUpdater) => {
      set((state) => {
        const prev = state.activeBedBooking;
        const raw = typeof nextValueOrUpdater === 'function' ? nextValueOrUpdater(prev) : nextValueOrUpdater;
        const next = preserveTripTrackingRuntime(prev, raw);
        if (!areRuntimeStateValuesEqual(next, prev)) state.activeBedBooking = next;
      });
    },

    setPendingApproval: (nextValueOrUpdater) => {
      set((state) => {
        const prev = state.pendingApproval;
        const next = typeof nextValueOrUpdater === 'function' ? nextValueOrUpdater(prev) : nextValueOrUpdater;
        if (!areRuntimeStateValuesEqual(next, prev)) state.pendingApproval = next;
      });
    },

    
    // Patch methods (partial updates) — also preserve startedAt invariant.
    patchActiveAmbulanceTrip: (updates) => {
      set((state) => {
        if (!state.activeAmbulanceTrip) return;
        const merged = {
          ...state.activeAmbulanceTrip,
          ...updates,
          assignedAmbulance: updates.assignedAmbulance
            ? { ...state.activeAmbulanceTrip.assignedAmbulance, ...updates.assignedAmbulance }
            : state.activeAmbulanceTrip.assignedAmbulance,
        };
        state.activeAmbulanceTrip = preserveTripTrackingRuntime(state.activeAmbulanceTrip, merged);
      });
    },
    
    patchActiveBedBooking: (updates) => {
      set((state) => {
        if (!state.activeBedBooking) return;
        const merged = { ...state.activeBedBooking, ...updates };
        state.activeBedBooking = preserveTripTrackingRuntime(state.activeBedBooking, merged);
      });
    },
    
    patchPendingApproval: (updates) => {
      set((state) => {
        if (!state.pendingApproval) return;
        state.pendingApproval = { ...state.pendingApproval, ...updates };
      });
    },
    
    // Status setters
    setAmbulanceTripStatus: (status) => {
      set((state) => {
        if (!state.activeAmbulanceTrip) return;
        state.activeAmbulanceTrip.status = status;
      });
    },
    
    setBedBookingStatus: (status) => {
      set((state) => {
        if (!state.activeBedBooking) return;
        state.activeBedBooking.status = status;
      });
    },
    
    // Stop/Clear methods
    stopAmbulanceTrip: () => {
      set((state) => {
        state.activeAmbulanceTrip = null;
        state.eventGates.ambulance = { requestKey: null, versionMs: 0 };
      });
    },
    
    stopBedBooking: () => {
      set((state) => {
        state.activeBedBooking = null;
        state.eventGates.bed = { requestKey: null, versionMs: 0 };
      });
    },
    
    clearPendingApproval: () => {
      set((state) => {
        state.pendingApproval = null;
      });
    },

    // PULLBACK NOTE: UX-D D-1 — atomic transitionPendingToActive action
    // OLD: trip state updated in multiple writes across call-site (setActiveAmbulanceTrip + clearPendingApproval)
    // NEW: single atomic Zustand action — one write, no partial state window
    transitionPendingToActive: (trip) => {
      set((state) => {
        state.activeAmbulanceTrip = preserveTripTrackingRuntime(state.activeAmbulanceTrip, trip);
        state.pendingApproval = null;
      });
    },
    
    
    // Event gate management
    shouldApplyAmbulanceEvent: (record, fallbackMs = Date.now()) => {
      const state = get();
      const trip = state.activeAmbulanceTrip;
      return shouldApplyTripEvent(state.eventGates.ambulance, trip, record, fallbackMs);
    },
    
    shouldApplyBedEvent: (record, fallbackMs = Date.now()) => {
      const state = get();
      const trip = state.activeBedBooking;
      return shouldApplyTripEvent(state.eventGates.bed, trip, record, fallbackMs);
    },
    
    updateAmbulanceEventGate: (nextGate) => {
      set((state) => {
        state.eventGates.ambulance = nextGate;
      });
    },
    
    updateBedEventGate: (nextGate) => {
      set((state) => {
        state.eventGates.bed = nextGate;
      });
    },
    
    // Sync state
    setIsSyncing: (value) => {
      set((state) => {
        state.isSyncing = value;
      });
    },
    
    setLastSyncAt: (timestamp) => {
      set((state) => {
        state.lastSyncAt = timestamp;
      });
    },
    
    // Reset
    resetTripState: () => {
      set((state) => {
        Object.assign(state, createInitialTripState());
        state.eventGates = createInitialEventGate();
      });
    },
    
    // Hydration helper — also routes through preserveTripStartedAt so any
    // legacy server-sync path can't reset the immutable trip start moment.
    hydrateFromServer: (activeAmbulance, activeBed, pending) => {
      set((state) => {
        if (activeAmbulance !== undefined) {
          state.activeAmbulanceTrip = preserveTripTrackingRuntime(state.activeAmbulanceTrip, activeAmbulance);
        }
        if (activeBed !== undefined) {
          state.activeBedBooking = preserveTripTrackingRuntime(state.activeBedBooking, activeBed);
        }
        if (pending !== undefined) state.pendingApproval = pending;
        state.lastSyncAt = Date.now();
      });
    },
    
    // Initialize from storage (called on app boot)
    // PULLBACK NOTE: Phase 1 — database.read replaces AsyncStorage.getItem + JSON.parse
    // OLD: AsyncStorage.getItem(STORAGE_KEY) + JSON.parse
    // NEW: database.read(STORAGE_KEY, null) — normalizeEmergencyState applied on result
    initFromStorage: async () => {
      try {
        const storedState = await database.read(STORAGE_KEY, null);
        if (storedState && typeof storedState === 'object') {
          const normalized = normalizeEmergencyState(storedState);
          set((state) => {
            if (normalized.activeAmbulanceTrip?.requestId) {
              state.activeAmbulanceTrip = mergeHydratedTripState(
                state.activeAmbulanceTrip,
                normalized.activeAmbulanceTrip,
              );
            }
            if (normalized.activeBedBooking?.requestId) {
              state.activeBedBooking = mergeHydratedTripState(
                state.activeBedBooking,
                normalized.activeBedBooking,
              );
            }
            if (normalized.pendingApproval?.requestId && !state.pendingApproval) {
              state.pendingApproval = normalized.pendingApproval;
            }
            if (storedState.eventGates) state.eventGates = storedState.eventGates;
          });
        }
        set((state) => { state.hydrated = true; });
        isHydrated = true;
        hydrationListeners.forEach(cb => cb(true));
      } catch (err) {
        console.warn('[emergencyTripStore] Hydration error:', err);
        set((state) => { state.hydrated = true; });
        isHydrated = true;
        hydrationListeners.forEach(cb => cb(true));
      }
    },

    // Persist to storage (called when state changes)
    // PULLBACK NOTE: Phase 1 — database.write replaces AsyncStorage.setItem + JSON.stringify
    // OLD: AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
    // NEW: database.write(STORAGE_KEY, toStore) — normalizeEmergencyState applied before write
    persistToStorage: async () => {
      try {
        const state = get();
        const toStore = normalizeEmergencyState({
          activeAmbulanceTrip: state.activeAmbulanceTrip,
          activeBedBooking: state.activeBedBooking,
          pendingApproval: state.pendingApproval,
          eventGates: state.eventGates,
        });
        await database.write(STORAGE_KEY, toStore);
      } catch (err) {
        console.warn('[emergencyTripStore] Persistence error:', err);
      }
    },
  }))
);

// Event ordering logic (moved from EmergencyContext)
function shouldApplyTripEvent(gateState, trip, record, fallbackMs) {
  if (!trip || !record) return { apply: false, nextGateState: gateState };
  
  const tripKeys = [trip.id, trip.requestId].filter(Boolean).map(String);
  const recordKeys = [record.id, record.display_id, record.request_id, record.current_call]
    .filter(Boolean).map(String);
  
  if (!tripKeys.length || !recordKeys.length) {
    return { apply: false, nextGateState: gateState };
  }
  
  const matches = recordKeys.some(key => tripKeys.includes(key));
  if (!matches) {
    return { apply: false, nextGateState: gateState };
  }
  
  const requestKey = String(trip.id ?? trip.requestId ?? '');
  if (!requestKey) {
    return { apply: false, nextGateState: gateState };
  }
  
  const recordTs = record.updated_at ?? record.created_at;
  const nextVersionMs = recordTs ? Date.parse(recordTs) : fallbackMs;
  
  if (gateState.requestKey && gateState.requestKey !== requestKey) {
    return { 
      apply: true, 
      nextGateState: { requestKey, versionMs: nextVersionMs } 
    };
  }
  
  if (nextVersionMs < (gateState.versionMs ?? 0)) {
    return { apply: false, nextGateState: gateState };
  }
  
  return { 
    apply: true, 
    nextGateState: { requestKey, versionMs: nextVersionMs } 
  };
}

// Subscribe to state changes and auto-persist.
// PULLBACK NOTE: Tracking sheet — Metro reload progress reset bug fix.
// OLD: `subscribe(selector, listener)` two-arg form requires the
//      `subscribeWithSelector` middleware in Zustand v5. This store only composes
//      `immer`, so the two-arg form silently treated the selector as the listener
//      and dropped the persist callback. Result: activeAmbulanceTrip was NEVER
//      written to storage → every Metro reload restarted progress from zero.
// NEW: single-listener `subscribe(listener)` with manual change detection on the
//      fields we actually persist. Works without extra middleware.
let lastPersistedSnapshot = null;
useEmergencyTripStore.subscribe((state) => {
  if (!isHydrated) return;
  const snapshot = {
    activeAmbulanceTrip: state.activeAmbulanceTrip,
    activeBedBooking: state.activeBedBooking,
    pendingApproval: state.pendingApproval,
    eventGates: state.eventGates,
  };
  if (
    lastPersistedSnapshot &&
    lastPersistedSnapshot.activeAmbulanceTrip === snapshot.activeAmbulanceTrip &&
    lastPersistedSnapshot.activeBedBooking === snapshot.activeBedBooking &&
    lastPersistedSnapshot.pendingApproval === snapshot.pendingApproval &&
    lastPersistedSnapshot.eventGates === snapshot.eventGates
  ) {
    return;
  }
  lastPersistedSnapshot = snapshot;
  database.write(STORAGE_KEY, normalizeEmergencyState(snapshot)).catch((err) => {
    console.warn('[emergencyTripStore] Auto-persist error:', err);
  });
});

/**
 * Hook to check if store is hydrated from storage
 * @returns {boolean} true if hydration complete
 */
export function useStoreHydrated() {
  return useEmergencyTripStore((state) => state.hydrated);
}

/**
 * Check if store is hydrated (synchronous)
 * @returns {boolean} true if hydration complete
 */
export function getIsStoreHydrated() {
  return isHydrated;
}

/**
 * Wait for hydration to complete
 * @returns {Promise<void>} resolves when hydrated
 */
export function waitForHydration() {
  if (isHydrated) return Promise.resolve();
  return new Promise((resolve) => {
    const callback = (hydrated) => {
      if (hydrated) {
        hydrationListeners.delete(callback);
        resolve();
      }
    };
    hydrationListeners.add(callback);
  });
}

export default useEmergencyTripStore;

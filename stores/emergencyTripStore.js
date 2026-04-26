import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Trip state shape
const createInitialTripState = () => ({
  activeAmbulanceTrip: null,
  activeBedBooking: null,
  pendingApproval: null,
  commitFlow: null,
});

// Event gate for realtime ordering
const createInitialEventGate = () => ({
  ambulance: { requestKey: null, versionMs: 0 },
  bed: { requestKey: null, versionMs: 0 },
});

// Storage key for emergency trip state
const STORAGE_KEY = 'emergency_trip_state';

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
    
    // CRUD Actions
    setActiveAmbulanceTrip: (trip) => {
      set((state) => {
        state.activeAmbulanceTrip = trip;
      });
    },
    
    setActiveBedBooking: (booking) => {
      set((state) => {
        state.activeBedBooking = booking;
      });
    },
    
    setPendingApproval: (pending) => {
      set((state) => {
        state.pendingApproval = pending;
      });
    },
    
    setCommitFlow: (flow) => {
      set((state) => {
        state.commitFlow = flow;
      });
    },
    
    // Patch methods (partial updates)
    patchActiveAmbulanceTrip: (updates) => {
      set((state) => {
        if (!state.activeAmbulanceTrip) return;
        state.activeAmbulanceTrip = {
          ...state.activeAmbulanceTrip,
          ...updates,
          assignedAmbulance: updates.assignedAmbulance
            ? { ...state.activeAmbulanceTrip.assignedAmbulance, ...updates.assignedAmbulance }
            : state.activeAmbulanceTrip.assignedAmbulance,
        };
      });
    },
    
    patchActiveBedBooking: (updates) => {
      set((state) => {
        if (!state.activeBedBooking) return;
        state.activeBedBooking = { ...state.activeBedBooking, ...updates };
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
    
    clearCommitFlow: () => {
      set((state) => {
        state.commitFlow = null;
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
    
    // Hydration helper
    hydrateFromServer: (activeAmbulance, activeBed, pending) => {
      set((state) => {
        if (activeAmbulance !== undefined) state.activeAmbulanceTrip = activeAmbulance;
        if (activeBed !== undefined) state.activeBedBooking = activeBed;
        if (pending !== undefined) state.pendingApproval = pending;
        state.lastSyncAt = Date.now();
      });
    },
    
    // Initialize from storage (called on app boot)
    initFromStorage: async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          set((state) => {
            if (parsed.activeAmbulanceTrip !== undefined) {
              state.activeAmbulanceTrip = parsed.activeAmbulanceTrip;
            }
            if (parsed.activeBedBooking !== undefined) {
              state.activeBedBooking = parsed.activeBedBooking;
            }
            if (parsed.pendingApproval !== undefined) {
              state.pendingApproval = parsed.pendingApproval;
            }
            if (parsed.eventGates) {
              state.eventGates = parsed.eventGates;
            }
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
    persistToStorage: async () => {
      try {
        const state = get();
        const toStore = {
          activeAmbulanceTrip: state.activeAmbulanceTrip,
          activeBedBooking: state.activeBedBooking,
          pendingApproval: state.pendingApproval,
          eventGates: state.eventGates,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
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

// Subscribe to state changes and persist to storage
useEmergencyTripStore.subscribe(
  (state) => ({
    activeAmbulanceTrip: state.activeAmbulanceTrip,
    activeBedBooking: state.activeBedBooking,
    pendingApproval: state.pendingApproval,
    eventGates: state.eventGates,
  }),
  (persistedState) => {
    // Only persist if hydrated (avoid persisting initial empty state)
    if (isHydrated) {
      try {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
      } catch (err) {
        console.warn('[emergencyTripStore] Auto-persist error:', err);
      }
    }
  }
);

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

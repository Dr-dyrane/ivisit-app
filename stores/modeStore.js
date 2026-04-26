// stores/modeStore.js
// PULLBACK NOTE: Phase 6a — Gold Standard State Migration
// OLD: mode/serviceType/viewMode/selectedSpecialty lived in EmergencyContext (context-wide re-renders)
// NEW: owned here in Zustand — surgical selectors, scoped re-renders only
// EmergencyContext adapter will wrap this — zero consumer blast radius during migration

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { database, StorageKeys } from '../database';

const STORAGE_KEY = StorageKeys.MODE_PREFERENCES; // Uses database abstraction

// Initial state shape
const createInitialState = () => ({
  mode: 'emergency', // 'emergency' | 'booking'
  serviceType: null, // null | 'premium' | 'standard'
  viewMode: 'map', // 'map' | 'list'
  selectedSpecialty: null, // null | string
});

// Hydration state (outside store for sync access)
let hydrationPromise = null;
let isHydrated = false;

export const useModeStore = create(
  immer((set, get) => ({
    // Core state
    ...createInitialState(),
    hydrated: false,

    // Actions — equality-guarded to prevent unnecessary re-renders
    setMode: (nextMode) => {
      set((state) => {
        if (state.mode !== nextMode) state.mode = nextMode;
      });
    },

    setServiceType: (nextServiceType) => {
      set((state) => {
        if (state.serviceType !== nextServiceType) state.serviceType = nextServiceType;
      });
    },

    setViewMode: (nextViewMode) => {
      set((state) => {
        if (state.viewMode !== nextViewMode) state.viewMode = nextViewMode;
      });
    },

    setSelectedSpecialty: (nextSpecialty) => {
      set((state) => {
        if (state.selectedSpecialty !== nextSpecialty) state.selectedSpecialty = nextSpecialty;
      });
    },

    // Batch update for filter resets
    resetFilters: () => {
      set((state) => {
        state.serviceType = null;
        state.selectedSpecialty = null;
        state.viewMode = 'map';
      });
    },

    // Toggle helpers
    toggleMode: () => {
      set((state) => {
        state.mode = state.mode === 'emergency' ? 'booking' : 'emergency';
      });
    },

    toggleViewMode: () => {
      set((state) => {
        state.viewMode = state.viewMode === 'map' ? 'list' : 'map';
      });
    },

    // Hydration — restore from persistence
    hydrate: async () => {
      if (hydrationPromise) return hydrationPromise;

      hydrationPromise = database.get(STORAGE_KEY).then((saved) => {
        if (saved) {
          set((state) => {
            state.mode = saved.mode ?? state.mode;
            state.serviceType = saved.serviceType ?? state.serviceType;
            state.viewMode = saved.viewMode ?? state.viewMode;
            state.selectedSpecialty = saved.selectedSpecialty ?? state.selectedSpecialty;
          });
        }
        set((state) => {
          state.hydrated = true;
        });
        isHydrated = true;
      });

      return hydrationPromise;
    },
  }))
);

// Persistence subscription — only persist fields that should survive app restart
useModeStore.subscribe((state) => {
  if (!state.hydrated) return; // Don't persist during hydration
  database.set(STORAGE_KEY, {
    mode: state.mode,
    // serviceType, viewMode, selectedSpecialty are ephemeral — don't persist
  });
});

// Hydration helper for app startup
export const hydrateModeStore = () => {
  const store = useModeStore.getState();
  return store.hydrate();
};

// Synchronous hydration check
export const isModeStoreHydrated = () => isHydrated;

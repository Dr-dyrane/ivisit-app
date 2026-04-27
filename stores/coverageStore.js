// stores/coverageStore.js
// PULLBACK NOTE: Phase 6b — Gold Standard State Migration
// OLD: coverageModePreference, demoOwnerSlug, effectiveCoverageMode lived in EmergencyContext
//      via useCoverageMode() hook (useState-based, re-rendered all useEmergency() consumers)
// NEW: owned here in Zustand — surgical selectors, scoped re-renders only
// Stash audit: stash useCoverageMode.js used useState — pattern rejected, Zustand adopted instead

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { database, StorageKeys } from '../database';

const STORAGE_KEY = StorageKeys.COVERAGE_PREFERENCES;

const createInitialState = () => ({
  coverageModePreference: null, // null | 'demo' | 'live' — user's stored preference
  demoOwnerSlug: '',            // provisioning slug for demo ecosystem
  coverageModeOperation: {      // in-flight operation state
    isPending: false,
    targetMode: null,
  },
  forceDemoFetch: false,        // trigger flag for force-refresh demo data
});

let hydrationPromise = null;
let isHydrated = false;

export const useCoverageStore = create(
  immer((set) => ({
    ...createInitialState(),
    hydrated: false,

    // Actions — equality-guarded
    setCoverageModePreference: (nextMode) => {
      set((state) => {
        if (state.coverageModePreference !== nextMode) {
          state.coverageModePreference = nextMode;
        }
      });
    },

    setDemoOwnerSlug: (nextSlug) => {
      set((state) => {
        if (state.demoOwnerSlug !== nextSlug) {
          state.demoOwnerSlug = nextSlug;
        }
      });
    },

    setCoverageModeOperation: (operation) => {
      set((state) => {
        state.coverageModeOperation = operation;
      });
    },

    setForceDemoFetch: (value) => {
      set((state) => {
        state.forceDemoFetch = value;
      });
    },

    triggerForceDemoFetch: () => {
      set((state) => {
        state.forceDemoFetch = true;
      });
    },

    clearCoverageModeOperation: () => {
      set((state) => {
        state.coverageModeOperation = { isPending: false, targetMode: null };
      });
    },

    // Hydration — restore from persistence
    hydrate: async () => {
      if (hydrationPromise) return hydrationPromise;

      hydrationPromise = database.read(STORAGE_KEY).then((saved) => {
        if (saved) {
          set((state) => {
            state.coverageModePreference = saved.coverageModePreference ?? state.coverageModePreference;
            state.demoOwnerSlug = saved.demoOwnerSlug ?? state.demoOwnerSlug;
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

// Persistence — only persist preference + slug, not ephemeral operation state
useCoverageStore.subscribe((state) => {
  if (!state.hydrated) return;
  database.write(STORAGE_KEY, {
    coverageModePreference: state.coverageModePreference,
    demoOwnerSlug: state.demoOwnerSlug,
  });
});

export const hydrateCoverageStore = () => {
  const store = useCoverageStore.getState();
  return store.hydrate();
};

export const isCoverageStoreHydrated = () => isHydrated;

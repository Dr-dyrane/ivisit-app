// stores/locationStore.js
// PULLBACK NOTE: Phase 6b — Gold Standard State Migration
// OLD: userLocation lived in EmergencyContext (useState, broadcast on every change to all consumers)
//      useEmergencyLocationSync.js watched activeAmbulanceTrip and called setUserLocation callback
// NEW: owned here in Zustand — surgical selectors, GPS sync writes directly to store
// Stash audit: stash useEmergencyLocationSync.js had solid GPS/server sync logic — pattern adopted
//              but wired to store.setUserLocation instead of useState setter callback

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { database, StorageKeys } from '../database';

const STORAGE_KEY = StorageKeys.LOCATION_CACHE;

const createInitialState = () => ({
  userLocation: null,           // { latitude, longitude } | null — last known position
  locationPermission: null,     // 'granted' | 'denied' | 'undetermined' | null
  isTrackingLocation: false,    // true while GPS watchPosition is active
});

let hydrationPromise = null;
let isHydrated = false;

export const useLocationStore = create(
  immer((set) => ({
    ...createInitialState(),
    hydrated: false,

    // Actions — equality-guarded
    setUserLocation: (nextLocation) => {
      set((state) => {
        const prev = state.userLocation;
        const changed =
          !prev ||
          prev.latitude !== nextLocation?.latitude ||
          prev.longitude !== nextLocation?.longitude;
        if (changed) state.userLocation = nextLocation;
      });
    },

    patchUserLocation: (patch) => {
      set((state) => {
        if (!state.userLocation) {
          state.userLocation = patch;
        } else {
          Object.assign(state.userLocation, patch);
        }
      });
    },

    setLocationPermission: (nextPermission) => {
      set((state) => {
        if (state.locationPermission !== nextPermission) {
          state.locationPermission = nextPermission;
        }
      });
    },

    setIsTrackingLocation: (value) => {
      set((state) => {
        state.isTrackingLocation = value;
      });
    },

    clearUserLocation: () => {
      set((state) => {
        state.userLocation = null;
        state.isTrackingLocation = false;
      });
    },

    // Hydration — restore last known location from persistence
    hydrate: async () => {
      if (hydrationPromise) return hydrationPromise;

      hydrationPromise = database.get(STORAGE_KEY).then((saved) => {
        if (saved) {
          set((state) => {
            state.userLocation = saved.userLocation ?? state.userLocation;
            state.locationPermission = saved.locationPermission ?? state.locationPermission;
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

// Persistence — persist last known location + permission (not tracking flag)
useLocationStore.subscribe((state) => {
  if (!state.hydrated) return;
  database.set(STORAGE_KEY, {
    userLocation: state.userLocation,
    locationPermission: state.locationPermission,
  });
});

export const hydrateLocationStore = () => {
  const store = useLocationStore.getState();
  return store.hydrate();
};

export const isLocationStoreHydrated = () => isHydrated;

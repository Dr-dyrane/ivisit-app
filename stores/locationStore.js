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
    // PULLBACK NOTE: Phase 6d follow-up — coordinate-validity guard
    // OLD: accepted any object as nextLocation; partial/empty objects masked downstream sources
    // NEW: only accept objects with finite latitude/longitude; otherwise store null
    setUserLocation: (nextLocation) => {
      set((state) => {
        const lat = Number(nextLocation?.latitude);
        const lng = Number(nextLocation?.longitude);
        const isValid =
          nextLocation && Number.isFinite(lat) && Number.isFinite(lng);
        const normalized = isValid ? nextLocation : null;
        const prev = state.userLocation;
        const changed =
          (!prev && normalized) ||
          (prev && !normalized) ||
          (prev && normalized &&
            (prev.latitude !== normalized.latitude ||
              prev.longitude !== normalized.longitude));
        if (changed) state.userLocation = normalized;
      });
    },

    patchUserLocation: (patch) => {
      set((state) => {
        if (!state.userLocation) {
          // Only seed from a patch that has valid coordinates; otherwise keep null.
          const lat = Number(patch?.latitude);
          const lng = Number(patch?.longitude);
          if (patch && Number.isFinite(lat) && Number.isFinite(lng)) {
            state.userLocation = patch;
          }
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

      hydrationPromise = database.read(STORAGE_KEY).then((saved) => {
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
  database.write(STORAGE_KEY, {
    userLocation: state.userLocation,
    locationPermission: state.locationPermission,
  });
});

export const hydrateLocationStore = () => {
  const store = useLocationStore.getState();
  return store.hydrate();
};

export const isLocationStoreHydrated = () => isHydrated;

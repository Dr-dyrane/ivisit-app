// stores/locationStore.js
// PULLBACK NOTE: Phase 6b - Gold Standard State Migration
// OLD: userLocation lived in EmergencyContext (useState, broadcast on every change to all consumers)
//      useEmergencyLocationSync.js watched activeAmbulanceTrip and called setUserLocation callback
// NEW: owned here in Zustand - surgical selectors, GPS sync writes directly to store
// Stash audit: stash useEmergencyLocationSync.js had solid GPS/server sync logic - pattern adopted
//              but wired to store.setUserLocation instead of useState setter callback

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { database, StorageKeys } from "../database";

const STORAGE_KEY = StorageKeys.LOCATION_CACHE;

const createInitialState = () => ({
  userLocation: null,
  userLocationSource: null,
  locationPermission: null,
  isTrackingLocation: false,
});

let hydrationPromise = null;
let isHydrated = false;

export const useLocationStore = create(
  immer((set) => ({
    ...createInitialState(),
    hydrated: false,

    setUserLocation: (nextLocation, nextSource = null) => {
      set((state) => {
        const lat = Number(nextLocation?.latitude);
        const lng = Number(nextLocation?.longitude);
        const isValid =
          nextLocation && Number.isFinite(lat) && Number.isFinite(lng);
        const normalized = isValid ? nextLocation : null;
        const prev = state.userLocation;
        const resolvedSource =
          typeof nextSource === "string" && nextSource.trim().length > 0
            ? nextSource.trim()
            : normalized
              ? state.userLocationSource || "persisted"
              : null;
        const changed =
          (!prev && normalized) ||
          (prev && !normalized) ||
          (prev &&
            normalized &&
            (prev.latitude !== normalized.latitude ||
              prev.longitude !== normalized.longitude));

        if (changed) {
          state.userLocation = normalized;
        }
        if (state.userLocationSource !== resolvedSource) {
          state.userLocationSource = resolvedSource;
        }
      });
    },

    patchUserLocation: (patch) => {
      set((state) => {
        if (!state.userLocation) {
          const lat = Number(patch?.latitude);
          const lng = Number(patch?.longitude);
          if (patch && Number.isFinite(lat) && Number.isFinite(lng)) {
            state.userLocation = patch;
            state.userLocationSource = state.userLocationSource || "persisted";
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
        state.userLocationSource = null;
        state.isTrackingLocation = false;
      });
    },

    hydrate: async () => {
      if (hydrationPromise) return hydrationPromise;

      hydrationPromise = database.read(STORAGE_KEY).then((saved) => {
        if (saved) {
          const hydratedLocation = saved.userLocation ?? null;
          const hydratedSource =
            saved.userLocationSource === "manual"
              ? "manual"
              : hydratedLocation
                ? "persisted"
                : null;
          set((state) => {
            state.userLocation = hydratedLocation ?? state.userLocation;
            state.userLocationSource =
              hydratedSource ?? state.userLocationSource;
            state.locationPermission =
              saved.locationPermission ?? state.locationPermission;
          });
        }
        set((state) => {
          state.hydrated = true;
        });
        isHydrated = true;
      });

      return hydrationPromise;
    },
  })),
);

useLocationStore.subscribe((state) => {
  if (!state.hydrated) return;
  database.write(STORAGE_KEY, {
    userLocation: state.userLocation,
    userLocationSource: state.userLocationSource,
    locationPermission: state.locationPermission,
  });
});

export const hydrateLocationStore = () => {
  const store = useLocationStore.getState();
  return store.hydrate();
};

export const isLocationStoreHydrated = () => isHydrated;

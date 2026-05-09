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
import { isAddressValid, calculateAddressQuality } from "../utils/addressQualityValidator";

const STORAGE_KEY = StorageKeys.LOCATION_CACHE;

const createInitialState = () => ({
  userLocation: null,
  userLocationSource: null,
  locationPermission: null,
  isTrackingLocation: false,
  savedLocations: [],
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

    // Saved locations CRUD
    setSavedLocations: (locations) => {
      set((state) => {
        state.savedLocations = Array.isArray(locations) ? locations : [];
      });
    },

    addSavedLocation: (location) => {
      set((state) => {
        const newLocation = {
          id: location?.id || `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          label: location?.label || 'other',
          address: location?.address || '',
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          countryCode: location?.countryCode || null,
          createdAt: location?.createdAt || Date.now(),
        };

        // Validate address quality before saving
        const quality = calculateAddressQuality(newLocation.address);
        if (!quality.isValid) {
          console.warn(
            `[LocationStore] Low quality address rejected: "${newLocation.address}"`,
            `Score: ${quality.score}, Issues: ${quality.issues.join(', ')}`
          );
          // Don't save low-quality addresses
          return;
        }

        // Prevent duplicates by address
        const exists = state.savedLocations.some(
          (loc) => loc.address?.toLowerCase() === newLocation.address?.toLowerCase()
        );
        if (!exists) {
          state.savedLocations = [newLocation, ...state.savedLocations].slice(0, 20); // Max 20 saved locations
        }
      });
    },

    removeSavedLocation: (id) => {
      set((state) => {
        state.savedLocations = state.savedLocations.filter((loc) => loc.id !== id);
      });
    },

    updateSavedLocation: (id, patch) => {
      set((state) => {
        const index = state.savedLocations.findIndex((loc) => loc.id === id);
        if (index !== -1) {
          Object.assign(state.savedLocations[index], patch);
        }
      });
    },

    clearSavedLocations: () => {
      set((state) => {
        state.savedLocations = [];
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
          const hydratedSavedLocations = Array.isArray(saved.savedLocations)
            ? saved.savedLocations
            : [];
          set((state) => {
            state.userLocation = hydratedLocation ?? state.userLocation;
            state.userLocationSource =
              hydratedSource ?? state.userLocationSource;
            state.locationPermission =
              saved.locationPermission ?? state.locationPermission;
            state.savedLocations = hydratedSavedLocations;
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
    savedLocations: state.savedLocations,
  });
});

export const hydrateLocationStore = () => {
  const store = useLocationStore.getState();
  return store.hydrate();
};

export const isLocationStoreHydrated = () => isHydrated;

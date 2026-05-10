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
import {
	getSavedAddressKey,
	isSameSavedAddress,
	normalizeSavedAddress,
} from "../services/locationAddressService";

const STORAGE_KEY = StorageKeys.LOCATION_CACHE;
const MAX_SAVED_LOCATIONS = 20;

const normalizeSavedLocationList = (locations, options = {}) =>
	(Array.isArray(locations) ? locations : [])
		.map((location) => normalizeSavedAddress(location, options))
		.filter(Boolean)
		.slice(0, MAX_SAVED_LOCATIONS);

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
    setSavedLocations: (locations, options = {}) => {
      set((state) => {
        state.savedLocations = normalizeSavedLocationList(locations, options);
      });
    },

    addSavedLocation: (location, options = {}) => {
      let result = { status: "invalid", location: null };
      set((state) => {
        const newLocation = normalizeSavedAddress(location, options);
        if (!newLocation) {
          result = { status: "invalid", location: null };
          return;
        }

        if (!newLocation.quality?.isValid) {
          console.warn(
            `[LocationStore] Low quality address rejected: "${newLocation.address}"`,
            `Score: ${newLocation.quality?.score}, Issues: ${(newLocation.quality?.issues || []).join(', ')}`
          );
          result = { status: "invalid", location: newLocation };
          return;
        }

        const existingIndex = state.savedLocations.findIndex((loc) => {
          const existingKey = getSavedAddressKey(loc);
          const nextKey = getSavedAddressKey(newLocation);
          if (existingKey && nextKey && existingKey === nextKey) return true;
          return isSameSavedAddress(loc, newLocation);
        });

        if (existingIndex !== -1) {
          // Rollback note: Home/Work and same-coordinate saves update in place.
          // This keeps the sheet decision tree deterministic and avoids duplicate
          // saved places after search/manual flows retry the same candidate.
          const existing = state.savedLocations[existingIndex];
          const merged = normalizeSavedAddress({
            ...existing,
            ...newLocation,
            id: existing.id,
            createdAt: existing.createdAt,
            usage: existing.usage,
            sync: {
              ...(existing.sync || {}),
              status: existing.sync?.status === "synced" ? "pendingUpdate" : existing.sync?.status || "local",
            },
            updatedAt: Date.now(),
          }, options);
          state.savedLocations[existingIndex] = merged;
          result = { status: "updated", location: merged };
          return;
        }

        const nextLocation = normalizeSavedAddress({
          ...newLocation,
          sync: {
            ...(newLocation.sync || {}),
            status: newLocation.sync?.status || "pendingCreate",
          },
        }, options);

        state.savedLocations = [nextLocation, ...state.savedLocations]
          .map((item) => normalizeSavedAddress(item, options))
          .filter(Boolean)
          .slice(0, MAX_SAVED_LOCATIONS);
        result = { status: "created", location: nextLocation };
      });
      return result;
    },

    findSavedLocationByCategory: (category) => {
      const key = String(category || "").trim().toLowerCase();
      return useLocationStore
        .getState()
        .savedLocations.find(
          (location) =>
            String(location?.category || location?.label || "").trim().toLowerCase() === key,
        );
    },

    removeSavedLocation: (id) => {
      set((state) => {
        state.savedLocations = state.savedLocations.filter((loc) => loc.id !== id);
      });
    },

    updateSavedLocation: (id, patch, options = {}) => {
      let result = { status: "missing", location: null };
      set((state) => {
        const index = state.savedLocations.findIndex((loc) => loc.id === id);
        if (index !== -1) {
          const existing = state.savedLocations[index];
          const normalized = normalizeSavedAddress({
            ...existing,
            ...patch,
            id: existing.id,
            createdAt: existing.createdAt,
            updatedAt: Date.now(),
            sync: {
              ...(existing.sync || {}),
              ...(patch?.sync || {}),
              status:
                patch?.sync?.status ||
                (existing.sync?.status === "synced"
                  ? "pendingUpdate"
                  : existing.sync?.status || "local"),
            },
          }, options);
          if (normalized) {
            state.savedLocations[index] = normalized;
            result = { status: "updated", location: normalized };
          } else {
            result = { status: "invalid", location: null };
          }
        }
      });
      return result;
    },

    setSavedAddressSyncStatus: (id, syncPatch = {}) => {
      set((state) => {
        const index = state.savedLocations.findIndex((loc) => loc.id === id);
        if (index !== -1) {
          state.savedLocations[index].sync = {
            ...(state.savedLocations[index].sync || {}),
            ...syncPatch,
          };
          state.savedLocations[index].updatedAt = Date.now();
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
            state.savedLocations = normalizeSavedLocationList(hydratedSavedLocations);
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

export const selectSavedLocations = (state) => state.savedLocations || [];

export const selectSavedHomeLocation = (state) =>
	(state.savedLocations || []).find((location) => getSavedAddressKey(location) === "home") || null;

export const selectSavedWorkLocation = (state) =>
	(state.savedLocations || []).find((location) => getSavedAddressKey(location) === "work") || null;

export const selectSavedLocationsByCategory = (category) => (state) =>
	(state.savedLocations || []).filter(
		(location) =>
			String(location?.category || location?.label || "").trim().toLowerCase() ===
			String(category || "").trim().toLowerCase(),
	);

export const selectRecentAddressCandidates = (state) =>
	(state.savedLocations || []).filter(
		(location) => !["home", "work"].includes(getSavedAddressKey(location)),
	);

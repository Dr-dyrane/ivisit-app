// stores/lastHospitalStore.js
// PULLBACK NOTE: Issue-3 fix — hospital load lag on app reload
// OLD: selectedHospitalId + hospital data only in Jotai/TanStack memory — lost on JS engine kill
//      Sequence on reload: location resolves → query fires (network, 500-1500ms) → hospitals arrive
//      → auto-select → camera focus. During that window map shows just user dot, blank hospital state.
// NEW: persist last selected hospital (id + object snapshot + locationKey) to AsyncStorage.
//      On reload: immediately seed selectedHospitalId + featuredHospital from cache while query loads.
//      locationKey (3dp bucket) guards stale data — if user moved >~111m, discard cache.
//      When TanStack query resolves, normal hospital sync takes over seamlessly.

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { database, StorageKeys } from "../database";

const STORAGE_KEY = StorageKeys.LAST_HOSPITAL_CACHE;

const createInitialState = () => ({
  hospitalId: null,
  hospital: null,
  locationKey: null, // `${lat.toFixed(3)}:${lng.toFixed(3)}` — same 3dp bucket as useEmergencyHospitalsQuery
});

let hydrationPromise = null;
let isHydrated = false;

export const useLastHospitalStore = create(
  immer((set, get) => ({
    ...createInitialState(),
    hydrated: false,

    setLastHospital: (hospital, locationKey) => {
      if (!hospital?.id || !locationKey) return;
      set((state) => {
        state.hospitalId = hospital.id;
        state.hospital = hospital;
        state.locationKey = locationKey;
        state.hydrated = true;
      });
      database
        .write(STORAGE_KEY, {
          hospitalId: hospital.id,
          hospital,
          locationKey,
        })
        .catch(() => {});
    },

    clearLastHospital: () => {
      set((state) => {
        state.hospitalId = null;
        state.hospital = null;
        state.locationKey = null;
      });
      database.write(STORAGE_KEY, createInitialState()).catch(() => {});
    },

    _setHydrated: (data) => {
      set((state) => {
        state.hospitalId = data?.hospitalId ?? null;
        state.hospital = data?.hospital ?? null;
        state.locationKey = data?.locationKey ?? null;
        state.hydrated = true;
      });
    },
  })),
);

export async function hydrateLastHospitalStore() {
  if (isHydrated) return;
  if (hydrationPromise) return hydrationPromise;
  hydrationPromise = (async () => {
    try {
      const saved = await database.read(STORAGE_KEY);
      if (saved?.hospitalId) {
        useLastHospitalStore.getState()._setHydrated(saved);
      } else {
        useLastHospitalStore.getState()._setHydrated({});
      }
    } catch {
      useLastHospitalStore.getState()._setHydrated({});
    } finally {
      isHydrated = true;
    }
  })();
  return hydrationPromise;
}

export function isLastHospitalStoreHydrated() {
  return isHydrated;
}

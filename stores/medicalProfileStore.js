import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { database, StorageKeys } from "../database";
import {
  DEFAULT_MEDICAL_PROFILE,
  normalizeMedicalProfile,
} from "../services/medicalProfileService";

// PULLBACK NOTE: Medical profile five-layer pass - Layer 3 persisted snapshot.
// Owns: cross-surface medical profile cache and lifecycle metadata.

const STORAGE_KEY = StorageKeys.MEDICAL_PROFILE_CACHE;

const createInitialState = () => ({
  ownerUserId: null,
  profile: { ...DEFAULT_MEDICAL_PROFILE },
  hydrated: false,
  lastSyncAt: null,
  lastMutationAt: null,
  lifecycleState: "bootstrapping",
  lifecycleError: null,
  isSyncing: false,
  isReady: false,
  mutationCount: 0,
  retryRequestCount: 0,
});

const normalizeSnapshot = (snapshot = {}) => ({
  ownerUserId: snapshot?.ownerUserId ? String(snapshot.ownerUserId) : null,
  profile: normalizeMedicalProfile(snapshot?.profile),
  lastSyncAt: snapshot?.lastSyncAt ? String(snapshot.lastSyncAt) : null,
  lastMutationAt: snapshot?.lastMutationAt
    ? String(snapshot.lastMutationAt)
    : null,
});

let hydrationPromise = null;
let isHydrated = false;

export const useMedicalProfileStore = create(
  immer((set, get) => ({
    ...createInitialState(),

    hydrateFromLocalSnapshot: (snapshot = {}, ownerUserId = null) => {
      const normalized = normalizeSnapshot({
        ...snapshot,
        ownerUserId: ownerUserId ?? snapshot?.ownerUserId ?? null,
      });

      set((state) => {
        state.ownerUserId = normalized.ownerUserId;
        state.profile = normalized.profile;
        state.lastSyncAt = normalized.lastSyncAt;
        state.lastMutationAt = normalized.lastMutationAt;
      });
    },

    hydrateFromServer: (profile = {}, ownerUserId = null) => {
      set((state) => {
        state.ownerUserId = ownerUserId
          ? String(ownerUserId)
          : state.ownerUserId;
        state.profile = normalizeMedicalProfile(profile);
        state.lastSyncAt = new Date().toISOString();
      });
    },

    setLifecycleStatus: (status = {}) => {
      set((state) => {
        state.lifecycleState =
          typeof status?.lifecycleState === "string"
            ? status.lifecycleState
            : state.lifecycleState;
        state.lifecycleError =
          status?.lifecycleError != null
            ? String(status.lifecycleError)
            : status?.lifecycleError === null
              ? null
              : state.lifecycleError;
        state.isSyncing = status?.isSyncing === true;
        state.isReady = status?.isReady === true;
      });
    },

    incrementMutationCount: () => {
      set((state) => {
        state.mutationCount += 1;
      });
    },

    decrementMutationCount: () => {
      set((state) => {
        state.mutationCount = Math.max(0, state.mutationCount - 1);
      });
    },

    requestMedicalProfileRetry: () => {
      set((state) => {
        state.retryRequestCount += 1;
      });
    },

    markHydrated: (ownerUserId = null) => {
      set((state) => {
        state.hydrated = true;
        if (ownerUserId !== null) {
          state.ownerUserId = String(ownerUserId);
        }
      });
      isHydrated = true;
    },

    resetMedicalProfileState: (ownerUserId = null) => {
      set((state) => {
        Object.assign(state, createInitialState());
        state.hydrated = true;
        state.ownerUserId = ownerUserId ? String(ownerUserId) : null;
      });
      isHydrated = true;
    },

    initFromStorage: async () => {
      if (hydrationPromise) return hydrationPromise;

      hydrationPromise = Promise.all([
        database.read(STORAGE_KEY, null),
        database.read(StorageKeys.MEDICAL_PROFILE, null),
      ])
        .then(([snapshot, legacyProfile]) => {
          if (snapshot && typeof snapshot === "object") {
            get().hydrateFromLocalSnapshot(
              snapshot,
              snapshot?.ownerUserId ?? null,
            );
            get().markHydrated(snapshot?.ownerUserId ?? null);
            return;
          }

          if (legacyProfile && typeof legacyProfile === "object") {
            get().hydrateFromLocalSnapshot({ profile: legacyProfile }, null);
          }

          get().markHydrated(null);
        })
        .catch(() => {
          get().markHydrated(null);
        });

      return hydrationPromise;
    },
  })),
);

useMedicalProfileStore.subscribe((state) => {
  if (!state.hydrated) return;

  database.write(STORAGE_KEY, normalizeSnapshot(state)).catch((error) => {
    console.warn("[medicalProfileStore] Persistence error:", error);
  });
});

export const hydrateMedicalProfileStore = () =>
  useMedicalProfileStore.getState().initFromStorage();

export const isMedicalProfileStoreHydrated = () => isHydrated;

export default useMedicalProfileStore;

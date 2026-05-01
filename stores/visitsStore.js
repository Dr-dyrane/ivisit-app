import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { database, StorageKeys } from "../database";
import { normalizeVisitsList } from "../utils/domainNormalize";

// PULLBACK NOTE: Visits five-layer pass - Layer 3 persisted cross-surface snapshot.
// Owns: canonical visit cache, hydration, and lifecycle metadata shared across map,
// notifications, search, booking, and tracking surfaces.
// Does NOT own: query cadence or mutation legality; Query + XState remain upstream.

const STORAGE_KEY = StorageKeys.VISITS_CACHE;

const createInitialState = () => ({
  ownerUserId: null,
  visits: [],
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
  visits: normalizeVisitsList(snapshot?.visits),
  lastSyncAt: snapshot?.lastSyncAt ? String(snapshot.lastSyncAt) : null,
  lastMutationAt: snapshot?.lastMutationAt
    ? String(snapshot.lastMutationAt)
    : null,
});

let hydrationPromise = null;
let isHydrated = false;

export const useVisitsStore = create(
  immer((set, get) => ({
    ...createInitialState(),

    hydrateFromLocalSnapshot: (snapshot = {}, ownerUserId = null) => {
      const normalized = normalizeSnapshot({
        ...snapshot,
        ownerUserId: ownerUserId ?? snapshot?.ownerUserId ?? null,
      });

      set((state) => {
        state.ownerUserId = normalized.ownerUserId;
        state.visits = normalized.visits;
        state.lastSyncAt = normalized.lastSyncAt;
        state.lastMutationAt = normalized.lastMutationAt;
      });
    },

    hydrateFromServer: (visits = [], ownerUserId = null) => {
      set((state) => {
        state.ownerUserId = ownerUserId
          ? String(ownerUserId)
          : state.ownerUserId;
        state.visits = normalizeVisitsList(visits);
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

    requestVisitsRetry: () => {
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

    resetVisitsState: (ownerUserId = null) => {
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
        database.read(StorageKeys.VISITS, null),
      ])
        .then(([snapshot, legacyVisits]) => {
          if (snapshot && typeof snapshot === "object") {
            get().hydrateFromLocalSnapshot(
              snapshot,
              snapshot?.ownerUserId ?? null,
            );
            get().markHydrated(snapshot?.ownerUserId ?? null);
            return;
          }

          if (Array.isArray(legacyVisits)) {
            get().hydrateFromLocalSnapshot({ visits: legacyVisits }, null);
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

useVisitsStore.subscribe((state) => {
  if (!state.hydrated) return;

  database.write(STORAGE_KEY, normalizeSnapshot(state)).catch((error) => {
    console.warn("[visitsStore] Persistence error:", error);
  });
});

export const hydrateVisitsStore = () =>
  useVisitsStore.getState().initFromStorage();

export const isVisitsStoreHydrated = () => isHydrated;

export default useVisitsStore;

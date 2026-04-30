import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { database, StorageKeys } from "../database";
import { normalizeNotificationsList } from "../utils/domainNormalize";

// PULLBACK NOTE: Notifications five-layer pass - Layer 3 persisted runtime snapshot.
// Owns: cross-surface notification cache, hydration, and lifecycle/mutation metadata.
// Does NOT own: server fetch cadence or write legality; Query + XState remain upstream.

const STORAGE_KEY = StorageKeys.NOTIFICATIONS_CACHE;

const createInitialState = () => ({
  ownerUserId: null,
  notifications: [],
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
  notifications: normalizeNotificationsList(snapshot?.notifications),
  lastSyncAt: snapshot?.lastSyncAt ? String(snapshot.lastSyncAt) : null,
  lastMutationAt: snapshot?.lastMutationAt
    ? String(snapshot.lastMutationAt)
    : null,
});

let hydrationPromise = null;
let isHydrated = false;

export const useNotificationsStore = create(
  immer((set, get) => ({
    ...createInitialState(),

    hydrateFromLocalSnapshot: (snapshot = {}, ownerUserId = null) => {
      const normalized = normalizeSnapshot({
        ...snapshot,
        ownerUserId: ownerUserId ?? snapshot?.ownerUserId ?? null,
      });
      set((state) => {
        state.ownerUserId = normalized.ownerUserId;
        state.notifications = normalized.notifications;
        state.lastSyncAt = normalized.lastSyncAt;
        state.lastMutationAt = normalized.lastMutationAt;
      });
    },

    hydrateFromServer: (notifications = [], ownerUserId = null) => {
      set((state) => {
        state.ownerUserId = ownerUserId ? String(ownerUserId) : state.ownerUserId;
        state.notifications = normalizeNotificationsList(notifications);
        state.lastSyncAt = new Date().toISOString();
      });
    },

    upsertNotification: (notification) => {
      if (!notification?.id) return;
      set((state) => {
        const current = Array.isArray(state.notifications)
          ? state.notifications
          : [];
        const index = current.findIndex(
          (entry) => String(entry?.id) === String(notification.id),
        );
        if (index >= 0) {
          current[index] = notification;
        } else {
          current.unshift(notification);
        }
        state.notifications = normalizeNotificationsList(current);
        state.lastMutationAt = new Date().toISOString();
      });
    },

    removeNotification: (notificationId) => {
      set((state) => {
        state.notifications = normalizeNotificationsList(
          (Array.isArray(state.notifications) ? state.notifications : []).filter(
            (notification) => String(notification?.id) !== String(notificationId),
          ),
        );
        state.lastMutationAt = new Date().toISOString();
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

    requestNotificationsRetry: () => {
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

    resetNotificationsState: (ownerUserId = null) => {
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
        database.read(StorageKeys.NOTIFICATIONS, null),
      ])
        .then(([snapshot, legacyNotifications]) => {
          if (snapshot && typeof snapshot === "object") {
            get().hydrateFromLocalSnapshot(
              snapshot,
              snapshot?.ownerUserId ?? null,
            );
            get().markHydrated(snapshot?.ownerUserId ?? null);
            return;
          }

          if (Array.isArray(legacyNotifications)) {
            get().hydrateFromLocalSnapshot(
              { notifications: legacyNotifications },
              null,
            );
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

useNotificationsStore.subscribe((state) => {
  if (!state.hydrated) return;

  database.write(STORAGE_KEY, normalizeSnapshot(state)).catch((error) => {
    console.warn("[notificationsStore] Persistence error:", error);
  });
});

export const hydrateNotificationsStore = () =>
  useNotificationsStore.getState().initFromStorage();

export const isNotificationsStoreHydrated = () => isHydrated;

export default useNotificationsStore;

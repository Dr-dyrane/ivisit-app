import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { database, StorageKeys } from "../database";
import { sortEmergencyContacts } from "../services/emergencyContactsApiService";

// PULLBACK NOTE: EmergencyContacts five-layer pass - Layer 3 (persisted cross-surface snapshot).
// Owns: contact snapshot, migration metadata, and backend mode flags shared across screens and flows.
// Does NOT own: canonical fetch/write lifecycle; Query and the facade service remain upstream.

const STORAGE_KEY = StorageKeys.EMERGENCY_CONTACTS_CACHE;

const createInitialState = () => ({
  ownerUserId: null,
  contacts: [],
  hydrated: false,
  lastSyncAt: null,
  migrationStatus: "idle",
  skippedLegacyContacts: [],
  lastMutationAt: null,
  serverBacked: false,
  backendUnavailable: false,
  lifecycleState: "bootstrapping",
  lifecycleError: null,
  needsMigrationReview: false,
  isSyncing: false,
  isReady: false,
  mutationCount: 0,
  migrationReviewDismissed: false,
  retryRequestCount: 0,
});

const normalizeSnapshot = (snapshot = {}) => ({
  ownerUserId: snapshot?.ownerUserId ? String(snapshot.ownerUserId) : null,
  contacts: sortEmergencyContacts(
    Array.isArray(snapshot?.contacts) ? snapshot.contacts.filter(Boolean) : [],
  ),
  lastSyncAt: snapshot?.lastSyncAt ? String(snapshot.lastSyncAt) : null,
  migrationStatus:
    typeof snapshot?.migrationStatus === "string"
      ? snapshot.migrationStatus
      : "idle",
  skippedLegacyContacts: Array.isArray(snapshot?.skippedLegacyContacts)
    ? snapshot.skippedLegacyContacts.filter(Boolean)
    : [],
  lastMutationAt: snapshot?.lastMutationAt
    ? String(snapshot.lastMutationAt)
    : null,
  serverBacked: snapshot?.serverBacked === true,
  backendUnavailable: snapshot?.backendUnavailable === true,
});

let hydrationPromise = null;
let isHydrated = false;

export const useEmergencyContactsStore = create(
  immer((set, get) => ({
    ...createInitialState(),

    hydrateFromLocalSnapshot: (snapshot = {}, ownerUserId = null) => {
      const normalized = normalizeSnapshot({
        ...snapshot,
        ownerUserId: ownerUserId ?? snapshot?.ownerUserId ?? null,
      });
      set((state) => {
        state.ownerUserId = normalized.ownerUserId;
        state.contacts = normalized.contacts;
        state.lastSyncAt = normalized.lastSyncAt;
        state.migrationStatus = normalized.migrationStatus;
        state.skippedLegacyContacts = normalized.skippedLegacyContacts;
        state.lastMutationAt = normalized.lastMutationAt;
        state.serverBacked = normalized.serverBacked;
      });
    },

    hydrateContacts: (contacts = [], ownerUserId, options = {}) => {
      set((state) => {
        state.ownerUserId = ownerUserId
          ? String(ownerUserId)
          : state.ownerUserId;
        state.contacts = sortEmergencyContacts(contacts);
        state.serverBacked = options?.serverBacked === true;
        state.backendUnavailable = options?.backendUnavailable === true;
        state.lastSyncAt = new Date().toISOString();
      });
    },

    hydrateFromServer: (contacts = [], ownerUserId) => {
      get().hydrateContacts(contacts, ownerUserId, {
        serverBacked: true,
        backendUnavailable: false,
      });
    },

    upsertContact: (contact) => {
      if (!contact?.id) return;
      set((state) => {
        const index = state.contacts.findIndex(
          (current) => String(current?.id) === String(contact.id),
        );
        if (index >= 0) {
          state.contacts[index] = contact;
        } else {
          state.contacts.unshift(contact);
        }
        state.contacts = sortEmergencyContacts(state.contacts);
        state.lastMutationAt = new Date().toISOString();
      });
    },

    removeContact: (contactId) => {
      set((state) => {
        state.contacts = state.contacts.filter(
          (contact) => String(contact?.id) !== String(contactId),
        );
        state.lastMutationAt = new Date().toISOString();
      });
    },

    setMigrationStatus: (status) => {
      set((state) => {
        state.migrationStatus = status || "idle";
      });
    },

    setSkippedLegacyContacts: (contacts = []) => {
      set((state) => {
        state.skippedLegacyContacts = Array.isArray(contacts)
          ? contacts.filter(Boolean)
          : [];
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
        state.needsMigrationReview = status?.needsMigrationReview === true;
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

    dismissMigrationReview: () => {
      set((state) => {
        state.migrationReviewDismissed = true;
        state.needsMigrationReview = false;
      });
    },

    resetMigrationReviewDismissal: () => {
      set((state) => {
        state.migrationReviewDismissed = false;
      });
    },

    requestEmergencyContactsRetry: () => {
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

    resetEmergencyContactsState: (ownerUserId = null) => {
      set((state) => {
        Object.assign(state, createInitialState());
        state.hydrated = true;
        state.ownerUserId = ownerUserId ? String(ownerUserId) : null;
      });
      isHydrated = true;
    },

    initFromStorage: async () => {
      if (hydrationPromise) return hydrationPromise;

      // Hydration must be idempotent because multiple consumers can mount before the first read settles.
      hydrationPromise = database
        .read(STORAGE_KEY, null)
        .then((snapshot) => {
          if (snapshot && typeof snapshot === "object") {
            get().hydrateFromLocalSnapshot(
              snapshot,
              snapshot?.ownerUserId ?? null,
            );
          }
          get().markHydrated(snapshot?.ownerUserId ?? null);
        })
        .catch(() => {
          get().markHydrated(null);
        });

      return hydrationPromise;
    },
  })),
);

useEmergencyContactsStore.subscribe((state) => {
  if (!state.hydrated) return;

  database.write(STORAGE_KEY, normalizeSnapshot(state)).catch((error) => {
    console.warn("[emergencyContactsStore] Persistence error:", error);
  });
});

export const hydrateEmergencyContactsStore = () =>
  useEmergencyContactsStore.getState().initFromStorage();

export const isEmergencyContactsStoreHydrated = () => isHydrated;

export default useEmergencyContactsStore;

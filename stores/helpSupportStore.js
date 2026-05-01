import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { database, StorageKeys } from "../database";
import {
  normalizeSupportFaqList,
  normalizeSupportTicketList,
} from "../services/helpSupportService";

const STORAGE_KEY = StorageKeys.HELP_SUPPORT_CACHE;

const createInitialState = () => ({
  ownerUserId: null,
  faqs: [],
  tickets: [],
  hydrated: false,
  lastSyncAt: null,
  lastMutationAt: null,
  lifecycleState: "bootstrapping",
  lifecycleError: null,
  isSyncing: false,
  isReady: false,
  mutationCount: 0,
});

const normalizeSnapshot = (snapshot = {}) => ({
  ownerUserId: snapshot?.ownerUserId ? String(snapshot.ownerUserId) : null,
  faqs: normalizeSupportFaqList(snapshot?.faqs),
  tickets: normalizeSupportTicketList(snapshot?.tickets),
  lastSyncAt: snapshot?.lastSyncAt ? String(snapshot.lastSyncAt) : null,
  lastMutationAt: snapshot?.lastMutationAt
    ? String(snapshot.lastMutationAt)
    : null,
});

let hydrationPromise = null;
let isHydrated = false;

export const useHelpSupportStore = create(
  immer((set, get) => ({
    ...createInitialState(),

    hydrateFromLocalSnapshot: (snapshot = {}, ownerUserId = null) => {
      const normalized = normalizeSnapshot({
        ...snapshot,
        ownerUserId: ownerUserId ?? snapshot?.ownerUserId ?? null,
      });

      set((state) => {
        state.ownerUserId = normalized.ownerUserId;
        state.faqs = normalized.faqs;
        state.tickets = normalized.tickets;
        state.lastSyncAt = normalized.lastSyncAt;
        state.lastMutationAt = normalized.lastMutationAt;
      });
    },

    hydrateFromServer: (payload = {}, ownerUserId = null) => {
      set((state) => {
        state.ownerUserId = ownerUserId ? String(ownerUserId) : state.ownerUserId;
        if (Array.isArray(payload?.faqs)) {
          state.faqs = normalizeSupportFaqList(payload.faqs);
        }
        if (Array.isArray(payload?.tickets)) {
          state.tickets = normalizeSupportTicketList(payload.tickets);
        }
        state.lastSyncAt = new Date().toISOString();
      });
    },

    upsertTicket: (ticket) => {
      if (!ticket?.id) return;
      set((state) => {
        const current = Array.isArray(state.tickets) ? state.tickets : [];
        const index = current.findIndex(
          (entry) => String(entry?.id) === String(ticket.id),
        );
        if (index >= 0) {
          current[index] = ticket;
        } else {
          current.unshift(ticket);
        }
        state.tickets = normalizeSupportTicketList(current);
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

    markHydrated: (ownerUserId = null) => {
      set((state) => {
        state.hydrated = true;
        if (ownerUserId !== null) {
          state.ownerUserId = String(ownerUserId);
        }
      });
      isHydrated = true;
    },

    resetHelpSupportState: (ownerUserId = null) => {
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
        database.read(StorageKeys.SUPPORT_TICKETS, null),
      ])
        .then(([snapshot, legacyTickets]) => {
          if (snapshot && typeof snapshot === "object") {
            get().hydrateFromLocalSnapshot(
              snapshot,
              snapshot?.ownerUserId ?? null,
            );
            get().markHydrated(snapshot?.ownerUserId ?? null);
            return;
          }

          if (Array.isArray(legacyTickets)) {
            get().hydrateFromLocalSnapshot({ tickets: legacyTickets }, null);
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

useHelpSupportStore.subscribe((state) => {
  if (!state.hydrated) return;

  database.write(STORAGE_KEY, normalizeSnapshot(state)).catch((error) => {
    console.warn("[helpSupportStore] Persistence error:", error);
  });
});

export const hydrateHelpSupportStore = () =>
  useHelpSupportStore.getState().initFromStorage();

export const isHelpSupportStoreHydrated = () => isHydrated;

export default useHelpSupportStore;

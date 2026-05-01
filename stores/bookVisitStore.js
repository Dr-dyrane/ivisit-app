import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { database, StorageKeys } from "../database";

const STORAGE_KEY = StorageKeys.BOOK_VISIT_DRAFT;

export const BOOK_VISIT_STEPS = {
  SERVICE: 0,
  SPECIALTY: 1,
  PROVIDER: 2,
  DATETIME: 3,
  SUMMARY: 4,
};

export const createEmptyBookVisitDraft = () => ({
  type: null,
  specialty: null,
  hospital: null,
  doctor: null,
  date: null,
  time: null,
  notes: "",
});

const createInitialState = () => ({
  ownerUserId: null,
  hydrated: false,
  step: BOOK_VISIT_STEPS.SERVICE,
  draft: createEmptyBookVisitDraft(),
  quote: null,
  routeSeedSignature: null,
  lifecycleState: "bootstrapping",
  lifecycleError: null,
  lastUpdatedAt: null,
});

const isMeaningfulText = (value) =>
  typeof value === "string" && value.trim().length > 0;

const safeDateString = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const normalizeEntity = (value) => {
  if (!value || typeof value !== "object") return null;
  return value;
};

const normalizeDraft = (draft = {}) => ({
  type: isMeaningfulText(draft?.type) ? String(draft.type) : null,
  specialty: isMeaningfulText(draft?.specialty)
    ? String(draft.specialty)
    : null,
  hospital: normalizeEntity(draft?.hospital),
  doctor: normalizeEntity(draft?.doctor),
  date: safeDateString(draft?.date),
  time: isMeaningfulText(draft?.time) ? String(draft.time) : null,
  notes: isMeaningfulText(draft?.notes) ? String(draft.notes) : "",
});

const normalizeQuote = (quote) => {
  if (!quote || typeof quote !== "object") return null;
  return quote;
};

const normalizeSnapshot = (snapshot = {}) => ({
  ownerUserId: snapshot?.ownerUserId ? String(snapshot.ownerUserId) : null,
  step:
    Number.isInteger(snapshot?.step) && snapshot.step >= 0
      ? snapshot.step
      : BOOK_VISIT_STEPS.SERVICE,
  draft: normalizeDraft(snapshot?.draft),
  quote: normalizeQuote(snapshot?.quote),
  routeSeedSignature: isMeaningfulText(snapshot?.routeSeedSignature)
    ? String(snapshot.routeSeedSignature)
    : null,
  lastUpdatedAt: snapshot?.lastUpdatedAt
    ? String(snapshot.lastUpdatedAt)
    : null,
});

let hydrationPromise = null;
let isHydrated = false;

export const useBookVisitStore = create(
  immer((set, get) => ({
    ...createInitialState(),

    hydrateFromLocalSnapshot: (snapshot = {}, ownerUserId = null) => {
      const normalized = normalizeSnapshot({
        ...snapshot,
        ownerUserId: ownerUserId ?? snapshot?.ownerUserId ?? null,
      });

      set((state) => {
        state.ownerUserId = normalized.ownerUserId;
        state.step = normalized.step;
        state.draft = normalized.draft;
        state.quote = normalized.quote;
        state.routeSeedSignature = normalized.routeSeedSignature;
        state.lastUpdatedAt = normalized.lastUpdatedAt;
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

    setStep: (step) => {
      if (!Number.isInteger(step) || step < 0) return;
      set((state) => {
        state.step = step;
        state.lastUpdatedAt = new Date().toISOString();
      });
    },

    updateDraftField: (key, value) => {
      set((state) => {
        if (!(key in state.draft)) return;
        if (key === "date") {
          state.draft.date = safeDateString(value);
        } else {
          state.draft[key] = value;
        }
        state.lastUpdatedAt = new Date().toISOString();
      });
    },

    mergeDraft: (updates = {}) => {
      const normalizedUpdates = normalizeDraft(updates);
      set((state) => {
        state.draft = {
          ...state.draft,
          ...normalizedUpdates,
        };
        state.lastUpdatedAt = new Date().toISOString();
      });
    },

    setQuote: (quote) => {
      set((state) => {
        state.quote = normalizeQuote(quote);
        state.lastUpdatedAt = new Date().toISOString();
      });
    },

    clearQuote: () => {
      set((state) => {
        state.quote = null;
        state.lastUpdatedAt = new Date().toISOString();
      });
    },

    seedFromParams: (params = {}, signature = null) => {
      if (!signature || get().routeSeedSignature === signature) return;

      const draftSeed = normalizeDraft(params);
      const nextStep =
        draftSeed.type &&
        draftSeed.specialty &&
        draftSeed.hospital &&
        draftSeed.doctor
          ? BOOK_VISIT_STEPS.DATETIME
          : draftSeed.type && draftSeed.specialty
            ? BOOK_VISIT_STEPS.PROVIDER
            : draftSeed.type
              ? BOOK_VISIT_STEPS.SPECIALTY
              : BOOK_VISIT_STEPS.SERVICE;

      set((state) => {
        state.draft = {
          ...createEmptyBookVisitDraft(),
          ...draftSeed,
        };
        state.step = nextStep;
        state.quote = null;
        state.routeSeedSignature = signature;
        state.lastUpdatedAt = new Date().toISOString();
      });
    },

    setLifecycleStatus: ({ lifecycleState, lifecycleError } = {}) => {
      set((state) => {
        if (typeof lifecycleState === "string") {
          state.lifecycleState = lifecycleState;
        }
        if (lifecycleError === null) {
          state.lifecycleError = null;
        } else if (lifecycleError) {
          state.lifecycleError = String(lifecycleError);
        }
      });
    },

    resetBookVisitState: (ownerUserId = null) => {
      set((state) => {
        Object.assign(state, createInitialState());
        state.hydrated = true;
        state.ownerUserId = ownerUserId ? String(ownerUserId) : null;
      });
      isHydrated = true;
    },

    initFromStorage: async () => {
      if (hydrationPromise) return hydrationPromise;

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

useBookVisitStore.subscribe((state) => {
  if (!state.hydrated) return;
  database.write(STORAGE_KEY, normalizeSnapshot(state)).catch((error) => {
    console.warn("[bookVisitStore] Persistence error:", error);
  });
});

export const hydrateBookVisitStore = () =>
  useBookVisitStore.getState().initFromStorage();

export const isBookVisitStoreHydrated = () => isHydrated;

export default useBookVisitStore;

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { database, StorageKeys } from "../database";
import { v4 as uuidv4 } from "uuid";
import { SCHEDULED_CARE_MODES } from "../utils/scheduledVisitProjection";

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
  date: null,
  time: null,
  slot: null,
  notes: "",
});

const createInitialState = () => ({
  ownerUserId: null,
  hydrated: false,
  step: BOOK_VISIT_STEPS.SERVICE,
  draft: createEmptyBookVisitDraft(),
  quote: null,
  bookingIntentFingerprint: null,
  bookingIdempotencyKey: null,
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

const normalizeCareMode = (value) => {
  const normalized = isMeaningfulText(value) ? String(value).trim() : null;
  if (normalized === "clinic") return SCHEDULED_CARE_MODES.IN_PERSON;
  if (normalized === "telehealth") return SCHEDULED_CARE_MODES.ASYNC_CONSULT;
  return Object.values(SCHEDULED_CARE_MODES).includes(normalized)
    ? normalized
    : null;
};

const normalizeSlot = (value) => {
  if (!value || typeof value !== "object") return null;
  const scheduledStartAt = safeDateString(
    value.scheduledStartAt ?? value.scheduled_start_at,
  );
  const scheduledEndAt = safeDateString(
    value.scheduledEndAt ?? value.scheduled_end_at,
  );
  if (!scheduledStartAt || !scheduledEndAt) return null;
  return {
    scheduledStartAt,
    scheduledEndAt,
    scheduledTimezone: isMeaningfulText(
      value.scheduledTimezone ?? value.scheduled_timezone,
    )
      ? String(value.scheduledTimezone ?? value.scheduled_timezone)
      : null,
  };
};

const normalizeDraft = (draft = {}) => ({
  type: normalizeCareMode(draft?.type),
  specialty: isMeaningfulText(draft?.specialty)
    ? String(draft.specialty)
    : null,
  hospital: normalizeEntity(draft?.hospital),
  date: safeDateString(draft?.date),
  time: isMeaningfulText(draft?.time) ? String(draft.time) : null,
  slot: normalizeSlot(draft?.slot),
  notes: isMeaningfulText(draft?.notes) ? String(draft.notes) : "",
});

const normalizeDraftPatch = (updates = {}) => {
  const normalized = normalizeDraft(updates);
  return Object.keys(normalized).reduce((patch, key) => {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      patch[key] = normalized[key];
    }
    return patch;
  }, {});
};

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
  bookingIntentFingerprint: isMeaningfulText(
    snapshot?.bookingIntentFingerprint,
  )
    ? String(snapshot.bookingIntentFingerprint)
    : null,
  bookingIdempotencyKey: isMeaningfulText(snapshot?.bookingIdempotencyKey)
    ? String(snapshot.bookingIdempotencyKey)
    : null,
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
        state.bookingIntentFingerprint = normalized.bookingIntentFingerprint;
        state.bookingIdempotencyKey = normalized.bookingIdempotencyKey;
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
        const normalized = normalizeDraftPatch({ [key]: value });
        state.draft[key] = normalized[key];
        state.lastUpdatedAt = new Date().toISOString();
      });
    },

    mergeDraft: (updates = {}) => {
      const normalizedUpdates = normalizeDraftPatch(updates);
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

    getOrCreateBookingIntentKey: (fingerprint) => {
      if (!isMeaningfulText(fingerprint)) return null;
      let resolvedKey = null;
      set((state) => {
        if (
          state.bookingIntentFingerprint === fingerprint &&
          isMeaningfulText(state.bookingIdempotencyKey)
        ) {
          resolvedKey = state.bookingIdempotencyKey;
          return;
        }
        resolvedKey = uuidv4();
        state.bookingIntentFingerprint = fingerprint;
        state.bookingIdempotencyKey = resolvedKey;
        state.lastUpdatedAt = new Date().toISOString();
      });
      return resolvedKey;
    },

    clearBookingIntent: () => {
      set((state) => {
        state.bookingIntentFingerprint = null;
        state.bookingIdempotencyKey = null;
        state.lastUpdatedAt = new Date().toISOString();
      });
    },

    seedFromParams: (params = {}, signature = null) => {
      if (!signature || get().routeSeedSignature === signature) return;

      const draftSeed = normalizeDraft(params);
      const nextStep =
        draftSeed.type &&
        draftSeed.specialty &&
        draftSeed.hospital
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
        state.bookingIntentFingerprint = null;
        state.bookingIdempotencyKey = null;
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

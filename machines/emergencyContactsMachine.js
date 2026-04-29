import { assign, setup } from "xstate";

// PULLBACK NOTE: EmergencyContacts five-layer pass - Layer 4 lifecycle machine.
// Owns: readiness, migration-review legality, sync failure, and mutation pending states.
// Does NOT own: canonical contact arrays; those stay in Query + Zustand.

const createInitialContext = () => ({
  userId: null,
  error: null,
  hasMigrationReview: false,
});

export const EmergencyContactsState = {
  BOOTSTRAPPING: "bootstrapping",
  AWAITING_AUTH: "awaitingAuth",
  MIGRATING_LEGACY: "migratingLegacy",
  SYNCING: "syncing",
  READY: "ready",
  MUTATION_PENDING: "mutationPending",
  MIGRATION_REVIEW_REQUIRED: "migrationReviewRequired",
  ERROR: "error",
};

export const emergencyContactsMachine = setup({
  types: {
    context: /** @type {ReturnType<typeof createInitialContext>} */ ({}),
    events: /** @type {
			| { type: "LOCAL_HYDRATED" }
			| { type: "AUTH_READY"; userId?: string }
			| { type: "SERVER_SYNC_SUCCESS" }
			| { type: "SERVER_SYNC_FAILURE"; error?: string }
			| { type: "LEGACY_MIGRATION_REQUIRED" }
			| { type: "LEGACY_MIGRATION_SUCCESS" }
			| { type: "LEGACY_MIGRATION_PARTIAL" }
			| { type: "MUTATION_START" }
			| { type: "MUTATION_SUCCESS" }
			| { type: "MUTATION_FAILURE"; error?: string }
			| { type: "RETRY" }
			| { type: "DISMISS_MIGRATION_REVIEW" }
		} */ ({}),
  },
  actions: {
    assignAuth: assign({
      userId: ({ event, context }) => event.userId ?? context.userId,
      error: null,
    }),
    assignError: assign({
      error: ({ event }) => event.error ?? "Emergency contacts sync failed",
    }),
    clearError: assign({
      error: null,
    }),
    markReviewRequired: assign({
      hasMigrationReview: true,
      error: null,
    }),
    clearReviewRequired: assign({
      hasMigrationReview: false,
      error: null,
    }),
  },
}).createMachine({
  id: "emergencyContactsLifecycle",
  initial: EmergencyContactsState.BOOTSTRAPPING,
  context: createInitialContext(),
  states: {
    [EmergencyContactsState.BOOTSTRAPPING]: {
      on: {
        LOCAL_HYDRATED: {
          target: EmergencyContactsState.AWAITING_AUTH,
        },
      },
    },
    [EmergencyContactsState.AWAITING_AUTH]: {
      on: {
        AUTH_READY: {
          target: EmergencyContactsState.SYNCING,
          actions: "assignAuth",
        },
      },
    },
    [EmergencyContactsState.SYNCING]: {
      on: {
        LEGACY_MIGRATION_REQUIRED: {
          target: EmergencyContactsState.MIGRATING_LEGACY,
          actions: "clearError",
        },
        LEGACY_MIGRATION_PARTIAL: {
          target: EmergencyContactsState.MIGRATION_REVIEW_REQUIRED,
          actions: "markReviewRequired",
        },
        SERVER_SYNC_SUCCESS: {
          target: EmergencyContactsState.READY,
          actions: "clearError",
        },
        SERVER_SYNC_FAILURE: {
          target: EmergencyContactsState.ERROR,
          actions: "assignError",
        },
        MUTATION_START: {
          target: EmergencyContactsState.MUTATION_PENDING,
        },
      },
    },
    [EmergencyContactsState.MIGRATING_LEGACY]: {
      on: {
        LEGACY_MIGRATION_SUCCESS: {
          target: EmergencyContactsState.SYNCING,
          actions: "clearReviewRequired",
        },
        LEGACY_MIGRATION_PARTIAL: {
          target: EmergencyContactsState.MIGRATION_REVIEW_REQUIRED,
          actions: "markReviewRequired",
        },
        SERVER_SYNC_FAILURE: {
          target: EmergencyContactsState.ERROR,
          actions: "assignError",
        },
      },
    },
    [EmergencyContactsState.READY]: {
      on: {
        MUTATION_START: {
          target: EmergencyContactsState.MUTATION_PENDING,
        },
        LEGACY_MIGRATION_PARTIAL: {
          target: EmergencyContactsState.MIGRATION_REVIEW_REQUIRED,
          actions: "markReviewRequired",
        },
        SERVER_SYNC_FAILURE: {
          target: EmergencyContactsState.ERROR,
          actions: "assignError",
        },
      },
    },
    [EmergencyContactsState.MIGRATION_REVIEW_REQUIRED]: {
      on: {
        DISMISS_MIGRATION_REVIEW: {
          target: EmergencyContactsState.READY,
          actions: "clearReviewRequired",
        },
        SERVER_SYNC_SUCCESS: {
          target: EmergencyContactsState.READY,
        },
        MUTATION_START: {
          target: EmergencyContactsState.MUTATION_PENDING,
        },
        RETRY: {
          target: EmergencyContactsState.SYNCING,
        },
      },
    },
    [EmergencyContactsState.MUTATION_PENDING]: {
      on: {
        MUTATION_SUCCESS: [
          {
            guard: ({ context }) => context.hasMigrationReview === true,
            target: EmergencyContactsState.MIGRATION_REVIEW_REQUIRED,
          },
          {
            target: EmergencyContactsState.READY,
          },
        ],
        MUTATION_FAILURE: {
          target: EmergencyContactsState.ERROR,
          actions: "assignError",
        },
        LEGACY_MIGRATION_PARTIAL: {
          target: EmergencyContactsState.MIGRATION_REVIEW_REQUIRED,
          actions: "markReviewRequired",
        },
      },
    },
    [EmergencyContactsState.ERROR]: {
      on: {
        RETRY: {
          target: EmergencyContactsState.SYNCING,
          actions: "clearError",
        },
      },
    },
  },
});

export default emergencyContactsMachine;

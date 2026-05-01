import { assign, setup } from "xstate";

// PULLBACK NOTE: Medical profile five-layer pass - Layer 4 lifecycle machine.

const createInitialContext = () => ({
  userId: null,
  error: null,
});

export const MedicalProfileState = {
  BOOTSTRAPPING: "bootstrapping",
  AWAITING_AUTH: "awaitingAuth",
  SYNCING: "syncing",
  READY: "ready",
  MUTATION_PENDING: "mutationPending",
  ERROR: "error",
};

export const medicalProfileMachine = setup({
  types: {
    context: /** @type {ReturnType<typeof createInitialContext>} */ ({}),
    events: /** @type {
      | { type: "LOCAL_HYDRATED" }
      | { type: "AUTH_READY"; userId?: string }
      | { type: "SERVER_SYNC_SUCCESS" }
      | { type: "SERVER_SYNC_FAILURE"; error?: string }
      | { type: "MUTATION_START" }
      | { type: "MUTATION_SUCCESS" }
      | { type: "MUTATION_FAILURE"; error?: string }
      | { type: "RETRY" }
    } */ ({}),
  },
  actions: {
    assignAuth: assign({
      userId: ({ event, context }) => event.userId ?? context.userId,
      error: null,
    }),
    assignError: assign({
      error: ({ event }) => event.error ?? "Medical profile sync failed",
    }),
    clearError: assign({
      error: null,
    }),
  },
}).createMachine({
  id: "medicalProfileLifecycle",
  initial: MedicalProfileState.BOOTSTRAPPING,
  context: createInitialContext(),
  states: {
    [MedicalProfileState.BOOTSTRAPPING]: {
      on: {
        LOCAL_HYDRATED: {
          target: MedicalProfileState.AWAITING_AUTH,
        },
      },
    },
    [MedicalProfileState.AWAITING_AUTH]: {
      on: {
        AUTH_READY: {
          target: MedicalProfileState.SYNCING,
          actions: "assignAuth",
        },
      },
    },
    [MedicalProfileState.SYNCING]: {
      on: {
        SERVER_SYNC_SUCCESS: {
          target: MedicalProfileState.READY,
          actions: "clearError",
        },
        SERVER_SYNC_FAILURE: {
          target: MedicalProfileState.ERROR,
          actions: "assignError",
        },
        MUTATION_START: {
          target: MedicalProfileState.MUTATION_PENDING,
        },
      },
    },
    [MedicalProfileState.READY]: {
      on: {
        MUTATION_START: {
          target: MedicalProfileState.MUTATION_PENDING,
        },
        SERVER_SYNC_FAILURE: {
          target: MedicalProfileState.ERROR,
          actions: "assignError",
        },
      },
    },
    [MedicalProfileState.MUTATION_PENDING]: {
      on: {
        MUTATION_SUCCESS: {
          target: MedicalProfileState.READY,
          actions: "clearError",
        },
        MUTATION_FAILURE: {
          target: MedicalProfileState.ERROR,
          actions: "assignError",
        },
      },
    },
    [MedicalProfileState.ERROR]: {
      on: {
        RETRY: {
          target: MedicalProfileState.SYNCING,
          actions: "clearError",
        },
      },
    },
  },
});

export default medicalProfileMachine;

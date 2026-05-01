import { assign, setup } from "xstate";

// PULLBACK NOTE: Visits five-layer pass - Layer 4 lifecycle machine.
// Owns: readiness, sync failure, and mutation pending legality for the shared
// visits feature.

const createInitialContext = () => ({
  userId: null,
  error: null,
});

export const VisitsState = {
  BOOTSTRAPPING: "bootstrapping",
  AWAITING_AUTH: "awaitingAuth",
  SYNCING: "syncing",
  READY: "ready",
  MUTATION_PENDING: "mutationPending",
  ERROR: "error",
};

export const visitsMachine = setup({
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
      error: ({ event }) => event.error ?? "Visits sync failed",
    }),
    clearError: assign({
      error: null,
    }),
  },
}).createMachine({
  id: "visitsLifecycle",
  initial: VisitsState.BOOTSTRAPPING,
  context: createInitialContext(),
  states: {
    [VisitsState.BOOTSTRAPPING]: {
      on: {
        LOCAL_HYDRATED: {
          target: VisitsState.AWAITING_AUTH,
        },
      },
    },
    [VisitsState.AWAITING_AUTH]: {
      on: {
        AUTH_READY: {
          target: VisitsState.SYNCING,
          actions: "assignAuth",
        },
      },
    },
    [VisitsState.SYNCING]: {
      on: {
        SERVER_SYNC_SUCCESS: {
          target: VisitsState.READY,
          actions: "clearError",
        },
        SERVER_SYNC_FAILURE: {
          target: VisitsState.ERROR,
          actions: "assignError",
        },
        MUTATION_START: {
          target: VisitsState.MUTATION_PENDING,
        },
      },
    },
    [VisitsState.READY]: {
      on: {
        MUTATION_START: {
          target: VisitsState.MUTATION_PENDING,
        },
        SERVER_SYNC_FAILURE: {
          target: VisitsState.ERROR,
          actions: "assignError",
        },
      },
    },
    [VisitsState.MUTATION_PENDING]: {
      on: {
        MUTATION_SUCCESS: {
          target: VisitsState.READY,
          actions: "clearError",
        },
        MUTATION_FAILURE: {
          target: VisitsState.ERROR,
          actions: "assignError",
        },
      },
    },
    [VisitsState.ERROR]: {
      on: {
        RETRY: {
          target: VisitsState.SYNCING,
          actions: "clearError",
        },
      },
    },
  },
});

export default visitsMachine;

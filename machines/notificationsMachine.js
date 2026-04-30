import { assign, setup } from "xstate";

// PULLBACK NOTE: Notifications five-layer pass - Layer 4 lifecycle machine.
// Owns: readiness, sync failure, and mutation pending legality for the inbox feature.
// Does NOT own: notification arrays; those stay in Query + Zustand.

const createInitialContext = () => ({
  userId: null,
  error: null,
});

export const NotificationsState = {
  BOOTSTRAPPING: "bootstrapping",
  AWAITING_AUTH: "awaitingAuth",
  SYNCING: "syncing",
  READY: "ready",
  MUTATION_PENDING: "mutationPending",
  ERROR: "error",
};

export const notificationsMachine = setup({
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
      error: ({ event }) => event.error ?? "Notifications sync failed",
    }),
    clearError: assign({
      error: null,
    }),
  },
}).createMachine({
  id: "notificationsLifecycle",
  initial: NotificationsState.BOOTSTRAPPING,
  context: createInitialContext(),
  states: {
    [NotificationsState.BOOTSTRAPPING]: {
      on: {
        LOCAL_HYDRATED: {
          target: NotificationsState.AWAITING_AUTH,
        },
      },
    },
    [NotificationsState.AWAITING_AUTH]: {
      on: {
        AUTH_READY: {
          target: NotificationsState.SYNCING,
          actions: "assignAuth",
        },
      },
    },
    [NotificationsState.SYNCING]: {
      on: {
        SERVER_SYNC_SUCCESS: {
          target: NotificationsState.READY,
          actions: "clearError",
        },
        SERVER_SYNC_FAILURE: {
          target: NotificationsState.ERROR,
          actions: "assignError",
        },
        MUTATION_START: {
          target: NotificationsState.MUTATION_PENDING,
        },
      },
    },
    [NotificationsState.READY]: {
      on: {
        MUTATION_START: {
          target: NotificationsState.MUTATION_PENDING,
        },
        SERVER_SYNC_FAILURE: {
          target: NotificationsState.ERROR,
          actions: "assignError",
        },
      },
    },
    [NotificationsState.MUTATION_PENDING]: {
      on: {
        MUTATION_SUCCESS: {
          target: NotificationsState.READY,
          actions: "clearError",
        },
        MUTATION_FAILURE: {
          target: NotificationsState.ERROR,
          actions: "assignError",
        },
      },
    },
    [NotificationsState.ERROR]: {
      on: {
        RETRY: {
          target: NotificationsState.SYNCING,
          actions: "clearError",
        },
      },
    },
  },
});

export default notificationsMachine;

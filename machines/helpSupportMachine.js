import { assign, setup } from "xstate";

const createInitialContext = () => ({
  userId: null,
  error: null,
});

export const HelpSupportState = {
  BOOTSTRAPPING: "bootstrapping",
  AWAITING_AUTH: "awaitingAuth",
  SYNCING: "syncing",
  READY: "ready",
  TICKET_SUBMITTING: "ticketSubmitting",
  ERROR: "error",
};

export const helpSupportMachine = setup({
  types: {
    context: /** @type {ReturnType<typeof createInitialContext>} */ ({}),
    events: /** @type {
      | { type: "LOCAL_HYDRATED" }
      | { type: "AUTH_READY"; userId?: string }
      | { type: "SERVER_SYNC_SUCCESS" }
      | { type: "SERVER_SYNC_FAILURE"; error?: string }
      | { type: "TICKET_SUBMIT_START" }
      | { type: "TICKET_SUBMIT_SUCCESS" }
      | { type: "TICKET_SUBMIT_FAILURE"; error?: string }
      | { type: "RETRY" }
    } */ ({}),
  },
  actions: {
    assignAuth: assign({
      userId: ({ event, context }) => event.userId ?? context.userId,
      error: null,
    }),
    assignError: assign({
      error: ({ event }) => event.error ?? "Help and support sync failed",
    }),
    clearError: assign({
      error: null,
    }),
  },
}).createMachine({
  id: "helpSupportLifecycle",
  initial: HelpSupportState.BOOTSTRAPPING,
  context: createInitialContext(),
  states: {
    [HelpSupportState.BOOTSTRAPPING]: {
      on: {
        LOCAL_HYDRATED: {
          target: HelpSupportState.AWAITING_AUTH,
        },
      },
    },
    [HelpSupportState.AWAITING_AUTH]: {
      on: {
        AUTH_READY: {
          target: HelpSupportState.SYNCING,
          actions: "assignAuth",
        },
      },
    },
    [HelpSupportState.SYNCING]: {
      on: {
        SERVER_SYNC_SUCCESS: {
          target: HelpSupportState.READY,
          actions: "clearError",
        },
        SERVER_SYNC_FAILURE: {
          target: HelpSupportState.ERROR,
          actions: "assignError",
        },
        TICKET_SUBMIT_START: {
          target: HelpSupportState.TICKET_SUBMITTING,
        },
      },
    },
    [HelpSupportState.READY]: {
      on: {
        SERVER_SYNC_FAILURE: {
          target: HelpSupportState.ERROR,
          actions: "assignError",
        },
        TICKET_SUBMIT_START: {
          target: HelpSupportState.TICKET_SUBMITTING,
        },
      },
    },
    [HelpSupportState.TICKET_SUBMITTING]: {
      on: {
        TICKET_SUBMIT_SUCCESS: {
          target: HelpSupportState.READY,
          actions: "clearError",
        },
        TICKET_SUBMIT_FAILURE: {
          target: HelpSupportState.ERROR,
          actions: "assignError",
        },
      },
    },
    [HelpSupportState.ERROR]: {
      on: {
        RETRY: {
          target: HelpSupportState.SYNCING,
          actions: "clearError",
        },
      },
    },
  },
});

export default helpSupportMachine;

import { assign, setup } from "xstate";

const createInitialContext = () => ({
  error: null,
});

export const BookVisitLifecycleState = {
  BOOTSTRAPPING: "bootstrapping",
  DRAFTING: "drafting",
  QUOTE_PENDING: "quotePending",
  READY: "ready",
  SUBMITTING: "submitting",
  SUCCESS: "success",
  ERROR: "error",
};

// PULLBACK NOTE: Book Visit Layer 4.
// Owns: when the draft is merely being edited, when quote fetch is pending,
// and when submit is legally in flight. The draft data itself stays elsewhere.
export const bookVisitMachine = setup({
  types: {
    context: /** @type {ReturnType<typeof createInitialContext>} */ ({}),
    events: /** @type {
      | { type: "LOCAL_HYDRATED" }
      | { type: "QUOTE_REQUEST" }
      | { type: "QUOTE_SUCCESS" }
      | { type: "QUOTE_FAILURE"; error?: string }
      | { type: "SUBMIT_START" }
      | { type: "SUBMIT_SUCCESS" }
      | { type: "SUBMIT_FAILURE"; error?: string }
      | { type: "RESET_ERROR" }
      | { type: "RESET_SUCCESS" }
    } */ ({}),
  },
  actions: {
    clearError: assign({
      error: null,
    }),
    assignError: assign({
      error: ({ event }) => event.error ?? "Booking failed",
    }),
  },
}).createMachine({
  id: "bookVisitLifecycle",
  initial: BookVisitLifecycleState.BOOTSTRAPPING,
  context: createInitialContext(),
  states: {
    [BookVisitLifecycleState.BOOTSTRAPPING]: {
      on: {
        LOCAL_HYDRATED: {
          target: BookVisitLifecycleState.DRAFTING,
        },
      },
    },
    [BookVisitLifecycleState.DRAFTING]: {
      on: {
        QUOTE_REQUEST: {
          target: BookVisitLifecycleState.QUOTE_PENDING,
          actions: "clearError",
        },
        SUBMIT_START: {
          target: BookVisitLifecycleState.SUBMITTING,
          actions: "clearError",
        },
      },
    },
    [BookVisitLifecycleState.QUOTE_PENDING]: {
      on: {
        QUOTE_SUCCESS: {
          target: BookVisitLifecycleState.READY,
          actions: "clearError",
        },
        QUOTE_FAILURE: {
          target: BookVisitLifecycleState.ERROR,
          actions: "assignError",
        },
      },
    },
    [BookVisitLifecycleState.READY]: {
      on: {
        QUOTE_REQUEST: {
          target: BookVisitLifecycleState.QUOTE_PENDING,
          actions: "clearError",
        },
        SUBMIT_START: {
          target: BookVisitLifecycleState.SUBMITTING,
          actions: "clearError",
        },
      },
    },
    [BookVisitLifecycleState.SUBMITTING]: {
      on: {
        SUBMIT_SUCCESS: {
          target: BookVisitLifecycleState.SUCCESS,
          actions: "clearError",
        },
        SUBMIT_FAILURE: {
          target: BookVisitLifecycleState.ERROR,
          actions: "assignError",
        },
      },
    },
    [BookVisitLifecycleState.SUCCESS]: {
      on: {
        RESET_SUCCESS: {
          target: BookVisitLifecycleState.DRAFTING,
          actions: "clearError",
        },
      },
    },
    [BookVisitLifecycleState.ERROR]: {
      on: {
        RESET_ERROR: {
          target: BookVisitLifecycleState.DRAFTING,
          actions: "clearError",
        },
        QUOTE_REQUEST: {
          target: BookVisitLifecycleState.QUOTE_PENDING,
          actions: "clearError",
        },
        SUBMIT_START: {
          target: BookVisitLifecycleState.SUBMITTING,
          actions: "clearError",
        },
      },
    },
  },
});

export default bookVisitMachine;

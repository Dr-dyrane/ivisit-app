import { assign, setup } from "xstate";

const createInitialContext = () => ({
  error: null,
  quoteRequestKey: null,
});

export const BillingQuoteLifecycleState = {
  IDLE: "idle",
  LOADING: "loading",
  QUOTED: "quoted",
  STALE: "stale",
  ERROR: "error",
};

export const billingQuoteMachine = setup({
  types: {
    context: /** @type {ReturnType<typeof createInitialContext>} */ ({}),
    events: /** @type {
      | { type: "QUOTE_REQUEST"; quoteRequestKey?: string | null }
      | { type: "QUOTE_SUCCESS" }
      | { type: "QUOTE_STALE" }
      | { type: "QUOTE_FAILURE"; error?: string }
      | { type: "RESET" }
    } */ ({}),
  },
  actions: {
    clearError: assign({
      error: null,
    }),
    assignError: assign({
      error: ({ event }) => event.error ?? "Billing quote unavailable",
    }),
    assignQuoteRequestKey: assign({
      quoteRequestKey: ({ event, context }) =>
        event.type === "QUOTE_REQUEST"
          ? event.quoteRequestKey ?? context.quoteRequestKey
          : context.quoteRequestKey,
    }),
  },
}).createMachine({
  id: "billingQuoteLifecycle",
  initial: BillingQuoteLifecycleState.IDLE,
  context: createInitialContext(),
  states: {
    [BillingQuoteLifecycleState.IDLE]: {
      on: {
        QUOTE_REQUEST: {
          target: BillingQuoteLifecycleState.LOADING,
          actions: ["clearError", "assignQuoteRequestKey"],
        },
      },
    },
    [BillingQuoteLifecycleState.LOADING]: {
      on: {
        QUOTE_SUCCESS: {
          target: BillingQuoteLifecycleState.QUOTED,
          actions: "clearError",
        },
        QUOTE_STALE: {
          target: BillingQuoteLifecycleState.STALE,
          actions: "clearError",
        },
        QUOTE_FAILURE: {
          target: BillingQuoteLifecycleState.ERROR,
          actions: "assignError",
        },
      },
    },
    [BillingQuoteLifecycleState.QUOTED]: {
      on: {
        QUOTE_REQUEST: {
          target: BillingQuoteLifecycleState.LOADING,
          actions: ["clearError", "assignQuoteRequestKey"],
        },
        QUOTE_STALE: {
          target: BillingQuoteLifecycleState.STALE,
          actions: "clearError",
        },
        RESET: {
          target: BillingQuoteLifecycleState.IDLE,
          actions: "clearError",
        },
      },
    },
    [BillingQuoteLifecycleState.STALE]: {
      on: {
        QUOTE_REQUEST: {
          target: BillingQuoteLifecycleState.LOADING,
          actions: ["clearError", "assignQuoteRequestKey"],
        },
        RESET: {
          target: BillingQuoteLifecycleState.IDLE,
          actions: "clearError",
        },
      },
    },
    [BillingQuoteLifecycleState.ERROR]: {
      on: {
        QUOTE_REQUEST: {
          target: BillingQuoteLifecycleState.LOADING,
          actions: ["clearError", "assignQuoteRequestKey"],
        },
        RESET: {
          target: BillingQuoteLifecycleState.IDLE,
          actions: "clearError",
        },
      },
    },
  },
});

export default billingQuoteMachine;


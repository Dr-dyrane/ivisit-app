import { assign, setup } from "xstate";

// PULLBACK NOTE: Map route five-layer completion - Layer 4 lifecycle machine.
// Owns: shared routing infrastructure legality, not per-key route geometry.

const createInitialContext = () => ({
  error: null,
  lastSource: null,
});

export const MapRouteState = {
  IDLE: "idle",
  RESOLVING: "resolving",
  RESOLVED: "resolved",
  FALLBACK: "fallback",
  ERROR: "error",
};

export const mapRouteMachine = setup({
  types: {
    context: /** @type {ReturnType<typeof createInitialContext>} */ ({}),
    events: /** @type {
      | { type: "ROUTE_REQUESTED" }
      | { type: "ROUTE_RESOLVED"; source?: string | null }
      | { type: "ROUTE_FALLBACK"; source?: string | null }
      | { type: "ROUTE_ERROR"; error?: string | null }
      | { type: "RESET" }
    } */ ({}),
  },
  actions: {
    clearError: assign({
      error: null,
    }),
    assignResolvedSource: assign({
      error: null,
      lastSource: ({ event, context }) => event.source ?? context.lastSource,
    }),
    assignError: assign({
      error: ({ event }) => event.error ?? "Route calculation failed",
    }),
  },
}).createMachine({
  id: "mapRouteLifecycle",
  initial: MapRouteState.IDLE,
  context: createInitialContext(),
  states: {
    [MapRouteState.IDLE]: {
      on: {
        ROUTE_REQUESTED: {
          target: MapRouteState.RESOLVING,
          actions: "clearError",
        },
        ROUTE_RESOLVED: {
          target: MapRouteState.RESOLVED,
          actions: "assignResolvedSource",
        },
        ROUTE_FALLBACK: {
          target: MapRouteState.FALLBACK,
          actions: "assignResolvedSource",
        },
        ROUTE_ERROR: {
          target: MapRouteState.ERROR,
          actions: "assignError",
        },
      },
    },
    [MapRouteState.RESOLVING]: {
      on: {
        ROUTE_RESOLVED: {
          target: MapRouteState.RESOLVED,
          actions: "assignResolvedSource",
        },
        ROUTE_FALLBACK: {
          target: MapRouteState.FALLBACK,
          actions: "assignResolvedSource",
        },
        ROUTE_ERROR: {
          target: MapRouteState.ERROR,
          actions: "assignError",
        },
      },
    },
    [MapRouteState.RESOLVED]: {
      on: {
        ROUTE_REQUESTED: {
          target: MapRouteState.RESOLVING,
          actions: "clearError",
        },
        ROUTE_FALLBACK: {
          target: MapRouteState.FALLBACK,
          actions: "assignResolvedSource",
        },
        ROUTE_ERROR: {
          target: MapRouteState.ERROR,
          actions: "assignError",
        },
      },
    },
    [MapRouteState.FALLBACK]: {
      on: {
        ROUTE_REQUESTED: {
          target: MapRouteState.RESOLVING,
          actions: "clearError",
        },
        ROUTE_RESOLVED: {
          target: MapRouteState.RESOLVED,
          actions: "assignResolvedSource",
        },
        ROUTE_ERROR: {
          target: MapRouteState.ERROR,
          actions: "assignError",
        },
      },
    },
    [MapRouteState.ERROR]: {
      on: {
        ROUTE_REQUESTED: {
          target: MapRouteState.RESOLVING,
          actions: "clearError",
        },
        RESET: {
          target: MapRouteState.IDLE,
          actions: "clearError",
        },
      },
    },
  },
});

export default mapRouteMachine;

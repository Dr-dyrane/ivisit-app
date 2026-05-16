import { assign, setup } from "xstate";

// PULLBACK NOTE: Contact Dispatch CD-5 - Layer 4 lifecycle machine.
// Owns: send legality, archive readiness, and connection state.
// Does NOT own: canonical message arrays; those stay in Query.

const createInitialContext = () => ({
  error: null,
  roomId: null,
  isArchived: false,
});

export const EmergencyChatRoomState = {
  IDLE: "idle",
  ENSURING_ROOM: "ensuringRoom",
  LOADING_MESSAGES: "loadingMessages",
  READY: "ready",
  SENDING: "sending",
  RECONNECTING: "reconnecting",
  ARCHIVED: "archived",
  ERROR: "error",
};

export const emergencyChatRoomMachine = setup({
  types: {
    context: /** @type {ReturnType<typeof createInitialContext>} */ ({}),
    events: /** @type {
			| { type: "OPEN" }
			| { type: "ROOM_READY"; roomId?: string }
			| { type: "MESSAGES_READY" }
			| { type: "SEND" }
			| { type: "SEND_SUCCESS" }
			| { type: "SEND_FAILURE"; error?: string }
			| { type: "REALTIME_DISCONNECTED" }
			| { type: "REALTIME_RECOVERED" }
			| { type: "ARCHIVED"; roomId?: string }
			| { type: "CLOSE" }
			| { type: "RETRY" }
		} */ ({}),
  },
  actions: {
    assignRoomId: assign({
      roomId: ({ event }) => event.roomId ?? null,
      error: null,
    }),
    assignError: assign({
      error: ({ event }) => event.error ?? "Chat operation failed",
    }),
    clearError: assign({
      error: null,
    }),
    markArchived: assign({
      isArchived: true,
      error: null,
    }),
    clearArchived: assign({
      isArchived: false,
      error: null,
    }),
  },
}).createMachine({
  id: "emergencyChatRoomLifecycle",
  initial: EmergencyChatRoomState.IDLE,
  context: createInitialContext(),
  states: {
    [EmergencyChatRoomState.IDLE]: {
      on: {
        OPEN: {
          target: EmergencyChatRoomState.ENSURING_ROOM,
          actions: "clearError",
        },
      },
    },
    [EmergencyChatRoomState.ENSURING_ROOM]: {
      on: {
        ROOM_READY: {
          target: EmergencyChatRoomState.LOADING_MESSAGES,
          actions: "assignRoomId",
        },
        SEND_FAILURE: {
          target: EmergencyChatRoomState.ERROR,
          actions: "assignError",
        },
        ARCHIVED: {
          target: EmergencyChatRoomState.ARCHIVED,
          actions: ["assignRoomId", "markArchived"],
        },
      },
    },
    [EmergencyChatRoomState.LOADING_MESSAGES]: {
      on: {
        MESSAGES_READY: {
          target: EmergencyChatRoomState.READY,
          actions: "clearError",
        },
        SEND_FAILURE: {
          target: EmergencyChatRoomState.ERROR,
          actions: "assignError",
        },
        ARCHIVED: {
          target: EmergencyChatRoomState.ARCHIVED,
          actions: "markArchived",
        },
      },
    },
    [EmergencyChatRoomState.READY]: {
      on: {
        SEND: {
          target: EmergencyChatRoomState.SENDING,
        },
        ARCHIVED: {
          target: EmergencyChatRoomState.ARCHIVED,
          actions: "markArchived",
        },
        REALTIME_DISCONNECTED: {
          target: EmergencyChatRoomState.RECONNECTING,
        },
        CLOSE: {
          target: EmergencyChatRoomState.IDLE,
          actions: ["clearError", "clearArchived"],
        },
      },
    },
    [EmergencyChatRoomState.SENDING]: {
      on: {
        SEND_SUCCESS: {
          target: EmergencyChatRoomState.READY,
          actions: "clearError",
        },
        SEND_FAILURE: {
          target: EmergencyChatRoomState.READY,
          actions: "assignError",
        },
        ARCHIVED: {
          target: EmergencyChatRoomState.ARCHIVED,
          actions: "markArchived",
        },
      },
    },
    [EmergencyChatRoomState.RECONNECTING]: {
      on: {
        REALTIME_RECOVERED: {
          target: EmergencyChatRoomState.READY,
          actions: "clearError",
        },
        SEND_FAILURE: {
          target: EmergencyChatRoomState.ERROR,
          actions: "assignError",
        },
        ARCHIVED: {
          target: EmergencyChatRoomState.ARCHIVED,
          actions: "markArchived",
        },
      },
    },
    [EmergencyChatRoomState.ARCHIVED]: {
      on: {
        CLOSE: {
          target: EmergencyChatRoomState.IDLE,
          actions: ["clearError", "clearArchived"],
        },
      },
    },
    [EmergencyChatRoomState.ERROR]: {
      on: {
        RETRY: {
          target: EmergencyChatRoomState.ENSURING_ROOM,
          actions: "clearError",
        },
        ARCHIVED: {
          target: EmergencyChatRoomState.ARCHIVED,
          actions: "markArchived",
        },
        CLOSE: {
          target: EmergencyChatRoomState.IDLE,
          actions: ["clearError", "clearArchived"],
        },
      },
    },
  },
});

export default emergencyChatRoomMachine;

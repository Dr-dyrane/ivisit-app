import { useMachine } from "@xstate/react";
import { emergencyChatRoomMachine, EmergencyChatRoomState } from "../../machines/emergencyChatRoomMachine";

// PULLBACK NOTE: Contact Dispatch CD-5 - Layer 4 lifecycle hook.
// Owns: XState machine adapter for send/archive/readiness legality.
// Does NOT own: canonical message data; Query owns that.

export function useEmergencyChatRoomLifecycle() {
  const [snapshot, send] = useMachine(emergencyChatRoomMachine);

  const open = () => send({ type: "OPEN" });
  const roomReady = (roomId) => send({ type: "ROOM_READY", roomId });
  const messagesReady = () => send({ type: "MESSAGES_READY" });
  const sendStart = () => send({ type: "SEND" });
  const sendSuccess = () => send({ type: "SEND_SUCCESS" });
  const sendFailure = (error) => send({ type: "SEND_FAILURE", error });
  const realtimeDisconnected = () => send({ type: "REALTIME_DISCONNECTED" });
  const realtimeRecovered = () => send({ type: "REALTIME_RECOVERED" });
  const archived = () => send({ type: "ARCHIVED" });
  const close = () => send({ type: "CLOSE" });
  const retry = () => send({ type: "RETRY" });

  return {
    state: snapshot.value,
    context: snapshot.context,
    isIdle: snapshot.matches(EmergencyChatRoomState.IDLE),
    isEnsuringRoom: snapshot.matches(EmergencyChatRoomState.ENSURING_ROOM),
    isLoadingMessages: snapshot.matches(EmergencyChatRoomState.LOADING_MESSAGES),
    isReady: snapshot.matches(EmergencyChatRoomState.READY),
    isSending: snapshot.matches(EmergencyChatRoomState.SENDING),
    isReconnecting: snapshot.matches(EmergencyChatRoomState.RECONNECTING),
    isArchived: snapshot.matches(EmergencyChatRoomState.ARCHIVED),
    isError: snapshot.matches(EmergencyChatRoomState.ERROR),
    canSend: snapshot.matches(EmergencyChatRoomState.READY) && !snapshot.context.isArchived,
    roomId: snapshot.context.roomId,
    error: snapshot.context.error,
    open,
    roomReady,
    messagesReady,
    sendStart,
    sendSuccess,
    sendFailure,
    realtimeDisconnected,
    realtimeRecovered,
    archived,
    close,
    retry,
  };
}

export default useEmergencyChatRoomLifecycle;

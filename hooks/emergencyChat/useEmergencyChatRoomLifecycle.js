import { useCallback, useMemo } from "react";
import { useMachine } from "@xstate/react";
import { emergencyChatRoomMachine, EmergencyChatRoomState } from "../../machines/emergencyChatRoomMachine";

// PULLBACK NOTE: Contact Dispatch CD-5 - Layer 4 lifecycle hook.
// Owns: XState machine adapter for send/archive/readiness legality.
// Does NOT own: canonical message data; Query owns that.

export function useEmergencyChatRoomLifecycle() {
  const [snapshot, send] = useMachine(emergencyChatRoomMachine);

  const open = useCallback(() => send({ type: "OPEN" }), [send]);
  const roomReady = useCallback((roomId) => send({ type: "ROOM_READY", roomId }), [send]);
  const messagesReady = useCallback(() => send({ type: "MESSAGES_READY" }), [send]);
  const sendStart = useCallback(() => send({ type: "SEND" }), [send]);
  const sendSuccess = useCallback(() => send({ type: "SEND_SUCCESS" }), [send]);
  const sendFailure = useCallback((error) => send({ type: "SEND_FAILURE", error }), [send]);
  const realtimeDisconnected = useCallback(() => send({ type: "REALTIME_DISCONNECTED" }), [send]);
  const realtimeRecovered = useCallback(() => send({ type: "REALTIME_RECOVERED" }), [send]);
  const archived = useCallback((roomId) => send({ type: "ARCHIVED", roomId }), [send]);
  const close = useCallback(() => send({ type: "CLOSE" }), [send]);
  const retry = useCallback(() => send({ type: "RETRY" }), [send]);

  return useMemo(() => ({
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
  }), [
    archived,
    close,
    messagesReady,
    open,
    realtimeDisconnected,
    realtimeRecovered,
    retry,
    roomReady,
    sendFailure,
    sendStart,
    sendSuccess,
    snapshot,
  ]);
}

export default useEmergencyChatRoomLifecycle;

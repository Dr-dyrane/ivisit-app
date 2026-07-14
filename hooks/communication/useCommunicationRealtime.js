import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { communicationService } from "../../services/communicationService";
import { communicationQueryKeys } from "./communication.queryKeys";

export function useCommunicationRealtime({
  roomId,
  visitId,
  enabled = true,
}) {
  const queryClient = useQueryClient();
  const messagesKey = useMemo(
    () => communicationQueryKeys.messages(roomId),
    [roomId],
  );
  const roomKey = useMemo(
    () => communicationQueryKeys.roomByVisit(visitId),
    [visitId],
  );

  useEffect(() => {
    if (!enabled || !roomId) return undefined;
    let invalidateTimer = null;
    const messageSubscription = communicationService.subscribeToMessages(
      roomId,
      () => {
        if (invalidateTimer) clearTimeout(invalidateTimer);
        invalidateTimer = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: messagesKey });
        }, 120);
      },
    );
    const roomSubscription = communicationService.subscribeToRoom(
      roomId,
      (event) => {
        const nextRoom = event?.new;
        if (!nextRoom?.id || String(nextRoom.id) !== String(roomId)) return;
        queryClient.setQueryData(roomKey, (current) => {
          if (
            !current?.room?.id ||
            String(current.room.id) !== String(roomId)
          ) {
            return current;
          }
          return {
            ...current,
            room: { ...current.room, ...nextRoom },
          };
        });
      },
    );

    return () => {
      if (invalidateTimer) clearTimeout(invalidateTimer);
      messageSubscription?.unsubscribe?.();
      roomSubscription?.unsubscribe?.();
    };
  }, [enabled, messagesKey, queryClient, roomId, roomKey]);
}

export default useCommunicationRealtime;

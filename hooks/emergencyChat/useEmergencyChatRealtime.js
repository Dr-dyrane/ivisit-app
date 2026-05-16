import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { emergencyChatService } from "../../services/emergencyChatService";
import { emergencyChatQueryKeys } from "./emergencyChat.queryKeys";

// PULLBACK NOTE: Contact Dispatch CD-4 - Supabase realtime bridge.
// Owns: room-scoped realtime invalidation/patch only.
// Does NOT own: direct UI mutation or store writes; Query remains the convergence layer.

export function useEmergencyChatRealtime({ roomId, enabled = true }) {
  const queryClient = useQueryClient();
  const messagesQueryKey = useMemo(() => emergencyChatQueryKeys.messages(roomId), [roomId]);

  useEffect(() => {
    if (!enabled || !roomId) return undefined;

    const subscription = emergencyChatService.subscribeToMessages(
      roomId,
      ({ new: newMessage, old: oldMessage, eventType }) => {
        if (eventType === "INSERT" && newMessage) {
          // Patch: append canonical messages, replacing any matching optimistic echo.
          queryClient.setQueryData(messagesQueryKey, (current = []) => {
            const messages = Array.isArray(current) ? current : [];
            const exists = messages.some(
              (msg) => msg.id === newMessage.id
            );
            if (exists) return current;
            const optimisticIndex = messages.findIndex(
              (msg) =>
                msg.isOptimistic &&
                msg.clientMessageId &&
                msg.clientMessageId === newMessage.clientMessageId
            );
            if (optimisticIndex >= 0) {
              const next = [...messages];
              next[optimisticIndex] = newMessage;
              return next;
            }
            return [...messages, newMessage];
          });
        } else if (eventType === "UPDATE" && newMessage) {
          // Patch: update message in cache
          queryClient.setQueryData(messagesQueryKey, (current = []) => {
            return (Array.isArray(current) ? current : []).map((msg) =>
              msg.id === newMessage.id ? newMessage : msg
            );
          });
        } else if (eventType === "DELETE" && oldMessage) {
          // Patch: remove message from cache
          queryClient.setQueryData(messagesQueryKey, (current = []) => {
            return (Array.isArray(current) ? current : []).filter(
              (msg) => msg.id !== oldMessage.id
            );
          });
        } else {
          // Fallback: invalidate on any other event
          queryClient.invalidateQueries({ queryKey: messagesQueryKey });
        }
      },
      (status) => {
        if (__DEV__) {
          console.log(`[EmergencyChatRealtime] Status: ${status}`);
        }
      }
    );

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [enabled, roomId, queryClient, messagesQueryKey]);
}

export default useEmergencyChatRealtime;

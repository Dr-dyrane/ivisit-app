import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { emergencyChatService } from "../../services/emergencyChatService";
import { emergencyChatQueryKeys } from "./emergencyChat.queryKeys";

// PULLBACK NOTE: Contact Dispatch CD-4 - Supabase realtime bridge.
// Owns: room-scoped realtime invalidation/patch only.
// Does NOT own: direct UI mutation or store writes; Query remains the convergence layer.

export function useEmergencyChatRealtime({ roomId, enabled = true }) {
  const queryClient = useQueryClient();
  const messagesQueryKey = emergencyChatQueryKeys.messages(roomId);

  useEffect(() => {
    if (!enabled || !roomId) return undefined;

    const subscription = emergencyChatService.subscribeToMessages(
      roomId,
      ({ new: newMessage, old: oldMessage, eventType }) => {
        if (eventType === "INSERT" && newMessage) {
          // Patch: append new message to cache
          queryClient.setQueryData(messagesQueryKey, (current = []) => {
            // Avoid duplicate if already in cache (optimistic reconciliation)
            const exists = (Array.isArray(current) ? current : []).some(
              (msg) => msg.id === newMessage.id
            );
            if (exists) return current;
            return [newMessage, ...current];
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

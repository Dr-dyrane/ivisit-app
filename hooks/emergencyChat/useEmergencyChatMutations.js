import { useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { emergencyChatService } from "../../services/emergencyChatService";
import { emergencyChatQueryKeys } from "./emergencyChat.queryKeys";

// PULLBACK NOTE: Contact Dispatch CD-4 - Layer 2 (TanStack Query write lane)
// Owns: optimistic send behavior and post-settlement cache reconciliation.
// Does NOT own: persistent state (Zustand) or lifecycle legality (XState).

const buildOptimisticMessage = (roomId, senderId, senderRole, input) => {
  const normalized = emergencyChatService.normalizeInput(input, {
    allowInvalid: true,
  });
  const timestamp = new Date().toISOString();
  return {
    id: `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    roomId,
    senderId,
    senderRole,
    kind: normalized.kind,
    body: normalized.body,
    clientMessageId: normalized.clientMessageId,
    metadata: normalized.metadata,
    createdAt: timestamp,
    updatedAt: timestamp,
    editedAt: null,
    deletedAt: null,
    isOptimistic: true,
  };
};

/**
 * Hook for chat mutations (send message, mark room read).
 */
export function useEmergencyChatMutations({ roomId, requestId, senderId, senderRole }) {
  const queryClient = useQueryClient();
  const messagesQueryKey = useMemo(() => emergencyChatQueryKeys.messages(roomId), [roomId]);

  const sendMessageMutation = useMutation({
    mutationFn: (input) => emergencyChatService.sendMessage(roomId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: messagesQueryKey });
      const previousMessages = queryClient.getQueryData(messagesQueryKey) || [];
      
      // Build optimistic message
      const optimisticMessage = buildOptimisticMessage(
        roomId,
        senderId,
        senderRole,
        input
      );
      
      queryClient.setQueryData(messagesQueryKey, [...previousMessages, optimisticMessage]);
      
      return { previousMessages, clientMessageId: input?.clientMessageId };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(messagesQueryKey, context.previousMessages);
      }
    },
    onSuccess: (serverMessage, _variables, context) => {
      // Replace optimistic message with server message
      if (serverMessage) {
        queryClient.setQueryData(messagesQueryKey, (current = []) => {
          const withoutOptimistic = (Array.isArray(current) ? current : []).filter(
            (msg) =>
              msg.id !== serverMessage.id &&
              (!msg.isOptimistic || msg.clientMessageId !== context?.clientMessageId)
          );
          return [...withoutOptimistic, serverMessage];
        });
      }
    },
    onSettled: () => {
      // Refetch to ensure cache is canonical
      queryClient.invalidateQueries({ queryKey: messagesQueryKey });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (messageId) => emergencyChatService.markRoomRead(roomId, messageId),
    onSettled: () => {
      // No cache update needed - read state is participant-scoped and refetched on demand
    },
  });

  const sendMessage = useCallback(
    (input) => sendMessageMutation.mutateAsync(input),
    [sendMessageMutation.mutateAsync]
  );

  const markRoomRead = useCallback(
    (messageId = null) => markReadMutation.mutateAsync(messageId),
    [markReadMutation.mutateAsync]
  );

  const requestDemoDispatchReply = useCallback(
    (message) => {
      if (!roomId || !requestId || !message?.id || message.isOptimistic) return;

      emergencyChatService
        .requestDemoDispatchReply({
          roomId,
          requestId,
          messageId: message.id,
        })
        .catch((error) => {
          console.warn("[useEmergencyChatMutations] Demo dispatch reply failed:", error);
        });
    },
    [requestId, roomId]
  );

  return useMemo(
    () => ({
      sendMessage,
      markRoomRead,
      requestDemoDispatchReply,
      isSending: sendMessageMutation.isPending,
      isMarkingRead: markReadMutation.isPending,
      sendError: sendMessageMutation.error || null,
      markReadError: markReadMutation.error || null,
    }),
    [
      sendMessage,
      markRoomRead,
      requestDemoDispatchReply,
      sendMessageMutation.isPending,
      sendMessageMutation.error,
      markReadMutation.isPending,
      markReadMutation.error,
    ]
  );
}

export default useEmergencyChatMutations;

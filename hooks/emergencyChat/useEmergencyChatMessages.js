import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { emergencyChatService } from "../../services/emergencyChatService";
import { emergencyChatQueryKeys } from "./emergencyChat.queryKeys";

// PULLBACK NOTE: Contact Dispatch CD-4 - Layer 2 (TanStack Query read for messages)
// Owns: message fetch contract and invalidation helper.
// Does NOT own: optimistic writes, realtime subscription wiring, or UI state.

const STALE_TIME_MS = 30 * 1000; // 30 seconds

/**
 * Hook to fetch messages for a room with pagination.
 * Disabled until roomId exists.
 */
export function useEmergencyChatMessages({ roomId, enabled = true }) {
  const queryClient = useQueryClient();
  const queryKey = emergencyChatQueryKeys.messages(roomId);

  const messagesQuery = useQuery({
    queryKey,
    queryFn: () => emergencyChatService.listMessages(roomId, { limit: 50 }),
    enabled: enabled && Boolean(roomId),
    staleTime: STALE_TIME_MS,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData,
  });

  const invalidateMessages = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error,
    refetch: messagesQuery.refetch,
    invalidate: invalidateMessages,
  };
}

export function useInvalidateEmergencyChatMessages() {
  const queryClient = useQueryClient();
  return useCallback(
    (roomId) =>
      queryClient.invalidateQueries({
        queryKey: roomId
          ? emergencyChatQueryKeys.messages(roomId)
          : emergencyChatQueryKeys.all,
      }),
    [queryClient],
  );
}

export default useEmergencyChatMessages;

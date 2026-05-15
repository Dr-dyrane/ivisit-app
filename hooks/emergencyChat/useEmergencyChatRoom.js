import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { emergencyChatService } from "../../services/emergencyChatService";
import { emergencyChatQueryKeys } from "./emergencyChat.queryKeys";

// PULLBACK NOTE: Contact Dispatch CD-4 - Layer 2 (TanStack Query read/write for room)
// Owns: room ensure/fetch contract and invalidation helper.
// Does NOT own: UI state, realtime subscription wiring, or screen composition.

const STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to ensure a chat room exists for an emergency request.
 * Disabled until requestId exists.
 */
export function useEmergencyChatRoom({ requestId, enabled = true }) {
  const queryClient = useQueryClient();
  const queryKey = emergencyChatQueryKeys.roomByRequest(requestId);

  const ensureMutation = useMutation({
    mutationFn: () => emergencyChatService.ensureRoomForRequest(requestId),
    onSuccess: (data) => {
      // Cache the room data
      queryClient.setQueryData(queryKey, data);
    },
  });

  const roomQuery = useQuery({
    queryKey,
    queryFn: () => {
      const cached = queryClient.getQueryData(queryKey);
      return cached || null;
    },
    enabled: enabled && Boolean(requestId),
    staleTime: STALE_TIME_MS,
    refetchOnReconnect: false, // Room doesn't change frequently
  });

  const ensureRoom = useCallback(() => {
    return ensureMutation.mutateAsync();
  }, [ensureMutation]);

  return {
    room: roomQuery.data?.room || null,
    participants: roomQuery.data?.participants || [],
    isLoading: ensureMutation.isPending || roomQuery.isLoading,
    isEnsuring: ensureMutation.isPending,
    error: ensureMutation.error || roomQuery.error,
    ensureRoom,
  };
}

export function useInvalidateEmergencyChatRoom() {
  const queryClient = useQueryClient();
  return useCallback(
    (requestId) =>
      queryClient.invalidateQueries({
        queryKey: requestId
          ? emergencyChatQueryKeys.roomByRequest(requestId)
          : emergencyChatQueryKeys.all,
      }),
    [queryClient],
  );
}

export default useEmergencyChatRoom;

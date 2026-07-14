import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { asyncConsultService } from "../../services/asyncConsultService";
import { communicationQueryKeys } from "../communication/communication.queryKeys";

export function useAsyncConsultRoom({ visitId, enabled = true }) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => communicationQueryKeys.roomByVisit(visitId),
    [visitId],
  );
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const targetVisitId = visitId;
      const data = await asyncConsultService.ensureRoomForVisit(targetVisitId);
      if (data?.room?.id) {
        queryClient.setQueryData(
          communicationQueryKeys.participants(data.room.id),
          data.participants || [],
        );
      }
      return data;
    },
    enabled: false,
    staleTime: Infinity,
  });

  const ensureRoom = useCallback(({ force = false } = {}) => {
    if (!enabled || !visitId) return Promise.resolve(null);
    const cached = queryClient.getQueryData(queryKey);
    if (!force && cached?.room?.id) return Promise.resolve(cached);
    return query
      .refetch({ throwOnError: true })
      .then((result) => result.data || null);
  }, [enabled, query.refetch, queryClient, queryKey, visitId]);

  const reset = useCallback(
    () => queryClient.resetQueries({ queryKey, exact: true }),
    [queryClient, queryKey],
  );

  return {
    room: query.data?.room || null,
    participants: query.data?.participants || [],
    ensureRoom,
    isEnsuring: query.isFetching,
    error: query.error || null,
    reset,
  };
}

export default useAsyncConsultRoom;

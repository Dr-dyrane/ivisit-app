import { useCallback, useMemo } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { communicationService } from "../../services/communicationService";
import { communicationQueryKeys } from "./communication.queryKeys";

export function useCommunicationMessages({ roomId, enabled = true }) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => communicationQueryKeys.messages(roomId),
    [roomId],
  );
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = null }) =>
      communicationService.listMessages(roomId, {
        limit: 30,
        before: pageParam,
      }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
    enabled: enabled && Boolean(roomId),
    staleTime: 30 * 1000,
    refetchOnReconnect: true,
  });

  const messages = useMemo(() => {
    const pages = Array.isArray(query.data?.pages) ? query.data.pages : [];
    const seen = new Set();
    return [...pages]
      .reverse()
      .flatMap((page) => page?.items || [])
      .filter((message) => {
        if (!message?.id || seen.has(message.id)) return false;
        seen.add(message.id);
        return true;
      });
  }, [query.data?.pages]);

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey }),
    [queryClient, queryKey],
  );

  return {
    messages,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error || null,
    refetch: query.refetch,
    invalidate,
    hasOlderMessages: Boolean(query.hasNextPage),
    isLoadingOlder: query.isFetchingNextPage,
    loadOlderMessages: query.fetchNextPage,
  };
}

export default useCommunicationMessages;


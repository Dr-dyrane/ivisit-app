import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useVisitsStore } from "../../stores/visitsStore";
import { useVisitsQuery } from "./useVisitsQuery";
import { useVisitsRealtime } from "./useVisitsRealtime";
import { useVisitsLifecycle } from "./useVisitsLifecycle";
import { visitsQueryKeys } from "./visits.queryKeys";

// PULLBACK NOTE: Visits bootstrap extraction.
// Owns: single-call runtime orchestration for auth scoping, query hydration,
// realtime, and lifecycle sync.

export function useVisitsBootstrap() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ? String(user.id) : null;

  const hydrated = useVisitsStore((state) => state.hydrated);
  const ownerUserId = useVisitsStore((state) => state.ownerUserId);
  const mutationCount = useVisitsStore((state) => state.mutationCount);
  const retryRequestCount = useVisitsStore((state) => state.retryRequestCount);
  const hydrateFromServer = useVisitsStore((state) => state.hydrateFromServer);
  const markHydrated = useVisitsStore((state) => state.markHydrated);
  const resetVisitsState = useVisitsStore((state) => state.resetVisitsState);
  const setLifecycleStatus = useVisitsStore(
    (state) => state.setLifecycleStatus,
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!userId) {
      if (ownerUserId) {
        resetVisitsState(null);
      }
      return;
    }

    if (ownerUserId && ownerUserId !== userId) {
      resetVisitsState(userId);
      return;
    }

    if (!ownerUserId) {
      markHydrated(userId);
    }
  }, [hydrated, markHydrated, ownerUserId, resetVisitsState, userId]);

  const query = useVisitsQuery({
    userId,
    enabled: hydrated && !authLoading && Boolean(userId),
  });

  useVisitsRealtime({
    userId,
    enabled: hydrated && !authLoading && Boolean(userId) && query.isSuccess,
  });

  useEffect(() => {
    if (!userId || !query.isSuccess) return;
    hydrateFromServer(query.data || [], userId);
  }, [hydrateFromServer, query.data, query.isSuccess, userId]);

  const lifecycle = useVisitsLifecycle({
    userId,
    authLoading,
    hydrated,
    queryError: query.error,
    isFetching: query.isFetching,
    isFetched: query.isFetched,
    isMutating: mutationCount > 0,
  });

  useEffect(() => {
    setLifecycleStatus({
      lifecycleState: lifecycle.lifecycleState,
      lifecycleError: lifecycle.error,
      isSyncing: lifecycle.isSyncing || query.isFetching,
      isReady: lifecycle.isReady,
    });
  }, [
    lifecycle.error,
    lifecycle.isReady,
    lifecycle.isSyncing,
    lifecycle.lifecycleState,
    query.isFetching,
    setLifecycleStatus,
  ]);

  useEffect(() => {
    if (!retryRequestCount || !hydrated || authLoading || !userId) return;
    lifecycle.retry();
    void query.refetch({ cancelRefetch: false });
  }, [authLoading, hydrated, lifecycle, query, retryRequestCount, userId]);

  return {
    queryKey: userId ? visitsQueryKeys.list(userId) : null,
    hydrated,
  };
}

export default useVisitsBootstrap;

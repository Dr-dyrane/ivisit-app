import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNotificationsStore } from "../../stores/notificationsStore";
import { useNotificationsQuery } from "./useNotificationsQuery";
import { useNotificationsRealtime } from "./useNotificationsRealtime";
import { useNotificationsLifecycle } from "./useNotificationsLifecycle";
import { notificationsQueryKeys } from "./notifications.queryKeys";

// PULLBACK NOTE: Notifications bootstrap extraction.
// Owns: single-call runtime orchestration for auth scoping, query hydration, realtime, and lifecycle sync.
// Does NOT own: screen UI state or consumer CRUD composition.

export function useNotificationsBootstrap() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ? String(user.id) : null;

  const hydrated = useNotificationsStore((state) => state.hydrated);
  const ownerUserId = useNotificationsStore((state) => state.ownerUserId);
  const mutationCount = useNotificationsStore((state) => state.mutationCount);
  const retryRequestCount = useNotificationsStore(
    (state) => state.retryRequestCount,
  );
  const hydrateFromServer = useNotificationsStore(
    (state) => state.hydrateFromServer,
  );
  const markHydrated = useNotificationsStore((state) => state.markHydrated);
  const resetNotificationsState = useNotificationsStore(
    (state) => state.resetNotificationsState,
  );
  const setLifecycleStatus = useNotificationsStore(
    (state) => state.setLifecycleStatus,
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!userId) {
      if (ownerUserId) {
        resetNotificationsState(null);
      }
      return;
    }

    if (ownerUserId && ownerUserId !== userId) {
      resetNotificationsState(userId);
      return;
    }

    if (!ownerUserId) {
      markHydrated(userId);
    }
  }, [hydrated, markHydrated, ownerUserId, resetNotificationsState, userId]);

  const query = useNotificationsQuery({
    userId,
    enabled: hydrated && !authLoading && Boolean(userId),
  });

  useNotificationsRealtime({
    userId,
    enabled: hydrated && !authLoading && Boolean(userId) && query.isSuccess,
  });

  useEffect(() => {
    if (!userId || !query.isSuccess) return;
    hydrateFromServer(query.data || [], userId);
  }, [hydrateFromServer, query.data, query.isSuccess, userId]);

  const lifecycle = useNotificationsLifecycle({
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
    queryKey: userId ? notificationsQueryKeys.list(userId) : null,
    hydrated,
  };
}

export default useNotificationsBootstrap;

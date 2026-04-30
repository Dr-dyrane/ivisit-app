import { useMachine } from "@xstate/react";
import { useCallback, useEffect, useRef } from "react";
import {
  notificationsMachine,
  NotificationsState,
} from "../../machines/notificationsMachine";

// PULLBACK NOTE: Notifications five-layer pass - Layer 4 lifecycle adapter.
// Owns: translating hydration/auth/query/mutation facts into legal machine events.
// Does NOT own: notification data itself; machine context stays intentionally small.

export function useNotificationsLifecycle({
  userId,
  authLoading,
  hydrated,
  queryError,
  isFetching,
  isFetched,
  isMutating,
}) {
  const [snapshot, send] = useMachine(notificationsMachine);
  const mutationWasPendingRef = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    send({ type: "LOCAL_HYDRATED" });
  }, [hydrated, send]);

  useEffect(() => {
    if (!hydrated || authLoading || !userId) return;
    send({ type: "AUTH_READY", userId });
  }, [authLoading, hydrated, send, userId]);

  useEffect(() => {
    if (!hydrated || authLoading || !userId) return;
    if (queryError) {
      send({
        type: "SERVER_SYNC_FAILURE",
        error: queryError?.message || "Notifications sync failed",
      });
      return;
    }
    if (isFetched && !isFetching) {
      send({ type: "SERVER_SYNC_SUCCESS" });
    }
  }, [authLoading, hydrated, isFetched, isFetching, queryError, send, userId]);

  useEffect(() => {
    if (isMutating && !mutationWasPendingRef.current) {
      mutationWasPendingRef.current = true;
      send({ type: "MUTATION_START" });
      return;
    }

    if (!isMutating && mutationWasPendingRef.current) {
      mutationWasPendingRef.current = false;
      if (queryError) {
        send({
          type: "MUTATION_FAILURE",
          error: queryError?.message || "Notifications mutation failed",
        });
        return;
      }
      send({ type: "MUTATION_SUCCESS" });
    }
  }, [isMutating, queryError, send]);

  const retry = useCallback(() => {
    send({ type: "RETRY" });
  }, [send]);

  return {
    notificationsLifecycleSnapshot: snapshot,
    send,
    lifecycleState: snapshot.value,
    isBootstrapping: snapshot.matches(NotificationsState.BOOTSTRAPPING),
    isAwaitingAuth: snapshot.matches(NotificationsState.AWAITING_AUTH),
    isSyncing: snapshot.matches(NotificationsState.SYNCING),
    isReady: snapshot.matches(NotificationsState.READY),
    isMutationPending: snapshot.matches(NotificationsState.MUTATION_PENDING),
    isError: snapshot.matches(NotificationsState.ERROR),
    error: snapshot.context.error || null,
    retry,
  };
}

export default useNotificationsLifecycle;

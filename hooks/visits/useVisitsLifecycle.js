import { useMachine } from "@xstate/react";
import { useCallback, useEffect, useRef } from "react";
import { VisitsState, visitsMachine } from "../../machines/visitsMachine";

// PULLBACK NOTE: Visits five-layer pass - Layer 4 lifecycle adapter.
// Owns: translating hydration/auth/query/mutation facts into legal machine
// events for the shared visits lane.

export function useVisitsLifecycle({
  userId,
  authLoading,
  hydrated,
  queryError,
  isFetching,
  isFetched,
  isMutating,
}) {
  const [snapshot, send] = useMachine(visitsMachine);
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
        error: queryError?.message || "Visits sync failed",
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
          error: queryError?.message || "Visits mutation failed",
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
    visitsLifecycleSnapshot: snapshot,
    send,
    lifecycleState: snapshot.value,
    isBootstrapping: snapshot.matches(VisitsState.BOOTSTRAPPING),
    isAwaitingAuth: snapshot.matches(VisitsState.AWAITING_AUTH),
    isSyncing: snapshot.matches(VisitsState.SYNCING),
    isReady: snapshot.matches(VisitsState.READY),
    isMutationPending: snapshot.matches(VisitsState.MUTATION_PENDING),
    isError: snapshot.matches(VisitsState.ERROR),
    error: snapshot.context.error || null,
    retry,
  };
}

export default useVisitsLifecycle;

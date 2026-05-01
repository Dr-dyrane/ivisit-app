import { useMachine } from "@xstate/react";
import { useCallback, useEffect, useRef } from "react";
import {
  medicalProfileMachine,
  MedicalProfileState,
} from "../../machines/medicalProfileMachine";

// PULLBACK NOTE: Medical profile five-layer pass - Layer 4 lifecycle adapter.

export function useMedicalProfileLifecycle({
  userId,
  authLoading,
  hydrated,
  queryError,
  isFetching,
  isFetched,
  isMutating,
}) {
  const [snapshot, send] = useMachine(medicalProfileMachine);
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
        error: queryError?.message || "Medical profile sync failed",
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
          error: queryError?.message || "Medical profile mutation failed",
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
    medicalProfileLifecycleSnapshot: snapshot,
    send,
    lifecycleState: snapshot.value,
    isBootstrapping: snapshot.matches(MedicalProfileState.BOOTSTRAPPING),
    isAwaitingAuth: snapshot.matches(MedicalProfileState.AWAITING_AUTH),
    isSyncing: snapshot.matches(MedicalProfileState.SYNCING),
    isReady: snapshot.matches(MedicalProfileState.READY),
    isMutationPending: snapshot.matches(MedicalProfileState.MUTATION_PENDING),
    isError: snapshot.matches(MedicalProfileState.ERROR),
    error: snapshot.context.error || null,
    retry,
  };
}

export default useMedicalProfileLifecycle;

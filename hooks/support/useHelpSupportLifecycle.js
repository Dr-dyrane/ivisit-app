import { useMachine } from "@xstate/react";
import { useCallback, useEffect, useRef } from "react";
import {
  helpSupportMachine,
  HelpSupportState,
} from "../../machines/helpSupportMachine";

export function useHelpSupportLifecycle({
  userId,
  authLoading,
  hydrated,
  queryError,
  isFetching,
  isFetched,
  isSubmitting,
  submitError,
}) {
  const [snapshot, send] = useMachine(helpSupportMachine);
  const submitWasPendingRef = useRef(false);

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
        error: queryError?.message || "Help and support sync failed",
      });
      return;
    }
    if (isFetched && !isFetching) {
      send({ type: "SERVER_SYNC_SUCCESS" });
    }
  }, [authLoading, hydrated, isFetched, isFetching, queryError, send, userId]);

  useEffect(() => {
    if (isSubmitting && !submitWasPendingRef.current) {
      submitWasPendingRef.current = true;
      send({ type: "TICKET_SUBMIT_START" });
      return;
    }

    if (!isSubmitting && submitWasPendingRef.current) {
      submitWasPendingRef.current = false;
      if (submitError) {
        send({
          type: "TICKET_SUBMIT_FAILURE",
          error: submitError?.message || "Unable to send support request",
        });
        return;
      }
      send({ type: "TICKET_SUBMIT_SUCCESS" });
    }
  }, [isSubmitting, send, submitError]);

  const retry = useCallback(() => {
    send({ type: "RETRY" });
  }, [send]);

  return {
    helpSupportLifecycleSnapshot: snapshot,
    send,
    lifecycleState: snapshot.value,
    isBootstrapping: snapshot.matches(HelpSupportState.BOOTSTRAPPING),
    isAwaitingAuth: snapshot.matches(HelpSupportState.AWAITING_AUTH),
    isSyncing: snapshot.matches(HelpSupportState.SYNCING),
    isReady: snapshot.matches(HelpSupportState.READY),
    isTicketSubmitting: snapshot.matches(HelpSupportState.TICKET_SUBMITTING),
    isError: snapshot.matches(HelpSupportState.ERROR),
    error: snapshot.context.error || null,
    retry,
  };
}

export default useHelpSupportLifecycle;

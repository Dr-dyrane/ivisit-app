import { useMachine } from "@xstate/react";
import { useEffect, useRef } from "react";
import {
  bookVisitMachine,
  BookVisitLifecycleState,
} from "../../machines/bookVisitMachine";

// PULLBACK NOTE: Book Visit Layer 4 adapter.
// Keeps query and submit side effects out of the UI shell.
export function useBookVisitLifecycle({
  hydrated,
  shouldFetchQuote,
  quoteError,
  isQuoteFetching,
  hasQuote,
  isSubmitting,
  submitError,
}) {
  const [snapshot, send] = useMachine(bookVisitMachine);
  const quoteWasPendingRef = useRef(false);
  const submitWasPendingRef = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    send({ type: "LOCAL_HYDRATED" });
  }, [hydrated, send]);

  useEffect(() => {
    if (!hydrated || !shouldFetchQuote) return;

    if (isQuoteFetching && !quoteWasPendingRef.current) {
      quoteWasPendingRef.current = true;
      send({ type: "QUOTE_REQUEST" });
      return;
    }

    if (!isQuoteFetching && quoteWasPendingRef.current) {
      quoteWasPendingRef.current = false;
      if (quoteError) {
        send({
          type: "QUOTE_FAILURE",
          error: quoteError?.message || "Unable to load visit estimate",
        });
        return;
      }
      if (hasQuote) {
        send({ type: "QUOTE_SUCCESS" });
      }
    }
  }, [hasQuote, hydrated, isQuoteFetching, quoteError, send, shouldFetchQuote]);

  useEffect(() => {
    if (isSubmitting && !submitWasPendingRef.current) {
      submitWasPendingRef.current = true;
      send({ type: "SUBMIT_START" });
      return;
    }

    if (!isSubmitting && submitWasPendingRef.current) {
      submitWasPendingRef.current = false;
      if (submitError) {
        send({
          type: "SUBMIT_FAILURE",
          error: submitError?.message || "Unable to complete booking",
        });
        return;
      }
      send({ type: "SUBMIT_SUCCESS" });
    }
  }, [isSubmitting, send, submitError]);

  return {
    bookVisitLifecycleSnapshot: snapshot,
    send,
    lifecycleState: snapshot.value,
    isBootstrapping: snapshot.matches(BookVisitLifecycleState.BOOTSTRAPPING),
    isDrafting: snapshot.matches(BookVisitLifecycleState.DRAFTING),
    isQuotePending: snapshot.matches(BookVisitLifecycleState.QUOTE_PENDING),
    isReady: snapshot.matches(BookVisitLifecycleState.READY),
    isSubmittingState: snapshot.matches(BookVisitLifecycleState.SUBMITTING),
    isSuccess: snapshot.matches(BookVisitLifecycleState.SUCCESS),
    isError: snapshot.matches(BookVisitLifecycleState.ERROR),
    error: snapshot.context.error || null,
  };
}

export default useBookVisitLifecycle;

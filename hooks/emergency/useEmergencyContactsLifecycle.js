import { useMachine } from "@xstate/react";
import { useCallback, useEffect, useRef } from "react";
import {
  emergencyContactsMachine,
  EmergencyContactsState,
} from "../../machines/emergencyContactsMachine";

// PULLBACK NOTE: EmergencyContacts five-layer pass - Layer 4 (XState lifecycle adapter)
// Owns: translating hydration/auth/query/mutation facts into legal machine events.
// Does NOT own: contact data itself; machine context stays intentionally small.

export function useEmergencyContactsLifecycle({
  userId,
  authLoading,
  hydrated,
  migrationStatus,
  hasSkippedLegacyContacts,
  queryError,
  isFetching,
  isFetched,
  isMutating,
}) {
  const [snapshot, send] = useMachine(emergencyContactsMachine);
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
    if (migrationStatus === "migrating") {
      send({ type: "LEGACY_MIGRATION_REQUIRED" });
      return;
    }
    if (migrationStatus === "partial" || hasSkippedLegacyContacts) {
      send({ type: "LEGACY_MIGRATION_PARTIAL" });
      return;
    }
    if (migrationStatus === "completed") {
      send({ type: "LEGACY_MIGRATION_SUCCESS" });
    }
  }, [
    authLoading,
    hasSkippedLegacyContacts,
    hydrated,
    migrationStatus,
    send,
    userId,
  ]);

  useEffect(() => {
    if (!hydrated || authLoading || !userId) return;
    if (queryError) {
      send({
        type: "SERVER_SYNC_FAILURE",
        error: queryError?.message || "Emergency contacts sync failed",
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
      // Mutation completion should resolve through the same machine even if the cache already looks updated.
      if (queryError) {
        send({
          type: "MUTATION_FAILURE",
          error: queryError?.message || "Emergency contacts mutation failed",
        });
        return;
      }
      send({ type: "MUTATION_SUCCESS" });
    }
  }, [isMutating, queryError, send]);

  const retry = useCallback(() => {
    send({ type: "RETRY" });
  }, [send]);

  const dismissMigrationReview = useCallback(() => {
    send({ type: "DISMISS_MIGRATION_REVIEW" });
  }, [send]);

  return {
    emergencyContactsLifecycleSnapshot: snapshot,
    send,
    lifecycleState: snapshot.value,
    isBootstrapping: snapshot.matches(EmergencyContactsState.BOOTSTRAPPING),
    isAwaitingAuth: snapshot.matches(EmergencyContactsState.AWAITING_AUTH),
    isMigratingLegacy: snapshot.matches(
      EmergencyContactsState.MIGRATING_LEGACY,
    ),
    isSyncing:
      snapshot.matches(EmergencyContactsState.SYNCING) ||
      snapshot.matches(EmergencyContactsState.MIGRATING_LEGACY),
    isReady: snapshot.matches(EmergencyContactsState.READY),
    isMutationPending: snapshot.matches(
      EmergencyContactsState.MUTATION_PENDING,
    ),
    needsMigrationReview: snapshot.matches(
      EmergencyContactsState.MIGRATION_REVIEW_REQUIRED,
    ),
    isError: snapshot.matches(EmergencyContactsState.ERROR),
    error: snapshot.context.error || null,
    retry,
    dismissMigrationReview,
  };
}

export default useEmergencyContactsLifecycle;

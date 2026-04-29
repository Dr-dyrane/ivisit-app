import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { emergencyContactsService } from "../../services/emergencyContactsService";
import { useEmergencyContactsStore } from "../../stores/emergencyContactsStore";
import { useEmergencyContactsQuery } from "./useEmergencyContactsQuery";
import { useEmergencyContactsRealtime } from "./useEmergencyContactsRealtime";
import { useEmergencyContactsLifecycle } from "./useEmergencyContactsLifecycle";
import { emergencyContactsQueryKeys } from "./emergencyContacts.queryKeys";

// PULLBACK NOTE: EmergencyContacts bootstrap extraction.
// Owns: single-call runtime orchestration for auth scoping, legacy migration, query hydration, realtime, and lifecycle.
// Does NOT own: screen/editor state or per-consumer CRUD command composition.

export function useEmergencyContactsBootstrap() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ? String(user.id) : null;
  const queryClient = useQueryClient();

  const hydrated = useEmergencyContactsStore((state) => state.hydrated);
  const ownerUserId = useEmergencyContactsStore((state) => state.ownerUserId);
  const migrationStatus = useEmergencyContactsStore(
    (state) => state.migrationStatus,
  );
  const skippedLegacyContacts = useEmergencyContactsStore(
    (state) => state.skippedLegacyContacts,
  );
  const serverBacked = useEmergencyContactsStore((state) => state.serverBacked);
  const backendUnavailable = useEmergencyContactsStore(
    (state) => state.backendUnavailable,
  );
  const mutationCount = useEmergencyContactsStore(
    (state) => state.mutationCount,
  );
  const migrationReviewDismissed = useEmergencyContactsStore(
    (state) => state.migrationReviewDismissed,
  );
  const retryRequestCount = useEmergencyContactsStore(
    (state) => state.retryRequestCount,
  );
  const hydrateContacts = useEmergencyContactsStore(
    (state) => state.hydrateContacts,
  );
  const setMigrationStatus = useEmergencyContactsStore(
    (state) => state.setMigrationStatus,
  );
  const setSkippedLegacyContacts = useEmergencyContactsStore(
    (state) => state.setSkippedLegacyContacts,
  );
  const markHydrated = useEmergencyContactsStore((state) => state.markHydrated);
  const resetEmergencyContactsState = useEmergencyContactsStore(
    (state) => state.resetEmergencyContactsState,
  );
  const setLifecycleStatus = useEmergencyContactsStore(
    (state) => state.setLifecycleStatus,
  );
  const resetMigrationReviewDismissal = useEmergencyContactsStore(
    (state) => state.resetMigrationReviewDismissal,
  );

  const reviewSignature = useMemo(
    () =>
      Array.isArray(skippedLegacyContacts)
        ? skippedLegacyContacts
            .map((contact) => String(contact?.legacyId || ""))
            .join("|")
        : "",
    [skippedLegacyContacts],
  );
  const reviewSignatureRef = useRef(reviewSignature);

  useEffect(() => {
    if (!hydrated) return;
    if (!userId) {
      if (ownerUserId) {
        resetEmergencyContactsState(null);
      }
      return;
    }

    if (ownerUserId && ownerUserId !== userId) {
      resetEmergencyContactsState(userId);
      return;
    }

    if (!ownerUserId) {
      markHydrated(userId);
    }
  }, [
    hydrated,
    markHydrated,
    ownerUserId,
    resetEmergencyContactsState,
    userId,
  ]);

  useEffect(() => {
    if (!hydrated || authLoading || !userId) return undefined;
    let cancelled = false;

    (async () => {
      const currentMigrationState =
        await emergencyContactsService.getMigrationState({
          userId,
        });
      if (cancelled) return;
      setMigrationStatus(currentMigrationState.status);
      setSkippedLegacyContacts(currentMigrationState.skippedLegacyContacts);
      markHydrated(userId);

      if (currentMigrationState.lastMigratedAt) {
        return;
      }

      setMigrationStatus("migrating");
      try {
        const migrationResult =
          await emergencyContactsService.ensureLegacyMigration({
            userId,
          });
        if (cancelled) return;
        setMigrationStatus(migrationResult.status);
        setSkippedLegacyContacts(migrationResult.skippedLegacyContacts);
        if (Array.isArray(migrationResult.contacts)) {
          queryClient.setQueryData(
            emergencyContactsQueryKeys.list(userId),
            migrationResult.contacts,
          );
          hydrateContacts(migrationResult.contacts, userId, {
            serverBacked: migrationResult.serverBacked !== false,
            backendUnavailable: migrationResult.backendUnavailable === true,
          });
        }
      } catch (_error) {
        if (cancelled) return;
        setMigrationStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    hydrateContacts,
    hydrated,
    markHydrated,
    queryClient,
    retryRequestCount,
    setMigrationStatus,
    setSkippedLegacyContacts,
    userId,
  ]);

  const query = useEmergencyContactsQuery({
    userId,
    enabled: hydrated && !authLoading && Boolean(userId),
  });

  useEmergencyContactsRealtime({
    userId,
    enabled:
      hydrated &&
      !authLoading &&
      Boolean(userId) &&
      query.isSuccess &&
      serverBacked,
  });

  useEffect(() => {
    if (!userId || !query.isSuccess) return;
    const backendState = emergencyContactsService.getBackendState({ userId });
    hydrateContacts(query.data || [], userId, {
      serverBacked: backendState.serverBacked === true,
      backendUnavailable: backendState.backendUnavailable === true,
    });
  }, [hydrateContacts, query.data, query.isSuccess, userId]);

  useEffect(() => {
    if (!reviewSignature || reviewSignatureRef.current === reviewSignature)
      return;
    reviewSignatureRef.current = reviewSignature;
    resetMigrationReviewDismissal();
  }, [resetMigrationReviewDismissal, reviewSignature]);

  const lifecycle = useEmergencyContactsLifecycle({
    userId,
    authLoading,
    hydrated,
    migrationStatus,
    hasSkippedLegacyContacts: Array.isArray(skippedLegacyContacts)
      ? skippedLegacyContacts.length > 0
      : false,
    queryError: query.error,
    isFetching: query.isFetching,
    isFetched: query.isFetched,
    isMutating: mutationCount > 0,
  });

  useEffect(() => {
    if (!migrationReviewDismissed || !lifecycle.needsMigrationReview) return;
    lifecycle.dismissMigrationReview();
  }, [
    lifecycle.dismissMigrationReview,
    lifecycle.needsMigrationReview,
    migrationReviewDismissed,
  ]);

  useEffect(() => {
    if (!retryRequestCount) return;
    lifecycle.retry();
  }, [lifecycle.retry, retryRequestCount]);

  useEffect(() => {
    setLifecycleStatus({
      lifecycleState: lifecycle.lifecycleState,
      lifecycleError: lifecycle.error,
      isSyncing: lifecycle.isSyncing,
      isReady: lifecycle.isReady || lifecycle.needsMigrationReview,
      needsMigrationReview:
        lifecycle.needsMigrationReview && !migrationReviewDismissed,
    });
  }, [
    lifecycle.error,
    lifecycle.isReady,
    lifecycle.isSyncing,
    lifecycle.lifecycleState,
    lifecycle.needsMigrationReview,
    migrationReviewDismissed,
    setLifecycleStatus,
  ]);

  useEffect(() => {
    if (!retryRequestCount || !hydrated || authLoading || !userId) return;

    emergencyContactsService.resetBackendState({ userId });
    if (migrationStatus === "error") {
      setMigrationStatus("idle");
    }
    void query.refetch({ cancelRefetch: false });
  }, [
    authLoading,
    hydrated,
    migrationStatus,
    query,
    retryRequestCount,
    setMigrationStatus,
    userId,
  ]);

  return {
    queryKey: userId ? emergencyContactsQueryKeys.list(userId) : null,
    hydrated,
    serverBacked,
    backendUnavailable,
  };
}

export default useEmergencyContactsBootstrap;

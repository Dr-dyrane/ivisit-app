import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useMedicalProfileStore } from "../../stores/medicalProfileStore";
import { useMedicalProfileQuery } from "./useMedicalProfileQuery";
import { useMedicalProfileRealtime } from "./useMedicalProfileRealtime";
import { useMedicalProfileLifecycle } from "./useMedicalProfileLifecycle";
import { medicalProfileQueryKeys } from "./medicalProfile.queryKeys";

// PULLBACK NOTE: Medical profile bootstrap extraction.

export function useMedicalProfileBootstrap() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ? String(user.id) : null;

  const hydrated = useMedicalProfileStore((state) => state.hydrated);
  const ownerUserId = useMedicalProfileStore((state) => state.ownerUserId);
  const mutationCount = useMedicalProfileStore((state) => state.mutationCount);
  const retryRequestCount = useMedicalProfileStore(
    (state) => state.retryRequestCount,
  );
  const hydrateFromServer = useMedicalProfileStore(
    (state) => state.hydrateFromServer,
  );
  const markHydrated = useMedicalProfileStore((state) => state.markHydrated);
  const resetMedicalProfileState = useMedicalProfileStore(
    (state) => state.resetMedicalProfileState,
  );
  const setLifecycleStatus = useMedicalProfileStore(
    (state) => state.setLifecycleStatus,
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!userId) {
      if (ownerUserId) {
        resetMedicalProfileState(null);
      }
      return;
    }

    if (ownerUserId && ownerUserId !== userId) {
      resetMedicalProfileState(userId);
      return;
    }

    if (!ownerUserId) {
      markHydrated(userId);
    }
  }, [hydrated, markHydrated, ownerUserId, resetMedicalProfileState, userId]);

  const query = useMedicalProfileQuery({
    userId,
    enabled: hydrated && !authLoading && Boolean(userId),
  });

  useMedicalProfileRealtime({
    userId,
    enabled: hydrated && !authLoading && Boolean(userId) && query.isSuccess,
  });

  useEffect(() => {
    if (!userId || !query.isSuccess) return;
    hydrateFromServer(query.data || {}, userId);
  }, [hydrateFromServer, query.data, query.isSuccess, userId]);

  const lifecycle = useMedicalProfileLifecycle({
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
    queryKey: userId ? medicalProfileQueryKeys.detail(userId) : null,
    hydrated,
  };
}

export default useMedicalProfileBootstrap;

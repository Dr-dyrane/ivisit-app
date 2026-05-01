import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { VISIT_STATUS } from "../../constants/visits";
import { selectVisits } from "../../stores/visitsSelectors";
import { useVisitsStore } from "../../stores/visitsStore";
import { useVisitsMutations } from "./useVisitsMutations";
import { visitsQueryKeys } from "./visits.queryKeys";

// PULLBACK NOTE: Visits compatibility facade hook.
// OLD: provider owned fetch observer, realtime, local collection state, and CRUD.
// NEW: bootstrap runs once at runtime; this hook exposes canonical visit data,
// status, and mutations to all legacy consumers.

const EMPTY_VISIT_STATS = {
  total: 0,
  upcoming: 0,
  completed: 0,
  cancelled: 0,
  inProgress: 0,
};

export function useVisitsFacade() {
  const { user } = useAuth();
  const userId = user?.id ? String(user.id) : null;
  const queryClient = useQueryClient();

  const visits = useVisitsStore(selectVisits);
  const hydrated = useVisitsStore((state) => state.hydrated);
  const ownerUserId = useVisitsStore((state) => state.ownerUserId);
  const isSyncing = useVisitsStore((state) => state.isSyncing);
  const isReady = useVisitsStore((state) => state.isReady);
  const lifecycleError = useVisitsStore((state) => state.lifecycleError);
  const requestVisitsRetry = useVisitsStore(
    (state) => state.requestVisitsRetry,
  );

  const mutations = useVisitsMutations({ userId });

  const refreshVisits = useCallback(async () => {
    if (!userId) return [];
    await queryClient.invalidateQueries({
      queryKey: visitsQueryKeys.list(userId),
      exact: true,
    });
    await queryClient.refetchQueries({
      queryKey: visitsQueryKeys.list(userId),
      exact: true,
    });
    return queryClient.getQueryData(visitsQueryKeys.list(userId)) || [];
  }, [queryClient, userId]);

  const safeVisits = useMemo(() => {
    if (!userId) return [];
    if (ownerUserId && ownerUserId !== userId) return [];
    return visits;
  }, [ownerUserId, userId, visits]);

  const safeStats = useMemo(() => {
    if (!userId) {
      return EMPTY_VISIT_STATS;
    }
    if (ownerUserId && ownerUserId !== userId) {
      return EMPTY_VISIT_STATS;
    }
    return {
      total: safeVisits.length,
      upcoming: safeVisits.filter(
        (visit) => visit.status === VISIT_STATUS.UPCOMING,
      ).length,
      completed: safeVisits.filter(
        (visit) => visit.status === VISIT_STATUS.COMPLETED,
      ).length,
      cancelled: safeVisits.filter(
        (visit) => visit.status === VISIT_STATUS.CANCELLED,
      ).length,
      inProgress: safeVisits.filter(
        (visit) => visit.status === VISIT_STATUS.IN_PROGRESS,
      ).length,
    };
  }, [ownerUserId, safeVisits, userId]);

  const isLoading =
    !hydrated || (Boolean(userId) && isSyncing && safeVisits.length === 0);
  const error = mutations.error?.message || lifecycleError || null;

  return {
    visits: safeVisits,
    isLoading,
    error,
    stats: safeStats,
    addVisit: mutations.addVisit,
    updateVisit: mutations.updateVisit,
    cancelVisit: mutations.cancelVisit,
    completeVisit: mutations.completeVisit,
    deleteVisit: mutations.deleteVisit,
    refreshVisits,
    refetch: refreshVisits,
    isReady,
    retry: requestVisitsRetry,
  };
}

export default useVisitsFacade;

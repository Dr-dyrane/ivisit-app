import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { visitsService } from "../../services/visitsService";
import { visitsQueryKeys } from "./visits.queryKeys";

// PULLBACK NOTE: Visits five-layer pass - realtime invalidation bridge.
// Owns: user-scoped visit invalidation only.
// Does NOT own: direct cache mutation; Query remains the convergence layer.

export function useVisitsRealtime({ userId, enabled = true }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !userId) return undefined;

    const subscription = visitsService.subscribe(userId, (payload) => {
      queryClient.invalidateQueries({
        queryKey: visitsQueryKeys.list(userId),
        exact: true,
      });

      const visitId = payload?.new?.id || payload?.old?.id || null;
      if (visitId) {
        queryClient.invalidateQueries({
          queryKey: visitsQueryKeys.detail(visitId, userId),
          exact: true,
        });
      }
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [enabled, queryClient, userId]);
}

export default useVisitsRealtime;

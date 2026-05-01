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

    const subscription = visitsService.subscribe(userId, () => {
      queryClient.invalidateQueries({
        queryKey: visitsQueryKeys.list(userId),
      });
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [enabled, queryClient, userId]);
}

export default useVisitsRealtime;

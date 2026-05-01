import { useQuery } from "@tanstack/react-query";
import { visitsService } from "../../services/visitsService";
import { visitsQueryKeys } from "./visits.queryKeys";

// PULLBACK NOTE: Visits five-layer pass - Layer 2 read lane.
// Owns: canonical visits query only. Store hydration, realtime, and lifecycle
// remain in adjacent layers.

export function useVisitsQuery({ userId, enabled = true }) {
  return useQuery({
    queryKey: visitsQueryKeys.list(userId),
    queryFn: async () => visitsService.list({ userId }),
    enabled: enabled && Boolean(userId),
    staleTime: 30 * 1000,
  });
}

export default useVisitsQuery;

import { useQuery } from "@tanstack/react-query";
import { notificationsService } from "../../services/notificationsService";
import { notificationsQueryKeys } from "./notifications.queryKeys";

// PULLBACK NOTE: Notifications five-layer pass - Layer 2 read lane.
// Owns: canonical server query only. Store hydration and lifecycle are upstream/downstream concerns.

export function useNotificationsQuery({ userId, enabled = true }) {
  return useQuery({
    queryKey: notificationsQueryKeys.list(userId),
    queryFn: async () => notificationsService.list({ userId }),
    enabled: enabled && Boolean(userId),
    staleTime: 30 * 1000,
  });
}

export default useNotificationsQuery;

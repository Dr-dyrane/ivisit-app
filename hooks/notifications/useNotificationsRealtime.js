import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { notificationsService } from "../../services/notificationsService";
import { notificationsQueryKeys } from "./notifications.queryKeys";

// PULLBACK NOTE: Notifications five-layer pass - Supabase realtime bridge.
// Owns: user-scoped realtime invalidation only.
// Does NOT own: direct UI mutation; Query remains the convergence layer.

export function useNotificationsRealtime({ userId, enabled = true }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !userId) return undefined;

    const subscription = notificationsService.subscribe(userId, () => {
      queryClient.invalidateQueries({
        queryKey: notificationsQueryKeys.list(userId),
      });
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [enabled, queryClient, userId]);
}

export default useNotificationsRealtime;

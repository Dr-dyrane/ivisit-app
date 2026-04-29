import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { emergencyContactsService } from "../../services/emergencyContactsService";
import { emergencyContactsQueryKeys } from "./emergencyContacts.queryKeys";

// PULLBACK NOTE: EmergencyContacts five-layer pass - Supabase realtime bridge.
// Owns: user-scoped realtime invalidation only.
// Does NOT own: direct UI mutation or store writes; Query remains the convergence layer.

export function useEmergencyContactsRealtime({ userId, enabled = true }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !userId) return undefined;

    const subscription = emergencyContactsService.subscribe(userId, () => {
      queryClient.invalidateQueries({
        queryKey: emergencyContactsQueryKeys.list(userId),
      });
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [enabled, queryClient, userId]);
}

export default useEmergencyContactsRealtime;

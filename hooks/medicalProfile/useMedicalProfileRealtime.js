import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { medicalProfileService } from "../../services/medicalProfileService";
import { medicalProfileQueryKeys } from "./medicalProfile.queryKeys";

// PULLBACK NOTE: Medical profile realtime invalidation bridge.

export function useMedicalProfileRealtime({ userId, enabled = true }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !userId) return undefined;

    const subscription = medicalProfileService.subscribe(userId, () => {
      queryClient.invalidateQueries({
        queryKey: medicalProfileQueryKeys.detail(userId),
      });
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [enabled, queryClient, userId]);
}

export default useMedicalProfileRealtime;

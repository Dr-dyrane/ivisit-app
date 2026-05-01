import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { helpSupportService } from "../../services/helpSupportService";
import { helpSupportQueryKeys } from "./helpSupport.queryKeys";

export function useSupportTicketsRealtime({ userId, enabled = true }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !userId) return undefined;

    const subscription = helpSupportService.subscribe(userId, () => {
      queryClient.invalidateQueries({
        queryKey: helpSupportQueryKeys.tickets(userId),
      });
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [enabled, queryClient, userId]);
}

export default useSupportTicketsRealtime;

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { emergencyContactsService } from "../../services/emergencyContactsService";
import { emergencyContactsQueryKeys } from "./emergencyContacts.queryKeys";

// PULLBACK NOTE: EmergencyContacts five-layer pass - Layer 2 (TanStack Query read lane)
// Owns: canonical server fetch contract and invalidation helper.
// Does NOT own: optimistic writes, realtime subscription wiring, or screen composition.

const STALE_TIME_MS = 30 * 1000;

export function useEmergencyContactsQuery({ userId, enabled = true }) {
  return useQuery({
    queryKey: emergencyContactsQueryKeys.list(userId),
    queryFn: () => emergencyContactsService.list({ userId }),
    enabled: enabled && Boolean(userId),
    staleTime: STALE_TIME_MS,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData,
  });
}

export function useInvalidateEmergencyContacts() {
  const queryClient = useQueryClient();
  return useCallback(
    (userId) =>
      // One invalidation contract keeps realtime and mutation settlement aligned on the same cache lane.
      queryClient.invalidateQueries({
        queryKey: userId
          ? emergencyContactsQueryKeys.list(userId)
          : emergencyContactsQueryKeys.all,
      }),
    [queryClient],
  );
}

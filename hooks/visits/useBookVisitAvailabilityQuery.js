import { useQuery } from "@tanstack/react-query";
import { scheduledVisitsService } from "../../services/scheduledVisitsService";
import { scheduledVisitQueryKeys } from "./scheduledVisits.queryKeys";
import { toValidIsoString } from "../../utils/scheduledVisitProjection";

export function useBookVisitAvailabilityQuery({
  hospitalId,
  specialty,
  careMode,
  fromAt,
  toAt,
  timezoneConfirmedAt,
  enabled = true,
}) {
  const hasConfirmation = Boolean(toValidIsoString(timezoneConfirmedAt));
  return useQuery({
    queryKey: scheduledVisitQueryKeys.availability({
      hospitalId,
      specialty,
      careMode,
      fromAt,
      toAt,
      timezoneConfirmedAt,
    }),
    queryFn: () =>
      scheduledVisitsService.getAvailability({
        hospitalId,
        specialty,
        careMode,
        fromAt,
        toAt,
        timezoneConfirmedAt,
      }),
    enabled:
      enabled &&
      Boolean(hospitalId && specialty && careMode && fromAt && toAt) &&
      hasConfirmation,
    staleTime: 30 * 1000,
    refetchOnReconnect: true,
  });
}

export default useBookVisitAvailabilityQuery;

import { useQuery } from "@tanstack/react-query";
import { serviceCostService } from "../../services/serviceCostService";
import { bookVisitQueryKeys } from "./bookVisit.queryKeys";

// PULLBACK NOTE: Book Visit Layer 2.
// Owns: quote/cost fetch timing and caching only.
export function useBookVisitQuoteQuery({
  userId,
  bookingType,
  hospitalId,
  enabled = true,
}) {
  return useQuery({
    queryKey: bookVisitQueryKeys.quote({
      userId,
      type: bookingType,
      hospitalId,
    }),
    queryFn: async () =>
      serviceCostService.calculateEmergencyCost("consultation", {
        hospitalId: hospitalId || null,
        isUrgent: false,
      }),
    enabled: enabled && Boolean(bookingType),
    staleTime: 30 * 1000,
  });
}

export default useBookVisitQuoteQuery;

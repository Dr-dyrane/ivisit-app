import { useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { scheduledVisitsService } from "../../services/scheduledVisitsService";
import { visitsService } from "../../services/visitsService";
import { visitsQueryKeys } from "./visits.queryKeys";
import { scheduledVisitQueryKeys } from "./scheduledVisits.queryKeys";
import { primeScheduledVisitCache } from "./scheduledVisitCache";

export function useScheduledVisitMutations({ userId = null } = {}) {
  const queryClient = useQueryClient();

  const primeScheduledTruth = useCallback(
    (visit) => {
      return primeScheduledVisitCache({
        queryClient,
        visit,
        userId,
        normalizeVisit: visitsService.fromDbRow,
        detailKey: visitsQueryKeys.detail(visit?.id, userId),
        listKey: userId ? visitsQueryKeys.list(userId) : null,
      });
    },
    [queryClient, userId],
  );

  const invalidateScheduledTruth = useCallback(
    async (visitId = null) => {
      const invalidations = [
        queryClient.invalidateQueries({
          queryKey: scheduledVisitQueryKeys.availabilityRoot,
        }),
        queryClient.invalidateQueries({
          queryKey: visitsQueryKeys.all,
        }),
      ];
      if (userId) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: visitsQueryKeys.list(userId),
            exact: true,
          }),
        );
      }
      if (visitId) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: visitsQueryKeys.detail(visitId, userId),
          }),
        );
      }
      await Promise.all(invalidations);
    },
    [queryClient, userId],
  );

  const bookingMutation = useMutation({
    mutationFn: (input) => scheduledVisitsService.book(input),
    onSuccess: (visit) => {
      primeScheduledTruth(visit);
      void invalidateScheduledTruth(visit?.id || null).catch((error) => {
        console.warn("[scheduledVisits] Booking reconciliation failed:", error);
      });
    },
  });

  const transitionMutation = useMutation({
    mutationFn: (input) => scheduledVisitsService.transition(input),
    onSuccess: (visit) => {
      primeScheduledTruth(visit);
      void invalidateScheduledTruth(visit?.id || null).catch((error) => {
        console.warn("[scheduledVisits] Lifecycle reconciliation failed:", error);
      });
    },
  });

  return useMemo(
    () => ({
      bookVisit: bookingMutation.mutateAsync,
      transitionVisit: transitionMutation.mutateAsync,
      primeScheduledTruth,
      invalidateScheduledTruth,
      isBooking: bookingMutation.isPending,
      isTransitioning: transitionMutation.isPending,
      bookingError: bookingMutation.error || null,
      transitionError: transitionMutation.error || null,
      resetBooking: bookingMutation.reset,
      resetTransition: transitionMutation.reset,
    }),
    [
      bookingMutation.error,
      bookingMutation.isPending,
      bookingMutation.mutateAsync,
      bookingMutation.reset,
      invalidateScheduledTruth,
      primeScheduledTruth,
      transitionMutation.error,
      transitionMutation.isPending,
      transitionMutation.mutateAsync,
      transitionMutation.reset,
    ],
  );
}

export default useScheduledVisitMutations;

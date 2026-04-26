import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useEmergencyTripStore } from "../../stores/emergencyTripStore";
import { emergencyRequestsService } from "../../services/emergencyRequestsService";

const ACTIVE_TRIP_KEY = "activeTrip";
const STALE_TIME = 10 * 1000; // 10 seconds
const REFETCH_INTERVAL = 10 * 1000; // 10 seconds for live tracking

/**
 * useActiveTripQuery
 *
 * TanStack Query for active trip + auto-sync to Zustand.
 * Replaces manual syncActiveTripsFromServer.
 */
export function useActiveTripQuery() {
  const setTrip = useEmergencyTripStore((s) => s.setActiveAmbulanceTrip);
  const setBed = useEmergencyTripStore((s) => s.setActiveBedBooking);

  const query = useQuery({
    queryKey: [ACTIVE_TRIP_KEY],
    queryFn: async () => {
      const trips = await emergencyRequestsService.list();
      return {
        ambulanceTrip: trips?.find(
          (t) => t.status !== "completed" && t.status !== "cancelled"
        ),
        bedBooking: null, // TODO: Add bed booking service
      };
    },
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Sync server → Zustand (then to Jotai via useTripSync)
  useEffect(() => {
    if (query.data) {
      setTrip(query.data.ambulanceTrip);
      setBed(query.data.bedBooking);
    }
  }, [query.data, setTrip, setBed]);

  return query;
}

/**
 * useStartTripMutation
 *
 * Start ambulance trip with optimistic update.
 */
export function useStartTripMutation() {
  const queryClient = useQueryClient();
  const setTrip = useEmergencyTripStore((s) => s.setActiveAmbulanceTrip);

  return useMutation({
    mutationFn: emergencyRequestsService.create,
    onMutate: async (newTrip) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: [ACTIVE_TRIP_KEY] });

      // Snapshot previous value
      const previous = queryClient.getQueryData([ACTIVE_TRIP_KEY]);

      // Optimistically update Zustand
      setTrip({ ...newTrip, status: "pending", isOptimistic: true });

      return { previous };
    },
    onError: (err, newTrip, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData([ACTIVE_TRIP_KEY], context.previous);
      }
    },
    onSettled: () => {
      // Refetch to get real data
      queryClient.invalidateQueries({ queryKey: [ACTIVE_TRIP_KEY] });
    },
  });
}

/**
 * useStopTripMutation
 *
 * Stop/cancel trip.
 */
export function useStopTripMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emergencyRequestsService.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ACTIVE_TRIP_KEY] });
    },
  });
}

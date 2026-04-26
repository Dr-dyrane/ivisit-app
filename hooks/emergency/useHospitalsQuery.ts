import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { hospitalsService } from "../../services/hospitalsService";

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const REFETCH_INTERVAL = 30 * 1000; // 30 seconds for live availability

/**
 * useHospitalsQuery
 *
 * TanStack Query hook for fetching hospitals.
 * Replaces useHospitals with automatic caching and background refetching.
 *
 * @param {Object} params
 * @param {Object} params.location - User location { latitude, longitude }
 * @param {boolean} params.enabled - Whether to enable the query
 * @returns {Object} Query result with hospitals data
 */
export function useHospitalsQuery({ location, enabled = true }) {
  const queryClient = useQueryClient();

  const queryKey = ["hospitals", location?.latitude, location?.longitude];

  const {
    data: hospitals = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!location?.latitude || !location?.longitude) {
        return [];
      }
      return hospitalsService.listNearby(
        location.latitude,
        location.longitude,
        10 // 10km radius
      );
    },
    enabled: enabled && !!location?.latitude && !!location?.longitude,
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData, // Keep old data while fetching
  });

  // Manual refresh function
  const refresh = useCallback(() => {
    refetch({ cancelRefetch: false });
  }, [refetch]);

  // Invalidate cache (useful after mutations)
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["hospitals"] });
  }, [queryClient]);

  return {
    hospitals,
    isLoading,
    isError,
    error,
    refresh,
    invalidate,
  };
}

/**
 * useHospitalByIdQuery
 *
 * Fetch a single hospital by ID.
 *
 * @param {string} hospitalId - Hospital ID
 * @param {boolean} enabled - Whether to enable the query
 */
export function useHospitalByIdQuery(hospitalId, enabled = true) {
  return useQuery({
    queryKey: ["hospital", hospitalId],
    queryFn: () => hospitalsService.getById(hospitalId),
    enabled: enabled && !!hospitalId,
    staleTime: STALE_TIME,
  });
}

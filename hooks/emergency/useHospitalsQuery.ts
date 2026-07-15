import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useEffect, useRef } from "react";
import { hospitalsService } from "../../services/hospitalsService";
import { demoEcosystemService } from "../../services/demoEcosystemService";

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
interface UseHospitalsQueryParams {
  location?: { latitude: number; longitude: number } | null;
  enabled?: boolean;
}

export function useHospitalsQuery({ location, enabled = true }: UseHospitalsQueryParams) {
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

// =============================================================================
// PULLBACK NOTE: EXP-7 — useEmergencyHospitalsQuery
// OLD: useEmergencyHospitalSync imported useHospitals (useState + module cache — L2 violation)
//      useHospitals used useEffect([userLocation]) to trigger fetches — violates guardrails §1
// NEW: useEmergencyHospitalsQuery — proper L2 hook, queryKey drives refetch
//      Adds: allHospitals split, demoModeEnabled, userId bootstrap, 3dp bucket precision,
//            discoverNearby (50km emergency radius), placeholderData, demo bootstrap useEffect
// Contract matches what useEmergencyHospitalSync destructures:
//   { hospitals (dbHospitals), allHospitals (discoveredDbHospitals), isLoading, refetch }
// =============================================================================

const LOCATION_BUCKET_PRECISION = 3; // ≈111m — prevents GPS-drift re-fetch thrash

const bucketCoord = (n: number | undefined | null): string | null => {
  const num = Number(n);
  return Number.isFinite(num) ? num.toFixed(LOCATION_BUCKET_PRECISION) : null;
};

const calculateRelevanceScore = (hospital: any): number => {
  let score = 100;
  score -= Math.min((hospital.distanceKm || 0) * 5, 50);
  score += Math.min((hospital.rating || 0) * 5, 25);
  if (hospital.verified) score += 15;
  if ((hospital.availableBeds || 0) > 0) score += 10;
  return Math.max(0, score);
};

const categorizeHospitals = (hospitals: any[]) => ({
  immediate: hospitals.filter((h) => h.distanceKm <= 5),
  nearby: hospitals.filter((h) => h.distanceKm > 5 && h.distanceKm <= 15),
  extended: hospitals.filter((h) => h.distanceKm > 15 && h.distanceKm <= 50),
});

const getDisplayHospitals = (hospitals: any[]): any[] => {
  const cat = categorizeHospitals(hospitals);
  let display = [...cat.immediate, ...cat.nearby];
  if (display.length < 3 && cat.extended.length > 0) {
    display = [...display, ...cat.extended.slice(0, 5 - display.length)];
  }
  return display
    .map((h) => ({ ...h, relevanceScore: calculateRelevanceScore(h) }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
};

interface UseEmergencyHospitalsQueryOptions {
  location?: { latitude: number; longitude: number } | null;
  demoModeEnabled?: boolean;
  userId?: string | null;
}

/**
 * useEmergencyHospitalsQuery
 *
 * Full-featured L2 TanStack Query hook for the emergency hospital sync layer.
 * Replaces useHospitals (useState + module-level SWR cache — L2 violation).
 * queryKey drives refetch on location/demo change — no useEffect needed.
 */
export function useEmergencyHospitalsQuery({
  location = null,
  demoModeEnabled = true,
  userId = null,
}: UseEmergencyHospitalsQueryOptions = {}) {
  const queryClient = useQueryClient();

  const lat = location?.latitude;
  const lng = location?.longitude;
  const latBucket = bucketCoord(lat);
  const lngBucket = bucketCoord(lng);
  const hasLocation = latBucket !== null && lngBucket !== null;

  const queryKey = ["hospitals", latBucket, lngBucket, demoModeEnabled];

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      // hasLocation guard above ensures lat/lng are valid numbers when queryFn runs
      const definedLat = lat as number;
      const definedLng = lng as number;
      const raw = await hospitalsService.discoverNearby(definedLat, definedLng, 50000);
      const source = raw.filter((h: any) => h?.isDispatchReady === true);
      return {
        allHospitals: raw,
        displayHospitals: getDisplayHospitals(source).map((hospital: any) => ({
          ...hospital,
          dynamicWaitTime: hospitalsService.calculateDynamicWaitTime(hospital, { latitude: definedLat, longitude: definedLng }),
        })),
        categories: categorizeHospitals(source),
      };
    },
    enabled: hasLocation,
    staleTime: 2 * 60 * 1000,  // 2 min — mirrors previous HOSPITAL_CACHE_TTL_MS
    gcTime: 5 * 60 * 1000,     // 5 min — survive unmount/remount (instant re-load)
    refetchOnWindowFocus: false,
    placeholderData: (prev: any) => prev, // keep prior location's data during transition
  });

  const allHospitals = useMemo(() => data?.allHospitals ?? [], [data]);
  const hospitals = useMemo(() => data?.displayHospitals ?? [], [data]);
  const categories = useMemo(() => data?.categories ?? {}, [data]);

  // Demo bootstrap — real side-effect (external provisioning), correct useEffect use.
  // bootstrapKeyRef deduplicates so it only fires once per location+user combination.
  const bootstrapKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!demoModeEnabled || !hasLocation || !userId) return;
    const key = `${latBucket}:${lngBucket}:${userId}`;
    if (bootstrapKeyRef.current === key) return;
    bootstrapKeyRef.current = key;
    (async () => {
      try {
        const provisioningUserId = await demoEcosystemService.getProvisioningUserId(userId);
        await demoEcosystemService.ensureDemoEcosystemForLocation({
          userId: provisioningUserId,
          latitude: lat,
          longitude: lng,
          radiusKm: 50,
          onProgress: undefined,
        });
        queryClient.invalidateQueries({ queryKey: ["hospitals", latBucket, lngBucket] });
      } catch (err) {
        console.warn("[useEmergencyHospitalsQuery] Demo bootstrap skipped:", err);
      }
    })();
  }, [demoModeEnabled, hasLocation, latBucket, lngBucket, userId, lat, lng, queryClient]);

  const manualRefetch = useCallback(() => {
    queryClient.removeQueries({ queryKey });
    refetch();
  }, [queryClient, queryKey, refetch]);

  return {
    hospitals,
    allHospitals,
    categories,
    isLoading,
    isFetching,
    isError,
    error,
    refetch: manualRefetch,
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
export function useHospitalByIdQuery(hospitalId: string, enabled = true) {
  return useQuery({
    queryKey: ["hospital", hospitalId],
    queryFn: () => hospitalsService.getById(hospitalId),
    enabled: enabled && !!hospitalId,
    staleTime: STALE_TIME,
  });
}

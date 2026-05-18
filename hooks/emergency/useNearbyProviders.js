// hooks/emergency/useNearbyProviders.js
//
// EXPLORE-CARE-01 — EXP-6: Category Provider Lists
//
// TanStack Query hook for fetching nearby providers by category (explore mode).
// Separate from useHospitals / useHospitalsQuery — no emergency filter applied.
//
// Query key: ["providers", providerCategory, lat, lng]
// Caller: MapProviderListSheet, explore category views

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { hospitalsService } from "../../services/hospitalsService";
import { PROVIDER_TYPES, EXPLORE_CATEGORY_META } from "../../constants/providerTypes";

const STALE_TIME = 5 * 60 * 1000;     // 5 min — category results change slowly
const GC_TIME = 10 * 60 * 1000;       // 10 min gc
const DEFAULT_RADIUS = 20000;          // 20km for explore (tighter than emergency 50km)
const DEFAULT_LIMIT = 15;

/**
 * useNearbyProviders
 *
 * Fetch nearby care providers for a specific category in explore mode.
 * Does NOT apply any emergency or dispatch-eligibility filter.
 *
 * @param {Object} params
 * @param {string} params.providerCategory  - One of PROVIDER_TYPES values (e.g. 'pharmacy')
 * @param {Object} params.location          - { latitude, longitude }
 * @param {boolean} params.enabled          - Whether to enable the query
 * @param {number} [params.radius]          - Radius in meters (default 20000)
 * @param {number} [params.limit]           - Max results (default 15)
 * @param {boolean} [params.includeGoogle]  - Include Google Places (default false — cost control)
 */
export function useNearbyProviders({
  providerCategory = PROVIDER_TYPES.PHARMACY,
  location,
  enabled = true,
  radius = DEFAULT_RADIUS,
  limit = DEFAULT_LIMIT,
  includeGoogle = false,
  countryCode = null,
}) {
  const queryClient = useQueryClient();

  const lat = location?.latitude;
  const lng = location?.longitude;
  const hasLocation = Number.isFinite(lat) && Number.isFinite(lng);

  const normalizedCountryCode =
    typeof countryCode === "string" && countryCode.trim()
      ? countryCode.trim().toUpperCase()
      : (typeof location?.countryCode === "string" && location.countryCode.trim()
        ? location.countryCode.trim().toUpperCase()
        : null);

  const queryKey = ["providers", providerCategory, lat, lng, radius, includeGoogle, normalizedCountryCode];

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!hasLocation) return [];
      return hospitalsService.discoverNearbyProviders(
        lat,
        lng,
        providerCategory,
        radius,
        {
          limit,
          includeGooglePlaces: includeGoogle,
          includeMapboxPlaces: true,
          countryCode: normalizedCountryCode,
        }
      );
    },
    enabled: enabled && hasLocation && !!providerCategory,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const providers = Array.isArray(data) ? data : [];

  const refresh = useCallback(() => {
    refetch({ cancelRefetch: false });
  }, [refetch]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["providers", providerCategory] });
  }, [queryClient, providerCategory]);

  const categoryMeta = EXPLORE_CATEGORY_META[providerCategory] ?? null;

  return {
    providers,
    isLoading,
    isFetching,
    isError,
    error,
    refresh,
    invalidate,
    categoryMeta,
  };
}

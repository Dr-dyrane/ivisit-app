import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { serviceCostService } from "../../services/serviceCostService";

export const EMERGENCY_AMBULANCE_PRICING_TIERS = [
  { id: "basic", ambulanceType: "ambulance_basic" },
  { id: "advanced", ambulanceType: "ambulance_advanced" },
  { id: "critical", ambulanceType: "ambulance_critical" },
];

const toFiniteNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeDistanceKm = (value) => {
  const numeric = toFiniteNumber(value);
  if (numeric == null || numeric <= 0) return 0;
  return Math.round(numeric * 1000) / 1000;
};

export function buildEmergencyAmbulanceQuoteRows(quoteMap = {}) {
  return EMERGENCY_AMBULANCE_PRICING_TIERS.map((tier) => {
    const quote = quoteMap?.[tier.id] || null;
    if (!Number.isFinite(quote?.amount)) return null;
    return {
      id: tier.id,
      base_price: quote.amount,
      currency: quote.currency || "USD",
    };
  }).filter(Boolean);
}

// This is the only price source for ambulance cards. Raw service_pricing rows
// still describe capability/labels, while the server resolves the money total.
export function useEmergencyAmbulanceQuoteMap({
  hospitalId = null,
  distanceKm = 0,
  enabled = true,
} = {}) {
  const normalizedHospitalId =
    typeof hospitalId === "string" && hospitalId.trim().length > 0
      ? hospitalId.trim()
      : null;
  const normalizedDistance = normalizeDistanceKm(distanceKm);

  const quoteQueries = useMemo(
    () =>
      EMERGENCY_AMBULANCE_PRICING_TIERS.map((tier) => ({
        queryKey: [
          "emergency-ambulance-price",
          normalizedHospitalId,
          tier.ambulanceType,
          normalizedDistance,
        ],
        queryFn: () =>
          serviceCostService.calculateEmergencyCost("ambulance", {
            hospitalId: normalizedHospitalId,
            ambulanceType: tier.ambulanceType,
            distance: normalizedDistance,
            requireServerQuote: true,
          }),
        enabled: Boolean(enabled && normalizedHospitalId),
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
      })),
    [enabled, normalizedDistance, normalizedHospitalId],
  );

  const queryResults = useQueries({ queries: quoteQueries });

  return useMemo(() => {
    const nextMap = {};

    EMERGENCY_AMBULANCE_PRICING_TIERS.forEach((tier, index) => {
      const result = queryResults[index];
      const quote = result?.data && typeof result.data === "object"
        ? result.data
        : null;
      const amount = toFiniteNumber(
        quote?.total_cost ?? quote?.totalCost ?? quote?.total_amount,
      );

      nextMap[tier.id] = {
        amount,
        currency: quote?.currency || "USD",
        pricingSource: quote?.pricing_source || null,
        pricingIsFallback: quote?.pricing_is_fallback === true,
        isLoading: Boolean(result?.isPending || (result?.isFetching && !quote)),
        isError: Boolean(result?.isError),
      };
    });

    return nextMap;
  }, [queryResults]);
}

export default useEmergencyAmbulanceQuoteMap;

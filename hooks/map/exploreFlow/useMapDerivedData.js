// hooks/map/exploreFlow/useMapDerivedData.js
// Owns: activeMapRequest memo, discoveredHospitals, nearestHospital,
//       nearestHospitalMeta, nearbyHospitalCount, totalAvailableBeds,
//       nearbyBedHospitals, featuredHospitals, recentVisits.

import { useMemo } from "react";
import { buildActiveMapRequestModel } from "../../../components/map/core/mapActiveRequestModel";
import {
  getDiscoveredHospitals,
  getFeaturedHospitals,
  getLocalNearbyHospitals,
  getNearbyBedHospitals,
  getNearbyHospitalCount,
  getNearestHospital,
  getNearestHospitalMeta,
  getRecentVisits,
  getTotalAvailableBeds,
} from "./mapExploreFlow.derived";

/**
 * useMapDerivedData
 *
 * All memo-derived data for the map explore flow.
 * nowMs is provided by the caller (via useMapTracking) so that
 * activeMapRequest does NOT have a forward reference to the timer.
 */
export function useMapDerivedData({
  allHospitals,
  hospitals,
  selectedHospital,
  activeAmbulanceTrip,
  activeBedBooking,
  pendingApproval,
  ambulanceTelemetryHealth,
  sheetPayload,
  featuredHospital,
  currentLocationDetails,
  activeLocation,
  nowMs,
  visits,
}) {
  const discoveredHospitals = useMemo(
    () => getDiscoveredHospitals(allHospitals, hospitals),
    [allHospitals, hospitals],
  );

  const summaryHospitals = useMemo(
    () =>
      Array.isArray(allHospitals) && allHospitals.length > 0
        ? allHospitals.filter(Boolean)
        : discoveredHospitals,
    [allHospitals, discoveredHospitals],
  );

  const localNearbyHospitals = useMemo(
    () => getLocalNearbyHospitals(discoveredHospitals, activeLocation),
    [activeLocation, discoveredHospitals],
  );

  const localNearbySummaryHospitals = useMemo(
    () => getLocalNearbyHospitals(summaryHospitals, activeLocation),
    [activeLocation, summaryHospitals],
  );

  const nearestHospital = useMemo(
    () =>
      getNearestHospital(
        selectedHospital,
        localNearbyHospitals,
        discoveredHospitals,
        activeLocation,
      ),
    [activeLocation, discoveredHospitals, localNearbyHospitals, selectedHospital],
  );

  const nearestSummaryHospital = useMemo(
    () =>
      getNearestHospital(
        selectedHospital,
        localNearbySummaryHospitals,
        summaryHospitals,
        activeLocation,
      ),
    [activeLocation, localNearbySummaryHospitals, selectedHospital, summaryHospitals],
  );

  const nearestHospitalMeta = useMemo(
    () => getNearestHospitalMeta(nearestHospital),
    [nearestHospital],
  );

  const nearestSummaryHospitalMeta = useMemo(
    () => getNearestHospitalMeta(nearestSummaryHospital),
    [nearestSummaryHospital],
  );

  const nearbyHospitalCount = useMemo(
    () => getNearbyHospitalCount(localNearbyHospitals),
    [localNearbyHospitals],
  );

  const totalAvailableBeds = useMemo(
    () => getTotalAvailableBeds(localNearbyHospitals),
    [localNearbyHospitals],
  );

  const nearbyBedHospitals = useMemo(
    () => getNearbyBedHospitals(localNearbyHospitals),
    [localNearbyHospitals],
  );

  const featuredHospitals = useMemo(
    () => getFeaturedHospitals(discoveredHospitals),
    [discoveredHospitals],
  );

  const recentVisits = useMemo(() => getRecentVisits(visits), [visits]);

  const activeMapRequest = useMemo(
    () =>
      buildActiveMapRequestModel({
        activeAmbulanceTrip,
        activeBedBooking,
        pendingApproval,
        ambulanceTelemetryHealth,
        hospitals: discoveredHospitals,
        allHospitals,
        payload: sheetPayload,
        preferredHospital: sheetPayload?.hospital || null,
        fallbackHospital: featuredHospital,
        nearestHospital,
        currentLocationDetails,
        nowMs,
      }),
    [
      activeAmbulanceTrip,
      activeBedBooking,
      allHospitals,
      ambulanceTelemetryHealth,
      currentLocationDetails,
      discoveredHospitals,
      featuredHospital,
      nearestHospital,
      pendingApproval,
      sheetPayload,
      nowMs,
    ],
  );

  return {
    discoveredHospitals,
    nearestSummaryHospital,
    nearestSummaryHospitalMeta,
    nearestHospital,
    nearestHospitalMeta,
    nearbyHospitalCount,
    totalAvailableBeds,
    nearbyBedHospitals,
    featuredHospitals,
    recentVisits,
    activeMapRequest,
  };
}

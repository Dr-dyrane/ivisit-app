// hooks/map/exploreFlow/useMapDerivedData.js
// Owns: activeMapRequest memo, discoveredHospitals, nearestHospital,
//       nearestHospitalMeta, nearbyHospitalCount, totalAvailableBeds,
//       nearbyBedHospitals, featuredHospitals, recentVisits.

import { useMemo } from "react";
import { buildActiveMapRequestModel } from "../../../components/map/core/mapActiveRequestModel";
import {
  getDiscoveredHospitals,
  getFeaturedHospitals,
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
  nowMs,
  visits,
}) {
  const discoveredHospitals = useMemo(
    () => getDiscoveredHospitals(allHospitals, hospitals),
    [allHospitals, hospitals],
  );

  const nearestHospital = useMemo(
    () => getNearestHospital(selectedHospital, discoveredHospitals),
    [discoveredHospitals, selectedHospital],
  );

  const nearestHospitalMeta = useMemo(
    () => getNearestHospitalMeta(nearestHospital),
    [nearestHospital],
  );

  const nearbyHospitalCount = useMemo(
    () => getNearbyHospitalCount(discoveredHospitals),
    [discoveredHospitals],
  );

  const totalAvailableBeds = useMemo(
    () => getTotalAvailableBeds(discoveredHospitals),
    [discoveredHospitals],
  );

  const nearbyBedHospitals = useMemo(
    () => getNearbyBedHospitals(discoveredHospitals),
    [discoveredHospitals],
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

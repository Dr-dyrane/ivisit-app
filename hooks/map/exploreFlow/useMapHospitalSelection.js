// hooks/map/exploreFlow/useMapHospitalSelection.js
// PULLBACK NOTE: Extracted from useMapExploreFlow.js
// Owns: hospital derived state, auto-selection effect, hospital interaction handlers

import { useCallback, useEffect, useMemo } from "react";
import {
  getDiscoveredHospitals,
  getFeaturedHospitals,
  getNearbyBedHospitals,
  getNearbyHospitalCount,
  getNearestHospital,
  getNearestHospitalMeta,
  getTotalAvailableBeds,
} from "./mapExploreFlow.derived";
import { resolveMapFlowHospital } from "./mapExploreFlow.transitions";

/**
 * useMapHospitalSelection
 *
 * Derives hospital lists, nearest hospital, and counts.
 * Manages auto-selection of first hospital when list loads.
 * Provides hospital promotion, cycling, map press and featured hospital handlers.
 */
export function useMapHospitalSelection({
  hospitals,
  allHospitals,
  selectedHospital,
  selectedHospitalId,
  selectHospital,
  setFeaturedHospital,
  featuredHospital,
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

  useEffect(() => {
    if (!Array.isArray(discoveredHospitals) || discoveredHospitals.length === 0)
      return;
    if (
      selectedHospitalId &&
      discoveredHospitals.some((hospital) => hospital?.id === selectedHospitalId)
    ) {
      return;
    }
    if (discoveredHospitals[0]?.id) {
      selectHospital(discoveredHospitals[0].id);
    }
  }, [discoveredHospitals, selectHospital, selectedHospitalId]);

  const promoteHospitalSelection = useCallback(
    (hospital) => {
      if (!hospital?.id) return hospital || null;
      selectHospital(hospital.id);
      setFeaturedHospital(hospital);
      return hospital;
    },
    [selectHospital, setFeaturedHospital],
  );

  const handleOpenFeaturedHospital = useCallback(
    (hospital) => {
      if (hospital?.id) {
        selectHospital(hospital.id);
      }
    },
    [selectHospital],
  );

  const handleCycleFeaturedHospital = useCallback(() => {
    const pool = Array.isArray(discoveredHospitals)
      ? discoveredHospitals.filter((entry) => entry?.id)
      : [];
    if (pool.length < 2) return;

    const currentId =
      featuredHospital?.id ??
      selectedHospital?.id ??
      nearestHospital?.id ??
      pool[0]?.id ??
      null;
    const currentIndex = pool.findIndex((entry) => entry?.id === currentId);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % pool.length : 0;
    const nextHospital = pool[nextIndex] ?? null;
    if (!nextHospital?.id) return;

    selectHospital(nextHospital.id);
    setFeaturedHospital(nextHospital);
  }, [
    discoveredHospitals,
    featuredHospital?.id,
    nearestHospital?.id,
    selectedHospital?.id,
    selectHospital,
    setFeaturedHospital,
  ]);

  const handleMapHospitalPress = useCallback(
    (hospital) => {
      if (hospital?.id) {
        selectHospital(hospital.id);
      }
    },
    [selectHospital],
  );

  return {
    discoveredHospitals,
    nearestHospital,
    nearestHospitalMeta,
    nearbyHospitalCount,
    totalAvailableBeds,
    nearbyBedHospitals,
    featuredHospitals,
    promoteHospitalSelection,
    handleOpenFeaturedHospital,
    handleCycleFeaturedHospital,
    handleMapHospitalPress,
  };
}

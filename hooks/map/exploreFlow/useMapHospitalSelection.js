// hooks/map/exploreFlow/useMapHospitalSelection.js
// PULLBACK NOTE: Pass 14a — stripped duplicate hospital memos
// OLD: computed discoveredHospitals, nearestHospital, featuredHospitals etc. internally
// NEW: accepts them as props from useMapDerivedData (single source of truth)
// Owns: auto-select effect + promoteHospitalSelection + handleOpenFeaturedHospital
//        + handleCycleFeaturedHospital + handleMapHospitalPress
// PULLBACK NOTE: PASS 19D — Hybrid marker selection (selectHospitalForMap + openHospitalDetail)

import { useCallback, useEffect } from "react";

/**
 * useMapHospitalSelection
 *
 * Manages auto-selection of first hospital when list loads.
 * Provides hospital promotion, cycling, map press and featured hospital handlers.
 * Derived hospital lists (discoveredHospitals, nearestHospital, etc.) are owned
 * by useMapDerivedData and passed in as props — no duplication.
 */
export function useMapHospitalSelection({
  // PULLBACK NOTE: Pass 14a — these were computed here before, now passed from useMapDerivedData (single source of truth)
  discoveredHospitals,
  nearestHospital,
  selectedHospital,
  selectedHospitalId,
  selectHospital,
  selectHospitalForMap,
  setFeaturedHospital,
  featuredHospital,
}) {
  // Auto-select the first hospital when the list first populates
  // or when the previously selected hospital leaves the discovered list
  // PULLBACK NOTE: PASS 19D — Auto-select uses EMERGENCY context selectHospital (no sheet phase change)
  useEffect(() => {
    if (!Array.isArray(discoveredHospitals) || discoveredHospitals.length === 0) {
      if (selectedHospitalId || featuredHospital?.id) {
        selectHospital(null);
        setFeaturedHospital(null);
      }
      return;
    }
    if (
      selectedHospitalId &&
      discoveredHospitals.some((hospital) => hospital?.id === selectedHospitalId)
    ) {
      return;
    }

    const fallbackHospitalId =
      nearestHospital?.id || discoveredHospitals[0]?.id || null;

    if (fallbackHospitalId) {
      selectHospital(fallbackHospitalId);
    }
  }, [
    discoveredHospitals,
    featuredHospital?.id,
    nearestHospital?.id,
    selectHospital,
    selectedHospitalId,
    setFeaturedHospital,
  ]);

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

  /**
   * Handles hospital marker press on the map.
   * Uses hybrid selectHospitalForMap to update both map flow atoms and EMERGENCY context.
   * 
   * @param {Object} hospital - The hospital object that was pressed
   * @param {string} hospital.id - The hospital ID
   * @returns {Object|null} The hospital object if selection succeeded, null otherwise
   */
  const handleMapHospitalPress = useCallback(
    (hospital) => {
      if (hospital?.id) {
        // PULLBACK NOTE: PASS 19D — Hybrid marker selection
        // Use selectHospitalForMap to update map flow atoms + EMERGENCY context
        // Return hospital for caller to open hospital detail sheet
        const result = selectHospitalForMap?.(hospital.id, { shouldOpenDetail: true });
        
        // Return hospital for caller to decide whether to open detail sheet
        return result?.hospital || null;
      }
      return null;
    },
    [selectHospitalForMap],
  );

  return {
    promoteHospitalSelection,
    handleOpenFeaturedHospital,
    handleCycleFeaturedHospital,
    handleMapHospitalPress,
  };
}

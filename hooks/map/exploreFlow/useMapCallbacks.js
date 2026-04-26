// hooks/map/exploreFlow/useMapCallbacks.js
// PULLBACK NOTE: Pass 14b — extracted from useMapExploreFlow.js
// OLD: handleChooseCare, handleOpenFeaturedHospital, handleOpenProfile,
//       handleMapReadinessChange declared inline in orchestrator
// NEW: owned here, wired via props

import { useCallback } from "react";

/**
 * useMapCallbacks
 *
 * Owns the four primary UI interaction callbacks for the map explore flow.
 * All callbacks are stable (useCallback) and prop-driven — no internal state.
 */
export function useMapCallbacks({
  isSignedIn,
  mapReadiness,
  handleOpenFeaturedHospitalBase,
  openAmbulanceDecision,
  openBedDecision,
  openHospitalDetail,
  setMapReadiness,
  setProfileModalVisible,
  setGuestProfileVisible,
  setSelectedCare,
}) {
  const handleChooseCare = useCallback(
    (mode) => {
      setSelectedCare(mode);
      if (mode === "ambulance") { openAmbulanceDecision(); return; }
      if (mode === "bed") { openBedDecision(null, "bed"); return; }
      if (mode === "both") { openAmbulanceDecision(); }
    },
    [openAmbulanceDecision, openBedDecision, setSelectedCare],
  );

  const handleOpenFeaturedHospital = useCallback(
    (hospital) => {
      handleOpenFeaturedHospitalBase(hospital);
      openHospitalDetail(hospital || null);
    },
    [handleOpenFeaturedHospitalBase, openHospitalDetail],
  );

  const handleOpenProfile = useCallback(() => {
    if (isSignedIn) { setProfileModalVisible(true); return; }
    setGuestProfileVisible(true);
  }, [isSignedIn, setGuestProfileVisible, setProfileModalVisible]);

  const handleMapReadinessChange = useCallback(
    (nextState) => {
      const next = {
        mapReady: Boolean(nextState?.mapReady),
        routeReady: Boolean(nextState?.routeReady),
        isCalculatingRoute: Boolean(nextState?.isCalculatingRoute),
      };
      if (
        mapReadiness.mapReady === next.mapReady &&
        mapReadiness.routeReady === next.routeReady &&
        mapReadiness.isCalculatingRoute === next.isCalculatingRoute
      ) { return; }
      setMapReadiness(next);
    },
    [mapReadiness, setMapReadiness],
  );

  return {
    handleChooseCare,
    handleOpenFeaturedHospital,
    handleOpenProfile,
    handleMapReadinessChange,
  };
}

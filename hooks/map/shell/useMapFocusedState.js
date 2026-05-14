// hooks/map/shell/useMapFocusedState.js
// PULLBACK NOTE: MapScreen decomposition Pass 5 — map focus + service-marker derivations extracted.
//
// Owns:
//   - paymentPreviewKind   ("ambulance" | null based on sheetPayload transport)
//   - mapHospitals         (discoveredHospitals + historyFocusedHospital injected if absent)
//   - mapFocusedHospitalId (priority: history → activeRequest → commitPayment → nearest)
//   - mapFocusedHospital   (full object resolved from mapHospitals)
//   - mapFocusedHospitalCoordinate
//   - mapServiceMarkerKind ("ambulance" | null)
//   - mapServiceMarkerCoordinate
//   - mapServiceMarkerHeading
//
// Does NOT own:
//   - discoveredHospitals / activeMapRequest / historyFocusedHospital — come from callers
//   - calculateBearing / getDestinationCoordinate — pure utils, imported here

import { useMemo } from "react";
import { MAP_SHEET_PHASES } from "../../../components/map/core/MapSheetOrchestrator";
import { MAP_ACTIVE_REQUEST_KINDS } from "../../../components/map/core/mapActiveRequestModel";
import { getDestinationCoordinate } from "../../../components/map/surfaces/hospitals/mapHospitalDetail.helpers";
import { calculateBearing } from "../../../utils/mapUtils";

export function useMapFocusedState({
  sheetPhase,
  sheetPayload,
  discoveredHospitals,
  historyFocusedHospital,
  historyVisitDetailsVisible,
  activeMapRequest,
  featuredHospital,
  nearestHospital,
  activeLocation,
}) {
  const paymentPreviewKind = useMemo(() => {
    if (sheetPhase !== MAP_SHEET_PHASES.COMMIT_PAYMENT) return null;
    const hasTransportSelection = Boolean(
      sheetPayload?.transport?.id ||
        sheetPayload?.transport?.title ||
        sheetPayload?.transport?.service_name ||
        sheetPayload?.transport?.service_type,
    );
    if (hasTransportSelection) return "ambulance";
    return null;
  }, [sheetPhase, sheetPayload?.transport]);

  const mapHospitals = useMemo(() => {
    if (!historyFocusedHospital) return discoveredHospitals;
    const alreadyPresent = discoveredHospitals.some(
      (item) => item?.id === historyFocusedHospital?.id,
    );
    return alreadyPresent
      ? discoveredHospitals
      : [historyFocusedHospital, ...discoveredHospitals];
  }, [discoveredHospitals, historyFocusedHospital]);

  const mapFocusedHospitalId = useMemo(
    () =>
      historyFocusedHospital?.id ||
      activeMapRequest?.hospitalId ||
      (sheetPhase === MAP_SHEET_PHASES.COMMIT_PAYMENT
        ? sheetPayload?.hospital?.id || null
        : null) ||
      nearestHospital?.id ||
      null,
    [
      historyFocusedHospital?.id,
      activeMapRequest?.hospitalId,
      nearestHospital?.id,
      sheetPhase,
      sheetPayload?.hospital?.id,
    ],
  );

  const mapFocusedHospital = useMemo(
    () =>
      historyFocusedHospital ||
      mapHospitals.find((item) => item?.id === mapFocusedHospitalId) ||
      activeMapRequest?.hospital ||
      featuredHospital ||
      sheetPayload?.hospital ||
      nearestHospital ||
      null,
    [
      historyFocusedHospital,
      mapHospitals,
      activeMapRequest?.hospital,
      featuredHospital,
      mapFocusedHospitalId,
      nearestHospital,
      sheetPayload?.hospital,
    ],
  );

  const mapFocusedHospitalCoordinate = useMemo(
    () => getDestinationCoordinate(mapFocusedHospital),
    [mapFocusedHospital],
  );

  const mapServiceMarkerKind = useMemo(() => {
    if (historyVisitDetailsVisible) return null;
    if (activeMapRequest?.kind === MAP_ACTIVE_REQUEST_KINDS.AMBULANCE) return "ambulance";
    if (activeMapRequest?.kind === MAP_ACTIVE_REQUEST_KINDS.PENDING) {
      return activeMapRequest?.pendingKind === MAP_ACTIVE_REQUEST_KINDS.BED ? null : "ambulance";
    }
    if (sheetPhase === MAP_SHEET_PHASES.COMMIT_PAYMENT) return paymentPreviewKind;
    return null;
  }, [
    activeMapRequest?.kind,
    activeMapRequest?.pendingKind,
    historyVisitDetailsVisible,
    paymentPreviewKind,
    sheetPhase,
  ]);

  const mapServiceMarkerCoordinate = useMemo(() => {
    const activeAmbulance = activeMapRequest?.raw?.activeAmbulanceTrip;
    if (activeAmbulance?.currentResponderLocation) return activeAmbulance.currentResponderLocation;
    // PULLBACK NOTE: Only show ambulance marker if we have valid hospital coordinates
    // OLD: Returned null coordinate causing heading calculation to fail
    // NEW: Guard against missing coordinates — no marker if no hospital location
    if (mapServiceMarkerKind === "ambulance" && mapFocusedHospitalCoordinate) {
      return mapFocusedHospitalCoordinate;
    }
    return null;
  }, [
    activeMapRequest?.raw?.activeAmbulanceTrip,
    mapFocusedHospitalCoordinate,
    mapServiceMarkerKind,
  ]);

  const mapServiceMarkerHeading = useMemo(() => {
    const activeAmbulance = activeMapRequest?.raw?.activeAmbulanceTrip;
    // Live responder heading takes priority (real-time tracking)
    if (Number.isFinite(activeAmbulance?.currentResponderHeading)) {
      return Number(activeAmbulance.currentResponderHeading);
    }
    // PULLBACK NOTE: [AMBULANCE-SPRITE-FACING] Starting sprite faces user's pickup location.
    // Calculate bearing from hospital to user location.
    const h = mapFocusedHospitalCoordinate;
    const u = activeLocation;
    // More permissive validation — truthy checks allow 0 coordinates
    const hasHospitalCoords = h && h.latitude != null && h.longitude != null;
    const hasUserCoords = u && u.latitude != null && u.longitude != null;
    if (mapServiceMarkerKind === "ambulance" && hasHospitalCoords && hasUserCoords) {
      const bearing = calculateBearing(h, u);
      // Debug logging to trace coordinate issues
      if (__DEV__) {
        console.log("[AMBULANCE-FACING]", {
          hospital: { lat: h.latitude, lng: h.longitude },
          user: { lat: u.latitude, lng: u.longitude },
          bearing: bearing,
          valid: Number.isFinite(bearing),
        });
      }
      if (Number.isFinite(bearing) && bearing >= 0 && bearing < 360) {
        return bearing;
      }
    } else if (__DEV__ && mapServiceMarkerKind === "ambulance") {
      console.warn("[AMBULANCE-FACING] Missing coords:", {
        hasHospital: hasHospitalCoords,
        hasUser: hasUserCoords,
        hospital: h,
        user: u,
      });
    }
    return null;
  }, [
    activeMapRequest?.raw?.activeAmbulanceTrip,
    activeLocation,
    mapFocusedHospitalCoordinate,
    mapServiceMarkerKind,
  ]);

  return {
    mapHospitals,
    mapFocusedHospitalId,
    mapFocusedHospital,
    mapFocusedHospitalCoordinate,
    mapServiceMarkerKind,
    mapServiceMarkerCoordinate,
    mapServiceMarkerHeading,
  };
}

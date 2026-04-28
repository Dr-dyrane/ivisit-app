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
    if (mapServiceMarkerKind === "ambulance") return mapFocusedHospitalCoordinate;
    return null;
  }, [
    activeMapRequest?.raw?.activeAmbulanceTrip,
    mapFocusedHospitalCoordinate,
    mapServiceMarkerKind,
  ]);

  const mapServiceMarkerHeading = useMemo(() => {
    const activeAmbulance = activeMapRequest?.raw?.activeAmbulanceTrip;
    if (Number.isFinite(activeAmbulance?.currentResponderHeading)) {
      return Number(activeAmbulance.currentResponderHeading);
    }
    if (mapServiceMarkerKind === "ambulance" && mapFocusedHospitalCoordinate && activeLocation) {
      return calculateBearing(mapFocusedHospitalCoordinate, activeLocation);
    }
    return 0;
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

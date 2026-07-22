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
import { EmergencyRequestStatus } from "../../../services/emergencyRequestsService";
import { calculateBearing } from "../../../utils/mapUtils";

const TRACKABLE_AMBULANCE_STATUSES = new Set([
  EmergencyRequestStatus.ACCEPTED,
  EmergencyRequestStatus.ARRIVED,
  EmergencyRequestStatus.COMPLETED,
]);

export function resolveMapServiceMarkerKind({
  historyVisitDetailsVisible,
  activeMapRequest,
  sheetPhase,
  paymentPreviewKind,
}) {
  if (historyVisitDetailsVisible) return null;
  if (activeMapRequest?.kind === MAP_ACTIVE_REQUEST_KINDS.AMBULANCE) {
    return TRACKABLE_AMBULANCE_STATUSES.has(activeMapRequest?.status)
      ? "ambulance"
      : null;
  }
  if (activeMapRequest?.kind === MAP_ACTIVE_REQUEST_KINDS.PENDING) return null;
  if (sheetPhase === MAP_SHEET_PHASES.COMMIT_PAYMENT) return paymentPreviewKind;
  return null;
}

const PROVIDER_FOCUS_PHASES = new Set([
  MAP_SHEET_PHASES.PROVIDER_LIST,
  MAP_SHEET_PHASES.PROVIDER_DETAIL,
]);

const normalizeCoordinate = (value) => {
  const latitude = Number(value?.latitude ?? value?.lat);
  const longitude = Number(value?.longitude ?? value?.lng ?? value?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
};

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
  // PULLBACK NOTE: EXP-7 fix — selectedProvider replaces sheetPayload.provider as coord source
  // OLD: only PROVIDER_DETAIL had coordinates (via sheetPayload.provider)
  // NEW: selectedProvider supplied by MapScreen so PROVIDER_LIST also drives the polyline
  selectedProvider = null,
}) {
  // PULLBACK NOTE: EXP-7 — Provider focus phase awareness
  // When in PROVIDER_LIST or PROVIDER_DETAIL, provider coordinates drive the map,
  // not a hospital. mapFocusedHospitalId returns null to suppress hospital selection.
  const isProviderFocusPhase = PROVIDER_FOCUS_PHASES.has(sheetPhase);
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
    const supplementalHospitals = [
      historyFocusedHospital,
      activeMapRequest?.hospital,
    ].filter(Boolean);
    if (supplementalHospitals.length === 0) return discoveredHospitals;
    const seen = new Set(discoveredHospitals.map((item) => item?.id).filter(Boolean));
    const missing = supplementalHospitals.filter((hospital) => {
      if (!hospital?.id || seen.has(hospital.id)) return false;
      seen.add(hospital.id);
      return true;
    });
    return missing.length > 0 ? [...missing, ...discoveredHospitals] : discoveredHospitals;
  }, [activeMapRequest?.hospital, discoveredHospitals, historyFocusedHospital]);

  const mapFocusedHospitalId = useMemo(() => {
    // Provider focus phases: suppress hospital selection entirely
    if (isProviderFocusPhase) return null;
    return (
      historyFocusedHospital?.id ||
      activeMapRequest?.hospitalId ||
      (sheetPhase === MAP_SHEET_PHASES.COMMIT_PAYMENT
        ? sheetPayload?.hospital?.id || null
        : null) ||
      nearestHospital?.id ||
      null
    );
  }, [
    isProviderFocusPhase,
    historyFocusedHospital?.id,
    activeMapRequest?.hospitalId,
    nearestHospital?.id,
    sheetPhase,
    sheetPayload?.hospital?.id,
  ]);

  const mapFocusedHospital = useMemo(() => {
    if (isProviderFocusPhase) return null;
    return (
      historyFocusedHospital ||
      mapHospitals.find((item) => item?.id === mapFocusedHospitalId) ||
      activeMapRequest?.hospital ||
      featuredHospital ||
      sheetPayload?.hospital ||
      nearestHospital ||
      null
    );
  }, [
    isProviderFocusPhase,
    historyFocusedHospital,
    mapHospitals,
    activeMapRequest?.hospital,
    featuredHospital,
    mapFocusedHospitalId,
    nearestHospital,
    sheetPayload?.hospital,
  ]);

  const mapFocusedHospitalCoordinate = useMemo(() => {
    const focusedCoordinate = getDestinationCoordinate(mapFocusedHospital);
    if (focusedCoordinate) return focusedCoordinate;
    return normalizeCoordinate(
      activeMapRequest?.raw?.activeAmbulanceTrip?.hospitalCoordinate,
    );
  }, [
    activeMapRequest?.raw?.activeAmbulanceTrip?.hospitalCoordinate,
    mapFocusedHospital,
  ]);

  const mapServiceMarkerKind = useMemo(() => {
    return resolveMapServiceMarkerKind({
      historyVisitDetailsVisible,
      activeMapRequest,
      sheetPhase,
      paymentPreviewKind,
    });
  }, [
    activeMapRequest?.kind,
    activeMapRequest?.status,
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

  // Provider focus coordinate — drives route destination and camera fit
  // when sheetPhase is PROVIDER_LIST or PROVIDER_DETAIL.
  // PULLBACK NOTE: EXP-7 fix — prefer selectedProvider.coordinates (available in both phases)
  // OLD: read from sheetPayload.provider.coordinates — only set during PROVIDER_DETAIL
  // NEW: selectedProvider prop → works in PROVIDER_LIST too (auto-selected nearest)
  const mapFocusedProviderCoordinate = useMemo(() => {
    if (!isProviderFocusPhase) return null;
    // Prefer the live selectedProvider object (set by auto-select + manual tap)
    const coords = selectedProvider?.coordinates ?? sheetPayload?.provider?.coordinates;
    if (
      coords &&
      Number.isFinite(coords.latitude) &&
      Number.isFinite(coords.longitude)
    ) {
      return { latitude: coords.latitude, longitude: coords.longitude };
    }
    return null;
  }, [
    isProviderFocusPhase,
    selectedProvider?.coordinates?.latitude,
    selectedProvider?.coordinates?.longitude,
    sheetPayload?.provider?.coordinates?.latitude,
    sheetPayload?.provider?.coordinates?.longitude,
  ]);

  // Provider type of the focused provider — used to theme the route polyline color
  const mapFocusedProviderType = useMemo(() => {
    if (!isProviderFocusPhase) return null;
    return selectedProvider?.providerType ?? sheetPayload?.provider?.providerType ?? null;
  }, [
    isProviderFocusPhase,
    selectedProvider?.providerType,
    sheetPayload?.provider?.providerType,
  ]);

  return {
    mapHospitals,
    mapFocusedHospitalId,
    mapFocusedHospital,
    mapFocusedHospitalCoordinate,
    mapFocusedProviderCoordinate,
    mapFocusedProviderType,
    mapServiceMarkerKind,
    mapServiceMarkerCoordinate,
    mapServiceMarkerHeading,
  };
}

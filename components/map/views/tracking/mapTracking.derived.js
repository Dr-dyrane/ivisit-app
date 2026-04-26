import {
  formatClockArrival,
  formatRemainingShort,
  getToneColors,
  getTrackingTone,
  isGenericTransportLabel,
  joinDisplayParts,
  resolveDistanceLabel,
  resolveBedServiceLabel,
  resolveHospitalAddress,
  resolveTransportServiceLabel,
  toTitleCaseLabel,
} from "./mapTracking.presentation";
import { EmergencyRequestStatus } from "../../../../services/emergencyRequestsService";
import { formatMapRequestDisplayId } from "../../core/mapRequestPresentation";

export function buildTrackingViewState({
  hospitals = [],
  allHospitals = [],
  hospital,
  payload,
  currentLocation,
  routeInfo,
  activeMapRequest,
  activeAmbulanceTrip,
  activeBedBooking,
  pendingApproval,
  ambulanceTelemetryHealth,
  ambulanceRemainingSeconds,
  remainingBedSeconds,
  bedStatus,
  ambulanceComputedStatus,
  resolvedStatus,
  nowMs,
  isDarkMode,
}) {
  const allKnownHospitals =
    Array.isArray(allHospitals) && allHospitals.length > 0 ? allHospitals : hospitals;
  const trackedHospitalId =
    activeMapRequest?.hospitalId ||
    activeAmbulanceTrip?.hospitalId ||
    activeBedBooking?.hospitalId ||
    pendingApproval?.hospitalId ||
    payload?.hospital?.id ||
    hospital?.id ||
    null;
  const resolvedHospital =
    activeMapRequest?.hospital ||
    hospital ||
    payload?.hospital ||
    allKnownHospitals.find((entry) => entry?.id === trackedHospitalId) ||
    null;
  const hospitalName =
    resolvedHospital?.name ||
    activeMapRequest?.hospitalName ||
    activeAmbulanceTrip?.hospitalName ||
    activeBedBooking?.hospitalName ||
    pendingApproval?.hospitalName ||
    "Hospital";
  const hospitalAddress = resolveHospitalAddress(resolvedHospital);
  const pickupLabel = currentLocation?.primaryText || "My location";
  const pickupDetail =
    currentLocation?.secondaryText || currentLocation?.formattedAddress || "";
  const responder = activeAmbulanceTrip?.assignedAmbulance || null;
  const responderName =
    responder?.crew?.[0] ||
    responder?.name ||
    responder?.callSign ||
    responder?.vehicleNumber ||
    responder?.type ||
    null;
  const responderPlate = responder?.vehicleNumber || responder?.plate || null;
  const responderMetaText = joinDisplayParts([
    responder?.type || null,
    responder?.rating ? `${responder.rating}` : null,
  ]);
  const responderSafetyMeta = responderPlate || responderMetaText || null;
  const trackingKind = activeMapRequest?.kind || (
    activeAmbulanceTrip?.requestId
      ? "ambulance"
      : activeBedBooking?.requestId
        ? "bed"
        : pendingApproval?.requestId
          ? "pending"
          : "idle"
  );
  const remainingSeconds =
    trackingKind === "ambulance"
      ? Number.isFinite(ambulanceRemainingSeconds)
        ? ambulanceRemainingSeconds
        : routeInfo?.durationSec ?? null
      : trackingKind === "bed"
        ? Number.isFinite(remainingBedSeconds)
          ? remainingBedSeconds
          : routeInfo?.durationSec ?? null
        : routeInfo?.durationSec ?? null;
  const arrivalLabel =
    trackingKind === "pending"
      ? "Pending"
      : formatClockArrival(remainingSeconds, nowMs);
  const etaLabel =
    trackingKind === "pending"
      ? "Pending"
      : formatRemainingShort(remainingSeconds);
  const distanceLabel = resolveDistanceLabel(routeInfo, resolvedHospital);
  const serviceLabel =
    trackingKind === "ambulance"
      ? (() => {
          const candidates = [
            activeAmbulanceTrip?.ambulanceType,
            activeAmbulanceTrip?.initiatedData?.ambulanceType,
            activeAmbulanceTrip?.assignedAmbulance?.type,
            payload?.transport?.service_type,
            payload?.transport?.serviceType,
            payload?.transport?.tierKey,
            payload?.service?.service_type,
            payload?.service?.serviceType,
            payload?.service?.tierKey,
            pendingApproval?.ambulanceType,
          ];
          for (const candidate of candidates) {
            const next = resolveTransportServiceLabel(candidate);
            if (!isGenericTransportLabel(next)) return next;
          }
          return "Everyday care";
        })()
      : trackingKind === "bed"
        ? resolveBedServiceLabel(
            activeBedBooking?.bedLabel ||
              activeBedBooking?.roomTitle ||
              activeBedBooking?.bedType,
          )
        : pendingApproval?.serviceType === "bed"
          ? resolveBedServiceLabel(
              pendingApproval?.bedLabel ||
                pendingApproval?.roomTitle ||
                pendingApproval?.bedType,
            )
          : resolveTransportServiceLabel(pendingApproval?.ambulanceType);
  const requestLabel =
    formatMapRequestDisplayId(
      activeMapRequest?.displayId ||
        pendingApproval?.displayId ||
        activeAmbulanceTrip?.requestId ||
        activeBedBooking?.requestId ||
        pendingApproval?.requestId,
    ) || "";
  const telemetryState = ambulanceTelemetryHealth?.state ?? "inactive";
  const shouldShowTelemetryWarning =
    trackingKind === "ambulance" &&
    resolvedStatus !== EmergencyRequestStatus.ARRIVED &&
    resolvedStatus !== EmergencyRequestStatus.COMPLETED;
  const telemetryWarningLabel =
    shouldShowTelemetryWarning && telemetryState === "lost"
      ? "Tracking lost"
      : shouldShowTelemetryWarning && telemetryState === "stale"
        ? "Tracking delayed"
        : null;
  const telemetryHeroTone =
    !shouldShowTelemetryWarning
      ? "normal"
      : telemetryState === "lost"
      ? "critical"
      : telemetryState === "stale"
        ? "warning"
        : "normal";
  const secondaryTrackingLabel =
    activeAmbulanceTrip?.requestId && activeBedBooking?.requestId
      ? activeBedBooking?.status === EmergencyRequestStatus.ARRIVED
        ? "Bed ready"
        : "Bed reserved"
      : null;
  const sheetTitle =
    trackingKind === "pending"
      ? "Confirming"
      : trackingKind === "bed"
        ? resolvedStatus === EmergencyRequestStatus.ARRIVED ||
          resolvedStatus === EmergencyRequestStatus.COMPLETED ||
          bedStatus === "Ready"
          ? "Bed ready"
          : "Bed reserved"
        : resolvedStatus === EmergencyRequestStatus.COMPLETED ||
            resolvedStatus === EmergencyRequestStatus.ARRIVED
          ? "Complete"
          : ambulanceComputedStatus === "Arrived"
            ? "Arrived"
            : "En route";
  const sheetSubtitle = hospitalName;
  const sheetTitleDisplay = toTitleCaseLabel(sheetTitle);
  const crewCountLabel =
    Array.isArray(responder?.crew) && responder.crew.length > 0
      ? `${responder.crew.length} crew`
      : null;
  const trackingTone = getTrackingTone(
    ambulanceTelemetryHealth,
    trackingKind,
    resolvedStatus,
  );
  const toneColors = getToneColors({ tone: trackingTone, isDarkMode });

  return {
    resolvedHospital,
    hospitalName,
    hospitalAddress,
    pickupLabel,
    pickupDetail,
    responder,
    responderName,
    responderPlate,
    responderSafetyMeta,
    trackingKind,
    remainingSeconds,
    arrivalLabel,
    etaLabel,
    distanceLabel,
    serviceLabel,
    requestLabel,
    telemetryState,
    telemetryWarningLabel,
    telemetryHeroTone,
    secondaryTrackingLabel,
    sheetTitle,
    sheetSubtitle,
    sheetTitleDisplay,
    crewCountLabel,
    trackingTone,
    toneColors,
  };
}

export default buildTrackingViewState;

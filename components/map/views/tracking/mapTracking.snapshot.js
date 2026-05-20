import {
  getTrackingStageMeta,
  resolveTrackingStage,
  TRACKING_STAGES,
} from "./mapTracking.stage";

export { TRACKING_STAGE_GROUPS, TRACKING_STAGES } from "./mapTracking.stage";

export const TRACKING_KINDS = Object.freeze({
  IDLE: "idle",
  AMBULANCE: "ambulance",
  BED: "bed",
  PENDING: "pending",
});

function normalizeStatus(value) {
  const status = String(value ?? "")
    .trim()
    .toLowerCase();
  return status || null;
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeEtaSource(value, fallback = "none") {
  const source = String(value ?? "").trim();
  if (!source) return fallback;
  if (source === "map_route") return "live_route";
  if (
    source === "trip" ||
    source === "live_route" ||
    source === "stored_route" ||
    source === "fallback" ||
    source === "none"
  ) {
    return source;
  }
  return fallback;
}

function getRequestId(record) {
  return record?.requestId ?? record?.bookingId ?? record?.id ?? null;
}

function normalizeRoute(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (point) =>
      Number.isFinite(Number(point?.latitude)) &&
      Number.isFinite(Number(point?.longitude)),
  );
}

function hasResponderIdentity(activeAmbulanceTrip) {
  if (!activeAmbulanceTrip) return false;
  const assigned = activeAmbulanceTrip.assignedAmbulance;
  return Boolean(
    activeAmbulanceTrip.ambulanceId ||
    activeAmbulanceTrip.responderName ||
    activeAmbulanceTrip.responderPhone ||
    activeAmbulanceTrip.responderVehicleType ||
    activeAmbulanceTrip.responderVehiclePlate ||
    assigned?.id ||
    assigned?.name ||
    assigned?.phone ||
    assigned?.type ||
    assigned?.plate ||
    assigned?.vehicleNumber,
  );
}

function resolveKind({
  activeMapRequest,
  activeAmbulanceTrip,
  activeBedBooking,
  pendingApproval,
}) {
  if (activeMapRequest?.kind) return activeMapRequest.kind;
  if (getRequestId(activeAmbulanceTrip)) return TRACKING_KINDS.AMBULANCE;
  if (getRequestId(activeBedBooking)) return TRACKING_KINDS.BED;
  if (getRequestId(pendingApproval)) return TRACKING_KINDS.PENDING;
  return TRACKING_KINDS.IDLE;
}

function resolveRecord({
  kind,
  activeMapRequest,
  activeAmbulanceTrip,
  activeBedBooking,
  pendingApproval,
}) {
  if (activeMapRequest?.record) return activeMapRequest.record;
  if (kind === TRACKING_KINDS.AMBULANCE) return activeAmbulanceTrip;
  if (kind === TRACKING_KINDS.BED) return activeBedBooking;
  if (kind === TRACKING_KINDS.PENDING) return pendingApproval;
  return null;
}

function resolveEta({ kind, record, routeInfo }) {
  const routeEta = normalizeNumber(routeInfo?.durationSec);
  const tripEta = normalizeNumber(
    record?.etaSeconds ?? record?.estimatedWaitSeconds ?? null,
  );

  if (tripEta !== null && tripEta >= 0) {
    return {
      etaSeconds: tripEta,
      etaSource: normalizeEtaSource(record?.etaSource, "trip"),
    };
  }

  if (routeEta !== null && routeEta >= 0) {
    return {
      etaSeconds: routeEta,
      etaSource: normalizeEtaSource(routeInfo?.routeSource, "live_route"),
    };
  }

  return { etaSeconds: null, etaSource: "none" };
}

function resolveRoute({ kind, activeAmbulanceTrip, routeInfo }) {
  if (kind !== TRACKING_KINDS.AMBULANCE) return [];
  const liveRoute = normalizeRoute(routeInfo?.coordinates);
  if (liveRoute.length >= 2) return liveRoute;
  return normalizeRoute(activeAmbulanceTrip?.route);
}

export function buildTrackingRuntimeSnapshot({
  activeMapRequest = null,
  activeAmbulanceTrip = null,
  activeBedBooking = null,
  pendingApproval = null,
  routeInfo = null,
  ambulanceTelemetryHealth = null,
  isArrived = false,
  isPendingApproval = false,
  progress = null,
} = {}) {
  const kind = resolveKind({
    activeMapRequest,
    activeAmbulanceTrip,
    activeBedBooking,
    pendingApproval,
  });
  const record = resolveRecord({
    kind,
    activeMapRequest,
    activeAmbulanceTrip,
    activeBedBooking,
    pendingApproval,
  });
  const requestId = getRequestId(record);
  const status = normalizeStatus(record?.status);
  const route = resolveRoute({ kind, activeAmbulanceTrip, routeInfo });
  const { etaSeconds, etaSource } = resolveEta({ kind, record, routeInfo });
  const hasRoute = route.length >= 2;
  const hasEta = Number.isFinite(etaSeconds) && etaSeconds >= 0;
  const hasResponder =
    kind === TRACKING_KINDS.AMBULANCE
      ? hasResponderIdentity(activeAmbulanceTrip)
      : false;
  const telemetryState = ambulanceTelemetryHealth?.state ?? "inactive";
  const trackingStage = resolveTrackingStage({
    kind,
    status,
    isArrived,
    isPendingApproval,
    hasResponder,
    hasRoute,
    hasEta,
    progress,
    telemetryState,
  });
  const stageMeta = getTrackingStageMeta(trackingStage);

  return {
    kind,
    requestId,
    status,
    trackingStage,
    trackingStageGroup: stageMeta.group,
    visualPhase: stageMeta.visualPhase,
    isTrackingReady: Boolean(requestId) && stageMeta.isTrackingReady,
    hasResponder,
    hasRoute,
    hasEta,
    etaSeconds,
    etaSource,
    progress: Number.isFinite(progress) ? progress : null,
    telemetryState,
    telemetryStage:
      kind === TRACKING_KINDS.AMBULANCE &&
      (telemetryState === "lost" || telemetryState === "stale")
        ? telemetryState
        : null,
  };
}

export default buildTrackingRuntimeSnapshot;

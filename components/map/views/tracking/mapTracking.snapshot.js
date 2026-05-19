import { EmergencyRequestStatus } from "../../../../services/emergencyRequestsService";

export const TRACKING_STAGES = Object.freeze({
  IDLE: "idle",
  PENDING_APPROVAL: "pending_approval",
  ASSIGNING: "assigning",
  DISPATCH_CONFIRMED: "dispatch_confirmed",
  EN_ROUTE: "en_route",
  APPROACHING: "approaching",
  ARRIVED: "arrived",
  COMPLETED: "completed",
  DELAYED: "delayed",
  LOST: "lost",
});

export const TRACKING_KINDS = Object.freeze({
  IDLE: "idle",
  AMBULANCE: "ambulance",
  BED: "bed",
  PENDING: "pending",
});

const ACTIVE_STATUSES = new Set([
  EmergencyRequestStatus.IN_PROGRESS,
  EmergencyRequestStatus.ACCEPTED,
  EmergencyRequestStatus.ARRIVED,
]);

function normalizeStatus(value) {
  const status = String(value ?? "").trim().toLowerCase();
  return status || null;
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
    return { etaSeconds: tripEta, etaSource: record?.etaSource || "trip" };
  }

  if (routeEta !== null && routeEta >= 0) {
    return { etaSeconds: routeEta, etaSource: "live_route" };
  }

  return { etaSeconds: null, etaSource: "none" };
}

function resolveRoute({ kind, activeAmbulanceTrip, routeInfo }) {
  if (kind !== TRACKING_KINDS.AMBULANCE) return [];
  const liveRoute = normalizeRoute(routeInfo?.coordinates);
  if (liveRoute.length >= 2) return liveRoute;
  return normalizeRoute(activeAmbulanceTrip?.route);
}

function resolveTrackingStage({
  kind,
  status,
  isArrived,
  isPendingApproval,
  hasResponder,
  hasRoute,
  hasEta,
  telemetryState,
}) {
  if (kind === TRACKING_KINDS.IDLE || !kind) return TRACKING_STAGES.IDLE;

  if (status === EmergencyRequestStatus.COMPLETED) {
    return TRACKING_STAGES.COMPLETED;
  }

  if (isArrived || status === EmergencyRequestStatus.ARRIVED) {
    return TRACKING_STAGES.ARRIVED;
  }

  if (
    isPendingApproval ||
    kind === TRACKING_KINDS.PENDING ||
    status === EmergencyRequestStatus.PENDING_APPROVAL
  ) {
    return TRACKING_STAGES.PENDING_APPROVAL;
  }

  if (kind === TRACKING_KINDS.BED) {
    return hasEta ? TRACKING_STAGES.EN_ROUTE : TRACKING_STAGES.DISPATCH_CONFIRMED;
  }

  const hasMovementSignal = hasRoute || hasEta;

  if (telemetryState === "lost" && !hasMovementSignal) {
    return TRACKING_STAGES.LOST;
  }

  if (telemetryState === "stale" && !hasMovementSignal) {
    return TRACKING_STAGES.DELAYED;
  }

  if (hasResponder && hasMovementSignal) {
    return TRACKING_STAGES.EN_ROUTE;
  }

  if (hasResponder) {
    return TRACKING_STAGES.DISPATCH_CONFIRMED;
  }

  if (ACTIVE_STATUSES.has(status) && hasMovementSignal) {
    return TRACKING_STAGES.DISPATCH_CONFIRMED;
  }

  if (ACTIVE_STATUSES.has(status)) {
    return TRACKING_STAGES.ASSIGNING;
  }

  return hasMovementSignal ? TRACKING_STAGES.DISPATCH_CONFIRMED : TRACKING_STAGES.ASSIGNING;
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
  const hasResponder = kind === TRACKING_KINDS.AMBULANCE
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
    telemetryState,
  });

  return {
    kind,
    requestId,
    status,
    trackingStage,
    isTrackingReady:
      Boolean(requestId) &&
      (trackingStage === TRACKING_STAGES.DISPATCH_CONFIRMED ||
        trackingStage === TRACKING_STAGES.EN_ROUTE ||
        trackingStage === TRACKING_STAGES.APPROACHING ||
        trackingStage === TRACKING_STAGES.ARRIVED ||
        trackingStage === TRACKING_STAGES.COMPLETED),
    hasResponder,
    hasRoute,
    hasEta,
    etaSeconds,
    etaSource,
    telemetryState,
    telemetryStage:
      kind === TRACKING_KINDS.AMBULANCE &&
      (telemetryState === "lost" || telemetryState === "stale")
        ? telemetryState
        : null,
  };
}

export default buildTrackingRuntimeSnapshot;

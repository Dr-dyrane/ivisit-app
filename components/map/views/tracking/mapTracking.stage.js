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

export const TRACKING_STAGE_GROUPS = Object.freeze({
  IDLE: "idle",
  WAITING: "waiting",
  ACTIVE: "active",
  TERMINAL: "terminal",
  EXCEPTION: "exception",
});

const ACTIVE_STATUSES = new Set([
  EmergencyRequestStatus.IN_PROGRESS,
  EmergencyRequestStatus.ACCEPTED,
  EmergencyRequestStatus.ARRIVED,
]);

const STAGE_META = Object.freeze({
  [TRACKING_STAGES.IDLE]: {
    group: TRACKING_STAGE_GROUPS.IDLE,
    visualPhase: "en_route",
    isTrackingReady: false,
  },
  [TRACKING_STAGES.PENDING_APPROVAL]: {
    group: TRACKING_STAGE_GROUPS.WAITING,
    visualPhase: TRACKING_STAGES.PENDING_APPROVAL,
    isTrackingReady: false,
  },
  [TRACKING_STAGES.ASSIGNING]: {
    group: TRACKING_STAGE_GROUPS.WAITING,
    visualPhase: TRACKING_STAGES.ASSIGNING,
    isTrackingReady: false,
  },
  [TRACKING_STAGES.DISPATCH_CONFIRMED]: {
    group: TRACKING_STAGE_GROUPS.ACTIVE,
    visualPhase: TRACKING_STAGES.DISPATCH_CONFIRMED,
    isTrackingReady: true,
  },
  [TRACKING_STAGES.EN_ROUTE]: {
    group: TRACKING_STAGE_GROUPS.ACTIVE,
    visualPhase: TRACKING_STAGES.EN_ROUTE,
    isTrackingReady: true,
  },
  [TRACKING_STAGES.APPROACHING]: {
    group: TRACKING_STAGE_GROUPS.ACTIVE,
    visualPhase: TRACKING_STAGES.APPROACHING,
    isTrackingReady: true,
  },
  [TRACKING_STAGES.ARRIVED]: {
    group: TRACKING_STAGE_GROUPS.ACTIVE,
    visualPhase: TRACKING_STAGES.ARRIVED,
    isTrackingReady: true,
  },
  [TRACKING_STAGES.COMPLETED]: {
    group: TRACKING_STAGE_GROUPS.TERMINAL,
    visualPhase: TRACKING_STAGES.COMPLETED,
    isTrackingReady: true,
  },
  [TRACKING_STAGES.DELAYED]: {
    group: TRACKING_STAGE_GROUPS.EXCEPTION,
    visualPhase: TRACKING_STAGES.DELAYED,
    isTrackingReady: false,
  },
  [TRACKING_STAGES.LOST]: {
    group: TRACKING_STAGE_GROUPS.EXCEPTION,
    visualPhase: TRACKING_STAGES.LOST,
    isTrackingReady: false,
  },
});

export function getTrackingStageMeta(stage) {
  return STAGE_META[stage] ?? STAGE_META[TRACKING_STAGES.IDLE];
}

export function resolveTrackingStage({
  kind,
  status,
  isArrived,
  isPendingApproval,
  hasResponder,
  hasRoute,
  hasEta,
  progress,
  telemetryState,
}) {
  if (kind === "idle" || !kind) return TRACKING_STAGES.IDLE;

  if (status === EmergencyRequestStatus.COMPLETED) {
    return TRACKING_STAGES.COMPLETED;
  }

  if (isArrived || status === EmergencyRequestStatus.ARRIVED) {
    return TRACKING_STAGES.ARRIVED;
  }

  if (
    isPendingApproval ||
    kind === "pending" ||
    status === EmergencyRequestStatus.PENDING_APPROVAL
  ) {
    return TRACKING_STAGES.PENDING_APPROVAL;
  }

  const hasMovementSignal = hasRoute || hasEta;

  if (telemetryState === "lost" && !hasMovementSignal) {
    return TRACKING_STAGES.LOST;
  }

  if (telemetryState === "stale" && !hasMovementSignal) {
    return TRACKING_STAGES.DELAYED;
  }

  if (kind === "bed") {
    return hasEta
      ? TRACKING_STAGES.EN_ROUTE
      : TRACKING_STAGES.DISPATCH_CONFIRMED;
  }

  if (Number.isFinite(progress) && progress >= 0.7 && hasMovementSignal) {
    return TRACKING_STAGES.APPROACHING;
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

  return hasMovementSignal
    ? TRACKING_STAGES.DISPATCH_CONFIRMED
    : TRACKING_STAGES.ASSIGNING;
}

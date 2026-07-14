import { TRACKING_STAGES } from "./mapTracking.stage";

const TERMINAL_ACTION_STAGES = new Set([TRACKING_STAGES.COMPLETED]);

function normalizeStage(trackingSnapshot) {
  return trackingSnapshot?.trackingStage || TRACKING_STAGES.IDLE;
}

export function buildTrackingActionEligibility({
  trackingSnapshot = null,
  trackingKind,
  activeMapRequest = null,
  triageHasData = false,
  triageIsComplete = false,
  pendingApprovalRequestId = null,
} = {}) {
  const stage = normalizeStage(trackingSnapshot);
  const isAmbulance = trackingKind === "ambulance";
  const isPending = stage === TRACKING_STAGES.PENDING_APPROVAL;
  const isTerminal = TERMINAL_ACTION_STAGES.has(stage);
  const canActOnActiveStage = !isPending && !isTerminal;
  return {
    shouldPromoteTriage:
      Boolean(pendingApprovalRequestId) &&
      isPending &&
      (!triageHasData || !triageIsComplete),
    canMarkArrived:
      isAmbulance &&
      canActOnActiveStage &&
      activeMapRequest?.canConfirmArrival === true,
    canCompleteAmbulance: false,
    canCheckInBed: false,
    canCompleteBed: false,
  };
}

export function buildTrackingActionSurfacePolicy({
  trackingSnapshot = null,
} = {}) {
  const stage = normalizeStage(trackingSnapshot);
  const isPending = stage === TRACKING_STAGES.PENDING_APPROVAL;
  const isTerminal = TERMINAL_ACTION_STAGES.has(stage);
  const isIdle = stage === TRACKING_STAGES.IDLE;

  return {
    canOpenTriage: !isTerminal && !isIdle,
    canOpenContactDispatch: !isIdle && !isTerminal && !isPending,
    canAddCompanionService: !isIdle && !isTerminal && !isPending,
    canCancel: !isIdle && !isTerminal,
  };
}

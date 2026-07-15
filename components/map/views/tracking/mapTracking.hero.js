import { TRACKING_STAGES } from "./mapTracking.stage";
import { joinDisplayParts, toTitleCaseLabel } from "./mapTracking.presentation";

export function buildTrackingHeroModel({
  trackingSnapshot = null,
  trackingKind,
  serviceLabel,
  hospitalName,
  secondaryTrackingLabel,
  responderName,
  etaLabel,
  responderSafetyMeta,
  crewCountLabel,
  formattedBedRemaining,
  canMarkArrived = false,
  canCompleteAmbulance = false,
} = {}) {
  const stage = trackingSnapshot?.trackingStage || TRACKING_STAGES.IDLE;
  const isPending = stage === TRACKING_STAGES.PENDING_APPROVAL;
  const isAssigning = stage === TRACKING_STAGES.ASSIGNING;
  const isConfirmed = stage === TRACKING_STAGES.DISPATCH_CONFIRMED;
  const isEnRoute = stage === TRACKING_STAGES.EN_ROUTE;
  const isApproaching = stage === TRACKING_STAGES.APPROACHING;
  const isArrived = stage === TRACKING_STAGES.ARRIVED;
  const isCompleted = stage === TRACKING_STAGES.COMPLETED;
  const isDelayed = stage === TRACKING_STAGES.DELAYED;
  const isLost = stage === TRACKING_STAGES.LOST;
  const heroHasResolvedEta = Boolean(
    etaLabel && etaLabel !== "Pending" && etaLabel !== "--",
  );

  if (trackingKind === "pending" || isPending) {
    return {
      title: "Awaiting approval",
      subtitle: toTitleCaseLabel(serviceLabel),
      rightMeta: "Pending",
      avatarIcon: "hourglass-outline",
    };
  }

  if (trackingKind === "bed") {
    return {
      title: serviceLabel,
      subtitle: joinDisplayParts([hospitalName, secondaryTrackingLabel]),
      rightMeta: formattedBedRemaining || null,
      avatarIcon: "bed",
    };
  }

  if (isCompleted) {
    return {
      title: "Visit complete",
      subtitle: hospitalName,
      rightMeta: "Complete",
      avatarIcon: "person",
    };
  }

  if (isArrived) {
    return {
      title: "Driver arrived",
      subtitle: canMarkArrived
        ? "Confirm arrival to continue"
        : canCompleteAmbulance
          ? "Complete request to finish"
          : "Arrival confirmed",
      rightMeta: "Arrived",
      avatarIcon: "person",
    };
  }

  if (isLost) {
    return {
      title: responderName || "Reconnecting",
      subtitle: "Tracking signal interrupted",
      rightMeta: "Signal lost",
      avatarIcon: "person",
    };
  }

  if (isDelayed) {
    return {
      title: responderName || "Tracking delayed",
      subtitle: "Waiting for a fresh location update",
      rightMeta: "Delayed",
      avatarIcon: "person",
    };
  }

  if (isApproaching) {
    return {
      title: "Almost there",
      subtitle: responderName || toTitleCaseLabel(serviceLabel),
      rightMeta: heroHasResolvedEta
        ? etaLabel
        : responderSafetyMeta || crewCountLabel || null,
      avatarIcon: "person",
    };
  }

  if (responderName) {
    return {
      title: responderName,
      subtitle: toTitleCaseLabel(serviceLabel),
      rightMeta: heroHasResolvedEta
        ? etaLabel
        : responderSafetyMeta || crewCountLabel || null,
      avatarIcon: "person",
    };
  }

  if (isEnRoute || isConfirmed) {
    return {
      title: isEnRoute ? "Ambulance en route" : "Dispatch confirmed",
      subtitle: isEnRoute
        ? "Dispatch confirmed"
        : toTitleCaseLabel(serviceLabel),
      rightMeta: heroHasResolvedEta
        ? etaLabel
        : responderSafetyMeta || crewCountLabel || null,
      avatarIcon: "person",
    };
  }

  return {
    title: isAssigning ? "Assigning driver" : "Finding driver",
    subtitle: toTitleCaseLabel(serviceLabel),
    rightMeta: responderSafetyMeta || crewCountLabel || null,
    avatarIcon: "person",
  };
}

export function buildTrackingHeaderModel({
  trackingSnapshot = null,
  trackingKind,
  fallbackTitle,
  fallbackSubtitle,
} = {}) {
  const stage = trackingSnapshot?.trackingStage || TRACKING_STAGES.IDLE;

  if (trackingKind === "idle" || stage === TRACKING_STAGES.IDLE) {
    return { title: "Tracking", subtitle: fallbackSubtitle || null };
  }

  if (trackingKind === "bed") {
    if (stage === TRACKING_STAGES.ASSIGNING) {
      return { title: "Awaiting Facility", subtitle: fallbackSubtitle || null };
    }
    if (
      stage === TRACKING_STAGES.ARRIVED ||
      stage === TRACKING_STAGES.COMPLETED
    ) {
      return { title: "Bed Ready", subtitle: fallbackSubtitle || null };
    }
    return { title: "Bed Reserved", subtitle: fallbackSubtitle || null };
  }

  switch (stage) {
    case TRACKING_STAGES.PENDING_APPROVAL:
      return { title: "Confirming", subtitle: fallbackSubtitle || null };
    case TRACKING_STAGES.ASSIGNING:
      return { title: "Assigning", subtitle: fallbackSubtitle || null };
    case TRACKING_STAGES.DISPATCH_CONFIRMED:
      return {
        title: "Dispatch Confirmed",
        subtitle: fallbackSubtitle || null,
      };
    case TRACKING_STAGES.APPROACHING:
      return { title: "Approaching", subtitle: fallbackSubtitle || null };
    case TRACKING_STAGES.ARRIVED:
      return { title: "Arrived", subtitle: fallbackSubtitle || null };
    case TRACKING_STAGES.COMPLETED:
      return { title: "Complete", subtitle: fallbackSubtitle || null };
    case TRACKING_STAGES.DELAYED:
      return { title: "Tracking Delayed", subtitle: fallbackSubtitle || null };
    case TRACKING_STAGES.LOST:
      return { title: "Tracking Lost", subtitle: fallbackSubtitle || null };
    case TRACKING_STAGES.EN_ROUTE:
      return { title: "En Route", subtitle: fallbackSubtitle || null };
    default:
      return {
        title: fallbackTitle || "Tracking",
        subtitle: fallbackSubtitle || null,
      };
  }
}

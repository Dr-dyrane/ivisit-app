import { toTitleCaseLabel } from "./mapTracking.presentation";

export function buildTrackingPrimaryAction({
  shouldPromoteTriage,
  openTrackingTriage,
  canMarkArrived,
  runBusyAction,
  onMarkAmbulanceArrived,
  busyAction,
  canCompleteAmbulance,
  handleCompleteAmbulanceWithRating,
  canCheckInBed,
  onMarkBedOccupied,
  canCompleteBed,
  handleCompleteBedWithRating,
}) {
  if (shouldPromoteTriage) {
    return {
      key: "intake",
      label: "Continue check-in",
      ctaLabel: "Continue",
      iconName: "chatbubble-ellipses-outline",
      onPress: openTrackingTriage,
      loading: false,
    };
  }
  if (canMarkArrived) {
    return {
      key: "arrived",
      label: "Confirm arrival",
      ctaLabel: "Confirm",
      iconName: "locate-outline",
      onPress: () => runBusyAction("arrived", onMarkAmbulanceArrived),
      loading: busyAction === "arrived",
    };
  }
  if (canCompleteAmbulance) {
    return {
      key: "complete-ambulance",
      label: "Complete trip",
      ctaLabel: "Complete",
      iconName: "checkmark-circle-outline",
      onPress: handleCompleteAmbulanceWithRating,
      loading: busyAction === "complete",
    };
  }
  if (canCheckInBed) {
    return {
      key: "check-in",
      label: "Check in",
      ctaLabel: "Confirm",
      iconName: "bed-outline",
      onPress: () => runBusyAction("occupied", onMarkBedOccupied),
      loading: busyAction === "occupied",
    };
  }
  if (canCompleteBed) {
    return {
      key: "complete-bed",
      label: "Complete stay",
      ctaLabel: "Complete",
      iconName: "checkmark-circle-outline",
      onPress: handleCompleteBedWithRating,
      loading: busyAction === "complete",
    };
  }
  return null;
}

export function buildTrackingSecondaryActions({
  activeAmbulanceRequestId,
  activeBedBookingRequestId,
  onAddBedFromTracking,
  onAddAmbulanceFromTracking,
}) {
  const actions = [];
  if (
    activeAmbulanceRequestId &&
    !activeBedBookingRequestId &&
    typeof onAddBedFromTracking === "function"
  ) {
    actions.push({
      key: "bed",
      label: "Reserve bed",
      iconName: "bed-outline",
      onPress: onAddBedFromTracking,
    });
  }
  if (
    activeBedBookingRequestId &&
    !activeAmbulanceRequestId &&
    typeof onAddAmbulanceFromTracking === "function"
  ) {
    actions.push({
      key: "ambulance",
      label: "Request transport",
      iconName: "ambulance",
      iconFamily: "material-community",
      onPress: onAddAmbulanceFromTracking,
    });
  }
  return actions;
}

export function buildTrackingDestructiveAction({
  pendingApprovalRequestId,
  activeAmbulanceRequestId,
  activeBedBookingRequestId,
  runBusyAction,
  handleCancelPendingRequest,
  onCancelAmbulanceTrip,
  onCancelBedBooking,
  busyAction,
}) {
  if (pendingApprovalRequestId) {
    return {
      key: "cancel-pending",
      label: "Cancel request",
      iconName: "close-outline",
      onPress: () => runBusyAction("cancel", handleCancelPendingRequest),
      loading: busyAction === "cancel",
    };
  }
  if (activeAmbulanceRequestId) {
    return {
      key: "cancel-ambulance",
      label: "Cancel request",
      iconName: "close-outline",
      onPress: () => runBusyAction("cancel", onCancelAmbulanceTrip),
      loading: busyAction === "cancel",
    };
  }
  if (activeBedBookingRequestId) {
    return {
      key: "cancel-bed",
      label: "Cancel booking",
      iconName: "close-outline",
      onPress: () => runBusyAction("cancel", onCancelBedBooking),
      loading: busyAction === "cancel",
    };
  }
  return null;
}

export function buildTrackingDetailRows({
  requestLabel,
  responderPlate,
  crewCountLabel,
  secondaryTrackingLabel,
  triageRequestId,
  triageIsComplete,
  triageHasData,
  triageAnsweredCount,
  triageDisplayTotalSteps,
}) {
  return [
    ...(requestLabel
      ? [{ icon: "receipt-outline", label: "Request ID", value: requestLabel }]
      : []),
    ...(responderPlate
      ? [{ icon: "car-outline", label: "Vehicle", value: responderPlate }]
      : []),
    ...(crewCountLabel
      ? [{ icon: "people-outline", label: "Team", value: crewCountLabel }]
      : []),
    ...(secondaryTrackingLabel
      ? [{ icon: "bed-outline", label: "Bed", value: secondaryTrackingLabel }]
      : []),
    ...(triageRequestId
      ? [
          {
            icon: "medkit",
            label: "Check-in",
            value: triageIsComplete
              ? "Complete"
              : triageHasData
                ? `${triageAnsweredCount}/${triageDisplayTotalSteps}`
                : "Not started",
          },
        ]
      : []),
  ];
}

export function buildTrackingMidActions({
  triageRequestId,
  openTrackingTriage,
  secondaryActions,
  primaryAction,
  trackingKind,
  handleShareEta,
}) {
  const actions = [];

  if (triageRequestId) {
    actions.push({
      key: "info",
      label: toTitleCaseLabel("My information"),
      iconName: "medkit",
      onPress: openTrackingTriage,
      loading: false,
      tone: "info",
    });
  }

  const reserveBedAction = Array.isArray(secondaryActions)
    ? secondaryActions.find((action) => action?.key === "bed")
    : null;
  const requestTransportAction = Array.isArray(secondaryActions)
    ? secondaryActions.find((action) => action?.key === "ambulance")
    : null;
  if (reserveBedAction) {
    actions.push({
      ...reserveBedAction,
      label: toTitleCaseLabel("Reserve my bed space"),
      iconName: "hospital-box",
      iconFamily: "material-community",
      tone: "bed",
    });
  }
  if (requestTransportAction) {
    actions.push({
      ...requestTransportAction,
      label: toTitleCaseLabel("Request transport"),
      iconName: "ambulance",
      iconFamily: "material-community",
      tone: "transport",
    });
  }

  if (primaryAction) {
    if (trackingKind === "ambulance" && primaryAction.key === "arrived") {
      actions.push({
        ...primaryAction,
        label: toTitleCaseLabel("Confirm arrival"),
        tone: "state",
      });
    } else if (
      trackingKind === "ambulance" &&
      primaryAction.key === "complete-ambulance"
    ) {
      // Complete Request is promoted to the bottom primary slot after arrival.
    } else if (
      trackingKind === "bed" &&
      primaryAction.key === "complete-bed"
    ) {
      // Complete Stay is promoted to the bottom primary slot after check-in.
    } else {
      actions.push({
        ...primaryAction,
        label: toTitleCaseLabel(primaryAction.label),
        tone: "state",
      });
    }
  } else if (trackingKind === "ambulance" || trackingKind === "bed") {
    actions.push({
      key: "share",
      label: "Share ETA",
      iconName: "share-outline",
      onPress: handleShareEta,
      loading: false,
      tone: "share",
    });
  }

  return actions;
}

export function buildTrackingBottomAction({
  trackingKind,
  primaryAction,
  destructiveAction,
  busyAction,
}) {
  // PULLBACK NOTE: Pass 17D — CTA disabled contract for concurrent-action guard
  // OLD: returned action objects without disabled field; UI only checked loading
  // NEW: disabled=true when another action is in-flight so CTA truthfully reflects unavailable state
  let action = null;
  if (trackingKind === "ambulance" && primaryAction?.key === "complete-ambulance") {
    action = {
      ...primaryAction,
      label: "Complete Request",
    };
  } else if (trackingKind === "bed" && primaryAction?.key === "complete-bed") {
    action = {
      ...primaryAction,
      label: "Complete Stay",
    };
  } else {
    action = destructiveAction;
  }
  if (!action) return null;
  const isBusy = Boolean(busyAction) && busyAction !== action.key;
  return {
    ...action,
    disabled: isBusy,
  };
}

export function resolveTrackingHeaderActionHandler({
  headerActionRequest,
  triageRequestId,
  openTrackingTriage,
  onAddBedFromTracking,
  destructiveAction,
  onConsumeHeaderActionRequest,
}) {
  if (!headerActionRequest?.type || !headerActionRequest?.requestedAt) {
    return null;
  }

  if (headerActionRequest.type === "triage" && triageRequestId) {
    return () => {
      onConsumeHeaderActionRequest?.();
      openTrackingTriage();
    };
  }

  if (
    headerActionRequest.type === "bed" &&
    typeof onAddBedFromTracking === "function"
  ) {
    return () => {
      onConsumeHeaderActionRequest?.();
      onAddBedFromTracking();
    };
  }

  if (headerActionRequest.type === "cancel" && destructiveAction?.onPress) {
    return () => {
      onConsumeHeaderActionRequest?.();
      destructiveAction.onPress();
    };
  }

  return null;
}

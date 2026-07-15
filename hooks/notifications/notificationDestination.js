import {
  navigateToHelpSupport,
  navigateToInsurance,
  navigateToNotificationDetails,
  navigateToPayment,
  navigateToProfile,
  navigateToSOS,
  navigateToVisitDetails,
  navigateToVisits,
} from "../../utils/navigationHelpers";

// PULLBACK NOTE: Shared notification destination resolver.
// Owns: mapping notification action metadata to canonical app destinations.
// Does NOT own: screen-local pressed/select state or detail presentation.

const NOTIFICATION_ACTION_DESTINATIONS = Object.freeze({
  track: {
    destination: "request",
    label: "Open request",
  },
  view_request: {
    destination: "request",
    label: "Open request",
  },
  retry_payment: {
    destination: "request",
    label: "Open request",
  },
  track_emergency: {
    destination: "request",
    label: "Track request",
  },
  acknowledge_responder_arrival: {
    destination: "request",
    label: "Confirm arrival",
  },
  view_emergency_request: {
    destination: "request",
    label: "Open request",
  },
  view_emergency: {
    destination: "request",
    label: "Open request",
  },
  view_payment: {
    destination: "payment",
    label: "Open payment",
  },
  view_appointment: {
    destination: "visit",
    label: "Open visit",
    fallbackLabel: "Open visits",
    visitsFilter: "upcoming",
  },
  view_visit: {
    destination: "visit",
    label: "Open visit",
    fallbackLabel: "Open visits",
  },
  view_summary: {
    destination: "visit",
    label: "Open visit",
    fallbackLabel: "Open visits",
  },
  view_emergency_visit: {
    destination: "visit",
    label: "Open visit",
    fallbackLabel: "Open visits",
  },
  view_scheduled_visit: {
    destination: "visit",
    label: "Open visit",
    fallbackLabel: "Open visits",
  },
  open_async_consult: {
    destination: "visit",
    label: "Open consult",
    fallbackLabel: "Open visits",
  },
  upgrade: {
    destination: "profile",
    label: "Open account",
  },
  view_ticket: {
    destination: "support",
    label: "Open support",
  },
  view_insurance: {
    destination: "insurance",
    label: "Open coverage",
  },
});

function getNotificationActionDestination(actionType) {
  if (typeof actionType !== "string") return null;
  return NOTIFICATION_ACTION_DESTINATIONS[actionType] ?? null;
}

export function getNotificationVisitKey(notification) {
  const actionData = notification?.actionData ?? {};
  if (typeof actionData?.visitId === "string" && actionData.visitId.trim()) {
    return actionData.visitId.trim();
  }
  if (
    typeof actionData?.appointmentId === "string" &&
    actionData.appointmentId.trim()
  ) {
    return actionData.appointmentId.trim();
  }
  if (
    notification?.actionType === "view_emergency_visit" &&
    typeof actionData?.requestId === "string" &&
    actionData.requestId.trim()
  ) {
    return actionData.requestId.trim();
  }
  return null;
}

export function getNotificationPrimaryActionLabel(notification) {
  const actionType = notification?.actionType ?? null;
  const actionDestination = getNotificationActionDestination(actionType);
  const visitKey = getNotificationVisitKey(notification);

  if (actionDestination?.destination === "visit") {
    return visitKey
      ? actionDestination.label
      : actionDestination.fallbackLabel;
  }

  return actionDestination?.label ?? (visitKey ? "Open visit" : null);
}

export function routeNotificationDestination({
  notification,
  router,
  setEmergencyMode,
  method = "push",
  fallbackToDetails = true,
}) {
  const actionType = notification?.actionType ?? null;
  const actionData = notification?.actionData ?? {};
  const actionDestination = getNotificationActionDestination(actionType);
  const visitKey = getNotificationVisitKey(notification);

  if (actionDestination?.destination === "request") {
    navigateToSOS({ router, setEmergencyMode, method });
    return "request";
  }

  if (actionDestination?.destination === "payment") {
    navigateToPayment({ router, method });
    return "payment";
  }

  if (actionDestination?.destination === "visit") {
    if (visitKey) {
      navigateToVisitDetails({ router, visitId: visitKey, method });
      return "visit_detail";
    }
    navigateToVisits({
      router,
      filter: actionDestination.visitsFilter,
      method,
    });
    return "visits";
  }

  if (actionDestination?.destination === "profile") {
    navigateToProfile({ router, method });
    return "profile";
  }

  if (actionDestination?.destination === "support") {
    navigateToHelpSupport({ router, ticketId: actionData?.ticketId, method });
    return "support";
  }

  if (actionDestination?.destination === "insurance") {
    navigateToInsurance({ router, method });
    return "insurance";
  }

  if (!fallbackToDetails || !notification?.id) {
    return null;
  }

  navigateToNotificationDetails({
    router,
    notificationId: notification.id,
    method,
  });
  return "notification_detail";
}

export default routeNotificationDestination;

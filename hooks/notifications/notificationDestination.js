import {
  navigateToHelpSupport,
  navigateToInsurance,
  navigateToNotificationDetails,
  navigateToProfile,
  navigateToSOS,
  navigateToVisitDetails,
  navigateToVisits,
} from "../../utils/navigationHelpers";

// PULLBACK NOTE: Shared notification destination resolver.
// Owns: mapping notification action metadata to canonical app destinations.
// Does NOT own: screen-local pressed/select state or detail presentation.

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
  return null;
}

export function getNotificationPrimaryActionLabel(notification) {
  const actionType = notification?.actionType ?? null;
  const visitKey = getNotificationVisitKey(notification);

  if (
    actionType === "view_appointment" ||
    actionType === "view_visit" ||
    actionType === "view_summary"
  ) {
    return visitKey ? "Open visit" : "Open visits";
  }

  if (
    actionType === "track" ||
    actionType === "view_request" ||
    actionType === "retry_payment"
  ) {
    return "Open request";
  }

  if (actionType === "view_ticket") {
    return "Open support";
  }

  if (actionType === "view_insurance") {
    return "Open coverage";
  }

  if (actionType === "upgrade") {
    return "Open account";
  }

  return visitKey ? "Open visit" : null;
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
  const visitKey = getNotificationVisitKey(notification);

  if (
    actionType === "track" ||
    actionType === "view_request" ||
    actionType === "retry_payment"
  ) {
    navigateToSOS({ router, setEmergencyMode, method });
    return "request";
  }

  if (
    actionType === "view_appointment" ||
    actionType === "view_visit" ||
    actionType === "view_summary"
  ) {
    if (visitKey) {
      navigateToVisitDetails({ router, visitId: visitKey, method });
      return "visit_detail";
    }
    navigateToVisits({
      router,
      filter: actionType === "view_appointment" ? "upcoming" : undefined,
      method,
    });
    return "visits";
  }

  if (actionType === "upgrade") {
    navigateToProfile({ router, method });
    return "profile";
  }

  if (actionType === "view_ticket") {
    navigateToHelpSupport({ router, ticketId: actionData?.ticketId, method });
    return "support";
  }

  if (actionType === "view_insurance") {
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

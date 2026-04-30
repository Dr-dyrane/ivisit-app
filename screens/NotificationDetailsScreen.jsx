import React from "react";
import NotificationDetailsScreenOrchestrator from "../components/notifications/details/NotificationDetailsScreenOrchestrator";

// PULLBACK NOTE: NotificationDetailsScreen is now composition-only.
// OLD: Route file owned header wiring, read-on-open behavior, action routing, and editorial presentation.
// NEW: Route delegates to NotificationDetailsScreenOrchestrator so the detail surface follows the shared stack contract.

export default function NotificationDetailsScreen() {
  return <NotificationDetailsScreenOrchestrator />;
}

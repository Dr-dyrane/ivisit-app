"use client";

import React from "react";
import NotificationsScreenOrchestrator from "../components/notifications/NotificationsScreenOrchestrator";

// PULLBACK NOTE: NotificationsScreen is now composition-only.
// OLD: Route file owned header wiring, filters, select mode, shell animation, and action routing.
// NEW: Route delegates to NotificationsScreenOrchestrator so notifications follows the shared stack-screen contract.

export default function NotificationsScreen() {
  return <NotificationsScreenOrchestrator />;
}

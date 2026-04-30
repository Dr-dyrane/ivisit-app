import React from "react";
import { useEmergencyContactsBootstrap } from "../hooks/emergency/useEmergencyContactsBootstrap";
import { useNotificationsBootstrap } from "../hooks/notifications/useNotificationsBootstrap";

/**
 * RootBootstrapEffects
 *
 * Runtime-only side-effect host for feature bootstraps that require Auth + Query providers.
 * Renders nothing.
 */
export function RootBootstrapEffects() {
  useEmergencyContactsBootstrap();
  useNotificationsBootstrap();
  return null;
}

export default RootBootstrapEffects;

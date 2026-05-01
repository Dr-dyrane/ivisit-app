import React from "react";
import { useEmergencyContactsBootstrap } from "../hooks/emergency/useEmergencyContactsBootstrap";
import { useMapRouteBootstrap } from "../hooks/emergency/useMapRouteBootstrap";
import { useMedicalProfileBootstrap } from "../hooks/medicalProfile/useMedicalProfileBootstrap";
import { useNotificationsBootstrap } from "../hooks/notifications/useNotificationsBootstrap";
import { useVisitsBootstrap } from "../hooks/visits/useVisitsBootstrap";

/**
 * RootBootstrapEffects
 *
 * Runtime-only side-effect host for feature bootstraps that require Auth + Query providers.
 * Renders nothing.
 */
export function RootBootstrapEffects() {
  useEmergencyContactsBootstrap();
  useNotificationsBootstrap();
  useVisitsBootstrap();
  useMedicalProfileBootstrap();
  useMapRouteBootstrap();
  return null;
}

export default RootBootstrapEffects;

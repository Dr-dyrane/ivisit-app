import React from "react";
import { useEmergencyContactsBootstrap } from "../hooks/emergency/useEmergencyContactsBootstrap";

/**
 * RootBootstrapEffects
 *
 * Runtime-only side-effect host for feature bootstraps that require Auth + Query providers.
 * Renders nothing.
 */
export function RootBootstrapEffects() {
  useEmergencyContactsBootstrap();
  return null;
}

export default RootBootstrapEffects;

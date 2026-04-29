"use client";

import React from "react";
import SettingsScreenOrchestrator from "../components/settings/SettingsScreenOrchestrator";

// PULLBACK NOTE: SettingsScreen is now composition-only.
// OLD: Route file owned shell, state, animation, and preferences mutations.
// NEW: Route delegates to SettingsScreenOrchestrator so settings follows the shared stack-screen contract.

export default function SettingsScreen() {
  return <SettingsScreenOrchestrator />;
}

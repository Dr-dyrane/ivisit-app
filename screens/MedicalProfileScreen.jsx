"use client";

import React from "react";
import MedicalProfileScreenOrchestrator from "../components/medicalProfile/MedicalProfileScreenOrchestrator";

// PULLBACK NOTE: MedicalProfileScreen is now composition-only.
// OLD: Route owned shell, animation, FAB, edit state, and field rendering inline.
// NEW: Route delegates to MedicalProfileScreenOrchestrator so health information follows the shared stack-screen contract.

export default function MedicalProfileScreen() {
  return <MedicalProfileScreenOrchestrator />;
}

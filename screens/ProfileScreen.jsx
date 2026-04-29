"use client";

import React from "react";
import ProfileScreenOrchestrator from "../components/profile/ProfileScreenOrchestrator";

// PULLBACK NOTE: ProfileScreen is now composition-only.
// OLD: Route file owned shell, state, animation, focus sync, and modal mounting.
// NEW: Route delegates to ProfileScreenOrchestrator so profile can follow the shared stack-screen contract.

export default function ProfileScreen() {
  return <ProfileScreenOrchestrator />;
}

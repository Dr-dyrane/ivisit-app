"use client";

import React from "react";
import EmergencyContactsScreenOrchestrator from "../components/emergency/contacts/EmergencyContactsScreenOrchestrator";

// PULLBACK NOTE: Refactor EmergencyContactsScreen to minimal orchestrator
// OLD: Stack route was expected to keep growing UI and state wiring directly.
// NEW: Minimal screen that delegates to EmergencyContactsScreenOrchestrator.
// REASON: Match the payment/map stack pattern and keep the route file composition-only.

export default function EmergencyContactsScreen() {
  return <EmergencyContactsScreenOrchestrator />;
}

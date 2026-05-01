"use client";

import React from "react";
import HelpSupportScreenOrchestrator from "../components/helpSupport/HelpSupportScreenOrchestrator";

// PULLBACK NOTE: HelpSupportScreen is now composition-only.
// OLD: route-owned monolith kept fetches, FAB/header wiring, FAQ/ticket UI, and modal state inline.
// NEW: the screen delegates to the support orchestrator so help-support matches the refined stack contract.

export default function HelpSupportScreen() {
  return <HelpSupportScreenOrchestrator />;
}

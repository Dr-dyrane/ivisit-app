"use client";

import React from "react";
import InsuranceScreenOrchestrator from "../components/insurance/InsuranceScreenOrchestrator";

// PULLBACK NOTE: InsuranceScreen is now composition-only.
// OLD: Route owned shell, FAB, query orchestration, OCR, upload, modal flow, and policy rendering inline.
// NEW: Route delegates to InsuranceScreenOrchestrator so coverage follows the shared stack-screen contract.

export default function InsuranceScreen() {
  return <InsuranceScreenOrchestrator />;
}

"use client";

import React from "react";
import SearchScreenOrchestrator from "../components/search/SearchScreenOrchestrator";

// PULLBACK NOTE: SearchScreen is now composition-only.
// OLD: Route-owned shell, discovery tabs, results rendering, animation, and history UI lived inline.
// NEW: Route delegates to SearchScreenOrchestrator so Search follows the shared stack-screen contract.

export default function SearchScreen() {
  return <SearchScreenOrchestrator />;
}

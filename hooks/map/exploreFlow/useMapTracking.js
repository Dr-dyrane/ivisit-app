// hooks/map/exploreFlow/useMapTracking.js
// Owns: openTracking, closeTracking, trackingDismissedRef,
//       auto-open effect, shared nowMs clock via useMapTrackingTimer.

import { useCallback, useEffect, useRef } from "react";
import {
  MAP_SHEET_PHASES,
} from "../../../components/map/core/MapSheetOrchestrator";
import {
  buildExploreIntentSheetView,
  buildTrackingSheetView,
  resolveMapFlowHospital,
} from "./mapExploreFlow.transitions";
import { useMapTrackingTimer } from "./useMapTrackingTimer";

/**
 * useMapTracking
 *
 * Manages tracking sheet visibility and auto-open logic.
 * - Owns trackingDismissedRef and lastTrackingRequestKeyRef
 * - Opens/closes the tracking sheet
 * - Auto-opens when trackingRequestKey appears, hasActiveTrip is true,
 *   and sheet is EXPLORE_INTENT
 * - Provides nowMs via shared broadcast timer (no per-hook interval)
 *
 * PULLBACK NOTE: Phase 8 — Pass C
 * Auto-open is gated on BOTH trackingRequestKey (Zustand identity) AND
 * hasActiveTrip (XState lifecycle). This prevents Zustand-truthy-but-XState-idle
 * races during cleanup, where the requestId still exists but the trip machine
 * is already in IDLE/COMPLETED.
 */
export function useMapTracking({
  trackingRequestKey,
  hasActiveTrip,
  sheetPhase,
  sheetPayload,
  defaultExploreSnapState,
  usesSidebarLayout,
  discoveredHospitals,
  featuredHospital,
  nearestHospital,
  activeMapRequest,
  promoteHospitalSelection,
  setSheetView,
}) {
  const trackingDismissedRef = useRef(false);
  const lastTrackingRequestKeyRef = useRef(null);
  const prevSheetPhaseRef = useRef(sheetPhase);

  const isHeaderVisible =
    Boolean(trackingRequestKey) &&
    (sheetPhase === MAP_SHEET_PHASES.EXPLORE_INTENT ||
      sheetPhase === MAP_SHEET_PHASES.TRACKING);

  const nowMs = useMapTrackingTimer(isHeaderVisible);

  useEffect(() => {
    if (lastTrackingRequestKeyRef.current !== trackingRequestKey) {
      trackingDismissedRef.current = false;
      lastTrackingRequestKeyRef.current = trackingRequestKey;
    }
  }, [trackingRequestKey]);

  const openTracking = useCallback(() => {
    const trackedHospital = promoteHospitalSelection(
      resolveMapFlowHospital({
        preferredHospital: activeMapRequest.hospital || sheetPayload?.hospital,
        preferredHospitalId:
          activeMapRequest.hospitalId ||
          sheetPayload?.hospital?.id ||
          featuredHospital?.id ||
          nearestHospital?.id ||
          null,
        hospitals: discoveredHospitals,
        fallbacks: [featuredHospital, nearestHospital],
      }),
    );
    setSheetView(
      buildTrackingSheetView({
        hospital: trackedHospital,
        usesSidebarLayout,
      }),
    );
  }, [
    activeMapRequest.hospital,
    activeMapRequest.hospitalId,
    discoveredHospitals,
    featuredHospital,
    nearestHospital,
    promoteHospitalSelection,
    setSheetView,
    sheetPayload?.hospital,
    usesSidebarLayout,
  ]);

  const closeTracking = useCallback(() => {
    trackingDismissedRef.current = true;
    setSheetView(buildExploreIntentSheetView(defaultExploreSnapState));
  }, [defaultExploreSnapState, setSheetView]);

  useEffect(() => {
    const isComingFromCommit =
      prevSheetPhaseRef.current === MAP_SHEET_PHASES.COMMIT_DETAILS ||
      prevSheetPhaseRef.current === MAP_SHEET_PHASES.COMMIT_TRIAGE ||
      prevSheetPhaseRef.current === MAP_SHEET_PHASES.COMMIT_PAYMENT;

    prevSheetPhaseRef.current = sheetPhase;

    // PULLBACK NOTE: Phase 8 — Pass C: XState gate
    // Treat trip as inactive if EITHER Zustand identity is missing OR
    // XState lifecycle says no active trip. Closes the race during cleanup.
    const isTripActive = Boolean(trackingRequestKey) && hasActiveTrip;
    if (!isTripActive) {
      if (sheetPhase === MAP_SHEET_PHASES.TRACKING) {
        setSheetView(buildExploreIntentSheetView(defaultExploreSnapState));
      }
      return;
    }

    const shouldForceAutoOpen =
      isComingFromCommit && sheetPhase === MAP_SHEET_PHASES.EXPLORE_INTENT;

    if (
      (trackingDismissedRef.current && !shouldForceAutoOpen) ||
      sheetPhase === MAP_SHEET_PHASES.TRACKING ||
      sheetPhase === MAP_SHEET_PHASES.COMMIT_DETAILS ||
      sheetPhase === MAP_SHEET_PHASES.COMMIT_TRIAGE ||
      sheetPhase === MAP_SHEET_PHASES.COMMIT_PAYMENT
    ) {
      return;
    }

    if (sheetPhase === MAP_SHEET_PHASES.EXPLORE_INTENT) {
      openTracking();
    }
  }, [
    defaultExploreSnapState,
    hasActiveTrip,
    openTracking,
    setSheetView,
    sheetPhase,
    trackingRequestKey,
  ]);

  return {
    nowMs,
    openTracking,
    closeTracking,
  };
}

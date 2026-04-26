// hooks/map/exploreFlow/useMapCommitFlow.js
// PULLBACK NOTE: Extracted from useMapExploreFlow.js
// Owns: commit restore effect, open/close commit phase handlers, finishCommitPayment

import { useCallback, useEffect, useRef } from "react";
import {
  MAP_SHEET_PHASES,
  MAP_SHEET_SNAP_STATES,
} from "../../../components/map/core/MapSheetOrchestrator";
import {
  buildCommitDetailsTransition,
  buildCommitPaymentTransition,
  buildCommitRestoreSheetView,
  buildCommitTriageTransition,
  buildExploreIntentSheetView,
  buildSourceReturnSheetView,
  resolveMapFlowHospital,
} from "./mapExploreFlow.transitions";

/**
 * useMapCommitFlow
 *
 * Manages the commit phase lifecycle (details → triage → payment → finish).
 * Restores the correct commit phase when the user returns to the map with an
 * active commitFlow. Provides open/close handlers for all three commit phases.
 */
export function useMapCommitFlow({
  commitFlow,
  sheetPhase,
  sheetPayload,
  sheetSnapState,
  defaultExploreSnapState,
  usesSidebarLayout,
  discoveredHospitals,
  selectedHospital,
  featuredHospital,
  nearestHospital,
  trackingRequestKey,
  promoteHospitalSelection,
  clearCommitFlow,
  setCommitFlow,
  setFeaturedHospital,
  setSheetView,
  openTracking,
}) {
  const suppressCommitRestoreRef = useRef(false);

  useEffect(() => {
    const isRestorableCommitPhase =
      commitFlow?.phase === MAP_SHEET_PHASES.COMMIT_DETAILS ||
      commitFlow?.phase === MAP_SHEET_PHASES.COMMIT_TRIAGE ||
      commitFlow?.phase === MAP_SHEET_PHASES.COMMIT_PAYMENT;
    if (!isRestorableCommitPhase) {
      suppressCommitRestoreRef.current = false;
      return;
    }

    if (suppressCommitRestoreRef.current || sheetPhase === commitFlow?.phase) {
      return;
    }

    const targetHospital = promoteHospitalSelection(
      resolveMapFlowHospital({
        preferredHospital: commitFlow?.hospital,
        preferredHospitalId: commitFlow?.hospitalId,
        hospitals: discoveredHospitals,
        fallbacks: [selectedHospital, featuredHospital, nearestHospital],
      }),
    );

    setSheetView(
      buildCommitRestoreSheetView({
        commitFlow,
        hospital: targetHospital,
        defaultExploreSnapState,
      }),
    );
  }, [
    commitFlow,
    defaultExploreSnapState,
    discoveredHospitals,
    featuredHospital,
    nearestHospital,
    promoteHospitalSelection,
    selectedHospital,
    setSheetView,
    sheetPhase,
  ]);

  const openCommitDetails = useCallback(
    (nextHospital = null, transport = null, payload = null) => {
      suppressCommitRestoreRef.current = false;
      const targetHospital = promoteHospitalSelection(
        resolveMapFlowHospital({
          preferredHospital: nextHospital,
          hospitals: discoveredHospitals,
          fallbacks: [selectedHospital, featuredHospital, nearestHospital],
        }),
      );
      const transition = buildCommitDetailsTransition({
        hospital: targetHospital,
        transport,
        payload,
        defaultExploreSnapState,
        currentSnapState: sheetSnapState,
      });
      setSheetView(transition.sheetView);
      setCommitFlow(transition.commitFlow);
    },
    [
      defaultExploreSnapState,
      discoveredHospitals,
      featuredHospital,
      nearestHospital,
      promoteHospitalSelection,
      selectedHospital,
      setCommitFlow,
      setSheetView,
      sheetSnapState,
    ],
  );

  const openCommitTriage = useCallback(
    (nextHospital = null, transport = null, payload = null) => {
      suppressCommitRestoreRef.current = false;
      const targetHospital = promoteHospitalSelection(
        resolveMapFlowHospital({
          preferredHospital: nextHospital,
          hospitals: discoveredHospitals,
          fallbacks: [selectedHospital, featuredHospital, nearestHospital],
        }),
      );
      const transition = buildCommitTriageTransition({
        hospital: targetHospital,
        transport,
        payload,
        defaultExploreSnapState,
        currentSnapState: sheetSnapState,
      });
      setSheetView(transition.sheetView);
      setCommitFlow(transition.commitFlow);
    },
    [
      defaultExploreSnapState,
      discoveredHospitals,
      featuredHospital,
      nearestHospital,
      promoteHospitalSelection,
      selectedHospital,
      setCommitFlow,
      setSheetView,
      sheetSnapState,
    ],
  );

  const openCommitPayment = useCallback(
    (nextHospital = null, transport = null, payload = null) => {
      suppressCommitRestoreRef.current = false;
      const targetHospital = promoteHospitalSelection(
        resolveMapFlowHospital({
          preferredHospital: nextHospital,
          hospitals: discoveredHospitals,
          fallbacks: [selectedHospital, featuredHospital, nearestHospital],
        }),
      );
      const transition = buildCommitPaymentTransition({
        hospital: targetHospital,
        transport,
        payload,
        defaultExploreSnapState,
        currentSnapState: sheetSnapState,
        usesSidebarLayout,
      });
      setSheetView(transition.sheetView);
      setCommitFlow(transition.commitFlow);
    },
    [
      defaultExploreSnapState,
      discoveredHospitals,
      featuredHospital,
      nearestHospital,
      promoteHospitalSelection,
      selectedHospital,
      setCommitFlow,
      setSheetView,
      sheetSnapState,
      usesSidebarLayout,
    ],
  );

  const closeCommitDetails = useCallback(() => {
    suppressCommitRestoreRef.current = true;
    clearCommitFlow();
    const sourcePhase =
      sheetPayload?.sourcePhase || MAP_SHEET_PHASES.AMBULANCE_DECISION;
    const sourceSnapState =
      sheetPayload?.sourceSnapState || defaultExploreSnapState;
    const sourceHospital = sheetPayload?.hospital || featuredHospital || null;
    if (sourceHospital) {
      setFeaturedHospital(sourceHospital);
    }
    setSheetView(
      buildSourceReturnSheetView({
        payload: sheetPayload,
        fallbackPhase: sourcePhase,
        fallbackSnapState: sourceSnapState,
        fallbackPayload: null,
      }),
    );
  }, [
    clearCommitFlow,
    defaultExploreSnapState,
    featuredHospital,
    setFeaturedHospital,
    setSheetView,
    sheetPayload,
  ]);

  const closeCommitTriage = useCallback(() => {
    suppressCommitRestoreRef.current = true;
    clearCommitFlow();
    const sourcePhase =
      sheetPayload?.sourcePhase || MAP_SHEET_PHASES.COMMIT_DETAILS;
    const sourceSnapState =
      sheetPayload?.sourceSnapState || MAP_SHEET_SNAP_STATES.EXPANDED;
    const sourceHospital = sheetPayload?.hospital || featuredHospital || null;
    if (sourceHospital) {
      setFeaturedHospital(sourceHospital);
    }
    setSheetView(
      buildSourceReturnSheetView({
        payload: sheetPayload,
        fallbackPhase: sourcePhase,
        fallbackSnapState: sourceSnapState,
        fallbackPayload: null,
      }),
    );
  }, [
    clearCommitFlow,
    featuredHospital,
    setFeaturedHospital,
    setSheetView,
    sheetPayload,
  ]);

  const closeCommitPayment = useCallback(() => {
    suppressCommitRestoreRef.current = true;
    clearCommitFlow();
    // Use the phase that opened payment so the back button restores the correct
    // prior phase (BED_DECISION for bed/both flows, COMMIT_DETAILS for ambulance).
    const sourcePhase =
      sheetPayload?.sourcePhase || MAP_SHEET_PHASES.AMBULANCE_DECISION;
    const sourceSnapState =
      sheetPayload?.sourceSnapState || defaultExploreSnapState;
    const sourceHospital = sheetPayload?.hospital || featuredHospital || null;
    if (sourceHospital) {
      setFeaturedHospital(sourceHospital);
    }
    setSheetView(
      buildSourceReturnSheetView({
        payload: sheetPayload,
        fallbackPhase: sourcePhase,
        fallbackSnapState: sourceSnapState,
        fallbackPayload: null,
      }),
    );
  }, [
    clearCommitFlow,
    defaultExploreSnapState,
    featuredHospital,
    setFeaturedHospital,
    setSheetView,
    sheetPayload,
  ]);

  const finishCommitPayment = useCallback(() => {
    suppressCommitRestoreRef.current = true;
    clearCommitFlow();
    if (trackingRequestKey) {
      openTracking();
      return;
    }
    setSheetView(buildExploreIntentSheetView(defaultExploreSnapState));
  }, [
    clearCommitFlow,
    defaultExploreSnapState,
    openTracking,
    setSheetView,
    trackingRequestKey,
  ]);

  return {
    suppressCommitRestoreRef,
    openCommitDetails,
    openCommitTriage,
    openCommitPayment,
    closeCommitDetails,
    closeCommitTriage,
    closeCommitPayment,
    finishCommitPayment,
  };
}

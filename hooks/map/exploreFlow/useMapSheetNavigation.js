// hooks/map/exploreFlow/useMapSheetNavigation.js
// PULLBACK NOTE: Extracted from useMapExploreFlow.js
// Owns: all sheet open/close handlers except commit phase (owned by useMapCommitFlow)
//       and service detail (owned by useMapServiceDetail)

import { useCallback } from "react";
import { useMapSheetPhaseReducer } from "../state/useMapSheetPhaseReducer";
import {
  MAP_SHEET_PHASES,
} from "../../../components/map/core/MapSheetOrchestrator";
import {
  buildAmbulanceDecisionSheetView,
  buildBedDecisionSheetView,
  buildExploreIntentSheetView,
  buildHospitalDetailSheetView,
  buildHospitalListSheetView,
  buildSearchSheetView,
  buildSourceReturnSheetView,
  buildTrackingOrExploreReturnSheetView,
  buildVisitDetailSheetView,
  resolveMapFlowHospital,
} from "./mapExploreFlow.transitions";
import {
  buildAmbulanceDecisionSourcePayload,
  buildBedDecisionSourcePayload,
} from "../../../components/map/core/mapSheetFlowPayloads";
import { MAP_SEARCH_SHEET_MODES } from "../../../components/map/surfaces/search/mapSearchSheet.helpers";

/**
 * useMapSheetNavigation
 *
 * Provides open/close callbacks for all map sheet surfaces:
 * search, hospital list, ambulance decision, bed decision,
 * hospital detail, visit detail. Does NOT own commit phases
 * (useMapCommitFlow) or service detail (useMapServiceDetail).
 */
export function useMapSheetNavigation({
  sheetPhase,
  sheetPayload,
  sheetSnapState,
  defaultExploreSnapState,
  usesSidebarLayout,
  discoveredHospitals,
  selectedHospital,
  featuredHospital,
  nearestHospital,
  promoteHospitalSelection,
  clearCommitFlow,
  selectHospital,
  setFeaturedHospital,
  setSearchSheetMode,
  setSheetView,
}) {
  // PULLBACK NOTE: Pass 3 valid-transitions reducer — wraps setSheetView with __DEV__ warn-only guard
  // OLD: setSheetView called directly — no transition validation
  // NEW: transitionTo() validates against VALID_TRANSITIONS table in __DEV__, then delegates
  const { transitionTo, goBack } = useMapSheetPhaseReducer({
    sheetPhase,
    sheetPayload,
    defaultExploreSnapState,
    setSheetView,
  });
  const openSearchSheet = useCallback(
    (nextMode = MAP_SEARCH_SHEET_MODES.SEARCH) => {
      setSearchSheetMode(nextMode);
      transitionTo(buildSearchSheetView());
    },
    [setSearchSheetMode, transitionTo],
  );

  const closeSearchSheet = useCallback(() => {
    goBack();
  }, [goBack]);

  const openHospitalList = useCallback(() => {
    transitionTo(buildHospitalListSheetView());
  }, [transitionTo]);

  const openAmbulanceDecision = useCallback(
    (nextHospital = null, payload = null) => {
      promoteHospitalSelection(
        resolveMapFlowHospital({
          preferredHospital: nextHospital,
          hospitals: discoveredHospitals,
          fallbacks: [selectedHospital, featuredHospital, nearestHospital],
        }),
      );
      transitionTo(
        buildAmbulanceDecisionSheetView({
          defaultSnapState: defaultExploreSnapState,
          payload,
        }),
      );
    },
    [
      defaultExploreSnapState,
      discoveredHospitals,
      featuredHospital,
      nearestHospital,
      promoteHospitalSelection,
      selectedHospital,
      transitionTo,
    ],
  );

  const openAmbulanceHospitalList = useCallback(() => {
    transitionTo(
      buildHospitalListSheetView({
        sourcePhase: MAP_SHEET_PHASES.AMBULANCE_DECISION,
        sourceSnapState: sheetSnapState || defaultExploreSnapState,
        sourcePayload: buildAmbulanceDecisionSourcePayload({
          payload: sheetPayload,
        }),
      }),
    );
  }, [
    defaultExploreSnapState,
    transitionTo,
    sheetPayload,
    sheetSnapState,
  ]);

  const openBedDecision = useCallback(
    (nextHospital = null, careIntent = "bed", payload = null) => {
      promoteHospitalSelection(
        resolveMapFlowHospital({
          preferredHospital: nextHospital,
          hospitals: discoveredHospitals,
          fallbacks: [selectedHospital, featuredHospital, nearestHospital],
        }),
      );
      transitionTo(
        buildBedDecisionSheetView({
          defaultSnapState: defaultExploreSnapState,
          careIntent,
          payload,
        }),
      );
    },
    [
      defaultExploreSnapState,
      discoveredHospitals,
      featuredHospital,
      nearestHospital,
      promoteHospitalSelection,
      selectedHospital,
      transitionTo,
    ],
  );

  const openBedHospitalList = useCallback(() => {
    transitionTo(
      buildHospitalListSheetView({
        sourcePhase: MAP_SHEET_PHASES.BED_DECISION,
        sourceSnapState: sheetSnapState || defaultExploreSnapState,
        sourcePayload: buildBedDecisionSourcePayload({
          careIntent: sheetPayload?.careIntent === "both" ? "both" : "bed",
          savedTransport:
            sheetPayload?.careIntent === "both"
              ? sheetPayload?.savedTransport || null
              : null,
          payload: sheetPayload,
        }),
      }),
    );
  }, [
    defaultExploreSnapState,
    transitionTo,
    sheetPayload?.careIntent,
    sheetSnapState,
  ]);

  // PULLBACK NOTE: Pass 3 — closeHospitalList now delegates to goBack() which reads sourcePhase from payload
  // OLD: inline sourcePhase check + setSheetView  NEW: goBack() handles both cases
  const closeHospitalList = useCallback(() => {
    goBack();
  }, [goBack]);

  const handleSelectHospital = useCallback(
    (hospital) => {
      const nextHospitalId = hospital?.id || null;
      const nextCareIntent =
        sheetPayload?.sourcePayload?.careIntent === "both" ? "both" : "bed";
      const savedTransportHospitalId =
        sheetPayload?.sourcePayload?.savedTransport?.hospitalId || null;

      // Transport pricing and availability are hospital-scoped, so step 2 cannot
      // keep showing a saved ambulance choice after the user switches hospitals.
      if (
        sheetPayload?.sourcePhase === MAP_SHEET_PHASES.BED_DECISION &&
        nextCareIntent === "both" &&
        nextHospitalId &&
        savedTransportHospitalId !== nextHospitalId
      ) {
        openAmbulanceDecision(hospital);
        return;
      }

      if (hospital?.id) {
        selectHospital(hospital.id);
        setFeaturedHospital(hospital);
      }
      closeHospitalList();
    },
    [
      closeHospitalList,
      openAmbulanceDecision,
      selectHospital,
      setFeaturedHospital,
      sheetPayload?.sourcePhase,
      sheetPayload?.sourcePayload?.careIntent,
      sheetPayload?.sourcePayload?.savedTransport?.hospitalId,
    ],
  );

  const openHospitalDetail = useCallback(
    (hospital) => {
      if (hospital) {
        setFeaturedHospital(hospital);
      }
      transitionTo(buildHospitalDetailSheetView({ usesSidebarLayout }));
    },
    [setFeaturedHospital, transitionTo, usesSidebarLayout],
  );

  const closeHospitalDetail = useCallback(() => {
    goBack();
  }, [goBack]);

  const openVisitDetail = useCallback(
    (historyItem, sourcePhase = null) => {
      transitionTo(
        buildVisitDetailSheetView({ usesSidebarLayout, historyItem: historyItem || null, sourcePhase }),
      );
    },
    [transitionTo, usesSidebarLayout],
  );

  // VD-B (EC-VD-2): PULLBACK NOTE: Pass 3 — goBack() handles sourcePhase return
  // OLD: inline origin check + setSheetView  NEW: goBack() reads payload.sourcePhase
  const closeVisitDetail = useCallback(() => {
    goBack();
  }, [goBack]);

  const closeAmbulanceDecision = useCallback(() => {
    clearCommitFlow();
    transitionTo(
      buildTrackingOrExploreReturnSheetView({
        payload: sheetPayload,
        defaultExploreSnapState,
      }),
    );
  }, [
    clearCommitFlow,
    defaultExploreSnapState,
    transitionTo,
    sheetPayload?.sourcePayload,
    sheetPayload?.sourcePhase,
    sheetPayload?.sourceSnapState,
  ]);

  const closeBedDecision = useCallback(() => {
    clearCommitFlow();
    transitionTo(
      buildTrackingOrExploreReturnSheetView({
        payload: sheetPayload,
        defaultExploreSnapState,
      }),
    );
  }, [
    clearCommitFlow,
    defaultExploreSnapState,
    transitionTo,
    sheetPayload?.sourcePayload,
    sheetPayload?.sourcePhase,
    sheetPayload?.sourceSnapState,
  ]);

  return {
    openSearchSheet,
    closeSearchSheet,
    openHospitalList,
    openAmbulanceDecision,
    openAmbulanceHospitalList,
    openBedDecision,
    openBedHospitalList,
    closeHospitalList,
    handleSelectHospital,
    openHospitalDetail,
    closeHospitalDetail,
    openVisitDetail,
    closeVisitDetail,
    closeAmbulanceDecision,
    closeBedDecision,
  };
}

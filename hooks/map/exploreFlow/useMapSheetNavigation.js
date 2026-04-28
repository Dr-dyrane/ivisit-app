// hooks/map/exploreFlow/useMapSheetNavigation.js
// PULLBACK NOTE: Extracted from useMapExploreFlow.js
// Owns: all sheet open/close handlers except commit phase (owned by useMapCommitFlow)
//       and service detail (owned by useMapServiceDetail)

import { useCallback } from "react";
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
  const openSearchSheet = useCallback(
    (nextMode = MAP_SEARCH_SHEET_MODES.SEARCH) => {
      setSearchSheetMode(nextMode);
      setSheetView(buildSearchSheetView());
    },
    [setSearchSheetMode, setSheetView],
  );

  const closeSearchSheet = useCallback(() => {
    setSheetView(buildExploreIntentSheetView(defaultExploreSnapState));
  }, [defaultExploreSnapState, setSheetView]);

  const openHospitalList = useCallback(() => {
    setSheetView(buildHospitalListSheetView());
  }, [setSheetView]);

  const openAmbulanceDecision = useCallback(
    (nextHospital = null, payload = null) => {
      promoteHospitalSelection(
        resolveMapFlowHospital({
          preferredHospital: nextHospital,
          hospitals: discoveredHospitals,
          fallbacks: [selectedHospital, featuredHospital, nearestHospital],
        }),
      );
      setSheetView(
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
      setSheetView,
    ],
  );

  const openAmbulanceHospitalList = useCallback(() => {
    setSheetView(
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
    setSheetView,
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
      setSheetView(
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
      setSheetView,
    ],
  );

  const openBedHospitalList = useCallback(() => {
    setSheetView(
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
    setSheetView,
    sheetPayload?.careIntent,
    sheetSnapState,
  ]);

  const closeHospitalList = useCallback(() => {
    if (
      sheetPayload?.sourcePhase === MAP_SHEET_PHASES.AMBULANCE_DECISION ||
      sheetPayload?.sourcePhase === MAP_SHEET_PHASES.BED_DECISION
    ) {
      setSheetView(
        buildSourceReturnSheetView({
          payload: sheetPayload,
          fallbackPhase: sheetPayload?.sourcePhase,
          fallbackSnapState: defaultExploreSnapState,
          fallbackPayload: null,
        }),
      );
      return;
    }
    setSheetView(buildExploreIntentSheetView(defaultExploreSnapState));
  }, [
    defaultExploreSnapState,
    setSheetView,
    sheetPayload?.sourcePhase,
    sheetPayload?.sourcePayload,
    sheetPayload?.sourceSnapState,
  ]);

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
      setSheetView(buildHospitalDetailSheetView({ usesSidebarLayout }));
    },
    [setFeaturedHospital, setSheetView, usesSidebarLayout],
  );

  const closeHospitalDetail = useCallback(() => {
    setSheetView(buildExploreIntentSheetView(defaultExploreSnapState));
  }, [defaultExploreSnapState, setSheetView]);

  const openVisitDetail = useCallback(
    (historyItem, sourcePhase = null) => {
      setSheetView(
        buildVisitDetailSheetView({ usesSidebarLayout, historyItem: historyItem || null, sourcePhase }),
      );
    },
    [setSheetView, usesSidebarLayout],
  );

  // VD-B (EC-VD-2): return to sourcePhase if set, else fall back to EXPLORE_INTENT
  const closeVisitDetail = useCallback(() => {
    const origin = sheetPayload?.sourcePhase;
    if (origin && origin !== MAP_SHEET_PHASES.VISIT_DETAIL) {
      setSheetView(
        buildSourceReturnSheetView({
          payload: sheetPayload,
          fallbackPhase: origin,
          fallbackSnapState: defaultExploreSnapState,
          fallbackPayload: null,
        }),
      );
      return;
    }
    setSheetView(buildExploreIntentSheetView(defaultExploreSnapState));
  }, [defaultExploreSnapState, setSheetView, sheetPayload]);

  const closeAmbulanceDecision = useCallback(() => {
    clearCommitFlow();
    setSheetView(
      buildTrackingOrExploreReturnSheetView({
        payload: sheetPayload,
        defaultExploreSnapState,
      }),
    );
  }, [
    clearCommitFlow,
    defaultExploreSnapState,
    setSheetView,
    sheetPayload?.sourcePayload,
    sheetPayload?.sourcePhase,
    sheetPayload?.sourceSnapState,
  ]);

  const closeBedDecision = useCallback(() => {
    clearCommitFlow();
    setSheetView(
      buildTrackingOrExploreReturnSheetView({
        payload: sheetPayload,
        defaultExploreSnapState,
      }),
    );
  }, [
    clearCommitFlow,
    defaultExploreSnapState,
    setSheetView,
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

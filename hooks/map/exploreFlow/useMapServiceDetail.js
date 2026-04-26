// hooks/map/exploreFlow/useMapServiceDetail.js
// PULLBACK NOTE: Extracted from useMapExploreFlow.js
// Owns: service detail open/close/change/confirm handlers and hospital service selection

import { useCallback } from "react";
import {
  MAP_SHEET_PHASES,
  MAP_SHEET_SNAP_STATES,
} from "../../../components/map/core/MapSheetOrchestrator";
import {
  buildServiceDetailSheetView,
  buildSourceReturnSheetView,
} from "./mapExploreFlow.transitions";

/**
 * useMapServiceDetail
 *
 * Manages the service detail sheet: open, change active service,
 * close (with source-return logic), and confirm (persists selection).
 */
export function useMapServiceDetail({
  sheetPayload,
  sheetSnapState,
  usesSidebarLayout,
  featuredHospital,
  setFeaturedHospital,
  setSheetPayload,
  setSheetView,
  setHospitalServiceSelectionValue,
}) {
  const setHospitalServiceSelection = useCallback(
    (hospitalId, key, value) => {
      if (!hospitalId || !key) return;
      setHospitalServiceSelectionValue(hospitalId, key, value);
    },
    [setHospitalServiceSelectionValue],
  );

  const openServiceDetail = useCallback(
    ({
      hospital,
      service,
      serviceType,
      serviceItems = [],
      sourcePhase = MAP_SHEET_PHASES.HOSPITAL_DETAIL,
      sourceSnapState = sheetSnapState,
      sourcePayload = null,
    }) => {
      if (!hospital || !service || !serviceType) return;
      setFeaturedHospital(hospital);
      setSheetView(
        buildServiceDetailSheetView({
          hospital,
          service,
          serviceType,
          serviceItems,
          sourcePhase,
          sourceSnapState,
          sourcePayload,
        }),
      );
    },
    [setFeaturedHospital, setSheetView, sheetSnapState],
  );

  const changeServiceDetailService = useCallback(
    (nextService) => {
      if (!nextService || !sheetPayload) return;
      setSheetPayload({
        ...sheetPayload,
        service: nextService,
      });
    },
    [setSheetPayload, sheetPayload],
  );

  const closeServiceDetail = useCallback(() => {
    const sourcePhase =
      sheetPayload?.sourcePhase || MAP_SHEET_PHASES.HOSPITAL_DETAIL;
    const sourceSnapState =
      sheetPayload?.sourceSnapState ||
      (usesSidebarLayout
        ? MAP_SHEET_SNAP_STATES.EXPANDED
        : MAP_SHEET_SNAP_STATES.HALF);
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
    featuredHospital,
    setFeaturedHospital,
    setSheetView,
    sheetPayload,
    usesSidebarLayout,
  ]);

  const confirmServiceDetail = useCallback(() => {
    const hospitalId = sheetPayload?.hospital?.id;
    const service = sheetPayload?.service;
    const serviceType = sheetPayload?.serviceType;
    if (!hospitalId || !service || !serviceType) {
      closeServiceDetail();
      return;
    }
    const selectedItemId =
      service.id || service.title || `${serviceType}-selected`;
    if (serviceType === "room") {
      setHospitalServiceSelection(hospitalId, "roomServiceId", selectedItemId);
    } else {
      setHospitalServiceSelection(
        hospitalId,
        "ambulanceServiceId",
        selectedItemId,
      );
    }
    closeServiceDetail();
  }, [closeServiceDetail, setHospitalServiceSelection, sheetPayload]);

  return {
    setHospitalServiceSelection,
    openServiceDetail,
    changeServiceDetailService,
    closeServiceDetail,
    confirmServiceDetail,
  };
}

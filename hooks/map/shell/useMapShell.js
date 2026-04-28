// PULLBACK NOTE: MapScreen decomposition Pass 1 — extracted from MapScreen.jsx lines 163–241
// OLD: viewport/layout memos and hasActiveMapModal lived inline in MapScreen body
// NEW: useMapShell owns all shell-level derivations; MapScreen passes raw values in, gets derived values out
// Recovery: git checkout HEAD~1 -- screens/MapScreen.jsx && rm hooks/map/shell/useMapShell.js

import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { historyPaymentStateAtom, recoveredRatingStateAtom } from "../../../atoms/mapScreenAtoms";
import { Platform } from "react-native";
import {
  getMapViewportVariant,
  getMapViewportSurfaceConfig,
  isSidebarMapVariant,
} from "../../../components/map/core/mapViewportConfig";
import {
  MAP_SHEET_SNAP_STATES,
  getMapSheetHeight,
} from "../../../components/map/core/MapSheetOrchestrator";

/**
 * useMapShell
 *
 * Derives all shell-level layout and modal state from raw MapScreen inputs.
 * Pure derivation — no side effects, no state.
 */
export function useMapShell({
  width,
  height,
  sheetSnapState,
  activeMapRequest,
  activeAmbulanceTrip,
  activeBedBooking,
  pendingApproval,
  profileModalVisible,
  guestProfileVisible,
  careHistoryVisible,
  recentVisitsVisible,
  authModalVisible,
  mapLoadingState,
  historyRatingState,
}) {
  const historyPaymentState = useAtomValue(historyPaymentStateAtom);
  const recoveredRatingState = useAtomValue(recoveredRatingStateAtom);
  const viewportVariant = useMemo(
    () => getMapViewportVariant({ platform: Platform.OS, width }),
    [width],
  );

  const surfaceConfig = useMemo(
    () => getMapViewportSurfaceConfig(viewportVariant),
    [viewportVariant],
  );

  const usesSidebarLayout = isSidebarMapVariant(viewportVariant);

  const renderedSnapState = usesSidebarLayout
    ? MAP_SHEET_SNAP_STATES.EXPANDED
    : sheetSnapState;

  const bottomSheetHeight = useMemo(
    () =>
      usesSidebarLayout ? 0 : getMapSheetHeight(height, renderedSnapState),
    [height, renderedSnapState, usesSidebarLayout],
  );

  const sidebarWidth = useMemo(
    () =>
      usesSidebarLayout
        ? Math.min(
            surfaceConfig.sidebarMaxWidth || Math.max(400, width * 0.36),
            Math.max(320, width - 48),
          )
        : 0,
    [surfaceConfig.sidebarMaxWidth, usesSidebarLayout, width],
  );

  const sidebarOcclusionWidth = useMemo(
    () =>
      usesSidebarLayout
        ? sidebarWidth + Math.max(0, Number(surfaceConfig.sidebarOuterInset || 0))
        : 0,
    [sidebarWidth, surfaceConfig.sidebarOuterInset, usesSidebarLayout],
  );

  const activeHistoryRequestKeys = useMemo(() => {
    return new Set(
      [
        activeMapRequest?.requestId,
        activeMapRequest?.id,
        activeMapRequest?.record?.displayId,
        activeAmbulanceTrip?.displayId,
        activeBedBooking?.displayId,
        pendingApproval?.displayId,
      ]
        .filter(
          (value) =>
            value !== null && value !== undefined && String(value).trim().length > 0,
        )
        .map((value) => String(value)),
    );
  }, [
    activeAmbulanceTrip?.displayId,
    activeBedBooking?.displayId,
    activeMapRequest?.id,
    activeMapRequest?.record?.displayId,
    activeMapRequest?.requestId,
    pendingApproval?.displayId,
  ]);

  const hasActiveMapModal = useMemo(
    () =>
      profileModalVisible ||
      guestProfileVisible ||
      careHistoryVisible ||
      recentVisitsVisible ||
      historyPaymentState?.visible ||
      Boolean(historyRatingState?.visible) ||
      authModalVisible ||
      Boolean(recoveredRatingState?.visible) ||
      mapLoadingState?.visible,
    [
      profileModalVisible,
      guestProfileVisible,
      careHistoryVisible,
      recentVisitsVisible,
      historyPaymentState?.visible,
      historyRatingState?.visible,
      authModalVisible,
      recoveredRatingState?.visible,
      mapLoadingState?.visible,
    ],
  );

  return {
    viewportVariant,
    surfaceConfig,
    usesSidebarLayout,
    renderedSnapState,
    bottomSheetHeight,
    sidebarWidth,
    sidebarOcclusionWidth,
    activeHistoryRequestKeys,
    hasActiveMapModal,
  };
}

import { useAtomValue } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { trackingRouteInfoAtom } from "../../../../atoms/mapScreenAtoms";
import { EmergencyRequestStatus } from "../../../../services/emergencyRequestsService";
import { useEmergencyHandlers } from "../../../../hooks/emergency/useEmergencyHandlers";
import { useTripProgress } from "../../../../hooks/emergency/useTripProgress";
import { useBedBookingProgress } from "../../../../hooks/emergency/useBedBookingProgress";
import {
  hasMeaningfulTriageDraftData,
  normalizeTriageDraft,
  triageStepAnswered,
} from "../../../emergency/triage/triageFlow.shared";
import { buildMapCommitTriageSteps } from "../commitTriage/mapCommitTriage.helpers";
import { buildTrackingActionEligibility } from "./mapTracking.actions";
import { buildTrackingViewState } from "./mapTracking.derived";
import { buildTrackingRuntimeSnapshot } from "./mapTracking.snapshot";

export const TRACKING_TRIAGE_STEP_FLOOR = 7;

export function useMapTrackingRuntime({
  hospitals = [],
  allHospitals = [],
  hospital,
  payload = null,
  activeMapRequest = null,
  currentLocation = null,
  routeInfo = null,
  activeAmbulanceTrip,
  ambulanceTelemetryHealth,
  activeBedBooking,
  pendingApproval,
  // Pending approval may come from the lifecycle machine. Arrival is read from
  // the canonical request status below so ETA progress cannot manufacture it.
  isPendingApproval: isPendingApprovalProp,
  isDarkMode,
  setRequestStatus,
  setAmbulanceTripStatus,
  setBedBookingStatus,
  stopAmbulanceTrip,
  stopBedBooking,
}) {
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    setNowMs(Date.now());
    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const triageRequestId =
    activeMapRequest?.requestId ||
    activeAmbulanceTrip?.requestId ||
    activeBedBooking?.requestId ||
    pendingApproval?.requestId ||
    null;
  const triageRequestDraft = useMemo(
    () =>
      normalizeTriageDraft(
        activeAmbulanceTrip?.triage?.signals?.userCheckin ||
          activeAmbulanceTrip?.triageSnapshot?.signals?.userCheckin ||
          activeAmbulanceTrip?.triageCheckin ||
          activeBedBooking?.triage?.signals?.userCheckin ||
          activeBedBooking?.triageSnapshot?.signals?.userCheckin ||
          activeBedBooking?.triageCheckin ||
          pendingApproval?.triage?.signals?.userCheckin ||
          pendingApproval?.triageSnapshot?.signals?.userCheckin ||
          pendingApproval?.initiatedData?.triageCheckin ||
          null,
      ),
    [
      activeAmbulanceTrip?.triage?.signals?.userCheckin,
      activeAmbulanceTrip?.triageCheckin,
      activeAmbulanceTrip?.triageSnapshot?.signals?.userCheckin,
      activeBedBooking?.triage?.signals?.userCheckin,
      activeBedBooking?.triageCheckin,
      activeBedBooking?.triageSnapshot?.signals?.userCheckin,
      pendingApproval?.initiatedData?.triageCheckin,
      pendingApproval?.triage?.signals?.userCheckin,
      pendingApproval?.triageSnapshot?.signals?.userCheckin,
    ],
  );
  const triageSteps = useMemo(() => buildMapCommitTriageSteps(false), []);
  const triageDisplayTotalSteps = Math.max(
    TRACKING_TRIAGE_STEP_FLOOR,
    triageSteps.length || 0,
  );
  const triageAnsweredCount = useMemo(
    () =>
      triageSteps.filter((step) => triageStepAnswered(step, triageRequestDraft))
        .length,
    [triageRequestDraft, triageSteps],
  );
  const triageIsComplete =
    triageSteps.length > 0 && triageAnsweredCount >= triageSteps.length;
  const triageProgressValue =
    triageDisplayTotalSteps > 0
      ? triageAnsweredCount / triageDisplayTotalSteps
      : 0;
  const triageHasData = hasMeaningfulTriageDraftData(triageRequestDraft);

  const {
    onCancelAmbulanceTrip,
    onMarkAmbulanceArrived,
    onCompleteAmbulanceTrip,
    onCancelBedBooking,
    onMarkBedOccupied,
    onCompleteBedBooking,
  } = useEmergencyHandlers({
    activeAmbulanceTrip,
    activeBedBooking,
    setRequestStatus,
    setAmbulanceTripStatus,
    setBedBookingStatus,
    stopAmbulanceTrip,
    stopBedBooking,
  });

  // PULLBACK NOTE: ETA display fix — subscribe to trackingRouteInfoAtom directly so
  // durationSec is always current. The prop-chain path (routeInfo) can be stale on
  // fresh trip open: useMapTrackingSync resets the atom when a new requestKey is
  // detected, and EmergencyLocationPreviewMap won't re-fire onRouteInfoChange because
  // its signature ref hasn't changed. Reading the atom here bypasses that gap.
  // When activeAmbulanceTrip.etaSeconds is null (store not yet patched), the live
  // durationSec from the atom is used as a transient fallback so useTripProgress
  // computes remainingSeconds immediately. Once the store is patched, the store value
  // takes over and the atom fallback has no effect.
  const liveRouteInfo = useAtomValue(trackingRouteInfoAtom);
  const trackingRouteRequestKey =
    activeMapRequest?.requestId != null
      ? String(activeMapRequest.requestId)
      : activeAmbulanceTrip?.requestId != null
        ? String(activeAmbulanceTrip.requestId)
        : activeAmbulanceTrip?.id != null
          ? String(activeAmbulanceTrip.id)
          : null;
  const scopedLiveRouteInfo =
    liveRouteInfo?.requestKey === trackingRouteRequestKey
      ? liveRouteInfo
      : null;
  const ambulanceTripForProgress = useMemo(() => {
    if (!activeAmbulanceTrip) return activeAmbulanceTrip;
    if (
      Number.isFinite(activeAmbulanceTrip.etaSeconds) &&
      activeAmbulanceTrip.etaSeconds > 0
    )
      return activeAmbulanceTrip;
    const fallbackEta = scopedLiveRouteInfo?.durationSec;
    if (!Number.isFinite(fallbackEta) || fallbackEta <= 0)
      return activeAmbulanceTrip;
    return { ...activeAmbulanceTrip, etaSeconds: fallbackEta };
  }, [activeAmbulanceTrip, scopedLiveRouteInfo?.durationSec]);

  const {
    remainingSeconds: ambulanceRemainingSeconds,
    tripProgress: ambulanceTripProgress,
    computedStatus: ambulanceComputedStatus,
  } = useTripProgress({
    activeAmbulanceTrip: ambulanceTripForProgress,
    nowMs,
  });
  const { remainingBedSeconds, bedProgress, bedStatus, formattedBedRemaining } =
    useBedBookingProgress({
      activeBedBooking,
      nowMs,
    });

  const isPendingApproval =
    isPendingApprovalProp ??
    (activeAmbulanceTrip?.status === EmergencyRequestStatus.PENDING_APPROVAL ||
      activeBedBooking?.status === EmergencyRequestStatus.PENDING_APPROVAL ||
      !!pendingApproval?.requestId);
  const resolvedStatus = String(
    (
      activeAmbulanceTrip?.status ||
      activeBedBooking?.status ||
      pendingApproval?.status ||
      ""
    ).toLowerCase(),
  );
  const isArrived = resolvedStatus === EmergencyRequestStatus.ARRIVED;
  const snapshotRouteInfo = useMemo(() => {
    const liveCoordinates = Array.isArray(scopedLiveRouteInfo?.coordinates)
      ? scopedLiveRouteInfo.coordinates
      : [];
    const hasLiveRouteInfo =
      (Number.isFinite(Number(scopedLiveRouteInfo?.durationSec)) &&
        Number(scopedLiveRouteInfo.durationSec) >= 0) ||
      liveCoordinates.length >= 2;
    return hasLiveRouteInfo ? scopedLiveRouteInfo : routeInfo;
  }, [scopedLiveRouteInfo, routeInfo]);
  const shouldShowArrivedStage = Boolean(isArrived);

  const trackingSnapshot = useMemo(
    () =>
      buildTrackingRuntimeSnapshot({
        activeMapRequest,
        activeAmbulanceTrip,
        activeBedBooking,
        pendingApproval,
        routeInfo: snapshotRouteInfo,
        ambulanceTelemetryHealth,
        isArrived: shouldShowArrivedStage,
        isPendingApproval,
        progress: ambulanceTripProgress,
      }),
    [
      activeMapRequest,
      activeAmbulanceTrip,
      activeBedBooking,
      ambulanceTelemetryHealth,
      ambulanceTripProgress,
      isArrived,
      isPendingApproval,
      pendingApproval,
      shouldShowArrivedStage,
      snapshotRouteInfo,
    ],
  );

  const viewState = useMemo(
    () =>
      buildTrackingViewState({
        hospitals,
        allHospitals,
        hospital,
        payload,
        currentLocation,
        routeInfo: snapshotRouteInfo,
        activeMapRequest,
        activeAmbulanceTrip,
        activeBedBooking,
        pendingApproval,
        ambulanceTelemetryHealth,
        ambulanceRemainingSeconds,
        remainingBedSeconds,
        bedStatus,
        ambulanceComputedStatus,
        resolvedStatus,
        nowMs,
        isDarkMode,
      }),
    [
      activeMapRequest,
      activeAmbulanceTrip,
      activeBedBooking,
      allHospitals,
      ambulanceComputedStatus,
      ambulanceRemainingSeconds,
      ambulanceTelemetryHealth,
      bedStatus,
      currentLocation,
      hospital,
      hospitals,
      isDarkMode,
      nowMs,
      payload,
      pendingApproval,
      remainingBedSeconds,
      resolvedStatus,
      snapshotRouteInfo,
    ],
  );

  const routeVisualProgress = useMemo(() => {
    if (viewState.trackingKind !== "ambulance") return 0;
    if (resolvedStatus === EmergencyRequestStatus.IN_PROGRESS) return 0;
    if (
      resolvedStatus === EmergencyRequestStatus.ARRIVED ||
      resolvedStatus === EmergencyRequestStatus.COMPLETED ||
      shouldShowArrivedStage
    ) {
      return 1;
    }
    if (!Number.isFinite(ambulanceTripProgress)) return 0;
    return Math.max(0, Math.min(1, ambulanceTripProgress));
  }, [
    ambulanceTripProgress,
    resolvedStatus,
    shouldShowArrivedStage,
    viewState.trackingKind,
  ]);

  const actionEligibility = useMemo(
    () =>
      buildTrackingActionEligibility({
        trackingSnapshot,
        trackingKind: viewState.trackingKind,
        activeMapRequest,
        ambulanceComputedStatus,
        bedStatus,
        isArrived,
        triageHasData,
        triageIsComplete,
        pendingApprovalRequestId: pendingApproval?.requestId ?? null,
      }),
    [
      activeMapRequest,
      ambulanceComputedStatus,
      bedStatus,
      isArrived,
      pendingApproval?.requestId,
      trackingSnapshot,
      triageHasData,
      triageIsComplete,
      viewState.trackingKind,
    ],
  );

  return {
    triageRequestId,
    triageRequestDraft,
    triageAnsweredCount,
    triageDisplayTotalSteps,
    triageHasData,
    triageIsComplete,
    triageProgressValue,
    trackingSnapshot,
    ambulanceTripProgress,
    bedProgress,
    formattedBedRemaining,
    ambulanceComputedStatus,
    resolvedStatus,
    routeVisualProgress,
    ...actionEligibility,
    onCancelAmbulanceTrip,
    onMarkAmbulanceArrived,
    onCompleteAmbulanceTrip,
    onCancelBedBooking,
    onMarkBedOccupied,
    onCompleteBedBooking,
    ...viewState,
  };
}

export default useMapTrackingRuntime;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Share } from "react-native";
import { useSetAtom } from "jotai";
import { useToast } from "../../../../contexts/ToastContext";
import {
  recoveredRatingStateAtom,
  trackingRatingStateAtom,
} from "../../../../atoms/mapScreenAtoms";
import { EmergencyRequestStatus } from "../../../../services/emergencyRequestsService";
import { EMERGENCY_VISIT_LIFECYCLE } from "../../../../constants/visits";
import { buildTrackingSharePayload } from "./mapTracking.share";
import {
  buildTrackingRatingState,
  writeTrackingRatingRecoveryClaim,
} from "./mapTracking.rating";
import {
  buildTrackingBottomAction,
  buildTrackingDestructiveAction,
  buildTrackingDetailRows,
  buildTrackingMidActions,
  buildTrackingPrimaryAction,
  buildTrackingSecondaryActions,
  resolveTrackingHeaderActionHandler,
} from "./mapTracking.model";


export function useMapTrackingController({
  activeAmbulanceTrip,
  activeBedBooking,
  pendingApproval,
  activeMapRequest,
  setPendingApproval,
  setRequestStatus,
  cancelVisit,
  updateVisit,
  onCancelAmbulanceTrip,
  onCancelBedBooking,
  onMarkAmbulanceArrived,
  onMarkBedOccupied,
  onCompleteAmbulanceTrip,
  onCompleteBedBooking,
  stopAmbulanceTrip,
  stopBedBooking,
  onAddBedFromTracking,
  onAddAmbulanceFromTracking,
  onOpenCommitTriageFromTracking,
  headerActionRequest,
  onConsumeHeaderActionRequest,
  snapState,
  trackingKind,
  hospitalName,
  triageRequestId,
  triageRequestDraft,
  triageHasData,
  triageIsComplete,
  triageAnsweredCount,
  triageDisplayTotalSteps,
  shouldPromoteTriage,
  canMarkArrived,
  canCompleteAmbulance,
  canCheckInBed,
  canCompleteBed,
  requestLabel,
  responderPlate,
  crewCountLabel,
  secondaryTrackingLabel,
  telemetryWarningLabel,
  etaLabel,
  serviceLabel,
  distanceLabel,
  pickupLabel,
  responderName,
}) {
  const { showToast } = useToast();
  const [busyAction, setBusyAction] = useState(null);
  // PULLBACK NOTE: Phase 8 — Jotai atom for cross-phase rating state persistence
  // PULLBACK NOTE: VD-C (VD-10) — controller only writes the atom (open); screen-level
  // useTrackingRatingFlow owns all close/skip/submit paths.
  const setRatingState = useSetAtom(trackingRatingStateAtom);
  const setRecoveredRatingState = useSetAtom(recoveredRatingStateAtom);
  const handledHeaderActionRef = useRef(null);
  const activeAmbulanceRequestId =
    activeMapRequest?.raw?.activeAmbulanceTrip?.requestId ||
    activeAmbulanceTrip?.requestId ||
    null;
  const activeBedBookingRequestId =
    activeMapRequest?.raw?.activeBedBooking?.requestId ||
    activeBedBooking?.requestId ||
    null;
  const pendingApprovalRequestId =
    activeMapRequest?.raw?.pendingApproval?.requestId ||
    pendingApproval?.requestId ||
    null;

  const openTrackingTriage = useCallback(() => {
    onOpenCommitTriageFromTracking?.({
      requestId: triageRequestId || null,
      triageDraft: triageRequestDraft || null,
      sourcePhase: "tracking",
      sourceSnapState: snapState,
      careIntent: trackingKind === "bed" ? "bed" : "ambulance",
    });
  }, [
    onOpenCommitTriageFromTracking,
    snapState,
    trackingKind,
    triageRequestDraft,
    triageRequestId,
  ]);

  const handleShareEta = useCallback(async () => {
    try {
      await Share.share(
        buildTrackingSharePayload({
          telemetryWarningLabel,
          etaLabel,
          serviceLabel,
          distanceLabel,
          pickupLabel,
          hospitalName,
          responderName,
          responderPlate,
        }),
      );
    } catch (_error) {
      // Native share can be cancelled by the user; no UI error needed.
    }
  }, [
    distanceLabel,
    etaLabel,
    hospitalName,
    pickupLabel,
    responderName,
    responderPlate,
    serviceLabel,
    telemetryWarningLabel,
  ]);

  const runBusyAction = useCallback(async (key, handler) => {
    if (typeof handler !== "function") return;
    setBusyAction(key);
    try {
      return await handler();
    } finally {
      setBusyAction(null);
    }
  }, []);

  const handleCancelPendingRequest = useCallback(async () => {
    if (!pendingApproval?.requestId) return;
    const lifecycleUpdatedAt = new Date().toISOString();
    await Promise.all([
      setRequestStatus(pendingApproval.requestId, EmergencyRequestStatus.CANCELLED),
      cancelVisit(pendingApproval.requestId),
      updateVisit?.(pendingApproval.requestId, {
        lifecycleState: EMERGENCY_VISIT_LIFECYCLE.CANCELLED,
        lifecycleUpdatedAt,
      }),
    ]);
    setPendingApproval(null);
  }, [
    cancelVisit,
    pendingApproval?.requestId,
    setPendingApproval,
    setRequestStatus,
    updateVisit,
  ]);

  const handleCompleteAmbulanceWithRating = useCallback(async () => {
    const visitId = activeAmbulanceTrip?.id ?? activeAmbulanceTrip?.requestId ?? null;
    const hospitalTitle = activeAmbulanceTrip?.hospitalName || hospitalName;
    const providerName =
      activeAmbulanceTrip?.assignedAmbulance?.name ||
      activeAmbulanceTrip?.assignedAmbulance?.crew?.[0] ||
      "Emergency services";
    if (!visitId) return;
    const completionResult = await runBusyAction("complete", () =>
      onCompleteAmbulanceTrip?.({ deferCleanup: true }),
    );
    if (completionResult?.ok === false) {
      showToast("Could not complete the request right now.", "error");
      return;
    }
    await writeTrackingRatingRecoveryClaim(visitId, {
      kind: "ambulance",
      hospitalTitle,
      providerName,
    });
    setRecoveredRatingState(null);
    setRatingState(
      buildTrackingRatingState({
        kind: "ambulance",
        visitId,
        hospitalTitle,
        providerName,
        completionCommitted: true,
      }),
    );
  }, [
    activeAmbulanceTrip?.assignedAmbulance?.crew,
    activeAmbulanceTrip?.assignedAmbulance?.name,
    activeAmbulanceTrip?.hospitalName,
    activeAmbulanceTrip?.id,
    activeAmbulanceTrip?.requestId,
    hospitalName,
    onCompleteAmbulanceTrip,
    runBusyAction,
    showToast,
  ]);

  const handleCompleteBedWithRating = useCallback(async () => {
    const visitId = activeBedBooking?.id ?? activeBedBooking?.requestId ?? null;
    const hospitalTitle = activeBedBooking?.hospitalName || hospitalName;
    if (!visitId) return;
    const completionResult = await runBusyAction("complete", () =>
      onCompleteBedBooking?.({ deferCleanup: true }),
    );
    if (completionResult?.ok === false) {
      showToast("Could not complete the request right now.", "error");
      return;
    }
    await writeTrackingRatingRecoveryClaim(visitId, {
      kind: "bed",
      hospitalTitle,
      providerName: "Hospital staff",
    });
    setRecoveredRatingState(null);
    setRatingState(
      buildTrackingRatingState({
        kind: "bed",
        visitId,
        hospitalTitle,
        providerName: "Hospital staff",
        completionCommitted: true,
      }),
    );
  }, [
    activeBedBooking?.hospitalName,
    activeBedBooking?.id,
    activeBedBooking?.requestId,
    hospitalName,
    onCompleteBedBooking,
    runBusyAction,
    showToast,
  ]);

  const primaryAction = useMemo(
    () =>
      buildTrackingPrimaryAction({
        shouldPromoteTriage,
        openTrackingTriage,
        canMarkArrived,
        runBusyAction,
        onMarkAmbulanceArrived,
        busyAction,
        canCompleteAmbulance,
        handleCompleteAmbulanceWithRating,
        canCheckInBed,
        onMarkBedOccupied,
        canCompleteBed,
        handleCompleteBedWithRating,
      }),
    [
      busyAction,
      canCheckInBed,
      canCompleteAmbulance,
      canCompleteBed,
      canMarkArrived,
      handleCompleteAmbulanceWithRating,
      handleCompleteBedWithRating,
      onMarkAmbulanceArrived,
      onMarkBedOccupied,
      openTrackingTriage,
      runBusyAction,
      shouldPromoteTriage,
    ],
  );

  const secondaryActions = useMemo(
    () =>
      buildTrackingSecondaryActions({
        activeAmbulanceRequestId,
        activeBedBookingRequestId,
        onAddBedFromTracking,
        onAddAmbulanceFromTracking,
      }),
    [
      activeAmbulanceRequestId,
      activeBedBookingRequestId,
      onAddAmbulanceFromTracking,
      onAddBedFromTracking,
    ],
  );

  const destructiveAction = useMemo(
    () =>
      buildTrackingDestructiveAction({
        pendingApprovalRequestId,
        activeAmbulanceRequestId,
        activeBedBookingRequestId,
        runBusyAction,
        handleCancelPendingRequest,
        onCancelAmbulanceTrip,
        onCancelBedBooking,
        busyAction,
      }),
    [
      activeAmbulanceRequestId,
      activeBedBookingRequestId,
      busyAction,
      handleCancelPendingRequest,
      onCancelAmbulanceTrip,
      onCancelBedBooking,
      pendingApprovalRequestId,
      runBusyAction,
    ],
  );

  useEffect(() => {
    if (!headerActionRequest?.type || !headerActionRequest?.requestedAt) return;
    if (handledHeaderActionRef.current === headerActionRequest.requestedAt) return;
    handledHeaderActionRef.current = headerActionRequest.requestedAt;
    const handler = resolveTrackingHeaderActionHandler({
      headerActionRequest,
      triageRequestId,
      openTrackingTriage,
      onAddBedFromTracking,
      destructiveAction,
      onConsumeHeaderActionRequest,
    });
    handler?.();
  }, [
    destructiveAction,
    headerActionRequest?.requestedAt,
    headerActionRequest?.type,
    onAddBedFromTracking,
    onConsumeHeaderActionRequest,
    openTrackingTriage,
    triageRequestId,
  ]);

  const trackingDetailRows = useMemo(
    () =>
      buildTrackingDetailRows({
        requestLabel,
        responderPlate,
        crewCountLabel,
        secondaryTrackingLabel,
        triageRequestId,
        triageIsComplete,
        triageHasData,
        triageAnsweredCount,
        triageDisplayTotalSteps,
      }),
    [
      crewCountLabel,
      requestLabel,
      responderPlate,
      secondaryTrackingLabel,
      triageAnsweredCount,
      triageDisplayTotalSteps,
      triageHasData,
      triageIsComplete,
      triageRequestId,
    ],
  );

  const midActions = useMemo(
    () =>
      buildTrackingMidActions({
        triageRequestId,
        openTrackingTriage,
        secondaryActions,
        primaryAction,
        trackingKind,
        handleShareEta,
      }),
    [
      handleShareEta,
      openTrackingTriage,
      primaryAction,
      secondaryActions,
      trackingKind,
      triageRequestId,
    ],
  );

  const bottomAction = useMemo(
    () =>
      buildTrackingBottomAction({
        trackingKind,
        primaryAction,
        destructiveAction,
        busyAction,
      }),
    // PULLBACK NOTE: Pass 17D — CTA disabled contract
    // OLD: dependency array omitted busyAction, so disabled could stale-render
    // NEW: busyAction wired in so bottomAction.disabled recomputes in real time
    [busyAction, destructiveAction, primaryAction, trackingKind],
  );

  return {
    openTrackingTriage,
    busyAction,
    primaryAction,
    secondaryActions,
    destructiveAction,
    trackingDetailRows,
    midActions,
    bottomAction,
  };
}

export default useMapTrackingController;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Share } from "react-native";
import { useToast } from "../../../../contexts/ToastContext";
import { EmergencyRequestStatus } from "../../../../services/emergencyRequestsService";
import { EMERGENCY_VISIT_LIFECYCLE } from "../../../../constants/visits";
import { buildTrackingSharePayload } from "./mapTracking.share";
import {
  buildTrackingRatingState,
  resolveTrackingRatingSkip,
  resolveTrackingRatingSubmit,
  deleteTrackingRatingRecoveryClaim,
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

const INITIAL_RATING_STATE = {
  visible: false,
  visitId: null,
  completeKind: null,
  completionCommitted: false,
  serviceType: null,
  title: null,
  subtitle: null,
  serviceDetails: null,
};

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
  const [ratingState, setRatingState] = useState(INITIAL_RATING_STATE);
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
      }),
    [
      activeAmbulanceRequestId,
      activeBedBookingRequestId,
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
      }),
    [destructiveAction, primaryAction, trackingKind],
  );

  const closeRating = useCallback(() => {
    setRatingState(INITIAL_RATING_STATE);
  }, []);

  const finalizeCompletedTracking = useCallback(
    (completeKind) => {
      if (completeKind === "ambulance") {
        stopAmbulanceTrip?.();
        return;
      }
      if (completeKind === "bed") {
        stopBedBooking?.();
      }
    },
    [stopAmbulanceTrip, stopBedBooking],
  );

  const skipRating = useCallback(async () => {
    const visitId = ratingState.visitId;
    if (!visitId) {
      setRatingState(INITIAL_RATING_STATE);
      return true;
    }
    let completionResult = { ok: true };
    if (!ratingState.completionCommitted && ratingState.completeKind === "ambulance") {
      completionResult = await runBusyAction("complete", () =>
        onCompleteAmbulanceTrip?.({ deferCleanup: true }),
      );
    } else if (!ratingState.completionCommitted && ratingState.completeKind === "bed") {
      completionResult = await runBusyAction("complete", () =>
        onCompleteBedBooking?.({ deferCleanup: true }),
      );
    }
    if (completionResult?.ok === false) {
      showToast("Could not complete the request right now.", "error");
      return false;
    }
    const resolution = await resolveTrackingRatingSkip({
      visitId,
      updateVisit,
      deleteRecoveryClaim: deleteTrackingRatingRecoveryClaim,
    });
    if (!resolution.ok) {
      showToast("Could not close rating right now.", "error");
      return false;
    }
    setRatingState(INITIAL_RATING_STATE);
    finalizeCompletedTracking(ratingState.completeKind);
    return true;
  }, [
    finalizeCompletedTracking,
    ratingState.completionCommitted,
    onCompleteAmbulanceTrip,
    onCompleteBedBooking,
    ratingState.completeKind,
    ratingState.visitId,
    runBusyAction,
    showToast,
    updateVisit,
  ]);

  const submitRating = useCallback(
    async ({ rating, comment, tipAmount, tipCurrency }) => {
      const visitId = ratingState.visitId;
      if (!visitId) return false;
      let completionResult = { ok: true };
      if (!ratingState.completionCommitted && ratingState.completeKind === "ambulance") {
        completionResult = await runBusyAction("complete", () =>
          onCompleteAmbulanceTrip?.({ deferCleanup: true }),
        );
      } else if (!ratingState.completionCommitted && ratingState.completeKind === "bed") {
        completionResult = await runBusyAction("complete", () =>
          onCompleteBedBooking?.({ deferCleanup: true }),
        );
      }
      if (completionResult?.ok === false) {
        showToast("Could not complete the request right now.", "error");
        return false;
      }
      const resolution = await resolveTrackingRatingSubmit({
        visitId,
        rating,
        comment,
        tipAmount,
        tipCurrency,
        updateVisit,
        deleteRecoveryClaim: deleteTrackingRatingRecoveryClaim,
      });
      if (!resolution.ok) {
        showToast("Could not save your rating right now.", "error");
        return false;
      }
      if (resolution.tipError) {
        console.warn("[MapTracking] Tip processing failed:", resolution.tipError);
      }
      showToast("Thanks for the feedback.", "success");
      setRatingState(INITIAL_RATING_STATE);
      finalizeCompletedTracking(ratingState.completeKind);
      return true;
    },
    [
      onCompleteAmbulanceTrip,
      onCompleteBedBooking,
      finalizeCompletedTracking,
      ratingState.completionCommitted,
      ratingState.completeKind,
      ratingState.visitId,
      runBusyAction,
      showToast,
      updateVisit,
    ],
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
    ratingState,
    closeRating,
    skipRating,
    submitRating,
  };
}

export default useMapTrackingController;

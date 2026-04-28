// hooks/map/history/useMapHistoryFlow.js
//
// PULLBACK NOTE: MapScreen decomposition Pass 2 — history + rating-recovery cluster extracted
// OLD: All history handlers, recovered-rating state, historyPaymentState, and the three
//      rating-recovery effects lived directly in MapScreen.jsx, adding ~280 lines to the monolith.
// NEW: Moved here. MapScreen passes raw capabilities; this hook returns a flat set of
//      handlers and state references that MapScreen destructures and threads into its renderers.
//
// Owns:
//   - handledRecoveredRatingVisitIdsRef (Set ref, session-scoped)
//   - visitDetailReturnTargetRef (origin tracking for back navigation)
//   - historyPaymentState (useState — local modal state, L5 candidate later)
//   - historyPaymentRequestVersionRef (cancellation sentinel)
//   - Jotai atom wires: ratingRecoveryVersionAtom, ratingRecoveryClaimsAtom,
//                        recoveredRatingStateAtom, selectedHistoryVisitKeyAtom
//   - selectedHistoryVisit (derived from visits + selectedHistoryVisitKey)
//   - All close/open/action handlers for history, payment details, and recovered rating
//   - Rating-recovery effects (claims load + stale-guard + modal trigger)
//
// Does NOT own:
//   - historyFocusedHospital — owned here, returned to MapScreen for map rendering
//   - useTrackingRatingFlow — stays in MapScreen (in-flow rating + openRatingForVisit)
//   - handleBookVisitFromCare — stays in MapScreen (care-history surface, not visit-detail)

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Alert, Linking } from "react-native";
import { useAtom } from "jotai";
import { paymentService } from "../../../services/paymentService";
import { selectHistoryItemByAnyKey } from "../../visits/useVisitHistorySelectors";
import {
  buildRecoveredTrackingRatingState,
  buildTrackingResolutionToast,
  findPendingTrackingRatingVisit,
  getTrackingRatingRecoveryClaim,
  purgeStaleTrackingRatingClaims,
  readTrackingRatingRecoveryClaims,
  resolveTrackingRatingSkip,
  resolveTrackingRatingSubmit,
} from "../../../components/map/views/tracking/mapTracking.rating";
import { MAP_SHEET_PHASES } from "../../../components/map/core/MapSheetOrchestrator";
import {
  ratingRecoveryVersionAtom,
  ratingRecoveryClaimsAtom,
  recoveredRatingStateAtom,
  selectedHistoryVisitKeyAtom,
  historyPaymentStateAtom,
} from "../../../atoms/mapScreenAtoms";

/**
 * useMapHistoryFlow
 *
 * Owns the full history-visit-detail + recovered-rating cluster extracted from MapScreen.
 *
 * @param {Object} params
 * @param {Array}    params.visits
 * @param {Function} params.updateVisit
 * @param {Function} params.cancelVisit
 * @param {Function} params.showToast
 * @param {Function} params.openTracking
 * @param {Function} params.openVisitDetail
 * @param {Function} params.closeVisitDetail
 * @param {Function} params.setRecentVisitsVisible
 * @param {Function} params.setCareHistoryVisible
 * @param {Function} params.openAmbulanceDecision
 * @param {Function} params.openBedDecision
 * @param {Object|null} params.activeMapRequest
 * @param {Set}      params.activeHistoryRequestKeys
 * @param {string}   params.sheetPhase
 * @param {boolean}  params.hasActiveMapModal
 * @param {boolean}  params.hasActiveTrip
 * @param {Array}     params.discoveredHospitals
 * @param {Object}   params.router
 */
export function useMapHistoryFlow({
  visits,
  updateVisit,
  cancelVisit,
  showToast,
  openTracking,
  openVisitDetail,
  closeVisitDetail,
  setRecentVisitsVisible,
  setCareHistoryVisible,
  openAmbulanceDecision,
  openBedDecision,
  activeMapRequest,
  activeHistoryRequestKeys,
  sheetPhase,
  hasActiveMapModal,
  hasActiveTrip,
  discoveredHospitals,
  router,
}) {
  // --- Refs ---
  const handledRecoveredRatingVisitIdsRef = useRef(new Set());
  // PULLBACK NOTE: VD-C3 (EC-VD-2) — track origin of visit detail open so
  // closeHistoryVisitDetails can restore the correct surface.
  const visitDetailReturnTargetRef = useRef(null);
  const historyPaymentRequestVersionRef = useRef(0);

  // --- Jotai atoms ---
  const [handledRecoveredRatingVersion, setHandledRecoveredRatingVersion] = useAtom(ratingRecoveryVersionAtom);
  const [ratingRecoveryClaims, setRatingRecoveryClaims] = useAtom(ratingRecoveryClaimsAtom);
  const [recoveredRatingState, setRecoveredRatingState] = useAtom(recoveredRatingStateAtom);
  const [selectedHistoryVisitKey, setSelectedHistoryVisitKey] = useAtom(selectedHistoryVisitKeyAtom);

  // --- Local state (promoted to atom for call-order independence) ---
  const [historyPaymentState, setHistoryPaymentState] = useAtom(historyPaymentStateAtom);

  // --- Derived ---
  const selectedHistoryVisit = useMemo(
    () => selectHistoryItemByAnyKey(visits, selectedHistoryVisitKey),
    [selectedHistoryVisitKey, visits],
  );

  // PULLBACK NOTE: Moved here (before any useCallback that references them) to prevent TDZ.
  // historyVisitDetailsVisible only needs sheetPhase (a param) — safe to declare early.
  // historyFocusedHospital only needs discoveredHospitals (param) + selectedHistoryVisit + historyVisitDetailsVisible.
  const historyVisitDetailsVisible = sheetPhase === MAP_SHEET_PHASES.VISIT_DETAIL;

  const historyFocusedHospital = useMemo(() => {
    if (!historyVisitDetailsVisible || !selectedHistoryVisit) return null;

    const byId = selectedHistoryVisit.hospitalId
      ? (discoveredHospitals || []).find((item) => item?.id === selectedHistoryVisit.hospitalId)
      : null;
    if (byId) return byId;

    const byName = selectedHistoryVisit.facilityName
      ? (discoveredHospitals || []).find(
          (item) =>
            String(item?.name || "").trim().toLowerCase() ===
            String(selectedHistoryVisit.facilityName || "").trim().toLowerCase(),
        )
      : null;
    if (byName) return byName;

    if (selectedHistoryVisit.facilityCoordinate) {
      return {
        id:
          selectedHistoryVisit.hospitalId ||
          selectedHistoryVisit.requestId ||
          selectedHistoryVisit.id,
        name: selectedHistoryVisit.facilityName || "Care facility",
        address: selectedHistoryVisit.facilityAddress || null,
        image: selectedHistoryVisit.heroImageUrl || null,
        coordinates: selectedHistoryVisit.facilityCoordinate,
        latitude: selectedHistoryVisit.facilityCoordinate.latitude,
        longitude: selectedHistoryVisit.facilityCoordinate.longitude,
      };
    }

    return null;
  }, [discoveredHospitals, historyVisitDetailsVisible, selectedHistoryVisit]);

  // ─── History visit detail handlers ───────────────────────────────────────

  const closeHistoryVisitDetails = useCallback(() => {
    const returnTarget = visitDetailReturnTargetRef.current;
    visitDetailReturnTargetRef.current = null;
    setSelectedHistoryVisitKey(null);
    closeVisitDetail?.();
    // PULLBACK NOTE: VD-C3 (EC-VD-2) — restore origin surface after closing visit detail.
    if (returnTarget === "history_modal") {
      setRecentVisitsVisible(true);
    }
  }, [closeVisitDetail, setRecentVisitsVisible, setSelectedHistoryVisitKey]);

  const closeHistoryPaymentDetails = useCallback(() => {
    historyPaymentRequestVersionRef.current += 1;
    setHistoryPaymentState({ visible: false, loading: false, paymentRecord: null });
  }, []);

  const handleOpenChooseCareFromHistory = useCallback(() => {
    setRecentVisitsVisible(false);
    setCareHistoryVisible(true);
  }, [setCareHistoryVisible, setRecentVisitsVisible]);

  const handleBookVisitFromHistory = useCallback(() => {
    setRecentVisitsVisible(false);
    router.push("/(user)/(stacks)/book-visit");
  }, [router, setRecentVisitsVisible]);

  const handleGetHistoryDirections = useCallback(() => {
    const coordinate =
      selectedHistoryVisit?.facilityCoordinate || selectedHistoryVisit?.hospitalCoordinate;
    if (!coordinate) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${coordinate.latitude},${coordinate.longitude}`;
    Linking.openURL(url);
  }, [selectedHistoryVisit?.facilityCoordinate, selectedHistoryVisit?.hospitalCoordinate]);

  const handleOpenHistoryPaymentDetails = useCallback(() => {
    const paymentTransactionId =
      selectedHistoryVisit?.paymentId ||
      selectedHistoryVisit?.visit?.paymentId ||
      selectedHistoryVisit?.visit?.payment_id ||
      null;
    const historyRequestId =
      selectedHistoryVisit?.requestId ||
      selectedHistoryVisit?.visit?.requestId ||
      selectedHistoryVisit?.visit?.request_id ||
      null;

    if (!paymentTransactionId && !historyRequestId) return;

    const requestVersion = historyPaymentRequestVersionRef.current + 1;
    historyPaymentRequestVersionRef.current = requestVersion;
    setHistoryPaymentState({ visible: true, loading: true, paymentRecord: null });

    (async () => {
      const paymentRecord = await paymentService.getPaymentHistoryEntry({
        transactionId: paymentTransactionId || null,
        requestId: historyRequestId || null,
      });

      if (historyPaymentRequestVersionRef.current !== requestVersion) return;

      if (!paymentRecord) {
        setHistoryPaymentState({ visible: false, loading: false, paymentRecord: null });
        showToast("Payment details are not available yet.", "info");
        return;
      }

      setHistoryPaymentState({ visible: true, loading: false, paymentRecord });
    })();
  }, [
    selectedHistoryVisit?.paymentId,
    selectedHistoryVisit?.requestId,
    selectedHistoryVisit?.visit?.paymentId,
    selectedHistoryVisit?.visit?.payment_id,
    selectedHistoryVisit?.visit?.requestId,
    selectedHistoryVisit?.visit?.request_id,
    showToast,
  ]);

  const handleSelectHistoryItem = useCallback(
    (historyItem) => {
      if (!historyItem) return;

      // PULLBACK NOTE: VD-C3 — record that visit detail was opened from history modal
      visitDetailReturnTargetRef.current = "history_modal";
      setRecentVisitsVisible(false);
      const historyKeys = [historyItem.requestId, historyItem.displayId, historyItem.id]
        .filter((v) => v !== null && v !== undefined && String(v).trim().length > 0)
        .map((v) => String(v));
      const wantsResumeAction =
        historyItem.primaryAction === "resume_tracking" ||
        historyItem.primaryAction === "resume_request";
      const matchesActiveEmergencyRequest =
        historyItem.sourceKind === "emergency" &&
        historyKeys.some((key) => activeHistoryRequestKeys.has(key));
      const canResumeLiveRequest =
        Boolean(activeMapRequest?.hasActiveRequest) &&
        wantsResumeAction &&
        matchesActiveEmergencyRequest;

      if (canResumeLiveRequest) {
        openTracking?.();
        return;
      }

      // VD-B (EC-VD-1): guard against sparse historyItem before opening visit detail
      const hasMinimumFields =
        historyItem.requestId || historyItem.displayId || historyItem.id;
      if (!hasMinimumFields) {
        showToast("Visit details are still loading. Please try again.", "info");
        return;
      }

      setSelectedHistoryVisitKey(
        historyItem.requestId || historyItem.displayId || historyItem.id,
      );
      // VD-B (EC-VD-2): pass current sheetPhase as sourcePhase for back navigation
      openVisitDetail?.(historyItem, sheetPhase);
    },
    [
      activeHistoryRequestKeys,
      activeMapRequest?.hasActiveRequest,
      openTracking,
      openVisitDetail,
      setRecentVisitsVisible,
      setSelectedHistoryVisitKey,
      sheetPhase,
      showToast,
    ],
  );

  const handleResumeHistoryRequest = useCallback(() => {
    // PULLBACK NOTE: VD-C1 (defect VD-6) — guard with XState hasActiveTrip before opening tracking.
    if (!hasActiveTrip) {
      showToast("This trip is no longer active.", "info");
      return;
    }
    closeHistoryVisitDetails();
    openTracking?.();
  }, [closeHistoryVisitDetails, hasActiveTrip, openTracking, showToast]);

  const handleCallHistoryClinic = useCallback(() => {
    const phone = selectedHistoryVisit?.contactPhone;
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  }, [selectedHistoryVisit?.contactPhone]);

  const handleJoinHistoryVisit = useCallback(() => {
    const meetingLink = selectedHistoryVisit?.meetingLink;
    if (!meetingLink) return;
    Linking.openURL(meetingLink);
  }, [selectedHistoryVisit?.meetingLink]);

  const handleBookHistoryAgain = useCallback(() => {
    if (!selectedHistoryVisit) return;

    const targetHospital = historyFocusedHospital || null;
    closeHistoryVisitDetails();

    if (selectedHistoryVisit.requestType === "ambulance") {
      openAmbulanceDecision(targetHospital);
      return;
    }
    if (selectedHistoryVisit.requestType === "bed") {
      openBedDecision(targetHospital, "bed");
      return;
    }
    router.push("/(user)/(stacks)/book-visit");
  }, [
    closeHistoryVisitDetails,
    historyFocusedHospital,
    openAmbulanceDecision,
    openBedDecision,
    router,
    selectedHistoryVisit,
  ]);

  const handleCancelHistoryVisit = useCallback(() => {
    if (!selectedHistoryVisit?.id) return;

    Alert.alert(
      "Cancel Visit",
      "Are you sure you want to cancel this visit?",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Visit",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelVisit(selectedHistoryVisit.id);
              showToast("Visit cancelled.", "success");
            } catch (error) {
              console.error("[useMapHistoryFlow] Failed to cancel history visit:", error);
              showToast("Could not cancel this visit right now.", "error");
            }
          },
        },
      ],
    );
  }, [cancelVisit, selectedHistoryVisit, showToast]);

  // ─── Stale-guard effect: close VISIT_DETAIL if visit deselected ──────────

  useEffect(() => {
    if (!historyVisitDetailsVisible) return;
    if (selectedHistoryVisit) return;
    closeHistoryVisitDetails();
  }, [closeHistoryVisitDetails, historyVisitDetailsVisible, selectedHistoryVisit]);

  // ─── Recovered-rating effects ─────────────────────────────────────────────

  const canRecoverTrackingRating =
    sheetPhase === MAP_SHEET_PHASES.EXPLORE_INTENT ||
    sheetPhase === MAP_SHEET_PHASES.TRACKING;

  useEffect(() => {
    let cancelled = false;
    const loadClaims = async () => {
      // PULLBACK NOTE: VD-B3 — purge stale claims against live visits (5th layer: Supabase truth)
      const nextClaims = visits.length > 0
        ? await purgeStaleTrackingRatingClaims(visits)
        : await readTrackingRatingRecoveryClaims();
      if (!cancelled) setRatingRecoveryClaims(nextClaims);
    };
    loadClaims();
    return () => { cancelled = true; };
  }, [
    activeMapRequest?.hasActiveRequest,
    handledRecoveredRatingVersion,
    sheetPhase,
    visits,
    setRatingRecoveryClaims,
  ]);

  const pendingRecoveredRatingVisit = useMemo(() => {
    if (!canRecoverTrackingRating || hasActiveMapModal || activeMapRequest?.hasActiveRequest) {
      return null;
    }
    return findPendingTrackingRatingVisit(visits, {
      excludeVisitIds: Array.from(handledRecoveredRatingVisitIdsRef.current),
      allowedVisitIds: Object.keys(ratingRecoveryClaims),
    });
  }, [
    activeMapRequest?.hasActiveRequest,
    canRecoverTrackingRating,
    handledRecoveredRatingVersion,
    hasActiveMapModal,
    ratingRecoveryClaims,
    visits,
  ]);

  // VD-B (VD-3): clear selectedHistoryVisitKey when sheetPhase leaves VISIT_DETAIL
  // Prevents stale key from keeping historyFocusedHospital pinned on the map
  // after the user navigates to a different sheet phase.
  useEffect(() => {
    if (sheetPhase !== MAP_SHEET_PHASES.VISIT_DETAIL) {
      setSelectedHistoryVisitKey(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetPhase]);

  useEffect(() => {
    if (recoveredRatingState?.visible || !pendingRecoveredRatingVisit) return;
    const nextState = buildRecoveredTrackingRatingState(
      pendingRecoveredRatingVisit,
      getTrackingRatingRecoveryClaim(pendingRecoveredRatingVisit, ratingRecoveryClaims),
    );
    if (nextState) setRecoveredRatingState(nextState);
  }, [pendingRecoveredRatingVisit, ratingRecoveryClaims, recoveredRatingState?.visible, setRecoveredRatingState]);

  // ─── Recovered-rating handlers ────────────────────────────────────────────

  const closeRecoveredRating = useCallback(() => {
    setRecoveredRatingState(null);
  }, [setRecoveredRatingState]);

  const markRecoveredRatingHandled = useCallback((visitId) => {
    if (!visitId) return;
    const normalizedVisitId = String(visitId);
    if (handledRecoveredRatingVisitIdsRef.current.has(normalizedVisitId)) return;
    handledRecoveredRatingVisitIdsRef.current.add(normalizedVisitId);
    setHandledRecoveredRatingVersion((current) => current + 1);
  }, [setHandledRecoveredRatingVersion]);

  const handleSkipRecoveredRating = useCallback(async () => {
    const visitId = recoveredRatingState?.visitId;
    if (!visitId) {
      closeRecoveredRating();
      return true;
    }
    const resolution = await resolveTrackingRatingSkip({ visitId, updateVisit });
    if (!resolution.ok) {
      showToast("Could not close rating right now.", "error");
      return false;
    }
    markRecoveredRatingHandled(visitId);
    closeRecoveredRating();
    const skipToast = buildTrackingResolutionToast({
      action: "skipped",
      serviceType: recoveredRatingState?.serviceType,
      hospitalTitle: recoveredRatingState?.serviceDetails?.hospital ?? null,
    });
    showToast(skipToast.message, skipToast.level);
    return true;
  }, [
    closeRecoveredRating,
    markRecoveredRatingHandled,
    recoveredRatingState?.serviceDetails?.hospital,
    recoveredRatingState?.serviceType,
    recoveredRatingState?.visitId,
    showToast,
    updateVisit,
  ]);

  const handleSubmitRecoveredRating = useCallback(
    async ({ rating, comment, tipAmount, tipCurrency }) => {
      const visitId = recoveredRatingState?.visitId;
      if (!visitId) return false;
      const resolution = await resolveTrackingRatingSubmit({
        visitId,
        rating,
        comment,
        tipAmount,
        tipCurrency,
        updateVisit,
      });
      if (!resolution.ok) {
        showToast("Could not save your rating right now.", "error");
        return false;
      }
      if (resolution.tipError) {
        console.warn("[useMapHistoryFlow] Recovered rating tip processing failed:", resolution.tipError);
      }
      markRecoveredRatingHandled(visitId);
      closeRecoveredRating();
      const successToast = buildTrackingResolutionToast({
        action: "rated",
        serviceType: recoveredRatingState?.serviceType,
        hospitalTitle: recoveredRatingState?.serviceDetails?.hospital ?? null,
        tipAmount,
        tipError: resolution.tipError,
      });
      showToast(successToast.message, successToast.level);
      return true;
    },
    [
      closeRecoveredRating,
      markRecoveredRatingHandled,
      recoveredRatingState?.serviceDetails?.hospital,
      recoveredRatingState?.serviceType,
      recoveredRatingState?.visitId,
      showToast,
      updateVisit,
    ],
  );

  return {
    // State
    selectedHistoryVisit,
    selectedHistoryVisitKey,
    historyPaymentState,
    recoveredRatingState,
    ratingRecoveryClaims,
    historyVisitDetailsVisible,
    historyFocusedHospital,
    // History detail handlers
    closeHistoryVisitDetails,
    closeHistoryPaymentDetails,
    handleOpenChooseCareFromHistory,
    handleBookVisitFromHistory,
    handleGetHistoryDirections,
    handleOpenHistoryPaymentDetails,
    handleSelectHistoryItem,
    handleResumeHistoryRequest,
    handleCallHistoryClinic,
    handleJoinHistoryVisit,
    handleBookHistoryAgain,
    handleCancelHistoryVisit,
    // Recovered-rating handlers
    closeRecoveredRating,
    handleSkipRecoveredRating,
    handleSubmitRecoveredRating,
  };
}

export default useMapHistoryFlow;

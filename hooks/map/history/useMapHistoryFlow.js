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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import { useAtom, useAtomValue } from "jotai";
import { paymentService } from "../../../services/paymentService";
import {
  selectHistoryItemByAnyKey,
  toHistoryItem,
} from "../../visits/useVisitHistorySelectors";
import { useScheduledVisitMutations } from "../../visits/useScheduledVisitMutations";
import {
  SCHEDULED_VISIT_CANCELLATION_COPY,
  shouldUseAppOwnedCancellationConfirmation,
} from "../../../utils/scheduledVisitCancellation";
import {
  buildRecoveredTrackingRatingState,
  buildTrackingResolutionToast,
  canPresentTrackingRatingWithActiveRequest,
  findPendingTrackingRatingVisit,
  getTrackingRatingRecoveryClaim,
  getTrackingRatingVisitKeys,
  isTrackingRatingResolutionFinal,
  shouldPresentRecoveredTrackingRatingState,
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
  trackingRatingStateAtom,
  mapVisitDetailSourceSurfaceAtom,
} from "../../../atoms/mapScreenAtoms";

/**
 * useMapHistoryFlow
 *
 * Owns the full history-visit-detail + recovered-rating cluster extracted from MapScreen.
 *
 * @param {Object} params
 * @param {Array}    params.visits
 * @param {Function} params.showToast
 * @param {Function} params.openTracking
 * @param {Function} params.openVisitDetail
 * @param {Function} params.closeVisitDetail
 * @param {Function} params.setRecentVisitsVisible
 * @param {Function} params.setCareHistoryVisible
 * @param {Function} params.openAmbulanceDecision
 * @param {Function} params.openBedDecision
 * @param {Function} params.stopAmbulanceTrip
 * @param {Function} params.stopBedBooking
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
  showToast,
  openTracking,
  openVisitDetail,
  closeVisitDetail,
  setRecentVisitsVisible,
  setCareHistoryVisible,
  openAmbulanceDecision,
  openBedDecision,
  stopAmbulanceTrip,
  stopBedBooking,
  activeMapRequest,
  activeHistoryRequestKeys,
  sheetPhase,
  hasActiveMapModal,
  hasActiveTrip,
  discoveredHospitals,
  router,
  userId,
  onAfterRatingResolution,
}) {
  // --- Refs ---
  const handledRecoveredRatingVisitIdsRef = useRef(new Set());
  // PULLBACK NOTE: VD-C3 (EC-VD-2) — track origin of visit detail open so
  // closeHistoryVisitDetails can restore the correct surface.
  const visitDetailReturnTargetRef = useRef(null);
  const routeManagedVisitDetailRef = useRef(false);
  const historyPaymentRequestVersionRef = useRef(0);
  const cancelRequestInFlightRef = useRef(false);

  // --- Jotai atoms ---
  const [handledRecoveredRatingVersion, setHandledRecoveredRatingVersion] = useAtom(ratingRecoveryVersionAtom);
  const [ratingRecoveryClaims, setRatingRecoveryClaims] = useAtom(ratingRecoveryClaimsAtom);
  const [recoveredRatingState, setRecoveredRatingState] = useAtom(recoveredRatingStateAtom);
  const [selectedHistoryVisitKey, setSelectedHistoryVisitKey] = useAtom(selectedHistoryVisitKeyAtom);
  const [visitDetailSourceSurface, setVisitDetailSourceSurface] = useAtom(mapVisitDetailSourceSurfaceAtom);

  // --- Local state (promoted to atom for call-order independence) ---
  const [historyPaymentState, setHistoryPaymentState] = useAtom(historyPaymentStateAtom);
  const [coldVisit, setColdVisit] = useState(null);
  const [asyncConsultVisit, setAsyncConsultVisit] = useState(null);
  const [rescheduleVisit, setRescheduleVisit] = useState(null);
  const [cancelConfirmationVisit, setCancelConfirmationVisit] = useState(null);
  const { transitionVisit, isTransitioning } = useScheduledVisitMutations({ userId });

  // --- Derived ---
  const selectionVisits = useMemo(() => {
    if (!coldVisit?.id) return visits;
    const coldKeys = new Set(
      [coldVisit.id, coldVisit.requestId, coldVisit.displayId]
        .filter(Boolean)
        .map(String),
    );
    const hasCanonicalListRow = (visits || []).some((visit) =>
      [visit?.id, visit?.requestId, visit?.displayId]
        .filter(Boolean)
        .map(String)
        .some((key) => coldKeys.has(key)),
    );

    // PULLBACK NOTE: scheduled lifecycle detail convergence.
    // OLD: the cold deep-link snapshot replaced newer list/realtime truth forever.
    // NEW: cold truth only bridges initial hydration; the canonical list wins once present.
    return hasCanonicalListRow ? visits : [...(visits || []), coldVisit];
  }, [coldVisit, visits]);
  const selectedHistoryVisit = useMemo(
    () => selectHistoryItemByAnyKey(selectionVisits, selectedHistoryVisitKey),
    [selectedHistoryVisitKey, selectionVisits],
  );
  const resolvedAsyncConsultVisit = useMemo(() => {
    if (!asyncConsultVisit) return null;
    const visitKey =
      asyncConsultVisit.id ||
      asyncConsultVisit.requestId ||
      asyncConsultVisit.displayId ||
      null;
    return (
      selectHistoryItemByAnyKey(selectionVisits, visitKey) || asyncConsultVisit
    );
  }, [asyncConsultVisit, selectionVisits]);

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

  // PULLBACK NOTE: PASS 19H — Visit Detail Return Respects Source
  // OLD: closeHistoryVisitDetails read visitDetailReturnTargetRef for surface restoration
  // NEW: closeHistoryVisitDetails now uses mapVisitDetailSourceSurfaceAtom for canonical surface tracking
  // The ref-based approach is kept as fallback during migration
  const closeHistoryVisitDetails = useCallback(() => {
    const returnTarget = visitDetailReturnTargetRef.current;
    const sourceSurface = visitDetailSourceSurface;
    const routeManaged = routeManagedVisitDetailRef.current === true;
    visitDetailReturnTargetRef.current = null;
    routeManagedVisitDetailRef.current = false;
    setSelectedHistoryVisitKey(null);
    setColdVisit(null);
    setAsyncConsultVisit(null);
    setRescheduleVisit(null);
    setCancelConfirmationVisit(null);
    // PULLBACK NOTE: VD-C3 (EC-VD-2) — restore origin surface after closing visit detail.
    // PULLBACK NOTE: PASS 19H — restore Recents modal if sourceSurface is "recents"
    // PULLBACK NOTE: PASS 19H FIX — restore surface BEFORE calling closeVisitDetail to avoid timing issues
    if (sourceSurface === "recents" || returnTarget === "history_modal") {
      setRecentVisitsVisible(true);
    }
    setVisitDetailSourceSurface(null);
    closeVisitDetail?.();
    if (routeManaged) {
      router.replace("/(user)");
    }
  }, [
    closeVisitDetail,
    router,
    setRecentVisitsVisible,
    setSelectedHistoryVisitKey,
    setVisitDetailSourceSurface,
    visitDetailSourceSurface,
  ]);

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

  // PULLBACK NOTE: PASS 19H — Visit Detail Return Respects Source
  // OLD: visitDetailReturnTargetRef tracked "history_modal" as workaround for surface-level return
  // NEW: sourceSurface passed to payload system for canonical surface tracking
  // visitDetailReturnTargetRef kept for backward compatibility during migration
  const openHistoryVisitByKey = useCallback(
    (visitKey, options = {}) => {
      if (!visitKey) return false;
      const hydratedVisit = options?.visit || null;
      const historyItem = hydratedVisit
        ? toHistoryItem(hydratedVisit)
        : selectHistoryItemByAnyKey(visits, visitKey);
      if (!historyItem) return false;

      if (hydratedVisit) setColdVisit(hydratedVisit);

      routeManagedVisitDetailRef.current = options?.routeManaged === true;
      visitDetailReturnTargetRef.current = options?.returnTarget || null;
      // PULLBACK NOTE: PASS 19H — set atom for canonical surface tracking
      const sourceSurface = options?.sourceSurface || null;
      setVisitDetailSourceSurface(sourceSurface);
      setSelectedHistoryVisitKey(
        historyItem.requestId || historyItem.displayId || historyItem.id,
      );
      // PULLBACK NOTE: PASS 19H — pass sourceSurface for canonical surface tracking
      openVisitDetail?.(historyItem, options?.sourcePhase || null, sourceSurface);
      return true;
    },
    [openVisitDetail, setSelectedHistoryVisitKey, setVisitDetailSourceSurface, visits],
  );

  const beginRouteManagedVisitDetail = useCallback(
    (visitKey) => {
      if (!visitKey) return;
      routeManagedVisitDetailRef.current = true;
      visitDetailReturnTargetRef.current = null;
      setSelectedHistoryVisitKey(String(visitKey));
      setVisitDetailSourceSurface(null);
      openVisitDetail?.(null, null, null);
    },
    [openVisitDetail, setSelectedHistoryVisitKey, setVisitDetailSourceSurface],
  );

  // PULLBACK NOTE: PASS 19H — Visit Detail Return Respects Source
  // OLD: visitDetailReturnTargetRef tracked "history_modal" as workaround
  // NEW: sourceSurface parameter to distinguish between explore intent surface vs history modal
  // sourceSurface="recents" only if opening from history modal, "explore" if from explore intent surface
  const handleSelectHistoryItem = useCallback(
    (historyItem, sourceSurface = "recents") => {
      if (!historyItem) return;

      // PULLBACK NOTE: PASS 19H FIX — only set returnTarget if actually from history modal
      if (sourceSurface === "recents") {
        visitDetailReturnTargetRef.current = "history_modal";
        setRecentVisitsVisible(false);
      }
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

      openHistoryVisitByKey(
        historyItem.requestId || historyItem.displayId || historyItem.id,
        {
          sourcePhase: sheetPhase,
          sourceSurface,
          returnTarget: sourceSurface === "recents" ? "history_modal" : null,
        },
      );
    },
    [
      activeHistoryRequestKeys,
      activeMapRequest?.hasActiveRequest,
      openTracking,
      openHistoryVisitByKey,
      setRecentVisitsVisible,
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

  const handleOpenHistoryConsult = useCallback(() => {
    if (!selectedHistoryVisit?.canOpenConsult) return;
    setAsyncConsultVisit(selectedHistoryVisit);
  }, [selectedHistoryVisit]);

  const closeAsyncConsult = useCallback(() => {
    setAsyncConsultVisit(null);
  }, []);

  const handleRescheduleHistoryVisit = useCallback(() => {
    if (!selectedHistoryVisit?.canReschedule) return;
    setRescheduleVisit(selectedHistoryVisit);
  }, [selectedHistoryVisit]);

  const closeRescheduleVisit = useCallback(() => {
    setRescheduleVisit(null);
  }, []);

  const handleRescheduleSuccess = useCallback(
    (updatedVisit) => {
      if (!updatedVisit?.id) return;
      setColdVisit(updatedVisit);
      setRescheduleVisit(null);
      const updatedItem = toHistoryItem(updatedVisit);
      if (updatedItem) {
        setSelectedHistoryVisitKey(updatedItem.id);
        openVisitDetail?.(updatedItem, null, visitDetailSourceSurface);
      }
    },
    [
      openVisitDetail,
      setSelectedHistoryVisitKey,
      visitDetailSourceSurface,
    ],
  );

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

  const cancelScheduledVisit = useCallback(async (visit) => {
    if (!visit?.id || isTransitioning || cancelRequestInFlightRef.current) {
      return false;
    }

    cancelRequestInFlightRef.current = true;
    try {
      showToast("Cancelling visit...", "info");
      const updatedVisit = await transitionVisit({
        visitId: visit.id,
        action: "cancel",
      });
      setColdVisit(updatedVisit);
      const updatedItem = toHistoryItem(updatedVisit);
      if (updatedItem) {
        openVisitDetail?.(updatedItem, null, visitDetailSourceSurface);
      }
      showToast("Visit cancelled.", "success");
      return true;
    } catch (error) {
      console.error("[useMapHistoryFlow] Failed to cancel history visit:", error);
      showToast(error?.message || "Could not cancel this visit right now.", "error");
      return false;
    } finally {
      cancelRequestInFlightRef.current = false;
    }
  }, [
    isTransitioning,
    openVisitDetail,
    showToast,
    transitionVisit,
    visitDetailSourceSurface,
  ]);

  const closeCancelConfirmation = useCallback(() => {
    setCancelConfirmationVisit(null);
  }, []);

  const confirmCancelHistoryVisit = useCallback(() => {
    const visit = cancelConfirmationVisit;
    if (!visit) return;
    setCancelConfirmationVisit(null);
    void cancelScheduledVisit(visit);
  }, [cancelConfirmationVisit, cancelScheduledVisit]);

  const handleCancelHistoryVisit = useCallback(() => {
    const visit = selectedHistoryVisit;
    if (!visit?.id || isTransitioning) return;

    if (visit.sourceKind !== "scheduled_visit") {
      showToast("Manage emergency care from its request details.", "info");
      return;
    }

    if (shouldUseAppOwnedCancellationConfirmation(Platform.OS)) {
      setCancelConfirmationVisit(visit);
      return;
    }

    Alert.alert(
      SCHEDULED_VISIT_CANCELLATION_COPY.title,
      SCHEDULED_VISIT_CANCELLATION_COPY.message,
      [
        {
          text: SCHEDULED_VISIT_CANCELLATION_COPY.cancelText,
          style: "cancel",
        },
        {
          text: SCHEDULED_VISIT_CANCELLATION_COPY.confirmText,
          style: "destructive",
          onPress: () => {
            void cancelScheduledVisit(visit);
          },
        },
      ],
    );
  }, [
    cancelScheduledVisit,
    isTransitioning,
    selectedHistoryVisit,
    showToast,
  ]);

  // ─── Stale-guard effect: close VISIT_DETAIL if visit deselected ──────────

  useEffect(() => {
    if (!historyVisitDetailsVisible) return;
    if (selectedHistoryVisit) return;
    if (routeManagedVisitDetailRef.current) return;
    closeHistoryVisitDetails();
  }, [closeHistoryVisitDetails, historyVisitDetailsVisible, selectedHistoryVisit]);

  // ─── Recovered-rating effects ─────────────────────────────────────────────

  const canRecoverTrackingRating =
    sheetPhase === MAP_SHEET_PHASES.EXPLORE_INTENT ||
    sheetPhase === MAP_SHEET_PHASES.TRACKING;

  const resolvedTerminalTrackingVisit = useMemo(() => {
    if (!activeMapRequest?.isTerminal) return null;

    const activeRequestKeys = new Set(
      [
        activeMapRequest?.id,
        activeMapRequest?.requestId,
        activeMapRequest?.displayId,
        activeMapRequest?.record?.id,
        activeMapRequest?.record?.requestId,
        activeMapRequest?.record?.displayId,
      ]
        .filter((value) => value !== null && value !== undefined && String(value).trim() !== "")
        .map((value) => String(value)),
    );
    if (activeRequestKeys.size === 0) return null;

    return (
      visits.find(
        (visit) =>
          isTrackingRatingResolutionFinal(visit) &&
          getTrackingRatingVisitKeys(visit).some((key) => activeRequestKeys.has(key)),
      ) || null
    );
  }, [
    activeMapRequest?.displayId,
    activeMapRequest?.id,
    activeMapRequest?.isTerminal,
    activeMapRequest?.record?.displayId,
    activeMapRequest?.record?.id,
    activeMapRequest?.record?.requestId,
    activeMapRequest?.requestId,
    visits,
  ]);

  useEffect(() => {
    if (!resolvedTerminalTrackingVisit) return;
    if (activeMapRequest?.isAmbulance) {
      stopAmbulanceTrip?.();
      return;
    }
    if (activeMapRequest?.isBed) {
      stopBedBooking?.();
    }
  }, [
    activeMapRequest?.isAmbulance,
    activeMapRequest?.isBed,
    resolvedTerminalTrackingVisit,
    stopAmbulanceTrip,
    stopBedBooking,
  ]);

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
    if (!canRecoverTrackingRating || hasActiveMapModal) {
      return null;
    }
    const candidate = findPendingTrackingRatingVisit(visits, {
      excludeVisitIds: Array.from(handledRecoveredRatingVisitIdsRef.current),
      allowedVisitIds: Object.keys(ratingRecoveryClaims),
    });
    return canPresentTrackingRatingWithActiveRequest(activeMapRequest, candidate)
      ? candidate
      : null;
  }, [
    activeMapRequest?.hasActiveRequest,
    activeMapRequest?.displayId,
    activeMapRequest?.id,
    activeMapRequest?.isTerminal,
    activeMapRequest?.record?.displayId,
    activeMapRequest?.record?.id,
    activeMapRequest?.record?.requestId,
    activeMapRequest?.requestId,
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

  // PULLBACK NOTE: duplicate-modal fix — guard against in-flow rating already being open.
  // trackingRatingStateAtom is written by useMapTrackingController when a trip completes.
  // Without this guard, both modals fire simultaneously when a trip ends while a
  // RATING_PENDING visit also exists in the history lane.
  const inFlowRatingVisible = useAtomValue(trackingRatingStateAtom)?.visible ?? false;
  const validatedRecoveredRatingState = useMemo(
    () =>
      shouldPresentRecoveredTrackingRatingState(recoveredRatingState, visits)
        ? recoveredRatingState
        : null,
    [recoveredRatingState, visits],
  );

  useEffect(() => {
    if (!recoveredRatingState?.visible || validatedRecoveredRatingState) return;
    setRecoveredRatingState(null);
  }, [
    recoveredRatingState?.visible,
    setRecoveredRatingState,
    validatedRecoveredRatingState,
  ]);

  useEffect(() => {
    if (recoveredRatingState?.visible || inFlowRatingVisible || !pendingRecoveredRatingVisit) return;
    const nextState = buildRecoveredTrackingRatingState(
      pendingRecoveredRatingVisit,
      getTrackingRatingRecoveryClaim(pendingRecoveredRatingVisit, ratingRecoveryClaims),
    );
    if (!nextState) return;

    if (activeMapRequest?.isTerminal === true) {
      if (nextState.completeKind === "ambulance") stopAmbulanceTrip?.();
      if (nextState.completeKind === "bed") stopBedBooking?.();
    }
    setRecoveredRatingState(nextState);
  }, [
    activeMapRequest?.isTerminal,
    inFlowRatingVisible,
    pendingRecoveredRatingVisit,
    ratingRecoveryClaims,
    recoveredRatingState?.visible,
    setRecoveredRatingState,
    stopAmbulanceTrip,
    stopBedBooking,
  ]);

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
    const resolution = await resolveTrackingRatingSkip({ visitId });
    if (!resolution.ok) {
      showToast("Could not close rating right now.", "error");
      return false;
    }
    markRecoveredRatingHandled(visitId);
    try {
      await onAfterRatingResolution?.();
    } catch (error) {
      console.warn("[useMapHistoryFlow] Rating refresh failed after skip:", error);
    }
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
    onAfterRatingResolution,
    recoveredRatingState?.serviceDetails?.hospital,
    recoveredRatingState?.serviceType,
    recoveredRatingState?.visitId,
    showToast,
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
      });
      if (!resolution.ok) {
        showToast("Could not save your rating right now.", "error");
        return false;
      }
      if (resolution.tipError) {
        console.warn("[useMapHistoryFlow] Recovered rating tip processing failed:", resolution.tipError);
      }
      markRecoveredRatingHandled(visitId);
      try {
        await onAfterRatingResolution?.();
      } catch (error) {
        console.warn("[useMapHistoryFlow] Rating refresh failed after submit:", error);
      }
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
      onAfterRatingResolution,
      recoveredRatingState?.serviceDetails?.hospital,
      recoveredRatingState?.serviceType,
      recoveredRatingState?.visitId,
      showToast,
    ],
  );

  return {
    // State
    selectedHistoryVisit,
    selectedHistoryVisitKey,
    asyncConsultVisit: resolvedAsyncConsultVisit,
    rescheduleVisit,
    cancelConfirmationVisit,
    isScheduledVisitTransitioning: isTransitioning,
    historyPaymentState,
    recoveredRatingState: validatedRecoveredRatingState,
    ratingRecoveryClaims,
    historyVisitDetailsVisible,
    historyFocusedHospital,
    openHistoryVisitByKey,
    beginRouteManagedVisitDetail,
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
    handleOpenHistoryConsult,
    closeAsyncConsult,
    handleRescheduleHistoryVisit,
    closeRescheduleVisit,
    handleRescheduleSuccess,
    closeCancelConfirmation,
    confirmCancelHistoryVisit,
    handleBookHistoryAgain,
    handleCancelHistoryVisit,
    // Recovered-rating handlers
    closeRecoveredRating,
    handleSkipRecoveredRating,
    handleSubmitRecoveredRating,
    // Shared with in-flow resolution so a stale AsyncStorage read cannot
    // resurrect the same completed visit during terminal cleanup.
    suppressRecoveredRatingForSession: markRecoveredRatingHandled,
  };
}

export default useMapHistoryFlow;

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import useAuthViewport from "../hooks/ui/useAuthViewport";
import EmergencyLocationPreviewMap from "../components/emergency/intake/EmergencyLocationPreviewMap";
import MiniProfileModal from "../components/emergency/MiniProfileModal";
import { ServiceRatingModal } from "../components/emergency/ServiceRatingModal";

import MapSheetOrchestrator, {
  MAP_SHEET_PHASES,
  MAP_SHEET_SNAP_STATES,
} from "../components/map/core/MapSheetOrchestrator";
import { buildBedDecisionSourcePayload } from "../components/map/core/mapSheetFlowPayloads";
import { MAP_ACTIVE_REQUEST_KINDS } from "../components/map/core/mapActiveRequestModel";
import MapGuestProfileModal from "../components/map/MapGuestProfileModal";
import MapCareHistoryModal from "../components/map/MapCareHistoryModal";
import MapExploreLoadingOverlay from "../components/map/surfaces/MapExploreLoadingOverlay";
import MapHistoryModal from "../components/map/history/MapHistoryModal";
import MapHistoryPaymentModal from "../components/map/history/MapHistoryPaymentModal";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useVisits } from "../contexts/VisitsContext";
import { useFABActions } from "../contexts/FABContext";
import { useMapExploreFlow } from "../hooks/map/useMapExploreFlow";
import { useMapShell } from "../hooks/map/shell/useMapShell";
// PULLBACK NOTE: Phase 8 — Pass B: in-flow rating modal lifted to MapScreen
import { useTrackingRatingFlow } from "../hooks/map/exploreFlow/useTrackingRatingFlow";
// getMapViewportVariant/getMapViewportSurfaceConfig/isSidebarMapVariant — moved to useMapShell
import { MAP_SEARCH_SHEET_MODES } from "../components/map/surfaces/search/mapSearchSheet.helpers";

import {
  isCommitPhoneValid,
  sanitizeCommitEmail,
  sanitizeCommitPhone,
} from "../components/map/views/commitDetails/mapCommitDetails.helpers";
import {
  buildTrackingRouteSignature,
  hasUsableTrackingStartedAt,
  normalizeTrackingRouteCoordinates,
  shouldReconcileTrackingTimeline,
} from "../components/map/views/tracking/mapTracking.timeline";
import {
  buildTrackingResolutionToast,
  buildRecoveredTrackingRatingState,
  findPendingTrackingRatingVisit,
  getTrackingRatingRecoveryClaim,
  readTrackingRatingRecoveryClaims,
  resolveTrackingRatingSkip,
  resolveTrackingRatingSubmit,
} from "../components/map/views/tracking/mapTracking.rating";
import { getDestinationCoordinate } from "../components/map/surfaces/hospitals/mapHospitalDetail.helpers";
import { calculateBearing } from "../utils/mapUtils";
import { emergencyRequestsService } from "../services/emergencyRequestsService";
import { paymentService } from "../services/paymentService";
import { selectHistoryItemByAnyKey } from "../hooks/visits/useVisitHistorySelectors";

export default function MapScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { showToast } = useToast();
  const { logout, user } = useAuth();
  const { visits = [], updateVisit, cancelVisit } = useVisits();
  const { registerFAB, unregisterFAB } = useFABActions();
  const { width, height, browserInsetTop, browserInsetBottom } =
    useAuthViewport();
  const {
    activeLocation,
    authModalVisible,
    careHistoryVisible,
    currentLocationDetails,
    discoveredHospitals,
    featuredHospital,
    guestProfileEmail,
    guestProfileVisible,
    handleChooseCare,
    openAmbulanceDecision,
    openBedDecision,
    openCommitDetails,
    openCommitTriage,
    openCommitPayment,
    openServiceDetail,
    closeServiceDetail,
    confirmServiceDetail,
    changeServiceDetailService,
    closeAmbulanceDecision,
    closeBedDecision,
    closeCommitDetails,
    closeCommitTriage,
    closeCommitPayment,
    closeTracking,
    openTracking,
    finishCommitPayment,
    clearCommitFlow,
    handleMapHospitalPress,
    handleMapReadinessChange,
    handleOpenFeaturedHospital,
    handleCycleFeaturedHospital,
    handleOpenProfile,
    openHospitalList,
    openAmbulanceHospitalList,
    openBedHospitalList,
    handleSearchLocation,
    handleSelectHospital,
    handleUseCurrentLocation,
    featuredHospitals,
    isMapFrameReady,
    loadingBackgroundImageUri,
    mapLoadingState,
    isSignedIn,
    nearestHospital,
    nearestHospitalMeta,
    nearbyBedHospitals,
    nearbyHospitalCount,
    openSearchSheet,
    closeHospitalDetail,
    openVisitDetail,
    closeVisitDetail,
    closeSearchSheet,
    profileImageSource,
    profileModalVisible,
    recentVisits,
    recentVisitsVisible,
    searchSheetMode,
    sheetPhase,
    sheetPayload,
    selectedCare,
    serviceSelectionsByHospital,
    setHospitalServiceSelection,
    setAuthModalVisible,
    setCareHistoryVisible,
    setGuestProfileVisible,
    setProfileModalVisible,
    setRecentVisitsVisible,
    setSheetSnapState,
    sheetMode,
    sheetSnapState,
    totalAvailableBeds,
    closeHospitalList,
    activeMapRequest,
    activeAmbulanceTrip,
    patchActiveAmbulanceTrip,
    ambulanceTelemetryHealth,
    activeBedBooking,
    pendingApproval,
    trackingHeaderOcclusionHeight,
    trackingHeaderActionRequest,
    clearTrackingHeaderActionRequest,
    // PULLBACK NOTE: Phase 5c — prop-drill tracking actions to MapTrackingStageBase
    // OLD: MapTrackingStageBase called useEmergency() directly
    // NEW: sourced here, passed as trackingXxx props to MapSheetOrchestrator
    allHospitals,
    stopAmbulanceTrip,
    stopBedBooking,
    setPendingApproval,
    setAmbulanceTripStatus,
    setBedBookingStatus,
    isArrived,
    isPendingApproval,
  } = useMapExploreFlow(); // eslint-disable-line no-unused-vars -- setAuthModalVisible kept for store compat

  // PULLBACK NOTE: MapScreen decomposition Pass 1 — shell-level derivations extracted
  // OLD: viewportVariant/surfaceConfig/usesSidebarLayout/renderedSnapState/bottomSheetHeight/
  //      sidebarWidth/sidebarOcclusionWidth/activeHistoryRequestKeys/hasActiveMapModal all inline
  // NEW: useMapShell owns all shell derivations; MapScreen passes raw values, destructures results
  const handledRecoveredRatingVisitIdsRef = useRef(new Set());
  const [handledRecoveredRatingVersion, setHandledRecoveredRatingVersion] = useState(0);
  const [ratingRecoveryClaims, setRatingRecoveryClaims] = useState({});
  const [recoveredRatingState, setRecoveredRatingState] = useState(null);
  const [selectedHistoryVisitKey, setSelectedHistoryVisitKey] = useState(null);
  const [historyRatingState, setHistoryRatingState] = useState(null);
  const [historyPaymentState, setHistoryPaymentState] = useState({
    visible: false,
    loading: false,
    paymentRecord: null,
  });
  const historyPaymentRequestVersionRef = useRef(0);

  const {
    viewportVariant,
    surfaceConfig,
    usesSidebarLayout,
    renderedSnapState,
    bottomSheetHeight,
    sidebarWidth,
    sidebarOcclusionWidth,
    activeHistoryRequestKeys,
    hasActiveMapModal,
  } = useMapShell({
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
    historyPaymentState,
    historyRatingState,
    recoveredRatingState,
  });

  // Visit details live in the VISIT_DETAIL sheet phase now (not a modal).
  const historyVisitDetailsVisible =
    sheetPhase === MAP_SHEET_PHASES.VISIT_DETAIL;


  useEffect(() => {
    const suppressionId = "map-modal-fab-suppression";
    if (hasActiveMapModal) {
      registerFAB(suppressionId, {
        visible: true,
        suppressGlobal: true,
        priority: 1000,
      });
      return () => unregisterFAB(suppressionId);
    }

    unregisterFAB(suppressionId);
    return undefined;
  }, [hasActiveMapModal, registerFAB, unregisterFAB]);

  // Hide the global FAB entirely on the Map screen as it is not part of the intent-based flow
  useEffect(() => {
    const hideId = "map-hide-global-fab";
    registerFAB(hideId, {
      visible: false,
      priority: 100,
    });
    return () => unregisterFAB(hideId);
  }, [registerFAB, unregisterFAB]);

  const handleProfileSignOut = useCallback(async () => {


    const result = await logout();
    if (result?.success) {
      clearCommitFlow?.();
    }
    return result;
  }, [clearCommitFlow, logout]);
  const selectedHistoryVisit = useMemo(
    () => selectHistoryItemByAnyKey(visits, selectedHistoryVisitKey),
    [selectedHistoryVisitKey, visits],
  );
  // activeHistoryRequestKeys now derived in useMapShell

  const closeHistoryVisitDetails = useCallback(() => {
    setSelectedHistoryVisitKey(null);
    closeVisitDetail?.();
  }, [closeVisitDetail]);
  const closeHistoryRating = useCallback(() => {
    setHistoryRatingState(null);
  }, []);
  const closeHistoryPaymentDetails = useCallback(() => {
    historyPaymentRequestVersionRef.current += 1;
    setHistoryPaymentState({
      visible: false,
      loading: false,
      paymentRecord: null,
    });
  }, []);

  const handleOpenChooseCareFromHistory = useCallback(() => {
    setRecentVisitsVisible(false);
    setCareHistoryVisible(true);
  }, [setCareHistoryVisible, setRecentVisitsVisible]);

  // Booking from the History modal is temporarily bridged to the legacy route
  // while the sheet-native Pass 12 booking rebuild is in progress.
  const handleBookVisitFromHistory = useCallback(() => {
    setRecentVisitsVisible(false);
    router.push("/(user)/(stacks)/book-visit");
  }, [router, setRecentVisitsVisible]);

  // Directions from visit detail — mirrors hospital detail's pattern.
  const handleGetHistoryDirections = useCallback(() => {
    const coordinate =
      selectedHistoryVisit?.facilityCoordinate || selectedHistoryVisit?.hospitalCoordinate;
    if (!coordinate) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${coordinate.latitude},${coordinate.longitude}`;
    Linking.openURL(url);
  }, [selectedHistoryVisit]);
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
    setHistoryPaymentState({
      visible: true,
      loading: true,
      paymentRecord: null,
    });

    (async () => {
      const paymentRecord = await paymentService.getPaymentHistoryEntry({
        transactionId: paymentTransactionId || null,
        requestId: historyRequestId || null,
      });

      if (historyPaymentRequestVersionRef.current !== requestVersion) return;

      if (!paymentRecord) {
        setHistoryPaymentState({
          visible: false,
          loading: false,
          paymentRecord: null,
        });
        showToast("Payment details are not available yet.", "info");
        return;
      }

      setHistoryPaymentState({
        visible: true,
        loading: false,
        paymentRecord,
      });
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
  // Booking flow is temporarily bridged to the legacy full-screen route while the
  // sheet-native Pass 12 booking rebuild is in progress. When the rebuild lands,
  // this handler will reopen the map-owned booking sheet with clean state.
  const handleBookVisitFromCare = useCallback(() => {
    setCareHistoryVisible(false);
    router.push("/(user)/(stacks)/book-visit");
  }, [router, setCareHistoryVisible]);

  const handleSelectHistoryItem = useCallback(
    (historyItem) => {
      if (!historyItem) return;

      setRecentVisitsVisible(false);
      const historyKeys = [
        historyItem.requestId,
        historyItem.displayId,
        historyItem.id,
      ]
        .filter(
          (value) =>
            value !== null &&
            value !== undefined &&
            String(value).trim().length > 0,
        )
        .map((value) => String(value));
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
      // PULLBACK NOTE: VD-A diagnostic — log canResume discrepancy between visit status and live Zustand (defect VD-1)
      console.log('[VD-A][MapScreen] handleSelectHistoryItem | requestId=', historyItem.requestId ?? null, '| visitCanResume=', historyItem.canResume ?? false, '| canResumeLiveRequest=', canResumeLiveRequest, '| hasActiveRequest=', activeMapRequest?.hasActiveRequest ?? false, '| matchesActive=', matchesActiveEmergencyRequest);

      if (canResumeLiveRequest) {
        openTracking?.();
        return;
      }

      setSelectedHistoryVisitKey(
        historyItem.requestId || historyItem.displayId || historyItem.id,
      );
      openVisitDetail?.(historyItem);
    },
    [
      activeHistoryRequestKeys,
      activeMapRequest?.hasActiveRequest,
      openTracking,
      openVisitDetail,
      setRecentVisitsVisible,
    ],
  );

  useEffect(() => {
    if (!historyVisitDetailsVisible) return;
    if (selectedHistoryVisit) return;
    closeHistoryVisitDetails();
  }, [closeHistoryVisitDetails, historyVisitDetailsVisible, selectedHistoryVisit]);

  const hasFocusedSheetPhase = sheetPhase !== MAP_SHEET_PHASES.EXPLORE_INTENT;
  const [trackingRouteInfo, setTrackingRouteInfo] = useState({
    durationSec: null,
    distanceMeters: null,
    coordinates: [],
  });

  const shouldShowMapControls = usesSidebarLayout
    ? !hasActiveMapModal && !hasFocusedSheetPhase
    : renderedSnapState !== MAP_SHEET_SNAP_STATES.EXPANDED &&
      !hasActiveMapModal &&
      !hasFocusedSheetPhase;

  useEffect(() => {
    if (
      usesSidebarLayout &&
      sheetSnapState !== MAP_SHEET_SNAP_STATES.EXPANDED
    ) {
      setSheetSnapState(MAP_SHEET_SNAP_STATES.EXPANDED);
    }
  }, [setSheetSnapState, sheetSnapState, usesSidebarLayout]);

  const handleUseHospital = useCallback(
    (hospital) => {
      const hospitalId =
        hospital?.id || featuredHospital?.id || nearestHospital?.id;
      if (!hospitalId) return;

      // Hospital detail stays upstream of commit/auth. Its primary CTA must
      // route into the correct decision phase rather than bypassing into the
      // legacy request route.
      if (selectedCare === "both") {
        openAmbulanceDecision(hospital || null);
        return;
      }

      if (selectedCare === "bed") {
        openBedDecision(hospital || null, "bed");
        return;
      }

      openAmbulanceDecision(hospital || null);
    },
    [
      featuredHospital?.id,
      nearestHospital?.id,
      openAmbulanceDecision,
      openBedDecision,
      selectedCare,
    ],
  );

  const handleConfirmAmbulanceDecision = useCallback(
    (hospital, transport) => {
      const hospitalId =
        hospital?.id || featuredHospital?.id || nearestHospital?.id;
      if (!hospitalId) return;
      const isTrackingCompanionTransport =
        sheetPayload?.sourcePhase === MAP_SHEET_PHASES.TRACKING &&
        Boolean(activeBedBooking?.requestId);

      if (selectedCare === "both" && !isTrackingCompanionTransport) {
        openBedDecision(hospital || null, "both", {
          savedTransport: transport
            ? {
                id: transport.id || null,
                hospitalId,
                title: transport.title || transport.service_name || "Transport",
                priceText: transport.priceText || null,
                metaText: transport.metaText || null,
                serviceType:
                  transport.service_type || transport.serviceType || null,
                tierKey:
                  transport.tierKey || transport.visualProfile?.key || null,
              }
            : null,
        });
        return;
      }

      const resolvedEmail = sanitizeCommitEmail(user?.email);
      const resolvedPhone = sanitizeCommitPhone(user?.phone);
      if (resolvedEmail && isCommitPhoneValid(resolvedPhone)) {
        openCommitPayment(hospital || null, transport || null, {
          draft: {
            email: resolvedEmail,
            phone: resolvedPhone,
          },
          sourcePhase:
            sheetPayload?.sourcePhase || MAP_SHEET_PHASES.AMBULANCE_DECISION,
          sourceSnapState:
            sheetPayload?.sourceSnapState || sheetSnapState,
          sourcePayload: sheetPayload?.sourcePayload || null,
        });
        return;
      }

      openCommitDetails(hospital || null, transport || null);
    },
    [
      featuredHospital?.id,
      nearestHospital?.id,
      activeBedBooking?.requestId,
      openCommitDetails,
      openBedDecision,
      openCommitPayment,
      selectedCare,
      sheetPayload?.sourcePayload,
      sheetPayload?.sourcePhase,
      sheetPayload?.sourceSnapState,
      sheetSnapState,
      user?.email,
      user?.phone,
    ],
  );

  const handleConfirmCommitDetails = useCallback(
    (hospital, transport, draft) => {
      const hospitalId =
        hospital?.id || featuredHospital?.id || nearestHospital?.id;
      if (!hospitalId) return;

      // Thread the full bed-booking context forward so payment can display
      // the correct summary (room title, price, careIntent) and so that the
      // optional triage phase can still back out to the right prior state.
      openCommitPayment(hospital || null, transport || null, {
        draft: draft || null,
        careIntent: draft?.careIntent || sheetPayload?.careIntent || null,
        roomId: draft?.roomId || sheetPayload?.roomId || null,
        room: sheetPayload?.room || null,
        sourcePhase: sheetPayload?.sourcePhase || MAP_SHEET_PHASES.COMMIT_DETAILS,
        // Preserve the bed-decision sourcePayload so closeCommitPayment can
        // restore BED_DECISION with savedTransport / careIntent when backing.
        sourcePayload: sheetPayload?.sourcePayload || null,
      });
    },
    [
      featuredHospital?.id,
      nearestHospital?.id,
      openCommitPayment,
      sheetPayload?.careIntent,
      sheetPayload?.room,
      sheetPayload?.roomId,
      sheetPayload?.sourcePayload,
      sheetPayload?.sourcePhase,
    ],
  );

  const handleConfirmBedDecision = useCallback(
    (hospital, room, _transport, careIntent = "bed") => {
      const hospitalId =
        hospital?.id || featuredHospital?.id || nearestHospital?.id;
      if (!hospitalId) return;

      // For the "both" flow the ambulance transport is stored in the sheet
      // payload as savedTransport; the bed decision stage does not re-pass it.
      const resolvedTransport =
        _transport ||
        (careIntent === "both" ? sheetPayload?.savedTransport || null : null);

      // sourcePayload preserves the bed-decision context so that
      // closeCommitPayment can restore BED_DECISION with all state intact:
      // - savedTransport for the "both" flow (ambulance already confirmed)
      // - careIntent so the decision sheet reopens in the correct mode
      //
      // Decision rule: always REPLACE on re-confirm, never append.
      // For "both": transport is preserved via savedTransport; the user
      // explicitly changes it by going back to AMBULANCE_DECISION.
      const bedDecisionSourcePayload = {
        ...buildBedDecisionSourcePayload({
          careIntent,
          savedTransport:
            careIntent === "both" ? sheetPayload?.savedTransport || null : null,
          payload: sheetPayload,
        }),
      };

      const resolvedEmail = sanitizeCommitEmail(user?.email);
      const resolvedPhone = sanitizeCommitPhone(user?.phone);

      // Skip commit details when identity is already complete.
      if (resolvedEmail && isCommitPhoneValid(resolvedPhone)) {
        openCommitPayment(hospital || null, resolvedTransport, {
          draft: { email: resolvedEmail, phone: resolvedPhone },
          careIntent,
          roomId: room?.id || null,
          room: room || null,
          sourcePhase: MAP_SHEET_PHASES.BED_DECISION,
          sourcePayload: bedDecisionSourcePayload,
        });
        return;
      }

      openCommitDetails(hospital || null, resolvedTransport, {
        careIntent,
        roomId: room?.id || null,
        room: room || null,
        sourcePhase: MAP_SHEET_PHASES.BED_DECISION,
        sourcePayload: bedDecisionSourcePayload,
      });
    },
    [
      featuredHospital?.id,
      nearestHospital?.id,
      openCommitDetails,
      openCommitPayment,
      sheetPayload?.savedTransport,
      user?.email,
      user?.phone,
    ],
  );

  const handleConfirmCommitTriage = useCallback(
    async (hospital, transport, triagePayload) => {
      const hospitalId =
        hospital?.id || featuredHospital?.id || nearestHospital?.id;
      if (!hospitalId) return;
      const sourcePhase =
        triagePayload?.sourcePhase || sheetPayload?.sourcePhase || null;
      if (sourcePhase === MAP_SHEET_PHASES.TRACKING) {
        const trackingRequestId =
          triagePayload?.requestId ||
          sheetPayload?.requestId ||
          activeMapRequest?.requestId ||
          null;
        if (trackingRequestId && triagePayload?.triageSnapshot) {
          await emergencyRequestsService.updateTriage(
            trackingRequestId,
            triagePayload.triageSnapshot,
            { reason: "tracking_info_update" },
          );
        }
        closeCommitTriage();
        return;
      }

      const restoredTriagePayload = {
        ...sheetPayload,
        ...(triagePayload && typeof triagePayload === "object"
          ? triagePayload
          : {}),
        hospital: hospital || sheetPayload?.hospital || null,
        transport: transport || sheetPayload?.transport || null,
      };

      openCommitPayment(hospital || null, transport || null, {
        draft: triagePayload?.draft || sheetPayload?.draft || null,
        triageDraft: triagePayload?.triageDraft || null,
        triageSnapshot: triagePayload?.triageSnapshot || null,
        careIntent: triagePayload?.careIntent || sheetPayload?.careIntent || null,
        roomId: triagePayload?.roomId || sheetPayload?.roomId || null,
        room: triagePayload?.room || sheetPayload?.room || null,
        sourcePhase: MAP_SHEET_PHASES.COMMIT_TRIAGE,
        sourceSnapState: MAP_SHEET_SNAP_STATES.EXPANDED,
        sourcePayload: restoredTriagePayload,
      });
    },
    [
      activeMapRequest?.requestId,
      closeCommitTriage,
      featuredHospital?.id,
      nearestHospital?.id,
      openCommitPayment,
      sheetPayload,
    ],
  );

  const paymentPreviewKind = useMemo(() => {
    if (sheetPhase !== MAP_SHEET_PHASES.COMMIT_PAYMENT) return null;
    const hasTransportSelection = Boolean(
      sheetPayload?.transport?.id ||
        sheetPayload?.transport?.title ||
        sheetPayload?.transport?.service_name ||
        sheetPayload?.transport?.service_type,
    );

    if (hasTransportSelection) return "ambulance";
    return null;
  }, [sheetPhase, sheetPayload?.transport]);

  const historyFocusedHospital = useMemo(() => {
    if (!historyVisitDetailsVisible || !selectedHistoryVisit) return null;

    const byId = selectedHistoryVisit.hospitalId
      ? discoveredHospitals.find((item) => item?.id === selectedHistoryVisit.hospitalId)
      : null;
    if (byId) return byId;

    const byName = selectedHistoryVisit.facilityName
      ? discoveredHospitals.find(
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

  const mapHospitals = useMemo(() => {
    if (!historyFocusedHospital) return discoveredHospitals;
    const alreadyPresent = discoveredHospitals.some(
      (item) => item?.id === historyFocusedHospital?.id,
    );
    return alreadyPresent
      ? discoveredHospitals
      : [historyFocusedHospital, ...discoveredHospitals];
  }, [discoveredHospitals, historyFocusedHospital]);

  const mapFocusedHospitalId = useMemo(
    () =>
      historyFocusedHospital?.id ||
      activeMapRequest?.hospitalId ||
      (sheetPhase === MAP_SHEET_PHASES.COMMIT_PAYMENT
        ? sheetPayload?.hospital?.id || null
        : null) ||
      nearestHospital?.id ||
      null,
    [
      historyFocusedHospital?.id,
      activeMapRequest?.hospitalId,
      nearestHospital?.id,
      sheetPhase,
      sheetPayload?.hospital?.id,
    ],
  );

  const mapFocusedHospital = useMemo(
    () =>
      historyFocusedHospital ||
      mapHospitals.find((item) => item?.id === mapFocusedHospitalId) ||
      activeMapRequest?.hospital ||
      featuredHospital ||
      sheetPayload?.hospital ||
      nearestHospital ||
      null,
    [
      historyFocusedHospital,
      mapHospitals,
      activeMapRequest?.hospital,
      featuredHospital,
      mapFocusedHospitalId,
      nearestHospital,
      sheetPayload?.hospital,
    ],
  );

  const handleOpenCommitTriageFromTracking = useCallback(
    (trackingPayload = {}) => {
      const targetHospital =
        mapFocusedHospital || featuredHospital || nearestHospital || null;
      if (!targetHospital?.id) return;
      const trackingRequestId =
        trackingPayload?.requestId ||
        activeMapRequest?.requestId ||
        null;
      openCommitTriage(targetHospital, trackingPayload?.transport || null, {
        ...trackingPayload,
        requestId: trackingRequestId,
        sourcePhase: MAP_SHEET_PHASES.TRACKING,
        sourceSnapState: renderedSnapState,
        sourcePayload: {
          hospital: targetHospital,
        },
      });
    },
    [
      activeMapRequest?.requestId,
      featuredHospital,
      mapFocusedHospital,
      nearestHospital,
      openCommitTriage,
      renderedSnapState,
    ],
  );

  const handleAddBedFromTracking = useCallback(() => {
    const targetHospital =
      mapFocusedHospital || featuredHospital || nearestHospital || null;
    if (!targetHospital?.id) return;

    openBedDecision(targetHospital, "bed", {
      sourcePhase: MAP_SHEET_PHASES.TRACKING,
      sourceSnapState: renderedSnapState,
      sourcePayload: {
        hospital: targetHospital,
      },
    });
  }, [
    featuredHospital,
    mapFocusedHospital,
    nearestHospital,
    openBedDecision,
    renderedSnapState,
  ]);

  const handleAddAmbulanceFromTracking = useCallback(() => {
    const targetHospital =
      mapFocusedHospital || featuredHospital || nearestHospital || null;
    if (!targetHospital?.id) return;

    openAmbulanceDecision(targetHospital, {
      sourcePhase: MAP_SHEET_PHASES.TRACKING,
      sourceSnapState: renderedSnapState,
      sourcePayload: {
        hospital: targetHospital,
      },
    });
  }, [
    featuredHospital,
    mapFocusedHospital,
    nearestHospital,
    openAmbulanceDecision,
    renderedSnapState,
  ]);

  const mapFocusedHospitalCoordinate = useMemo(
    () => getDestinationCoordinate(mapFocusedHospital),
    [mapFocusedHospital],
  );

  const mapServiceMarkerKind = useMemo(() => {
    if (historyVisitDetailsVisible) {
      return null;
    }
    if (activeMapRequest?.kind === MAP_ACTIVE_REQUEST_KINDS.AMBULANCE) {
      return "ambulance";
    }
    if (activeMapRequest?.kind === MAP_ACTIVE_REQUEST_KINDS.PENDING) {
      return activeMapRequest?.pendingKind === MAP_ACTIVE_REQUEST_KINDS.BED
        ? null
        : "ambulance";
    }
    if (sheetPhase === MAP_SHEET_PHASES.COMMIT_PAYMENT) {
      return paymentPreviewKind;
    }
    return null;
  }, [
    activeMapRequest?.kind,
    activeMapRequest?.pendingKind,
    historyVisitDetailsVisible,
    paymentPreviewKind,
    sheetPhase,
  ]);

  const mapServiceMarkerCoordinate = useMemo(() => {
    const activeAmbulance = activeMapRequest?.raw?.activeAmbulanceTrip;
    if (activeAmbulance?.currentResponderLocation) {
      return activeAmbulance.currentResponderLocation;
    }
    if (mapServiceMarkerKind === "ambulance") {
      return mapFocusedHospitalCoordinate;
    }
    return null;
  }, [
    activeMapRequest?.raw?.activeAmbulanceTrip,
    mapFocusedHospitalCoordinate,
    mapServiceMarkerKind,
  ]);

  const mapServiceMarkerHeading = useMemo(() => {
    const activeAmbulance = activeMapRequest?.raw?.activeAmbulanceTrip;
    if (Number.isFinite(activeAmbulance?.currentResponderHeading)) {
      return Number(activeAmbulance.currentResponderHeading);
    }
    if (
      mapServiceMarkerKind === "ambulance" &&
      mapFocusedHospitalCoordinate &&
      activeLocation
    ) {
      return calculateBearing(mapFocusedHospitalCoordinate, activeLocation);
    }
    return 0;
  }, [
    activeMapRequest?.raw?.activeAmbulanceTrip,
    activeLocation,
    mapFocusedHospitalCoordinate,
    mapServiceMarkerKind,
  ]);
  const isActiveTrackingMap = sheetPhase === MAP_SHEET_PHASES.TRACKING;
  const canRecoverTrackingRating =
    sheetPhase === MAP_SHEET_PHASES.EXPLORE_INTENT ||
    sheetPhase === MAP_SHEET_PHASES.TRACKING;

  useEffect(() => {
    let cancelled = false;

    const loadClaims = async () => {
      const nextClaims = await readTrackingRatingRecoveryClaims();
      if (!cancelled) {
        setRatingRecoveryClaims(nextClaims);
      }
    };

    loadClaims();
    return () => {
      cancelled = true;
    };
  }, [
    activeMapRequest?.hasActiveRequest,
    handledRecoveredRatingVersion,
    sheetPhase,
  ]);

  const pendingRecoveredRatingVisit = useMemo(() => {
    if (
      !canRecoverTrackingRating ||
      hasActiveMapModal ||
      activeMapRequest?.hasActiveRequest
    ) {
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

  useEffect(() => {
    // PULLBACK NOTE: VD-A diagnostic — log recovery rating trigger (defect VD-7: non-deterministic claims load)
    console.log('[VD-A][MapScreen] recoveredRating effect | pendingVisitId=', pendingRecoveredRatingVisit?.id ?? null, '| claimsCount=', Object.keys(ratingRecoveryClaims).length, '| alreadyVisible=', recoveredRatingState?.visible ?? false);
    if (recoveredRatingState?.visible || !pendingRecoveredRatingVisit) return;
    const nextState = buildRecoveredTrackingRatingState(
      pendingRecoveredRatingVisit,
      getTrackingRatingRecoveryClaim(pendingRecoveredRatingVisit, ratingRecoveryClaims),
    );
    if (nextState) {
      setRecoveredRatingState(nextState);
    }
  }, [pendingRecoveredRatingVisit, ratingRecoveryClaims, recoveredRatingState?.visible]);

  const closeRecoveredRating = useCallback(() => {
    setRecoveredRatingState(null);
  }, []);

  const markRecoveredRatingHandled = useCallback((visitId) => {
    if (!visitId) return;
    const normalizedVisitId = String(visitId);
    if (handledRecoveredRatingVisitIdsRef.current.has(normalizedVisitId)) return;
    handledRecoveredRatingVisitIdsRef.current.add(normalizedVisitId);
    setHandledRecoveredRatingVersion((current) => current + 1);
  }, []);

  const handleSkipRecoveredRating = useCallback(async () => {
    const visitId = recoveredRatingState?.visitId;
    if (!visitId) {
      closeRecoveredRating();
      return true;
    }

    const resolution = await resolveTrackingRatingSkip({
      visitId,
      updateVisit,
    });
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
        console.warn("[MapScreen] Recovered rating tip processing failed:", resolution.tipError);
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

  const handleResumeHistoryRequest = useCallback(() => {
    // PULLBACK NOTE: VD-A diagnostic — log Zustand state at resume tap (defect VD-6: no hasActiveTrip guard)
    console.log('[VD-A][MapScreen] handleResumeHistoryRequest | hasActiveRequest=', activeMapRequest?.hasActiveRequest ?? false, '| selectedHistoryVisitKey=', selectedHistoryVisitKey ?? null);
    closeHistoryVisitDetails();
    openTracking?.();
  }, [activeMapRequest?.hasActiveRequest, closeHistoryVisitDetails, openTracking, selectedHistoryVisitKey]);

  const handleRateHistoryVisit = useCallback(() => {
    if (!selectedHistoryVisit?.id || !selectedHistoryVisit?.canRate) return;
    // PULLBACK NOTE: VD-A diagnostic — history rating path (defect VD-2: parallel path, no updateVisit write)
    console.log('[VD-A][MapScreen] handleRateHistoryVisit | visitId=', selectedHistoryVisit.id, '| requestType=', selectedHistoryVisit.requestType ?? null);
    setHistoryRatingState({
      visible: true,
      visitId: selectedHistoryVisit.id,
      serviceType:
        selectedHistoryVisit.requestType === "visit"
          ? "visit"
          : selectedHistoryVisit.requestType,
      title:
        selectedHistoryVisit.requestType === "ambulance"
          ? "Rate your transport"
          : selectedHistoryVisit.requestType === "bed"
            ? "Rate your stay"
            : "Rate your visit",
      subtitle: selectedHistoryVisit.facilityName
        ? `For ${selectedHistoryVisit.facilityName}`
        : null,
      serviceDetails: {
        hospital: selectedHistoryVisit.facilityName || null,
        provider:
          selectedHistoryVisit.doctorName ||
          selectedHistoryVisit.actorName ||
          (selectedHistoryVisit.requestType === "ambulance"
            ? "Emergency services"
            : "Care team"),
      },
    });
    closeHistoryVisitDetails();
  }, [closeHistoryVisitDetails, selectedHistoryVisit]);

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

  // Book-again is temporarily bridged to the legacy full-screen route while the
  // sheet-native Pass 12 booking rebuild is in progress. Prefill parity will be
  // restored when the map-owned booking sheet lands.
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
              console.error("[MapScreen] Failed to cancel history visit:", error);
              showToast("Could not cancel this visit right now.", "error");
            }
          },
        },
      ],
    );
  }, [cancelVisit, selectedHistoryVisit, showToast]);

  // PULLBACK NOTE: Phase 8 — Pass B: in-flow tracking rating modal lifted here
  // Modal renderer survives sheet phase transitions (was previously inside MapTrackingStageBase)
  const {
    ratingState: trackingRatingState,
    closeRating: closeTrackingRating,
    skipRating: skipTrackingRating,
    submitRating: submitTrackingRating,
  } = useTrackingRatingFlow({
    updateVisit,
    showToast,
    stopAmbulanceTrip,
    stopBedBooking,
  });

  const handleSkipHistoryRating = useCallback(async () => {
    const resolution = await resolveTrackingRatingSkip({
      visitId: historyRatingState?.visitId,
      updateVisit,
    });
    if (!resolution.ok) {
      showToast("Could not close rating right now.", "error");
      return false;
    }

    closeHistoryRating();
    const toast = buildTrackingResolutionToast({
      action: "skipped",
      serviceType: historyRatingState?.serviceType || "visit",
      hospitalTitle: historyRatingState?.serviceDetails?.hospital ?? null,
    });
    showToast(toast.message, toast.level);
    return true;
  }, [
    closeHistoryRating,
    historyRatingState?.serviceDetails?.hospital,
    historyRatingState?.serviceType,
    historyRatingState?.visitId,
    showToast,
    updateVisit,
  ]);

  const handleSubmitHistoryRating = useCallback(
    async ({ rating, comment, tipAmount, tipCurrency }) => {
      const resolution = await resolveTrackingRatingSubmit({
        visitId: historyRatingState?.visitId,
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

      closeHistoryRating();
      const toast = buildTrackingResolutionToast({
        action: "rated",
        serviceType: historyRatingState?.serviceType || "visit",
        hospitalTitle: historyRatingState?.serviceDetails?.hospital ?? null,
        tipAmount,
        tipError: resolution.tipError,
      });
      showToast(toast.message, toast.level);
      return true;
    },
    [
      closeHistoryRating,
      historyRatingState?.serviceDetails?.hospital,
      historyRatingState?.serviceType,
      historyRatingState?.visitId,
      showToast,
      updateVisit,
    ],
  );

  const trackingRouteCoordinates = useMemo(
    () => normalizeTrackingRouteCoordinates(trackingRouteInfo?.coordinates),
    [trackingRouteInfo?.coordinates],
  );
  const activeTripRouteSignature = useMemo(
    () => buildTrackingRouteSignature(activeAmbulanceTrip?.route),
    [activeAmbulanceTrip?.route],
  );
  const trackingRouteSignature = useMemo(
    () => buildTrackingRouteSignature(trackingRouteCoordinates),
    [trackingRouteCoordinates],
  );
  const trackingTimeline = useMemo(
    () => ({
      etaSeconds:
        activeAmbulanceTrip?.etaSeconds ?? trackingRouteInfo?.durationSec ?? null,
      startedAt: activeAmbulanceTrip?.startedAt ?? null,
    }),
    [
      activeAmbulanceTrip?.etaSeconds,
      activeAmbulanceTrip?.startedAt,
      trackingRouteInfo?.durationSec,
    ],
  );

  useEffect(() => {
    if (
      !activeAmbulanceTrip?.requestId ||
      typeof patchActiveAmbulanceTrip !== "function"
    ) {
      return;
    }

    const updates = {};
    const nowMs = Date.now();
    const routeEtaSeconds = Number(trackingRouteInfo?.durationSec);
    const rawTripEtaSeconds = activeAmbulanceTrip?.etaSeconds;
    const hasPolylineRoute = trackingRouteCoordinates.length >= 2;
    const shouldReconcileRouteTimeline = shouldReconcileTrackingTimeline({
      routeEtaSeconds,
      tripEtaSeconds: rawTripEtaSeconds,
      tripStartedAt: activeAmbulanceTrip?.startedAt,
      hasPolylineRoute,
      nowMs,
    });

    if (shouldReconcileRouteTimeline) {
      updates.etaSeconds = routeEtaSeconds;
      updates.estimatedArrival = `${Math.max(1, Math.ceil(routeEtaSeconds / 60))} min`;
      updates.etaSource = "map_route";
      updates.startedAt = nowMs;
    }

    if (
      !shouldReconcileRouteTimeline &&
      !hasUsableTrackingStartedAt(activeAmbulanceTrip?.startedAt)
    ) {
      updates.startedAt = nowMs;
    }

    if (
      trackingRouteCoordinates.length >= 2 &&
      trackingRouteSignature &&
      trackingRouteSignature !== activeTripRouteSignature
    ) {
      updates.route = trackingRouteCoordinates;
    }

    if (Object.keys(updates).length > 0) {
      patchActiveAmbulanceTrip(updates);
    }
  }, [
    activeAmbulanceTrip?.etaSeconds,
    activeAmbulanceTrip?.requestId,
    activeAmbulanceTrip?.startedAt,
    activeTripRouteSignature,
    patchActiveAmbulanceTrip,
    trackingRouteCoordinates,
    trackingRouteInfo?.durationSec,
    trackingRouteSignature,
  ]);

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: isDarkMode ? "#08101B" : "#EEF3F8" },
      ]}
    >
      <EmergencyLocationPreviewMap
        location={activeLocation}
        hospitals={mapHospitals}
        selectedHospitalId={mapFocusedHospitalId}
        serviceMarkerKind={mapServiceMarkerKind}
        serviceMarkerCoordinate={mapServiceMarkerCoordinate}
        serviceMarkerHeading={mapServiceMarkerHeading}
        telemetryHealth={ambulanceTelemetryHealth}
        placeLabel={currentLocationDetails?.primaryText}
        interactive={isMapFrameReady}
        onReadinessChange={handleMapReadinessChange}
        onRouteInfoChange={setTrackingRouteInfo}
        activeTracking={isActiveTrackingMap}
        trackingTimeline={activeAmbulanceTrip?.requestId ? trackingTimeline : null}
        headerOcclusionHeight={trackingHeaderOcclusionHeight}
        bottomSheetHeight={bottomSheetHeight}
        leftPanelWidth={sidebarOcclusionWidth}
        showControls={shouldShowMapControls}
        controlsMode={surfaceConfig.mapControlsMode}
        controlsTopOffset={surfaceConfig.mapControlsTopInset + browserInsetTop}
        controlsRightOffset={surfaceConfig.mapControlsRightInset}
        controlsBottomOffsetBase={
          surfaceConfig.mapControlsBottomInsetBase + browserInsetBottom
        }
        onHospitalPress={handleMapHospitalPress}
        showInternalSkeleton={false}
      />

      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <MapSheetOrchestrator
          phase={sheetPhase}
          mode={sheetMode}
          snapState={renderedSnapState}
          screenHeight={height}
          nearestHospital={nearestHospital}
          nearestHospitalMeta={nearestHospitalMeta}
          selectedCare={selectedCare}
          onOpenSearch={() => openSearchSheet(MAP_SEARCH_SHEET_MODES.SEARCH)}
          onOpenHospitals={openHospitalList}
          onChooseCare={handleChooseCare}
          onOpenProfile={handleOpenProfile}
          onOpenCareHistory={() => setCareHistoryVisible(true)}
          onOpenAmbulanceHospitals={openAmbulanceHospitalList}
          onOpenBedHospitals={openBedHospitalList}
          onOpenRecents={() => setRecentVisitsVisible(true)}
          onSelectHistoryItem={handleSelectHistoryItem}
          onOpenFeaturedHospital={handleOpenFeaturedHospital}
          onCycleHospital={
            featuredHospitals.length > 1
              ? handleCycleFeaturedHospital
              : undefined
          }
          onSnapStateChange={setSheetSnapState}
          onCloseSearch={closeSearchSheet}
          onCloseHospitals={closeHospitalList}
          onCloseAmbulanceDecision={closeAmbulanceDecision}
          onCloseBedDecision={closeBedDecision}
          onCloseCommitDetails={closeCommitDetails}
          onCloseCommitTriage={closeCommitTriage}
          onCloseCommitPayment={closeCommitPayment}
          onCloseTracking={closeTracking}
          onOpenCommitTriageFromTracking={handleOpenCommitTriageFromTracking}
          onAddBedFromTracking={handleAddBedFromTracking}
          onAddAmbulanceFromTracking={handleAddAmbulanceFromTracking}
          onCloseHospitalDetail={closeHospitalDetail}
          onCloseVisitDetail={closeHistoryVisitDetails}
          onResumeHistoryVisit={handleResumeHistoryRequest}
          onRateHistoryVisit={handleRateHistoryVisit}
          onCallHistoryClinic={handleCallHistoryClinic}
          onJoinHistoryVideo={handleJoinHistoryVisit}
          onBookHistoryAgain={handleBookHistoryAgain}
          onOpenHistoryPaymentDetails={handleOpenHistoryPaymentDetails}
          onGetHistoryDirections={handleGetHistoryDirections}
          onCancelHistoryVisit={handleCancelHistoryVisit}
          onConfirmAmbulanceDecision={handleConfirmAmbulanceDecision}
          onConfirmBedDecision={handleConfirmBedDecision}
          onConfirmCommitDetails={handleConfirmCommitDetails}
          onConfirmCommitTriage={handleConfirmCommitTriage}
          onConfirmCommitPayment={finishCommitPayment}
          onOpenServiceDetail={openServiceDetail}
          onCloseServiceDetail={closeServiceDetail}
          onConfirmServiceDetail={confirmServiceDetail}
          onChangeServiceDetail={changeServiceDetailService}
          onSelectHospitalService={setHospitalServiceSelection}
          searchMode={searchSheetMode}
          hospitals={discoveredHospitals}
          selectedHospitalId={mapFocusedHospitalId}
          recommendedHospitalId={discoveredHospitals?.[0]?.id || null}
          featuredHospital={featuredHospital}
          sheetPayload={sheetPayload}
          activeMapRequest={activeMapRequest}
          trackingRouteInfo={trackingRouteInfo}
          trackingHeaderActionRequest={trackingHeaderActionRequest}
          onConsumeTrackingHeaderActionRequest={clearTrackingHeaderActionRequest}
          trackingHospitals={discoveredHospitals}
          trackingAllHospitals={allHospitals}
          trackingAmbulanceTelemetryHealth={ambulanceTelemetryHealth}
          trackingSetAmbulanceTripStatus={setAmbulanceTripStatus}
          trackingSetBedBookingStatus={setBedBookingStatus}
          trackingSetPendingApproval={setPendingApproval}
          trackingStopAmbulanceTrip={stopAmbulanceTrip}
          trackingStopBedBooking={stopBedBooking}
          trackingIsArrived={isArrived}
          trackingIsPendingApproval={isPendingApproval}
          currentLocation={currentLocationDetails}
          onSelectHospital={handleSelectHospital}
          onUseCurrentLocation={handleUseCurrentLocation}
          onSelectLocation={handleSearchLocation}
          onChangeHospitalLocation={() => {
            closeHospitalList();
            openSearchSheet(MAP_SEARCH_SHEET_MODES.LOCATION);
          }}
          onUseHospital={handleUseHospital}
          profileImageSource={profileImageSource}
          activeLocation={activeLocation}
          serviceSelectionsByHospital={serviceSelectionsByHospital}
          isSignedIn={isSignedIn}
          nearbyHospitalCount={nearbyHospitalCount}
          totalAvailableBeds={totalAvailableBeds}
          nearbyBedHospitals={nearbyBedHospitals}
          recentVisits={recentVisits}
          featuredHospitals={featuredHospitals}
        />
      </View>

      <MapExploreLoadingOverlay
        screenHeight={height}
        snapState={renderedSnapState}
        status={mapLoadingState}
        visible={mapLoadingState?.visible}
        backgroundImageUri={loadingBackgroundImageUri}
      />

      <MiniProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        onSignOut={handleProfileSignOut}
        onOpenRecentVisits={() => setRecentVisitsVisible(true)}
        showMapShortcut={false}
        preferDrawerPresentation={usesSidebarLayout}
      />

      <MapGuestProfileModal
        visible={guestProfileVisible}
        onClose={() => setGuestProfileVisible(false)}
        onAuthSuccess={() => setGuestProfileVisible(false)}
        preferDrawerPresentation={usesSidebarLayout}
      />

      <MapCareHistoryModal
        visible={careHistoryVisible}
        onClose={() => setCareHistoryVisible(false)}
        onChooseCare={(mode) => {
          setCareHistoryVisible(false);
          handleChooseCare(mode);
        }}
        onBookVisit={handleBookVisitFromCare}
      />

      <MapHistoryModal
        visible={recentVisitsVisible}
        onClose={() => setRecentVisitsVisible(false)}
        onSelectVisit={handleSelectHistoryItem}
        onBookVisit={handleBookVisitFromHistory}
        onChooseCare={handleOpenChooseCareFromHistory}
      />

      <MapHistoryPaymentModal
        visible={historyPaymentState.visible}
        loading={historyPaymentState.loading}
        paymentRecord={historyPaymentState.paymentRecord}
        onClose={closeHistoryPaymentDetails}
      />

      <ServiceRatingModal
        visible={Boolean(historyRatingState?.visible)}
        serviceType={historyRatingState?.serviceType || "visit"}
        title={historyRatingState?.title || "Rate your visit"}
        subtitle={historyRatingState?.subtitle || null}
        serviceDetails={historyRatingState?.serviceDetails || null}
        onClose={closeHistoryRating}
        onSkip={handleSkipHistoryRating}
        onSubmit={handleSubmitHistoryRating}
        surfaceVariant="map"
        preferDrawerPresentation={usesSidebarLayout}
      />

      <ServiceRatingModal
        visible={Boolean(recoveredRatingState?.visible)}
        serviceType={recoveredRatingState?.serviceType || "visit"}
        title={recoveredRatingState?.title || "Rate your visit"}
        subtitle={recoveredRatingState?.subtitle || null}
        serviceDetails={recoveredRatingState?.serviceDetails || null}
        onClose={closeRecoveredRating}
        onSkip={handleSkipRecoveredRating}
        onSubmit={handleSubmitRecoveredRating}
        surfaceVariant="map"
        preferDrawerPresentation={usesSidebarLayout}
      />

      {/* PULLBACK NOTE: Phase 8 — Pass B: in-flow tracking rating modal */}
      {/* Lifted from MapTrackingStageBase so it survives sheet phase transitions */}
      <ServiceRatingModal
        visible={Boolean(trackingRatingState?.visible)}
        serviceType={trackingRatingState?.serviceType || "visit"}
        title={trackingRatingState?.title || "Rate your visit"}
        subtitle={trackingRatingState?.subtitle || null}
        serviceDetails={trackingRatingState?.serviceDetails || null}
        onClose={closeTrackingRating}
        onSkip={skipTrackingRating}
        onSubmit={submitTrackingRating}
        surfaceVariant="map"
        preferDrawerPresentation={usesSidebarLayout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});

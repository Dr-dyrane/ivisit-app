import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, Platform, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import useAuthViewport from "../hooks/ui/useAuthViewport";
import EmergencyLocationPreviewMap from "../components/emergency/intake/EmergencyLocationPreviewMap";
import MiniProfileModal from "../components/emergency/MiniProfileModal";
import { ServiceRatingModal } from "../components/emergency/ServiceRatingModal";

import MapSheetOrchestrator, {
  MAP_SHEET_PHASES,
  MAP_SHEET_SNAP_STATES,
  getMapSheetHeight,
} from "../components/map/core/MapSheetOrchestrator";
import { buildBedDecisionSourcePayload } from "../components/map/core/mapSheetFlowPayloads";
import { MAP_ACTIVE_REQUEST_KINDS } from "../components/map/core/mapActiveRequestModel";
import MapGuestProfileModal from "../components/map/MapGuestProfileModal";
import MapCareHistoryModal from "../components/map/MapCareHistoryModal";
import MapExploreLoadingOverlay from "../components/map/surfaces/MapExploreLoadingOverlay";
import MapRecentVisitsModal from "../components/map/MapRecentVisitsModal";
import MapVisitDetailsModal from "../components/map/history/MapVisitDetailsModal";
import MapVisitBookingFlow from "../components/map/history/MapVisitBookingFlow";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useVisits } from "../contexts/VisitsContext";
import { useFABActions } from "../contexts/FABContext";
import { useMapExploreFlow } from "../hooks/map/useMapExploreFlow";
import {
  getMapViewportSurfaceConfig,
  getMapViewportVariant,
  isSidebarMapVariant,
} from "../components/map/core/mapViewportConfig";
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
    closeSearchSheet,
    profileImageSource,
    profileModalVisible,
    recentVisits,
    recentVisitsVisible,
    bookingVisible,
    bookingInitialData,
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
    setBookingVisible,
    setBookingInitialData,
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
  } = useMapExploreFlow(); // eslint-disable-line no-unused-vars -- setAuthModalVisible kept for store compat
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
        ? sidebarWidth +
          Math.max(0, Number(surfaceConfig.sidebarOuterInset || 0))
        : 0,
    [sidebarWidth, surfaceConfig.sidebarOuterInset, usesSidebarLayout],
  );
  const handledRecoveredRatingVisitIdsRef = useRef(new Set());
  const [handledRecoveredRatingVersion, setHandledRecoveredRatingVersion] = useState(0);
  const [ratingRecoveryClaims, setRatingRecoveryClaims] = useState({});
  const [recoveredRatingState, setRecoveredRatingState] = useState(null);
  const [selectedHistoryVisitKey, setSelectedHistoryVisitKey] = useState(null);
  const [historyVisitDetailsVisible, setHistoryVisitDetailsVisible] = useState(false);
  const [historyRatingState, setHistoryRatingState] = useState(null);

  const hasActiveMapModal =

    profileModalVisible ||
    guestProfileVisible ||
    careHistoryVisible ||
    recentVisitsVisible ||
    bookingVisible ||
    historyVisitDetailsVisible ||
    Boolean(historyRatingState?.visible) ||
    authModalVisible ||
    Boolean(recoveredRatingState?.visible) ||
    mapLoadingState?.visible;


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
            value !== null &&
            value !== undefined &&
            String(value).trim().length > 0,
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

  const closeHistoryVisitDetails = useCallback(() => {
    setHistoryVisitDetailsVisible(false);
    setSelectedHistoryVisitKey(null);
  }, []);
  const closeHistoryRating = useCallback(() => {
    setHistoryRatingState(null);
  }, []);

  const handleOpenChooseCareFromHistory = useCallback(() => {
    setRecentVisitsVisible(false);
    setCareHistoryVisible(true);
  }, [setCareHistoryVisible, setRecentVisitsVisible]);
  // PULLBACK NOTE: Pass 12 F3c - book-visit opens map-owned sheet instead of legacy route
  // OLD: router.push("/(user)/(stacks)/book-visit")
  // NEW: setBookingInitialData(null) + setBookingVisible(true)
  const handleBookVisitFromCare = useCallback(() => {
    setCareHistoryVisible(false);
    setBookingInitialData(null);
    setBookingVisible(true);
  }, [setBookingInitialData, setBookingVisible, setCareHistoryVisible]);

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

      if (canResumeLiveRequest) {
        openTracking?.();
        return;
      }

      setSelectedHistoryVisitKey(
        historyItem.requestId || historyItem.displayId || historyItem.id,
      );
      setHistoryVisitDetailsVisible(true);
    },
    [
      activeHistoryRequestKeys,
      activeMapRequest?.hasActiveRequest,
      openTracking,
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
    closeHistoryVisitDetails();
    openTracking?.();
  }, [closeHistoryVisitDetails, openTracking]);

  const handleRateHistoryVisit = useCallback(() => {
    if (!selectedHistoryVisit?.id || !selectedHistoryVisit?.canRate) return;

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

  // PULLBACK NOTE: Pass 12 F3c - book-again opens map-owned sheet with pre-filled initialData
  // OLD: router.push({ pathname: "/(user)/(stacks)/book-visit", params: { ... } })
  // NEW: setBookingInitialData(prefill) + setBookingVisible(true); useBookVisit consumes initialData
  const handleBookHistoryAgain = useCallback(() => {
    if (!selectedHistoryVisit) return;
    closeHistoryVisitDetails();
    const rawVisit = selectedHistoryVisit.visit || {};
    const isTelehealth =
      selectedHistoryVisit.requestType === "visit" &&
      String(rawVisit?.type || "").toLowerCase().includes("tele");
    setBookingInitialData({
      type: isTelehealth ? "telehealth" : "clinic",
      specialty: rawVisit?.specialty || undefined,
      hospital: rawVisit?.hospital
        ? {
            id: rawVisit?.hospitalId || undefined,
            name: rawVisit?.hospital,
            address: rawVisit?.address || undefined,
            image: rawVisit?.image || rawVisit?.hospitalImage || undefined,
            phone: rawVisit?.phone || undefined,
          }
        : undefined,
      step: 1,
    });
    setBookingVisible(true);
  }, [
    closeHistoryVisitDetails,
    selectedHistoryVisit,
    setBookingInitialData,
    setBookingVisible,
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
          // PULLBACK NOTE: Pass 12 F6 - renamed from onOpenRecents to onOpenRecentVisits
          // so MapSheetOrchestrator + MapExploreIntentStageBase can consume it consistently.
          onOpenRecentVisits={() => setRecentVisitsVisible(true)}
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

      <MapRecentVisitsModal
        visible={recentVisitsVisible}
        onClose={() => setRecentVisitsVisible(false)}
        onSelectVisit={handleSelectHistoryItem}
        onChooseCare={handleOpenChooseCareFromHistory}
      />

      <MapVisitDetailsModal
        visible={historyVisitDetailsVisible}
        historyItem={selectedHistoryVisit}
        onClose={closeHistoryVisitDetails}
        onResume={handleResumeHistoryRequest}
        onRateVisit={handleRateHistoryVisit}
        onCallClinic={handleCallHistoryClinic}
        onJoinVideo={handleJoinHistoryVisit}
        onBookAgain={handleBookHistoryAgain}
        onCancelVisit={handleCancelHistoryVisit}
      />

      {/* PULLBACK NOTE: Pass 12 F3c - map-owned visit booking flow.
          Replaces legacy /(user)/(stacks)/book-visit bridge. */}
      <MapVisitBookingFlow
        visible={bookingVisible}
        initialData={bookingInitialData}
        onClose={() => setBookingVisible(false)}
        onCompleted={(visit) => {
          showToast(
            `Visit booked for ${visit?.date || "your selection"}.`,
            "success",
          );
        }}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { useFocusEffect } from "expo-router";
import { useHeaderState } from "../../../contexts/HeaderStateContext";
import { useScrollAwareHeader } from "../../../contexts/ScrollAwareHeaderContext";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { useGlobalLocation } from "../../../contexts/GlobalLocationContext";
import { useEmergency } from "../../../contexts/EmergencyContext";
import { useVisits } from "../../../contexts/VisitsContext";
import { coverageModeService } from "../../../services/coverageModeService";
import {
  buildHeaderLocationModel,
  toEmergencyLocation,
} from "../../../utils/map/mapLocationPresentation";
import {
  MAP_SHEET_PHASES,
  MAP_SHEET_SNAP_STATES,
} from "../../../components/map/core/MapSheetOrchestrator";
import {
  getMapViewportVariant,
  isSidebarMapVariant,
} from "../../../components/map/core/mapViewportConfig";
import { MAP_SEARCH_SHEET_MODES } from "../../../components/map/surfaces/search/mapSearchSheet.helpers";
import { HEADER_MODES } from "../../../constants/header";
import { COLORS } from "../../../constants/colors";
import { hasMeaningfulLocationChange } from "./mapExploreFlow.helpers";
import {
  getDiscoveredHospitals,
  getFeaturedHospitals,
  getNearbyBedHospitals,
  getNearbyHospitalCount,
  getNearestHospital,
  getNearestHospitalMeta,
  getRecentVisits,
  getTotalAvailableBeds,
} from "./mapExploreFlow.derived";
import { buildMapLoadingState } from "./mapExploreFlow.loading";
import { useMapExploreDemoBootstrap } from "./useMapExploreDemoBootstrap";
import { useMapExploreGuestProfileFab } from "./useMapExploreGuestProfileFab";
import { useMapExploreFlowStore } from "../state/mapExploreFlow.store";
import MapHeaderIconButton from "../../../components/map/views/shared/MapHeaderIconButton";

const TRACKING_HEADER_COLLAPSED_HEIGHT = 124;
const TRACKING_HEADER_EXPANDED_HEIGHT = 212;

function formatHeaderEtaLabel(etaSeconds, startedAt, nowMs = Date.now()) {
  if (!Number.isFinite(etaSeconds) || !Number.isFinite(startedAt)) return null;
  const elapsedSeconds = Math.max(0, Math.round((nowMs - startedAt) / 1000));
  const remainingSeconds = Math.max(0, Math.round(etaSeconds - elapsedSeconds));
  const remainingMinutes = Math.max(1, Math.ceil(remainingSeconds / 60));
  return `${remainingMinutes} min`;
}

function formatHospitalDistanceLabel(hospital) {
  const directDistance = Number(hospital?.distanceKm);
  if (typeof hospital?.distance === "string" && hospital.distance.trim()) {
    return hospital.distance.trim();
  }
  if (Number.isFinite(directDistance) && directDistance > 0) {
    return directDistance < 1
      ? `${Math.round(directDistance * 1000)} m`
      : `${directDistance.toFixed(directDistance < 10 ? 1 : 0)} km`;
  }
  return null;
}

export function useMapExploreFlow() {
  const suppressCommitRestoreRef = useRef(false);
  const trackingDismissedRef = useRef(false);
  const lastTrackingRequestKeyRef = useRef(null);
  const [trackingHeaderExpanded, setTrackingHeaderExpanded] = useState(false);
  const [trackingHeaderNowMs, setTrackingHeaderNowMs] = useState(Date.now());
  const { isDarkMode } = useTheme();
  const { width, height } = useWindowDimensions();
  const viewportVariant = useMemo(
    () => getMapViewportVariant({ platform: Platform.OS, width }),
    [width],
  );
  const usesSidebarLayout = useMemo(
    () => isSidebarMapVariant(viewportVariant),
    [viewportVariant],
  );
  const {
    resetHeader,
    lockHeaderHidden,
    unlockHeaderHidden,
    forceHeaderVisible,
  } = useScrollAwareHeader();
  const { setHeaderState, resetHeaderState } = useHeaderState();
  const { user } = useAuth();
  const { visits = [] } = useVisits();
  const {
    userLocation: globalUserLocation,
    locationLabel,
    locationLabelDetail,
    refreshLocation,
    isLoadingLocation,
    isResolvingPlaceName,
  } = useGlobalLocation();
  const {
    hospitals,
    allHospitals,
    selectedHospitalId,
    selectedHospital,
    selectHospital,
    setUserLocation,
    userLocation: emergencyUserLocation,
    isLoadingHospitals,
    refreshHospitals,
    effectiveDemoModeEnabled,
    coverageModePreferenceLoaded,
    coverageStatus,
    nearbyCoverageCounts,
    hasDemoHospitalsNearby,
    hasComfortableNearbyCoverage,
    activeAmbulanceTrip,
    ambulanceTelemetryHealth,
    activeBedBooking,
    pendingApproval,
    commitFlow,
    setCommitFlow,
    clearCommitFlow,
  } = useEmergency();

  const { state: flowState, actions: flowActions } = useMapExploreFlowStore({
    usesSidebarLayout,
  });
  const searchSheetVisible = flowState.sheet.phase === MAP_SHEET_PHASES.SEARCH;
  const searchSheetMode = flowState.search.mode;
  const hospitalListVisible =
    flowState.sheet.phase === MAP_SHEET_PHASES.HOSPITAL_LIST;
  const hospitalDetailVisible =
    flowState.sheet.phase === MAP_SHEET_PHASES.HOSPITAL_DETAIL;
  const ambulanceDecisionVisible =
    flowState.sheet.phase === MAP_SHEET_PHASES.AMBULANCE_DECISION;
  const bedDecisionVisible =
    flowState.sheet.phase === MAP_SHEET_PHASES.BED_DECISION;
  const commitTriageVisible =
    flowState.sheet.phase === MAP_SHEET_PHASES.COMMIT_TRIAGE;
  const commitPaymentVisible =
    flowState.sheet.phase === MAP_SHEET_PHASES.COMMIT_PAYMENT;
  const trackingVisible = flowState.sheet.phase === MAP_SHEET_PHASES.TRACKING;
  const serviceDetailVisible =
    flowState.sheet.phase === MAP_SHEET_PHASES.SERVICE_DETAIL;
  const profileModalVisible = flowState.surfaces.profileModalVisible;
  const guestProfileVisible = flowState.surfaces.guestProfileVisible;
  const careHistoryVisible = flowState.surfaces.careHistoryVisible;
  const recentVisitsVisible = flowState.surfaces.recentVisitsVisible;
  const authModalVisible = flowState.surfaces.authModalVisible;
  const selectedCare = flowState.selection.selectedCare;
  const featuredHospital = flowState.selection.featuredHospital;
  const serviceSelectionsByHospital =
    flowState.selection.serviceSelectionsByHospital;
  const manualLocation = flowState.location.manualLocation;
  const guestProfileEmail = flowState.location.guestProfileEmail;
  const sheetPhase = flowState.sheet.phase;
  const sheetMode = sheetPhase;
  const sheetSnapState = flowState.sheet.snapState;
  const sheetPayload = flowState.sheet.payload;
  const mapReadiness = flowState.map.readiness;
  const hasCompletedInitialMapLoad = flowState.map.hasCompletedInitialMapLoad;
  const {
    resetExplorePresentation,
    setAuthModalVisible,
    setCareHistoryVisible,
    setFeaturedHospital,
    setHospitalServiceSelection: setHospitalServiceSelectionValue,
    setGuestProfileEmail,
    setGuestProfileVisible,
    setManualLocation,
    setMapReadiness,
    setHasCompletedInitialMapLoad,
    setProfileModalVisible,
    setRecentVisitsVisible,
    setSearchSheetMode,
    setSelectedCare,
    setSheetPayload,
    setSheetMode,
    setSheetPhase,
    setSheetSnapState,
    setSheetView,
  } = flowActions;

  const activeLocation =
    manualLocation?.location ||
    emergencyUserLocation ||
    globalUserLocation ||
    null;
  const currentLocationDetails = buildHeaderLocationModel(
    manualLocation || {
      primaryText: locationLabel || "Current location",
      secondaryText: locationLabelDetail || "",
      location: activeLocation,
    },
  );
  const isSignedIn = Boolean(user?.isLoggedIn || user?.id);
  const profileImageSource = user?.imageUri
    ? { uri: user.imageUri }
    : require("../../../assets/profile.jpg");
  const loadingBackgroundImageUri = useMemo(() => {
    const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
    const latitude = Number(
      activeLocation?.latitude ?? activeLocation?.coords?.latitude,
    );
    const longitude = Number(
      activeLocation?.longitude ?? activeLocation?.coords?.longitude,
    );

    if (!token || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    const styleId = isDarkMode ? "navigation-night-v1" : "light-v11";
    const imageWidth = Math.max(
      360,
      Math.min(1280, Math.round((width || 390) * 1.4)),
    );
    const imageHeight = Math.max(
      720,
      Math.min(1600, Math.round((height || 844) * 1.3)),
    );

    return `https://api.mapbox.com/styles/v1/mapbox/${styleId}/static/${longitude.toFixed(5)},${latitude.toFixed(5)},13.2,0,0/${imageWidth}x${imageHeight}?logo=false&attribution=false&access_token=${encodeURIComponent(token)}`;
  }, [activeLocation, height, isDarkMode, width]);
  const needsCoverageExpansion =
    coverageModeService.needsDemoSupport(coverageStatus);
  const shouldBootstrapDemoCoverage = coverageModeService.shouldBootstrapDemo({
    coverageStatus,
    nearbyCoverageCounts,
    hasDemoHospitalsNearby,
  });
  const discoveredHospitals = useMemo(() => {
    return getDiscoveredHospitals(allHospitals, hospitals);
  }, [allHospitals, hospitals]);
  const nearestHospital = useMemo(() => {
    return getNearestHospital(selectedHospital, discoveredHospitals);
  }, [discoveredHospitals, selectedHospital]);
  const defaultExploreSnapState = usesSidebarLayout
    ? MAP_SHEET_SNAP_STATES.EXPANDED
    : MAP_SHEET_SNAP_STATES.HALF;
  const isBootstrappingDemo = useMapExploreDemoBootstrap({
    activeLocation,
    coverageModePreferenceLoaded,
    coverageStatus,
    effectiveDemoModeEnabled,
    hasComfortableNearbyCoverage,
    isLoadingHospitals,
    nearbyCoverageCounts,
    refreshHospitals,
    shouldBootstrapDemoCoverage,
    userId: user?.id,
  });

  useFocusEffect(
    useCallback(() => {
      resetHeader();
      resetHeaderState();
      lockHeaderHidden();
      setHeaderState({
        mode: HEADER_MODES.HIDDEN,
        hidden: true,
        scrollAware: false,
      });
      resetExplorePresentation();
      return () => {
        unlockHeaderHidden();
        forceHeaderVisible();
        resetHeader();
        resetHeaderState();
      };
    }, [
      forceHeaderVisible,
      lockHeaderHidden,
      resetHeader,
      resetHeaderState,
      resetExplorePresentation,
      setHeaderState,
      unlockHeaderHidden,
    ]),
  );

  useEffect(() => {
    if (manualLocation?.location) {
      setUserLocation((current) => {
        const nextLocation = toEmergencyLocation(manualLocation.location);
        if (!nextLocation) return current;
        if (
          Number(current?.latitude) === nextLocation.latitude &&
          Number(current?.longitude) === nextLocation.longitude
        ) {
          return current;
        }
        return nextLocation;
      });
      return;
    }

    if (!globalUserLocation?.latitude || !globalUserLocation?.longitude) {
      return;
    }

    setUserLocation((current) => {
      const nextLocation = toEmergencyLocation(globalUserLocation);
      if (!nextLocation) return current;
      if (
        Number(current?.latitude) === nextLocation.latitude &&
        Number(current?.longitude) === nextLocation.longitude
      ) {
        return current;
      }
      return nextLocation;
    });
  }, [
    globalUserLocation?.latitude,
    globalUserLocation?.longitude,
    manualLocation?.location,
    setUserLocation,
  ]);

  useEffect(() => {
    if (!Array.isArray(discoveredHospitals) || discoveredHospitals.length === 0)
      return;
    if (
      selectedHospitalId &&
      discoveredHospitals.some(
        (hospital) => hospital?.id === selectedHospitalId,
      )
    ) {
      return;
    }
    if (discoveredHospitals[0]?.id) {
      selectHospital(discoveredHospitals[0].id);
    }
  }, [discoveredHospitals, selectHospital, selectedHospitalId]);

  useEffect(() => {
    const isRestorableCommitPhase =
      commitFlow?.phase === MAP_SHEET_PHASES.COMMIT_DETAILS ||
      commitFlow?.phase === MAP_SHEET_PHASES.COMMIT_TRIAGE ||
      commitFlow?.phase === MAP_SHEET_PHASES.COMMIT_PAYMENT;
    if (!isRestorableCommitPhase) {
      suppressCommitRestoreRef.current = false;
      return;
    }

    if (suppressCommitRestoreRef.current || sheetPhase === commitFlow?.phase) {
      return;
    }

    const targetHospital =
      commitFlow?.hospital ||
      discoveredHospitals?.find(
        (item) => item?.id === commitFlow?.hospitalId,
      ) ||
      selectedHospital ||
      featuredHospital ||
      nearestHospital ||
      null;

    if (targetHospital?.id) {
      selectHospital(targetHospital.id);
      setFeaturedHospital(targetHospital);
    }

    // Prefer the stored sourcePhase over the hardcoded AMBULANCE_DECISION
    // fallback so that bed and "both" flows restore to the correct prior
    // phase (BED_DECISION) instead of always pointing at ambulance.
    const restoredSourcePhase =
      commitFlow?.sourcePhase || MAP_SHEET_PHASES.AMBULANCE_DECISION;

    // Recover any bed-booking context that was packed into sourcePayload
    // when the commit phase was originally opened from BED_DECISION.
    const restoredSourcePayload = commitFlow?.sourcePayload || null;
    const restoredCareIntent =
      restoredSourcePayload?.careIntent || commitFlow?.careIntent || null;
    const restoredRoom =
      restoredSourcePayload?.room || commitFlow?.room || null;
    const restoredRoomId =
      restoredSourcePayload?.roomId || commitFlow?.roomId || null;
    const restoredPhaseSnapState =
      commitFlow?.phaseSnapState ||
      (commitFlow?.phase === MAP_SHEET_PHASES.COMMIT_PAYMENT
        ? defaultExploreSnapState
        : MAP_SHEET_SNAP_STATES.EXPANDED);

    setSheetView({
      phase: commitFlow.phase,
      snapState: restoredPhaseSnapState,
      payload: {
        hospital: targetHospital,
        transport: commitFlow?.transport || null,
        draft: commitFlow?.draft || null,
        triageDraft: commitFlow?.triageDraft || null,
        triageSnapshot: commitFlow?.triageSnapshot || null,
        pricingSnapshot: commitFlow?.pricingSnapshot || null,
        activeStep: commitFlow?.activeStep || null,
        showExtendedComplaints: Boolean(commitFlow?.showExtendedComplaints),
        careIntent: restoredCareIntent,
        room: restoredRoom,
        roomId: restoredRoomId,
        sourcePhase: restoredSourcePhase,
        sourceSnapState: commitFlow?.sourceSnapState || defaultExploreSnapState,
        sourcePayload: restoredSourcePayload,
      },
    });
  }, [
    commitFlow,
    defaultExploreSnapState,
    discoveredHospitals,
    featuredHospital,
    nearestHospital,
    selectHospital,
    selectedHospital,
    setFeaturedHospital,
    setSheetView,
    sheetPhase,
  ]);

  const nearestHospitalMeta = useMemo(
    () => getNearestHospitalMeta(nearestHospital),
    [nearestHospital],
  );

  const nearbyHospitalCount = useMemo(
    () => getNearbyHospitalCount(discoveredHospitals),
    [discoveredHospitals],
  );
  const totalAvailableBeds = useMemo(
    () => getTotalAvailableBeds(discoveredHospitals),
    [discoveredHospitals],
  );
  const nearbyBedHospitals = useMemo(
    () => getNearbyBedHospitals(discoveredHospitals),
    [discoveredHospitals],
  );
  const recentVisits = useMemo(() => getRecentVisits(visits), [visits]);
  const featuredHospitals = useMemo(
    () => getFeaturedHospitals(discoveredHospitals),
    [discoveredHospitals],
  );
  const trackingRequestKey =
    activeAmbulanceTrip?.requestId ||
    activeBedBooking?.requestId ||
    pendingApproval?.requestId ||
    null;

  useEffect(() => {
    if (lastTrackingRequestKeyRef.current !== trackingRequestKey) {
      trackingDismissedRef.current = false;
      lastTrackingRequestKeyRef.current = trackingRequestKey;
      setTrackingHeaderExpanded(false);
    }
  }, [trackingRequestKey]);

  useEffect(() => {
    if (!trackingVisible || !trackingRequestKey) {
      setTrackingHeaderExpanded(false);
      return undefined;
    }

    setTrackingHeaderNowMs(Date.now());
    const intervalId = setInterval(() => {
      setTrackingHeaderNowMs(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [trackingRequestKey, trackingVisible]);

  const openTracking = useCallback(() => {
    const trackedHospitalId =
      activeAmbulanceTrip?.hospitalId ||
      activeBedBooking?.hospitalId ||
      pendingApproval?.hospitalId ||
      sheetPayload?.hospital?.id ||
      featuredHospital?.id ||
      nearestHospital?.id ||
      null;
    const trackedHospital =
      discoveredHospitals.find((item) => item?.id === trackedHospitalId) ||
      featuredHospital ||
      nearestHospital ||
      sheetPayload?.hospital ||
      null;

    if (trackedHospital?.id) {
      selectHospital(trackedHospital.id);
      setFeaturedHospital(trackedHospital);
    }

    setSheetView({
      phase: MAP_SHEET_PHASES.TRACKING,
      snapState: usesSidebarLayout
        ? MAP_SHEET_SNAP_STATES.EXPANDED
        : MAP_SHEET_SNAP_STATES.HALF,
      payload: {
        hospital: trackedHospital,
      },
    });
  }, [
    activeAmbulanceTrip?.hospitalId,
    activeBedBooking?.hospitalId,
    discoveredHospitals,
    featuredHospital,
    nearestHospital,
    pendingApproval?.hospitalId,
    selectHospital,
    setFeaturedHospital,
    setSheetView,
    sheetPayload?.hospital,
    usesSidebarLayout,
  ]);

  useEffect(() => {
    if (!trackingRequestKey) {
      if (sheetPhase === MAP_SHEET_PHASES.TRACKING) {
        setSheetView({
          phase: MAP_SHEET_PHASES.EXPLORE_INTENT,
          snapState: defaultExploreSnapState,
          payload: null,
        });
      }
      return;
    }

    if (
      trackingDismissedRef.current ||
      sheetPhase === MAP_SHEET_PHASES.TRACKING ||
      sheetPhase === MAP_SHEET_PHASES.COMMIT_DETAILS ||
      sheetPhase === MAP_SHEET_PHASES.COMMIT_TRIAGE ||
      sheetPhase === MAP_SHEET_PHASES.COMMIT_PAYMENT
    ) {
      return;
    }

    if (sheetPhase === MAP_SHEET_PHASES.EXPLORE_INTENT) {
      openTracking();
    }
  }, [
    defaultExploreSnapState,
    openTracking,
    setSheetView,
    sheetPhase,
    trackingRequestKey,
  ]);

  const openSearchSheet = useCallback(
    (nextMode = MAP_SEARCH_SHEET_MODES.SEARCH) => {
      setSearchSheetMode(nextMode);
      setSheetView({
        phase: MAP_SHEET_PHASES.SEARCH,
        snapState: MAP_SHEET_SNAP_STATES.EXPANDED,
        payload: null,
      });
    },
    [setSearchSheetMode, setSheetView],
  );

  const closeSearchSheet = useCallback(() => {
    setSheetView({
      phase: MAP_SHEET_PHASES.EXPLORE_INTENT,
      snapState: defaultExploreSnapState,
      payload: null,
    });
  }, [defaultExploreSnapState, setSheetView]);

  const openHospitalList = useCallback(() => {
    setSheetView({
      phase: MAP_SHEET_PHASES.HOSPITAL_LIST,
      snapState: MAP_SHEET_SNAP_STATES.EXPANDED,
      payload: null,
    });
  }, [setSheetView]);

  const openAmbulanceDecision = useCallback(
    (nextHospital = null) => {
      const targetHospital =
        nextHospital ||
        selectedHospital ||
        featuredHospital ||
        nearestHospital ||
        discoveredHospitals?.[0] ||
        null;

      if (targetHospital?.id) {
        selectHospital(targetHospital.id);
        setFeaturedHospital(targetHospital);
      }

      setSheetView({
        phase: MAP_SHEET_PHASES.AMBULANCE_DECISION,
        snapState: defaultExploreSnapState,
        payload: null,
      });
    },
    [
      defaultExploreSnapState,
      discoveredHospitals,
      featuredHospital,
      nearestHospital,
      selectHospital,
      selectedHospital,
      setFeaturedHospital,
      setSheetView,
    ],
  );

  const openAmbulanceHospitalList = useCallback(() => {
    setSheetView({
      phase: MAP_SHEET_PHASES.HOSPITAL_LIST,
      snapState: MAP_SHEET_SNAP_STATES.EXPANDED,
      payload: {
        sourcePhase: MAP_SHEET_PHASES.AMBULANCE_DECISION,
        sourceSnapState: sheetSnapState || defaultExploreSnapState,
        sourcePayload: null,
      },
    });
  }, [defaultExploreSnapState, setSheetView, sheetSnapState]);

  const openBedDecision = useCallback(
    (nextHospital = null, careIntent = "bed", payload = null) => {
      const targetHospital =
        nextHospital ||
        selectedHospital ||
        featuredHospital ||
        nearestHospital ||
        discoveredHospitals?.[0] ||
        null;

      if (targetHospital?.id) {
        selectHospital(targetHospital.id);
        setFeaturedHospital(targetHospital);
      }

      setSheetView({
        phase: MAP_SHEET_PHASES.BED_DECISION,
        snapState: defaultExploreSnapState,
        payload: {
          careIntent,
          ...(payload && typeof payload === "object" ? payload : {}),
        },
      });
    },
    [
      defaultExploreSnapState,
      discoveredHospitals,
      featuredHospital,
      nearestHospital,
      selectHospital,
      selectedHospital,
      setFeaturedHospital,
      setSheetView,
    ],
  );

  const openCommitDetails = useCallback(
    (nextHospital = null, transport = null, payload = null) => {
      suppressCommitRestoreRef.current = false;
      const targetHospital =
        nextHospital ||
        selectedHospital ||
        featuredHospital ||
        nearestHospital ||
        discoveredHospitals?.[0] ||
        null;

      if (targetHospital?.id) {
        selectHospital(targetHospital.id);
        setFeaturedHospital(targetHospital);
      }

      // Respect caller-supplied sourcePhase so bed/both flows can back up
      // to BED_DECISION instead of always landing on AMBULANCE_DECISION.
      const resolvedSourcePhase =
        payload?.sourcePhase || MAP_SHEET_PHASES.AMBULANCE_DECISION;

      setSheetView({
        phase: MAP_SHEET_PHASES.COMMIT_DETAILS,
        snapState: MAP_SHEET_SNAP_STATES.EXPANDED,
        payload: {
          hospital: targetHospital,
          transport: transport || null,
          sourcePhase: resolvedSourcePhase,
          sourceSnapState: sheetSnapState || defaultExploreSnapState,
          ...(payload && typeof payload === "object" ? payload : {}),
        },
      });
      setCommitFlow({
        phase: MAP_SHEET_PHASES.COMMIT_DETAILS,
        phaseSnapState: MAP_SHEET_SNAP_STATES.EXPANDED,
        hospital: targetHospital,
        hospitalId: targetHospital?.id || null,
        transport: transport || null,
        draft: payload?.draft || null,
        activeStep: payload?.activeStep || null,
        sourcePhase: resolvedSourcePhase,
        sourceSnapState: sheetSnapState || defaultExploreSnapState,
        sourcePayload: payload?.sourcePayload || null,
      });
    },
    [
      defaultExploreSnapState,
      discoveredHospitals,
      featuredHospital,
      nearestHospital,
      selectHospital,
      selectedHospital,
      setFeaturedHospital,
      setSheetView,
      sheetSnapState,
      setCommitFlow,
    ],
  );

  const openCommitTriage = useCallback(
    (nextHospital = null, transport = null, payload = null) => {
      suppressCommitRestoreRef.current = false;
      const targetHospital =
        nextHospital ||
        selectedHospital ||
        featuredHospital ||
        nearestHospital ||
        discoveredHospitals?.[0] ||
        null;

      if (targetHospital?.id) {
        selectHospital(targetHospital.id);
        setFeaturedHospital(targetHospital);
      }

      const resolvedSourcePhase =
        payload?.sourcePhase || MAP_SHEET_PHASES.COMMIT_DETAILS;
      const resolvedSourceSnapState =
        payload?.sourceSnapState || sheetSnapState || defaultExploreSnapState;
      const resolvedSourcePayload = payload?.sourcePayload || null;

      setSheetView({
        phase: MAP_SHEET_PHASES.COMMIT_TRIAGE,
        snapState: MAP_SHEET_SNAP_STATES.EXPANDED,
        payload: {
          hospital: targetHospital,
          transport: transport || null,
          sourcePhase: resolvedSourcePhase,
          sourceSnapState: resolvedSourceSnapState,
          sourcePayload: resolvedSourcePayload,
          ...(payload && typeof payload === "object" ? payload : {}),
        },
      });
      setCommitFlow({
        phase: MAP_SHEET_PHASES.COMMIT_TRIAGE,
        phaseSnapState: MAP_SHEET_SNAP_STATES.EXPANDED,
        hospital: targetHospital,
        hospitalId: targetHospital?.id || null,
        transport: transport || null,
        draft: payload?.draft || null,
        triageDraft: payload?.triageDraft || null,
        triageSnapshot: payload?.triageSnapshot || null,
        activeStep: payload?.activeStep || null,
        showExtendedComplaints: Boolean(payload?.showExtendedComplaints),
        sourcePhase: resolvedSourcePhase,
        sourceSnapState: resolvedSourceSnapState,
        sourcePayload: resolvedSourcePayload,
        careIntent: payload?.careIntent || null,
        roomId: payload?.roomId || null,
        room: payload?.room || null,
      });
    },
    [
      defaultExploreSnapState,
      discoveredHospitals,
      featuredHospital,
      nearestHospital,
      selectHospital,
      selectedHospital,
      setCommitFlow,
      setFeaturedHospital,
      setSheetView,
      sheetSnapState,
    ],
  );

  const openCommitPayment = useCallback(
    (nextHospital = null, transport = null, payload = null) => {
      suppressCommitRestoreRef.current = false;
      const targetHospital =
        nextHospital ||
        selectedHospital ||
        featuredHospital ||
        nearestHospital ||
        discoveredHospitals?.[0] ||
        null;

      if (targetHospital?.id) {
        selectHospital(targetHospital.id);
        setFeaturedHospital(targetHospital);
      }

      // Respect caller-supplied sourcePhase so the back button in payment
      // returns to the correct prior phase (BED_DECISION, COMMIT_DETAILS, etc.).
      const resolvedSourcePhase =
        payload?.sourcePhase || MAP_SHEET_PHASES.COMMIT_DETAILS;
      const resolvedSourceSnapState =
        payload?.sourceSnapState || sheetSnapState || defaultExploreSnapState;
      const resolvedSourcePayload = payload?.sourcePayload || null;
      const targetPhaseSnapState = usesSidebarLayout
        ? MAP_SHEET_SNAP_STATES.EXPANDED
        : MAP_SHEET_SNAP_STATES.HALF;

      const nextPayload = {
        ...(payload && typeof payload === "object" ? payload : {}),
        hospital: targetHospital,
        transport: transport || null,
        sourcePhase: resolvedSourcePhase,
        sourceSnapState: resolvedSourceSnapState,
        sourcePayload: resolvedSourcePayload,
      };

      setSheetView({
        phase: MAP_SHEET_PHASES.COMMIT_PAYMENT,
        snapState: targetPhaseSnapState,
        payload: nextPayload,
      });
      setCommitFlow({
        phase: MAP_SHEET_PHASES.COMMIT_PAYMENT,
        phaseSnapState: targetPhaseSnapState,
        hospital: targetHospital,
        hospitalId: targetHospital?.id || null,
        transport: transport || null,
        draft: payload?.draft || null,
        triageDraft: payload?.triageDraft || null,
        triageSnapshot: payload?.triageSnapshot || null,
        pricingSnapshot: payload?.pricingSnapshot || null,
        sourcePhase: resolvedSourcePhase,
        sourceSnapState: resolvedSourceSnapState,
        sourcePayload: resolvedSourcePayload,
      });
    },
    [
      defaultExploreSnapState,
      discoveredHospitals,
      featuredHospital,
      nearestHospital,
      selectHospital,
      selectedHospital,
      setCommitFlow,
      setFeaturedHospital,
      setSheetView,
      sheetSnapState,
      usesSidebarLayout,
    ],
  );

  const openBedHospitalList = useCallback(() => {
    setSheetView({
      phase: MAP_SHEET_PHASES.HOSPITAL_LIST,
      snapState: MAP_SHEET_SNAP_STATES.EXPANDED,
      payload: {
        sourcePhase: MAP_SHEET_PHASES.BED_DECISION,
        sourceSnapState: sheetSnapState || defaultExploreSnapState,
        sourcePayload: {
          careIntent: sheetPayload?.careIntent === "both" ? "both" : "bed",
          savedTransport:
            sheetPayload?.careIntent === "both"
              ? sheetPayload?.savedTransport || null
              : null,
        },
      },
    });
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
      setSheetView({
        phase: sheetPayload?.sourcePhase,
        snapState: sheetPayload?.sourceSnapState || defaultExploreSnapState,
        payload: sheetPayload?.sourcePayload || null,
      });
      return;
    }

    setSheetView({
      phase: MAP_SHEET_PHASES.EXPLORE_INTENT,
      snapState: defaultExploreSnapState,
      payload: null,
    });
  }, [
    defaultExploreSnapState,
    setSheetView,
    sheetPayload?.sourcePhase,
    sheetPayload?.sourcePayload,
    sheetPayload?.sourceSnapState,
  ]);

  const openHospitalDetail = useCallback(
    (hospital) => {
      if (hospital) {
        setFeaturedHospital(hospital);
      }
      setSheetView({
        phase: MAP_SHEET_PHASES.HOSPITAL_DETAIL,
        snapState: usesSidebarLayout
          ? MAP_SHEET_SNAP_STATES.EXPANDED
          : MAP_SHEET_SNAP_STATES.HALF,
        payload: null,
      });
    },
    [setFeaturedHospital, setSheetView, usesSidebarLayout],
  );

  const closeHospitalDetail = useCallback(() => {
    setSheetView({
      phase: MAP_SHEET_PHASES.EXPLORE_INTENT,
      snapState: defaultExploreSnapState,
      payload: null,
    });
  }, [defaultExploreSnapState, setSheetView]);

  const closeAmbulanceDecision = useCallback(() => {
    clearCommitFlow();
    setSheetView({
      phase: MAP_SHEET_PHASES.EXPLORE_INTENT,
      snapState: defaultExploreSnapState,
      payload: null,
    });
  }, [clearCommitFlow, defaultExploreSnapState, setSheetView]);

  const closeBedDecision = useCallback(() => {
    clearCommitFlow();
    setSheetView({
      phase: MAP_SHEET_PHASES.EXPLORE_INTENT,
      snapState: defaultExploreSnapState,
      payload: null,
    });
  }, [clearCommitFlow, defaultExploreSnapState, setSheetView]);

  const closeCommitDetails = useCallback(() => {
    suppressCommitRestoreRef.current = true;
    clearCommitFlow();
    const sourcePhase =
      sheetPayload?.sourcePhase || MAP_SHEET_PHASES.AMBULANCE_DECISION;
    const sourceSnapState =
      sheetPayload?.sourceSnapState || defaultExploreSnapState;
    const sourceHospital = sheetPayload?.hospital || featuredHospital || null;
    if (sourceHospital) {
      setFeaturedHospital(sourceHospital);
    }
    setSheetView({
      phase: sourcePhase,
      snapState: sourceSnapState,
      payload: sheetPayload?.sourcePayload || null,
    });
  }, [
    clearCommitFlow,
    defaultExploreSnapState,
    featuredHospital,
    setFeaturedHospital,
    setSheetView,
    sheetPayload,
  ]);

  const closeCommitTriage = useCallback(() => {
    suppressCommitRestoreRef.current = true;
    clearCommitFlow();
    const sourcePhase =
      sheetPayload?.sourcePhase || MAP_SHEET_PHASES.COMMIT_DETAILS;
    const sourceSnapState =
      sheetPayload?.sourceSnapState || MAP_SHEET_SNAP_STATES.EXPANDED;
    const sourceHospital = sheetPayload?.hospital || featuredHospital || null;
    if (sourceHospital) {
      setFeaturedHospital(sourceHospital);
    }
    setSheetView({
      phase: sourcePhase,
      snapState: sourceSnapState,
      payload: sheetPayload?.sourcePayload || null,
    });
  }, [
    clearCommitFlow,
    featuredHospital,
    setFeaturedHospital,
    setSheetView,
    sheetPayload,
  ]);

  const closeCommitPayment = useCallback(() => {
    suppressCommitRestoreRef.current = true;
    clearCommitFlow();
    // Use the phase that opened payment so the back button restores the correct
    // prior phase (BED_DECISION for bed/both flows, COMMIT_DETAILS for ambulance).
    const sourcePhase =
      sheetPayload?.sourcePhase || MAP_SHEET_PHASES.AMBULANCE_DECISION;
    const sourceSnapState =
      sheetPayload?.sourceSnapState || defaultExploreSnapState;
    const sourceHospital = sheetPayload?.hospital || featuredHospital || null;
    if (sourceHospital) {
      setFeaturedHospital(sourceHospital);
    }
    setSheetView({
      phase: sourcePhase,
      snapState: sourceSnapState,
      payload: sheetPayload?.sourcePayload || null,
    });
  }, [
    clearCommitFlow,
    defaultExploreSnapState,
    featuredHospital,
    setFeaturedHospital,
    setSheetView,
    sheetPayload,
  ]);

  const closeTracking = useCallback(() => {
    trackingDismissedRef.current = true;
    setSheetView({
      phase: MAP_SHEET_PHASES.EXPLORE_INTENT,
      snapState: defaultExploreSnapState,
      payload: null,
    });
  }, [defaultExploreSnapState, setSheetView]);

  const trackingHeaderVisible = trackingVisible && Boolean(trackingRequestKey);
  const trackingHeaderHospital =
    sheetPayload?.hospital ||
    discoveredHospitals.find(
      (item) =>
        item?.id ===
        (activeAmbulanceTrip?.hospitalId ||
          activeBedBooking?.hospitalId ||
          pendingApproval?.hospitalId ||
          null),
    ) ||
    featuredHospital ||
    nearestHospital ||
    null;
  const trackingHeaderHospitalName =
    trackingHeaderHospital?.name ||
    activeAmbulanceTrip?.hospitalName ||
    activeBedBooking?.hospitalName ||
    pendingApproval?.hospitalName ||
    "Hospital";
  const trackingHeaderPickupLabel =
    currentLocationDetails?.primaryText || "Pickup";
  const trackingHeaderPickupDetail =
    currentLocationDetails?.secondaryText || "";
  const trackingHeaderServiceLabel = activeAmbulanceTrip?.requestId
    ? activeAmbulanceTrip?.ambulanceType || "Transport"
    : activeBedBooking?.requestId
      ? activeBedBooking?.bedType || "Admission"
      : pendingApproval?.serviceType === "bed"
        ? pendingApproval?.bedType || "Admission"
        : pendingApproval?.ambulanceType || "Transport";
  const trackingHeaderStatusLabel = useMemo(() => {
    if (activeAmbulanceTrip?.requestId) {
      const telemetryState = ambulanceTelemetryHealth?.state ?? "inactive";
      if (telemetryState === "lost") return "Tracking lost";
      if (telemetryState === "stale") return "Tracking delayed";
      return (
        formatHeaderEtaLabel(
          activeAmbulanceTrip?.etaSeconds,
          activeAmbulanceTrip?.startedAt,
          trackingHeaderNowMs,
        ) || "Live"
      );
    }

    if (activeBedBooking?.requestId) {
      return (
        formatHeaderEtaLabel(
          activeBedBooking?.etaSeconds,
          activeBedBooking?.startedAt,
          trackingHeaderNowMs,
        ) || "Active"
      );
    }

    if (pendingApproval?.requestId) {
      return "Pending";
    }

    return "";
  }, [
    activeAmbulanceTrip?.etaSeconds,
    activeAmbulanceTrip?.requestId,
    activeAmbulanceTrip?.startedAt,
    activeBedBooking?.etaSeconds,
    activeBedBooking?.requestId,
    activeBedBooking?.startedAt,
    ambulanceTelemetryHealth?.state,
    pendingApproval?.requestId,
    trackingHeaderNowMs,
  ]);
  const trackingHeaderActionSurface = isDarkMode
    ? "rgba(255,255,255,0.08)"
    : "rgba(255,255,255,0.76)";
  const trackingHeaderActionColor = isDarkMode ? "#F8FAFC" : "#0F172A";
  const handleTrackingHeaderToggle = useCallback(() => {
    if (usesSidebarLayout || !trackingVisible) return;
    const nextSnapState =
      sheetSnapState === MAP_SHEET_SNAP_STATES.EXPANDED
        ? MAP_SHEET_SNAP_STATES.HALF
        : MAP_SHEET_SNAP_STATES.EXPANDED;
    setSheetSnapState(nextSnapState);
  }, [setSheetSnapState, sheetSnapState, trackingVisible, usesSidebarLayout]);
  const trackingHeaderLeftComponent = useMemo(() => {
    if (usesSidebarLayout || !trackingHeaderVisible) return null;
    return (
      <MapHeaderIconButton
        accessibilityLabel={
          sheetSnapState === MAP_SHEET_SNAP_STATES.EXPANDED
            ? "Collapse tracking sheet"
            : "Expand tracking sheet"
        }
        backgroundColor={trackingHeaderActionSurface}
        color={trackingHeaderActionColor}
        iconName={
          sheetSnapState === MAP_SHEET_SNAP_STATES.EXPANDED
            ? "chevron-down"
            : "chevron-up"
        }
        onPress={handleTrackingHeaderToggle}
        pressableStyle={{ marginRight: 6 }}
        style={{
          width: 38,
          height: 38,
          alignItems: "center",
          justifyContent: "center",
        }}
      />
    );
  }, [
    handleTrackingHeaderToggle,
    sheetSnapState,
    trackingHeaderActionColor,
    trackingHeaderActionSurface,
    trackingHeaderVisible,
    usesSidebarLayout,
  ]);
  const trackingHeaderRightComponent = useMemo(() => {
    if (!trackingHeaderVisible) return null;
    return (
      <MapHeaderIconButton
        accessibilityLabel="Close tracking"
        backgroundColor={trackingHeaderActionSurface}
        color={trackingHeaderActionColor}
        iconName="close"
        onPress={closeTracking}
        style={{
          width: 38,
          height: 38,
          alignItems: "center",
          justifyContent: "center",
        }}
      />
    );
  }, [
    closeTracking,
    trackingHeaderActionColor,
    trackingHeaderActionSurface,
    trackingHeaderVisible,
  ]);
  const trackingHeaderSession = useMemo(() => {
    if (!trackingHeaderVisible) return null;

    if (activeAmbulanceTrip?.requestId) {
      const status = String(activeAmbulanceTrip?.status ?? "").toLowerCase();
      const telemetryState = ambulanceTelemetryHealth?.state ?? "inactive";
      const telemetryLabel =
        telemetryState === "lost"
          ? "Tracking lost"
          : telemetryState === "stale"
            ? "Tracking delayed"
            : "Live tracking";

      return {
        eyebrow: trackingHeaderServiceLabel,
        title: status === "arrived" ? "Help has arrived" : "Help is on the way",
        subtitle: trackingHeaderHospitalName,
        statusLabel: trackingHeaderStatusLabel,
        statusTone: status === "arrived" ? "success" : "tracking",
        expanded: trackingHeaderExpanded,
        expandable: true,
        onToggleExpand: () => setTrackingHeaderExpanded((current) => !current),
        details: [
          { label: "Pickup", value: trackingHeaderPickupLabel },
          {
            label: "Hospital",
            value:
              trackingHeaderHospitalName +
              (formatHospitalDistanceLabel(trackingHeaderHospital)
                ? ` · ${formatHospitalDistanceLabel(trackingHeaderHospital)}`
                : ""),
          },
          {
            label: "Request",
            value:
              activeAmbulanceTrip?.requestId ||
              pendingApproval?.displayId ||
              "Active",
          },
          {
            label: "Tracking",
            value: trackingHeaderPickupDetail
              ? `${telemetryLabel} · ${trackingHeaderPickupDetail}`
              : telemetryLabel,
          },
        ],
      };
    }

    if (activeBedBooking?.requestId) {
      const status = String(activeBedBooking?.status ?? "").toLowerCase();
      return {
        eyebrow: trackingHeaderServiceLabel,
        title:
          status === "arrived" ? "Bed is ready" : "Admission is active",
        subtitle: trackingHeaderHospitalName,
        statusLabel: trackingHeaderStatusLabel,
        statusTone: status === "arrived" ? "success" : "tracking",
        expanded: trackingHeaderExpanded,
        expandable: true,
        onToggleExpand: () => setTrackingHeaderExpanded((current) => !current),
        details: [
          { label: "Pickup", value: trackingHeaderPickupLabel },
          {
            label: "Hospital",
            value:
              trackingHeaderHospitalName +
              (formatHospitalDistanceLabel(trackingHeaderHospital)
                ? ` · ${formatHospitalDistanceLabel(trackingHeaderHospital)}`
                : ""),
          },
          {
            label: "Request",
            value:
              activeBedBooking?.requestId ||
              pendingApproval?.displayId ||
              "Active",
          },
          { label: "Status", value: status === "arrived" ? "Ready" : "Reserved" },
        ],
      };
    }

    return {
      eyebrow: trackingHeaderServiceLabel,
      title: "Awaiting approval",
      subtitle: trackingHeaderHospitalName,
      statusLabel: trackingHeaderStatusLabel,
      statusTone: "default",
      expanded: trackingHeaderExpanded,
      expandable: true,
      onToggleExpand: () => setTrackingHeaderExpanded((current) => !current),
      details: [
        { label: "Pickup", value: trackingHeaderPickupLabel },
        {
          label: "Hospital",
          value:
            trackingHeaderHospitalName +
            (formatHospitalDistanceLabel(trackingHeaderHospital)
              ? ` · ${formatHospitalDistanceLabel(trackingHeaderHospital)}`
              : ""),
        },
        {
          label: "Request",
          value:
            pendingApproval?.displayId ||
            pendingApproval?.requestId ||
            "Pending",
        },
        {
          label: "Payment",
          value:
            pendingApproval?.paymentMethod === "cash"
              ? "Provider confirmation"
              : "Processing",
        },
      ],
    };
  }, [
    activeAmbulanceTrip?.requestId,
    activeAmbulanceTrip?.status,
    activeBedBooking?.requestId,
    activeBedBooking?.status,
    ambulanceTelemetryHealth?.state,
    pendingApproval?.displayId,
    pendingApproval?.paymentMethod,
    pendingApproval?.requestId,
    trackingHeaderExpanded,
    trackingHeaderHospital,
    trackingHeaderHospitalName,
    trackingHeaderPickupDetail,
    trackingHeaderPickupLabel,
    trackingHeaderServiceLabel,
    trackingHeaderStatusLabel,
    trackingHeaderVisible,
  ]);
  const trackingHeaderOcclusionHeight = trackingHeaderVisible
    ? trackingHeaderExpanded
      ? TRACKING_HEADER_EXPANDED_HEIGHT
      : TRACKING_HEADER_COLLAPSED_HEIGHT
    : 0;

  useEffect(() => {
    if (!trackingHeaderVisible || !trackingHeaderSession) {
      lockHeaderHidden();
      setHeaderState({
        mode: HEADER_MODES.HIDDEN,
        hidden: true,
        scrollAware: false,
      });
      return;
    }

    unlockHeaderHidden();
    forceHeaderVisible();
    setHeaderState({
      mode: HEADER_MODES.ACTIVE_SESSION,
      hidden: false,
      scrollAware: false,
      backgroundColor: COLORS.brandPrimary,
      leftComponent: trackingHeaderLeftComponent,
      rightComponent: trackingHeaderRightComponent,
      session: trackingHeaderSession,
    });
  }, [
    forceHeaderVisible,
    lockHeaderHidden,
    setHeaderState,
    trackingHeaderLeftComponent,
    trackingHeaderRightComponent,
    trackingHeaderSession,
    trackingHeaderVisible,
    unlockHeaderHidden,
  ]);

  const finishCommitPayment = useCallback(() => {
    suppressCommitRestoreRef.current = true;
    clearCommitFlow();
    if (trackingRequestKey) {
      openTracking();
      return;
    }
    setSheetView({
      phase: MAP_SHEET_PHASES.EXPLORE_INTENT,
      snapState: defaultExploreSnapState,
      payload: null,
    });
  }, [
    clearCommitFlow,
    defaultExploreSnapState,
    openTracking,
    setSheetView,
    trackingRequestKey,
  ]);

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
      setSheetView({
        phase: MAP_SHEET_PHASES.SERVICE_DETAIL,
        snapState: MAP_SHEET_SNAP_STATES.EXPANDED,
        payload: {
          hospital,
          service,
          serviceType,
          serviceItems: Array.isArray(serviceItems) ? serviceItems : [],
          sourcePhase,
          sourceSnapState,
          sourcePayload,
        },
      });
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
    setSheetView({
      phase: sourcePhase,
      snapState: sourceSnapState,
      payload: sheetPayload?.sourcePayload || null,
    });
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

  const handleSearchLocation = useCallback(
    (nextLocation) => {
      if (!nextLocation?.location) return;
      const locationChanged = hasMeaningfulLocationChange(
        activeLocation,
        nextLocation.location,
      );
      if (locationChanged) {
        setHasCompletedInitialMapLoad(false);
      }
      setManualLocation(nextLocation);
      setSheetPhase(MAP_SHEET_PHASES.EXPLORE_INTENT);
      if (locationChanged) {
        setMapReadiness({
          mapReady: false,
          routeReady: false,
          isCalculatingRoute: false,
        });
      }
    },
    [
      activeLocation,
      setHasCompletedInitialMapLoad,
      setManualLocation,
      setMapReadiness,
      setSheetPhase,
    ],
  );

  const handleUseCurrentLocation = useCallback(async () => {
    const fallbackCurrentLocation =
      globalUserLocation || emergencyUserLocation || null;
    const locationChanged = manualLocation?.location
      ? hasMeaningfulLocationChange(
          manualLocation.location,
          fallbackCurrentLocation,
        )
      : false;

    if (locationChanged) {
      setHasCompletedInitialMapLoad(false);
    }
    setManualLocation(null);
    setSheetPhase(MAP_SHEET_PHASES.EXPLORE_INTENT);
    if (locationChanged) {
      setMapReadiness({
        mapReady: false,
        routeReady: false,
        isCalculatingRoute: false,
      });
    }
    await refreshLocation?.();
  }, [
    emergencyUserLocation,
    globalUserLocation,
    manualLocation?.location,
    refreshLocation,
    setHasCompletedInitialMapLoad,
    setManualLocation,
    setMapReadiness,
    setSheetPhase,
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

  const handleChooseCare = useCallback(
    (mode) => {
      setSelectedCare(mode);
      if (mode === "ambulance") {
        openAmbulanceDecision();
        return;
      }
      if (mode === "bed") {
        openBedDecision(null, "bed");
        return;
      }
      if (mode === "both") {
        openAmbulanceDecision();
      }
    },
    [openAmbulanceDecision, openBedDecision, setSelectedCare],
  );

  const handleOpenFeaturedHospital = useCallback(
    (hospital) => {
      if (hospital?.id) {
        selectHospital(hospital.id);
      }
      openHospitalDetail(hospital || null);
    },
    [openHospitalDetail, selectHospital],
  );

  const handleCycleFeaturedHospital = useCallback(() => {
    const pool = Array.isArray(discoveredHospitals)
      ? discoveredHospitals.filter((entry) => entry?.id)
      : [];
    if (pool.length < 2) return;

    const currentId =
      featuredHospital?.id ??
      selectedHospital?.id ??
      nearestHospital?.id ??
      pool[0]?.id ??
      null;
    const currentIndex = pool.findIndex((entry) => entry?.id === currentId);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % pool.length : 0;
    const nextHospital = pool[nextIndex] ?? null;
    if (!nextHospital?.id) return;

    selectHospital(nextHospital.id);
    setFeaturedHospital(nextHospital);
  }, [
    discoveredHospitals,
    featuredHospital?.id,
    nearestHospital?.id,
    selectedHospital?.id,
    selectHospital,
    setFeaturedHospital,
  ]);

  const handleMapHospitalPress = useCallback(
    (hospital) => {
      if (hospital?.id) {
        selectHospital(hospital.id);
      }
    },
    [selectHospital],
  );

  const handleOpenProfile = useCallback(() => {
    if (isSignedIn) {
      setProfileModalVisible(true);
      return;
    }
    setGuestProfileVisible(true);
  }, [isSignedIn, setGuestProfileVisible, setProfileModalVisible]);

  const handleMapReadinessChange = useCallback(
    (nextState) => {
      const next = {
        mapReady: Boolean(nextState?.mapReady),
        routeReady: Boolean(nextState?.routeReady),
        isCalculatingRoute: Boolean(nextState?.isCalculatingRoute),
      };
      if (
        mapReadiness.mapReady === next.mapReady &&
        mapReadiness.routeReady === next.routeReady &&
        mapReadiness.isCalculatingRoute === next.isCalculatingRoute
      ) {
        return;
      }
      setMapReadiness(next);
    },
    [mapReadiness, setMapReadiness],
  );

  useMapExploreGuestProfileFab({
    guestProfileVisible,
    onContinue: useCallback(() => {
      setGuestProfileVisible(false);
      setAuthModalVisible(true);
    }, [setAuthModalVisible, setGuestProfileVisible]),
  });

  const hasActiveLocation = Boolean(
    activeLocation?.latitude && activeLocation?.longitude,
  );
  const hasResolvedProviders =
    Array.isArray(discoveredHospitals) && discoveredHospitals.length > 0;
  const expectsRoute = Boolean(
    activeLocation?.latitude &&
    activeLocation?.longitude &&
    nearestHospital?.id,
  );
  const isMapFrameReady = hasActiveLocation && mapReadiness.mapReady;
  const isBackgroundCoverageLoading =
    needsCoverageExpansion && (isLoadingHospitals || isBootstrappingDemo);
  const isBackgroundRouteLoading =
    expectsRoute &&
    (mapReadiness.isCalculatingRoute || !mapReadiness.routeReady);
  const isMapSurfaceReady = isMapFrameReady;

  useEffect(() => {
    if (isMapFrameReady && !hasCompletedInitialMapLoad) {
      setHasCompletedInitialMapLoad(true);
    }
  }, [
    hasCompletedInitialMapLoad,
    isMapFrameReady,
    setHasCompletedInitialMapLoad,
  ]);

  const shouldShowMapLoadingOverlay = !hasCompletedInitialMapLoad;
  const mapLoadingState = useMemo(() => {
    return buildMapLoadingState({
      coverageModePreferenceLoaded,
      expectsRoute,
      hasActiveLocation,
      hasResolvedProviders,
      isBackgroundCoverageLoading,
      isBackgroundRouteLoading,
      isBootstrappingDemo,
      isLoadingHospitals,
      isLoadingLocation,
      isResolvingPlaceName,
      mapReadiness,
      shouldShowMapLoadingOverlay,
    });
  }, [
    coverageModePreferenceLoaded,
    hasActiveLocation,
    hasCompletedInitialMapLoad,
    hasResolvedProviders,
    isBackgroundCoverageLoading,
    isBackgroundRouteLoading,
    isBootstrappingDemo,
    isLoadingHospitals,
    isLoadingLocation,
    isResolvingPlaceName,
    mapReadiness,
    expectsRoute,
    shouldShowMapLoadingOverlay,
  ]);

  return {
    activeLocation,
    authModalVisible,
    careHistoryVisible,
    currentLocationDetails,
    discoveredHospitals,
    guestProfileEmail,
    guestProfileVisible,
    handleChooseCare,
    featuredHospital,
    handleMapHospitalPress,
    handleMapReadinessChange,
    handleOpenFeaturedHospital,
    handleCycleFeaturedHospital,
    handleOpenProfile,
    openHospitalDetail,
    openHospitalList,
    openAmbulanceDecision,
    openAmbulanceHospitalList,
    openBedDecision,
    openCommitDetails,
    openCommitTriage,
    openCommitPayment,
    openBedHospitalList,
    openServiceDetail,
    openSearchSheet,
    closeAmbulanceDecision,
    closeBedDecision,
    closeCommitDetails,
    closeCommitTriage,
    closeCommitPayment,
    closeTracking,
    finishCommitPayment,
    closeHospitalDetail,
    closeHospitalList,
    closeServiceDetail,
    confirmServiceDetail,
    changeServiceDetailService,
    closeSearchSheet,
    clearCommitFlow,
    handleSearchLocation,
    handleSelectHospital,
    handleUseCurrentLocation,
    ambulanceDecisionVisible,
    bedDecisionVisible,
    commitTriageVisible,
    commitPaymentVisible,
    trackingVisible,
    hospitalDetailVisible,
    hospitalListVisible,
    serviceDetailVisible,
    isBootstrappingDemo,
    isLoadingHospitals,
    isMapFrameReady,
    isMapSurfaceReady,
    isSignedIn,
    loadingBackgroundImageUri,
    manualLocation,
    mapLoadingState,
    mapReadiness,
    nearestHospital,
    nearestHospitalMeta,
    nearbyBedHospitals,
    nearbyHospitalCount,
    profileImageSource,
    profileModalVisible,
    recentVisits,
    recentVisitsVisible,
    searchSheetMode,
    searchSheetVisible,
    selectedCare,
    sheetPhase,
    setAuthModalVisible,
    setCareHistoryVisible,
    setGuestProfileEmail,
    setGuestProfileVisible,
    setProfileModalVisible,
    setRecentVisitsVisible,
    setSheetMode,
    setSheetPayload,
    setSheetSnapState,
    sheetMode,
    sheetPayload,
    sheetSnapState,
    serviceSelectionsByHospital,
    setHospitalServiceSelection,
    featuredHospitals,
    totalAvailableBeds,
    activeAmbulanceTrip,
    ambulanceTelemetryHealth,
    activeBedBooking,
    pendingApproval,
    trackingHeaderOcclusionHeight,
  };
}

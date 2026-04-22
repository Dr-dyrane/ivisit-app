import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
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
  buildActiveMapRequestModel,
} from "../../../components/map/core/mapActiveRequestModel";
import { buildMapActiveSessionHeaderSession } from "../../../components/map/core/mapActiveSessionPresentation";
import {
  buildAmbulanceDecisionSourcePayload,
  buildBedDecisionSourcePayload,
} from "../../../components/map/core/mapSheetFlowPayloads";
import { buildMapOverlayHeaderLayoutInsets } from "../../../components/map/core/mapOverlayHeaderLayout";
import {
  getMapViewportSurfaceConfig,
  getMapViewportVariant,
  isSidebarMapVariant,
} from "../../../components/map/core/mapViewportConfig";
import { MAP_SEARCH_SHEET_MODES } from "../../../components/map/surfaces/search/mapSearchSheet.helpers";
import { HEADER_MODES } from "../../../constants/header";
import { COLORS } from "../../../constants/colors";
import { hasMeaningfulLocationChange } from "./mapExploreFlow.helpers";
import {
  buildAmbulanceDecisionSheetView,
  buildBedDecisionSheetView,
  buildCommitDetailsTransition,
  buildCommitPaymentTransition,
  buildCommitRestoreSheetView,
  buildCommitTriageTransition,
  buildExploreIntentSheetView,
  buildHospitalDetailSheetView,
  buildHospitalListSheetView,
  buildSearchSheetView,
  buildServiceDetailSheetView,
  buildSourceReturnSheetView,
  buildTrackingOrExploreReturnSheetView,
  buildTrackingSheetView,
  resolveMapFlowHospital,
} from "./mapExploreFlow.transitions";
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
import {
  selectMapExploreHasCompletedInitialMapLoad,
  selectMapExploreLocationState,
  selectMapExploreMapReadiness,
  selectMapExplorePhaseVisibility,
  selectMapExploreSearchMode,
  selectMapExploreSelectionState,
  selectMapExploreSheetPayload,
  selectMapExploreSheetPhase,
  selectMapExploreSheetSnapState,
  selectMapExploreSurfaceState,
  selectMapExploreTrackingHeaderActionRequest,
} from "../state/mapExploreFlow.selectors";
import {
  MAP_EXPLORE_RUNTIME_SCOPES,
  MAP_EXPLORE_TRACKING_RUNTIME_KEYS,
} from "../state/mapExploreFlow.runtime";
import MapHeaderIconButton from "../../../components/map/views/shared/MapHeaderIconButton";

const TRACKING_HEADER_COLLAPSED_HEIGHT = 124;

function TrackHeaderIcon({
  onPress,
  backgroundColor = "rgba(255,255,255,0.82)",
  color = "#0F172A",
  pulseColor = COLORS.brandPrimary,
}) {
  const pulseProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseProgress, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulseProgress, {
          toValue: 0,
          duration: 260,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseProgress]);

  const pulseScale = pulseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.42],
  });
  const pulseOpacity = pulseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 0.34],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Return to tracking"
      onPress={onPress}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor,
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.94 : 1 }],
        shadowColor: "#000000",
        shadowOpacity: 0.14,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 7 },
        elevation: 8,
        ...Platform.select({
          web: {
            boxShadow: "0px 10px 18px rgba(15,23,42,0.18)",
          },
          default: {},
        }),
      })}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons name="route" size={21} color={color} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 3,
          right: 3,
          width: 8,
          height: 8,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Animated.View
          style={{
            position: "absolute",
            width: 8,
            height: 8,
            borderRadius: 999,
            backgroundColor: pulseColor,
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          }}
        />
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            backgroundColor: pulseColor,
          }}
        />
      </View>
    </Pressable>
  );
}

export function useMapExploreFlow() {
  const suppressCommitRestoreRef = useRef(false);
  const trackingDismissedRef = useRef(false);
  const lastTrackingRequestKeyRef = useRef(null);
  const [trackingHeaderNowMs, setTrackingHeaderNowMs] = useState(Date.now());
  const { isDarkMode } = useTheme();
  const { width, height } = useWindowDimensions();
  const viewportVariant = useMemo(
    () => getMapViewportVariant({ platform: Platform.OS, width }),
    [width],
  );
  const surfaceConfig = useMemo(
    () => getMapViewportSurfaceConfig(viewportVariant),
    [viewportVariant],
  );
  const usesSidebarLayout = useMemo(
    () => isSidebarMapVariant(viewportVariant),
    [viewportVariant],
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
    patchActiveAmbulanceTrip,
  } = useEmergency();

  const { state: flowState, actions: flowActions } = useMapExploreFlowStore({
    usesSidebarLayout,
  });
  const {
    searchSheetVisible,
    hospitalListVisible,
    hospitalDetailVisible,
    ambulanceDecisionVisible,
    bedDecisionVisible,
    commitTriageVisible,
    commitPaymentVisible,
    trackingVisible,
    serviceDetailVisible,
  } = selectMapExplorePhaseVisibility(flowState);
  const searchSheetMode = selectMapExploreSearchMode(flowState);
  const {
    profileModalVisible,
    guestProfileVisible,
    careHistoryVisible,
    recentVisitsVisible,
    authModalVisible,
  } = selectMapExploreSurfaceState(flowState);
  const {
    selectedCare,
    featuredHospital,
    serviceSelectionsByHospital,
  } = selectMapExploreSelectionState(flowState);
  const { manualLocation, guestProfileEmail } =
    selectMapExploreLocationState(flowState);
  const sheetPhase = selectMapExploreSheetPhase(flowState);
  const sheetMode = sheetPhase;
  const sheetSnapState = selectMapExploreSheetSnapState(flowState);
  const sheetPayload = selectMapExploreSheetPayload(flowState);
  const mapReadiness = selectMapExploreMapReadiness(flowState);
  const hasCompletedInitialMapLoad =
    selectMapExploreHasCompletedInitialMapLoad(flowState);
  const trackingHeaderActionRequest =
    selectMapExploreTrackingHeaderActionRequest(flowState);
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
    setRuntimeSlice,
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
        layoutInsets: null,
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

  const promoteHospitalSelection = useCallback(
    (hospital) => {
      if (!hospital?.id) return hospital || null;
      selectHospital(hospital.id);
      setFeaturedHospital(hospital);
      return hospital;
    },
    [selectHospital, setFeaturedHospital],
  );

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

    const targetHospital = promoteHospitalSelection(
      resolveMapFlowHospital({
        preferredHospital: commitFlow?.hospital,
        preferredHospitalId: commitFlow?.hospitalId,
        hospitals: discoveredHospitals,
        fallbacks: [selectedHospital, featuredHospital, nearestHospital],
      }),
    );

    setSheetView(
      buildCommitRestoreSheetView({
        commitFlow,
        hospital: targetHospital,
        defaultExploreSnapState,
      }),
    );
  }, [
    commitFlow,
    defaultExploreSnapState,
    discoveredHospitals,
    featuredHospital,
    nearestHospital,
    promoteHospitalSelection,
    selectedHospital,
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
  const activeMapRequest = useMemo(
    () =>
      buildActiveMapRequestModel({
        activeAmbulanceTrip,
        activeBedBooking,
        pendingApproval,
        ambulanceTelemetryHealth,
        hospitals: discoveredHospitals,
        allHospitals,
        payload: sheetPayload,
        preferredHospital: sheetPayload?.hospital || null,
        fallbackHospital: featuredHospital,
        nearestHospital,
        currentLocationDetails,
        nowMs: trackingHeaderNowMs,
      }),
    [
      activeAmbulanceTrip,
      activeBedBooking,
      allHospitals,
      ambulanceTelemetryHealth,
      currentLocationDetails,
      discoveredHospitals,
      featuredHospital,
      nearestHospital,
      pendingApproval,
      sheetPayload,
      trackingHeaderNowMs,
    ],
  );
  const trackingRequestKey = activeMapRequest.requestId;

  useEffect(() => {
    if (lastTrackingRequestKeyRef.current !== trackingRequestKey) {
      trackingDismissedRef.current = false;
      lastTrackingRequestKeyRef.current = trackingRequestKey;
    }
  }, [trackingRequestKey]);

  useEffect(() => {
    if (!trackingVisible || !trackingRequestKey) {
      return undefined;
    }

    setTrackingHeaderNowMs(Date.now());
    const intervalId = setInterval(() => {
      setTrackingHeaderNowMs(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [trackingRequestKey, trackingVisible]);

  const openTracking = useCallback(() => {
    const trackedHospital = promoteHospitalSelection(
      resolveMapFlowHospital({
        preferredHospital: activeMapRequest.hospital || sheetPayload?.hospital,
        preferredHospitalId:
          activeMapRequest.hospitalId ||
          sheetPayload?.hospital?.id ||
          featuredHospital?.id ||
          nearestHospital?.id ||
          null,
        hospitals: discoveredHospitals,
        fallbacks: [featuredHospital, nearestHospital],
      }),
    );

    setSheetView(
      buildTrackingSheetView({
        hospital: trackedHospital,
        usesSidebarLayout,
      }),
    );
  }, [
    activeMapRequest.hospital,
    activeMapRequest.hospitalId,
    discoveredHospitals,
    featuredHospital,
    nearestHospital,
    promoteHospitalSelection,
    setSheetView,
    sheetPayload?.hospital,
    usesSidebarLayout,
  ]);

  useEffect(() => {
    if (!trackingRequestKey) {
      if (sheetPhase === MAP_SHEET_PHASES.TRACKING) {
        setSheetView(buildExploreIntentSheetView(defaultExploreSnapState));
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
      setSheetView(buildSearchSheetView());
    },
    [setSearchSheetMode, setSheetView],
  );

  const closeSearchSheet = useCallback(() => {
    setSheetView(buildExploreIntentSheetView(defaultExploreSnapState));
  }, [defaultExploreSnapState, setSheetView]);

  const openHospitalList = useCallback(() => {
    setSheetView(buildHospitalListSheetView());
  }, [setSheetView]);

  const openAmbulanceDecision = useCallback(
    (nextHospital = null, payload = null) => {
      promoteHospitalSelection(
        resolveMapFlowHospital({
          preferredHospital: nextHospital,
          hospitals: discoveredHospitals,
          fallbacks: [selectedHospital, featuredHospital, nearestHospital],
        }),
      );

      setSheetView(
        buildAmbulanceDecisionSheetView({
          defaultSnapState: defaultExploreSnapState,
          payload,
        }),
      );
    },
    [
      defaultExploreSnapState,
      discoveredHospitals,
      featuredHospital,
      nearestHospital,
      promoteHospitalSelection,
      selectedHospital,
      setSheetView,
    ],
  );

  const openAmbulanceHospitalList = useCallback(() => {
    setSheetView(
      buildHospitalListSheetView({
        sourcePhase: MAP_SHEET_PHASES.AMBULANCE_DECISION,
        sourceSnapState: sheetSnapState || defaultExploreSnapState,
        sourcePayload: buildAmbulanceDecisionSourcePayload({
          payload: sheetPayload,
        }),
      }),
    );
  }, [
    defaultExploreSnapState,
    setSheetView,
    sheetPayload,
    sheetSnapState,
  ]);

  const openBedDecision = useCallback(
    (nextHospital = null, careIntent = "bed", payload = null) => {
      promoteHospitalSelection(
        resolveMapFlowHospital({
          preferredHospital: nextHospital,
          hospitals: discoveredHospitals,
          fallbacks: [selectedHospital, featuredHospital, nearestHospital],
        }),
      );

      setSheetView(
        buildBedDecisionSheetView({
          defaultSnapState: defaultExploreSnapState,
          careIntent,
          payload,
        }),
      );
    },
    [
      defaultExploreSnapState,
      discoveredHospitals,
      featuredHospital,
      nearestHospital,
      promoteHospitalSelection,
      selectedHospital,
      setSheetView,
    ],
  );

  const openCommitDetails = useCallback(
    (nextHospital = null, transport = null, payload = null) => {
      suppressCommitRestoreRef.current = false;
      const targetHospital = promoteHospitalSelection(
        resolveMapFlowHospital({
          preferredHospital: nextHospital,
          hospitals: discoveredHospitals,
          fallbacks: [selectedHospital, featuredHospital, nearestHospital],
        }),
      );

      const transition = buildCommitDetailsTransition({
        hospital: targetHospital,
        transport,
        payload,
        defaultExploreSnapState,
        currentSnapState: sheetSnapState,
      });
      setSheetView(transition.sheetView);
      setCommitFlow(transition.commitFlow);
    },
    [
      defaultExploreSnapState,
      discoveredHospitals,
      featuredHospital,
      nearestHospital,
      promoteHospitalSelection,
      selectedHospital,
      setSheetView,
      sheetSnapState,
      setCommitFlow,
    ],
  );

  const openCommitTriage = useCallback(
    (nextHospital = null, transport = null, payload = null) => {
      suppressCommitRestoreRef.current = false;
      const targetHospital = promoteHospitalSelection(
        resolveMapFlowHospital({
          preferredHospital: nextHospital,
          hospitals: discoveredHospitals,
          fallbacks: [selectedHospital, featuredHospital, nearestHospital],
        }),
      );

      const transition = buildCommitTriageTransition({
        hospital: targetHospital,
        transport,
        payload,
        defaultExploreSnapState,
        currentSnapState: sheetSnapState,
      });
      setSheetView(transition.sheetView);
      setCommitFlow(transition.commitFlow);
    },
    [
      defaultExploreSnapState,
      discoveredHospitals,
      featuredHospital,
      nearestHospital,
      promoteHospitalSelection,
      selectedHospital,
      setCommitFlow,
      setSheetView,
      sheetSnapState,
    ],
  );

  const openCommitPayment = useCallback(
    (nextHospital = null, transport = null, payload = null) => {
      suppressCommitRestoreRef.current = false;
      const targetHospital = promoteHospitalSelection(
        resolveMapFlowHospital({
          preferredHospital: nextHospital,
          hospitals: discoveredHospitals,
          fallbacks: [selectedHospital, featuredHospital, nearestHospital],
        }),
      );

      const transition = buildCommitPaymentTransition({
        hospital: targetHospital,
        transport,
        payload,
        defaultExploreSnapState,
        currentSnapState: sheetSnapState,
        usesSidebarLayout,
      });
      setSheetView(transition.sheetView);
      setCommitFlow(transition.commitFlow);
    },
    [
      defaultExploreSnapState,
      discoveredHospitals,
      featuredHospital,
      nearestHospital,
      promoteHospitalSelection,
      selectedHospital,
      setCommitFlow,
      setSheetView,
      sheetSnapState,
      usesSidebarLayout,
    ],
  );

  const openBedHospitalList = useCallback(() => {
    setSheetView(
      buildHospitalListSheetView({
        sourcePhase: MAP_SHEET_PHASES.BED_DECISION,
        sourceSnapState: sheetSnapState || defaultExploreSnapState,
        sourcePayload: buildBedDecisionSourcePayload({
          careIntent: sheetPayload?.careIntent === "both" ? "both" : "bed",
          savedTransport:
            sheetPayload?.careIntent === "both"
              ? sheetPayload?.savedTransport || null
              : null,
          payload: sheetPayload,
        }),
      }),
    );
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
      setSheetView(
        buildSourceReturnSheetView({
          payload: sheetPayload,
          fallbackPhase: sheetPayload?.sourcePhase,
          fallbackSnapState: defaultExploreSnapState,
          fallbackPayload: null,
        }),
      );
      return;
    }

    setSheetView(buildExploreIntentSheetView(defaultExploreSnapState));
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
      setSheetView(buildHospitalDetailSheetView({ usesSidebarLayout }));
    },
    [setFeaturedHospital, setSheetView, usesSidebarLayout],
  );

  const closeHospitalDetail = useCallback(() => {
    setSheetView(buildExploreIntentSheetView(defaultExploreSnapState));
  }, [defaultExploreSnapState, setSheetView]);

  const closeAmbulanceDecision = useCallback(() => {
    clearCommitFlow();
    setSheetView(
      buildTrackingOrExploreReturnSheetView({
        payload: sheetPayload,
        defaultExploreSnapState,
      }),
    );
  }, [
    clearCommitFlow,
    defaultExploreSnapState,
    setSheetView,
    sheetPayload?.sourcePayload,
    sheetPayload?.sourcePhase,
    sheetPayload?.sourceSnapState,
  ]);

  const closeBedDecision = useCallback(() => {
    clearCommitFlow();
    setSheetView(
      buildTrackingOrExploreReturnSheetView({
        payload: sheetPayload,
        defaultExploreSnapState,
      }),
    );
  }, [
    clearCommitFlow,
    defaultExploreSnapState,
    setSheetView,
    sheetPayload?.sourcePayload,
    sheetPayload?.sourcePhase,
    sheetPayload?.sourceSnapState,
  ]);

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
    setSheetView(
      buildSourceReturnSheetView({
        payload: sheetPayload,
        fallbackPhase: sourcePhase,
        fallbackSnapState: sourceSnapState,
        fallbackPayload: null,
      }),
    );
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
    setSheetView(
      buildSourceReturnSheetView({
        payload: sheetPayload,
        fallbackPhase: sourcePhase,
        fallbackSnapState: sourceSnapState,
        fallbackPayload: null,
      }),
    );
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
    setSheetView(
      buildSourceReturnSheetView({
        payload: sheetPayload,
        fallbackPhase: sourcePhase,
        fallbackSnapState: sourceSnapState,
        fallbackPayload: null,
      }),
    );
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
    setSheetView(buildExploreIntentSheetView(defaultExploreSnapState));
  }, [defaultExploreSnapState, setSheetView]);

  const hasActiveMapModal =
    profileModalVisible ||
    guestProfileVisible ||
    careHistoryVisible ||
    recentVisitsVisible ||
    authModalVisible;
  const trackingHeaderOwnsCurrentPhase =
    sheetPhase === MAP_SHEET_PHASES.EXPLORE_INTENT ||
    sheetPhase === MAP_SHEET_PHASES.TRACKING;
  const trackingHeaderVisible =
    Boolean(trackingRequestKey) &&
    trackingHeaderOwnsCurrentPhase &&
    (usesSidebarLayout || sheetSnapState !== MAP_SHEET_SNAP_STATES.EXPANDED) &&
    !hasActiveMapModal;
  const trackingHeaderCanReopen =
    trackingHeaderVisible && sheetPhase === MAP_SHEET_PHASES.EXPLORE_INTENT;
  const trackingHeaderActionSurface = isDarkMode
    ? "rgba(255,255,255,0.08)"
    : "rgba(255,255,255,0.76)";
  const trackingHeaderActionColor = isDarkMode ? "#F8FAFC" : "#0F172A";
  const trackingHeaderRouteSurface = isDarkMode
    ? "rgba(134,16,14,0.24)"
    : "rgba(134,16,14,0.12)";
  const trackingHeaderLayoutInsets = useMemo(() => {
    return buildMapOverlayHeaderLayoutInsets({
      screenWidth: width,
      surfaceConfig,
      usesSidebarLayout,
      sidebarWidth,
    });
  }, [
    sidebarWidth,
    surfaceConfig,
    usesSidebarLayout,
    width,
  ]);
  const trackingHeaderSession = useMemo(() => {
    if (!trackingHeaderVisible) return null;

    return buildMapActiveSessionHeaderSession({
      activeMapRequest,
      ambulanceTelemetryHealth,
      pendingApproval,
    });
  }, [
    activeMapRequest,
    ambulanceTelemetryHealth,
    pendingApproval,
  ]);
  const handleTrackingHeaderOpen = useCallback(() => {
    trackingDismissedRef.current = false;
    openTracking();
  }, [openTracking]);
  const requestTrackingHeaderAction = useCallback((type) => {
    if (!type) return;
    trackingDismissedRef.current = false;
    setRuntimeSlice(
      MAP_EXPLORE_RUNTIME_SCOPES.TRACKING,
      MAP_EXPLORE_TRACKING_RUNTIME_KEYS.HEADER_ACTION_REQUEST,
      {
        type,
        requestedAt: Date.now(),
      },
    );
    openTracking();
  }, [openTracking, setRuntimeSlice]);
  const clearTrackingHeaderActionRequest = useCallback(() => {
    setRuntimeSlice(
      MAP_EXPLORE_RUNTIME_SCOPES.TRACKING,
      MAP_EXPLORE_TRACKING_RUNTIME_KEYS.HEADER_ACTION_REQUEST,
      null,
    );
  }, [setRuntimeSlice]);
  const trackingHeaderLeftComponent = useMemo(() => {
    if (!trackingHeaderVisible) return null;
    return (
      <MapHeaderIconButton
        accessibilityLabel="Update your information"
        backgroundColor={trackingHeaderActionSurface}
        borderRadius={999}
        color={trackingHeaderActionColor}
        iconName="medkit"
        onPress={() => requestTrackingHeaderAction("triage")}
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
    requestTrackingHeaderAction,
    trackingHeaderActionColor,
    trackingHeaderActionSurface,
    trackingHeaderVisible,
  ]);
  const trackingHeaderRightComponent = useMemo(() => {
    if (!trackingHeaderVisible) return null;
    if (trackingHeaderCanReopen) {
      return (
        <TrackHeaderIcon
          backgroundColor={trackingHeaderRouteSurface}
          color={COLORS.brandPrimary}
          pulseColor={COLORS.brandPrimary}
          onPress={handleTrackingHeaderOpen}
        />
      );
    }
    return (
      <MapHeaderIconButton
        accessibilityLabel="Return to map"
        backgroundColor={trackingHeaderActionSurface}
        borderRadius={999}
        color={trackingHeaderActionColor}
        iconName="map-outline"
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
    trackingHeaderCanReopen,
    trackingHeaderActionColor,
    trackingHeaderActionSurface,
    trackingHeaderRouteSurface,
    handleTrackingHeaderOpen,
    trackingHeaderVisible,
  ]);
  const trackingHeaderOcclusionHeight = trackingHeaderVisible
    ? TRACKING_HEADER_COLLAPSED_HEIGHT
    : 0;

  useEffect(() => {
    if (!trackingHeaderVisible || !trackingHeaderSession) {
      lockHeaderHidden();
      setHeaderState({
        mode: HEADER_MODES.HIDDEN,
        hidden: true,
        scrollAware: false,
        layoutInsets: null,
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
      layoutInsets: trackingHeaderLayoutInsets,
    });
  }, [
    forceHeaderVisible,
    lockHeaderHidden,
    setHeaderState,
    trackingHeaderLayoutInsets,
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
    setSheetView(buildExploreIntentSheetView(defaultExploreSnapState));
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
    activeMapRequest,
    activeAmbulanceTrip,
    patchActiveAmbulanceTrip,
    ambulanceTelemetryHealth,
    activeBedBooking,
    pendingApproval,
    trackingHeaderOcclusionHeight,
    trackingHeaderActionRequest,
    clearTrackingHeaderActionRequest,
  };
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  Text,
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
import { EmergencyRequestStatus } from "../../../services/emergencyRequestsService";
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

function formatHeaderEtaLabel(etaSeconds, startedAt, nowMs = Date.now()) {
  if (!Number.isFinite(etaSeconds)) return null;
  const startedAtMs = Number.isFinite(startedAt)
    ? startedAt
    : typeof startedAt === "string"
      ? Date.parse(startedAt)
      : NaN;
  const elapsedSeconds = Number.isFinite(startedAtMs)
    ? Math.max(0, Math.round((nowMs - startedAtMs) / 1000))
    : 0;
  const remainingSeconds = Math.max(0, Math.round(etaSeconds - elapsedSeconds));
  const remainingMinutes = Math.max(1, Math.ceil(remainingSeconds / 60));
  return `${remainingMinutes} min`;
}

function formatHeaderArrivalLabel(etaSeconds, startedAt, nowMs = Date.now()) {
  if (!Number.isFinite(etaSeconds)) return null;
  const startedAtMs = Number.isFinite(startedAt)
    ? startedAt
    : typeof startedAt === "string"
      ? Date.parse(startedAt)
      : NaN;
  const elapsedSeconds = Number.isFinite(startedAtMs)
    ? Math.max(0, Math.round((nowMs - startedAtMs) / 1000))
    : 0;
  const remainingSeconds = Math.max(0, Math.round(etaSeconds - elapsedSeconds));
  const arrivalDate = new Date(nowMs + remainingSeconds * 1000);
  const hour = arrivalDate.getHours() % 12 || 12;
  const minute = String(arrivalDate.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
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

function resolveInitialDistanceKm(hospital) {
  const directDistanceKm = Number(hospital?.distanceKm);
  if (Number.isFinite(directDistanceKm) && directDistanceKm > 0) {
    return directDistanceKm;
  }

  if (typeof hospital?.distance === "string" && hospital.distance.trim()) {
    const raw = hospital.distance.trim().toLowerCase();
    const value = Number.parseFloat(raw.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(value) || value <= 0) return null;
    if (raw.includes("km")) return value;
    if (raw.includes("mi")) return value * 1.60934;
    if (raw.includes("m")) return value / 1000;
  }

  return null;
}

function formatRemainingDistanceLabel(distanceKm, arrived = false) {
  if (arrived) return "0 m";
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;
  if (distanceKm < 1) {
    return `${Math.max(50, Math.round(distanceKm * 1000))} m`;
  }
  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
}

function stripHeaderMetricUnit(value, unitPattern) {
  if (typeof value !== "string") return value || "--";
  const trimmed = value.trim();
  if (!trimmed || trimmed === "--") return trimmed || "--";
  return trimmed.replace(unitPattern, "").trim() || trimmed;
}

function toHeaderDistanceKmValue(value) {
  if (typeof value !== "string") return value || "--";
  const raw = value.trim().toLowerCase();
  if (!raw || raw === "--") return "--";

  const parsed = Number.parseFloat(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) return "--";

  let km = parsed;
  if (raw.includes("mi")) {
    km = parsed * 1.60934;
  } else if (raw.includes("m") && !raw.includes("km")) {
    km = parsed / 1000;
  }

  if (km < 1) return km.toFixed(1);
  if (km < 10) return km.toFixed(1);
  return km.toFixed(0);
}

function normalizeTimestampMs(value) {
  if (Number.isFinite(value)) return Number(value);
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function hasEtaElapsed(etaSeconds, startedAt, nowMs = Date.now()) {
  if (!Number.isFinite(etaSeconds)) return false;
  const startedAtMs = normalizeTimestampMs(startedAt);
  if (!Number.isFinite(startedAtMs)) return false;
  const elapsedSeconds = Math.max(0, Math.round((nowMs - startedAtMs) / 1000));
  return elapsedSeconds >= Math.max(0, Math.round(etaSeconds));
}

function joinSummaryParts(parts = []) {
  return parts
    .filter((part) => typeof part === "string" && part.trim())
    .join(" · ");
}

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
  const [trackingHeaderActionRequest, setTrackingHeaderActionRequest] = useState(null);
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
    patchActiveAmbulanceTrip,
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
    if (sheetPayload?.sourcePhase === MAP_SHEET_PHASES.TRACKING) {
      setSheetView({
        phase: MAP_SHEET_PHASES.TRACKING,
        snapState:
          sheetPayload?.sourceSnapState || defaultExploreSnapState,
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
    clearCommitFlow,
    defaultExploreSnapState,
    setSheetView,
    sheetPayload?.sourcePayload,
    sheetPayload?.sourcePhase,
    sheetPayload?.sourceSnapState,
  ]);

  const closeBedDecision = useCallback(() => {
    clearCommitFlow();
    if (sheetPayload?.sourcePhase === MAP_SHEET_PHASES.TRACKING) {
      setSheetView({
        phase: MAP_SHEET_PHASES.TRACKING,
        snapState:
          sheetPayload?.sourceSnapState || defaultExploreSnapState,
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

  const trackingHeaderVisible =
    Boolean(trackingRequestKey) &&
    !usesSidebarLayout &&
    sheetSnapState !== MAP_SHEET_SNAP_STATES.EXPANDED &&
    sheetPhase !== MAP_SHEET_PHASES.COMMIT_DETAILS &&
    sheetPhase !== MAP_SHEET_PHASES.COMMIT_TRIAGE &&
    sheetPhase !== MAP_SHEET_PHASES.COMMIT_PAYMENT;
  const trackingHeaderCanReopen =
    trackingHeaderVisible && sheetPhase === MAP_SHEET_PHASES.EXPLORE_INTENT;
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
      const requestStatus = String(activeAmbulanceTrip?.status || "").toLowerCase();
      if (requestStatus === EmergencyRequestStatus.COMPLETED) return "Complete";
      if (requestStatus === EmergencyRequestStatus.ARRIVED) return "Complete";
      if (
        hasEtaElapsed(
          activeAmbulanceTrip?.etaSeconds,
          activeAmbulanceTrip?.startedAt,
          trackingHeaderNowMs,
        )
      ) {
        return "Arrived";
      }
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
      const requestStatus = String(activeBedBooking?.status || "").toLowerCase();
      if (requestStatus === EmergencyRequestStatus.COMPLETED) return "Complete";
      if (requestStatus === EmergencyRequestStatus.ARRIVED) return "Arrived";
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
    activeAmbulanceTrip?.status,
    activeBedBooking?.etaSeconds,
    activeBedBooking?.requestId,
    activeBedBooking?.startedAt,
    activeBedBooking?.status,
    ambulanceTelemetryHealth?.state,
    pendingApproval?.requestId,
    trackingHeaderNowMs,
  ]);
  const trackingHeaderArrivalLabel = useMemo(() => {
    if (activeAmbulanceTrip?.requestId) {
      return formatHeaderArrivalLabel(
        activeAmbulanceTrip?.etaSeconds,
        activeAmbulanceTrip?.startedAt,
        trackingHeaderNowMs,
      );
    }

    if (activeBedBooking?.requestId) {
      return formatHeaderArrivalLabel(
        activeBedBooking?.etaSeconds,
        activeBedBooking?.startedAt,
        trackingHeaderNowMs,
      );
    }

    return null;
  }, [
    activeAmbulanceTrip?.etaSeconds,
    activeAmbulanceTrip?.requestId,
    activeAmbulanceTrip?.startedAt,
    activeBedBooking?.etaSeconds,
    activeBedBooking?.requestId,
    activeBedBooking?.startedAt,
    trackingHeaderNowMs,
  ]);
  const trackingHeaderDistanceLabel = useMemo(() => {
    const status = String(
      activeAmbulanceTrip?.status || activeBedBooking?.status || "",
    ).toLowerCase();
    const etaElapsed =
      hasEtaElapsed(
        activeAmbulanceTrip?.etaSeconds ?? activeBedBooking?.etaSeconds ?? null,
        activeAmbulanceTrip?.startedAt ?? activeBedBooking?.startedAt ?? null,
        trackingHeaderNowMs,
      );
    const isArrivedOrComplete =
      status === EmergencyRequestStatus.ARRIVED ||
      status === EmergencyRequestStatus.COMPLETED ||
      etaElapsed;
    if (isArrivedOrComplete) {
      return "0 m";
    }

    const initialDistanceKm = resolveInitialDistanceKm(trackingHeaderHospital);
    if (!Number.isFinite(initialDistanceKm) || initialDistanceKm <= 0) {
      return formatHospitalDistanceLabel(trackingHeaderHospital);
    }

    const currentEtaSeconds =
      activeAmbulanceTrip?.etaSeconds ?? activeBedBooking?.etaSeconds ?? null;
    const currentStartedAt =
      activeAmbulanceTrip?.startedAt ?? activeBedBooking?.startedAt ?? null;
    const currentStartedAtMs = normalizeTimestampMs(currentStartedAt);
    if (!Number.isFinite(currentEtaSeconds) || !Number.isFinite(currentStartedAtMs)) {
      return formatRemainingDistanceLabel(initialDistanceKm);
    }
    const elapsedSeconds = Math.max(
      0,
      Math.round((trackingHeaderNowMs - currentStartedAtMs) / 1000),
    );
    const progress = Math.max(
      0,
      Math.min(1, elapsedSeconds / Math.max(1, currentEtaSeconds)),
    );

    const remainingDistanceKm = Math.max(
      initialDistanceKm >= 1 ? 0.1 : 0.05,
      initialDistanceKm * (1 - progress),
    );
    return formatRemainingDistanceLabel(remainingDistanceKm);
  }, [
    activeAmbulanceTrip?.etaSeconds,
    activeAmbulanceTrip?.startedAt,
    activeAmbulanceTrip?.status,
    activeBedBooking?.etaSeconds,
    activeBedBooking?.startedAt,
    activeBedBooking?.status,
    trackingHeaderHospital,
    trackingHeaderNowMs,
  ]);
  const trackingHeaderMinuteValue = useMemo(() => {
    const currentStatus = String(
      activeAmbulanceTrip?.status || activeBedBooking?.status || "",
    ).toLowerCase();
    if (
      currentStatus === EmergencyRequestStatus.ARRIVED ||
      currentStatus === EmergencyRequestStatus.COMPLETED ||
      trackingHeaderStatusLabel === "Arrived" ||
      trackingHeaderStatusLabel === "Complete"
    ) {
      return "0";
    }
    return stripHeaderMetricUnit(
      trackingHeaderStatusLabel,
      /\s*(min|mins|minute|minutes)$/i,
    );
  }, [
    activeAmbulanceTrip?.status,
    activeBedBooking?.status,
    trackingHeaderStatusLabel,
  ]);
  const trackingHeaderDistanceValue = useMemo(
    () => toHeaderDistanceKmValue(trackingHeaderDistanceLabel),
    [trackingHeaderDistanceLabel],
  );
  const trackingHeaderActionSurface = isDarkMode
    ? "rgba(255,255,255,0.08)"
    : "rgba(255,255,255,0.76)";
  const trackingHeaderActionColor = isDarkMode ? "#F8FAFC" : "#0F172A";
  const trackingHeaderRouteSurface = isDarkMode
    ? "rgba(134,16,14,0.24)"
    : "rgba(134,16,14,0.12)";
  const trackingHeaderProgressValue = useMemo(() => {
    const currentEtaSeconds =
      activeAmbulanceTrip?.etaSeconds ?? activeBedBooking?.etaSeconds ?? null;
    const currentStartedAt =
      activeAmbulanceTrip?.startedAt ?? activeBedBooking?.startedAt ?? null;
    const currentStartedAtMs = normalizeTimestampMs(currentStartedAt);
    const currentStatus = String(
      activeAmbulanceTrip?.status || activeBedBooking?.status || "",
    ).toLowerCase();

    if (
      currentStatus === EmergencyRequestStatus.ARRIVED ||
      currentStatus === EmergencyRequestStatus.COMPLETED
    ) {
      return 1;
    }
    if (!Number.isFinite(currentEtaSeconds) || !Number.isFinite(currentStartedAtMs)) {
      return null;
    }
    const elapsedSeconds = Math.max(
      0,
      Math.round((trackingHeaderNowMs - currentStartedAtMs) / 1000),
    );
    return Math.max(0, Math.min(1, elapsedSeconds / Math.max(1, currentEtaSeconds)));
  }, [
    activeAmbulanceTrip?.etaSeconds,
    activeAmbulanceTrip?.startedAt,
    activeAmbulanceTrip?.status,
    activeBedBooking?.etaSeconds,
    activeBedBooking?.startedAt,
    activeBedBooking?.status,
    trackingHeaderNowMs,
  ]);
  const handleTrackingHeaderOpen = useCallback(() => {
    trackingDismissedRef.current = false;
    openTracking();
  }, [openTracking]);
  const requestTrackingHeaderAction = useCallback((type) => {
    if (!type) return;
    trackingDismissedRef.current = false;
    setTrackingHeaderActionRequest({
      type,
      requestedAt: Date.now(),
    });
    openTracking();
  }, [openTracking]);
  const clearTrackingHeaderActionRequest = useCallback(() => {
    setTrackingHeaderActionRequest(null);
  }, []);
  const trackingHeaderLeftComponent = useMemo(() => {
    if (!trackingHeaderVisible) return null;
    return (
      <MapHeaderIconButton
        accessibilityLabel="Update your information"
        backgroundColor={trackingHeaderActionSurface}
        borderRadius={999}
        color={trackingHeaderActionColor}
        iconName="medkit-outline"
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
      const sheetStateTitle =
        status === "arrived" ? "Responder has arrived" : "Transport en route";
      const metricPillLabel =
        joinSummaryParts([trackingHeaderStatusLabel, trackingHeaderDistanceLabel]) ||
        trackingHeaderDistanceLabel ||
        trackingHeaderStatusLabel ||
        trackingHeaderServiceLabel;

      return {
        eyebrow: null,
        title: null,
        subtitle: null,
        metrics: [
          { label: "Arrival", value: trackingHeaderArrivalLabel || "--" },
          { label: "Min", value: trackingHeaderMinuteValue || "--" },
          { label: "Km", value: trackingHeaderDistanceValue || "--" },
        ],
        statusLabel: null,
        statusTone: status === "arrived" ? "success" : "tracking",
        expanded: false,
        expandable: false,
        onToggleExpand: null,
        showChevron: false,
        hideDetails: true,
        bodyHeight: 0,
        expandedContent: null,
        details: [
          ...(trackingHeaderArrivalLabel
            ? [{ label: "Arrival", value: trackingHeaderArrivalLabel }]
            : []),
          ...(trackingHeaderStatusLabel
            ? [{ label: "ETA", value: trackingHeaderStatusLabel }]
            : []),
          ...(trackingHeaderDistanceLabel
            ? [{ label: "Distance", value: trackingHeaderDistanceLabel }]
            : []),
          { label: "Pickup", value: trackingHeaderPickupLabel },
          {
            label: "Hospital",
            value:
              trackingHeaderHospitalName +
              (formatHospitalDistanceLabel(trackingHeaderHospital)
                ? ` · ${formatHospitalDistanceLabel(trackingHeaderHospital)}`
                : ""),
          },
          ...(activeAmbulanceTrip?.assignedAmbulance?.crew?.[0] ||
          activeAmbulanceTrip?.assignedAmbulance?.name ||
          activeAmbulanceTrip?.assignedAmbulance?.vehicleNumber
            ? [
                {
                  label: "Responder",
                  value:
                    activeAmbulanceTrip?.assignedAmbulance?.crew?.[0] ||
                    activeAmbulanceTrip?.assignedAmbulance?.name ||
                    activeAmbulanceTrip?.assignedAmbulance?.vehicleNumber,
                },
              ]
            : []),
          {
            label: "Request",
            value:
              activeAmbulanceTrip?.requestId ||
              pendingApproval?.displayId ||
              "Active",
          },
          ...(activeBedBooking?.requestId
            ? [
                {
                  label: "Admission",
                  value:
                    activeBedBooking?.status === "arrived"
                      ? "Bed ready"
                      : "Bed reserved",
                },
              ]
            : []),
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
      const sheetStateTitle = status === "arrived" ? "Bed ready" : "Bed reserved";
      const metricPillLabel =
        joinSummaryParts([trackingHeaderStatusLabel, trackingHeaderDistanceLabel]) ||
        trackingHeaderDistanceLabel ||
        trackingHeaderStatusLabel ||
        trackingHeaderServiceLabel;
      return {
        eyebrow: null,
        title: null,
        subtitle: null,
        metrics: [
          { label: "Arrival", value: trackingHeaderArrivalLabel || "--" },
          { label: "Min", value: trackingHeaderMinuteValue || "--" },
          { label: "Km", value: trackingHeaderDistanceValue || "--" },
        ],
        statusLabel: null,
        statusTone: status === "arrived" ? "success" : "tracking",
        expanded: false,
        expandable: false,
        onToggleExpand: null,
        showChevron: false,
        hideDetails: true,
        bodyHeight: 0,
        expandedContent: null,
        details: [
          ...(trackingHeaderArrivalLabel
            ? [{ label: "Ready", value: trackingHeaderArrivalLabel }]
            : []),
          ...(trackingHeaderStatusLabel
            ? [{ label: "ETA", value: trackingHeaderStatusLabel }]
            : []),
          ...(trackingHeaderDistanceLabel
            ? [{ label: "Distance", value: trackingHeaderDistanceLabel }]
            : []),
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
      eyebrow: null,
      title: null,
      subtitle: null,
      metrics: [
        { label: "Arrival", value: "--" },
        { label: "Min", value: trackingHeaderMinuteValue || "Pending" },
        { label: "Km", value: trackingHeaderDistanceValue || "--" },
      ],
      statusLabel: null,
      statusTone: "default",
      expanded: false,
      expandable: false,
      onToggleExpand: null,
      showChevron: false,
      hideDetails: true,
      bodyHeight: 0,
      expandedContent: null,
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
    activeAmbulanceTrip?.assignedAmbulance?.crew,
    activeAmbulanceTrip?.assignedAmbulance?.name,
    activeAmbulanceTrip?.assignedAmbulance?.vehicleNumber,
    activeAmbulanceTrip?.requestId,
    activeAmbulanceTrip?.status,
    activeBedBooking?.requestId,
    activeBedBooking?.status,
    ambulanceTelemetryHealth?.state,
    pendingApproval?.displayId,
    pendingApproval?.paymentMethod,
    pendingApproval?.requestId,
    trackingHeaderArrivalLabel,
    trackingHeaderDistanceLabel,
    trackingHeaderDistanceValue,
    trackingHeaderHospital,
    trackingHeaderHospitalName,
    trackingHeaderMinuteValue,
    trackingHeaderPickupDetail,
    trackingHeaderPickupLabel,
    trackingHeaderServiceLabel,
    trackingHeaderStatusLabel,
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
    patchActiveAmbulanceTrip,
    ambulanceTelemetryHealth,
    activeBedBooking,
    pendingApproval,
    trackingHeaderOcclusionHeight,
    trackingHeaderActionRequest,
    clearTrackingHeaderActionRequest,
  };
}

import { useCallback, useEffect, useMemo, useRef } from "react";
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
  MAP_SHEET_PHASES,
  MAP_SHEET_SNAP_STATES,
} from "../../../components/map/core/MapSheetOrchestrator";
import {
  buildActiveMapRequestModel,
} from "../../../components/map/core/mapActiveRequestModel";
import { useMapViewport } from "./useMapViewport";
import { useMapLocation } from "./useMapLocation";
import { useMapHospitalSelection } from "./useMapHospitalSelection";
import { useMapTrackingHeader } from "./useMapTrackingHeader";
import { useMapCommitFlow } from "./useMapCommitFlow";
import { useMapSheetNavigation } from "./useMapSheetNavigation";
import { HEADER_MODES } from "../../../constants/header";
import {
  buildExploreIntentSheetView,
  buildServiceDetailSheetView,
  buildSourceReturnSheetView,
  buildTrackingSheetView,
  resolveMapFlowHospital,
} from "./mapExploreFlow.transitions";
import { getRecentVisits } from "./mapExploreFlow.derived";
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

export function useMapExploreFlow() {
  const trackingDismissedRef = useRef(false);
  const lastTrackingRequestKeyRef = useRef(null);
  const { isDarkMode } = useTheme();
  const { width, height, viewportVariant, surfaceConfig, usesSidebarLayout, sidebarWidth } = useMapViewport();
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

  const { activeLocation, currentLocationDetails, loadingBackgroundImageUri, handleSearchLocation, handleUseCurrentLocation } = useMapLocation({
    globalUserLocation,
    locationLabel,
    locationLabelDetail,
    refreshLocation,
    emergencyUserLocation,
    setUserLocation,
    manualLocation,
    setManualLocation,
    setSheetPhase,
    setMapReadiness,
    setHasCompletedInitialMapLoad,
    isDarkMode,
    width,
    height,
  });
  const isSignedIn = Boolean(user?.isLoggedIn || user?.id);
  const profileImageSource = user?.imageUri
    ? { uri: user.imageUri }
    : require("../../../assets/profile.jpg");
  const needsCoverageExpansion =
    coverageModeService.needsDemoSupport(coverageStatus);
  const shouldBootstrapDemoCoverage = coverageModeService.shouldBootstrapDemo({
    coverageStatus,
    nearbyCoverageCounts,
    hasDemoHospitalsNearby,
  });
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

  const {
    discoveredHospitals,
    nearestHospital,
    nearestHospitalMeta,
    nearbyHospitalCount,
    totalAvailableBeds,
    nearbyBedHospitals,
    featuredHospitals,
    promoteHospitalSelection,
    handleOpenFeaturedHospital: handleOpenFeaturedHospitalBase,
    handleCycleFeaturedHospital,
    handleMapHospitalPress,
  } = useMapHospitalSelection({
    hospitals,
    allHospitals,
    selectedHospital,
    selectedHospitalId,
    selectHospital,
    setFeaturedHospital,
    featuredHospital,
  });

  const recentVisits = useMemo(() => getRecentVisits(visits), [visits]);
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

  const {
    openSearchSheet,
    closeSearchSheet,
    openHospitalList,
    openAmbulanceDecision,
    openAmbulanceHospitalList,
    openBedDecision,
    openBedHospitalList,
    closeHospitalList,
    handleSelectHospital,
    openHospitalDetail,
    closeHospitalDetail,
    openVisitDetail,
    closeVisitDetail,
    closeAmbulanceDecision,
    closeBedDecision,
  } = useMapSheetNavigation({
    sheetPayload,
    sheetSnapState,
    defaultExploreSnapState,
    usesSidebarLayout,
    discoveredHospitals,
    selectedHospital,
    featuredHospital,
    nearestHospital,
    promoteHospitalSelection,
    clearCommitFlow,
    selectHospital,
    setFeaturedHospital,
    setSearchSheetMode,
    setSheetView,
  });

  const {
    suppressCommitRestoreRef,
    openCommitDetails,
    openCommitTriage,
    openCommitPayment,
    closeCommitDetails,
    closeCommitTriage,
    closeCommitPayment,
    finishCommitPayment,
  } = useMapCommitFlow({
    commitFlow,
    sheetPhase,
    sheetPayload,
    sheetSnapState,
    defaultExploreSnapState,
    usesSidebarLayout,
    discoveredHospitals,
    selectedHospital,
    featuredHospital,
    nearestHospital,
    trackingRequestKey,
    promoteHospitalSelection,
    clearCommitFlow,
    setCommitFlow,
    setFeaturedHospital,
    setSheetView,
    openTracking,
  });

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

  const {
    trackingHeaderNowMs,
    trackingHeaderVisible,
    trackingHeaderOcclusionHeight,
    clearTrackingHeaderActionRequest,
    requestTrackingHeaderAction,
  } = useMapTrackingHeader({
    trackingRequestKey,
    trackingVisible,
    sheetPhase,
    sheetSnapState,
    usesSidebarLayout,
    sidebarWidth,
    surfaceConfig,
    width,
    activeMapRequest,
    ambulanceTelemetryHealth,
    pendingApproval,
    hasActiveMapModal,
    isDarkMode,
    openTracking,
    closeTracking,
    lockHeaderHidden,
    unlockHeaderHidden,
    forceHeaderVisible,
    setHeaderState,
    setRuntimeSlice,
  });

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
      handleOpenFeaturedHospitalBase(hospital);
      openHospitalDetail(hospital || null);
    },
    [handleOpenFeaturedHospitalBase, openHospitalDetail],
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
    openTracking,
    finishCommitPayment,
    closeHospitalDetail,
    openVisitDetail,
    closeVisitDetail,
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

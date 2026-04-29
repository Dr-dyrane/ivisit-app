import { useCallback, useEffect, useRef } from "react";
import { useHeaderState } from "../../../contexts/HeaderStateContext";
import { useScrollAwareHeader } from "../../../contexts/ScrollAwareHeaderContext";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { useGlobalLocation } from "../../../contexts/GlobalLocationContext";
import { useEmergency } from "../../../contexts/EmergencyContext";
import { useEmergencyTripStore } from "../../../stores/emergencyTripStore";
import { useVisits } from "../../../contexts/VisitsContext";
import { coverageModeService } from "../../../services/coverageModeService";
import {
  MAP_SHEET_SNAP_STATES,
} from "../../../components/map/core/MapSheetOrchestrator";
import { useMapViewport } from "./useMapViewport";
import { useMapLocation } from "./useMapLocation";
import { useMapHospitalSelection } from "./useMapHospitalSelection";
import { useMapTrackingHeader } from "./useMapTrackingHeader";
import { useMapCommitFlow } from "./useMapCommitFlow";
import { useMapSheetNavigation } from "./useMapSheetNavigation";
import { useMapServiceDetail } from "./useMapServiceDetail";
import { useMapLoadingState } from "./useMapLoadingState";
import { useMapTracking } from "./useMapTracking";
import { useMapDerivedData } from "./useMapDerivedData";
import { useMapComputedBooleans } from "./useMapComputedBooleans";
import { useMapCallbacks } from "./useMapCallbacks";
import { useMapUserData } from "./useMapUserData";
import { useMapEffects } from "./useMapEffects";
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
    ambulanceTelemetryHealth,
    // PULLBACK NOTE: Phase 5c — expose action callbacks so MapScreen can prop-drill to tracking subtree
    // OLD: MapTrackingStageBase called useEmergency() directly for these
    // NEW: flow through useMapExploreFlow return → MapScreen → MapSheetOrchestrator → MapTrackingStageBase
    stopAmbulanceTrip,
    stopBedBooking,
    setAmbulanceTripStatus,
    setBedBookingStatus,
    isArrived,
    isPendingApproval,
    // PULLBACK NOTE: Phase 8 — Pass C: XState gate for auto-open
    // hasActiveTrip = isPendingApproval || isActive || isArrived || isCompleting
    // Used to defend against Zustand-truthy-but-XState-idle race during cleanup
    hasActiveTrip,
  } = useEmergency();

  // PULLBACK NOTE: Phase 5e — raw trip reads + trip actions moved off EmergencyContext
  // OLD: destructured from useEmergency() — all context subscribers re-rendered on every trip update
  // NEW: surgical store selectors — scoped re-renders only
  const activeAmbulanceTrip = useEmergencyTripStore((s) => s.activeAmbulanceTrip);
  const activeBedBooking = useEmergencyTripStore((s) => s.activeBedBooking);
  const pendingApproval = useEmergencyTripStore((s) => s.pendingApproval);
  const commitFlow = useEmergencyTripStore((s) => s.commitFlow);
  const setCommitFlow = useEmergencyTripStore((s) => s.setCommitFlow);
  const patchActiveAmbulanceTrip = useEmergencyTripStore((s) => s.patchActiveAmbulanceTrip);
  const setPendingApproval = useEmergencyTripStore((s) => s.setPendingApproval);
  const clearCommitFlow = useEmergencyTripStore((s) => s.clearCommitFlow);

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

  const { activeLocation, currentLocationDetails, loadingBackgroundImageUri, handleSearchLocation, handleUseCurrentLocation, } = useMapLocation({
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
  // Pass 14c: user display data extracted to useMapUserData
  // OLD: isSignedIn + profileImageSource derived inline
  // NEW: owned by useMapUserData
  const { isSignedIn, profileImageSource } = useMapUserData({ user });
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

  // Pass 15: navigation lifecycle effects extracted to useMapEffects
  // OLD: useFocusEffect block inline in orchestrator
  // NEW: owned by useMapEffects
  useMapEffects({
    resetHeader,
    resetHeaderState,
    lockHeaderHidden,
    unlockHeaderHidden,
    forceHeaderVisible,
    setHeaderState,
    resetExplorePresentation,
  });

  // Pass 12: derived data — runs first so discoveredHospitals/nearestHospital
  // can be passed down to useMapHospitalSelection (Pass 14a: single source of truth)
  // nowMs seeded via stable ref; kept in sync inline (see below — HR-D fix).
  const nowMsRef = useRef(Date.now());

  const {
    discoveredHospitals,
    nearestHospital,
    nearestHospitalMeta,
    nearbyHospitalCount,
    totalAvailableBeds,
    nearbyBedHospitals,
    featuredHospitals,
    recentVisits,
    activeMapRequest,
  } = useMapDerivedData({
    allHospitals,
    hospitals,
    selectedHospital,
    activeAmbulanceTrip,
    activeBedBooking,
    pendingApproval,
    ambulanceTelemetryHealth,
    sheetPayload,
    featuredHospital,
    currentLocationDetails,
    nowMs: nowMsRef.current,
    visits,
  });

  // Pass 14a: receives discoveredHospitals + nearestHospital from useMapDerivedData
  // OLD: computed them internally (duplicate memos)
  // NEW: props-driven — single source of truth from useMapDerivedData
  const {
    promoteHospitalSelection,
    handleOpenFeaturedHospital: handleOpenFeaturedHospitalBase,
    handleCycleFeaturedHospital,
    handleMapHospitalPress,
  } = useMapHospitalSelection({
    discoveredHospitals,
    nearestHospital,
    selectedHospital,
    selectedHospitalId,
    selectHospital,
    setFeaturedHospital,
    featuredHospital,
  });

  const trackingRequestKey = activeMapRequest.requestId;

  // Pass 11: tracking sheet lifecycle + shared clock
  // PULLBACK NOTE: Phase 8 — Pass C: hasActiveTrip is the XState gate for auto-open
  const { nowMs, openTracking, closeTracking } = useMapTracking({
    trackingRequestKey,
    hasActiveTrip,
    sheetPhase,
    sheetPayload,
    defaultExploreSnapState,
    usesSidebarLayout,
    discoveredHospitals,
    featuredHospital,
    nearestHospital,
    activeMapRequest,
    promoteHospitalSelection,
    setSheetView,
  });

  // PULLBACK NOTE: HR-D fix — assign ref inline during render (guardrail rule 3).
  // OLD: useEffect(() => { nowMsRef.current = nowMs }, [nowMs]) — ref sync 1 render late,
  //      activeMapRequest saw a stale timestamp on cold start (one-frame ETA artifact).
  // NEW: assign inline — ref is always current in the same render pass as nowMs.
  nowMsRef.current = nowMs;


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
    sheetPhase,
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
    promoteHospitalSelection,
    clearCommitFlow,
    setCommitFlow,
    setFeaturedHospital,
    setSheetView,
    openTracking,
  });

  const hasActiveMapModal =
    profileModalVisible ||
    guestProfileVisible ||
    careHistoryVisible ||
    recentVisitsVisible ||
    authModalVisible;

  const {
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
    nowMs,
    setHeaderState,
    setRuntimeSlice,
  });

  const {
    setHospitalServiceSelection,
    openServiceDetail,
    changeServiceDetailService,
    closeServiceDetail,
    confirmServiceDetail,
  } = useMapServiceDetail({
    sheetPayload,
    sheetSnapState,
    usesSidebarLayout,
    featuredHospital,
    setFeaturedHospital,
    setSheetPayload,
    setSheetView,
    setHospitalServiceSelectionValue,
  });

  // Pass 14b: UI callbacks extracted to useMapCallbacks
  // OLD: handleChooseCare, handleOpenFeaturedHospital, handleOpenProfile,
  //       handleMapReadinessChange declared inline
  // NEW: owned by useMapCallbacks
  const {
    handleChooseCare,
    handleOpenFeaturedHospital,
    handleOpenProfile,
    handleMapReadinessChange,
  } = useMapCallbacks({
    isSignedIn,
    mapReadiness,
    handleOpenFeaturedHospitalBase,
    openAmbulanceDecision,
    openBedDecision,
    openHospitalDetail,
    setMapReadiness,
    setProfileModalVisible,
    setGuestProfileVisible,
    setSelectedCare,
  });

  useMapExploreGuestProfileFab({
    guestProfileVisible,
    onContinue: useCallback(() => {
      setGuestProfileVisible(false);
      setAuthModalVisible(true);
    }, [setAuthModalVisible, setGuestProfileVisible]),
  });

  const {
    hasActiveLocation,
    hasResolvedProviders,
    expectsRoute,
    isMapFrameReady,
    isMapSurfaceReady,
    isBackgroundCoverageLoading,
    isBackgroundRouteLoading,
  } = useMapComputedBooleans({
    activeLocation,
    discoveredHospitals,
    nearestHospital,
    mapReadiness,
    needsCoverageExpansion,
    isLoadingHospitals,
    isBootstrappingDemo,
  });

  const { shouldShowMapLoadingOverlay, mapLoadingState } = useMapLoadingState({
    activeLocation,
    nearestHospital,
    discoveredHospitals,
    mapReadiness,
    needsCoverageExpansion,
    isLoadingHospitals,
    isBootstrappingDemo,
    coverageModePreferenceLoaded,
    isLoadingLocation,
    isResolvingPlaceName,
    hasCompletedInitialMapLoad,
    setHasCompletedInitialMapLoad,
  });

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
    // PULLBACK NOTE: Phase 5c — tracking action callbacks for prop-drilling to MapTrackingStageBase
    allHospitals,
    stopAmbulanceTrip,
    stopBedBooking,
    setPendingApproval,
    setAmbulanceTripStatus,
    setBedBookingStatus,
    isArrived,
    isPendingApproval,
    // PULLBACK NOTE: VD-C1 — expose XState gate for handleResumeHistoryRequest guard (defect VD-6)
    hasActiveTrip,
  };
}

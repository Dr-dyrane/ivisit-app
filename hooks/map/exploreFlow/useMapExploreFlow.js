import { useCallback, useEffect, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { commitFlowAtom } from "../../../atoms/commitAtoms";
import {
  mapSelectedHospitalIdAtom,
  mapFeaturedHospitalAtom,
  exploreProviderCategoryAtom,
  exploreProviderIdAtom,
} from "../../../atoms/mapFlowAtoms";
import {
  emergencyChatModalVisibleAtom,
} from "../../../atoms/emergencyChatAtoms";
import { useHeaderState } from "../../../contexts/HeaderStateContext";
import { useScrollAwareHeader } from "../../../contexts/ScrollAwareHeaderContext";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { usePreferences } from "../../../contexts/PreferencesContext";
import { useGlobalLocation } from "../../../contexts/GlobalLocationContext";
import { useEmergency } from "../../../contexts/EmergencyContext";
import { useEmergencyTripStore } from "../../../stores/emergencyTripStore";
import { useLastHospitalStore } from "../../../stores/lastHospitalStore";
import { useVisits } from "../../../contexts/VisitsContext";
import { coverageModeService } from "../../../services/coverageModeService";
import {
  MAP_SHEET_PHASES,
  MAP_SHEET_SNAP_STATES,
} from "../../../components/map/core/MapSheetOrchestrator";
import { MAP_SEARCH_SHEET_MODES } from "../../../components/map/surfaces/search/mapSearchSheet.helpers";
import { useMapViewport } from "./useMapViewport";
import { useMapLocation } from "./useMapLocation";
import { useMapHospitalSelection } from "./useMapHospitalSelection";
import { useMapTrackingHeader } from "./useMapTrackingHeader";
import { useMapCommitFlow } from "./useMapCommitFlow";
import { useMapSheetNavigation } from "./useMapSheetNavigation";
import { useMapServiceDetail } from "./useMapServiceDetail";
import { useMapLoadingState } from "./useMapLoadingState";
import { useMapExploreDemoBootstrap } from "./useMapExploreDemoBootstrap";
import { isEmergencyCareDiscoveryPending } from "./mapExploreFlow.loading";
import { useMapTracking } from "./useMapTracking";
import { useMapDerivedData } from "./useMapDerivedData";
import { useMapComputedBooleans } from "./useMapComputedBooleans";
import { useMapCallbacks } from "./useMapCallbacks";
import { useMapUserData } from "./useMapUserData";
import { useMapEffects } from "./useMapEffects";
import { useMapExploreGuestProfileFab } from "./useMapExploreGuestProfileFab";
// PULLBACK NOTE: MapScreen decomposition Pass 9 — location intent race condition fix
import { useMapLocationIntent } from "./useMapLocationIntent";
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
  const { preferences } = usePreferences();
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
    locationPermissionStatus: globalLocationPermissionStatus,
    locationSource: globalLocationSource,
    locationLabel,
    locationLabelDetail,
    resolvedPlace,
    refreshLocation,
    requestLocationPermission,
    openLocationSettings,
    locationError,
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
  // PULLBACK NOTE: UX-D D-2 — commitFlow migrated from Zustand to Jotai
  // OLD: useEmergencyTripStore selectors for commitFlow/setCommitFlow/clearCommitFlow
  // NEW: Jotai atom — session-ephemeral, resets on restart (not persisted)
  const [commitFlow, setCommitFlow] = useAtom(commitFlowAtom);
  const patchActiveAmbulanceTrip = useEmergencyTripStore((s) => s.patchActiveAmbulanceTrip);
  const setPendingApproval = useEmergencyTripStore((s) => s.setPendingApproval);
  const clearCommitFlow = () => setCommitFlow(null);

  // PULLBACK NOTE: PASS 19D — Hybrid marker selection (map-flow-specific + EMERGENCY fallback)
  // Map flow atoms for hospital selection (ephemeral UI state, survives sheet collapse)
  const [mapSelectedHospitalId, setMapSelectedHospitalId] = useAtom(mapSelectedHospitalIdAtom);
  const [mapFeaturedHospital, setMapFeaturedHospital] = useAtom(mapFeaturedHospitalAtom);

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
  const defaultExploreSnapState = usesSidebarLayout
    ? MAP_SHEET_SNAP_STATES.EXPANDED
    : MAP_SHEET_SNAP_STATES.HALF;
  // PULLBACK NOTE: EXP-7 — clear provider atoms on location change
  // OLD: clearLocationScopedMapState only cleared hospital selection
  // NEW: also clears exploreProviderCategory + exploreProviderId
  //      Providers from the old location are stale when location changes.
  //      Leaving them would render wrong-city providers on the map.
  const setExploreProviderCategory = useSetAtom(exploreProviderCategoryAtom);
  const setExploreProviderId = useSetAtom(exploreProviderIdAtom);
  const clearLocationScopedMapState = useCallback(() => {
    selectHospital(null);
    setMapSelectedHospitalId(null);
    setMapFeaturedHospital(null);
    setFeaturedHospital(null);
    setSheetPayload(null);
    setExploreProviderCategory(null);
    setExploreProviderId(null);
  }, [selectHospital, setMapSelectedHospitalId, setMapFeaturedHospital, setFeaturedHospital, setSheetPayload, setExploreProviderCategory, setExploreProviderId]);

  const {
    activeLocation,
    currentLocationDetails,
    loadingBackgroundImageUri,
    handleSearchLocation,
    handleUseCurrentLocation,
    locationControl,
    locationTruth,
  } = useMapLocation({
    globalUserLocation,
    globalLocationSource,
    globalLocationPermissionStatus,
    locationLabel,
    locationLabelDetail,
    resolvedPlace,
    refreshLocation,
    requestLocationPermission,
    openLocationSettings,
    locationError,
    setUserLocation,
    manualLocation,
    preferences,
    setManualLocation,
    sheetPayload,
    defaultExploreSnapState,
    setSheetView,
    clearLocationScopedMapState,
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
  const isCareDiscoveryPending = isEmergencyCareDiscoveryPending({
    coverageModePreferenceLoaded,
    isLoadingHospitals,
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
    nearestSummaryHospital,
    nearestSummaryHospitalMeta,
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
    activeLocation,
    nowMs: nowMsRef.current,
    visits,
  });

  // PULLBACK NOTE: Issue-3 fix — seed hospital selection from persisted cache on mount
  // Fires once when: store is hydrated, locationKey matches current location bucket,
  // and discoveredHospitals is still empty (query not yet resolved).
  // When TanStack resolves, useMapHospitalSelection auto-select takes over cleanly.
  const cachedHospitalId = useLastHospitalStore((s) => s.hospitalId);
  const cachedHospital = useLastHospitalStore((s) => s.hospital);
  const cachedLocationKey = useLastHospitalStore((s) => s.locationKey);
  const lastHospitalStoreHydrated = useLastHospitalStore((s) => s.hydrated);
  const cacheSeededRef = useRef(false);
  useEffect(() => {
    if (cacheSeededRef.current) return;
    if (!lastHospitalStoreHydrated) return;
    if (!cachedHospitalId || !cachedHospital) return;
    if (discoveredHospitals.length > 0) return; // live data already present
    const lat = activeLocation?.latitude;
    const lng = activeLocation?.longitude;
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return;
    const currentLocationKey = `${Number(lat).toFixed(3)}:${Number(lng).toFixed(3)}`;
    if (cachedLocationKey !== currentLocationKey) return; // stale — user moved
    cacheSeededRef.current = true;
    selectHospital(cachedHospitalId);
    setFeaturedHospital(cachedHospital);
    setMapSelectedHospitalId(cachedHospitalId);
    setMapFeaturedHospital(cachedHospital);
  }, [
    lastHospitalStoreHydrated,
    cachedHospitalId,
    cachedHospital,
    cachedLocationKey,
    discoveredHospitals.length,
    activeLocation?.latitude,
    activeLocation?.longitude,
    selectHospital,
    setFeaturedHospital,
    setMapSelectedHospitalId,
    setMapFeaturedHospital,
  ]);

  // PULLBACK NOTE: PASS 19D — Hybrid selectHospitalForMap
  // Updates map flow atoms (primary) + EMERGENCY context (fallback for emergency flow)
  // Always triggers sheet phase change to open hospital detail when requested
  // Defined after discoveredHospitals to avoid temporal dead zone error
  const selectHospitalForMap = useCallback(
    (hospitalId, options = {}) => {
      const { shouldOpenDetail = true } = options;
      
      // Cache hospital lookup to avoid duplicate array find
      const hospital = hospitalId ? discoveredHospitals?.find((h) => h?.id === hospitalId) : null;
      
      // Update map flow atoms (primary source for map interactions)
      setMapSelectedHospitalId(hospitalId);
      if (hospital) {
        setMapFeaturedHospital(hospital);
      } else {
        setMapFeaturedHospital(null);
      }

      // Update EMERGENCY context state (fallback for emergency flow compatibility)
      selectHospital(hospitalId);

      // Always trigger sheet phase change to open hospital detail when requested
      // regardless of current phase
      if (shouldOpenDetail && hospitalId && hospital) {
        // Return hospital for caller to open hospital detail
        return { shouldOpenDetail: true, hospital };
      }

      return { shouldOpenDetail: false };
    },
    [
      discoveredHospitals,
      selectHospital,
      setMapFeaturedHospital,
      setMapSelectedHospitalId,
    ],
  );

  // Pass 14a: receives discoveredHospitals + nearestHospital from useMapDerivedData
  // OLD: computed them internally (duplicate memos)
  // NEW: props-driven — single source of truth from useMapDerivedData
  // PULLBACK NOTE: PASS 19D — Hybrid marker selection (selectHospitalForMap + openHospitalDetail)
  const {
    promoteHospitalSelection,
    handleOpenFeaturedHospital: handleOpenFeaturedHospitalBase,
    handleCycleFeaturedHospital,
    handleMapHospitalPress: handleMapHospitalPressBase,
  } = useMapHospitalSelection({
    discoveredHospitals,
    nearestHospital,
    selectedHospital,
    selectedHospitalId,
    selectHospital,
    selectHospitalForMap,
    setFeaturedHospital,
    featuredHospital,
  });

  const {
    openSearchSheet,
    closeSearchSheet,
    openHospitalList,
    openProviderList,
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
    closeDecisionPhase,
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
    setSheetPayload,
    setSheetView,
  });

  // PULLBACK NOTE: PASS 19D — Wrap handleMapHospitalPress to call openHospitalDetail
  // This avoids temporal dead zone error by calling openHospitalDetail after it's defined
  const handleMapHospitalPress = useCallback(
    (hospital) => {
      const resultHospital = handleMapHospitalPressBase?.(hospital);
      if (resultHospital && openHospitalDetail) {
        openHospitalDetail(resultHospital);
      }
    },
    [handleMapHospitalPressBase, openHospitalDetail],
  );

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

  // PULLBACK NOTE: Contact Dispatch CD-7 — emergency chat modal visibility
  const emergencyChatModalVisible = useAtomValue(emergencyChatModalVisibleAtom);

  const hasActiveMapModal =
    profileModalVisible ||
    guestProfileVisible ||
    careHistoryVisible ||
    recentVisitsVisible ||
    authModalVisible ||
    emergencyChatModalVisible;

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
    isCareDiscoveryPending,
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

  const {
    shouldShowMapLoadingOverlay,
    isLocationOffTerminal,
    mapLoadingState,
  } = useMapLoadingState({
    activeLocation,
    nearestHospital,
    discoveredHospitals,
    requiresLocationSelection: locationControl?.requiresLocationSelection,
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

  // PULLBACK NOTE: MapScreen decomposition Pass 9 — location intent race condition fix
  // Consolidates location-off-terminal and requiresLocationSelection transitions into single
  // deterministic hook with priority-based logic (eliminates race condition)
  useMapLocationIntent({
    isLocationOffTerminal,
    locationControl,
    setSheetPhase,
    sheetPhase,
  });

  return {
    activeLocation,
    authModalVisible,
    careHistoryVisible,
    currentLocationDetails,
    locationControl,
    locationTruth,
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
    openProviderList,
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
    closeDecisionPhase,
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
    isCareDiscoveryPending,
    isLoadingHospitals,
    isLocationOffTerminal,
    isMapFrameReady,
    isMapSurfaceReady,
    isSignedIn,
    loadingBackgroundImageUri,
    manualLocation,
    mapLoadingState,
    mapReadiness,
    nearestSummaryHospital,
    nearestSummaryHospitalMeta,
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
    setSheetPhase,
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

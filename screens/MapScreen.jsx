import React, { useCallback, useEffect, useRef, useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { Alert, Linking, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import useAuthViewport from "../hooks/ui/useAuthViewport";
import EmergencyLocationPreviewMap from "../components/emergency/intake/EmergencyLocationPreviewMap";

import MapSheetOrchestrator, {
  MAP_SHEET_PHASES,
  MAP_SHEET_SNAP_STATES,
} from "../components/map/core/MapSheetOrchestrator";
import MapExploreLoadingOverlay from "../components/map/surfaces/MapExploreLoadingOverlay";
// PULLBACK NOTE: MapScreen decomposition Pass 8 — modal orchestrator extracted
import MapModalOrchestrator from "../components/map/MapModalOrchestrator";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useVisits } from "../contexts/VisitsContext";
import { useFABActions } from "../contexts/FABContext";
import { useMapExploreFlow } from "../hooks/map/useMapExploreFlow";
import { useMapShell } from "../hooks/map/shell/useMapShell";
// PULLBACK NOTE: MapScreen decomposition Pass 2 — history+rating-recovery cluster extracted
import { useMapHistoryFlow } from "../hooks/map/history/useMapHistoryFlow";
// PULLBACK NOTE: MapScreen decomposition Pass 3 — decision + confirm handlers extracted
import { useMapDecisionHandlers } from "../hooks/map/decision/useMapDecisionHandlers";
// PULLBACK NOTE: Phase 8 — Pass B: in-flow rating modal lifted to MapScreen
import { useTrackingRatingFlow } from "../hooks/map/exploreFlow/useTrackingRatingFlow";
// getMapViewportVariant/getMapViewportSurfaceConfig/isSidebarMapVariant — moved to useMapShell
import { MAP_SEARCH_SHEET_MODES } from "../components/map/surfaces/search/mapSearchSheet.helpers";

// PULLBACK NOTE: Pass 4 — tracking route reconciliation extracted to useMapTrackingSync
import { useMapTrackingSync } from "../hooks/map/tracking/useMapTrackingSync";
// PULLBACK NOTE: Pass 5 — map focus + service-marker derivations extracted
import { useMapFocusedState } from "../hooks/map/shell/useMapFocusedState";
// PULLBACK NOTE: MapScreen decomposition Pass 6 — FAB management extracted
import { useMapFABManagement } from "../hooks/map/useMapFABManagement";
// PULLBACK NOTE: MapScreen decomposition Pass 7 — route handlers extracted
import { useMapRouteHandlers } from "../hooks/map/useMapRouteHandlers";
import { trackingRatingStateAtom } from "../atoms/mapScreenAtoms";
import MapTopLeftControl from "../components/map/views/shared/MapTopLeftControl";
import ProviderMarkers from "../components/map/ProviderMarkers";
import { useNearbyProviders } from "../hooks/emergency/useNearbyProviders";
import {
  exploreProviderCategoryAtom,
  exploreProviderIdAtom,
  exploreCareSessionAtom,
} from "../atoms/mapFlowAtoms";
import { buildProviderDetailSheetView } from "../hooks/map/exploreFlow/mapExploreFlow.transitions";

export default function MapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isDarkMode } = useTheme();
  const { showToast } = useToast();
  const { logout, user } = useAuth();
  const {
    visits = [],
    isLoading: visitsLoading,
    updateVisit,
    cancelVisit,
    refreshVisits,
  } = useVisits();
  const { registerFAB, unregisterFAB } = useFABActions();
  const { width, height, browserInsetTop, browserInsetBottom } =
    useAuthViewport();
  const {
    activeLocation,
    authModalVisible,
    careHistoryVisible,
    currentLocationDetails,
    locationControl,
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
    openProviderList,
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
    nearestSummaryHospital,
    nearestSummaryHospitalMeta,
    nearestHospital,
    nearestHospitalMeta,
    trueNearestHospital,
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
    setSheetPhase,
    setSheetPayload,
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
    hasActiveTrip,
  } = useMapExploreFlow(); // eslint-disable-line no-unused-vars -- setAuthModalVisible kept for store compat

  // PULLBACK NOTE: EXP-7 — read the persisted session snapshot (hydrated at module load)
  // useAtomValue is correct: read-only derived atom, no write subscription
  const exploreCareSession = useAtomValue(exploreCareSessionAtom);

  // PULLBACK NOTE: EXP-7 — Map mount: restore persisted explore care session
  // WHY useEffect([exploreCareSession.category]) + ref guard, not useEffect([]):
  //   hydrateExploreCareSession() is async (reads from AsyncStorage). There is a race:
  //   useEffect([]) fires before the async hydration resolves → category is still null →
  //   restore never happens. This is the same race as TRACKING_VISUALIZATION.
  //   Fix: watch exploreCareSession.category; fire restore exactly once via hasRestoredRef.
  //   The ref guard prevents re-firing when the user later changes category via interaction.
  //
  // OLD: always wiped on mount → app background/kill lost the session
  // NEW: atoms are write-through (backed by EXPLORE_CARE_SESSION storage).
  //      hydrateExploreCareSession() fires at module load; when it resolves it calls
  //      store.set() → atom updates → this effect fires with the hydrated category.
  //      If the user explicitly closed the list, handleCloseProviderList persisted null
  //      → hydration reads null → category stays null → no restore → hospitals-only. ✓
  const hasRestoredSessionRef = useRef(false);
  useEffect(() => {
    if (hasRestoredSessionRef.current) return; // only restore once per mount
    if (!exploreCareSession?.category) return;  // no saved session — nothing to restore
    hasRestoredSessionRef.current = true;
    openProviderList(
      exploreCareSession.category,
      exploreCareSession.selectedProviderId ?? null,
    );
  }, [exploreCareSession?.category, openProviderList]);

  // PULLBACK NOTE: EXP-5/EXP-6/EXP-7 — Explore Care wiring
  // L5: Jotai atoms for ephemeral explore UI state
  const [exploreProviderCategory, setExploreProviderCategory] = useAtom(exploreProviderCategoryAtom);
  const [exploreProviderId, setExploreProviderId] = useAtom(exploreProviderIdAtom);

  const handleExploreCare = useCallback((providerType) => {
    // PULLBACK NOTE: EXP-6C — PROVIDER_LIST is now a proper orchestrator phase
    // OLD: set atom → floating MapProviderListSheet overlay
    // NEW: set atom + transition phase
    //
    // PULLBACK NOTE: FIX — call openProviderList first to transition sheet phase,
    // then set atom. This ensures sheet phase is set before focusedCoordinate
    // is derived in useMapFocusedState, eliminating timing gap.
    //
    // PULLBACK NOTE: EXP-7 BUGFIX — clear stale exploreProviderId on category change
    // OLD: id from prior category (e.g. pharmacy) persisted → !exploreProviderId
    //      guard in auto-select effect was false → no nearest provider auto-selected
    //      when entering Clinics (or any subsequent category)
    // NEW: reset id to null so the auto-select effect can pick the nearest provider
    //      for the newly-opened category once results land.
    setExploreProviderId(null);
    openProviderList(providerType, null);
    setExploreProviderCategory(providerType);
  }, [openProviderList, setExploreProviderCategory, setExploreProviderId]);

  const handleCloseProviderList = useCallback(() => {
    setExploreProviderCategory(null);
    setExploreProviderId(null);
    setSheetPayload(null);
    setSheetPhase(MAP_SHEET_PHASES.EXPLORE_INTENT);
  }, [setExploreProviderCategory, setExploreProviderId, setSheetPayload, setSheetPhase]);

  const handleSelectExploreProvider = useCallback((provider) => {
    if (!provider) return;
    const category = exploreProviderCategory;
    // PULLBACK NOTE: FIX-C — BUG-4: do NOT clear exploreProviderCategory on card/pin tap
    // OLD: setExploreProviderCategory(null) here — killed map pins the moment user tapped
    // NEW: category atom stays set → ProviderMarkers + TanStack cache stay alive during PROVIDER_DETAIL
    setExploreProviderId(provider?.id ?? null);
    setSheetPayload(
      buildProviderDetailSheetView({
        provider,
        providerCategory: category,
        usesSidebarLayout: false,
        sourcePhase: MAP_SHEET_PHASES.PROVIDER_LIST,
        userLocation: activeLocation,
      }).payload
    );
    setSheetPhase(MAP_SHEET_PHASES.PROVIDER_DETAIL);
  }, [activeLocation, exploreProviderCategory, setExploreProviderId, setSheetPayload, setSheetPhase]);

  const handleCloseProviderDetail = useCallback(() => {
    // PULLBACK NOTE: FIX-C — on detail close, return to PROVIDER_LIST (not EXPLORE_INTENT)
    // OLD: reset to EXPLORE_INTENT, clear category atom
    // NEW: return to PROVIDER_LIST phase so user keeps the list
    //
    // PULLBACK NOTE: EXP-7 — do NOT clear exploreProviderId when returning to PROVIDER_LIST
    // OLD: setExploreProviderId(null) here → auto-select useEffect re-fires → re-selects nearest
    //      → user's last-viewed provider is forgotten, map pin snaps back to A
    // NEW: keep the current exploreProviderId alive so the selected pin remains highlighted.
    //      The auto-select guard (!exploreProviderId) prevents it from re-firing.
    //      Only clear exploreProviderId when closing the entire provider list (handleCloseProviderList).
    const category = exploreProviderCategory;
    if (category) {
      // Keep exploreProviderId — stays highlighted on map, auto-select won't re-fire
      setSheetPayload({ providerCategory: category, selectedProviderId: exploreProviderId });
      setSheetPhase(MAP_SHEET_PHASES.PROVIDER_LIST);
    } else {
      setExploreProviderId(null);
      setSheetPayload(null);
      setSheetPhase(MAP_SHEET_PHASES.EXPLORE_INTENT);
    }
  }, [exploreProviderCategory, exploreProviderId, setExploreProviderId, setSheetPayload, setSheetPhase]);

  // L2: shared TanStack Query — same query key as MapProviderListSheet → zero extra network requests
  const { providers: exploreProviders } = useNearbyProviders({
    providerCategory: exploreProviderCategory,
    location: activeLocation,
    enabled: !!exploreProviderCategory,
    includeGoogle: true,
    countryCode: currentLocationDetails?.countryCode || activeLocation?.countryCode || null,
  });

  // PULLBACK NOTE: EXP-7 — Auto-select nearest provider when list opens
  // Mirrors hospital behaviour: when the hospital list opens the nearest hospital is
  // already focused on the map. For providers, select the first (nearest) provider
  // as soon as the query resolves, but only when in PROVIDER_LIST with no selection.
  useEffect(() => {
    if (
      sheetPhase === MAP_SHEET_PHASES.PROVIDER_LIST &&
      !exploreProviderId &&
      exploreProviders.length > 0
    ) {
      const nearest = exploreProviders[0];
      if (nearest?.id) {
        setExploreProviderId(nearest.id);
        // Update payload so MapSheetOrchestrator PROVIDER_LIST shows the correct selected row
        setSheetPayload({ providerCategory: exploreProviderCategory, selectedProviderId: nearest.id });
      }
    }
  }, [
    sheetPhase,
    exploreProviderId,
    exploreProviderCategory,
    // Only re-run when the first provider id changes (list loaded / changed)
    exploreProviders[0]?.id,
    setExploreProviderId,
    setSheetPayload,
  ]);

  // PULLBACK NOTE: MapScreen decomposition Pass 1 — shell-level derivations extracted
  // OLD: viewportVariant/surfaceConfig/usesSidebarLayout/renderedSnapState/bottomSheetHeight/
  //      sidebarWidth/sidebarOcclusionWidth/activeHistoryRequestKeys/hasActiveMapModal all inline
  // NEW: useMapShell owns all shell derivations; MapScreen passes raw values, destructures results
  // PULLBACK NOTE: MapScreen decomposition Pass 2 — history + rating-recovery cluster
  // PULLBACK NOTE: VD-2 — read atom directly here so useMapShell gets the modal-open
  // signal without requiring useTrackingRatingFlow to be called above the shell.
  const trackingRatingStateForShell = useAtomValue(trackingRatingStateAtom);

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
    historyRatingState: trackingRatingStateForShell,
  });

  const {
    // State
    selectedHistoryVisit,
    selectedHistoryVisitKey,
    historyPaymentState,
    recoveredRatingState,
    ratingRecoveryClaims,
    historyVisitDetailsVisible,
    historyFocusedHospital,
    openHistoryVisitByKey,
    // Handlers
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
    closeRecoveredRating,
    handleSkipRecoveredRating,
    handleSubmitRecoveredRating,
  } = useMapHistoryFlow({
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
  });

  // PULLBACK NOTE: MapScreen decomposition Pass 6 — FAB management extracted
  useMapFABManagement({
    hasActiveMapModal,
    registerFAB,
    unregisterFAB,
  });

  // PULLBACK NOTE: EXP-7 fix — derive selectedProvider for map focus + polyline theming
  // OLD: selectedProvider not passed; useMapFocusedState only read sheetPayload.provider
  // NEW: resolved from exploreProviderId + exploreProviders; works in both LIST and DETAIL phases
  const selectedProvider = useMemo(
    () => exploreProviders.find((p) => p?.id === exploreProviderId) ?? null,
    [exploreProviders, exploreProviderId],
  );

  // PULLBACK NOTE: EXP-7 — provider marker render gate (iOS crash guard)
  // Decision-tree: Y is DERIVED from X → useMemo (not useEffect, not useState).
  // Rule: providers and hospitals must NEVER render simultaneously on the map.
  //   - EXPLORE_INTENT or any non-provider phase → hospitals only, providers hidden
  //   - PROVIDER_LIST / PROVIDER_DETAIL → providers only, hospitals suppressed
  // The stale-atom problem (atoms survive navigation) means we cannot trust
  // exploreProviderCategory alone — we also gate on sheetPhase being a provider phase.
  // This is the single authoritative gate; suppressHospitalMarkers is derived from it too.
  const isProviderMapPhase = useMemo(
    () =>
      sheetPhase === MAP_SHEET_PHASES.PROVIDER_LIST ||
      sheetPhase === MAP_SHEET_PHASES.PROVIDER_DETAIL,
    [sheetPhase],
  );
  const shouldRenderProviderMarkers = useMemo(
    () => isProviderMapPhase && !!exploreProviderCategory && exploreProviders.length > 0,
    [isProviderMapPhase, exploreProviderCategory, exploreProviders.length],
  );

  // PULLBACK NOTE: Pass 5 — map focus + service-marker derivations extracted
  const {
    mapHospitals,
    mapFocusedHospitalId,
    mapFocusedHospital,
    mapFocusedHospitalCoordinate,
    mapFocusedProviderCoordinate,
    mapFocusedProviderType,
    mapServiceMarkerKind,
    mapServiceMarkerCoordinate,
    mapServiceMarkerHeading,
  } = useMapFocusedState({
    sheetPhase,
    sheetPayload,
    discoveredHospitals,
    historyFocusedHospital,
    historyVisitDetailsVisible,
    activeMapRequest,
    featuredHospital,
    nearestHospital,
    activeLocation,
    selectedProvider,
  });

  // PULLBACK NOTE: MapScreen decomposition Pass 3 — decision handlers extracted
  // Placed after mapFocusedHospital (above) which it depends on
  const {
    handleUseHospital,
    handleConfirmAmbulanceDecision,
    handleConfirmCommitDetails,
    handleConfirmBedDecision,
    handleConfirmCommitTriage,
    handleOpenCommitTriageFromTracking,
    handleAddBedFromTracking,
    handleAddAmbulanceFromTracking,
  } = useMapDecisionHandlers({
    user,
    selectedCare,
    sheetPayload,
    sheetSnapState,
    featuredHospital,
    nearestHospital,
    mapFocusedHospital,
    renderedSnapState,
    activeMapRequest,
    activeBedBooking,
    openAmbulanceDecision,
    openBedDecision,
    openCommitDetails,
    openCommitTriage,
    openCommitPayment,
    closeCommitTriage,
  });

  const isActiveTrackingMap = sheetPhase === MAP_SHEET_PHASES.TRACKING;

  // PULLBACK NOTE: Phase 8 — Pass B: in-flow tracking rating modal lifted here
  // Modal renderer survives sheet phase transitions (was previously inside MapTrackingStageBase)
  // PULLBACK NOTE: VD-2 — openRatingForVisit added: history visit detail "Rate" CTA now
  // routes into the same atom + modal + handlers as the in-flow path.
  const {
    ratingState: trackingRatingState,
    closeRating: closeTrackingRating,
    skipRating: skipTrackingRating,
    submitRating: submitTrackingRating,
    openRatingForVisit,
  } = useTrackingRatingFlow({
    updateVisit,
    showToast,
    stopAmbulanceTrip,
    stopBedBooking,
    visits,
    onAfterResolution: refreshVisits,
    onAfterSubmit: useCallback(
      ({ visitId }) => {
        if (!visitId || !selectedHistoryVisitKey) return;
        const updatedItem = visits.find(
          (v) => v.id === visitId || v.requestId === visitId,
        );
        // PULLBACK NOTE: PASS 19H — Visit Detail Return Respects Source
        // OLD: openVisitDetail called without sourceSurface
        // NEW: pass "explore" as default sourceSurface for rating reopen
        if (updatedItem) openVisitDetail?.(updatedItem, null, "explore");
      },
      [openVisitDetail, selectedHistoryVisitKey, visits],
    ),
  });

  // PULLBACK NOTE: MapScreen decomposition Pass 7 — route handlers extracted
  // MUST be called AFTER useTrackingRatingFlow because it depends on openRatingForVisit
  const {
    routeMapSheet,
    routeVisitKey,
    routeHistoryFilter,
    isRouteManagedRecentVisits,
    handleProfileSignOut,
    handleBookVisitFromCare,
    handleRateHistoryVisit,
    handleOpenLocationSheet,
    handleOpenLocationIntentFromSearch,
    handleCloseRecentVisits,
    handleRouteManagedHistoryFilterChange,
  } = useMapRouteHandlers({
    params,
    logout,
    clearCommitFlow,
    router,
    setCareHistoryVisible,
    setRecentVisitsVisible,
    setSheetPhase,
    setSheetPayload,
    sheetPhase,
    sheetSnapState,
    selectedHistoryVisit,
    selectedHistoryVisitKey,
    openRatingForVisit,
    closeHistoryVisitDetails,
    openHistoryVisitByKey,
    visits,
    visitsLoading,
    locationControl,
    showToast,
  });

  const recentVisitsModalVisible =
    recentVisitsVisible || isRouteManagedRecentVisits;

  const hasFocusedSheetPhase = sheetPhase !== MAP_SHEET_PHASES.EXPLORE_INTENT;

  // PULLBACK NOTE: UX-A — MapTopLeftControl back-nav expanded to authenticated users in decision phases
  // OLD: visible only for unauthenticated users in EXPLORE_INTENT
  // NEW: visible for authenticated users in AMBULANCE_DECISION, BED_DECISION, HOSPITAL_LIST, HOSPITAL_DETAIL
  //      Hidden entirely in commit + tracking phases (COMMIT_PAYMENT excluded — WAITING_APPROVAL lock)
  const isDecisionPhase =
    sheetPhase === MAP_SHEET_PHASES.AMBULANCE_DECISION ||
    sheetPhase === MAP_SHEET_PHASES.BED_DECISION ||
    sheetPhase === MAP_SHEET_PHASES.HOSPITAL_LIST ||
    sheetPhase === MAP_SHEET_PHASES.HOSPITAL_DETAIL;

  // PULLBACK NOTE: Pass 4 — tracking route reconciliation extracted to useMapTrackingSync
  const { trackingRouteInfo, setTrackingRouteInfo, trackingTimeline } =
    useMapTrackingSync({
      activeAmbulanceTrip,
      patchActiveAmbulanceTrip,
      activeRequestKey: activeMapRequest?.requestId || null,
      isTrackingMapActive: sheetPhase === MAP_SHEET_PHASES.TRACKING,
      trackingKind:
        activeMapRequest?.kind ||
        (activeAmbulanceTrip?.requestId ? "ambulance" : null),
    });

  const shouldShowMapControls = usesSidebarLayout
    ? !hasActiveMapModal && !hasFocusedSheetPhase
    : renderedSnapState !== MAP_SHEET_SNAP_STATES.EXPANDED &&
      !hasActiveMapModal &&
      !hasFocusedSheetPhase;

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
        trackingRouteCoordinates={
          Array.isArray(activeAmbulanceTrip?.route) &&
          activeAmbulanceTrip.route.length >= 2
            ? activeAmbulanceTrip.route
            : trackingRouteInfo?.coordinates
        }
        telemetryHealth={ambulanceTelemetryHealth}
        placeLabel={currentLocationDetails?.primaryText}
        interactive={isMapFrameReady}
        onReadinessChange={handleMapReadinessChange}
        onRouteInfoChange={setTrackingRouteInfo}
        activeTracking={isActiveTrackingMap}
        trackingTimeline={
          activeAmbulanceTrip?.requestId ? trackingTimeline : null
        }
        onUserLocationPress={handleOpenLocationSheet}
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
        onLocationChromePress={handleOpenLocationSheet}
        showInternalSkeleton={false}
        extraMarkers={
          // PULLBACK NOTE: EXP-7 — provider marker render gate
          // OLD: condition was exploreProviderCategory && exploreProviders.length > 0
          //      — would render providers even in EXPLORE_INTENT if atoms were stale
          // NEW: gate additionally on sheetPhase being a provider phase so hospitals
          //      and providers never coexist on the map at the same time.
          //      shouldRenderProviderMarkers is a derived useMemo, NOT a useEffect.
          shouldRenderProviderMarkers ? (
            <ProviderMarkers
              providers={exploreProviders}
              selectedProviderId={exploreProviderId}
              onProviderPress={handleSelectExploreProvider}
            />
          ) : null
        }
        extraPolylines={null}
        suppressHospitalMarkers={
          // PULLBACK NOTE: EXP-7 — fix transition gap: hospitals hidden ONLY after providers are ready
          // OLD: isProviderMapPhase alone → hospitals disappear immediately on tap, before query resolves
          //      → blank-map gap of ~200–800ms while TanStack fetches
          // NEW: isProviderMapPhase && shouldRenderProviderMarkers
          //      → hospitals stay visible during the network round-trip, then swap atomically
          //      → providers appear and hospitals disappear in the same render frame (no gap)
          isProviderMapPhase && shouldRenderProviderMarkers
        }
        focusedCoordinate={mapFocusedProviderCoordinate}
        focusedProviderType={mapFocusedProviderType}
        sheetPhase={sheetPhase}
      />

      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <MapSheetOrchestrator
          phase={sheetPhase}
          mode={sheetMode}
          snapState={renderedSnapState}
          screenHeight={height}
          summaryHospital={nearestSummaryHospital}
          summaryHospitalMeta={nearestSummaryHospitalMeta}
          nearestHospital={nearestHospital}
          nearestHospitalMeta={nearestHospitalMeta}
          selectedCare={selectedCare}
          onOpenSearch={(nextMode, options) =>
            openSearchSheet(
              nextMode ||
                (locationControl?.requiresLocationSelection
                  ? MAP_SEARCH_SHEET_MODES.LOCATION
                  : MAP_SEARCH_SHEET_MODES.SEARCH),
              options,
            )
          }
          onOpenHospitals={openHospitalList}
          onChooseCare={handleChooseCare}
          onOpenProfile={handleOpenProfile}
          onOpenCareHistory={() => setCareHistoryVisible(true)}
          onOpenAmbulanceHospitals={openAmbulanceHospitalList}
          onOpenBedHospitals={openBedHospitalList}
          onOpenRecents={() => setRecentVisitsVisible(true)}
          // PULLBACK NOTE: PASS 19H — pass sourceSurface="explore" when opening from explore intent surface
          onSelectHistoryItem={(historyItem) => handleSelectHistoryItem(historyItem, "explore")}
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
          onCloseProviderDetail={handleCloseProviderDetail}
          onCloseProviderList={handleCloseProviderList}
          onSelectProvider={handleSelectExploreProvider}
          exploreProviderCategory={exploreProviderCategory}
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
          onCloseLocationIntent={() => {
            const returnPhase = sheetPayload?.sourcePhase;
            const returnPayload = sheetPayload?.sourcePayload || null;
            // PULLBACK NOTE: UX-E Issue 11 — miniProfile is a modal, not a sheet phase
            // Re-open the profile modal so the user returns to mini profile on LocationSheet close
            if (returnPhase === "miniProfile") {
              setSheetPayload(null);
              setSheetPhase(MAP_SHEET_PHASES.EXPLORE_INTENT);
              setTimeout(() => setProfileModalVisible(true), 120);
              return;
            }
            if (
              returnPhase &&
              returnPhase !== MAP_SHEET_PHASES.SEARCH &&
              returnPhase !== MAP_SHEET_PHASES.LOCATION_INTENT
            ) {
              setSheetPayload(returnPayload);
              setSheetPhase(returnPhase);
              return;
            }
            setSheetPayload(null);
            setSheetPhase(MAP_SHEET_PHASES.EXPLORE_INTENT);
          }}
          onOpenLocationIntent={handleOpenLocationIntentFromSearch}
          searchMode={searchSheetMode}
          hospitals={discoveredHospitals}
          selectedHospitalId={mapFocusedHospitalId}
          recommendedHospitalId={trueNearestHospital?.id || null}
          featuredHospital={featuredHospital}
          sheetPayload={sheetPayload}
          activeMapRequest={activeMapRequest}
          trackingRouteInfo={trackingRouteInfo}
          trackingHeaderActionRequest={trackingHeaderActionRequest}
          onConsumeTrackingHeaderActionRequest={
            clearTrackingHeaderActionRequest
          }
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
          locationControl={locationControl}
          onSelectHospital={handleSelectHospital}
          onUseCurrentLocation={handleUseCurrentLocation}
          onSelectLocation={handleSearchLocation}
          onChangeHospitalLocation={() => {
            closeHospitalList();
            setSheetPayload({
              sourcePhase: MAP_SHEET_PHASES.HOSPITAL_LIST,
              sourceSnapState: renderedSnapState,
              sourcePayload: null,
            });
            setSheetPhase(MAP_SHEET_PHASES.LOCATION_INTENT);
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

      {/* PULLBACK NOTE: MapScreen decomposition Pass 8 — modal orchestrator extracted */}
      <MapModalOrchestrator
        profileModalVisible={profileModalVisible}
        guestProfileVisible={guestProfileVisible}
        careHistoryVisible={careHistoryVisible}
        recentVisitsModalVisible={recentVisitsModalVisible}
        usesSidebarLayout={usesSidebarLayout}
        setProfileModalVisible={setProfileModalVisible}
        setGuestProfileVisible={setGuestProfileVisible}
        setCareHistoryVisible={setCareHistoryVisible}
        setRecentVisitsVisible={setRecentVisitsVisible}
        handleProfileSignOut={handleProfileSignOut}
        handleChooseCare={handleChooseCare}
        handleExploreCare={handleExploreCare}
        handleBookVisitFromCare={handleBookVisitFromCare}
        handleSelectHistoryItem={handleSelectHistoryItem}
        handleBookVisitFromHistory={handleBookVisitFromHistory}
        handleOpenChooseCareFromHistory={handleOpenChooseCareFromHistory}
        handleCloseRecentVisits={handleCloseRecentVisits}
        handleRouteManagedHistoryFilterChange={handleRouteManagedHistoryFilterChange}
        isSignedIn={isSignedIn}
        isRouteManagedRecentVisits={isRouteManagedRecentVisits}
        routeHistoryFilter={routeHistoryFilter}
        historyPaymentState={historyPaymentState}
        closeHistoryPaymentDetails={closeHistoryPaymentDetails}
        recoveredRatingState={recoveredRatingState}
        closeRecoveredRating={closeRecoveredRating}
        handleSkipRecoveredRating={handleSkipRecoveredRating}
        handleSubmitRecoveredRating={handleSubmitRecoveredRating}
        trackingRatingState={trackingRatingState}
        closeTrackingRating={closeTrackingRating}
        skipTrackingRating={skipTrackingRating}
        submitTrackingRating={submitTrackingRating}
        onOpenLocationIntent={handleOpenLocationIntentFromSearch}
      />


      {/* PULLBACK NOTE: UX-A — MapTopLeftControl phase-aware visibility */}
      {/* Unauthenticated: back chevron in EXPLORE_INTENT only */}
      {/* Authenticated: back chevron in decision phases; hidden in commit + tracking */}
      <MapTopLeftControl
        isSignedIn={isSignedIn}
        isDecisionPhase={isDecisionPhase}
        profileImageSource={profileImageSource}
        onBack={isSignedIn ? closeAmbulanceDecision : () => router.replace("/(auth)/")}
        onOpenProfile={handleOpenProfile}
        visible={
          !mapLoadingState?.visible &&
          (!isSignedIn
            ? !hasFocusedSheetPhase
            : isDecisionPhase)
        }
        usesSidebarLayout={usesSidebarLayout}
        sidebarOcclusionWidth={sidebarOcclusionWidth}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});

import React, { useCallback, useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
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

  // PULLBACK NOTE: Pass 5 — map focus + service-marker derivations extracted
  const {
    mapHospitals,
    mapFocusedHospitalId,
    mapFocusedHospital,
    mapFocusedHospitalCoordinate,
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

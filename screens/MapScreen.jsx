import React, { useCallback, useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { Alert, Linking, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import useAuthViewport from "../hooks/ui/useAuthViewport";
import EmergencyLocationPreviewMap from "../components/emergency/intake/EmergencyLocationPreviewMap";
import MiniProfileModal from "../components/emergency/MiniProfileModal";
import { ServiceRatingModal } from "../components/emergency/ServiceRatingModal";

import MapSheetOrchestrator, {
  MAP_SHEET_PHASES,
  MAP_SHEET_SNAP_STATES,
} from "../components/map/core/MapSheetOrchestrator";
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
  const routeVisitKeyFailureRef = useRef(null);
  const routeMapSheet =
    typeof params?.mapSheet === "string"
      ? params.mapSheet
      : Array.isArray(params?.mapSheet)
        ? params.mapSheet[0]
        : null;
  const routeVisitKey =
    typeof params?.visitKey === "string"
      ? params.visitKey
      : Array.isArray(params?.visitKey)
        ? params.visitKey[0]
        : null;
  const routeHistoryFilter =
    typeof params?.historyFilter === "string"
      ? params.historyFilter
      : Array.isArray(params?.historyFilter)
        ? params.historyFilter[0]
        : null;
  const isRouteManagedRecentVisits = routeMapSheet === "recent_visits";
  const recentVisitsModalVisible =
    recentVisitsVisible || isRouteManagedRecentVisits;

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

  // Booking flow is temporarily bridged to the legacy full-screen route while the
  // sheet-native Pass 12 booking rebuild is in progress. When the rebuild lands,
  // this handler will reopen the map-owned booking sheet with clean state.
  const handleBookVisitFromCare = useCallback(() => {
    setCareHistoryVisible(false);
    router.push("/(user)/(stacks)/book-visit");
  }, [router, setCareHistoryVisible]);

  const hasFocusedSheetPhase = sheetPhase !== MAP_SHEET_PHASES.EXPLORE_INTENT;

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

  // PULLBACK NOTE: Pass 5 — map focus + service-marker derivations extracted to useMapFocusedState
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

  // PULLBACK NOTE: Pass 3 — decision handlers extracted to useMapDecisionHandlers
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
        if (updatedItem) openVisitDetail?.(updatedItem);
      },
      [openVisitDetail, selectedHistoryVisitKey, visits],
    ),
  });

  const handleRateHistoryVisit = useCallback(() => {
    if (!selectedHistoryVisit?.id || !selectedHistoryVisit?.canRate) return;
    // PULLBACK NOTE: VD-2 — consolidated into single rating path via openRatingForVisit.
    // completionCommitted: true so neither skipRating nor submitRating tries to stop a trip.
    openRatingForVisit(selectedHistoryVisit);
    closeHistoryVisitDetails();
  }, [closeHistoryVisitDetails, openRatingForVisit, selectedHistoryVisit]);

  useEffect(() => {
    const wantsRouteVisitDetail =
      routeMapSheet === "visit_detail" && Boolean(routeVisitKey);
    if (!wantsRouteVisitDetail) {
      routeVisitKeyFailureRef.current = null;
      return;
    }

    if (visitsLoading) return;

    if (
      sheetPhase === MAP_SHEET_PHASES.VISIT_DETAIL &&
      String(selectedHistoryVisitKey || "") === String(routeVisitKey)
    ) {
      routeVisitKeyFailureRef.current = null;
      return;
    }

    const didOpen = openHistoryVisitByKey(routeVisitKey, {
      routeManaged: true,
    });
    if (didOpen) {
      routeVisitKeyFailureRef.current = null;
      return;
    }

    if (routeVisitKeyFailureRef.current === routeVisitKey) return;
    routeVisitKeyFailureRef.current = routeVisitKey;
    router.replace("/(user)");
    showToast("Visit details are not available right now.", "info");
  }, [
    openHistoryVisitByKey,
    routeMapSheet,
    routeVisitKey,
    router,
    selectedHistoryVisitKey,
    sheetPhase,
    showToast,
    visitsLoading,
  ]);

  const handleCloseRecentVisits = useCallback(() => {
    setRecentVisitsVisible(false);
    if (isRouteManagedRecentVisits) {
      router.replace("/(user)");
    }
  }, [isRouteManagedRecentVisits, router, setRecentVisitsVisible]);

  const handleRouteManagedHistoryFilterChange = useCallback(
    (nextFilter) => {
      if (!isRouteManagedRecentVisits) return;

      const nextParams =
        nextFilter && nextFilter !== "all"
          ? {
              mapSheet: "recent_visits",
              historyFilter: nextFilter,
            }
          : {
              mapSheet: "recent_visits",
            };

      router.replace({
        pathname: "/(user)",
        params: nextParams,
      });
    },
    [isRouteManagedRecentVisits, router],
  );

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
        onBookVisit={isSignedIn ? handleBookVisitFromCare : undefined}
      />

      <MapHistoryModal
        visible={recentVisitsModalVisible}
        onClose={handleCloseRecentVisits}
        onSelectVisit={handleSelectHistoryItem}
        onBookVisit={isSignedIn ? handleBookVisitFromHistory : undefined}
        onChooseCare={handleOpenChooseCareFromHistory}
        routeManagedFilterKey={
          isRouteManagedRecentVisits ? routeHistoryFilter : null
        }
        onRouteManagedFilterChange={
          isRouteManagedRecentVisits
            ? handleRouteManagedHistoryFilterChange
            : undefined
        }
      />

      <MapHistoryPaymentModal
        visible={historyPaymentState.visible}
        loading={historyPaymentState.loading}
        paymentRecord={historyPaymentState.paymentRecord}
        onClose={closeHistoryPaymentDetails}
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

      {/* PULLBACK NOTE: MapTopLeftControl hidden for authenticated users */}
      {/* OLD: visible for both auth + unauth (avatar duplicated sheet header TopRow) */}
      {/* NEW: only rendered for unauthenticated users (back-to-welcome chevron) */}
      <MapTopLeftControl
        isSignedIn={isSignedIn}
        profileImageSource={profileImageSource}
        onBack={() => router.replace("/(auth)/")}
        onOpenProfile={handleOpenProfile}
        visible={!isSignedIn && !hasFocusedSheetPhase && !mapLoadingState?.visible}
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

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import useAuthViewport from "../hooks/ui/useAuthViewport";
import EmergencyLocationPreviewMap from "../components/emergency/intake/EmergencyLocationPreviewMap";
import MiniProfileModal from "../components/emergency/MiniProfileModal";

import MapSheetOrchestrator, {
  MAP_SHEET_PHASES,
  MAP_SHEET_SNAP_STATES,
  getMapSheetHeight,
} from "../components/map/core/MapSheetOrchestrator";
import MapGuestProfileModal from "../components/map/MapGuestProfileModal";
import MapCareHistoryModal from "../components/map/MapCareHistoryModal";
import MapExploreLoadingOverlay from "../components/map/surfaces/MapExploreLoadingOverlay";
import MapRecentVisitsModal from "../components/map/MapRecentVisitsModal";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
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
import { getDestinationCoordinate } from "../components/map/surfaces/hospitals/mapHospitalDetail.helpers";
import { calculateBearing } from "../utils/mapUtils";
import { emergencyRequestsService } from "../services/emergencyRequestsService";

function normalizeTrackingRouteCoordinates(route = []) {
  if (!Array.isArray(route)) return [];
  return route
    .map((point) => ({
      latitude: Number(point?.latitude),
      longitude: Number(point?.longitude),
    }))
    .filter(
      (point) =>
        Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
    );
}

function buildRouteSignature(route = []) {
  return normalizeTrackingRouteCoordinates(route)
    .map(
      (point) =>
        `${point.latitude.toFixed(5)}:${point.longitude.toFixed(5)}`,
    )
    .join("|");
}

function hasUsableStartedAt(startedAt) {
  if (Number.isFinite(startedAt)) return true;
  return typeof startedAt === "string" && Number.isFinite(Date.parse(startedAt));
}

export default function MapScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { logout, user } = useAuth();
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
  const hasActiveMapModal =
    profileModalVisible ||
    guestProfileVisible ||
    careHistoryVisible ||
    recentVisitsVisible ||
    authModalVisible;
  const handleProfileSignOut = useCallback(async () => {
    const result = await logout();
    if (result?.success) {
      clearCommitFlow?.();
    }
    return result;
  }, [clearCommitFlow, logout]);
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

      if (selectedCare === "both") {
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
          sourcePhase: MAP_SHEET_PHASES.AMBULANCE_DECISION,
          sourceSnapState: sheetSnapState,
          sourcePayload: null,
        });
        return;
      }

      openCommitDetails(hospital || null, transport || null);
    },
    [
      featuredHospital?.id,
      nearestHospital?.id,
      openCommitDetails,
      openBedDecision,
      openCommitPayment,
      selectedCare,
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
        careIntent,
        savedTransport:
          careIntent === "both" ? sheetPayload?.savedTransport || null : null,
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
          pendingApproval?.requestId ||
          activeAmbulanceTrip?.requestId ||
          activeBedBooking?.requestId ||
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
      activeAmbulanceTrip?.requestId,
      activeBedBooking?.requestId,
      closeCommitTriage,
      featuredHospital?.id,
      nearestHospital?.id,
      openCommitPayment,
      pendingApproval?.requestId,
      sheetPayload,
    ],
  );

  const handleOpenCommitTriageFromTracking = useCallback(
    (trackingPayload = {}) => {
      const targetHospital =
        mapFocusedHospital || featuredHospital || nearestHospital || null;
      if (!targetHospital?.id) return;
      const trackingRequestId =
        trackingPayload?.requestId ||
        pendingApproval?.requestId ||
        activeAmbulanceTrip?.requestId ||
        activeBedBooking?.requestId ||
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
      activeAmbulanceTrip?.requestId,
      activeBedBooking?.requestId,
      featuredHospital,
      mapFocusedHospital,
      nearestHospital,
      openCommitTriage,
      pendingApproval?.requestId,
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

  const paymentPreviewKind = useMemo(() => {
    if (sheetPhase !== MAP_SHEET_PHASES.COMMIT_PAYMENT) return null;
    const hasRoomSelection = Boolean(
      sheetPayload?.room?.id ||
        sheetPayload?.roomId ||
        sheetPayload?.room?.title ||
        sheetPayload?.room?.room_type,
    );
    const hasTransportSelection = Boolean(
      sheetPayload?.transport?.id ||
        sheetPayload?.transport?.title ||
        sheetPayload?.transport?.service_name ||
        sheetPayload?.transport?.service_type,
    );

    if (hasTransportSelection) return "ambulance";
    if (hasRoomSelection) return "bed";
    return null;
  }, [sheetPhase, sheetPayload?.room, sheetPayload?.roomId, sheetPayload?.transport]);

  const mapFocusedHospitalId = useMemo(
    () =>
      activeAmbulanceTrip?.hospitalId ||
      activeBedBooking?.hospitalId ||
      pendingApproval?.hospitalId ||
      (sheetPhase === MAP_SHEET_PHASES.COMMIT_PAYMENT
        ? sheetPayload?.hospital?.id || null
        : null) ||
      nearestHospital?.id ||
      null,
    [
      activeAmbulanceTrip?.hospitalId,
      activeBedBooking?.hospitalId,
      nearestHospital?.id,
      pendingApproval?.hospitalId,
      sheetPhase,
      sheetPayload?.hospital?.id,
    ],
  );

  const mapFocusedHospital = useMemo(
    () =>
      discoveredHospitals.find((item) => item?.id === mapFocusedHospitalId) ||
      featuredHospital ||
      sheetPayload?.hospital ||
      nearestHospital ||
      null,
    [
      discoveredHospitals,
      featuredHospital,
      mapFocusedHospitalId,
      nearestHospital,
      sheetPayload?.hospital,
    ],
  );

  const mapFocusedHospitalCoordinate = useMemo(
    () => getDestinationCoordinate(mapFocusedHospital),
    [mapFocusedHospital],
  );

  const mapServiceMarkerKind = useMemo(() => {
    if (activeAmbulanceTrip?.requestId) return "ambulance";
    if (activeBedBooking?.requestId) return "bed";
    if (pendingApproval?.requestId) {
      return pendingApproval?.serviceType === "bed" ? "bed" : "ambulance";
    }
    if (sheetPhase === MAP_SHEET_PHASES.COMMIT_PAYMENT) {
      return paymentPreviewKind;
    }
    return null;
  }, [
    activeAmbulanceTrip?.requestId,
    activeBedBooking?.requestId,
    paymentPreviewKind,
    pendingApproval?.requestId,
    pendingApproval?.serviceType,
    sheetPhase,
  ]);

  const mapServiceMarkerCoordinate = useMemo(() => {
    if (activeAmbulanceTrip?.currentResponderLocation) {
      return activeAmbulanceTrip.currentResponderLocation;
    }
    if (mapServiceMarkerKind === "ambulance" || mapServiceMarkerKind === "bed") {
      return mapFocusedHospitalCoordinate;
    }
    return null;
  }, [
    activeAmbulanceTrip?.currentResponderLocation,
    mapFocusedHospitalCoordinate,
    mapServiceMarkerKind,
  ]);

  const mapServiceMarkerHeading = useMemo(() => {
    if (Number.isFinite(activeAmbulanceTrip?.currentResponderHeading)) {
      return Number(activeAmbulanceTrip.currentResponderHeading);
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
    activeAmbulanceTrip?.currentResponderHeading,
    activeLocation,
    mapFocusedHospitalCoordinate,
    mapServiceMarkerKind,
  ]);
  const isActiveTrackingMap = sheetPhase === MAP_SHEET_PHASES.TRACKING;
  const trackingRouteCoordinates = useMemo(
    () => normalizeTrackingRouteCoordinates(trackingRouteInfo?.coordinates),
    [trackingRouteInfo?.coordinates],
  );
  const activeTripRouteSignature = useMemo(
    () => buildRouteSignature(activeAmbulanceTrip?.route),
    [activeAmbulanceTrip?.route],
  );
  const trackingRouteSignature = useMemo(
    () => buildRouteSignature(trackingRouteCoordinates),
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
      !isActiveTrackingMap ||
      !activeAmbulanceTrip?.requestId ||
      typeof patchActiveAmbulanceTrip !== "function"
    ) {
      return;
    }

    const updates = {};
    const routeEtaSeconds = Number(trackingRouteInfo?.durationSec);
    const currentEtaSeconds = Number(activeAmbulanceTrip?.etaSeconds);
    const hasPolylineRoute = trackingRouteCoordinates.length >= 2;

    if (
      Number.isFinite(routeEtaSeconds) &&
      routeEtaSeconds > 0 &&
      (!Number.isFinite(currentEtaSeconds) ||
        currentEtaSeconds <= 0 ||
        (hasPolylineRoute && Math.abs(routeEtaSeconds - currentEtaSeconds) > 15))
    ) {
      updates.etaSeconds = routeEtaSeconds;
      updates.estimatedArrival = `${Math.max(1, Math.ceil(routeEtaSeconds / 60))} min`;
      updates.etaSource = "map_route";
    }

    if (!hasUsableStartedAt(activeAmbulanceTrip?.startedAt)) {
      updates.startedAt = Date.now();
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
    isActiveTrackingMap,
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
        hospitals={discoveredHospitals}
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
        trackingTimeline={trackingTimeline}
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
        showMapShortcut={false}
      />

      <MapGuestProfileModal
        visible={guestProfileVisible}
        onClose={() => setGuestProfileVisible(false)}
        onAuthSuccess={() => setGuestProfileVisible(false)}
      />

      <MapCareHistoryModal
        visible={careHistoryVisible}
        onClose={() => setCareHistoryVisible(false)}
        onChooseCare={(mode) => {
          setCareHistoryVisible(false);
          handleChooseCare(mode);
        }}
      />

      <MapRecentVisitsModal
        visible={recentVisitsVisible}
        onClose={() => setRecentVisitsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});

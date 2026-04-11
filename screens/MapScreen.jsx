import React, { useEffect, useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import useAuthViewport from "../hooks/ui/useAuthViewport";
import EmergencyLocationPreviewMap from "../components/emergency/intake/EmergencyLocationPreviewMap";
import MiniProfileModal from "../components/emergency/MiniProfileModal";
import AuthInputModal from "../components/register/AuthInputModal";
import MapSheetOrchestrator, {
	MAP_SHEET_SNAP_STATES,
	getMapSheetHeight,
} from "../components/map/MapSheetOrchestrator";
import MapGuestProfileModal from "../components/map/MapGuestProfileModal";
import MapCareHistoryModal from "../components/map/MapCareHistoryModal";
import MapSearchSheet from "../components/map/MapSearchSheet";
import MapExploreLoadingOverlay from "../components/map/MapExploreLoadingOverlay";
import MapHospitalModal from "../components/map/MapHospitalModal";
import MapHospitalDetailsModal from "../components/map/MapHospitalDetailsModal";
import MapRecentVisitsModal from "../components/map/MapRecentVisitsModal";
import { useTheme } from "../contexts/ThemeContext";
import { useMapExploreFlow } from "../hooks/map/useMapExploreFlow";
import {
	getMapViewportSurfaceConfig,
	getMapViewportVariant,
	isSidebarMapVariant,
} from "../components/map/mapViewportConfig";
import { MAP_SEARCH_SHEET_MODES } from "../components/map/mapSearchSheet.helpers";

export default function MapScreen() {
	const { isDarkMode } = useTheme();
	const { width, height } = useAuthViewport();
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
		handleMapHospitalPress,
		handleMapReadinessChange,
		handleOpenFeaturedHospital,
		handleOpenProfile,
		handleSearchLocation,
		handleSelectHospital,
		handleUseCurrentLocation,
		featuredHospitals,
		hospitalDetailsVisible,
		hospitalModalVisible,
		isMapFrameReady,
		loadingBackgroundImageUri,
		mapLoadingState,
		isSignedIn,
		nearestHospital,
		nearestHospitalMeta,
		nearbyBedHospitals,
		nearbyHospitalCount,
		openSearchSheet,
		closeSearchSheet,
		profileImageSource,
		profileModalVisible,
		recentVisits,
		recentVisitsVisible,
		searchSheetMode,
		searchSheetVisible,
		selectedCare,
		setAuthModalVisible,
		setCareHistoryVisible,
		setGuestProfileEmail,
		setGuestProfileVisible,
		setHospitalDetailsVisible,
		setHospitalModalVisible,
		setProfileModalVisible,
		setRecentVisitsVisible,
		setSheetSnapState,
		sheetMode,
		sheetSnapState,
		totalAvailableBeds,
	} = useMapExploreFlow();
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
		() => (usesSidebarLayout ? 0 : getMapSheetHeight(height, renderedSnapState)),
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
				? sidebarWidth + Math.max(0, Number(surfaceConfig.sidebarOuterInset || 0))
				: 0,
		[sidebarWidth, surfaceConfig.sidebarOuterInset, usesSidebarLayout],
	);
	const hasActiveMapModal =
		searchSheetVisible ||
		hospitalModalVisible ||
		hospitalDetailsVisible ||
		profileModalVisible ||
		guestProfileVisible ||
		careHistoryVisible ||
		recentVisitsVisible ||
		authModalVisible;
	const shouldShowMapControls = usesSidebarLayout
		? !hasActiveMapModal
		: renderedSnapState !== MAP_SHEET_SNAP_STATES.EXPANDED && !hasActiveMapModal;

	useEffect(() => {
		if (usesSidebarLayout && sheetSnapState !== MAP_SHEET_SNAP_STATES.EXPANDED) {
			setSheetSnapState(MAP_SHEET_SNAP_STATES.EXPANDED);
		}
	}, [setSheetSnapState, sheetSnapState, usesSidebarLayout]);

	return (
		<View style={[styles.screen, { backgroundColor: isDarkMode ? "#08101B" : "#EEF3F8" }]}>
			<EmergencyLocationPreviewMap
				location={activeLocation}
				hospitals={discoveredHospitals}
				selectedHospitalId={nearestHospital?.id || null}
				placeLabel={currentLocationDetails?.primaryText}
				interactive={isMapFrameReady}
				onReadinessChange={handleMapReadinessChange}
				bottomSheetHeight={bottomSheetHeight}
				leftPanelWidth={sidebarOcclusionWidth}
				showControls={shouldShowMapControls}
				controlsMode={surfaceConfig.mapControlsMode}
				controlsTopOffset={surfaceConfig.mapControlsTopInset}
				controlsRightOffset={surfaceConfig.mapControlsRightInset}
				controlsBottomOffsetBase={surfaceConfig.mapControlsBottomInsetBase}
				onHospitalPress={handleMapHospitalPress}
				showInternalSkeleton={false}
			/>

			<View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
				<MapSheetOrchestrator
					mode={sheetMode}
					snapState={renderedSnapState}
					screenHeight={height}
					nearestHospital={nearestHospital}
					nearestHospitalMeta={nearestHospitalMeta}
					selectedCare={selectedCare}
					onOpenSearch={() => openSearchSheet(MAP_SEARCH_SHEET_MODES.SEARCH)}
					onOpenHospitals={() => setHospitalModalVisible(true)}
					onChooseCare={handleChooseCare}
					onOpenProfile={handleOpenProfile}
					onOpenCareHistory={() => setCareHistoryVisible(true)}
					onOpenRecents={() => setRecentVisitsVisible(true)}
					onOpenFeaturedHospital={handleOpenFeaturedHospital}
					onSnapStateChange={setSheetSnapState}
					profileImageSource={profileImageSource}
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

			<MapSearchSheet
				visible={searchSheetVisible}
				onClose={closeSearchSheet}
				mode={searchSheetMode}
				hospitals={discoveredHospitals}
				selectedHospitalId={nearestHospital?.id || null}
				currentLocation={currentLocationDetails}
				onOpenHospital={handleOpenFeaturedHospital}
				onBrowseHospitals={() => setHospitalModalVisible(true)}
				onUseCurrentLocation={handleUseCurrentLocation}
				onSelectLocation={handleSearchLocation}
			/>

			<MapHospitalModal
				visible={hospitalModalVisible}
				onClose={() => setHospitalModalVisible(false)}
				hospitals={discoveredHospitals}
				selectedHospitalId={nearestHospital?.id || null}
				recommendedHospitalId={discoveredHospitals?.[0]?.id || null}
				onSelectHospital={handleSelectHospital}
				onChangeLocation={() => {
					setHospitalModalVisible(false);
					openSearchSheet(MAP_SEARCH_SHEET_MODES.LOCATION);
				}}
			/>

			<MapHospitalDetailsModal
				visible={hospitalDetailsVisible}
				onClose={() => setHospitalDetailsVisible(false)}
				hospital={featuredHospital}
				origin={activeLocation}
				onOpenHospitals={() => setHospitalModalVisible(true)}
			/>

			<MiniProfileModal
				visible={profileModalVisible}
				onClose={() => setProfileModalVisible(false)}
			/>

			<MapGuestProfileModal
				visible={guestProfileVisible}
				onClose={() => setGuestProfileVisible(false)}
				emailValue={guestProfileEmail}
				onEmailChange={setGuestProfileEmail}
				onContinue={() => {
					setGuestProfileVisible(false);
					setAuthModalVisible(true);
				}}
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

			<AuthInputModal
				visible={authModalVisible}
				onClose={() => setAuthModalVisible(false)}
				type="email"
				prefillValue={guestProfileEmail}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
});

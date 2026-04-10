import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import useAuthViewport from "../hooks/ui/useAuthViewport";
import EmergencyLocationPreviewMap from "../components/emergency/intake/EmergencyLocationPreviewMap";
import MiniProfileModal from "../components/emergency/MiniProfileModal";
import AuthInputModal from "../components/register/AuthInputModal";
import MapSheetOrchestrator, { getMapSheetHeight } from "../components/map/MapSheetOrchestrator";
import MapGuestProfileModal from "../components/map/MapGuestProfileModal";
import MapCareHistoryModal from "../components/map/MapCareHistoryModal";
import MapPublicSearchModal from "../components/map/MapPublicSearchModal";
import MapExploreLoadingOverlay from "../components/map/MapExploreLoadingOverlay";
import MapHospitalModal from "../components/map/MapHospitalModal";
import MapHospitalDetailsModal from "../components/map/MapHospitalDetailsModal";
import MapLocationModal from "../components/map/MapLocationModal";
import MapRecentVisitsModal from "../components/map/MapRecentVisitsModal";
import { useTheme } from "../contexts/ThemeContext";
import { useMapExploreFlow } from "../hooks/map/useMapExploreFlow";

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
		isMapSurfaceReady,
		mapLoadingState,
		isSignedIn,
		locationSearchVisible,
		nearestHospital,
		nearestHospitalMeta,
		nearbyBedHospitals,
		nearbyHospitalCount,
		profileImageSource,
		profileModalVisible,
		publicSearchVisible,
		recentVisits,
		recentVisitsVisible,
		selectedCare,
		setAuthModalVisible,
		setCareHistoryVisible,
		setGuestProfileEmail,
		setGuestProfileVisible,
		setHospitalDetailsVisible,
		setHospitalModalVisible,
		setLocationSearchVisible,
		setProfileModalVisible,
		setPublicSearchVisible,
		setRecentVisitsVisible,
		setSheetSnapState,
		sheetMode,
		sheetSnapState,
		totalAvailableBeds,
	} = useMapExploreFlow();

	const loadingBackgroundImageUri = useMemo(() => {
		const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
		const latitude = Number(activeLocation?.latitude ?? activeLocation?.coords?.latitude);
		const longitude = Number(activeLocation?.longitude ?? activeLocation?.coords?.longitude);

		if (!token || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
			return null;
		}

		const styleId = isDarkMode ? "navigation-night-v1" : "light-v11";
		const imageWidth = Math.max(360, Math.min(1280, Math.round((width || 390) * 1.4)));
		const imageHeight = Math.max(720, Math.min(1600, Math.round((height || 844) * 1.3)));

		return `https://api.mapbox.com/styles/v1/mapbox/${styleId}/static/${longitude.toFixed(5)},${latitude.toFixed(5)},13.2,0,0/${imageWidth}x${imageHeight}?logo=false&attribution=false&access_token=${encodeURIComponent(token)}`;
	}, [activeLocation, height, isDarkMode, width]);

	return (
		<View style={[styles.screen, { backgroundColor: isDarkMode ? "#08101B" : "#EEF3F8" }]}>
			<EmergencyLocationPreviewMap
				location={activeLocation}
				hospitals={discoveredHospitals}
				selectedHospitalId={nearestHospital?.id || null}
				placeLabel={currentLocationDetails?.primaryText}
				interactive={isMapFrameReady}
				onReadinessChange={handleMapReadinessChange}
				bottomSheetHeight={getMapSheetHeight(height, sheetSnapState)}
				onHospitalPress={handleMapHospitalPress}
				showInternalSkeleton={false}
			/>

			<View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
				<MapSheetOrchestrator
					mode={sheetMode}
					snapState={sheetSnapState}
					screenHeight={height}
					nearestHospital={nearestHospital}
					nearestHospitalMeta={nearestHospitalMeta}
					selectedCare={selectedCare}
					onOpenSearch={() => setPublicSearchVisible(true)}
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
				snapState={sheetSnapState}
				status={mapLoadingState}
				visible={mapLoadingState?.visible}
				backgroundImageUri={loadingBackgroundImageUri}
			/>

			<MapLocationModal
				visible={locationSearchVisible}
				onClose={() => setLocationSearchVisible(false)}
				onUseCurrentLocation={handleUseCurrentLocation}
				onSelectLocation={handleSearchLocation}
				currentLocation={currentLocationDetails}
			/>

			<MapPublicSearchModal
				visible={publicSearchVisible}
				onClose={() => setPublicSearchVisible(false)}
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
					setLocationSearchVisible(true);
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

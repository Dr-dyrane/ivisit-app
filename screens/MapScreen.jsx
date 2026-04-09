import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import useAuthViewport from "../hooks/ui/useAuthViewport";
import { getEmergencyIntakeVariant } from "../components/emergency/intake/EmergencyIntakeOrchestrator";
import EmergencyLocationPreviewMap from "../components/emergency/intake/EmergencyLocationPreviewMap";
import EmergencyHospitalChoiceSheet from "../components/emergency/intake/EmergencyHospitalChoiceSheet";
import EmergencyLocationSearchStageOrchestrator from "../components/emergency/intake/views/locationSearch/EmergencyLocationSearchStageOrchestrator";
import MiniProfileModal from "../components/emergency/MiniProfileModal";
import AuthInputModal from "../components/register/AuthInputModal";
import MapSheetOrchestrator, { getMapSheetHeight } from "../components/map/MapSheetOrchestrator";
import MapGuestProfileModal from "../components/map/MapGuestProfileModal";
import MapCareHistoryModal from "../components/map/MapCareHistoryModal";
import MapPublicSearchModal from "../components/map/MapPublicSearchModal";
import MapExploreLoadingOverlay from "../components/map/MapExploreLoadingOverlay";
import { useTheme } from "../contexts/ThemeContext";
import { useMapExploreFlow } from "../hooks/map/useMapExploreFlow";

export default function MapScreen() {
	const { isDarkMode } = useTheme();
	const { width, height, isWeb } = useAuthViewport();
	const screenVariant = getEmergencyIntakeVariant({
		platform: Platform.OS,
		isWeb,
		width,
	});
	const {
		activeLocation,
		authModalVisible,
		careHistoryVisible,
		currentLocationDetails,
		discoveredHospitals,
		guestProfileEmail,
		guestProfileVisible,
		handleChooseCare,
		handleMapHospitalPress,
		handleMapReadinessChange,
		handleOpenProfile,
		handleSearchLocation,
		handleSelectHospital,
		handleUseCurrentLocation,
		hospitalModalVisible,
		isMapSurfaceReady,
		isSignedIn,
		locationSearchVisible,
		nearestHospital,
		nearestHospitalMeta,
		nearbyBedHospitals,
		nearbyHospitalCount,
		profileImageSource,
		profileModalVisible,
		publicSearchVisible,
		selectedCare,
		setAuthModalVisible,
		setCareHistoryVisible,
		setGuestProfileEmail,
		setGuestProfileVisible,
		setHospitalModalVisible,
		setLocationSearchVisible,
		setProfileModalVisible,
		setPublicSearchVisible,
		sheetMode,
		sheetSnapState,
		totalAvailableBeds,
	} = useMapExploreFlow();

	return (
		<View style={[styles.screen, { backgroundColor: isDarkMode ? "#08101B" : "#EEF3F8" }]}>
			<EmergencyLocationPreviewMap
				location={activeLocation}
				hospitals={discoveredHospitals}
				selectedHospitalId={nearestHospital?.id || null}
				placeLabel={currentLocationDetails?.primaryText}
				interactive={isMapSurfaceReady}
				onReadinessChange={handleMapReadinessChange}
				bottomSheetHeight={getMapSheetHeight(height, sheetSnapState)}
				onHospitalPress={handleMapHospitalPress}
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
					profileImageSource={profileImageSource}
					isSignedIn={isSignedIn}
					nearbyHospitalCount={nearbyHospitalCount}
					totalAvailableBeds={totalAvailableBeds}
					nearbyBedHospitals={nearbyBedHospitals}
				/>
			</View>

			{!isMapSurfaceReady ? (
				<MapExploreLoadingOverlay
					screenHeight={height}
					snapState={sheetSnapState}
				/>
			) : null}

			<EmergencyLocationSearchStageOrchestrator
				variant={screenVariant}
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

			<EmergencyHospitalChoiceSheet
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
				variant={screenVariant}
				statusMessage="Select the best hospital for this location."
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
			/>

			<MapCareHistoryModal
				visible={careHistoryVisible}
				onClose={() => setCareHistoryVisible(false)}
				onChooseCare={(mode) => {
					setCareHistoryVisible(false);
					handleChooseCare(mode);
				}}
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

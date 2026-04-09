import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useGlobalLocation } from "../contexts/GlobalLocationContext";
import { useEmergency } from "../contexts/EmergencyContext";
import useAuthViewport from "../hooks/ui/useAuthViewport";
import { getEmergencyIntakeVariant } from "../components/emergency/intake/EmergencyIntakeOrchestrator";
import EmergencyLocationPreviewMap from "../components/emergency/intake/EmergencyLocationPreviewMap";
import EmergencyHospitalChoiceSheet from "../components/emergency/intake/EmergencyHospitalChoiceSheet";
import EmergencyLocationSearchStageOrchestrator from "../components/emergency/intake/views/locationSearch/EmergencyLocationSearchStageOrchestrator";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import MiniProfileModal from "../components/emergency/MiniProfileModal";
import AuthInputModal from "../components/register/AuthInputModal";
import MapSheetOrchestrator, {
	MAP_SHEET_MODES,
	MAP_SHEET_SNAP_STATES,
	getMapSheetHeight,
} from "../components/map/MapSheetOrchestrator";
import MapGuestProfileModal from "../components/map/MapGuestProfileModal";
import MapCareHistoryModal from "../components/map/MapCareHistoryModal";

function toEmergencyLocation(location) {
	if (!location) return null;
	const latitude = Number(location.latitude);
	const longitude = Number(location.longitude);
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return null;
	}
	return {
		latitude,
		longitude,
		latitudeDelta: 0.04,
		longitudeDelta: 0.04,
	};
}

function formatDistance(hospital) {
	const distanceKm = Number(hospital?.distanceKm);
	if (Number.isFinite(distanceKm) && distanceKm > 0) {
		if (distanceKm < 1) {
			return `${Math.round(distanceKm * 1000)} m away`;
		}
		return `${distanceKm.toFixed(1)} km away`;
	}
	if (typeof hospital?.distance === "string" && hospital.distance.trim()) {
		return hospital.distance.trim();
	}
	return "Nearby";
}

export default function MapScreen() {
	const router = useRouter();
	const { resetHeader } = useScrollAwareHeader();
	const { setHeaderState } = useHeaderState();
	const { isDarkMode } = useTheme();
	const { user } = useAuth();
	const { width, height, isWeb } = useAuthViewport();
	const screenVariant = getEmergencyIntakeVariant({
		platform: Platform.OS,
		isWeb,
		width,
	});
	const {
		userLocation: globalUserLocation,
		locationLabel,
		locationLabelDetail,
		refreshLocation,
	} = useGlobalLocation();
	const {
		hospitals,
		selectedHospitalId,
		selectedHospital,
		selectHospital,
		setUserLocation,
		userLocation: emergencyUserLocation,
	} = useEmergency();
	const [searchVisible, setSearchVisible] = useState(false);
	const [hospitalModalVisible, setHospitalModalVisible] = useState(false);
	const [profileModalVisible, setProfileModalVisible] = useState(false);
	const [guestProfileVisible, setGuestProfileVisible] = useState(false);
	const [careHistoryVisible, setCareHistoryVisible] = useState(false);
	const [authModalVisible, setAuthModalVisible] = useState(false);
	const [selectedCare, setSelectedCare] = useState(null);
	const [manualLocation, setManualLocation] = useState(null);
	const [sheetMode] = useState(MAP_SHEET_MODES.EXPLORE_INTENT);
	const [sheetSnapState] = useState(MAP_SHEET_SNAP_STATES.HALF);

	useFocusEffect(
		useCallback(() => {
			resetHeader();
			return () => {
				setHeaderState({ hidden: true });
			};
		}, [resetHeader, setHeaderState]),
	);

	const activeLocation = manualLocation?.location || emergencyUserLocation || globalUserLocation || null;
	const currentLocationDetails = manualLocation || {
		primaryText: locationLabel || "Current location",
		secondaryText: locationLabelDetail || "",
		location: activeLocation,
	};
	const isSignedIn = Boolean(user?.isLoggedIn || user?.id);
	const profileImageSource = user?.imageUri
		? { uri: user.imageUri }
		: require("../assets/profile.jpg");

	useEffect(() => {
		const shouldHideHeader = sheetSnapState === MAP_SHEET_SNAP_STATES.EXPANDED;
		setHeaderState({
			hidden: shouldHideHeader,
			title: currentLocationDetails?.primaryText || "Current location",
			subtitle: currentLocationDetails?.secondaryText || "YOUR LOCATION",
			backgroundColor: "#86100E",
			rightComponent: false,
			leftComponent: <HeaderBackButton onPress={() => router.replace("/")} />,
			badge: null,
			scrollAware: false,
		});
	}, [
		currentLocationDetails?.primaryText,
		currentLocationDetails?.secondaryText,
		router,
		sheetSnapState,
		setHeaderState,
	]);

	useEffect(() => {
		if (manualLocation?.location) {
			setUserLocation((current) => {
				const nextLocation = toEmergencyLocation(manualLocation.location);
				if (!nextLocation) return current;
				if (
					Number(current?.latitude) === nextLocation.latitude &&
					Number(current?.longitude) === nextLocation.longitude
				) {
					return current;
				}
				return nextLocation;
			});
			return;
		}

		if (!globalUserLocation?.latitude || !globalUserLocation?.longitude) {
			return;
		}

		setUserLocation((current) => {
			const nextLocation = toEmergencyLocation(globalUserLocation);
			if (!nextLocation) return current;
			if (
				Number(current?.latitude) === nextLocation.latitude &&
				Number(current?.longitude) === nextLocation.longitude
			) {
				return current;
			}
			return nextLocation;
		});
	}, [
		globalUserLocation?.latitude,
		globalUserLocation?.longitude,
		manualLocation?.location,
		setUserLocation,
	]);

	useEffect(() => {
		if (!Array.isArray(hospitals) || hospitals.length === 0) return;
		if (selectedHospitalId && hospitals.some((hospital) => hospital?.id === selectedHospitalId)) {
			return;
		}
		if (hospitals[0]?.id) {
			selectHospital(hospitals[0].id);
		}
	}, [hospitals, selectHospital, selectedHospitalId]);

	const nearestHospital = useMemo(() => {
		if (selectedHospital?.id) return selectedHospital;
		return hospitals?.[0] || null;
	}, [hospitals, selectedHospital]);

	const sheetHeight = useMemo(
		() => getMapSheetHeight(height, sheetSnapState),
		[height, sheetSnapState],
	);
	const nearestHospitalDistance = formatDistance(nearestHospital);
	const nearestHospitalMeta = [nearestHospitalDistance].filter(Boolean);
	if (Number.isFinite(Number(nearestHospital?.availableBeds)) && Number(nearestHospital.availableBeds) > 0) {
		nearestHospitalMeta.push(`${nearestHospital.availableBeds} beds`);
	}
	const nearbyHospitalCount = useMemo(
		() => (Array.isArray(hospitals) ? hospitals.filter(Boolean).length : 0),
		[hospitals],
	);
	const totalAvailableBeds = useMemo(
		() =>
			(Array.isArray(hospitals) ? hospitals : []).reduce((sum, hospital) => {
				const availableBeds = Number(hospital?.availableBeds);
				return Number.isFinite(availableBeds) && availableBeds > 0 ? sum + availableBeds : sum;
			}, 0),
		[hospitals],
	);
	const nearbyBedHospitals = useMemo(
		() =>
			(Array.isArray(hospitals) ? hospitals : []).filter((hospital) => {
				const availableBeds = Number(hospital?.availableBeds);
				return Number.isFinite(availableBeds) && availableBeds > 0;
			}).length,
		[hospitals],
	);

	const handleSearchLocation = useCallback((nextLocation) => {
		if (!nextLocation?.location) return;
		setManualLocation(nextLocation);
		setSearchVisible(false);
	}, []);

	const handleUseCurrentLocation = useCallback(async () => {
		setManualLocation(null);
		setSearchVisible(false);
		await refreshLocation?.();
	}, [refreshLocation]);

	const handleSelectHospital = useCallback((hospital) => {
		if (hospital?.id) {
			selectHospital(hospital.id);
		}
		setHospitalModalVisible(false);
	}, [selectHospital]);

	const handleChooseCare = useCallback((mode) => {
		setSelectedCare(mode);
		if (mode === "bed" || mode === "both") {
			setHospitalModalVisible(true);
		}
	}, []);

	const handleMapHospitalPress = useCallback((hospital) => {
		if (hospital?.id) {
			selectHospital(hospital.id);
		}
	}, [selectHospital]);

	const handleOpenProfile = useCallback(() => {
		if (isSignedIn) {
			setProfileModalVisible(true);
			return;
		}
		setGuestProfileVisible(true);
	}, [isSignedIn]);

	return (
		<View style={[styles.screen, { backgroundColor: isDarkMode ? "#08101B" : "#EEF3F8" }]}>
			<EmergencyLocationPreviewMap
				location={activeLocation}
				hospitals={hospitals}
				selectedHospitalId={nearestHospital?.id || null}
				placeLabel={currentLocationDetails?.primaryText}
				interactive
				bottomSheetHeight={sheetHeight}
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
					onOpenSearch={() => setSearchVisible(true)}
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

			<EmergencyLocationSearchStageOrchestrator
				variant={screenVariant}
				visible={searchVisible}
				onClose={() => setSearchVisible(false)}
				onUseCurrentLocation={handleUseCurrentLocation}
				onSelectLocation={handleSearchLocation}
				currentLocation={currentLocationDetails}
			/>

			<EmergencyHospitalChoiceSheet
				visible={hospitalModalVisible}
				onClose={() => setHospitalModalVisible(false)}
				hospitals={hospitals}
				selectedHospitalId={nearestHospital?.id || null}
				recommendedHospitalId={hospitals?.[0]?.id || null}
				onSelectHospital={handleSelectHospital}
				onChangeLocation={() => {
					setHospitalModalVisible(false);
					setSearchVisible(true);
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
				onContinueWithEmail={() => {
					setGuestProfileVisible(false);
					setAuthModalVisible(true);
				}}
			/>

			<MapCareHistoryModal
				visible={careHistoryVisible}
				onClose={() => setCareHistoryVisible(false)}
				onRestoreProfile={() => {
					setCareHistoryVisible(false);
					setAuthModalVisible(true);
				}}
			/>

			<AuthInputModal
				visible={authModalVisible}
				onClose={() => setAuthModalVisible(false)}
				type="email"
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
});

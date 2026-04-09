import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useGlobalLocation } from "../contexts/GlobalLocationContext";
import { useEmergency } from "../contexts/EmergencyContext";
import { useFABActions } from "../contexts/FABContext";
import useAuthViewport from "../hooks/ui/useAuthViewport";
import { getEmergencyIntakeVariant } from "../components/emergency/intake/EmergencyIntakeOrchestrator";
import EmergencyLocationPreviewMap from "../components/emergency/intake/EmergencyLocationPreviewMap";
import EmergencyHospitalChoiceSheet from "../components/emergency/intake/EmergencyHospitalChoiceSheet";
import EmergencyLocationSearchStageOrchestrator from "../components/emergency/intake/views/locationSearch/EmergencyLocationSearchStageOrchestrator";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import HeaderLocationButton from "../components/headers/HeaderLocationButton";
import MiniProfileModal from "../components/emergency/MiniProfileModal";
import AuthInputModal from "../components/register/AuthInputModal";
import MapSheetOrchestrator, {
	MAP_SHEET_MODES,
	MAP_SHEET_SNAP_STATES,
	getMapSheetHeight,
} from "../components/map/MapSheetOrchestrator";
import MapGuestProfileModal from "../components/map/MapGuestProfileModal";
import MapCareHistoryModal from "../components/map/MapCareHistoryModal";
import MapPublicSearchModal from "../components/map/MapPublicSearchModal";

const COUNTRY_SEGMENTS = new Set([
	"united states",
	"united states of america",
	"usa",
	"nigeria",
	"canada",
	"united kingdom",
	"uk",
]);
const ZIP_FRAGMENT_REGEX = /\b\d{4,6}(?:-\d{3,4})?\b/g;

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

function cleanAddressPiece(value) {
	if (typeof value !== "string") return "";
	return value
		.replace(ZIP_FRAGMENT_REGEX, "")
		.replace(/\s{2,}/g, " ")
		.replace(/\s+,/g, ",")
		.trim()
		.replace(/,$/, "")
		.trim();
}

function buildHeaderLocationModel(locationModel) {
	if (!locationModel) {
		return {
			primaryText: "Current location",
			secondaryText: "",
		};
	}

	const primaryText = cleanAddressPiece(locationModel.primaryText) || "Current location";
	const secondaryParts = String(locationModel.secondaryText || "")
		.split(",")
		.map((part) => cleanAddressPiece(part))
		.filter(Boolean)
		.filter((part) => !COUNTRY_SEGMENTS.has(part.toLowerCase()));

	return {
		...locationModel,
		primaryText,
		secondaryText: secondaryParts.join(", "),
	};
}

export default function MapScreen() {
	const router = useRouter();
	const { resetHeader } = useScrollAwareHeader();
	const { setHeaderState } = useHeaderState();
	const { isDarkMode } = useTheme();
	const { user } = useAuth();
	const { registerFAB, unregisterFAB } = useFABActions();
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
	const [locationSearchVisible, setLocationSearchVisible] = useState(false);
	const [hospitalModalVisible, setHospitalModalVisible] = useState(false);
	const [profileModalVisible, setProfileModalVisible] = useState(false);
	const [guestProfileVisible, setGuestProfileVisible] = useState(false);
	const [careHistoryVisible, setCareHistoryVisible] = useState(false);
	const [publicSearchVisible, setPublicSearchVisible] = useState(false);
	const [authModalVisible, setAuthModalVisible] = useState(false);
	const [selectedCare, setSelectedCare] = useState(null);
	const [manualLocation, setManualLocation] = useState(null);
	const [guestProfileEmail, setGuestProfileEmail] = useState("");
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
	const currentLocationDetails = buildHeaderLocationModel(
		manualLocation || {
			primaryText: locationLabel || "Current location",
			secondaryText: locationLabelDetail || "",
			location: activeLocation,
		},
	);
	const isSignedIn = Boolean(user?.isLoggedIn || user?.id);
	const profileImageSource = user?.imageUri
		? { uri: user.imageUri }
		: require("../assets/profile.jpg");

	useEffect(() => {
		const shouldHideHeader = sheetSnapState === MAP_SHEET_SNAP_STATES.EXPANDED;
		setHeaderState({
			hidden: shouldHideHeader,
			title: currentLocationDetails?.primaryText || "Current location",
			subtitle: currentLocationDetails?.secondaryText || "Location",
			backgroundColor: "#86100E",
			rightComponent: <HeaderLocationButton onPress={() => setLocationSearchVisible(true)} />,
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
		setLocationSearchVisible(false);
	}, []);

	const handleUseCurrentLocation = useCallback(async () => {
		setManualLocation(null);
		setLocationSearchVisible(false);
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

	useEffect(() => {
		if (!guestProfileVisible) {
			unregisterFAB("map-guest-profile-continue");
			return undefined;
		}

		registerFAB("map-guest-profile-continue", {
			icon: "arrow-forward",
			label: "Next",
			visible: true,
			style: "primary",
			priority: 40,
			allowInStack: true,
			isFixed: true,
			onPress: () => {
				setGuestProfileVisible(false);
				setAuthModalVisible(true);
			},
		});

		return () => unregisterFAB("map-guest-profile-continue");
	}, [guestProfileVisible, registerFAB, unregisterFAB]);

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
				hospitals={hospitals}
				selectedHospitalId={nearestHospital?.id || null}
				recommendedHospitalId={hospitals?.[0]?.id || null}
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

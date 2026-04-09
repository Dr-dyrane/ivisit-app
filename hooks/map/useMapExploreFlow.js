import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useAuth } from "../../contexts/AuthContext";
import { useGlobalLocation } from "../../contexts/GlobalLocationContext";
import { useEmergency } from "../../contexts/EmergencyContext";
import { useFABActions } from "../../contexts/FABContext";
import { demoEcosystemService } from "../../services/demoEcosystemService";
import {
	buildHeaderLocationModel,
	formatHospitalDistance,
	toEmergencyLocation,
} from "../../utils/map/mapLocationPresentation";
import {
	MAP_SHEET_MODES,
	MAP_SHEET_SNAP_STATES,
} from "../../components/map/MapSheetOrchestrator";
import HeaderBackButton from "../../components/navigation/HeaderBackButton";
import HeaderLocationButton from "../../components/headers/HeaderLocationButton";

function buildDemoBootstrapKey(location, userId) {
	return [
		Number(location?.latitude).toFixed(3),
		Number(location?.longitude).toFixed(3),
		userId || "guest",
	].join(":");
}

export function useMapExploreFlow() {
	const router = useRouter();
	const { resetHeader } = useScrollAwareHeader();
	const { setHeaderState } = useHeaderState();
	const { user } = useAuth();
	const { registerFAB, unregisterFAB } = useFABActions();
	const {
		userLocation: globalUserLocation,
		locationLabel,
		locationLabelDetail,
		refreshLocation,
	} = useGlobalLocation();
	const {
		hospitals,
		allHospitals,
		selectedHospitalId,
		selectedHospital,
		selectHospital,
		setUserLocation,
		userLocation: emergencyUserLocation,
		isLoadingHospitals,
		refreshHospitals,
		effectiveDemoModeEnabled,
		coverageModePreferenceLoaded,
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
	const [sheetMode, setSheetMode] = useState(MAP_SHEET_MODES.EXPLORE_INTENT);
	const [sheetSnapState, setSheetSnapState] = useState(MAP_SHEET_SNAP_STATES.HALF);
	const [mapReadiness, setMapReadiness] = useState({
		mapReady: false,
		routeReady: false,
		isCalculatingRoute: false,
	});
	const [isBootstrappingDemo, setIsBootstrappingDemo] = useState(false);
	const demoBootstrapKeyRef = useRef(null);

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
		: require("../../assets/profile.jpg");
	const discoveredHospitals = useMemo(() => {
		if (Array.isArray(allHospitals) && allHospitals.length > 0) {
			return allHospitals;
		}
		return Array.isArray(hospitals) ? hospitals : [];
	}, [allHospitals, hospitals]);

	useFocusEffect(
		useCallback(() => {
			resetHeader();
			setSheetMode(MAP_SHEET_MODES.EXPLORE_INTENT);
			setSheetSnapState(MAP_SHEET_SNAP_STATES.HALF);
			return () => {
				setHeaderState({ hidden: true });
			};
		}, [resetHeader, setHeaderState]),
	);

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
		if (!Array.isArray(discoveredHospitals) || discoveredHospitals.length === 0) return;
		if (
			selectedHospitalId &&
			discoveredHospitals.some((hospital) => hospital?.id === selectedHospitalId)
		) {
			return;
		}
		if (discoveredHospitals[0]?.id) {
			selectHospital(discoveredHospitals[0].id);
		}
	}, [discoveredHospitals, selectHospital, selectedHospitalId]);

	useEffect(() => {
		let cancelled = false;

		if (!coverageModePreferenceLoaded || !effectiveDemoModeEnabled) {
			return undefined;
		}
		if (!activeLocation?.latitude || !activeLocation?.longitude) {
			return undefined;
		}
		if (isLoadingHospitals || isBootstrappingDemo) {
			return undefined;
		}
		if (Array.isArray(discoveredHospitals) && discoveredHospitals.length > 0) {
			return undefined;
		}

		const bootstrapKey = buildDemoBootstrapKey(activeLocation, user?.id);
		if (demoBootstrapKeyRef.current === bootstrapKey) {
			return undefined;
		}
		demoBootstrapKeyRef.current = bootstrapKey;
		setIsBootstrappingDemo(true);

		(async () => {
			try {
				const provisioningUserId = await demoEcosystemService.getProvisioningUserId(user?.id);
				await demoEcosystemService.ensureDemoEcosystemForLocation({
					userId: provisioningUserId,
					latitude: activeLocation.latitude,
					longitude: activeLocation.longitude,
					radiusKm: 50,
				});
				await refreshHospitals?.();
			} catch (error) {
				console.warn("[useMapExploreFlow] Demo bootstrap skipped for /map", error);
			} finally {
				if (!cancelled) {
					setIsBootstrappingDemo(false);
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [
		activeLocation,
		coverageModePreferenceLoaded,
		discoveredHospitals,
		effectiveDemoModeEnabled,
		isBootstrappingDemo,
		isLoadingHospitals,
		refreshHospitals,
		user?.id,
	]);

	const nearestHospital = useMemo(() => {
		if (selectedHospital?.id) return selectedHospital;
		return discoveredHospitals?.[0] || null;
	}, [discoveredHospitals, selectedHospital]);

	const nearestHospitalDistance = formatHospitalDistance(nearestHospital);
	const nearestHospitalMeta = [nearestHospitalDistance].filter(Boolean);
	if (
		Number.isFinite(Number(nearestHospital?.availableBeds)) &&
		Number(nearestHospital.availableBeds) > 0
	) {
		nearestHospitalMeta.push(`${nearestHospital.availableBeds} beds`);
	}

	const nearbyHospitalCount = useMemo(
		() =>
			Array.isArray(discoveredHospitals) ? discoveredHospitals.filter(Boolean).length : 0,
		[discoveredHospitals],
	);
	const totalAvailableBeds = useMemo(
		() =>
			(Array.isArray(discoveredHospitals) ? discoveredHospitals : []).reduce((sum, hospital) => {
				const availableBeds = Number(hospital?.availableBeds);
				return Number.isFinite(availableBeds) && availableBeds > 0 ? sum + availableBeds : sum;
			}, 0),
		[discoveredHospitals],
	);
	const nearbyBedHospitals = useMemo(
		() =>
			(Array.isArray(discoveredHospitals) ? discoveredHospitals : []).filter((hospital) => {
				const availableBeds = Number(hospital?.availableBeds);
				return Number.isFinite(availableBeds) && availableBeds > 0;
			}).length,
		[discoveredHospitals],
	);

	const handleSearchLocation = useCallback((nextLocation) => {
		if (!nextLocation?.location) return;
		setManualLocation(nextLocation);
		setLocationSearchVisible(false);
		setMapReadiness({
			mapReady: false,
			routeReady: false,
			isCalculatingRoute: false,
		});
	}, []);

	const handleUseCurrentLocation = useCallback(async () => {
		setManualLocation(null);
		setLocationSearchVisible(false);
		setMapReadiness({
			mapReady: false,
			routeReady: false,
			isCalculatingRoute: false,
		});
		await refreshLocation?.();
	}, [refreshLocation]);

	const handleSelectHospital = useCallback(
		(hospital) => {
			if (hospital?.id) {
				selectHospital(hospital.id);
			}
			setHospitalModalVisible(false);
		},
		[selectHospital],
	);

	const handleChooseCare = useCallback((mode) => {
		setSelectedCare(mode);
		if (mode === "bed" || mode === "both") {
			setHospitalModalVisible(true);
		}
	}, []);

	const handleMapHospitalPress = useCallback(
		(hospital) => {
			if (hospital?.id) {
				selectHospital(hospital.id);
			}
		},
		[selectHospital],
	);

	const handleOpenProfile = useCallback(() => {
		if (isSignedIn) {
			setProfileModalVisible(true);
			return;
		}
		setGuestProfileVisible(true);
	}, [isSignedIn]);

	const handleMapReadinessChange = useCallback((nextState) => {
		setMapReadiness((current) => {
			const next = {
				mapReady: Boolean(nextState?.mapReady),
				routeReady: Boolean(nextState?.routeReady),
				isCalculatingRoute: Boolean(nextState?.isCalculatingRoute),
			};
			if (
				current.mapReady === next.mapReady &&
				current.routeReady === next.routeReady &&
				current.isCalculatingRoute === next.isCalculatingRoute
			) {
				return current;
			}
			return next;
		});
	}, []);

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

	const expectsRoute = Boolean(activeLocation?.latitude && activeLocation?.longitude && nearestHospital?.id);
	const isMapSurfaceReady =
		Boolean(activeLocation?.latitude && activeLocation?.longitude) &&
		!isLoadingHospitals &&
		!isBootstrappingDemo &&
		mapReadiness.mapReady &&
		(!expectsRoute || mapReadiness.routeReady);

	return {
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
		isBootstrappingDemo,
		isLoadingHospitals,
		isMapSurfaceReady,
		isSignedIn,
		locationSearchVisible,
		manualLocation,
		mapReadiness,
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
		setSheetMode,
		setSheetSnapState,
		sheetMode,
		sheetSnapState,
		totalAvailableBeds,
	};
}

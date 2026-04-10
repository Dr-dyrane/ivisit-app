import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useGlobalLocation } from "../../contexts/GlobalLocationContext";
import { useEmergency } from "../../contexts/EmergencyContext";
import { useFABActions } from "../../contexts/FABContext";
import { useVisits } from "../../contexts/VisitsContext";
import { demoEcosystemService } from "../../services/demoEcosystemService";
import { coverageModeService, COVERAGE_STATUS } from "../../services/coverageModeService";
import {
	buildHeaderLocationModel,
	formatHospitalDistance,
	toEmergencyLocation,
} from "../../utils/map/mapLocationPresentation";
import {
	MAP_SHEET_MODES,
	MAP_SHEET_SNAP_STATES,
} from "../../components/map/MapSheetOrchestrator";
import {
	getMapViewportVariant,
	isSidebarMapVariant,
} from "../../components/map/mapViewportConfig";
import { HEADER_MODES } from "../../constants/header";
import HeaderBackButton from "../../components/navigation/HeaderBackButton";
import HeaderLocationButton from "../../components/headers/HeaderLocationButton";

function buildDemoBootstrapKey(location, userId, coverageStatus, shouldForceBootstrap) {
	return [
		Number(location?.latitude).toFixed(3),
		Number(location?.longitude).toFixed(3),
		userId || "guest",
		coverageStatus || "unknown",
		shouldForceBootstrap ? "force" : "auto",
	].join(":");
}

export function useMapExploreFlow() {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const { width, height } = useWindowDimensions();
	const viewportVariant = useMemo(
		() => getMapViewportVariant({ platform: Platform.OS, width }),
		[width],
	);
	const usesSidebarLayout = useMemo(
		() => isSidebarMapVariant(viewportVariant),
		[viewportVariant],
	);
	const { resetHeader, lockHeaderHidden, unlockHeaderHidden, forceHeaderVisible } = useScrollAwareHeader();
	const { setHeaderState, resetHeaderState } = useHeaderState();
	const { user } = useAuth();
	const { visits = [] } = useVisits();
	const { registerFAB, unregisterFAB } = useFABActions();
	const {
		userLocation: globalUserLocation,
		locationLabel,
		locationLabelDetail,
		refreshLocation,
		isLoadingLocation,
		isResolvingPlaceName,
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
		coverageStatus,
		hasDemoHospitalsNearby,
	} = useEmergency();

	const [locationSearchVisible, setLocationSearchVisible] = useState(false);
	const [hospitalModalVisible, setHospitalModalVisible] = useState(false);
	const [hospitalDetailsVisible, setHospitalDetailsVisible] = useState(false);
	const [profileModalVisible, setProfileModalVisible] = useState(false);
	const [guestProfileVisible, setGuestProfileVisible] = useState(false);
	const [careHistoryVisible, setCareHistoryVisible] = useState(false);
	const [recentVisitsVisible, setRecentVisitsVisible] = useState(false);
	const [publicSearchVisible, setPublicSearchVisible] = useState(false);
	const [authModalVisible, setAuthModalVisible] = useState(false);
	const [selectedCare, setSelectedCare] = useState(null);
	const [manualLocation, setManualLocation] = useState(null);
	const [guestProfileEmail, setGuestProfileEmail] = useState("");
	const [featuredHospital, setFeaturedHospital] = useState(null);
	const [sheetMode, setSheetMode] = useState(MAP_SHEET_MODES.EXPLORE_INTENT);
	const [sheetSnapState, setSheetSnapState] = useState(() =>
		usesSidebarLayout ? MAP_SHEET_SNAP_STATES.EXPANDED : MAP_SHEET_SNAP_STATES.HALF,
	);
	const [mapReadiness, setMapReadiness] = useState({
		mapReady: false,
		routeReady: false,
		isCalculatingRoute: false,
	});
	const [isBootstrappingDemo, setIsBootstrappingDemo] = useState(false);
	const [hasCompletedInitialMapLoad, setHasCompletedInitialMapLoad] = useState(false);
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
	const isModalFocused = Boolean(
		locationSearchVisible ||
		hospitalModalVisible ||
		hospitalDetailsVisible ||
		profileModalVisible ||
		guestProfileVisible ||
		careHistoryVisible ||
		recentVisitsVisible ||
		publicSearchVisible ||
		authModalVisible,
	);
	const shouldHideMapHeader =
		!hasCompletedInitialMapLoad ||
		(!usesSidebarLayout && sheetSnapState === MAP_SHEET_SNAP_STATES.EXPANDED) ||
		isModalFocused;
	const profileImageSource = user?.imageUri
		? { uri: user.imageUri }
		: require("../../assets/profile.jpg");
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
	const needsCoverageExpansion = coverageModeService.needsDemoSupport(coverageStatus);
	const shouldBootstrapDemoCoverage = coverageModeService.shouldBootstrapDemo({
		coverageStatus,
		hasDemoHospitalsNearby,
	});
	const discoveredHospitals = useMemo(() => {
		if (Array.isArray(allHospitals) && allHospitals.length > 0) {
			return allHospitals;
		}
		return Array.isArray(hospitals) ? hospitals : [];
	}, [allHospitals, hospitals]);

	const mapHeaderState = useMemo(
		() => ({
			mode: shouldHideMapHeader ? HEADER_MODES.HIDDEN : HEADER_MODES.MAP_OVERLAY,
			title: currentLocationDetails?.primaryText || "Current location",
			subtitle: currentLocationDetails?.secondaryText || "Location",
			backgroundColor: "#86100E",
			rightComponent: <HeaderLocationButton onPress={() => setLocationSearchVisible(true)} />,
			leftComponent: <HeaderBackButton onPress={() => router.replace("/")} />,
			badge: null,
			hidden: shouldHideMapHeader,
			scrollAware: false,
		}),
		[
			currentLocationDetails?.primaryText,
			currentLocationDetails?.secondaryText,
			router,
			setLocationSearchVisible,
			shouldHideMapHeader,
		],
	);

	useFocusEffect(
		useCallback(() => {
			resetHeader();
			unlockHeaderHidden();
			forceHeaderVisible();
			resetHeaderState();
			setSheetMode(MAP_SHEET_MODES.EXPLORE_INTENT);
			setSheetSnapState(
				usesSidebarLayout ? MAP_SHEET_SNAP_STATES.EXPANDED : MAP_SHEET_SNAP_STATES.HALF,
			);
			return () => {
				unlockHeaderHidden();
				forceHeaderVisible();
				resetHeader();
				resetHeaderState();
			};
		}, [
			forceHeaderVisible,
			resetHeader,
			resetHeaderState,
			setSheetMode,
			setSheetSnapState,
			unlockHeaderHidden,
			usesSidebarLayout,
		]),
	);

	useEffect(() => {
		if (mapHeaderState.mode === HEADER_MODES.HIDDEN) {
			lockHeaderHidden();
		} else {
			unlockHeaderHidden();
			forceHeaderVisible();
		}

		setHeaderState(mapHeaderState);
	}, [
		forceHeaderVisible,
		lockHeaderHidden,
		mapHeaderState,
		setHeaderState,
		unlockHeaderHidden,
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
		if (!shouldBootstrapDemoCoverage) {
			return undefined;
		}

		const shouldForceDemoBootstrap = !hasDemoHospitalsNearby;
		const bootstrapKey = buildDemoBootstrapKey(
			activeLocation,
			user?.id,
			coverageStatus,
			shouldForceDemoBootstrap,
		);
		if (demoBootstrapKeyRef.current === bootstrapKey) {
			return undefined;
		}
		demoBootstrapKeyRef.current = bootstrapKey;
		setIsBootstrappingDemo(true);

		(async () => {
			try {
				const provisioningUserId = await demoEcosystemService.getProvisioningUserId(user?.id);
				const bootstrapResult = await demoEcosystemService.ensureDemoEcosystemForLocation({
					userId: provisioningUserId,
					latitude: activeLocation.latitude,
					longitude: activeLocation.longitude,
					radiusKm: 50,
					force: shouldForceDemoBootstrap,
				});
				await refreshHospitals?.();

				if (!bootstrapResult?.bootstrapped && shouldForceDemoBootstrap) {
					demoBootstrapKeyRef.current = null;
				}
			} catch (error) {
				demoBootstrapKeyRef.current = null;
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
		coverageStatus,
		effectiveDemoModeEnabled,
		hasDemoHospitalsNearby,
		isBootstrappingDemo,
		shouldBootstrapDemoCoverage,
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
	const recentVisits = useMemo(
		() => (Array.isArray(visits) ? visits.slice(0, 3) : []),
		[visits],
	);
	const featuredHospitals = useMemo(
		() => (Array.isArray(discoveredHospitals) ? discoveredHospitals.slice(0, 6) : []),
		[discoveredHospitals],
	);

	const handleSearchLocation = useCallback((nextLocation) => {
		if (!nextLocation?.location) return;
		setHasCompletedInitialMapLoad(false);
		setManualLocation(nextLocation);
		setLocationSearchVisible(false);
		setMapReadiness({
			mapReady: false,
			routeReady: false,
			isCalculatingRoute: false,
		});
	}, []);

	const handleUseCurrentLocation = useCallback(async () => {
		setHasCompletedInitialMapLoad(false);
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

	const handleOpenFeaturedHospital = useCallback(
		(hospital) => {
			if (hospital?.id) {
				selectHospital(hospital.id);
			}
			setFeaturedHospital(hospital || null);
			setHospitalDetailsVisible(true);
		},
		[selectHospital],
	);

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
		unregisterFAB("map-guest-profile-continue");

		if (!guestProfileVisible || Platform.OS === "web") {
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

	const hasActiveLocation = Boolean(activeLocation?.latitude && activeLocation?.longitude);
	const hasResolvedProviders = Array.isArray(discoveredHospitals) && discoveredHospitals.length > 0;
	const expectsRoute = Boolean(activeLocation?.latitude && activeLocation?.longitude && nearestHospital?.id);
	const isMapFrameReady = hasActiveLocation && mapReadiness.mapReady;
	const isBackgroundCoverageLoading =
		needsCoverageExpansion && (isLoadingHospitals || isBootstrappingDemo);
	const isBackgroundRouteLoading =
		expectsRoute && (mapReadiness.isCalculatingRoute || !mapReadiness.routeReady);
	const isMapSurfaceReady = isMapFrameReady;

	useEffect(() => {
		if (isMapFrameReady && !hasCompletedInitialMapLoad) {
			setHasCompletedInitialMapLoad(true);
		}
	}, [hasCompletedInitialMapLoad, isMapFrameReady]);

	const shouldShowMapLoadingOverlay = !hasCompletedInitialMapLoad;
	const mapLoadingState = useMemo(() => {
		let title = "Preparing help";
		let message = "";

		if (!hasActiveLocation) {
			title = "Locating you";
			message = "Nearby help";
		} else if (isResolvingPlaceName) {
			title = "Naming area";
			message = "Current location";
		} else if (!coverageModePreferenceLoaded) {
			title = "Preparing coverage";
			message = "Nearby rules";
		} else if (isLoadingHospitals) {
			title = "Nearby care";
			message = "Checking options";
		} else if (isBootstrappingDemo) {
			title = "Expanding options";
			message = "Building fuller coverage";
		} else if (!mapReadiness.mapReady) {
			title = "Loading map";
			message = "Live surface";
		} else if (expectsRoute && mapReadiness.isCalculatingRoute) {
			title = "Routing";
			message = "Fastest path";
		} else if (expectsRoute && !mapReadiness.routeReady) {
			title = "Final touches";
			message = "Emergency view";
		} else if (!hasResolvedProviders) {
			title = "Finishing nearby help";
			message = "More options loading";
		}

		return {
			visible: shouldShowMapLoadingOverlay,
			title,
			message,
			steps: [
				{
					key: "location",
					label: "Location",
					status: hasActiveLocation ? "done" : isLoadingLocation ? "active" : "pending",
				},
				{
					key: "providers",
					label: "Nearby care",
					status: hasResolvedProviders && !isBackgroundCoverageLoading
						? "done"
						: isBackgroundCoverageLoading || !coverageModePreferenceLoaded
							? "active"
							: "pending",
				},
				{
					key: "map",
					label: "Map + route",
					status: isMapFrameReady && !isBackgroundRouteLoading
						? "done"
						: mapReadiness.mapReady || mapReadiness.isCalculatingRoute || mapReadiness.routeReady
							? "active"
							: "pending",
				},
			],
		};
	}, [
		coverageModePreferenceLoaded,
		hasActiveLocation,
		hasCompletedInitialMapLoad,
		hasResolvedProviders,
		isBackgroundCoverageLoading,
		isBackgroundRouteLoading,
		isBootstrappingDemo,
		isLoadingHospitals,
		isLoadingLocation,
		isMapSurfaceReady,
		isResolvingPlaceName,
		mapReadiness.isCalculatingRoute,
		mapReadiness.mapReady,
		mapReadiness.routeReady,
		expectsRoute,
		shouldShowMapLoadingOverlay,
	]);

	return {
		activeLocation,
		authModalVisible,
		careHistoryVisible,
		currentLocationDetails,
		discoveredHospitals,
		guestProfileEmail,
		guestProfileVisible,
		handleChooseCare,
		featuredHospital,
		handleMapHospitalPress,
		handleMapReadinessChange,
		handleOpenFeaturedHospital,
		handleOpenProfile,
		handleSearchLocation,
		handleSelectHospital,
		handleUseCurrentLocation,
		hospitalDetailsVisible,
		hospitalModalVisible,
		isBootstrappingDemo,
		isLoadingHospitals,
		isMapFrameReady,
		isMapSurfaceReady,
		isSignedIn,
		locationSearchVisible,
		loadingBackgroundImageUri,
		manualLocation,
		mapLoadingState,
		mapReadiness,
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
		setSheetMode,
		setSheetSnapState,
		sheetMode,
		sheetSnapState,
		featuredHospitals,
		totalAvailableBeds,
	};
}

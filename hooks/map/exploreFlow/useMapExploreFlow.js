import { useCallback, useEffect, useMemo } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { useFocusEffect } from "expo-router";
import { useHeaderState } from "../../../contexts/HeaderStateContext";
import { useScrollAwareHeader } from "../../../contexts/ScrollAwareHeaderContext";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { useGlobalLocation } from "../../../contexts/GlobalLocationContext";
import { useEmergency } from "../../../contexts/EmergencyContext";
import { useVisits } from "../../../contexts/VisitsContext";
import { coverageModeService } from "../../../services/coverageModeService";
import {
	buildHeaderLocationModel,
	toEmergencyLocation,
} from "../../../utils/map/mapLocationPresentation";
import {
	MAP_SHEET_PHASES,
	MAP_SHEET_SNAP_STATES,
} from "../../../components/map/core/MapSheetOrchestrator";
import {
	getMapViewportVariant,
	isSidebarMapVariant,
} from "../../../components/map/core/mapViewportConfig";
import { MAP_SEARCH_SHEET_MODES } from "../../../components/map/surfaces/search/mapSearchSheet.helpers";
import { HEADER_MODES } from "../../../constants/header";
import { hasMeaningfulLocationChange } from "./mapExploreFlow.helpers";
import {
	getDiscoveredHospitals,
	getFeaturedHospitals,
	getNearbyBedHospitals,
	getNearbyHospitalCount,
	getNearestHospital,
	getNearestHospitalMeta,
	getRecentVisits,
	getTotalAvailableBeds,
} from "./mapExploreFlow.derived";
import { buildMapLoadingState } from "./mapExploreFlow.loading";
import { useMapExploreDemoBootstrap } from "./useMapExploreDemoBootstrap";
import { useMapExploreGuestProfileFab } from "./useMapExploreGuestProfileFab";
import { useMapExploreFlowStore } from "../state/mapExploreFlow.store";

export function useMapExploreFlow() {
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
		nearbyCoverageCounts,
		hasDemoHospitalsNearby,
		hasComfortableNearbyCoverage,
	} = useEmergency();

	const {
		state: flowState,
		actions: flowActions,
	} = useMapExploreFlowStore({ usesSidebarLayout });
	const searchSheetVisible = flowState.sheet.phase === MAP_SHEET_PHASES.SEARCH;
	const searchSheetMode = flowState.search.mode;
	const hospitalListVisible = flowState.sheet.phase === MAP_SHEET_PHASES.HOSPITAL_LIST;
	const hospitalDetailVisible = flowState.sheet.phase === MAP_SHEET_PHASES.HOSPITAL_DETAIL;
	const ambulanceDecisionVisible =
		flowState.sheet.phase === MAP_SHEET_PHASES.AMBULANCE_DECISION;
	const bedDecisionVisible =
		flowState.sheet.phase === MAP_SHEET_PHASES.BED_DECISION;
	const serviceDetailVisible = flowState.sheet.phase === MAP_SHEET_PHASES.SERVICE_DETAIL;
	const profileModalVisible = flowState.surfaces.profileModalVisible;
	const guestProfileVisible = flowState.surfaces.guestProfileVisible;
	const careHistoryVisible = flowState.surfaces.careHistoryVisible;
	const recentVisitsVisible = flowState.surfaces.recentVisitsVisible;
	const authModalVisible = flowState.surfaces.authModalVisible;
	const selectedCare = flowState.selection.selectedCare;
	const featuredHospital = flowState.selection.featuredHospital;
	const serviceSelectionsByHospital = flowState.selection.serviceSelectionsByHospital;
	const manualLocation = flowState.location.manualLocation;
	const guestProfileEmail = flowState.location.guestProfileEmail;
	const sheetPhase = flowState.sheet.phase;
	const sheetMode = sheetPhase;
	const sheetSnapState = flowState.sheet.snapState;
	const sheetPayload = flowState.sheet.payload;
	const mapReadiness = flowState.map.readiness;
	const hasCompletedInitialMapLoad = flowState.map.hasCompletedInitialMapLoad;
	const {
		resetExplorePresentation,
		setAuthModalVisible,
		setCareHistoryVisible,
		setFeaturedHospital,
		setHospitalServiceSelection: setHospitalServiceSelectionValue,
		setGuestProfileEmail,
		setGuestProfileVisible,
		setManualLocation,
		setMapReadiness,
		setHasCompletedInitialMapLoad,
		setProfileModalVisible,
		setRecentVisitsVisible,
		setSearchSheetMode,
		setSelectedCare,
		setSheetPayload,
		setSheetMode,
		setSheetPhase,
		setSheetSnapState,
		setSheetView,
	} = flowActions;

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
		: require("../../../assets/profile.jpg");
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
		nearbyCoverageCounts,
		hasDemoHospitalsNearby,
	});
	const discoveredHospitals = useMemo(() => {
		return getDiscoveredHospitals(allHospitals, hospitals);
	}, [allHospitals, hospitals]);
	const isBootstrappingDemo = useMapExploreDemoBootstrap({
		activeLocation,
		coverageModePreferenceLoaded,
		coverageStatus,
		effectiveDemoModeEnabled,
		hasComfortableNearbyCoverage,
		isLoadingHospitals,
		nearbyCoverageCounts,
		refreshHospitals,
		shouldBootstrapDemoCoverage,
		userId: user?.id,
	});

	useFocusEffect(
		useCallback(() => {
			resetHeader();
			resetHeaderState();
			lockHeaderHidden();
			setHeaderState({
				mode: HEADER_MODES.HIDDEN,
				hidden: true,
				scrollAware: false,
			});
			resetExplorePresentation();
			return () => {
				unlockHeaderHidden();
				forceHeaderVisible();
				resetHeader();
				resetHeaderState();
			};
		}, [
			forceHeaderVisible,
			lockHeaderHidden,
			resetHeader,
			resetHeaderState,
			resetExplorePresentation,
			setHeaderState,
			unlockHeaderHidden,
		]),
	);

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

	const nearestHospital = useMemo(() => {
		return getNearestHospital(selectedHospital, discoveredHospitals);
	}, [discoveredHospitals, selectedHospital]);

	const nearestHospitalMeta = useMemo(
		() => getNearestHospitalMeta(nearestHospital),
		[nearestHospital],
	);

	const nearbyHospitalCount = useMemo(
		() => getNearbyHospitalCount(discoveredHospitals),
		[discoveredHospitals],
	);
	const totalAvailableBeds = useMemo(
		() => getTotalAvailableBeds(discoveredHospitals),
		[discoveredHospitals],
	);
	const nearbyBedHospitals = useMemo(
		() => getNearbyBedHospitals(discoveredHospitals),
		[discoveredHospitals],
	);
	const recentVisits = useMemo(() => getRecentVisits(visits), [visits]);
	const featuredHospitals = useMemo(
		() => getFeaturedHospitals(discoveredHospitals),
		[discoveredHospitals],
	);
	const defaultExploreSnapState = usesSidebarLayout
		? MAP_SHEET_SNAP_STATES.EXPANDED
		: MAP_SHEET_SNAP_STATES.HALF;

	const openSearchSheet = useCallback(
		(nextMode = MAP_SEARCH_SHEET_MODES.SEARCH) => {
			setSearchSheetMode(nextMode);
			setSheetView({
				phase: MAP_SHEET_PHASES.SEARCH,
				snapState: MAP_SHEET_SNAP_STATES.EXPANDED,
				payload: null,
			});
		},
		[
			setSearchSheetMode,
			setSheetView,
		],
	);

	const closeSearchSheet = useCallback(() => {
		setSheetView({
			phase: MAP_SHEET_PHASES.EXPLORE_INTENT,
			snapState: defaultExploreSnapState,
			payload: null,
		});
	}, [defaultExploreSnapState, setSheetView]);

	const openHospitalList = useCallback(() => {
		setSheetView({
			phase: MAP_SHEET_PHASES.HOSPITAL_LIST,
			snapState: MAP_SHEET_SNAP_STATES.EXPANDED,
			payload: null,
		});
	}, [setSheetView]);

	const openAmbulanceDecision = useCallback(
		(nextHospital = null) => {
			const targetHospital =
				nextHospital ||
				selectedHospital ||
				featuredHospital ||
				nearestHospital ||
				discoveredHospitals?.[0] ||
				null;

			if (targetHospital?.id) {
				selectHospital(targetHospital.id);
				setFeaturedHospital(targetHospital);
			}

			setSheetView({
				phase: MAP_SHEET_PHASES.AMBULANCE_DECISION,
				snapState: defaultExploreSnapState,
				payload: null,
			});
		},
		[
			defaultExploreSnapState,
			discoveredHospitals,
			featuredHospital,
			nearestHospital,
			selectHospital,
			selectedHospital,
			setFeaturedHospital,
			setSheetView,
		],
	);

	const openAmbulanceHospitalList = useCallback(() => {
		setSheetView({
			phase: MAP_SHEET_PHASES.HOSPITAL_LIST,
			snapState: MAP_SHEET_SNAP_STATES.EXPANDED,
			payload: {
				sourcePhase: MAP_SHEET_PHASES.AMBULANCE_DECISION,
				sourceSnapState: sheetSnapState || defaultExploreSnapState,
				sourcePayload: null,
			},
		});
	}, [defaultExploreSnapState, setSheetView, sheetSnapState]);

	const openBedDecision = useCallback(
		(nextHospital = null, careIntent = "bed", payload = null) => {
			const targetHospital =
				nextHospital ||
				selectedHospital ||
				featuredHospital ||
				nearestHospital ||
				discoveredHospitals?.[0] ||
				null;

			if (targetHospital?.id) {
				selectHospital(targetHospital.id);
				setFeaturedHospital(targetHospital);
			}

			setSheetView({
				phase: MAP_SHEET_PHASES.BED_DECISION,
				snapState: defaultExploreSnapState,
				payload: {
					careIntent,
					...(payload && typeof payload === "object" ? payload : {}),
				},
			});
		},
		[
			defaultExploreSnapState,
			discoveredHospitals,
			featuredHospital,
			nearestHospital,
			selectHospital,
			selectedHospital,
			setFeaturedHospital,
			setSheetView,
		],
	);

	const openBedHospitalList = useCallback(() => {
		setSheetView({
			phase: MAP_SHEET_PHASES.HOSPITAL_LIST,
			snapState: MAP_SHEET_SNAP_STATES.EXPANDED,
			payload: {
				sourcePhase: MAP_SHEET_PHASES.BED_DECISION,
				sourceSnapState: sheetSnapState || defaultExploreSnapState,
				sourcePayload: {
					careIntent: sheetPayload?.careIntent === "both" ? "both" : "bed",
					savedTransport:
						sheetPayload?.careIntent === "both"
							? sheetPayload?.savedTransport || null
							: null,
				},
			},
		});
	}, [
		defaultExploreSnapState,
		setSheetView,
		sheetPayload?.careIntent,
		sheetSnapState,
	]);

	const closeHospitalList = useCallback(() => {
		if (
			sheetPayload?.sourcePhase === MAP_SHEET_PHASES.AMBULANCE_DECISION ||
			sheetPayload?.sourcePhase === MAP_SHEET_PHASES.BED_DECISION
		) {
			setSheetView({
				phase: sheetPayload?.sourcePhase,
				snapState: sheetPayload?.sourceSnapState || defaultExploreSnapState,
				payload: sheetPayload?.sourcePayload || null,
			});
			return;
		}

		setSheetView({
			phase: MAP_SHEET_PHASES.EXPLORE_INTENT,
			snapState: defaultExploreSnapState,
			payload: null,
		});
	}, [
		defaultExploreSnapState,
		setSheetView,
		sheetPayload?.sourcePhase,
		sheetPayload?.sourcePayload,
		sheetPayload?.sourceSnapState,
	]);

	const openHospitalDetail = useCallback(
		(hospital) => {
			if (hospital) {
				setFeaturedHospital(hospital);
			}
			setSheetView({
				phase: MAP_SHEET_PHASES.HOSPITAL_DETAIL,
				snapState: usesSidebarLayout
					? MAP_SHEET_SNAP_STATES.EXPANDED
					: MAP_SHEET_SNAP_STATES.HALF,
				payload: null,
			});
		},
		[setFeaturedHospital, setSheetView, usesSidebarLayout],
	);

	const closeHospitalDetail = useCallback(() => {
		setSheetView({
			phase: MAP_SHEET_PHASES.EXPLORE_INTENT,
			snapState: defaultExploreSnapState,
			payload: null,
		});
	}, [defaultExploreSnapState, setSheetView]);

	const closeAmbulanceDecision = useCallback(() => {
		setSheetView({
			phase: MAP_SHEET_PHASES.EXPLORE_INTENT,
			snapState: defaultExploreSnapState,
			payload: null,
		});
	}, [defaultExploreSnapState, setSheetView]);

	const closeBedDecision = useCallback(() => {
		setSheetView({
			phase: MAP_SHEET_PHASES.EXPLORE_INTENT,
			snapState: defaultExploreSnapState,
			payload: null,
		});
	}, [defaultExploreSnapState, setSheetView]);

	const setHospitalServiceSelection = useCallback(
		(hospitalId, key, value) => {
			if (!hospitalId || !key) return;
			setHospitalServiceSelectionValue(hospitalId, key, value);
		},
		[setHospitalServiceSelectionValue],
	);

	const openServiceDetail = useCallback(
		({
			hospital,
			service,
			serviceType,
			serviceItems = [],
			sourcePhase = MAP_SHEET_PHASES.HOSPITAL_DETAIL,
			sourceSnapState = sheetSnapState,
			sourcePayload = null,
		}) => {
			if (!hospital || !service || !serviceType) return;
			setFeaturedHospital(hospital);
			setSheetView({
				phase: MAP_SHEET_PHASES.SERVICE_DETAIL,
				snapState: MAP_SHEET_SNAP_STATES.EXPANDED,
				payload: {
					hospital,
					service,
					serviceType,
					serviceItems: Array.isArray(serviceItems) ? serviceItems : [],
					sourcePhase,
					sourceSnapState,
					sourcePayload,
				},
			});
		},
		[setFeaturedHospital, setSheetView, sheetSnapState],
	);

	const changeServiceDetailService = useCallback(
		(nextService) => {
			if (!nextService || !sheetPayload) return;
			setSheetPayload({
				...sheetPayload,
				service: nextService,
			});
		},
		[setSheetPayload, sheetPayload],
	);

	const closeServiceDetail = useCallback(() => {
		const sourcePhase = sheetPayload?.sourcePhase || MAP_SHEET_PHASES.HOSPITAL_DETAIL;
		const sourceSnapState =
			sheetPayload?.sourceSnapState ||
			(usesSidebarLayout
				? MAP_SHEET_SNAP_STATES.EXPANDED
				: MAP_SHEET_SNAP_STATES.HALF);
		const sourceHospital = sheetPayload?.hospital || featuredHospital || null;
		if (sourceHospital) {
			setFeaturedHospital(sourceHospital);
		}
		setSheetView({
			phase: sourcePhase,
			snapState: sourceSnapState,
			payload: sheetPayload?.sourcePayload || null,
		});
	}, [featuredHospital, setFeaturedHospital, setSheetView, sheetPayload, usesSidebarLayout]);

	const confirmServiceDetail = useCallback(() => {
		const hospitalId = sheetPayload?.hospital?.id;
		const service = sheetPayload?.service;
		const serviceType = sheetPayload?.serviceType;
		if (!hospitalId || !service || !serviceType) {
			closeServiceDetail();
			return;
		}
		const selectedItemId = service.id || service.title || `${serviceType}-selected`;
		if (serviceType === "room") {
			setHospitalServiceSelection(hospitalId, "roomServiceId", selectedItemId);
		} else {
			setHospitalServiceSelection(hospitalId, "ambulanceServiceId", selectedItemId);
		}
		closeServiceDetail();
	}, [closeServiceDetail, setHospitalServiceSelection, sheetPayload]);

	const handleSearchLocation = useCallback(
		(nextLocation) => {
			if (!nextLocation?.location) return;
			const locationChanged = hasMeaningfulLocationChange(activeLocation, nextLocation.location);
			if (locationChanged) {
				setHasCompletedInitialMapLoad(false);
			}
			setManualLocation(nextLocation);
			setSheetPhase(MAP_SHEET_PHASES.EXPLORE_INTENT);
			if (locationChanged) {
				setMapReadiness({
					mapReady: false,
					routeReady: false,
					isCalculatingRoute: false,
				});
			}
		},
		[
			activeLocation,
			setHasCompletedInitialMapLoad,
			setManualLocation,
			setMapReadiness,
			setSheetPhase,
		],
	);

	const handleUseCurrentLocation = useCallback(async () => {
		const fallbackCurrentLocation = globalUserLocation || emergencyUserLocation || null;
		const locationChanged = manualLocation?.location
			? hasMeaningfulLocationChange(manualLocation.location, fallbackCurrentLocation)
			: false;

		if (locationChanged) {
			setHasCompletedInitialMapLoad(false);
		}
		setManualLocation(null);
		setSheetPhase(MAP_SHEET_PHASES.EXPLORE_INTENT);
		if (locationChanged) {
			setMapReadiness({
				mapReady: false,
				routeReady: false,
				isCalculatingRoute: false,
			});
		}
		await refreshLocation?.();
	}, [
		emergencyUserLocation,
		globalUserLocation,
		manualLocation?.location,
		refreshLocation,
		setHasCompletedInitialMapLoad,
		setManualLocation,
		setMapReadiness,
		setSheetPhase,
	]);

	const handleSelectHospital = useCallback(
		(hospital) => {
			const nextHospitalId = hospital?.id || null;
			const nextCareIntent =
				sheetPayload?.sourcePayload?.careIntent === "both" ? "both" : "bed";
			const savedTransportHospitalId =
				sheetPayload?.sourcePayload?.savedTransport?.hospitalId || null;

			// Transport pricing and availability are hospital-scoped, so step 2 cannot
			// keep showing a saved ambulance choice after the user switches hospitals.
			if (
				sheetPayload?.sourcePhase === MAP_SHEET_PHASES.BED_DECISION &&
				nextCareIntent === "both" &&
				nextHospitalId &&
				savedTransportHospitalId !== nextHospitalId
			) {
				openAmbulanceDecision(hospital);
				return;
			}

			if (hospital?.id) {
				selectHospital(hospital.id);
				setFeaturedHospital(hospital);
			}
			closeHospitalList();
		},
		[
			closeHospitalList,
			openAmbulanceDecision,
			selectHospital,
			setFeaturedHospital,
			sheetPayload?.sourcePhase,
			sheetPayload?.sourcePayload?.careIntent,
			sheetPayload?.sourcePayload?.savedTransport?.hospitalId,
		],
	);

	const handleChooseCare = useCallback(
		(mode) => {
			setSelectedCare(mode);
			if (mode === "ambulance") {
				openAmbulanceDecision();
				return;
			}
			if (mode === "bed") {
				openBedDecision(null, "bed");
				return;
			}
			if (mode === "both") {
				openAmbulanceDecision();
			}
		},
		[openAmbulanceDecision, openBedDecision, setSelectedCare],
	);

	const handleOpenFeaturedHospital = useCallback(
		(hospital) => {
			if (hospital?.id) {
				selectHospital(hospital.id);
			}
			openHospitalDetail(hospital || null);
		},
		[openHospitalDetail, selectHospital],
	);

	const handleCycleFeaturedHospital = useCallback(() => {
		const pool = Array.isArray(discoveredHospitals)
			? discoveredHospitals.filter((entry) => entry?.id)
			: [];
		if (pool.length < 2) return;

		const currentId =
			featuredHospital?.id ??
			selectedHospital?.id ??
			nearestHospital?.id ??
			pool[0]?.id ??
			null;
		const currentIndex = pool.findIndex((entry) => entry?.id === currentId);
		const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % pool.length : 0;
		const nextHospital = pool[nextIndex] ?? null;
		if (!nextHospital?.id) return;

		selectHospital(nextHospital.id);
		setFeaturedHospital(nextHospital);
	}, [
		discoveredHospitals,
		featuredHospital?.id,
		nearestHospital?.id,
		selectedHospital?.id,
		selectHospital,
		setFeaturedHospital,
	]);

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
	}, [isSignedIn, setGuestProfileVisible, setProfileModalVisible]);

	const handleMapReadinessChange = useCallback((nextState) => {
		const next = {
			mapReady: Boolean(nextState?.mapReady),
			routeReady: Boolean(nextState?.routeReady),
			isCalculatingRoute: Boolean(nextState?.isCalculatingRoute),
		};
		if (
			mapReadiness.mapReady === next.mapReady &&
			mapReadiness.routeReady === next.routeReady &&
			mapReadiness.isCalculatingRoute === next.isCalculatingRoute
		) {
			return;
		}
		setMapReadiness(next);
	}, [mapReadiness, setMapReadiness]);

	useMapExploreGuestProfileFab({
		guestProfileVisible,
		onContinue: useCallback(() => {
			setGuestProfileVisible(false);
			setAuthModalVisible(true);
		}, [setAuthModalVisible, setGuestProfileVisible]),
	});

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
	}, [hasCompletedInitialMapLoad, isMapFrameReady, setHasCompletedInitialMapLoad]);

	const shouldShowMapLoadingOverlay = !hasCompletedInitialMapLoad;
	const mapLoadingState = useMemo(() => {
		return buildMapLoadingState({
			coverageModePreferenceLoaded,
			expectsRoute,
			hasActiveLocation,
			hasResolvedProviders,
			isBackgroundCoverageLoading,
			isBackgroundRouteLoading,
			isBootstrappingDemo,
			isLoadingHospitals,
			isLoadingLocation,
			isResolvingPlaceName,
			mapReadiness,
			shouldShowMapLoadingOverlay,
		});
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
		isResolvingPlaceName,
		mapReadiness,
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
		handleCycleFeaturedHospital,
		handleOpenProfile,
		openHospitalDetail,
		openHospitalList,
		openAmbulanceDecision,
		openAmbulanceHospitalList,
		openBedDecision,
		openBedHospitalList,
		openServiceDetail,
		openSearchSheet,
		closeAmbulanceDecision,
		closeBedDecision,
		closeHospitalDetail,
		closeHospitalList,
		closeServiceDetail,
		confirmServiceDetail,
		changeServiceDetailService,
		closeSearchSheet,
		handleSearchLocation,
		handleSelectHospital,
		handleUseCurrentLocation,
		ambulanceDecisionVisible,
		bedDecisionVisible,
		hospitalDetailVisible,
		hospitalListVisible,
		serviceDetailVisible,
		isBootstrappingDemo,
		isLoadingHospitals,
		isMapFrameReady,
		isMapSurfaceReady,
		isSignedIn,
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
		recentVisits,
		recentVisitsVisible,
		searchSheetMode,
		searchSheetVisible,
		selectedCare,
		sheetPhase,
		setAuthModalVisible,
		setCareHistoryVisible,
		setGuestProfileEmail,
		setGuestProfileVisible,
		setProfileModalVisible,
		setRecentVisitsVisible,
		setSheetMode,
		setSheetPayload,
		setSheetSnapState,
		sheetMode,
		sheetPayload,
		sheetSnapState,
		serviceSelectionsByHospital,
		setHospitalServiceSelection,
		featuredHospitals,
		totalAvailableBeds,
	};
}

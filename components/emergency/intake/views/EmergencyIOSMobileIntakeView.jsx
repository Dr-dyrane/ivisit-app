import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Animated,
	InteractionManager,
	Platform,
	Pressable,
	Share,
	ScrollView,
	Text,
	View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useGlobalLocation } from "../../../../contexts/GlobalLocationContext";
import useAuthViewport from "../../../../hooks/ui/useAuthViewport";
import { useMapRoute } from "../../../../hooks/emergency/useMapRoute";
import { useTripProgress } from "../../../../hooks/emergency/useTripProgress";
import mapboxService from "../../../../services/mapboxService";
import { EMERGENCY_FLOW_STATES } from "../../emergencyFlowContent";
import createEmergencyIosMobileIntakeTheme from "../emergencyIosMobileIntake.styles";
import EmergencyHospitalChoiceSheet from "../EmergencyHospitalChoiceSheet";
import EmergencyHospitalRoutePreview from "../EmergencyHospitalRoutePreview";
import { EmergencyMapContainer } from "../../EmergencyMapContainer";
import EmergencyChooseLocationStageOrchestrator from "./chooseLocation/EmergencyChooseLocationStageOrchestrator";
import EmergencyChooseHospitalStageOrchestrator from "./chooseHospital/EmergencyChooseHospitalStageOrchestrator";
import EmergencyLocationSearchStageOrchestrator from "./locationSearch/EmergencyLocationSearchStageOrchestrator";
import {
	logEmergencyDebug,
	summarizeHospitalForDebug,
	summarizeLocationForDebug,
} from "../../../../utils/emergencyDebug";

const HOLD_FINDING_NEARBY_HELP_FOR_REVIEW = false;
const FINDING_STATUS_MESSAGES = [
	"Checking nearby units",
	"Looking for the fastest route",
	"Preparing your request",
];
const FINDING_NEARBY_HELP_MIN_MS = 1300;
const FINDING_NEARBY_HELP_ROUTE_WAIT_MAX_MS = 2600;

function formatEtaText(trip) {
	const etaSeconds = Number(trip?.etaSeconds);
	if (Number.isFinite(etaSeconds) && etaSeconds > 0) {
		return `${Math.max(1, Math.round(etaSeconds / 60))} min`;
	}

	const estimatedArrival = String(trip?.estimatedArrival ?? "").trim();
	if (estimatedArrival.length > 0) {
		return estimatedArrival;
	}

	return "Soon";
}

function getResponderLabel(trip) {
	const assigned = trip?.assignedAmbulance ?? null;
	return (
		assigned?.name ||
		assigned?.callSign ||
		assigned?.vehicleNumber ||
		assigned?.type ||
		trip?.ambulanceType ||
		"Responder assigned"
	);
}

function getResponderContextLabel(trip) {
	return trip?.hospitalName || trip?.serviceType || "Emergency response";
}

function getHospitalPrimaryText(hospital) {
	return hospital?.name || EMERGENCY_FLOW_STATES.proposed_hospital.title;
}

function getHospitalSecondaryText(hospital) {
	const locality = [hospital?.city, hospital?.region].filter(Boolean).join(", ").trim();
	if (locality) return locality;

	const address = [hospital?.streetNumber, hospital?.street].filter(Boolean).join(" ").trim();
	if (address) return address;

	return hospital?.address || hospital?.formattedAddress || "Available nearby";
}

function getHospitalEta(hospital) {
	return hospital?.eta || hospital?.estimatedArrival || "8-12 min";
}

function getHospitalDistance(hospital) {
	return hospital?.distance || (Number.isFinite(Number(hospital?.distanceKm)) ? `${Number(hospital.distanceKm).toFixed(1)} km` : "");
}

function formatRouteEta(routeInfo, fallbackEta) {
	const durationSec = Number(routeInfo?.durationSec);
	if (Number.isFinite(durationSec) && durationSec > 0) {
		if (durationSec < 60) return `${Math.max(1, Math.round(durationSec))} sec`;
		return `${Math.max(1, Math.round(durationSec / 60))} min`;
	}
	return fallbackEta;
}

function getCommittedPhaseState({ matchedTrip, computedStatus, formattedRemaining, telemetryHealth }) {
	const telemetryState = telemetryHealth?.state ?? "inactive";
	const etaLine =
		typeof formattedRemaining === "string" && formattedRemaining.trim().length > 0 && formattedRemaining !== "--"
			? `Responder is ${formattedRemaining} away`
			: "";

	if (String(matchedTrip?.status ?? "").toLowerCase() === "arrived" || computedStatus === "Arrived") {
		return {
			key: "arrived",
			headerTitle: "Help has arrived",
			headerSubtitle: "ARRIVAL",
			title: "Help has arrived",
			support: "Responder has reached your location.",
		};
	}

	if (telemetryState === "lost") {
		return {
			key: EMERGENCY_FLOW_STATES.tracking_arrival.key,
			headerTitle: EMERGENCY_FLOW_STATES.tracking_arrival.title,
			headerSubtitle: "LIVE TRACKING",
			title: EMERGENCY_FLOW_STATES.tracking_arrival.title,
			support: "Tracking signal is weak. We’re still updating.",
		};
	}

	if (telemetryState === "stale") {
		return {
			key: EMERGENCY_FLOW_STATES.tracking_arrival.key,
			headerTitle: EMERGENCY_FLOW_STATES.tracking_arrival.title,
			headerSubtitle: "LIVE TRACKING",
			title: EMERGENCY_FLOW_STATES.tracking_arrival.title,
			support: "Tracking is delayed. We’ll refresh this shortly.",
		};
	}

	if (computedStatus === "Dispatched") {
		return {
			key: EMERGENCY_FLOW_STATES.responder_matched.key,
			headerTitle: EMERGENCY_FLOW_STATES.responder_matched.title,
			headerSubtitle: "RESPONDER MATCHED",
			title: EMERGENCY_FLOW_STATES.responder_matched.title,
			support: EMERGENCY_FLOW_STATES.responder_matched.support,
		};
	}

	if (computedStatus === "Arriving") {
		return {
			key: EMERGENCY_FLOW_STATES.tracking_arrival.key,
			headerTitle: EMERGENCY_FLOW_STATES.tracking_arrival.title,
			headerSubtitle: "LIVE TRACKING",
			title: EMERGENCY_FLOW_STATES.tracking_arrival.title,
			support: "Approaching your location.",
		};
	}

	return {
		key: EMERGENCY_FLOW_STATES.tracking_arrival.key,
		headerTitle: EMERGENCY_FLOW_STATES.tracking_arrival.title,
		headerSubtitle: "LIVE TRACKING",
		title: EMERGENCY_FLOW_STATES.tracking_arrival.title,
		support: etaLine || "We’ll keep this updated until help gets to you.",
	};
}

function getTelemetryChipLabel(telemetryHealth) {
	const state = telemetryHealth?.state ?? "inactive";
	const ageLabel = telemetryHealth?.ageLabel ?? null;
	if (state === "lost") {
		return ageLabel ? `Tracking lost ${ageLabel}` : "Tracking lost";
	}
	if (state === "stale") {
		return ageLabel ? `Tracking delayed ${ageLabel}` : "Tracking delayed";
	}
	return null;
}

function buildAddressModel(place, fallbackLocation = null) {
	if (!place || typeof place !== "object") {
		if (!fallbackLocation) {
			return {
				primaryText: "Finding your location...",
				secondaryText: "",
			};
		}

		return {
			primaryText: "Current location",
			secondaryText: "Using device location",
		};
	}

	const streetAddress = [place.streetNumber, place.street]
		.filter(Boolean)
		.join(" ")
		.trim();
	const primaryText =
		streetAddress ||
		place.street ||
		place.name ||
		place.formattedAddress ||
		place.formatted_address ||
		"Current location";
	const secondaryText = [place.city, place.region]
		.filter(Boolean)
		.join(", ")
		.replace(/\s*\d{5}(-\d{4})?\s*/g, "")
		.trim();

	return { primaryText, secondaryText };
}

function buildAddressModelFromFormattedAddress(formattedAddress, fallbackLocation = null) {
	if (typeof formattedAddress !== "string" || !formattedAddress.trim()) {
		return buildAddressModel(null, fallbackLocation);
	}

	const parts = formattedAddress
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);

	if (parts.length === 0) {
		return buildAddressModel(null, fallbackLocation);
	}

	return {
		primaryText: parts[0] || buildAddressModel(null, fallbackLocation).primaryText,
		secondaryText: parts
			.slice(1)
			.filter((p) => !/^\d{5}/.test(p) && !/united states|usa|us$/i.test(p))
			.slice(0, 2)
			.join(", "),
	};
}

function mergeHospitalOptionList(primaryHospital, hospitals = []) {
	const seen = new Set();
	const merged = [];

	[primaryHospital, ...hospitals].forEach((hospital) => {
		if (!hospital?.id || seen.has(hospital.id)) return;
		seen.add(hospital.id);
		merged.push(hospital);
	});

	return merged;
}

export default function EmergencyIOSMobileIntakeView({
	viewportMode = "phone",
	screenVariant = "ios-mobile",
	onContinue,
	initialSnapshot = null,
	onStateSnapshotChange,
	onHeaderStateChange,
	onBackNavigationChange,
	headerOffset = 0,
	matchedTrip = null,
	ambulanceTelemetryHealth = null,
	recommendedHospital = null,
	alternativeHospitals = [],
	hospitalChoiceState = null,
	allowMatchedPhaseBackNavigation = false,
	onMatchedPhaseBack,
	onRefreshHospitalOptions,
}) {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const {
		isCompactPhone,
		isTablet,
		isDesktop,
		isVeryShortHeight,
		horizontalPadding,
		height,
	} = useAuthViewport();
	const useIosPadLayout = viewportMode === "ios-pad";
	const isAndroidMobile = screenVariant === "android-mobile";
	const isWebMobile = screenVariant === "web-mobile";
	const isWebSmWide = screenVariant === "web-sm-wide";
	const isWebMd = screenVariant === "web-md";
	const isWebLg = screenVariant === "web-lg";
	const isWebXl = screenVariant === "web-xl";
	const isWeb2xl3xl = screenVariant === "web-2xl-3xl";
	const isWebUltraWide = screenVariant === "web-ultra-wide";
	const isWideDesktopWeb =
		isWebLg || isWebXl || isWeb2xl3xl || isWebUltraWide;
	const useTabletLayout = viewportMode === "tablet" || useIosPadLayout || isTablet;
	const useDesktopLayout = viewportMode === "desktop" || isDesktop;
	const chooseLocationVariant =
		screenVariant === "mobile-baseline" ? "ios-mobile" : screenVariant;
	const chooseHospitalVariant =
		screenVariant === "mobile-baseline" ? "ios-mobile" : screenVariant;
	const locationSearchVariant =
		screenVariant === "mobile-baseline" ? "ios-mobile" : screenVariant;
	const {
		userLocation,
		isLoadingLocation,
		locationError,
		refreshLocation,
		resolvedPlace,
		isResolvingPlaceName,
	} = useGlobalLocation();
	const [flowState, setFlowState] = useState(
		initialSnapshot?.flowState || EMERGENCY_FLOW_STATES.request_started.key,
	);
	const [addressModel, setAddressModel] = useState({
		primaryText:
			typeof initialSnapshot?.addressModel?.primaryText === "string"
				? initialSnapshot.addressModel.primaryText
				: "Finding your location...",
		secondaryText:
			typeof initialSnapshot?.addressModel?.secondaryText === "string"
				? initialSnapshot.addressModel.secondaryText
				: "",
	});
	const [searchSheetVisible, setSearchSheetVisible] = useState(false);
	const [hospitalSheetVisible, setHospitalSheetVisible] = useState(false);
	const [sheetFullScreen, setSheetFullScreen] = useState(false);
	const [selectedLocation, setSelectedLocation] = useState(
		initialSnapshot?.selectedLocation ?? null,
	);
	const [selectedHospital, setSelectedHospital] = useState(
		initialSnapshot?.selectedHospital ?? recommendedHospital,
	);
	const [pendingHospitalSelection, setPendingHospitalSelection] = useState(null);
	const [previewRouteInfo, setPreviewRouteInfo] = useState(null);
	const [committedRouteInfo, setCommittedRouteInfo] = useState(null);
	const [routePreviewReady, setRoutePreviewReady] = useState(false);
	const [renderReviewShell, setRenderReviewShell] = useState(false);
	const [renderLocationPreviewBridge, setRenderLocationPreviewBridge] = useState(false);
	const [locationPreviewRenderKey, setLocationPreviewRenderKey] = useState(0);
	const [isRefreshingRoutePreview, setIsRefreshingRoutePreview] = useState(false);
	const [nowMs, setNowMs] = useState(Date.now());
	const selectionInteractionRef = useRef(null);
	const routePreviewRefreshTimeoutRef = useRef(null);
	const snapshotHashRef = useRef("");
	const committedMapRef = useRef(null);
	const scrollViewRef = useRef(null);
	const chooseLocationActionYRef = useRef(0);
	const lastCtaAutoScrollKeyRef = useRef("");
	const { routeCoordinates, routeInfo, isCalculatingRoute, calculateRoute, clearRoute } = useMapRoute();

	const entranceOpacity = useRef(new Animated.Value(0)).current;
	const entranceTranslate = useRef(new Animated.Value(20)).current;
	const pulseScale = useRef(new Animated.Value(1)).current;
	const heroScale = useRef(new Animated.Value(0.94)).current;
	const skeletonOpacity = useRef(new Animated.Value(0.55)).current;
	const continueTimeoutRef = useRef(null);
	const reviewTransition = useRef(new Animated.Value(0)).current;
	const findingGlowOpacity = useRef(new Animated.Value(0.2)).current;
	const findingGlowScale = useRef(new Animated.Value(0.98)).current;
	const findingRailProgress = useRef(new Animated.Value(0)).current;
	const [findingStatusIndex, setFindingStatusIndex] = useState(0);
	const findingStartedAtRef = useRef(0);
	const activeLocation = selectedLocation?.location || userLocation;
	const activeAddressModel = selectedLocation || addressModel;
	const activeProposedHospital =
		pendingHospitalSelection || selectedHospital || recommendedHospital || null;
	const hospitalChoiceStatus =
		hospitalChoiceState?.status ||
		(alternativeHospitals.length > 0 ? "ready" : "empty");
	const hospitalChoiceMessage = hospitalChoiceState?.message || "";
	const hospitalChoiceOptions = useMemo(
		() => mergeHospitalOptionList(activeProposedHospital, alternativeHospitals),
		[activeProposedHospital, alternativeHospitals],
	);
	const routeTargetHospital = activeProposedHospital;
	const routeOriginLatitude = Number(activeLocation?.latitude);
	const routeOriginLongitude = Number(activeLocation?.longitude);
	const routeDestinationLatitude = Number(routeTargetHospital?.coordinates?.latitude);
	const routeDestinationLongitude = Number(routeTargetHospital?.coordinates?.longitude);
	const canCalculatePreviewRoute =
		Number.isFinite(routeOriginLatitude) &&
		Number.isFinite(routeOriginLongitude) &&
		Number.isFinite(routeDestinationLatitude) &&
		Number.isFinite(routeDestinationLongitude);

	const { colors, metrics, ambient, styles } = createEmergencyIosMobileIntakeTheme({
		isDarkMode,
		isCompactPhone,
		isAndroidMobile,
		isWebMobile,
		isWebSmWide,
		isWebMd,
		isTablet: useTabletLayout,
		isIosPad: useIosPadLayout,
		isDesktop: useDesktopLayout,
		isVeryShortHeight,
		horizontalPadding,
		insetsTop: insets?.top || 0,
		insetsBottom: insets?.bottom || 0,
		viewportHeight: height,
		headerOffset,
	});

	useEffect(() => {
		Animated.parallel([
			Animated.timing(entranceOpacity, {
				toValue: 1,
				duration: 260,
				useNativeDriver: true,
			}),
			Animated.spring(entranceTranslate, {
				toValue: 0,
				tension: 48,
				friction: 10,
				useNativeDriver: true,
			}),
			Animated.spring(heroScale, {
				toValue: 1,
				tension: 44,
				friction: 10,
				useNativeDriver: true,
			}),
		]).start();

		const pulse = Animated.loop(
			Animated.sequence([
				Animated.timing(pulseScale, {
					toValue: 1.03,
					duration: 1200,
					useNativeDriver: true,
				}),
				Animated.timing(pulseScale, {
					toValue: 1,
					duration: 1200,
					useNativeDriver: true,
				}),
			]),
		);
		const skeletonPulse = Animated.loop(
			Animated.sequence([
				Animated.timing(skeletonOpacity, {
					toValue: 0.85,
					duration: 950,
					useNativeDriver: true,
				}),
				Animated.timing(skeletonOpacity, {
					toValue: 0.52,
					duration: 950,
					useNativeDriver: true,
				}),
			]),
		);
		pulse.start();
		skeletonPulse.start();

		return () => {
			pulse.stop();
			skeletonPulse.stop();
		};
	}, [entranceOpacity, entranceTranslate, heroScale, pulseScale, skeletonOpacity]);

	useEffect(() => {
		return () => {
			if (continueTimeoutRef.current) {
				clearTimeout(continueTimeoutRef.current);
			}
			if (routePreviewRefreshTimeoutRef.current) {
				clearTimeout(routePreviewRefreshTimeoutRef.current);
			}
			selectionInteractionRef.current?.cancel?.();
		};
	}, []);

	useEffect(() => {
		if (!matchedTrip) return undefined;
		setNowMs(Date.now());
		const intervalId = setInterval(() => setNowMs(Date.now()), 1000);
		return () => clearInterval(intervalId);
	}, [matchedTrip]);

	useEffect(() => {
		if (typeof onStateSnapshotChange !== "function") return;

		const snapshot = {
			flowState,
			addressModel,
			selectedLocation,
			selectedHospital: activeProposedHospital,
		};
		const nextHash = JSON.stringify(snapshot);
		if (snapshotHashRef.current === nextHash) return;
		snapshotHashRef.current = nextHash;
		onStateSnapshotChange(snapshot);
	}, [
		activeProposedHospital,
		addressModel,
		flowState,
		onStateSnapshotChange,
		selectedLocation,
	]);

	useEffect(() => {
		if (!recommendedHospital?.id) return;
		setSelectedHospital((prev) => {
			if (prev?.id === recommendedHospital.id) return prev;
			if (!prev?.id) return recommendedHospital;
			const stillVisible = alternativeHospitals.some((item) => item?.id === prev.id);
			return stillVisible ? prev : recommendedHospital;
		});
	}, [alternativeHospitals, recommendedHospital]);

	useEffect(() => {
		setRoutePreviewReady(false);
		setPreviewRouteInfo(null);
	}, [
		routeTargetHospital?.id,
		routeDestinationLatitude,
		routeDestinationLongitude,
		routeOriginLatitude,
		routeOriginLongitude,
	]);

	useEffect(() => {
		if (!canCalculatePreviewRoute) {
			clearRoute();
			return;
		}

		calculateRoute(
			{
				latitude: routeOriginLatitude,
				longitude: routeOriginLongitude,
			},
			{
				latitude: routeDestinationLatitude,
				longitude: routeDestinationLongitude,
			},
		);
	}, [
		canCalculatePreviewRoute,
		calculateRoute,
		clearRoute,
		routeDestinationLatitude,
		routeDestinationLongitude,
		routeOriginLatitude,
		routeOriginLongitude,
	]);

	useEffect(() => {
		setPreviewRouteInfo(routeInfo);
		setRoutePreviewReady(routeCoordinates.length > 1);
	}, [routeCoordinates, routeInfo]);

	useEffect(() => {
		if (!matchedTrip?.requestId) {
			setCommittedRouteInfo(null);
		}
	}, [matchedTrip?.requestId]);

	useEffect(() => {
		if (!isRefreshingRoutePreview || !routePreviewReady) {
			return undefined;
		}

		if (routePreviewRefreshTimeoutRef.current) {
			clearTimeout(routePreviewRefreshTimeoutRef.current);
			routePreviewRefreshTimeoutRef.current = null;
		}

		if (pendingHospitalSelection?.id) {
			logEmergencyDebug("hospital_choice_route_ready", {
				nextHospital: summarizeHospitalForDebug(pendingHospitalSelection),
			});
			setSelectedHospital(pendingHospitalSelection);
			setPendingHospitalSelection(null);
		}
		setIsRefreshingRoutePreview(false);
		return undefined;
	}, [isRefreshingRoutePreview, pendingHospitalSelection, routePreviewReady]);

	useEffect(() => {
		if (!locationError || userLocation || selectedLocation?.location) {
			return;
		}
		setFlowState(EMERGENCY_FLOW_STATES.location_failed.key);
	}, [locationError, selectedLocation?.location, userLocation]);

	useEffect(() => {
		let cancelled = false;

		async function resolveAddress() {
			if (selectedLocation?.primaryText) {
				setAddressModel(selectedLocation);
				return;
			}

			if (!userLocation) {
				setAddressModel({
					primaryText: "Finding your location...",
					secondaryText: "",
				});
				return;
			}

			if (resolvedPlace?.primaryText) {
				setAddressModel({
					...resolvedPlace,
					location: resolvedPlace.location || userLocation,
				});
				return;
			}

			try {
				const formattedAddress = await mapboxService.reverseGeocode(
					Number(userLocation.latitude),
					Number(userLocation.longitude),
				);
				if (cancelled) return;
				if (
					typeof formattedAddress === "string" &&
					formattedAddress.trim() &&
					formattedAddress !== "Unknown Address"
				) {
					setAddressModel(
						buildAddressModelFromFormattedAddress(
							formattedAddress,
							userLocation,
						),
					);
					return;
				}

				const geocode = await Location.reverseGeocodeAsync(userLocation);
				if (cancelled) return;
				const firstPlace = geocode?.[0] || null;
				setAddressModel(buildAddressModel(firstPlace, userLocation));
			} catch (error) {
				if (!cancelled) {
					setAddressModel(buildAddressModel(null, userLocation));
				}
			}
		}

		void resolveAddress();

		return () => {
			cancelled = true;
		};
	}, [resolvedPlace, selectedLocation, userLocation]);

	const currentState = useMemo(
		() =>
			matchedTrip
				? EMERGENCY_FLOW_STATES.responder_matched
				: EMERGENCY_FLOW_STATES[flowState] ||
				  EMERGENCY_FLOW_STATES.request_started,
		[flowState, matchedTrip],
	);
	const { tripProgress, computedStatus, formattedRemaining } = useTripProgress({
		activeAmbulanceTrip: matchedTrip,
		nowMs,
	});
	const isLocationReady = !!activeLocation;
	const hasResolvedAddress = useMemo(() => {
		if (selectedLocation?.primaryText) return true;
		if (resolvedPlace?.primaryText) return true;
		if (!userLocation) return false;
		return (
			typeof addressModel?.primaryText === "string" &&
			addressModel.primaryText.trim().length > 0 &&
			addressModel.primaryText !== "Finding your location..."
		);
	}, [addressModel?.primaryText, resolvedPlace?.primaryText, selectedLocation?.primaryText, userLocation]);
	const isResponderMatched = !!matchedTrip;
	const isFindingNearbyHelp =
		flowState === EMERGENCY_FLOW_STATES.finding_nearby_help.key;
	const isProposedHospital =
		flowState === EMERGENCY_FLOW_STATES.proposed_hospital.key && !isResponderMatched;
	const shouldRenderFindingUi = isFindingNearbyHelp && !isResponderMatched;
	const shouldShowAddressBody =
		!isResponderMatched &&
		hasResolvedAddress &&
		(flowState === EMERGENCY_FLOW_STATES.confirm_location.key || shouldRenderFindingUi);
	const shouldShowLocationSkeleton =
		!isResponderMatched &&
		(flowState === EMERGENCY_FLOW_STATES.request_started.key ||
			(flowState === EMERGENCY_FLOW_STATES.confirm_location.key && !hasResolvedAddress));
	const shouldShowLocationSurface =
		!isResponderMatched &&
		!isProposedHospital &&
		!shouldShowLocationSkeleton &&
		(flowState === EMERGENCY_FLOW_STATES.confirm_location.key || shouldRenderFindingUi);
	const shouldShowLocationPreviewMap =
		!isResponderMatched &&
		!!activeLocation &&
		(shouldShowLocationSurface || renderLocationPreviewBridge);
	const previousShouldShowLocationPreviewMapRef = useRef(false);
	const findingStatusMessage = FINDING_STATUS_MESSAGES[findingStatusIndex] || "";
	const matchedEtaText = useMemo(() => formatEtaText(matchedTrip), [matchedTrip]);
	const matchedResponderLabel = useMemo(() => getResponderLabel(matchedTrip), [matchedTrip]);
	const matchedContextLabel = useMemo(() => getResponderContextLabel(matchedTrip), [matchedTrip]);
	const matchedTelemetryLabel = useMemo(
		() => getTelemetryChipLabel(ambulanceTelemetryHealth),
		[ambulanceTelemetryHealth],
	);
	const proposedHospitalEta = getHospitalEta(activeProposedHospital);
	const proposedHospitalDistance = getHospitalDistance(activeProposedHospital);
	const matchedPhaseState = useMemo(
		() =>
			getCommittedPhaseState({
				matchedTrip,
				computedStatus,
				formattedRemaining,
				telemetryHealth: ambulanceTelemetryHealth,
			}),
		[ambulanceTelemetryHealth, computedStatus, formattedRemaining, matchedTrip],
	);
	const matchedHospitalId = matchedTrip?.hospitalId ?? activeProposedHospital?.id ?? null;
	const matchedHospitals = useMemo(() => {
		if (hospitalChoiceOptions.some((item) => item?.id === matchedHospitalId)) {
			return hospitalChoiceOptions;
		}
		if (
			activeProposedHospital?.id &&
			!hospitalChoiceOptions.some((item) => item?.id === activeProposedHospital.id)
		) {
			return [activeProposedHospital, ...hospitalChoiceOptions];
		}
		return hospitalChoiceOptions;
	}, [activeProposedHospital, hospitalChoiceOptions, matchedHospitalId]);
	const committedEtaText = useMemo(
		() => formatRouteEta(committedRouteInfo, formattedRemaining !== "--" ? formattedRemaining : matchedEtaText),
		[committedRouteInfo, formattedRemaining, matchedEtaText],
	);
	const showMatchedProgressRail =
		Number.isFinite(tripProgress) &&
		tripProgress > 0 &&
		tripProgress < 1 &&
		matchedPhaseState.key !== "arrived";
	const shouldShowReviewShell = renderReviewShell || isProposedHospital;
	const canPhaseBackFromMatched =
		isResponderMatched && allowMatchedPhaseBackNavigation;
	const matchedResponderMeta = useMemo(() => {
		const assigned = matchedTrip?.assignedAmbulance ?? null;
		return [
			assigned?.type || matchedTrip?.ambulanceType || null,
			assigned?.plate || assigned?.vehicleNumber || assigned?.callSign || null,
		]
			.filter(Boolean)
			.join(" • ");
	}, [matchedTrip]);
	const matchedEtaSupportText =
		matchedPhaseState.key === "arrived"
			? "Your responder should be nearby now."
			: matchedPhaseState.key === EMERGENCY_FLOW_STATES.responder_matched.key
				? "A responder has been assigned and is locking the fastest route."
				: "We’ll keep this ETA updated as help gets closer.";
	const matchedNextStepText =
		matchedPhaseState.key === "arrived"
			? "If it’s safe, make yourself visible and be ready to confirm your name."
			: matchedTelemetryLabel
				? "Stay near your phone while dispatch keeps refreshing the route."
				: "Stay near your phone and keep location sharing on if possible.";
	const matchedPhaseSteps = [
		{ key: EMERGENCY_FLOW_STATES.responder_matched.key, label: "Matched" },
		{ key: EMERGENCY_FLOW_STATES.tracking_arrival.key, label: "En route" },
		{ key: "arrived", label: "Arrival" },
	];
	const matchedPhaseStepIndex = Math.max(
		0,
		matchedPhaseSteps.findIndex((step) => step.key === matchedPhaseState.key),
	);

	useEffect(() => {
		if (!isResponderMatched) return;
		const nextCommittedFlowKey =
			matchedPhaseState.key === "arrived"
				? EMERGENCY_FLOW_STATES.tracking_arrival.key
				: matchedPhaseState.key;
		setFlowState((prev) => (prev === nextCommittedFlowKey ? prev : nextCommittedFlowKey));
	}, [isResponderMatched, matchedPhaseState.key]);

	useEffect(() => {
		if (isResponderMatched) {
			reviewTransition.stopAnimation();
			reviewTransition.setValue(0);
			setRenderReviewShell(false);
			setRenderLocationPreviewBridge(false);
			return undefined;
		}

		if (isProposedHospital) {
			setRenderReviewShell(true);
			setRenderLocationPreviewBridge(true);
			Animated.timing(reviewTransition, {
				toValue: 1,
				duration: 320,
				useNativeDriver: true,
			}).start(({ finished }) => {
				if (finished) {
					setRenderLocationPreviewBridge(false);
				}
			});
			return undefined;
		}

		setRenderLocationPreviewBridge(false);
		Animated.timing(reviewTransition, {
			toValue: 0,
			duration: 220,
			useNativeDriver: true,
		}).start(({ finished }) => {
			if (finished) {
				setRenderReviewShell(false);
			}
		});

		return undefined;
	}, [isProposedHospital, isResponderMatched, reviewTransition]);

	useEffect(() => {
		const previewBecameVisible =
			shouldShowLocationPreviewMap && !previousShouldShowLocationPreviewMapRef.current;
		if (previewBecameVisible) {
			setLocationPreviewRenderKey((prev) => prev + 1);
		}
		previousShouldShowLocationPreviewMapRef.current = shouldShowLocationPreviewMap;
	}, [shouldShowLocationPreviewMap]);

	useEffect(() => {
		if (!activeLocation?.latitude || !activeLocation?.longitude) {
			return;
		}
		setLocationPreviewRenderKey((prev) => prev + 1);
	}, [activeLocation?.latitude, activeLocation?.longitude]);

	useEffect(() => {
		if (
			flowState !== EMERGENCY_FLOW_STATES.request_started.key ||
			selectedLocation?.location
		) {
			return undefined;
		}

		if (userLocation && hasResolvedAddress) {
			const timeout = setTimeout(() => {
				setFlowState(EMERGENCY_FLOW_STATES.confirm_location.key);
			}, 900);
			return () => clearTimeout(timeout);
		}

		if (!isLoadingLocation && !userLocation) {
			setFlowState(EMERGENCY_FLOW_STATES.location_failed.key);
		}

		return undefined;
	}, [
		flowState,
		hasResolvedAddress,
		isLoadingLocation,
		selectedLocation?.location,
		userLocation,
	]);

	useEffect(() => {
		const isRecommendedHospitalSelected =
			!!activeProposedHospital?.id &&
			!!recommendedHospital?.id &&
			activeProposedHospital.id === recommendedHospital.id;
		const proposedHospitalHeaderTitle = isRecommendedHospitalSelected
			? "Closest hospital"
			: "Selected hospital";
		const proposedHospitalHeaderSubtitle = proposedHospitalDistance
			? `${proposedHospitalDistance} AWAY`
			: "CHOOSE HOSPITAL";
		const nextHeaderState =
			isResponderMatched
				? {
					title: matchedPhaseState.headerTitle,
					subtitle: matchedPhaseState.headerSubtitle,
				}
				: shouldRenderFindingUi
				? {
					title: "Finding help",
					subtitle: "REQUEST STARTED",
				}
				: hospitalSheetVisible
				? {
					title: "Choose hospital",
					subtitle:
						hospitalChoiceStatus === "loading"
							? "LOADING OPTIONS"
							: hospitalChoiceStatus === "empty"
								? "NO OPTIONS YET"
								: "REVIEW OPTIONS",
				}
				: isProposedHospital
				? {
					title: proposedHospitalHeaderTitle,
					subtitle: proposedHospitalHeaderSubtitle,
				}
				: searchSheetVisible
					? {
						title: "Where are you?",
						subtitle: "SEARCH LOCATION",
					}
					: {
						title: activeAddressModel?.primaryText || "Finding location...",
						subtitle: activeAddressModel?.secondaryText || "",
					};

		onHeaderStateChange?.({ ...nextHeaderState, hidden: sheetFullScreen });
	}, [
		activeProposedHospital?.id,
		hospitalChoiceStatus,
		hospitalSheetVisible,
		isProposedHospital,
		isResponderMatched,
		matchedPhaseState.headerSubtitle,
		matchedPhaseState.headerTitle,
		onHeaderStateChange,
		sheetFullScreen,
		proposedHospitalDistance,
		recommendedHospital?.id,
		searchSheetVisible,
		shouldRenderFindingUi,
		activeAddressModel?.primaryText,
		activeAddressModel?.secondaryText,
	]);
	const handlePhaseBack = useCallback(() => {
		if (hospitalSheetVisible) {
			logEmergencyDebug("phase_back_closes_hospital_sheet", { flowState });
			setHospitalSheetVisible(false);
			return;
		}

		if (searchSheetVisible) {
			logEmergencyDebug("phase_back_closes_location_search", { flowState });
			setSearchSheetVisible(false);
			return;
		}

		if (canPhaseBackFromMatched) {
			logEmergencyDebug("phase_back_to_proposed_hospital_from_matched", {
				from: flowState,
				matchedRequestId: matchedTrip?.requestId ?? null,
				selectedHospital: summarizeHospitalForDebug(activeProposedHospital),
			});
			setFlowState(EMERGENCY_FLOW_STATES.proposed_hospital.key);
			onMatchedPhaseBack?.();
			return;
		}

		if (isProposedHospital || shouldRenderFindingUi) {
			logEmergencyDebug("phase_back_to_confirm_location", {
				from: flowState,
				selectedHospital: summarizeHospitalForDebug(activeProposedHospital),
			});
			setRenderReviewShell(false);
			setFlowState(EMERGENCY_FLOW_STATES.confirm_location.key);
			return;
		}
	}, [
		activeProposedHospital,
		canPhaseBackFromMatched,
		flowState,
		hospitalSheetVisible,
		isProposedHospital,
		matchedTrip?.requestId,
		onMatchedPhaseBack,
		searchSheetVisible,
		shouldRenderFindingUi,
	]);

	useEffect(() => {
		const hasPhaseBackPath =
			hospitalSheetVisible ||
			searchSheetVisible ||
			isProposedHospital ||
			shouldRenderFindingUi ||
			canPhaseBackFromMatched;

		onBackNavigationChange?.(
			hasPhaseBackPath
				? {
						mode: "phase",
						handler: handlePhaseBack,
				  }
				: {
						mode: "exit",
						handler: null,
				  },
		);
	}, [
		canPhaseBackFromMatched,
		handlePhaseBack,
		hospitalSheetVisible,
		isProposedHospital,
		onBackNavigationChange,
		searchSheetVisible,
		shouldRenderFindingUi,
	]);

	useEffect(() => {
		if (!shouldRenderFindingUi) {
			setFindingStatusIndex(0);
			findingGlowOpacity.stopAnimation();
			findingGlowScale.stopAnimation();
			findingRailProgress.stopAnimation();
			findingGlowOpacity.setValue(ambient.findingPulseMinOpacity);
			findingGlowScale.setValue(ambient.findingPulseMinScale);
			findingRailProgress.setValue(0);
			return undefined;
		}

		const glowLoop = Animated.loop(
			Animated.parallel([
				Animated.sequence([
					Animated.timing(findingGlowOpacity, {
						toValue: ambient.findingPulseMaxOpacity,
						duration: 1200,
						useNativeDriver: true,
					}),
					Animated.timing(findingGlowOpacity, {
						toValue: ambient.findingPulseMinOpacity,
						duration: 1200,
						useNativeDriver: true,
					}),
				]),
				Animated.sequence([
					Animated.timing(findingGlowScale, {
						toValue: ambient.findingPulseMaxScale,
						duration: 1200,
						useNativeDriver: true,
					}),
					Animated.timing(findingGlowScale, {
						toValue: ambient.findingPulseMinScale,
						duration: 1200,
						useNativeDriver: true,
					}),
				]),
			]),
		);

		const runRail = () => {
			findingRailProgress.setValue(0);
			return Animated.timing(findingRailProgress, {
				toValue: 1,
				duration: 1400,
				useNativeDriver: true,
			});
		};

		const railLoop = Animated.loop(runRail());
		const statusInterval = setInterval(() => {
			setFindingStatusIndex((prev) => (prev + 1) % FINDING_STATUS_MESSAGES.length);
		}, 1800);

		glowLoop.start();
		railLoop.start();

			return () => {
				clearInterval(statusInterval);
				glowLoop.stop();
				railLoop.stop();
			};
	}, [
		ambient.findingPulseMaxOpacity,
		ambient.findingPulseMaxScale,
		ambient.findingPulseMinOpacity,
		ambient.findingPulseMinScale,
		findingGlowOpacity,
		findingGlowScale,
		findingRailProgress,
		shouldRenderFindingUi,
	]);

	useEffect(() => {
		if (!shouldRenderFindingUi || HOLD_FINDING_NEARBY_HELP_FOR_REVIEW) {
			return undefined;
		}

		const selectedOrRecommendedHospital = selectedHospital || recommendedHospital || null;
		const startedAt = findingStartedAtRef.current || Date.now();
		let interval = null;

		const advanceToNextState = () => {
			if (selectedOrRecommendedHospital?.id) {
				setSelectedHospital((prev) => prev || selectedOrRecommendedHospital);
				setFlowState(EMERGENCY_FLOW_STATES.proposed_hospital.key);
				return true;
			}

			onContinue?.({
				location: activeLocation,
				locationLabel: [
					activeAddressModel?.primaryText,
					activeAddressModel?.secondaryText,
				]
					.filter(Boolean)
					.join(" | "),
				locationConfirmedAt: new Date().toISOString(),
				hospital: null,
			});
			return true;
		};

		const canAdvance = () => {
			const elapsed = Date.now() - startedAt;
			if (elapsed < FINDING_NEARBY_HELP_MIN_MS) return false;
			if (!selectedOrRecommendedHospital?.id) return true;
			if (routePreviewReady) return true;
			return elapsed >= FINDING_NEARBY_HELP_ROUTE_WAIT_MAX_MS;
		};

		if (canAdvance()) {
			advanceToNextState();
			return undefined;
		}

		interval = setInterval(() => {
			if (!canAdvance()) return;
			clearInterval(interval);
			advanceToNextState();
		}, 120);

		return () => {
			if (interval) clearInterval(interval);
		};
	}, [
		activeAddressModel?.primaryText,
		activeAddressModel?.secondaryText,
		activeLocation,
		onContinue,
		recommendedHospital,
		routePreviewReady,
		selectedHospital,
		shouldRenderFindingUi,
	]);

	const headlineText =
		isResponderMatched
			? matchedPhaseState.title
			: isProposedHospital
			? getHospitalPrimaryText(activeProposedHospital)
			: shouldShowAddressBody
			? activeAddressModel?.primaryText || currentState.title
			: currentState.title;
	const helperText =
		isResponderMatched
			? matchedPhaseState.support
			: isProposedHospital
			? getHospitalSecondaryText(activeProposedHospital)
			: shouldShowAddressBody
			? activeAddressModel?.secondaryText || ""
			: currentState.support;

	const handleRetry = useCallback(async () => {
		setSelectedLocation(null);
		setFlowState(EMERGENCY_FLOW_STATES.request_started.key);
		await refreshLocation?.();
	}, [refreshLocation]);

	const handlePrimary = useCallback(() => {
		if (flowState === EMERGENCY_FLOW_STATES.location_failed.key) {
			void handleRetry();
			return;
		}

		if (isProposedHospital) {
			if (isRefreshingRoutePreview || !activeProposedHospital?.id) {
				return;
			}
			onContinue?.({
				location: activeLocation,
				locationLabel: [
					activeAddressModel?.primaryText,
					activeAddressModel?.secondaryText,
				]
					.filter(Boolean)
					.join(" | "),
				locationConfirmedAt: new Date().toISOString(),
				hospital: activeProposedHospital,
			});
			return;
		}

		if (!activeLocation || shouldRenderFindingUi || isResponderMatched) {
			return;
		}

		if (continueTimeoutRef.current) {
			clearTimeout(continueTimeoutRef.current);
			continueTimeoutRef.current = null;
		}

		findingStartedAtRef.current = Date.now();
		setFlowState(EMERGENCY_FLOW_STATES.finding_nearby_help.key);
	}, [
		activeAddressModel?.primaryText,
		activeAddressModel?.secondaryText,
		activeLocation,
		activeProposedHospital,
		flowState,
		handleRetry,
		isProposedHospital,
		isRefreshingRoutePreview,
		isResponderMatched,
		onContinue,
		shouldRenderFindingUi,
	]);

	const handleShareMatchedDetails = useCallback(async () => {
		if (!matchedTrip) return;

		const detailLines = [
			"iVisit update",
			"Help is on the way.",
			`ETA: ${matchedEtaText}`,
			matchedResponderLabel ? `Responder: ${matchedResponderLabel}` : null,
			matchedContextLabel ? `From: ${matchedContextLabel}` : null,
		].filter(Boolean);

		try {
			await Share.share({ message: detailLines.join("\n") });
		} catch {
			// Quiet optional action.
		}
	}, [matchedContextLabel, matchedEtaText, matchedResponderLabel, matchedTrip]);

	const handleUseCurrentLocation = useCallback(async () => {
		setSelectedLocation(null);
		setFlowState(EMERGENCY_FLOW_STATES.request_started.key);
		await refreshLocation?.();
	}, [refreshLocation]);

	const handleAmbulanceIntent = useCallback(() => {
		if (!activeLocation) return;
		findingStartedAtRef.current = Date.now();
		setFlowState(EMERGENCY_FLOW_STATES.finding_nearby_help.key);
	}, [activeLocation]);

	const handleBedIntent = useCallback(() => {
		if (hospitalChoiceOptions.length > 0) {
			setHospitalSheetVisible(true);
		} else if (activeLocation) {
			findingStartedAtRef.current = Date.now();
			setFlowState(EMERGENCY_FLOW_STATES.finding_nearby_help.key);
		}
	}, [activeLocation, hospitalChoiceOptions.length]);

	const handleSelectLocation = useCallback((nextLocation) => {
		setSelectedLocation(nextLocation);
		setFlowState(EMERGENCY_FLOW_STATES.confirm_location.key);
	}, []);

	const handleChooseAnotherHospital = useCallback(() => {
		logEmergencyDebug("hospital_choice_open_requested", {
			flowState,
			selectedHospitalId: activeProposedHospital?.id || null,
		});
		setHospitalSheetVisible(true);
	}, [activeProposedHospital?.id, flowState]);

	const handleSelectHospital = useCallback((hospital) => {
		setHospitalSheetVisible(false);
		if (!hospital) {
			logEmergencyDebug("hospital_choice_empty_selection_ignored");
			return;
		}
		if (hospital?.id === selectedHospital?.id) {
			logEmergencyDebug("hospital_choice_same_selection_ignored", {
				hospital: summarizeHospitalForDebug(hospital),
			});
			return;
		}

		logEmergencyDebug("hospital_choice_selection_received", {
			previousHospital: summarizeHospitalForDebug(selectedHospital),
			nextHospital: summarizeHospitalForDebug(hospital),
			activeLocation: summarizeLocationForDebug(activeLocation),
			flowState,
		});

		setPendingHospitalSelection(hospital);
		setRoutePreviewReady(false);
		setPreviewRouteInfo(null);
		setIsRefreshingRoutePreview(true);
		if (routePreviewRefreshTimeoutRef.current) {
			clearTimeout(routePreviewRefreshTimeoutRef.current);
		}
		routePreviewRefreshTimeoutRef.current = setTimeout(() => {
			logEmergencyDebug("hospital_choice_route_timeout_commit", {
				nextHospital: summarizeHospitalForDebug(hospital),
			});
			setSelectedHospital(hospital);
			setPendingHospitalSelection(null);
			setIsRefreshingRoutePreview(false);
		}, FINDING_NEARBY_HELP_ROUTE_WAIT_MAX_MS);
		selectionInteractionRef.current?.cancel?.();
		selectionInteractionRef.current = InteractionManager.runAfterInteractions(() => {
			logEmergencyDebug("hospital_choice_selection_committed", {
				nextHospital: summarizeHospitalForDebug(hospital),
				activeLocation: summarizeLocationForDebug(activeLocation),
			});
			setFlowState(EMERGENCY_FLOW_STATES.proposed_hospital.key);
		});
	}, [activeLocation, flowState, selectedHospital]);

	const displayedProposedEta = formatRouteEta(previewRouteInfo, proposedHospitalEta);
	const shouldUseChooseHospitalStage = shouldShowReviewShell && !isResponderMatched;
	const useSplitChooseHospitalLayout =
		shouldUseChooseHospitalStage &&
		[
			"ios-pad",
			"android-tablet",
			"android-chromebook",
			"macbook",
			"web-sm-wide",
			"web-md",
			"web-lg",
			"web-xl",
			"web-2xl-3xl",
			"web-ultra-wide",
		].includes(chooseHospitalVariant);
	const shouldDelayRoutePreviewOnWeb = Platform.OS === "web" && renderLocationPreviewBridge;
	const shouldShowPreviewMap =
		shouldUseChooseHospitalStage &&
		!useSplitChooseHospitalLayout &&
		!!activeLocation &&
		!!activeProposedHospital &&
		!shouldDelayRoutePreviewOnWeb &&
		(!isProposedHospital || !isRefreshingRoutePreview);
	const shouldShowCommittedMap = isResponderMatched && !!matchedHospitalId;
	const shouldUseIosPadPhaseLayout =
		useIosPadLayout && !shouldShowReviewShell && !isResponderMatched;
	const shouldUseChooseLocationStage = !shouldUseChooseHospitalStage && !isResponderMatched;
	const shouldLockWebViewport =
		shouldUseChooseLocationStage &&
		((isWideDesktopWeb && !isVeryShortHeight) ||
			(isWebMobile && !isVeryShortHeight && height >= 760));
	const confirmPrimaryLabel =
		flowState === EMERGENCY_FLOW_STATES.location_failed.key
			? EMERGENCY_FLOW_STATES.location_failed.primaryAction
			: EMERGENCY_FLOW_STATES.confirm_location.primaryAction;
	const shouldUseHospitalChoiceDialog = [
		"ios-pad",
		"android-tablet",
		"android-chromebook",
		"macbook",
		"web-sm-wide",
		"web-md",
		"web-lg",
		"web-xl",
		"web-2xl-3xl",
		"web-ultra-wide",
	].includes(screenVariant);
	const handleChooseLocationActionLayout = useCallback((event) => {
		const nextY = Number(event?.nativeEvent?.layout?.y);
		if (Number.isFinite(nextY)) {
			chooseLocationActionYRef.current = nextY;
		}
	}, []);
	const centeredShellOpacity = reviewTransition.interpolate({
		inputRange: [0, 1],
		outputRange: [1, 0],
	});
	const centeredShellTranslateY = reviewTransition.interpolate({
		inputRange: [0, 1],
		outputRange: [0, -18],
	});
	const reviewShellTranslateY = reviewTransition.interpolate({
		inputRange: [0, 1],
		outputRange: [22, 0],
	});
	const locationPreviewOpacity = reviewTransition.interpolate({
		inputRange: [0, 1],
		outputRange: [1, 0],
	});
	const locationPreviewTranslateY = reviewTransition.interpolate({
		inputRange: [0, 1],
		outputRange: [0, -22],
	});
	const locationPreviewScale = reviewTransition.interpolate({
		inputRange: [0, 1],
		outputRange: [1, 1.04],
	});

	useEffect(() => {
		if (
			Platform.OS !== "web" ||
			shouldLockWebViewport ||
			!shouldUseChooseLocationStage ||
			(flowState !== EMERGENCY_FLOW_STATES.confirm_location.key &&
				flowState !== EMERGENCY_FLOW_STATES.location_failed.key)
		) {
			return undefined;
		}

		const scrollKey = [flowState, activeAddressModel?.primaryText || "", Math.round(height)].join(":");
		if (lastCtaAutoScrollKeyRef.current === scrollKey) {
			return undefined;
		}

		const timeout = setTimeout(() => {
			const targetY = Math.max(0, chooseLocationActionYRef.current - Math.max(16, height * 0.12));
			scrollViewRef.current?.scrollTo?.({ y: targetY, animated: true });
			lastCtaAutoScrollKeyRef.current = scrollKey;
		}, 220);

		return () => clearTimeout(timeout);
	}, [
		activeAddressModel?.primaryText,
		flowState,
		height,
		shouldLockWebViewport,
		shouldUseChooseLocationStage,
	]);

	return (
		<LinearGradient colors={colors.backgroundGradient} style={styles.gradient}>
			<EmergencyLocationSearchStageOrchestrator
				visible={searchSheetVisible}
				variant={locationSearchVariant}
				onClose={() => setSearchSheetVisible(false)}
				onUseCurrentLocation={handleUseCurrentLocation}
				onSelectLocation={handleSelectLocation}
				currentLocation={activeLocation}
			/>
			<EmergencyHospitalChoiceSheet
				visible={hospitalSheetVisible}
				onClose={() => setHospitalSheetVisible(false)}
				variant={screenVariant}
				presentationMode={shouldUseHospitalChoiceDialog ? "dialog" : "sheet"}
				hospitals={hospitalChoiceOptions}
				selectedHospitalId={activeProposedHospital?.id || null}
				recommendedHospitalId={recommendedHospital?.id || null}
				onSelectHospital={handleSelectHospital}
				onRetry={onRefreshHospitalOptions}
				isLoading={hospitalChoiceStatus === "loading"}
				isRefreshing={hospitalChoiceState?.isRefreshingCatalog === true}
				statusMessage={hospitalChoiceMessage}
				onChangeLocation={() => {
					setHospitalSheetVisible(false);
					setSearchSheetVisible(true);
				}}
			/>
			<ScrollView
				ref={scrollViewRef}
				nativeID={
					screenVariant === "web-mobile"
						? "emergency-web-mobile-scroll"
						: isWebSmWide
							? "emergency-web-sm-wide-scroll"
							: isWebMd
								? "emergency-web-md-scroll"
								: isWebLg
									? "emergency-web-lg-scroll"
									: isWebXl
										? "emergency-web-xl-scroll"
										: isWeb2xl3xl
											? "emergency-web-2xl-3xl-scroll"
											: isWebUltraWide
												? "emergency-web-ultra-wide-scroll"
								: undefined
				}
				contentContainerStyle={[
					styles.scrollContent,
					shouldUseIosPadPhaseLayout ? styles.padScrollContent : null,
					shouldUseChooseLocationStage && !isResponderMatched
						? { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }
						: null,
					shouldShowReviewShell ? { paddingBottom: 0 } : null,
				]}
				scrollEnabled={!shouldLockWebViewport && !(shouldUseChooseLocationStage && !isResponderMatched)}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				<Animated.View
					style={[
						styles.stage,
						shouldUseIosPadPhaseLayout ? styles.padStage : null,
						shouldShowReviewShell ? styles.reviewStage : null,
						shouldShowReviewShell
							? { minHeight: Math.max(height - metrics.topPadding, 0) }
							: null,
						shouldUseChooseLocationStage && !isResponderMatched
							? { maxWidth: undefined, alignItems: "stretch", alignSelf: "stretch" }
							: null,
						{
							opacity: entranceOpacity,
							transform: [{ translateY: entranceTranslate }],
						},
					]}
				>
					{shouldShowPreviewMap ? (
						<EmergencyHospitalRoutePreview
							origin={activeLocation}
							hospital={activeProposedHospital}
							bottomPadding={metrics.primaryHeight + 228}
							routeCoordinates={routeCoordinates}
							routeInfo={previewRouteInfo}
							isCalculatingRoute={isCalculatingRoute}
							visible={isProposedHospital}
							showLoadingBadge={isProposedHospital}
						/>
					) : null}
					{!isResponderMatched ? (
						<Animated.View
							pointerEvents={isProposedHospital ? "none" : "auto"}
							style={[
								styles.centeredStateLayer,
								shouldUseIosPadPhaseLayout ? styles.padCenteredStateLayer : null,
								shouldUseChooseLocationStage
									? { alignItems: "stretch", paddingTop: 0 }
									: null,
								{
									opacity: centeredShellOpacity,
									transform: [{ translateY: centeredShellTranslateY }],
								},
							]}
						>
							{shouldUseChooseLocationStage ? (
								<EmergencyChooseLocationStageOrchestrator
									variant={chooseLocationVariant}
									flowState={flowState}
									headlineText={headlineText}
									helperText={helperText}
									shouldRenderFindingUi={shouldRenderFindingUi}
									shouldShowLocationSkeleton={shouldShowLocationSkeleton}
									shouldShowLocationPreviewMap={shouldShowLocationPreviewMap}
									locationPreviewRenderKey={locationPreviewRenderKey}
									activeLocation={activeLocation}
									findingStatusMessage={findingStatusMessage}
									confirmPrimaryLabel={confirmPrimaryLabel}
									onPrimaryPress={handlePrimary}
									onSecondaryPress={() => setSearchSheetVisible(true)}
									onAmbulancePress={handleAmbulanceIntent}
									onBedPress={handleBedIntent}
									secondaryLabel={EMERGENCY_FLOW_STATES.confirm_location.secondaryAction}
									heroScale={heroScale}
									pulseScale={pulseScale}
									skeletonOpacity={skeletonOpacity}
									locationPreviewOpacity={locationPreviewOpacity}
									locationPreviewTranslateY={locationPreviewTranslateY}
									locationPreviewScale={locationPreviewScale}
									findingGlowOpacity={findingGlowOpacity}
									findingGlowScale={findingGlowScale}
									findingRailProgress={findingRailProgress}
									locationLabel={activeAddressModel?.primaryText}
									locationDetail={activeAddressModel?.secondaryText}
									hospitalOptions={hospitalChoiceOptions}
									selectedHospital={activeProposedHospital}
									onSheetFullScreen={setSheetFullScreen}
									isResolvingPlaceName={isResolvingPlaceName}
									onActionLayout={handleChooseLocationActionLayout}
								/>
							) : null}
						</Animated.View>
					) : null}

					{shouldUseChooseHospitalStage ? (
						<Animated.View
							pointerEvents={isProposedHospital ? "auto" : "none"}
							style={[
								styles.reviewLayer,
								{
									opacity: reviewTransition,
									transform: [{ translateY: reviewShellTranslateY }],
								},
							]}
						>
							<EmergencyChooseHospitalStageOrchestrator
								variant={chooseHospitalVariant}
								activeLocation={activeLocation}
								hospital={activeProposedHospital}
								showRouteMap={!shouldDelayRoutePreviewOnWeb}
								routeCoordinates={routeCoordinates}
								routeInfo={previewRouteInfo}
								isCalculatingRoute={isCalculatingRoute}
								displayedEta={displayedProposedEta}
								headlineText={headlineText}
								helperText={helperText}
								isRefreshingRoutePreview={isRefreshingRoutePreview}
								isRefreshingCatalog={hospitalChoiceState?.isRefreshingCatalog === true}
								hospitalChoiceMessage={hospitalChoiceMessage}
								onPrimaryPress={handlePrimary}
								onSecondaryPress={handleChooseAnotherHospital}
								metrics={metrics}
								styles={styles}
							/>
						</Animated.View>
					) : null}

					{isResponderMatched ? (
						<View style={styles.committedLayer}>
							{shouldShowCommittedMap ? (
								<EmergencyMapContainer
									ref={committedMapRef}
									hospitals={matchedHospitals}
									selectedHospitalId={matchedHospitalId}
									routeHospitalId={matchedHospitalId}
									animateAmbulance={true}
									ambulanceTripEtaSeconds={matchedTrip?.etaSeconds ?? null}
									mode="emergency"
									showControls={false}
									bottomPadding={metrics.primaryHeight + 228}
									onRouteCalculated={setCommittedRouteInfo}
									responderLocation={matchedTrip?.currentResponderLocation ?? null}
									responderHeading={matchedTrip?.currentResponderHeading ?? null}
									ambulanceTelemetryHealth={ambulanceTelemetryHealth}
									hideTelemetryBanner={true}
									sheetSnapIndex={1}
									mapStateKey={`ios-intake-${matchedTrip?.requestId ?? matchedHospitalId ?? "matched"}`}
								/>
							) : null}
							<View pointerEvents="none" style={styles.committedMapScrim} />
							<View style={styles.reviewLayer}>
								<View style={styles.reviewSheet}>
									<View style={[styles.reviewWell, styles.matchedWell]}>
										<View style={styles.matchedStatusPill}>
											<Text style={styles.matchedStatusPillText}>
												{matchedPhaseState.headerSubtitle}
											</Text>
										</View>

										<View style={styles.matchedEtaCard}>
											<Text style={styles.matchedEtaLabel}>Estimated arrival</Text>
											<Text style={styles.matchedEtaValue}>{committedEtaText}</Text>
											<Text style={styles.matchedEtaSupport}>{matchedEtaSupportText}</Text>
										</View>

										<View style={styles.matchedIdentityCard}>
											<View style={styles.matchedIdentityHeader}>
												<View style={styles.matchedIdentityBadge}>
													<Text style={styles.matchedIdentityBadgeText}>EMS</Text>
												</View>
												<View style={styles.matchedIdentityCopy}>
													<Text style={styles.matchedIdentityTitle}>
														{matchedResponderLabel}
													</Text>
													{matchedResponderMeta ? (
														<Text style={styles.matchedIdentitySubtitle}>
															{matchedResponderMeta}
														</Text>
													) : null}
												</View>
											</View>

											<View style={styles.matchedIdentityDivider} />

											<View style={styles.matchedDetailRow}>
												<View style={styles.matchedDetailBlock}>
													<Text style={styles.matchedDetailLabel}>Responding from</Text>
													<Text style={styles.matchedDetailValue}>{matchedContextLabel}</Text>
												</View>
												<View style={styles.matchedDetailBlock}>
													<Text style={styles.matchedDetailLabel}>Live status</Text>
													<Text style={styles.matchedDetailValue}>
														{matchedPhaseState.key === "arrived"
															? "Arrived"
															: computedStatus || "En route"}
													</Text>
												</View>
											</View>
										</View>

										{showMatchedProgressRail ? (
											<View style={styles.matchedProgressWrap}>
												<View style={styles.matchedProgressTrack}>
													<View
														style={[
															styles.matchedProgressFill,
															{
																width: `${Math.max(
																	8,
																	Math.min(100, Math.round((tripProgress || 0) * 100)),
																)}%`,
															},
														]}
													/>
												</View>
											</View>
										) : null}

										<View style={styles.matchedTimelineRow}>
											{matchedPhaseSteps.map((step, index) => {
												const isActive = index === matchedPhaseStepIndex;
												const isComplete = index < matchedPhaseStepIndex;

												return (
													<View key={step.key} style={styles.matchedTimelineItem}>
														<View
															style={[
																styles.matchedTimelineDot,
																(isActive || isComplete)
																	? styles.matchedTimelineDotActive
																	: null,
															]}
														/>
														<Text
															style={[
																styles.matchedTimelineText,
																(isActive || isComplete)
																	? styles.matchedTimelineTextActive
																	: null,
															]}
														>
															{step.label}
														</Text>
													</View>
												);
											})}
										</View>

										<View style={styles.matchedGuidanceCard}>
											<Text style={styles.matchedGuidanceLabel}>What to do now</Text>
											<Text style={styles.matchedGuidanceText}>{matchedNextStepText}</Text>
										</View>

										<View style={styles.matchedMetaRow}>
											<View style={styles.matchedMetaChip}>
												<Text style={styles.matchedMetaText}>{matchedContextLabel}</Text>
											</View>
											{matchedTelemetryLabel ? (
												<View style={styles.matchedMetaChip}>
													<Text style={styles.matchedMetaText}>{matchedTelemetryLabel}</Text>
												</View>
											) : null}
										</View>

										<Pressable
											onPress={handleShareMatchedDetails}
											style={styles.reviewQuietLink}
										>
											<Text style={styles.quietLinkText}>
												{EMERGENCY_FLOW_STATES.responder_matched.secondaryAction}
											</Text>
										</Pressable>
									</View>
								</View>
							</View>
						</View>
					) : null}
				</Animated.View>
			</ScrollView>
		</LinearGradient>
	);
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { MapView, Marker, Polyline, PROVIDER_GOOGLE } from "../../map/MapComponents";
import MapControls from "../../map/chrome/MapControls";
import { getMapRenderTokens } from "../../map/mapRenderTokens";
import { getAmbulanceSpriteForHeading } from "../../map/RouteLayer";
import {
	darkAndroidMapStyle,
	darkMapStyle,
	darkWebMapStyle,
	lightAndroidMapStyle,
	lightMapStyle,
	lightWebMapStyle,
} from "../../map/mapStyles";
import { useTheme } from "../../../contexts/ThemeContext";
import { COLORS } from "../../../constants/colors";
import { useMapRoute } from "../../../hooks/emergency/useMapRoute";
import { useAmbulanceAnimation } from "../../../hooks/emergency/useAmbulanceAnimation";
import { calculateBearing, calculateDistance } from "../../../utils/mapUtils";

const DEFAULT_REGION = {
	latitude: 37.7749,
	longitude: -122.4194,
	latitudeDelta: 0.012,
	longitudeDelta: 0.012,
};
const HOSPITAL_MARKER_IMAGE = require("../../../assets/map/hospital.png");
const SELECTED_HOSPITAL_MARKER_IMAGE = require("../../../assets/map/selected_hospital.png");
const HOSPITAL_MARKER_HEIGHT = {
	normal: 102.5,
	selected: 137,
};

function toCoordinate(source) {
	if (!source || typeof source !== "object") return null;
	const latitude = Number(source?.coordinates?.latitude ?? source?.latitude ?? source?.lat);
	const longitude = Number(source?.coordinates?.longitude ?? source?.longitude ?? source?.lng);
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return null;
	}
	return { latitude, longitude };
}

function buildRegion(location) {
	const coordinate = toCoordinate(location);
	if (coordinate) {
		return {
			...coordinate,
			latitudeDelta: DEFAULT_REGION.latitudeDelta,
			longitudeDelta: DEFAULT_REGION.longitudeDelta,
		};
	}
	return DEFAULT_REGION;
}

function sortHospitalsForPreview(hospitals, selectedHospitalId) {
	return hospitals
		.filter((hospital) => toCoordinate(hospital))
		.sort((left, right) => {
			const leftSelected = selectedHospitalId && left?.id === selectedHospitalId ? 1 : 0;
			const rightSelected = selectedHospitalId && right?.id === selectedHospitalId ? 1 : 0;
			if (leftSelected !== rightSelected) {
				return rightSelected - leftSelected;
			}
			const leftDistance = Number(left?.distanceKm ?? left?.distance ?? Number.MAX_SAFE_INTEGER);
			const rightDistance = Number(right?.distanceKm ?? right?.distance ?? Number.MAX_SAFE_INTEGER);
			return leftDistance - rightDistance;
		});
}

function getHorizontalOcclusionBias(leftPanelWidth = 0, screenWidth = 0) {
	if (!Number.isFinite(leftPanelWidth) || leftPanelWidth <= 0 || !Number.isFinite(screenWidth) || screenWidth <= 0) {
		return 0;
	}
	return Math.min(0.22, Math.max(0.06, (leftPanelWidth / screenWidth) * 0.4));
}

function buildRegionForPoints(
	points = [],
	bottomSheetHeight = 0,
	leftPanelWidth = 0,
	screenWidth = 0,
	headerOcclusionHeight = 0,
	{ wideViewport = false } = {},
) {
	if (points.length <= 1) {
		return buildRegion(points[0] || null);
	}

	const latitudes = points.map((point) => point.latitude);
	const longitudes = points.map((point) => point.longitude);
	const minLat = Math.min(...latitudes);
	const maxLat = Math.max(...latitudes);
	const minLng = Math.min(...longitudes);
	const maxLng = Math.max(...longitudes);
	const rawLatitudeSpan = Math.max(maxLat - minLat, 0);
	const rawLongitudeSpan = Math.max(maxLng - minLng, 0);
	const routeIsMostlyHorizontal = rawLongitudeSpan > Math.max(rawLatitudeSpan, 0.0001) * 1.12;
	const latitudeFloor = wideViewport ? 0.02 : DEFAULT_REGION.latitudeDelta;
	const longitudeFloor = wideViewport ? 0.02 : DEFAULT_REGION.longitudeDelta;
	const latitudeDelta = Math.min(
		Math.max(
			latitudeFloor,
			rawLatitudeSpan * (routeIsMostlyHorizontal ? (wideViewport ? 1.82 : 1.44) : wideViewport ? 1.96 : 1.56) +
				(wideViewport ? 0.0075 : 0.0042),
		),
		0.12,
	);
	const longitudeDelta = Math.min(
		Math.max(
			longitudeFloor,
			rawLongitudeSpan * (routeIsMostlyHorizontal ? (wideViewport ? 1.88 : 1.52) : wideViewport ? 1.74 : 1.44) +
				(wideViewport ? 0.0075 : 0.0042),
		),
		0.12,
	);
	const sheetBias = Math.min(0.18, Math.max(0.05, (Number(bottomSheetHeight) || 0) / 1500));
	const normalizedBias = wideViewport
		? Math.min(0.09, Math.max(0.015, sheetBias * 0.66))
		: Math.min(0.12, Math.max(0.02, sheetBias));
	const headerBias = Math.min(0.055, Math.max(0, (Number(headerOcclusionHeight) || 0) / 3200));
	const horizontalBias = getHorizontalOcclusionBias(leftPanelWidth, screenWidth);

	return {
		latitude: (minLat + maxLat) / 2 + latitudeDelta * (normalizedBias + headerBias),
		longitude: (minLng + maxLng) / 2 - longitudeDelta * horizontalBias,
		latitudeDelta,
		longitudeDelta,
	};
}

function buildUserCenteredRegion(coordinate, leftPanelWidth = 0, screenWidth = 0) {
	if (!coordinate) return DEFAULT_REGION;
	const latitudeDelta = 0.016;
	const longitudeDelta = 0.016;
	const horizontalBias = getHorizontalOcclusionBias(leftPanelWidth, screenWidth);
	return {
		latitude: coordinate.latitude - latitudeDelta * 0.16,
		longitude: coordinate.longitude - longitudeDelta * horizontalBias,
		latitudeDelta,
		longitudeDelta,
	};
}

function getRoutePadding(bottomSheetHeight = 0, leftPanelWidth = 0, headerOcclusionHeight = 0) {
	if (Number(leftPanelWidth) > 0) {
		return {
			top: Math.max(92, Number(headerOcclusionHeight || 0) + 24),
			right: 54,
			bottom: 58,
			left: Math.max(88, leftPanelWidth + 42),
		};
	}
	return {
		top: Math.max(136, Number(headerOcclusionHeight || 0) + 28),
		right: 42,
		bottom: Math.max(256, bottomSheetHeight + 84),
		left: 42,
	};
}

function getNearbyPadding(bottomSheetHeight = 0, leftPanelWidth = 0, headerOcclusionHeight = 0) {
	if (Number(leftPanelWidth) > 0) {
		return {
			top: Math.max(88, Number(headerOcclusionHeight || 0) + 18),
			right: 56,
			bottom: 62,
			left: Math.max(92, leftPanelWidth + 46),
		};
	}
	return {
		top: Math.max(132, Number(headerOcclusionHeight || 0) + 22),
		right: 44,
		bottom: Math.max(264, bottomSheetHeight + 92),
		left: 44,
	};
}

function getWebRoutePanOffset(bottomSheetHeight = 0, leftPanelWidth = 0, headerOcclusionHeight = 0) {
	const padding = getRoutePadding(bottomSheetHeight, leftPanelWidth, headerOcclusionHeight);
	return Math.round((Number(padding.bottom || 0) - Number(padding.top || 0)) / 2);
}

function getHospitalMarkerCenterOffset(isSelected) {
	return {
		x: 0,
		y: -(isSelected ? HOSPITAL_MARKER_HEIGHT.selected : HOSPITAL_MARKER_HEIGHT.normal) / 6,
	};
}

function distanceMetersBetween(from, to) {
	if (!from || !to) return 0;
	const latScale = 111_320;
	const midLat = ((from.latitude + to.latitude) / 2) * (Math.PI / 180);
	const lngScale = 111_320 * Math.cos(midLat);
	const dLat = (to.latitude - from.latitude) * latScale;
	const dLng = (to.longitude - from.longitude) * lngScale;
	return Math.sqrt(dLat * dLat + dLng * dLng);
}

function buildFallbackRouteInfo(origin, destination) {
	if (!origin || !destination) {
		return { durationSec: null, distanceMeters: null };
	}
	const straightLineKm = calculateDistance(origin, destination);
	const estimatedRoadDistanceMeters = Math.max(
		250,
		Math.round(straightLineKm * 1000 * 1.2),
	);
	const assumedUrbanSpeedKmh = Platform.OS === "web" ? 30 : 34;
	const estimatedDurationSec = Math.max(
		60,
		Math.round((estimatedRoadDistanceMeters / 1000 / assumedUrbanSpeedKmh) * 3600),
	);
	return {
		durationSec: estimatedDurationSec,
		distanceMeters: estimatedRoadDistanceMeters,
	};
}

export default function EmergencyLocationPreviewMap({
	location,
	hospitals = [],
	selectedHospitalId = null,
	serviceMarkerKind = null,
	serviceMarkerCoordinate = null,
	serviceMarkerHeading = null,
	trackingRouteCoordinates = null,
	trackingTimeline = null,
	telemetryHealth = null,
	placeLabel = null,
	interactive = false,
	activeTracking = false,
	focusOnUserSignal = 0,
	headerOcclusionHeight = 0,
	bottomSheetHeight = 0,
	leftPanelWidth = 0,
	controlsMode = "bottom",
	controlsTopOffset = null,
	controlsRightOffset = 14,
	controlsBottomOffsetBase = 198,
	onHospitalPress = null,
	onReadinessChange = null,
	onRouteInfoChange = null,
	showInternalSkeleton = true,
	showControls = true,
}) {
	const { isDarkMode } = useTheme();
	const { width: screenWidth } = useWindowDimensions();
	const mapRef = useRef(null);
	const routeFitPrimeKeyRef = useRef(null);
	const occlusionSignatureRef = useRef(`${Math.round(bottomSheetHeight)}|${Math.round(leftPanelWidth)}`);
	const [isMapReady, setIsMapReady] = useState(false);
	const [isNearbyOverview, setIsNearbyOverview] = useState(false);
	const isAndroid = Platform.OS === "android";
	const isWeb = Platform.OS === "web";
	const {
		routeCoordinates: previewRouteCoordinates,
		routeInfo,
		isFallbackRoute,
		calculateRoute,
		clearRoute,
		isCalculatingRoute,
	} = useMapRoute();
	const customMapStyle = isAndroid
		? isDarkMode
			? darkAndroidMapStyle
			: lightAndroidMapStyle
		: isWeb
			? isDarkMode
				? darkWebMapStyle
				: lightWebMapStyle
		: isDarkMode
			? darkMapStyle
			: lightMapStyle;
	const renderTokens = useMemo(() => getMapRenderTokens({ isDarkMode }), [isDarkMode]);
	const telemetryState = telemetryHealth?.state ?? "inactive";
	const routeCoreColor =
		telemetryState === "lost"
			? isDarkMode
				? "#F87171"
				: "#B91C1C"
			: telemetryState === "stale"
				? isDarkMode
					? "#FBBF24"
					: "#B45309"
				: renderTokens.routeCoreColor;
	const routeHaloColor =
		telemetryState === "lost"
			? isDarkMode
				? "rgba(248,113,113,0.34)"
				: "rgba(185,28,28,0.14)"
			: telemetryState === "stale"
				? isDarkMode
					? "rgba(251,191,36,0.34)"
					: "rgba(180,83,9,0.14)"
				: renderTokens.routeHaloColor;
	const routeDashPattern =
		telemetryState === "lost"
			? [6, 7]
			: telemetryState === "stale"
				? [10, 6]
				: undefined;
	const serviceMarkerOpacity =
		telemetryState === "lost"
			? 0.62
			: telemetryState === "stale"
				? 0.86
				: 1;

	const visibleHospitals = useMemo(
		() => sortHospitalsForPreview(hospitals, selectedHospitalId).slice(0, 5),
		[hospitals, selectedHospitalId],
	);
	const selectedHospital = useMemo(() => {
		if (!visibleHospitals.length) return null;
		if (!selectedHospitalId) return visibleHospitals[0];
		return visibleHospitals.find((hospital) => hospital?.id === selectedHospitalId) || visibleHospitals[0];
	}, [selectedHospitalId, visibleHospitals]);
	const selectedHospitalCoordinate = useMemo(() => toCoordinate(selectedHospital), [selectedHospital]);
	const userCoordinate = useMemo(() => toCoordinate(location), [location]);
	const directServiceMarkerCoordinate = useMemo(
		() => toCoordinate(serviceMarkerCoordinate),
		[serviceMarkerCoordinate],
	);
	const hasLiveResponderCoordinate = useMemo(() => {
		if (!directServiceMarkerCoordinate) return false;
		if (!selectedHospitalCoordinate) return true;
		return distanceMetersBetween(directServiceMarkerCoordinate, selectedHospitalCoordinate) > 25;
	}, [directServiceMarkerCoordinate, selectedHospitalCoordinate]);
	const previewServiceMarkerCoordinate = useMemo(() => {
		if (directServiceMarkerCoordinate) return directServiceMarkerCoordinate;
		if (serviceMarkerKind === "ambulance") {
			return selectedHospitalCoordinate;
		}
		return null;
	}, [directServiceMarkerCoordinate, selectedHospitalCoordinate, serviceMarkerKind]);
	const previewServiceMarkerHeading = useMemo(() => {
		if (Number.isFinite(serviceMarkerHeading)) return Number(serviceMarkerHeading);
		if (
			serviceMarkerKind === "ambulance" &&
			selectedHospitalCoordinate &&
			userCoordinate
		) {
			return calculateBearing(selectedHospitalCoordinate, userCoordinate);
		}
		return 0;
	}, [
		selectedHospitalCoordinate,
		serviceMarkerHeading,
		serviceMarkerKind,
		userCoordinate,
	]);
	const nearbyRadiusKm = useMemo(() => {
		const nearestDistance = Number(selectedHospital?.distanceKm ?? visibleHospitals?.[0]?.distanceKm);
		if (Number.isFinite(nearestDistance) && nearestDistance > 0) {
			return Math.max(2.5, Math.min(8, nearestDistance * 2.2));
		}
		return 4.5;
	}, [selectedHospital?.distanceKm, visibleHospitals]);
	const routeOriginCoordinate = useMemo(() => {
		return userCoordinate;
	}, [
		userCoordinate,
	]);
	const routeDestinationCoordinate = useMemo(() => {
		return selectedHospitalCoordinate;
	}, [selectedHospitalCoordinate]);
	const routeBoundsCoordinates = useMemo(() => {
		const canonicalTrackingRoute = Array.isArray(trackingRouteCoordinates)
			? trackingRouteCoordinates.filter(
					(point) =>
						point &&
						Number.isFinite(point.latitude) &&
						Number.isFinite(point.longitude),
				)
			: [];
		if (
			activeTracking &&
			previewRouteCoordinates.length >= 2 &&
			!isFallbackRoute
		) {
			return previewRouteCoordinates;
		}
		if (canonicalTrackingRoute.length >= 2) {
			return canonicalTrackingRoute;
		}
		if (previewRouteCoordinates.length >= 2) {
			return previewRouteCoordinates;
		}
		return [routeOriginCoordinate, routeDestinationCoordinate].filter(Boolean);
	}, [
		activeTracking,
		isFallbackRoute,
		previewRouteCoordinates,
		routeDestinationCoordinate,
		routeOriginCoordinate,
		trackingRouteCoordinates,
	]);
	const fallbackRouteInfo = useMemo(
		() => buildFallbackRouteInfo(routeOriginCoordinate, routeDestinationCoordinate),
		[routeDestinationCoordinate, routeOriginCoordinate],
	);
	const resolvedRouteInfo = useMemo(
		() => ({
			durationSec:
				Number.isFinite(routeInfo?.durationSec) && routeInfo.durationSec > 0
					? routeInfo.durationSec
					: fallbackRouteInfo.durationSec,
			distanceMeters:
				Number.isFinite(routeInfo?.distanceMeters) && routeInfo.distanceMeters > 0
					? routeInfo.distanceMeters
					: fallbackRouteInfo.distanceMeters,
		}),
		[fallbackRouteInfo.distanceMeters, fallbackRouteInfo.durationSec, routeInfo?.distanceMeters, routeInfo?.durationSec],
	);
	const hasActiveTrackingTimeline = useMemo(() => {
		const etaSeconds = Number(trackingTimeline?.etaSeconds);
		const rawStartedAt = trackingTimeline?.startedAtMs ?? trackingTimeline?.startedAt;
		const startedAtMs = Number.isFinite(rawStartedAt)
			? Number(rawStartedAt)
			: typeof rawStartedAt === "string"
				? Date.parse(rawStartedAt)
				: NaN;
		return (
			(Number.isFinite(etaSeconds) && etaSeconds > 0) ||
			Number.isFinite(startedAtMs)
		);
	}, [
		trackingTimeline?.etaSeconds,
		trackingTimeline?.startedAt,
		trackingTimeline?.startedAtMs,
	]);
	const shouldAnimateAmbulance =
		serviceMarkerKind === "ambulance" &&
		(activeTracking || hasActiveTrackingTimeline) &&
		previewRouteCoordinates.length >= 2 &&
		Number.isFinite(resolvedRouteInfo.durationSec) &&
		resolvedRouteInfo.durationSec > 0;
	const canonicalAnimationRouteCoordinates = useMemo(() => {
		if (!shouldAnimateAmbulance || routeBoundsCoordinates.length < 2) return [];
		const first = routeBoundsCoordinates[0];
		const last = routeBoundsCoordinates[routeBoundsCoordinates.length - 1];
		if (!selectedHospitalCoordinate) return routeBoundsCoordinates;

		const firstDistanceToHospital = distanceMetersBetween(first, selectedHospitalCoordinate);
		const lastDistanceToHospital = distanceMetersBetween(last, selectedHospitalCoordinate);
		// Animation should run hospital -> pickup.
		return firstDistanceToHospital <= lastDistanceToHospital
			? routeBoundsCoordinates
			: [...routeBoundsCoordinates].reverse();
	}, [routeBoundsCoordinates, selectedHospitalCoordinate, shouldAnimateAmbulance]);
	const initialAnimationProgress = useMemo(() => {
		const etaSeconds = Number(trackingTimeline?.etaSeconds ?? resolvedRouteInfo.durationSec);
		const rawStartedAt = trackingTimeline?.startedAtMs ?? trackingTimeline?.startedAt;
		const startedAtMs = Number.isFinite(rawStartedAt)
			? Number(rawStartedAt)
			: typeof rawStartedAt === "string"
				? Date.parse(rawStartedAt)
				: NaN;
		if (!Number.isFinite(etaSeconds) || etaSeconds <= 0 || !Number.isFinite(startedAtMs)) {
			return 0;
		}
		const elapsed = Math.max(0, (Date.now() - startedAtMs) / 1000);
		return Math.min(1, Math.max(0, elapsed / etaSeconds));
	}, [
		resolvedRouteInfo.durationSec,
		trackingTimeline?.etaSeconds,
		trackingTimeline?.startedAt,
		trackingTimeline?.startedAtMs,
	]);
	const animatedRouteCoordinates = useMemo(
		() => (shouldAnimateAmbulance ? canonicalAnimationRouteCoordinates : []),
		[canonicalAnimationRouteCoordinates, shouldAnimateAmbulance],
	);
	const {
		ambulanceCoordinate: animatedAmbulanceCoordinate,
		ambulanceHeading: animatedAmbulanceHeading,
	} = useAmbulanceAnimation({
		routeCoordinates: animatedRouteCoordinates,
		animateAmbulance: shouldAnimateAmbulance,
		ambulanceTripEtaSeconds: resolvedRouteInfo.durationSec ?? null,
		initialProgress: initialAnimationProgress,
		responderLocation: hasLiveResponderCoordinate ? directServiceMarkerCoordinate : null,
		responderHeading: Number.isFinite(serviceMarkerHeading)
			? Number(serviceMarkerHeading)
			: null,
	});
	const effectiveServiceMarkerCoordinate =
		serviceMarkerKind === "ambulance" && shouldAnimateAmbulance
			? animatedAmbulanceCoordinate || canonicalAnimationRouteCoordinates[0] || previewServiceMarkerCoordinate
			: previewServiceMarkerCoordinate;
	const effectiveServiceMarkerHeading =
		serviceMarkerKind === "ambulance" && shouldAnimateAmbulance
			? animatedAmbulanceHeading
			: previewServiceMarkerHeading;
	const effectiveAmbulanceMarkerImage = useMemo(
		() =>
			serviceMarkerKind === "ambulance"
				? getAmbulanceSpriteForHeading(effectiveServiceMarkerHeading)
				: null,
		[effectiveServiceMarkerHeading, serviceMarkerKind],
	);
	const routeFitPrimeKey = useMemo(
		() =>
			routeBoundsCoordinates
				.map(
					(coordinate) =>
						`${Number(coordinate?.latitude).toFixed(5)}:${Number(coordinate?.longitude).toFixed(5)}`,
				)
				.join("|"),
		[routeBoundsCoordinates],
	);
	const nearbyOverviewCoordinates = useMemo(() => {
		const dynamicHospitals = visibleHospitals
			.filter((hospital, index) => {
				if (index === 0) return true;
				const distanceKm = Number(hospital?.distanceKm);
				return !Number.isFinite(distanceKm) || distanceKm <= nearbyRadiusKm;
			})
			.slice(0, 4)
			.map((hospital) => toCoordinate(hospital))
			.filter(Boolean);

		return [userCoordinate, ...dynamicHospitals].filter(Boolean);
	}, [nearbyRadiusKm, userCoordinate, visibleHospitals]);
	const region = useMemo(
		() =>
			buildRegionForPoints(
				routeBoundsCoordinates,
				bottomSheetHeight,
				leftPanelWidth,
				screenWidth,
				headerOcclusionHeight,
			),
		[
			bottomSheetHeight,
			headerOcclusionHeight,
			leftPanelWidth,
			routeBoundsCoordinates,
			screenWidth,
		],
	);
	const hasLocation = !!userCoordinate;
	const hasRouteTargets = Boolean(userCoordinate && selectedHospitalCoordinate);
	const routeReady = hasRouteTargets
		? routeBoundsCoordinates.length >= 2 && !isCalculatingRoute
		: !isCalculatingRoute;
	const occlusionSignature = `${Math.round(bottomSheetHeight)}|${Math.round(leftPanelWidth)}`;

	useEffect(() => {
		if (routeOriginCoordinate && routeDestinationCoordinate) {
			calculateRoute(routeOriginCoordinate, routeDestinationCoordinate);
			return;
		}

		clearRoute();
	}, [calculateRoute, clearRoute, routeDestinationCoordinate, routeOriginCoordinate]);

	useEffect(() => {
		onRouteInfoChange?.({
			durationSec: resolvedRouteInfo.durationSec ?? null,
			distanceMeters: resolvedRouteInfo.distanceMeters ?? null,
			coordinates: previewRouteCoordinates,
		});
	}, [
		onRouteInfoChange,
		previewRouteCoordinates,
		resolvedRouteInfo.distanceMeters,
		resolvedRouteInfo.durationSec,
	]);

	useEffect(() => {
		setIsNearbyOverview(false);
	}, [
		selectedHospitalCoordinate?.latitude,
		selectedHospitalCoordinate?.longitude,
		userCoordinate?.latitude,
		userCoordinate?.longitude,
	]);

	const fitRoute = useCallback((sheetHeight = bottomSheetHeight, panelWidth = leftPanelWidth) => {
		if (!mapRef.current || !hasLocation) return;

		if (
			routeBoundsCoordinates.length >= 2 &&
			typeof mapRef.current?.fitToCoordinates === "function"
		) {
			mapRef.current.fitToCoordinates(routeBoundsCoordinates, {
				edgePadding: getRoutePadding(sheetHeight, panelWidth, headerOcclusionHeight),
				animated: true,
			});
			setIsNearbyOverview(false);
			return;
		}

		mapRef.current?.animateToRegion?.(
			buildRegionForPoints(
				routeBoundsCoordinates,
				sheetHeight,
				panelWidth,
				screenWidth,
				headerOcclusionHeight,
			),
			320,
		);
		setIsNearbyOverview(false);
	}, [
		bottomSheetHeight,
		hasLocation,
		headerOcclusionHeight,
		leftPanelWidth,
		routeBoundsCoordinates,
		screenWidth,
	]);

	const recenterRouteForWebOcclusion = useCallback(async () => {
		if (
			!isWeb ||
			!mapRef.current ||
			!hasLocation ||
			routeBoundsCoordinates.length < 2 ||
			typeof mapRef.current?.panToCoordinate !== "function" ||
			typeof mapRef.current?.panByPixels !== "function"
		) {
			return;
		}

		try {
			const routeRegion = buildRegionForPoints(
				routeBoundsCoordinates,
				0,
				leftPanelWidth,
				screenWidth,
				headerOcclusionHeight,
			);
			const verticalPanOffset = getWebRoutePanOffset(
				bottomSheetHeight,
				leftPanelWidth,
				headerOcclusionHeight,
			);

			mapRef.current?.panToCoordinate?.({
				latitude: routeRegion.latitude,
				longitude: routeRegion.longitude,
			});
			if (verticalPanOffset) {
				mapRef.current?.panByPixels?.(0, verticalPanOffset);
			}
			setIsNearbyOverview(false);
		} catch (_error) {
			// Keep the current camera if web pan is temporarily unavailable.
		}
	}, [
		bottomSheetHeight,
		headerOcclusionHeight,
		hasLocation,
		isWeb,
		leftPanelWidth,
		routeBoundsCoordinates,
		screenWidth,
	]);

	const fitNearbyHospitals = useCallback(() => {
		if (!mapRef.current || !hasLocation) return;

		if (
			nearbyOverviewCoordinates.length >= 2 &&
			typeof mapRef.current?.fitToCoordinates === "function"
		) {
			mapRef.current.fitToCoordinates(nearbyOverviewCoordinates, {
				edgePadding: getNearbyPadding(
					bottomSheetHeight,
					leftPanelWidth,
					headerOcclusionHeight,
				),
				animated: true,
			});
			setIsNearbyOverview(true);
			return;
		}

		mapRef.current?.animateToRegion?.(
			buildRegionForPoints(
				nearbyOverviewCoordinates,
				bottomSheetHeight,
				leftPanelWidth,
				screenWidth,
				headerOcclusionHeight,
			),
			320,
		);
		setIsNearbyOverview(true);
	}, [
		bottomSheetHeight,
		hasLocation,
		headerOcclusionHeight,
		leftPanelWidth,
		nearbyOverviewCoordinates,
		screenWidth,
	]);

	const centerOnUser = useCallback(() => {
		if (!mapRef.current || !userCoordinate) return;
		mapRef.current?.animateToRegion?.(
			buildUserCenteredRegion(userCoordinate, leftPanelWidth, screenWidth),
			320,
		);
	}, [leftPanelWidth, screenWidth, userCoordinate]);

	useEffect(() => {
		if (!focusOnUserSignal) return;
		centerOnUser();
	}, [centerOnUser, focusOnUserSignal]);

	useEffect(() => {
		if (!mapRef.current || !hasLocation || !isMapReady) return;
		if (routeFitPrimeKeyRef.current === routeFitPrimeKey) {
			return;
		}

		routeFitPrimeKeyRef.current = routeFitPrimeKey;
		fitRoute(bottomSheetHeight, leftPanelWidth);
		const followUpDelay = isAndroid ? 320 : isWeb ? 220 : 180;
		if (!followUpDelay) return undefined;
		const followUp = setTimeout(() => fitRoute(bottomSheetHeight, leftPanelWidth), followUpDelay);
		return () => clearTimeout(followUp);
	}, [
		bottomSheetHeight,
		fitRoute,
		hasLocation,
		isAndroid,
		isMapReady,
		isWeb,
		leftPanelWidth,
		routeFitPrimeKey,
	]);

	useEffect(() => {
		const occlusionChanged = occlusionSignatureRef.current !== occlusionSignature;
		occlusionSignatureRef.current = occlusionSignature;

		if (
			!occlusionChanged ||
			!mapRef.current ||
			!hasLocation ||
			!isMapReady ||
			routeFitPrimeKeyRef.current !== routeFitPrimeKey
		) {
			return;
		}

		if (isWeb) {
			recenterRouteForWebOcclusion();
			return;
		}

		fitRoute(bottomSheetHeight, leftPanelWidth);
	}, [
		bottomSheetHeight,
		fitRoute,
		hasLocation,
		isMapReady,
		isWeb,
		leftPanelWidth,
		occlusionSignature,
		recenterRouteForWebOcclusion,
		routeFitPrimeKey,
	]);

	useEffect(() => {
		if (isMapReady || !hasLocation) {
			return undefined;
		}

		const fallbackTimeout = setTimeout(() => {
			setIsMapReady(true);
		}, isWeb ? 1200 : 900);

		return () => clearTimeout(fallbackTimeout);
	}, [hasLocation, isMapReady, isWeb]);

	useEffect(() => {
		if (!isMapReady) {
			routeFitPrimeKeyRef.current = null;
			occlusionSignatureRef.current = occlusionSignature;
		}
	}, [isMapReady, occlusionSignature]);

	useEffect(() => {
		onReadinessChange?.({
			mapReady: isMapReady,
			routeReady,
			isCalculatingRoute,
		});
	}, [isCalculatingRoute, isMapReady, onReadinessChange, routeReady]);

	return (
		<View style={styles.shell} collapsable={Platform.OS !== "web" ? false : undefined}>
			<MapView
				ref={mapRef}
				collapsable={Platform.OS !== "web" ? false : undefined}
				style={styles.map}
				provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
				customMapStyle={customMapStyle}
				mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
				initialRegion={region}
				scrollEnabled={interactive}
				zoomEnabled={interactive}
				pitchEnabled={false}
				rotateEnabled={false}
				toolbarEnabled={false}
				showsCompass={false}
				showsScale={false}
				showsBuildings={true}
				showsTraffic={false}
				showsMyLocationButton={false}
				showsUserLocation={false}
				showsZoomControls={false}
				loadingEnabled={false}
				userInterfaceStyle={isDarkMode ? "dark" : "light"}
				onMapReady={() => setIsMapReady(true)}
				onMapLoaded={() => setIsMapReady(true)}
			>
				{routeBoundsCoordinates.length > 1 ? (
					<>
						<Polyline
							coordinates={routeBoundsCoordinates}
							strokeColor={routeHaloColor}
							strokeWidth={renderTokens.routeHaloWidth}
							lineDashPattern={routeDashPattern}
							lineCap="round"
							lineJoin="round"
						/>
						<Polyline
							coordinates={routeBoundsCoordinates}
							strokeColor={routeCoreColor}
							strokeWidth={renderTokens.routeCoreWidth}
							lineDashPattern={routeDashPattern}
							lineCap="round"
							lineJoin="round"
						/>
					</>
				) : null}

				{visibleHospitals.map((hospital, index) => {
					const coordinate = toCoordinate(hospital);
					if (!coordinate) return null;
					const isSelected = selectedHospital?.id
						? hospital?.id === selectedHospital.id
						: index === 0;

					return (
						<Marker
							key={hospital?.id || `${hospital?.name || "hospital"}-${index}`}
							coordinate={coordinate}
							anchor={{ x: 0.5, y: 0.5 }}
							centerOffset={getHospitalMarkerCenterOffset(isSelected)}
							zIndex={isSelected ? 100 : 10 - index}
							image={isSelected ? SELECTED_HOSPITAL_MARKER_IMAGE : HOSPITAL_MARKER_IMAGE}
							imageSize={isSelected ? { width: 81, height: 137 } : { width: 60.75, height: 102.5 }}
							tracksViewChanges={false}
							title={hospital?.name || "Hospital"}
							onPress={onHospitalPress ? () => onHospitalPress(hospital) : undefined}
						/>
					);
				})}

				{effectiveServiceMarkerCoordinate && serviceMarkerKind === "ambulance" ? (
					<Marker
						coordinate={effectiveServiceMarkerCoordinate}
						anchor={{ x: 0.5, y: 0.5 }}
						zIndex={140}
						image={effectiveAmbulanceMarkerImage}
						imageSize={{ width: 46, height: 46 }}
						tracksViewChanges={false}
						opacity={serviceMarkerOpacity}
						title="Transport"
					/>
				) : null}

				{hasLocation ? (
					<Marker
						coordinate={userCoordinate}
						zIndex={120}
						title={placeLabel || "Your location"}
						pinColor={isWeb ? undefined : "#3B82F6"}
					/>
				) : null}
			</MapView>

			{showInternalSkeleton && !isMapReady ? (
				<View
					pointerEvents="none"
					style={[
						styles.skeletonOverlay,
						{
							backgroundColor: isDarkMode ? "#0B0F1A" : "#F8FAFC",
						},
					]}
				>
					<View
						style={[
							styles.skeletonRoadPrimary,
							{
								backgroundColor: isDarkMode
									? "rgba(255,255,255,0.07)"
									: "rgba(15,23,42,0.07)",
							},
						]}
					/>
					<View
						style={[
							styles.skeletonRoadSecondary,
							{
								backgroundColor: isDarkMode
									? "rgba(255,255,255,0.05)"
									: "rgba(15,23,42,0.05)",
							},
						]}
					/>
					<View
						style={[
							styles.skeletonRoadTertiary,
							{
								backgroundColor: isDarkMode
									? "rgba(255,255,255,0.045)"
									: "rgba(15,23,42,0.045)",
							},
						]}
					/>
					<View
						style={[
							styles.skeletonPinWrap,
							{
								backgroundColor: isDarkMode
									? "rgba(11,15,26,0.78)"
									: "rgba(255,255,255,0.9)",
							},
						]}
					>
						<Ionicons name="location" size={20} color={COLORS.brandPrimary} />
					</View>
				</View>
			) : null}

			<LinearGradient
				pointerEvents="none"
				colors={
					isDarkMode
						? ["rgba(11,15,26,0.00)", "rgba(11,15,26,0.00)", "rgba(11,15,26,0.14)"]
						: ["rgba(255,255,255,0.00)", "rgba(255,255,255,0.00)", "rgba(255,255,255,0.04)"]
				}
				style={styles.scrim}
			/>

			{hasLocation && showControls ? (
				<MapControls
					onRecenter={centerOnUser}
					onExpand={fitNearbyHospitals}
					isZoomedOut={isNearbyOverview}
					isDarkMode={isDarkMode}
					topOffset={controlsMode === "top" ? controlsTopOffset : undefined}
					bottomOffset={
						controlsMode === "top"
							? undefined
							: Math.max(bottomSheetHeight + 14, controlsBottomOffsetBase || 198)
					}
					rightOffset={controlsRightOffset}
					secondaryIconName="scan-circle-outline"
				/>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	shell: {
		flex: 1,
		overflow: "hidden",
	},
	map: {
		...StyleSheet.absoluteFillObject,
	},
	scrim: {
		...StyleSheet.absoluteFillObject,
	},
	skeletonOverlay: {
		...StyleSheet.absoluteFillObject,
		alignItems: "center",
		justifyContent: "center",
	},
	skeletonRoadPrimary: {
		position: "absolute",
		width: "78%",
		height: 6,
		borderRadius: 999,
		top: "36%",
		transform: [{ rotate: "-12deg" }],
	},
	skeletonRoadSecondary: {
		position: "absolute",
		width: "70%",
		height: 5,
		borderRadius: 999,
		top: "52%",
		transform: [{ rotate: "8deg" }],
	},
	skeletonRoadTertiary: {
		position: "absolute",
		width: "34%",
		height: 4,
		borderRadius: 999,
		top: "44%",
		right: "18%",
		transform: [{ rotate: "72deg" }],
	},
	skeletonPinWrap: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000000",
		shadowOpacity: 0.08,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 6 },
	},
});

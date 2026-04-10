import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { MapView, Marker, Polyline, PROVIDER_GOOGLE } from "../../map/MapComponents";
import MapControls from "../../map/MapControls";
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

function buildRegionForPoints(points = [], bottomSheetHeight = 0, leftPanelWidth = 0, screenWidth = 0) {
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
	const latitudeDelta = Math.min(
		Math.max(DEFAULT_REGION.latitudeDelta, rawLatitudeSpan * (routeIsMostlyHorizontal ? 1.44 : 1.56) + 0.0042),
		0.12,
	);
	const longitudeDelta = Math.min(
		Math.max(DEFAULT_REGION.longitudeDelta, rawLongitudeSpan * (routeIsMostlyHorizontal ? 1.52 : 1.44) + 0.0042),
		0.12,
	);
	const sheetBias = Math.min(0.18, Math.max(0.05, (Number(bottomSheetHeight) || 0) / 1500));
	const normalizedBias = Math.min(0.12, Math.max(0.02, sheetBias));
	const horizontalBias = getHorizontalOcclusionBias(leftPanelWidth, screenWidth);

	return {
		latitude: (minLat + maxLat) / 2 + latitudeDelta * normalizedBias,
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

function getRoutePadding(bottomSheetHeight = 0, leftPanelWidth = 0) {
	if (Number(leftPanelWidth) > 0) {
		return {
			top: 92,
			right: 54,
			bottom: 58,
			left: Math.max(88, leftPanelWidth + 42),
		};
	}
	return {
		top: 136,
		right: 42,
		bottom: Math.max(256, bottomSheetHeight + 84),
		left: 42,
	};
}

function getNearbyPadding(bottomSheetHeight = 0, leftPanelWidth = 0) {
	if (Number(leftPanelWidth) > 0) {
		return {
			top: 88,
			right: 56,
			bottom: 62,
			left: Math.max(92, leftPanelWidth + 46),
		};
	}
	return {
		top: 132,
		right: 44,
		bottom: Math.max(264, bottomSheetHeight + 92),
		left: 44,
	};
}

function getHospitalMarkerCenterOffset(isSelected) {
	return {
		x: 0,
		y: -(isSelected ? HOSPITAL_MARKER_HEIGHT.selected : HOSPITAL_MARKER_HEIGHT.normal) / 6,
	};
}

export default function EmergencyLocationPreviewMap({
	location,
	hospitals = [],
	selectedHospitalId = null,
	placeLabel = null,
	interactive = false,
	bottomSheetHeight = 0,
	leftPanelWidth = 0,
	controlsMode = "bottom",
	controlsTopOffset = null,
	controlsRightOffset = 14,
	controlsBottomOffsetBase = 198,
	onHospitalPress = null,
	onReadinessChange = null,
	showInternalSkeleton = true,
	showControls = true,
}) {
	const { isDarkMode } = useTheme();
	const { width: screenWidth } = useWindowDimensions();
	const mapRef = useRef(null);
	const [isMapReady, setIsMapReady] = useState(false);
	const [isNearbyOverview, setIsNearbyOverview] = useState(false);
	const isAndroid = Platform.OS === "android";
	const isWeb = Platform.OS === "web";
	const {
		routeCoordinates: previewRouteCoordinates,
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
	const nearbyRadiusKm = useMemo(() => {
		const nearestDistance = Number(selectedHospital?.distanceKm ?? visibleHospitals?.[0]?.distanceKm);
		if (Number.isFinite(nearestDistance) && nearestDistance > 0) {
			return Math.max(2.5, Math.min(8, nearestDistance * 2.2));
		}
		return 4.5;
	}, [selectedHospital?.distanceKm, visibleHospitals]);
	const routeBoundsCoordinates = useMemo(() => {
		if (previewRouteCoordinates.length >= 2) {
			return previewRouteCoordinates;
		}
		return [userCoordinate, selectedHospitalCoordinate].filter(Boolean);
	}, [previewRouteCoordinates, selectedHospitalCoordinate, userCoordinate]);
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
		() => buildRegionForPoints(routeBoundsCoordinates, bottomSheetHeight, leftPanelWidth, screenWidth),
		[bottomSheetHeight, leftPanelWidth, routeBoundsCoordinates, screenWidth],
	);
	const hasLocation = !!userCoordinate;
	const hasRouteTargets = Boolean(userCoordinate && selectedHospitalCoordinate);
	const routeReady = hasRouteTargets
		? routeBoundsCoordinates.length >= 2 && !isCalculatingRoute
		: !isCalculatingRoute;

	useEffect(() => {
		if (userCoordinate && selectedHospitalCoordinate) {
			calculateRoute(userCoordinate, selectedHospitalCoordinate);
			return;
		}

		clearRoute();
	}, [calculateRoute, clearRoute, selectedHospitalCoordinate, userCoordinate]);

	useEffect(() => {
		setIsNearbyOverview(false);
	}, [
		selectedHospitalCoordinate?.latitude,
		selectedHospitalCoordinate?.longitude,
		userCoordinate?.latitude,
		userCoordinate?.longitude,
	]);

	const fitRoute = useCallback(() => {
		if (!mapRef.current || !hasLocation) return;

		if (
			routeBoundsCoordinates.length >= 2 &&
			typeof mapRef.current?.fitToCoordinates === "function"
		) {
			mapRef.current.fitToCoordinates(routeBoundsCoordinates, {
				edgePadding: getRoutePadding(bottomSheetHeight, leftPanelWidth),
				animated: true,
			});
			setIsNearbyOverview(false);
			return;
		}

		mapRef.current?.animateToRegion?.(region, 320);
		setIsNearbyOverview(false);
	}, [bottomSheetHeight, hasLocation, leftPanelWidth, region, routeBoundsCoordinates]);

	const fitNearbyHospitals = useCallback(() => {
		if (!mapRef.current || !hasLocation) return;

		if (
			nearbyOverviewCoordinates.length >= 2 &&
			typeof mapRef.current?.fitToCoordinates === "function"
		) {
			mapRef.current.fitToCoordinates(nearbyOverviewCoordinates, {
				edgePadding: getNearbyPadding(bottomSheetHeight, leftPanelWidth),
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
			),
			320,
		);
		setIsNearbyOverview(true);
	}, [bottomSheetHeight, hasLocation, leftPanelWidth, nearbyOverviewCoordinates, screenWidth]);

	const centerOnUser = useCallback(() => {
		if (!mapRef.current || !userCoordinate) return;
		mapRef.current?.animateToRegion?.(
			buildUserCenteredRegion(userCoordinate, leftPanelWidth, screenWidth),
			320,
		);
	}, [leftPanelWidth, screenWidth, userCoordinate]);

	useEffect(() => {
		if (!mapRef.current || !hasLocation || !isMapReady) return;

		fitRoute();
		const followUpDelay = isAndroid ? 320 : isWeb ? 220 : 180;
		const followUp = setTimeout(fitRoute, followUpDelay);
		return () => clearTimeout(followUp);
	}, [fitRoute, hasLocation, isAndroid, isMapReady, isWeb]);

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
				googleRenderer={Platform.OS === "android" ? "LEGACY" : undefined}
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
							strokeColor={isDarkMode ? "rgba(248,113,113,0.04)" : "rgba(185,28,28,0.035)"}
							strokeWidth={8}
							lineCap="round"
							lineJoin="round"
						/>
						<Polyline
							coordinates={routeBoundsCoordinates}
							strokeColor={COLORS.brandPrimary}
							strokeWidth={3.25}
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
							title={hospital?.name || "Hospital"}
							onPress={onHospitalPress ? () => onHospitalPress(hospital) : undefined}
						/>
					);
				})}

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

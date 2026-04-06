import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MapView, Marker, Polyline, PROVIDER_GOOGLE } from "../../map/MapComponents";
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

const HOSPITAL_MARKER_IMAGE = require("../../../assets/map/selected_hospital.png");

const HOSPITAL_MARKER_HEIGHT = 137;
const HOSPITAL_MARKER_CENTER_OFFSET = {
	x: 0,
	y: -HOSPITAL_MARKER_HEIGHT / 6,
};

function toCoordinate(source) {
	if (!source || typeof source !== "object") return null;
	if (Number.isFinite(source.latitude) && Number.isFinite(source.longitude)) {
		return { latitude: Number(source.latitude), longitude: Number(source.longitude) };
	}
	if (source.coordinates && Number.isFinite(source.coordinates.latitude) && Number.isFinite(source.coordinates.longitude)) {
		return {
			latitude: Number(source.coordinates.latitude),
			longitude: Number(source.coordinates.longitude),
		};
	}
	return null;
}

function getRegionForCoordinates(coordinates, bottomPadding = 0) {
	if (!Array.isArray(coordinates) || coordinates.length === 0) {
		return DEFAULT_REGION;
	}

	const latitudes = coordinates.map((point) => Number(point.latitude)).filter(Number.isFinite);
	const longitudes = coordinates.map((point) => Number(point.longitude)).filter(Number.isFinite);
	if (!latitudes.length || !longitudes.length) {
		return DEFAULT_REGION;
	}

	const minLatitude = Math.min(...latitudes);
	const maxLatitude = Math.max(...latitudes);
	const minLongitude = Math.min(...longitudes);
	const maxLongitude = Math.max(...longitudes);
	const latitudeSpan = Math.max(0.0048, (maxLatitude - minLatitude) * 1.75);
	const longitudeSpan = Math.max(0.0048, (maxLongitude - minLongitude) * 1.6);
	const routeIsMostlyHorizontal = longitudeSpan > latitudeSpan * 1.3;
	const effectiveVerticalSpan = routeIsMostlyHorizontal
		? Math.max(latitudeSpan, longitudeSpan * 0.7)
		: latitudeSpan;
	const verticalBias = routeIsMostlyHorizontal
		? Math.min(0.68, Math.max(0.5, bottomPadding / 720))
		: Math.min(0.52, Math.max(0.36, bottomPadding / 860));

	return {
		latitude: (minLatitude + maxLatitude) / 2 - effectiveVerticalSpan * verticalBias,
		longitude: (minLongitude + maxLongitude) / 2,
		latitudeDelta: latitudeSpan,
		longitudeDelta: longitudeSpan,
	};
}

const DEFAULT_REGION = {
	latitude: 37.7749,
	longitude: -122.4194,
	latitudeDelta: 0.04,
	longitudeDelta: 0.04,
};

export default function EmergencyHospitalRoutePreview({
	origin,
	hospital,
	bottomPadding = 0,
	routeCoordinates = [],
	routeInfo = null,
	isCalculatingRoute = false,
	visible = true,
	showLoadingBadge = true,
}) {
	const { isDarkMode } = useTheme();
	const mapRef = useRef(null);
	const fade = useRef(new Animated.Value(visible ? 1 : 0)).current;
	const loadingOverlayOpacity = useRef(new Animated.Value(0.46)).current;
	const [isMapReady, setIsMapReady] = useState(Platform.OS !== "android");

	const originCoordinate = useMemo(() => toCoordinate(origin), [origin]);
	const hospitalCoordinate = useMemo(() => toCoordinate(hospital), [hospital]);
	const routeBoundsCoordinates = useMemo(() => {
		if (routeCoordinates.length >= 2) {
			return routeCoordinates;
		}
		return [originCoordinate, hospitalCoordinate].filter(Boolean);
	}, [hospitalCoordinate, originCoordinate, routeCoordinates]);
	const initialRegion = useMemo(() => {
		return getRegionForCoordinates(routeBoundsCoordinates, bottomPadding);
	}, [bottomPadding, routeBoundsCoordinates]);
	const customMapStyle =
		Platform.OS === "android"
			? isDarkMode
				? darkAndroidMapStyle
				: lightAndroidMapStyle
			: Platform.OS === "web"
				? isDarkMode
					? darkWebMapStyle
					: lightWebMapStyle
			: isDarkMode
				? darkMapStyle
				: lightMapStyle;
	const routeRenderKey = useMemo(
		() =>
			[
				hospital?.id || "hospital",
				routeCoordinates.length,
				routeInfo?.distanceMeters || 0,
				routeInfo?.durationSec || 0,
			].join(":"),
		[hospital?.id, routeCoordinates.length, routeInfo?.distanceMeters, routeInfo?.durationSec],
	);

	useEffect(() => {
		if (Platform.OS !== "android") return undefined;
		if (!visible || !isMapReady || !mapRef.current || routeBoundsCoordinates.length < 2) {
			return undefined;
		}

		const edgePadding = {
			top: 28,
			right: 28,
			bottom: Math.max(28, bottomPadding + 22),
			left: 28,
		};

		const fit = () => {
			if (!mapRef.current) return;
			if (routeCoordinates.length > 1 && mapRef.current.fitToCoordinates) {
				mapRef.current.fitToCoordinates(routeCoordinates, {
					edgePadding,
					animated: true,
				});
				return;
			}

			mapRef.current.animateToRegion?.(initialRegion, 280);
		};

		const firstPassTimeout = setTimeout(fit, 90);
		const secondPassTimeout = setTimeout(fit, 280);

		return () => {
			clearTimeout(firstPassTimeout);
			clearTimeout(secondPassTimeout);
		};
	}, [
		bottomPadding,
		initialRegion,
		isMapReady,
		routeBoundsCoordinates.length,
		routeCoordinates,
		visible,
	]);

	useEffect(() => {
		Animated.timing(fade, {
			toValue: visible ? 1 : 0,
			duration: visible ? 260 : 180,
			useNativeDriver: true,
		}).start();
	}, [fade, visible]);

	useEffect(() => {
		if (!visible || !showLoadingBadge || !isCalculatingRoute) {
			loadingOverlayOpacity.stopAnimation();
			loadingOverlayOpacity.setValue(0.46);
			return undefined;
		}

		const pulse = Animated.loop(
			Animated.sequence([
				Animated.timing(loadingOverlayOpacity, {
					toValue: 0.74,
					duration: 980,
					easing: Easing.inOut(Easing.quad),
					useNativeDriver: true,
				}),
				Animated.timing(loadingOverlayOpacity, {
					toValue: 0.42,
					duration: 980,
					easing: Easing.inOut(Easing.quad),
					useNativeDriver: true,
				}),
			]),
		);

		pulse.start();
		return () => {
			pulse.stop();
			loadingOverlayOpacity.stopAnimation();
		};
	}, [isCalculatingRoute, loadingOverlayOpacity, showLoadingBadge, visible]);

	return (
		<Animated.View pointerEvents="none" style={[styles.container, { opacity: fade }]}>
			<MapView
				ref={mapRef}
				style={styles.map}
				provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
				googleRenderer={Platform.OS === "android" ? "LEGACY" : undefined}
				customMapStyle={customMapStyle}
				mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
				initialRegion={initialRegion}
				scrollEnabled={false}
				zoomEnabled={false}
				pitchEnabled={false}
				rotateEnabled={false}
				showsCompass={false}
				showsScale={false}
				showsBuildings={true}
				showsTraffic={false}
				showsMyLocationButton={false}
				showsUserLocation={false}
				userInterfaceStyle={isDarkMode ? "dark" : "light"}
				onMapReady={() => setIsMapReady(true)}
			>
				{routeCoordinates.length > 1 ? (
					<Polyline
						key={`${routeRenderKey}-${visible ? "visible" : "hidden"}`}
						coordinates={routeCoordinates}
						strokeColor={COLORS.brandPrimary}
						strokeWidth={4}
						lineCap="round"
						lineJoin="round"
					/>
				) : null}
				{originCoordinate ? (
					<Marker
						coordinate={originCoordinate}
						pinColor={COLORS.brandPrimary}
						tracksViewChanges={false}
					/>
				) : null}
				{hospitalCoordinate ? (
					<Marker
						coordinate={hospitalCoordinate}
						image={HOSPITAL_MARKER_IMAGE}
						pinColor={COLORS.brandPrimary}
						anchor={{ x: 0.5, y: 0.5 }}
						centerOffset={HOSPITAL_MARKER_CENTER_OFFSET}
						tracksViewChanges={false}
						title={hospital?.name || "Hospital"}
					/>
				) : null}
			</MapView>

			<LinearGradient
				pointerEvents="none"
				colors={
					isDarkMode
						? ["rgba(11,15,26,0.04)", "rgba(11,15,26,0.12)", "rgba(11,15,26,0.52)"]
						: ["rgba(255,255,255,0.00)", "rgba(255,255,255,0.025)", "rgba(255,255,255,0.14)"]
				}
				style={styles.scrim}
			/>

			{showLoadingBadge && visible && isCalculatingRoute ? (
				<Animated.View
					pointerEvents="none"
					style={[styles.loadingOverlay, { opacity: loadingOverlayOpacity }]}
				>
					<View style={styles.loadingSheet}>
						<View style={styles.loadingLineLong} />
						<View style={styles.loadingLineShort} />
					</View>
				</Animated.View>
			) : null}
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFillObject,
	},
	map: {
		...StyleSheet.absoluteFillObject,
	},
	scrim: {
		...StyleSheet.absoluteFillObject,
	},
	loadingOverlay: {
		...StyleSheet.absoluteFillObject,
		alignItems: "center",
		justifyContent: "flex-end",
		paddingHorizontal: 22,
		paddingBottom: 132,
	},
	loadingSheet: {
		width: "100%",
		maxWidth: 280,
		borderRadius: 22,
		paddingHorizontal: 18,
		paddingVertical: 16,
		backgroundColor: "rgba(255,255,255,0.58)",
		gap: 10,
	},
	loadingLineLong: {
		height: 13,
		width: "74%",
		borderRadius: 999,
		backgroundColor: "rgba(255,255,255,0.96)",
	},
	loadingLineShort: {
		height: 11,
		width: "46%",
		borderRadius: 999,
		backgroundColor: "rgba(255,255,255,0.88)",
	},
	loadingBadge: {
		position: "absolute",
		top: 18,
		right: 18,
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: "rgba(255,255,255,0.72)",
		alignItems: "center",
		justifyContent: "center",
	},
});

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { MapView, Marker, PROVIDER_GOOGLE } from "../../map/MapComponents";
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

const DEFAULT_REGION = {
	latitude: 37.7749,
	longitude: -122.4194,
	latitudeDelta: 0.0038,
	longitudeDelta: 0.0038,
};

function buildRegion(location) {
	if (
		location &&
		Number.isFinite(Number(location.latitude)) &&
		Number.isFinite(Number(location.longitude))
	) {
		return {
			latitude: Number(location.latitude),
			longitude: Number(location.longitude),
			latitudeDelta: DEFAULT_REGION.latitudeDelta,
			longitudeDelta: DEFAULT_REGION.longitudeDelta,
		};
	}

	return DEFAULT_REGION;
}

export default function EmergencyLocationPreviewMap({ location }) {
	const { isDarkMode } = useTheme();
	const mapRef = useRef(null);
	const [isMapReady, setIsMapReady] = useState(
		Platform.OS === "web" || Platform.OS === "android",
	);
	const isAndroid = Platform.OS === "android";
	const isWeb = Platform.OS === "web";
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
	const region = useMemo(
		() => buildRegion(location),
		[location?.latitude, location?.longitude],
	);
	const hasLocation =
		location &&
		Number.isFinite(Number(location.latitude)) &&
		Number.isFinite(Number(location.longitude));

	useEffect(() => {
		if (!mapRef.current || !hasLocation) return;
		if (isAndroid && !isMapReady) return;

		const timeout = setTimeout(() => {
			mapRef.current?.animateToRegion?.(region, 260);
		}, isAndroid ? 120 : 60);

		return () => clearTimeout(timeout);
	}, [hasLocation, isAndroid, isMapReady, region]);

	useEffect(() => {
		if (Platform.OS === "web" || Platform.OS === "android" || isMapReady || !hasLocation) {
			return undefined;
		}

		const fallbackTimeout = setTimeout(() => {
			setIsMapReady(true);
		}, 900);

		return () => clearTimeout(fallbackTimeout);
	}, [hasLocation, isMapReady]);

	return (
		<View style={styles.shell} collapsable={false}>
			<MapView
				ref={mapRef}
				collapsable={false}
				style={styles.map}
				provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
				googleRenderer={Platform.OS === "android" ? "LEGACY" : undefined}
				customMapStyle={customMapStyle}
				mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
				initialRegion={region}
				scrollEnabled={false}
				zoomEnabled={false}
				pitchEnabled={false}
				rotateEnabled={false}
				toolbarEnabled={false}
				showsCompass={false}
				showsScale={false}
				showsBuildings={true}
				showsTraffic={false}
				showsMyLocationButton={false}
				showsUserLocation={false}
				loadingEnabled={false}
				userInterfaceStyle={isDarkMode ? "dark" : "light"}
				onMapReady={() => setIsMapReady(true)}
				onMapLoaded={() => setIsMapReady(true)}
			>
				{hasLocation ? (
					<Marker
						coordinate={{
							latitude: Number(location.latitude),
							longitude: Number(location.longitude),
						}}
						pinColor={COLORS.brandPrimary}
						tracksViewChanges={false}
					/>
				) : null}
			</MapView>

			{!isMapReady ? (
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
						? ["rgba(11,15,26,0.00)", "rgba(11,15,26,0.04)", "rgba(11,15,26,0.18)"]
						: ["rgba(255,255,255,0.00)", "rgba(255,255,255,0.015)", "rgba(255,255,255,0.045)"]
				}
				style={styles.scrim}
			/>

			<View
				pointerEvents="none"
				style={[
					styles.pill,
					{
						backgroundColor: isDarkMode
							? "rgba(11,15,26,0.78)"
							: "rgba(255,255,255,0.88)",
					},
				]}
			>
				<Ionicons name="navigate-circle" size={16} color={COLORS.brandPrimary} />
				<Text
					style={[
						styles.pillText,
						{ color: isDarkMode ? "#F8FAFC" : "#0F172A" },
					]}
				>
					You are here
				</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	shell: {
		flex: 1,
		borderRadius: 28,
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
	pill: {
		position: "absolute",
		top: 14,
		left: 14,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 999,
	},
	pillText: {
		fontSize: 13,
		lineHeight: 16,
		fontWeight: "600",
	},
});

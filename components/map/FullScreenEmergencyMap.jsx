import React, {
	useState,
	useEffect,
	useRef,
	useImperativeHandle,
	forwardRef,
	useCallback,
} from "react";
import {
	View,
	Text,
	StyleSheet,
	Alert,
	ActivityIndicator,
	Pressable,
	Animated,
	Platform,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons, Fontisto } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import { HOSPITALS } from "../../data/hospitals";

/**
 * PulsingMarker - Animated marker with pulse effect for selected state
 */
const PulsingMarker = ({ isSelected, children }) => {
	const pulseAnim = useRef(new Animated.Value(1)).current;
	const opacityAnim = useRef(new Animated.Value(0.6)).current;

	useEffect(() => {
		if (isSelected) {
			const pulseAnimation = Animated.loop(
				Animated.parallel([
					Animated.sequence([
						Animated.timing(pulseAnim, {
							toValue: 1.8,
							duration: 1200,
							useNativeDriver: true,
						}),
						Animated.timing(pulseAnim, {
							toValue: 1,
							duration: 0,
							useNativeDriver: true,
						}),
					]),
					Animated.sequence([
						Animated.timing(opacityAnim, {
							toValue: 0,
							duration: 1200,
							useNativeDriver: true,
						}),
						Animated.timing(opacityAnim, {
							toValue: 0.6,
							duration: 0,
							useNativeDriver: true,
						}),
					]),
				])
			);
			pulseAnimation.start();
			return () => pulseAnimation.stop();
		} else {
			pulseAnim.setValue(1);
			opacityAnim.setValue(0.6);
		}
	}, [isSelected]);

	return (
		<View style={styles.markerWrapper}>
			{isSelected && (
				<Animated.View
					style={[
						styles.pulseRing,
						{
							transform: [{ scale: pulseAnim }],
							opacity: opacityAnim,
						},
					]}
				/>
			)}
			{children}
		</View>
	);
};

/**
 * Generate hospitals near user location using real hospital data
 * Uses HOSPITALS from data/hospitals.js with randomized coordinates
 * relative to user's current position
 *
 * Preserves real hospital data including:
 * - availableBeds (for bed booking mode)
 * - specialties (for filtering)
 * - features, images, ratings, etc.
 */
const generateNearbyHospitals = (userLat, userLng, count = 6) => {
	// Shuffle and take up to 'count' hospitals from real data
	const shuffled = [...HOSPITALS].sort(() => Math.random() - 0.5);
	const selected = shuffled.slice(0, Math.min(count, HOSPITALS.length));

	const generated = selected.map((hospital) => {
		// Randomize coordinates around user location (within ~1.5km radius)
		const latOffset = (Math.random() - 0.5) * 0.03;
		const lngOffset = (Math.random() - 0.5) * 0.03;

		// Calculate actual distance and ETA from offsets
		const distanceKm = Math.sqrt(latOffset ** 2 + lngOffset ** 2) * 111;
		const etaMins = Math.max(2, Math.ceil(distanceKm * 3));

		return {
			...hospital, // Spread all real hospital data (name, image, features, beds, etc.)
			id: `nearby-${hospital.id}`, // Unique ID for this session
			coordinates: {
				latitude: userLat + latOffset,
				longitude: userLng + lngOffset,
			},
			// Override distance/ETA with calculated values
			distance: `${distanceKm.toFixed(1)} km`,
			eta: `${etaMins} mins`,
			// Keep original data from HOSPITALS - only use fallback if not present
			// This ensures bed booking works correctly with real bed counts
			availableBeds: hospital.availableBeds ?? Math.floor(Math.random() * 8) + 1,
			waitTime: hospital.waitTime ?? `${Math.floor(Math.random() * 15) + 5} mins`,
			ambulances: hospital.ambulances ?? Math.floor(Math.random() * 4) + 1,
			status: hospital.status ?? (Math.random() > 0.2 ? "available" : "busy"),
		};
	});

	// Sort by distance (closest first)
	return generated.sort(
		(a, b) => parseFloat(a.distance) - parseFloat(b.distance)
	);
};

/**
 * FullScreenEmergencyMap - Edge-to-edge map with enhanced POIs
 *
 * Features:
 * - Spans entire screen (behind status bar)
 * - Blur overlay on status bar area
 * - Enhanced POI visibility (buildings, landmarks)
 * - Animated zoom to selected hospital
 * - Exposes animateToHospital method via ref
 * - Conditional control visibility (hide when sheet expanded)
 */
const FullScreenEmergencyMap = forwardRef(
	(
		{
			hospitals: propHospitals,
			onHospitalSelect,
			onHospitalsGenerated,
			onMapReady,
			selectedHospitalId,
			mode = "emergency",
			showControls = true,
		},
		ref
	) => {
		const { isDarkMode } = useTheme();
		const insets = useSafeAreaInsets();
		const mapRef = useRef(null);

		const [userLocation, setUserLocation] = useState(null);
		const [locationPermission, setLocationPermission] = useState(false);
		const [isLoading, setIsLoading] = useState(true);
		const [nearbyHospitals, setNearbyHospitals] = useState([]);

		const hospitals =
			propHospitals && propHospitals.length > 0
				? propHospitals
				: nearbyHospitals;

		// Expose methods to parent via ref
		useImperativeHandle(ref, () => ({
			animateToHospital: (hospital) => {
				if (mapRef.current && hospital?.coordinates) {
					mapRef.current.animateToRegion(
						{
							latitude: hospital.coordinates.latitude,
							longitude: hospital.coordinates.longitude,
							latitudeDelta: 0.008,
							longitudeDelta: 0.008,
						},
						500
					);
				}
			},
			fitToAllHospitals: () => {
				if (mapRef.current && hospitals.length > 0) {
					const coordinates = hospitals.map((h) => h.coordinates);
					if (userLocation) {
						coordinates.push({
							latitude: userLocation.latitude,
							longitude: userLocation.longitude,
						});
					}
					mapRef.current.fitToCoordinates(coordinates, {
						edgePadding: { top: 100, right: 60, bottom: 400, left: 60 },
						animated: true,
					});
				}
			},
		}));

		// Request location permissions
		useEffect(() => {
			requestLocationPermission();
		}, []);

		const requestLocationPermission = async () => {
			try {
				const { status } = await Location.requestForegroundPermissionsAsync();
				if (status !== "granted") {
					Alert.alert(
						"Location Permission Required",
						"iVisit needs location access to show nearby hospitals.",
						[
							{ text: "Cancel", style: "cancel" },
							{
								text: "Open Settings",
								onPress: () => Location.requestForegroundPermissionsAsync(),
							},
						]
					);
					setIsLoading(false);
					return;
				}
				setLocationPermission(true);
				await getCurrentLocation();
			} catch (error) {
				console.error("Location permission error:", error);
				setIsLoading(false);
			}
		};

		const getCurrentLocation = async () => {
			try {
				const location = await Location.getCurrentPositionAsync({
					accuracy: Location.Accuracy.High,
					timeout: 10000,
				});
				const userCoords = {
					latitude: location.coords.latitude,
					longitude: location.coords.longitude,
					latitudeDelta: 0.04,
					longitudeDelta: 0.04,
				};
				setUserLocation(userCoords);

				const generated = generateNearbyHospitals(
					userCoords.latitude,
					userCoords.longitude,
					6
				);
				setNearbyHospitals(generated);
				if (onHospitalsGenerated) {
					onHospitalsGenerated(generated);
				}
			} catch (error) {
				console.error("Get location error:", error);
				const fallbackCoords = {
					latitude: 37.7749,
					longitude: -122.4194,
					latitudeDelta: 0.04,
					longitudeDelta: 0.04,
				};
				setUserLocation(fallbackCoords);
				const generated = generateNearbyHospitals(
					fallbackCoords.latitude,
					fallbackCoords.longitude,
					6
				);
				setNearbyHospitals(generated);
				if (onHospitalsGenerated) {
					onHospitalsGenerated(generated);
				}
			} finally {
				setIsLoading(false);
				if (onMapReady) {
					onMapReady();
				}
			}
		};

		const handleHospitalPress = (hospital) => {
			if (onHospitalSelect) {
				onHospitalSelect(hospital);
			}
			// Animate to hospital location
			if (mapRef.current) {
				mapRef.current.animateToRegion(
					{
						latitude: hospital.coordinates.latitude,
						longitude: hospital.coordinates.longitude,
						latitudeDelta: 0.008,
						longitudeDelta: 0.008,
					},
					500
				);
			}
		};

		// Fit map to show all hospitals when they load
		useEffect(() => {
			if (
				mapRef.current &&
				hospitals.length > 0 &&
				!isLoading &&
				locationPermission
			) {
				const timer = setTimeout(() => {
					const coordinates = hospitals.map((h) => h.coordinates);
					if (userLocation) {
						coordinates.push({
							latitude: userLocation.latitude,
							longitude: userLocation.longitude,
						});
					}
					mapRef.current.fitToCoordinates(coordinates, {
						edgePadding: { top: 100, right: 60, bottom: 400, left: 60 },
						animated: true,
					});
				}, 300);
				return () => clearTimeout(timer);
			}
		}, [hospitals, isLoading, locationPermission]);

		const mapStyle = isDarkMode ? darkMapStyle : lightMapStyle;

		// Recenter to user location - must be before early returns
		const handleRecenter = useCallback(() => {
			if (mapRef.current && userLocation) {
				mapRef.current.animateToRegion(
					{
						latitude: userLocation.latitude,
						longitude: userLocation.longitude,
						latitudeDelta: 0.02,
						longitudeDelta: 0.02,
					},
					500
				);
			}
		}, [userLocation]);

		if (isLoading) {
			return (
				<View
					style={[
						styles.container,
						styles.loadingContainer,
						{ backgroundColor: isDarkMode ? "#0B0F1A" : "#F8FAFC" },
					]}
				>
					<ActivityIndicator size="large" color={COLORS.brandPrimary} />
					<Text
						style={[
							styles.loadingText,
							{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
						]}
					>
						Finding nearby hospitals...
					</Text>
				</View>
			);
		}

		if (!locationPermission) {
			return (
				<View
					style={[
						styles.container,
						styles.errorContainer,
						{ backgroundColor: isDarkMode ? "#0B0F1A" : "#F8FAFC" },
					]}
				>
					<Ionicons
						name="location-outline"
						size={48}
						color={isDarkMode ? COLORS.textMutedDark : COLORS.textMuted}
					/>
					<Text
						style={[
							styles.errorText,
							{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
						]}
					>
						Location permission required
					</Text>
					<Text
						style={[
							styles.errorSubtext,
							{ color: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted },
						]}
					>
						Enable location to see nearby hospitals
					</Text>
				</View>
			);
		}

		return (
			<View style={styles.container}>
				<MapView
					ref={mapRef}
					style={styles.map}
					provider={PROVIDER_GOOGLE}
					customMapStyle={mapStyle}
					initialRegion={userLocation}
					showsUserLocation={locationPermission}
					showsMyLocationButton={false}
					showsCompass={false}
					showsScale={false}
					showsBuildings={true}
					showsTraffic={false}
					showsIndoors={true}
					showsPointsOfInterest={true}
					loadingEnabled={true}
					loadingIndicatorColor={COLORS.brandPrimary}
					loadingBackgroundColor={isDarkMode ? "#0B0F1A" : "#F8FAFC"}
					mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
					userInterfaceStyle={isDarkMode ? "dark" : "light"}
				>
					{/* Hospital Markers */}
					{hospitals.map((hospital) => {
						const isSelected = selectedHospitalId === hospital.id;
						return (
							<Marker
								key={hospital.id}
								coordinate={hospital.coordinates}
								onPress={() => handleHospitalPress(hospital)}
								anchor={{ x: 0.5, y: 0.5 }}
								tracksViewChanges={isSelected}
							>
								<PulsingMarker isSelected={isSelected}>
									<View
										style={[
											styles.hospitalMarker,
											isSelected && styles.hospitalMarkerSelected,
										]}
									>
										<Ionicons
											name="add"
											size={isSelected ? 14 : 10}
											color={isSelected ? "#FFFFFF" : COLORS.brandPrimary}
										/>
									</View>
								</PulsingMarker>
							</Marker>
						);
					})}
				</MapView>

				{/* Status Bar Blur Overlay */}
				<BlurView
					intensity={isDarkMode ? 60 : 40}
					tint={isDarkMode ? "dark" : "light"}
					style={[styles.statusBarBlur, { height: insets.top, opacity: 0.5 }]}
				/>

				{/* Map Control Buttons - only show when map is visible */}
				{showControls && (
					<View style={[styles.controlsContainer, { top: insets.top + 200 }]}>
						{/* Recenter Button */}
						<Pressable
							onPress={handleRecenter}
							style={({ pressed }) => [
								styles.controlButton,
								{
									backgroundColor: isDarkMode ? "#0B0F1A" : "#F3E7E7",
									transform: [{ scale: pressed ? 0.95 : 1 }],
									opacity: 0.5,
									...Platform.select({
										ios: {
											shadowColor: "#000",
											shadowOffset: { width: 0, height: 2 },
											shadowOpacity: 0.1,
											shadowRadius: 4,
										},
										android: { elevation: 2 },
									}),
								},
							]}
						>
							<Ionicons
								name="locate"
								size={20}
								color={isDarkMode ? "#FFFFFF" : "#0F172A"}
							/>
						</Pressable>

						{/* Fit to All Hospitals */}
						<Pressable
							onPress={() => {
								if (mapRef.current && hospitals.length > 0) {
									const coordinates = hospitals.map((h) => h.coordinates);
									if (userLocation) {
										coordinates.push({
											latitude: userLocation.latitude,
											longitude: userLocation.longitude,
										});
									}
									mapRef.current.fitToCoordinates(coordinates, {
										edgePadding: { top: 100, right: 60, bottom: 400, left: 60 },
										animated: true,
									});
								}
							}}
							style={({ pressed }) => [
								styles.controlButton,
								{
									backgroundColor: isDarkMode ? "#0B0F1A" : "#F3E7E7",
									transform: [{ scale: pressed ? 0.95 : 1 }],
									opacity: 0.5,
									...Platform.select({
										ios: {
											shadowColor: "#000",
											shadowOffset: { width: 0, height: 2 },
											shadowOpacity: 0.1,
											shadowRadius: 4,
										},
										android: { elevation: 2 },
									}),
								},
							]}
						>
							<Ionicons
								name="expand"
								size={18}
								color={isDarkMode ? "#FFFFFF" : "#0F172A"}
							/>
						</Pressable>
					</View>
				)}
			</View>
		);
	}
);

const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFillObject,
	},
	map: {
		flex: 1,
	},
	loadingContainer: {
		justifyContent: "center",
		alignItems: "center",
	},
	loadingText: {
		fontSize: 14,
		fontWeight: "500",
		marginTop: 12,
	},
	errorContainer: {
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
	},
	errorText: {
		fontSize: 16,
		fontWeight: "600",
		textAlign: "center",
		marginTop: 16,
		marginBottom: 4,
	},
	errorSubtext: {
		fontSize: 13,
		textAlign: "center",
	},
	statusBarBlur: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
	},
	markerWrapper: {
		alignItems: "center",
		justifyContent: "center",
		width: 50,
		height: 50,
	},
	pulseRing: {
		position: "absolute",
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: COLORS.brandPrimary,
	},
	hospitalMarker: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: "#FFFFFF",
		borderWidth: 2.5,
		borderColor: COLORS.brandPrimary,
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 4,
	},
	hospitalMarkerSelected: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: COLORS.brandPrimary,
		borderColor: "#FFFFFF",
		borderWidth: 3,
		shadowOpacity: 0.35,
		shadowRadius: 6,
		elevation: 6,
	},
	controlsContainer: {
		position: "absolute",
		right: 16,
		zIndex: 10,
		gap: 10,
	},
	controlButton: {
		width: 44,
		height: 44,
		borderRadius: 16, // More rounded, no border
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.06,
		shadowRadius: 6,
		elevation: 2,
	},
});

/**
 * Enhanced map styles - Show ALL POIs like web map
 * Shows restaurants, churches, buildings, landmarks - everything visible
 */

// Light mode: Full POI visibility like standard Google Maps
const lightMapStyle = [
	// Base styling - keep it clean but visible
	{ elementType: "geometry", stylers: [{ color: "#F8FAFC" }] },
	{ elementType: "labels.text.fill", stylers: [{ color: "#334155" }] },
	{
		elementType: "labels.text.stroke",
		stylers: [{ color: "#FFFFFF" }, { weight: 2 }],
	},
	{ elementType: "labels.icon", stylers: [{ visibility: "on" }] },

	// Show ALL POIs - restaurants, churches, shops, everything
	{ featureType: "poi", stylers: [{ visibility: "on" }] },
	{
		featureType: "poi",
		elementType: "labels.icon",
		stylers: [{ visibility: "on" }],
	},
	{ featureType: "poi.business", stylers: [{ visibility: "on" }] },
	{ featureType: "poi.attraction", stylers: [{ visibility: "on" }] },
	{ featureType: "poi.government", stylers: [{ visibility: "on" }] },
	{ featureType: "poi.school", stylers: [{ visibility: "on" }] },
	{ featureType: "poi.place_of_worship", stylers: [{ visibility: "on" }] },

	// Parks
	{
		featureType: "poi.park",
		elementType: "geometry",
		stylers: [{ color: "#DCFCE7" }],
	},
	{
		featureType: "poi.park",
		elementType: "labels",
		stylers: [{ visibility: "on" }],
	},
	{
		featureType: "poi.park",
		elementType: "labels.text.fill",
		stylers: [{ color: "#166534" }],
	},

	// Highlight medical facilities with distinct color
	{ featureType: "poi.medical", stylers: [{ visibility: "on" }] },
	{
		featureType: "poi.medical",
		elementType: "geometry",
		stylers: [{ color: "#FEE2E2" }],
	},
	{
		featureType: "poi.medical",
		elementType: "labels.text.fill",
		stylers: [{ color: "#B91C1C" }],
	},
	{
		featureType: "poi.medical",
		elementType: "labels.icon",
		stylers: [{ visibility: "on" }],
	},

	// Show buildings with subtle fill
	{ featureType: "landscape.man_made", stylers: [{ visibility: "on" }] },
	{
		featureType: "landscape.man_made",
		elementType: "geometry.fill",
		stylers: [{ color: "#F1F5F9" }],
	},
	{
		featureType: "landscape.man_made",
		elementType: "geometry.stroke",
		stylers: [{ color: "#E2E8F0" }],
	},

	// Roads - clear and visible
	{
		featureType: "road",
		elementType: "geometry.fill",
		stylers: [{ color: "#FFFFFF" }],
	},
	{
		featureType: "road",
		elementType: "geometry.stroke",
		stylers: [{ color: "#CBD5E1" }],
	},
	{
		featureType: "road",
		elementType: "labels.text.fill",
		stylers: [{ color: "#64748B" }],
	},
	{
		featureType: "road.highway",
		elementType: "geometry.fill",
		stylers: [{ color: "#FEF3C7" }],
	},
	{
		featureType: "road.highway",
		elementType: "geometry.stroke",
		stylers: [{ color: "#FCD34D" }],
	},
	{
		featureType: "road.arterial",
		elementType: "labels",
		stylers: [{ visibility: "on" }],
	},
	{
		featureType: "road.local",
		elementType: "labels",
		stylers: [{ visibility: "on" }],
	},

	// Transit - show stations
	{ featureType: "transit", stylers: [{ visibility: "on" }] },
	{ featureType: "transit.station", stylers: [{ visibility: "on" }] },
	{ featureType: "transit.line", stylers: [{ visibility: "simplified" }] },

	// Water
	{
		featureType: "water",
		elementType: "geometry",
		stylers: [{ color: "#DBEAFE" }],
	},
	{
		featureType: "water",
		elementType: "labels.text.fill",
		stylers: [{ color: "#3B82F6" }],
	},
];

// Dark mode: Full POI visibility with dark theme
const darkMapStyle = [
	// Base styling
	{ elementType: "geometry", stylers: [{ color: "#0F172A" }] },
	{ elementType: "labels.text.fill", stylers: [{ color: "#94A3B8" }] },
	{
		elementType: "labels.text.stroke",
		stylers: [{ color: "#0F172A" }, { weight: 2 }],
	},
	{ elementType: "labels.icon", stylers: [{ visibility: "on" }] },

	// Show ALL POIs
	{ featureType: "poi", stylers: [{ visibility: "on" }] },
	{
		featureType: "poi",
		elementType: "labels.icon",
		stylers: [{ visibility: "on" }],
	},
	{ featureType: "poi.business", stylers: [{ visibility: "on" }] },
	{ featureType: "poi.attraction", stylers: [{ visibility: "on" }] },
	{ featureType: "poi.government", stylers: [{ visibility: "on" }] },
	{ featureType: "poi.school", stylers: [{ visibility: "on" }] },
	{ featureType: "poi.place_of_worship", stylers: [{ visibility: "on" }] },

	// Parks
	{
		featureType: "poi.park",
		elementType: "geometry",
		stylers: [{ color: "#14532D" }],
	},
	{
		featureType: "poi.park",
		elementType: "labels",
		stylers: [{ visibility: "on" }],
	},
	{
		featureType: "poi.park",
		elementType: "labels.text.fill",
		stylers: [{ color: "#4ADE80" }],
	},

	// Highlight medical facilities
	{ featureType: "poi.medical", stylers: [{ visibility: "on" }] },
	{
		featureType: "poi.medical",
		elementType: "geometry",
		stylers: [{ color: "#450A0A" }],
	},
	{
		featureType: "poi.medical",
		elementType: "labels.text.fill",
		stylers: [{ color: "#F87171" }],
	},
	{
		featureType: "poi.medical",
		elementType: "labels.icon",
		stylers: [{ visibility: "on" }],
	},

	// Show buildings
	{ featureType: "landscape.man_made", stylers: [{ visibility: "on" }] },
	{
		featureType: "landscape.man_made",
		elementType: "geometry.fill",
		stylers: [{ color: "#1E293B" }],
	},
	{
		featureType: "landscape.man_made",
		elementType: "geometry.stroke",
		stylers: [{ color: "#334155" }],
	},

	// Roads
	{
		featureType: "road",
		elementType: "geometry.fill",
		stylers: [{ color: "#1E293B" }],
	},
	{
		featureType: "road",
		elementType: "geometry.stroke",
		stylers: [{ color: "#334155" }],
	},
	{
		featureType: "road",
		elementType: "labels.text.fill",
		stylers: [{ color: "#64748B" }],
	},
	{
		featureType: "road.highway",
		elementType: "geometry.fill",
		stylers: [{ color: "#422006" }],
	},
	{
		featureType: "road.highway",
		elementType: "geometry.stroke",
		stylers: [{ color: "#78350F" }],
	},
	{
		featureType: "road.arterial",
		elementType: "labels",
		stylers: [{ visibility: "on" }],
	},
	{
		featureType: "road.local",
		elementType: "labels",
		stylers: [{ visibility: "on" }],
	},

	// Transit
	{ featureType: "transit", stylers: [{ visibility: "on" }] },
	{ featureType: "transit.station", stylers: [{ visibility: "on" }] },
	{ featureType: "transit.line", stylers: [{ visibility: "simplified" }] },

	// Water
	{
		featureType: "water",
		elementType: "geometry",
		stylers: [{ color: "#0C4A6E" }],
	},
	{
		featureType: "water",
		elementType: "labels.text.fill",
		stylers: [{ color: "#38BDF8" }],
	},
];

FullScreenEmergencyMap.displayName = "FullScreenEmergencyMap";

export default FullScreenEmergencyMap;

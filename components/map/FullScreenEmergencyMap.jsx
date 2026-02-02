import {
	useState,
	useEffect,
	useRef,
	useImperativeHandle,
	forwardRef,
	useCallback,
	useMemo,
} from "react";
import {
	View,
	Text,
	StyleSheet,
	Alert,
	ActivityIndicator,
	Pressable,
	Platform,
	Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import { useHospitals } from "../../hooks/emergency/useHospitals";
import PulsingMarker from "./PulsingMarker";
import { darkMapStyle, lightMapStyle } from "./mapStyles";
import { useMapLocation } from "../../hooks/emergency/useMapLocation";
import { useMapRoute } from "../../hooks/emergency/useMapRoute";
import { MapView, Marker, Polyline, PROVIDER_GOOGLE } from "./MapComponents";
import { useAmbulanceAnimation } from "../../hooks/emergency/useAmbulanceAnimation";
import { isValidCoordinate, calculateDistance } from "../../utils/mapUtils";

const DEFAULT_APP_LOAD_DELTAS = { latitudeDelta: 0.04, longitudeDelta: 0.04 };
const BASELINE_ZOOM_IN_FACTOR = 0.92;
const ROUTE_ZOOM_FACTOR = 0.2; // previous was 0.125

import HospitalMarkers from "./HospitalMarkers";
import RouteLayer from "./RouteLayer";
import MapControls from "./MapControls";

import MapErrorBoundary from "./MapErrorBoundary";

/**
 * FullScreenEmergencyMap - Apple/Google Style Map Component
 * Optimized for performance and modularity.
 */
const FullScreenEmergencyMap = forwardRef(
	(
		{
			hospitals: propHospitals,
			onHospitalSelect,
			onHospitalsGenerated,
			onMapReady,
			selectedHospitalId,
			routeHospitalId = null,
			animateAmbulance = false,
			ambulanceTripEtaSeconds = null,
			mode = "emergency",
			showControls = true,
			bottomPadding = 0,
			onRouteCalculated,
			responderLocation,
			responderHeading,
			sheetSnapIndex = 1,
		},
		ref
	) => {
		const componentId = useRef(Math.random().toString(36).substr(2, 9));
		// Component mounting - no debug logs
		
		const { isDarkMode } = useTheme();
		const insets = useSafeAreaInsets();
		const mapRef = useRef(null);

		// Refs for tracking movement/state
		const hasCenteredOnUser = useRef(false);
		const appLoadRegionDeltasRef = useRef(DEFAULT_APP_LOAD_DELTAS);
		const hasComputedBaselineZoomRef = useRef(false);
		const hasAppliedBaselineZoomRef = useRef(false);
		const startupPhaseRef = useRef('initial');
		const lastProgrammaticMoveAtRef = useRef(0);
		const lastZoomLogAtRef = useRef(0);
		const lastZoomLogKeyRef = useRef(null);
		const lastUserPanAtRef = useRef(0);
		const pendingCenterTimeoutRef = useRef(null);

		const [isZoomedOut, setIsZoomedOut] = useState(false);
		const [isMapReadyState, setIsMapReadyState] = useState(false);

		const screenHeight = Dimensions.get("window").height;
		const screenWidth = Dimensions.get("window").width;

		const {
			userLocation,
			locationPermission,
			isLoadingLocation,
			locationError,
			requestLocationPermission,
		} = useMapLocation();

		// Debug logs removed for production

		const { routeCoordinates, routeInfo, calculateRoute, clearRoute } = useMapRoute();

		const initialRegion = useMemo(() => {
			const base = appLoadRegionDeltasRef.current ?? DEFAULT_APP_LOAD_DELTAS;
			if (isValidCoordinate(userLocation)) {
				return {
					latitude: userLocation.latitude,
					longitude: userLocation.longitude,
					latitudeDelta: base?.latitudeDelta ?? 0.04,
					longitudeDelta: base?.longitudeDelta ?? 0.04,
				};
			}
			return {
				latitude: 37.7749,
				longitude: -122.4194,
				latitudeDelta: 0.04,
				longitudeDelta: 0.04,
			};
		}, [userLocation]);

		const hospitals = propHospitals && propHospitals.length > 0 ? propHospitals : [];
		const routeHospitalIdResolved = routeHospitalId ?? selectedHospitalId ?? null;
		const routeHospital = routeHospitalIdResolved && hospitals?.length
			? hospitals.find((h) => h?.id === routeHospitalIdResolved) ?? null
			: null;

		const shouldShowControls = showControls && sheetSnapIndex <= 1;
		const shouldShowHospitalLabels = sheetSnapIndex === 0 && !routeHospitalIdResolved && !selectedHospitalId;

		const mapPadding = {
			top: insets.top + 40,
			bottom: bottomPadding + 20,
			left: 0,
			right: 0,
		};
		const mapPaddingRef = useRef(mapPadding);
		useEffect(() => { mapPaddingRef.current = mapPadding; }, [mapPadding]);

		// Helper: Center map in visible area (considering bottom sheet)
		const scheduleCenterInVisibleArea = useCallback(
			(points, { topPadding, bottomPadding: bottomPad, delayMs = 520, zoomFactor = 1, centerBias = 0.5 } = {}) => {
				if (!mapRef.current || !Array.isArray(points) || points.length === 0) return;

				if (pendingCenterTimeoutRef.current) clearTimeout(pendingCenterTimeoutRef.current);

				let minLat = points[0]?.latitude, maxLat = points[0]?.latitude;
				let minLng = points[0]?.longitude, maxLng = points[0]?.longitude;

				points.forEach(p => {
					if (!p) return;
					minLat = Math.min(minLat, p.latitude); maxLat = Math.max(maxLat, p.latitude);
					minLng = Math.min(minLng, p.longitude); maxLng = Math.max(maxLng, p.longitude);
				});

				const contentCenterLat = (minLat + maxLat) / 2;
				const contentCenterLng = (minLng + maxLng) / 2;

				pendingCenterTimeoutRef.current = setTimeout(async () => {
					try {
						if (!mapRef.current) return;
						const boundaries = await mapRef.current.getMapBoundaries();
						if (!boundaries?.northEast) return;

						const latSpan = Math.abs(boundaries.northEast.latitude - boundaries.southWest.latitude);
						const topY = Math.max(0, topPadding || 0);
						const bottomY = screenHeight - Math.max(0, bottomPad || 0);
						const visibleHeightPx = Math.max(0, bottomY - topY);

						const desiredCenterY = topY + visibleHeightPx * (centerBias || 0.5);
						const latShift = (latSpan / screenHeight) * (desiredCenterY - (screenHeight / 2));

						const targetLatDelta = latSpan * (zoomFactor || 1);

						lastProgrammaticMoveAtRef.current = Date.now();
						mapRef.current.animateToRegion({
							latitude: contentCenterLat + latShift,
							longitude: contentCenterLng,
							latitudeDelta: Math.max(0.0005, targetLatDelta),
							longitudeDelta: Math.max(0.0005, targetLatDelta),
						}, 280);
					} catch (e) {
						console.warn('[FullScreenEmergencyMap] Center visibility failed', e);
					} finally {
						pendingCenterTimeoutRef.current = null;
					}
				}, delayMs);
			}, [screenHeight]
		);

		// Baseline Deltas Calculation
		const computeBaselineDeltas = useCallback((location, hospitalList) => {
			if (!isValidCoordinate(location) || !hospitalList?.length || !isMapReadyState) return null;

			const valid = hospitalList
				.filter(h => isValidCoordinate(h?.coordinates))
				.map(h => ({ h, d: calculateDistance(location, h.coordinates) }))
				.sort((a, b) => a.d - b.d)
				.slice(0, 6)
				.map(x => x.h.coordinates);

			const points = [location, ...valid];
			if (points.length === 0) return null;

			let minLat = points[0].latitude, maxLat = points[0].latitude;
			let minLng = points[0].longitude, maxLng = points[0].longitude;

			points.forEach(p => {
				minLat = Math.min(minLat, p.latitude); maxLat = Math.max(maxLat, p.latitude);
				minLng = Math.min(minLng, p.longitude); maxLng = Math.max(maxLng, p.longitude);
			});

			const latRange = Math.abs(maxLat - minLat);
			const lngRange = Math.abs(maxLng - minLng);
			const delta = Math.max(0.035, Math.max(latRange, lngRange) * 1.9) * BASELINE_ZOOM_IN_FACTOR;

			return {
				latitudeDelta: Math.max(0.02, Math.min(0.085, delta)),
				longitudeDelta: Math.max(0.02, Math.min(0.085, delta))
			};
		}, [isMapReadyState]);

		// Lifecycle: Startup phases
		useEffect(() => {
			if (startupPhaseRef.current === 'initial' && userLocation && locationPermission && !isLoadingLocation) {
				startupPhaseRef.current = 'location_ready';
			}
		}, [userLocation, locationPermission, isLoadingLocation]);

		useEffect(() => {
			if (startupPhaseRef.current === 'location_ready' && isMapReadyState) {
				startupPhaseRef.current = 'map_ready';
			}
		}, [isMapReadyState]);

		useEffect(() => {
			if (hasComputedBaselineZoomRef.current || !isMapReadyState || !isValidCoordinate(userLocation) || !hospitals.length || startupPhaseRef.current !== 'map_ready') return;

			const deltas = computeBaselineDeltas(userLocation, hospitals);
			if (deltas) {
				hasComputedBaselineZoomRef.current = true;
				appLoadRegionDeltasRef.current = deltas;
				startupPhaseRef.current = 'baseline_set';
			}
		}, [computeBaselineDeltas, hospitals, isMapReadyState, userLocation]);

		useEffect(() => {
			if (!hasCenteredOnUser.current || !hasComputedBaselineZoomRef.current || hasAppliedBaselineZoomRef.current || !mapRef.current || !isValidCoordinate(userLocation) || !isMapReadyState || selectedHospitalId || routeCoordinates.length > 0 || startupPhaseRef.current !== 'baseline_set') return;

			hasAppliedBaselineZoomRef.current = true;
			startupPhaseRef.current = 'complete';
			const base = appLoadRegionDeltasRef.current;
			lastProgrammaticMoveAtRef.current = Date.now();
			mapRef.current.animateToRegion({
				latitude: userLocation.latitude,
				longitude: userLocation.longitude,
				latitudeDelta: base?.latitudeDelta ?? DEFAULT_APP_LOAD_DELTAS.latitudeDelta,
				longitudeDelta: base?.longitudeDelta ?? DEFAULT_APP_LOAD_DELTAS.longitudeDelta,
			}, 420);
		}, [routeCoordinates.length, selectedHospitalId, userLocation, isMapReadyState]);

		// Ambulance Animation logic
		const { ambulanceCoordinate, ambulanceHeading } = useAmbulanceAnimation({
			routeCoordinates: animateAmbulance ? [...routeCoordinates].reverse() : [],
			animateAmbulance,
			ambulanceTripEtaSeconds: ambulanceTripEtaSeconds || (routeInfo?.durationSec || 600),
			responderLocation,
			responderHeading,
		});

		// Request location permission immediately on mount
		useEffect(() => { 
			console.log("[FullScreenEmergencyMap] Requesting location permission on mount...");
			requestLocationPermission(); 
		}, [requestLocationPermission]);

		// Route Calculation
		useEffect(() => {
			const shouldShowRoute = !!routeHospitalIdResolved && !!routeHospital;
			const origin = userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : null;
			const destination = routeHospital?.coordinates ?? null;

			// 🔴 REVERT POINT: Defensive Route Clearing
			// PREVIOUS: Cleared route immediately if conditions weren't met
			// NEW: Don't clear if we're in the middle of a selection (ID exists but object hasn't resolved)
			// REVERT TO: The simple if (!shouldShowRoute...) block
			if (!shouldShowRoute || !isValidCoordinate(origin) || !isValidCoordinate(destination)) {
				if (!routeHospitalIdResolved && routeCoordinates.length > 0) {
					console.log('[FullScreenEmergencyMap] Path condition missing, clearing route');
					clearRoute();
				}
				return;
			}
			calculateRoute(origin, destination);
		}, [calculateRoute, routeHospital?.coordinates, routeHospitalIdResolved, userLocation]);

		// Update parent about route
		useEffect(() => {
			if (!onRouteCalculated || !isMapReadyState || !mapRef.current || routeCoordinates.length < 2) return;
			onRouteCalculated({ coordinates: routeCoordinates, durationSec: routeInfo?.durationSec, distanceMeters: routeInfo?.distanceMeters });
		}, [isMapReadyState, onRouteCalculated, routeCoordinates, routeInfo]);

		// Camera management for routes
		useEffect(() => {
			if (!isMapReadyState || !mapRef.current || routeCoordinates.length < 2 || !routeHospitalIdResolved) return;

			const padding = mapPaddingRef.current;
			lastProgrammaticMoveAtRef.current = Date.now();

			mapRef.current.fitToCoordinates(routeCoordinates, {
				edgePadding: { top: padding.top + 48, right: 4, bottom: padding.bottom + 4, left: 4 },
				animated: true,
			});

			scheduleCenterInVisibleArea(routeCoordinates, {
				topPadding: padding.top + 48,
				bottomPadding: padding.bottom + 4,
				delayMs: 620,
				zoomFactor: ROUTE_ZOOM_FACTOR,
				centerBias: 1,
			});
		}, [isMapReadyState, routeCoordinates, routeHospitalIdResolved, scheduleCenterInVisibleArea]);

		useImperativeHandle(ref, () => ({
			animateToHospital: (hospital, options = {}) => {
				if (!mapRef.current || !isValidCoordinate(hospital?.coordinates)) return;
				const targetBottom = options.bottomPadding ?? bottomPadding;
				const targetTop = options.topPadding ?? mapPaddingRef.current.top;

				const points = [hospital.coordinates];
				if (options.includeUser && isValidCoordinate(userLocation)) {
					points.push({ latitude: userLocation.latitude, longitude: userLocation.longitude });
				}

				if (points.length < 2) {
					lastProgrammaticMoveAtRef.current = Date.now();
					mapRef.current.animateToRegion({
						...hospital.coordinates,
						latitudeDelta: appLoadRegionDeltasRef.current?.latitudeDelta ?? 0.04,
						longitudeDelta: appLoadRegionDeltasRef.current?.longitudeDelta ?? 0.04,
					}, 550);
					return;
				}

				lastProgrammaticMoveAtRef.current = Date.now();
				mapRef.current.animateToRegion({
					latitude: (points[0].latitude + points[1].latitude) / 2,
					longitude: (points[0].longitude + points[1].longitude) / 2,
					latitudeDelta: appLoadRegionDeltasRef.current?.latitudeDelta ?? 0.04,
					longitudeDelta: appLoadRegionDeltasRef.current?.longitudeDelta ?? 0.04,
				}, 450);

				scheduleCenterInVisibleArea(points, { topPadding: targetTop, bottomPadding: targetBottom, delayMs: 560 });
			},
			fitToAllHospitals: () => {
				if (!mapRef.current || !hospitals.length) return;
				const valid = hospitals.filter(h => isValidCoordinate(h?.coordinates));
				if (!valid.length) return;

				let minLat = valid[0].coordinates.latitude, maxLat = valid[0].coordinates.latitude;
				let minLng = valid[0].coordinates.longitude, maxLng = valid[0].coordinates.longitude;

				valid.forEach(h => {
					minLat = Math.min(minLat, h.coordinates.latitude); maxLat = Math.max(maxLat, h.coordinates.latitude);
					minLng = Math.min(minLng, h.coordinates.longitude); maxLng = Math.max(maxLng, h.coordinates.longitude);
				});

				lastProgrammaticMoveAtRef.current = Date.now();
				mapRef.current.animateToRegion({
					latitude: (minLat + maxLat) / 2,
					longitude: (minLng + maxLng) / 2,
					latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.4),
					longitudeDelta: Math.max(0.02, (maxLng - minLng) * 1.4),
				}, 550);
			},
		}));

		// Initial center on user
		useEffect(() => {
			if (mapRef.current && !isLoadingLocation && locationPermission && userLocation && !hasCenteredOnUser.current && isMapReadyState && startupPhaseRef.current === 'baseline_set') {
				hasCenteredOnUser.current = true;
				setTimeout(() => {
					lastProgrammaticMoveAtRef.current = Date.now();
					mapRef.current?.animateToRegion({
						...userLocation,
						latitudeDelta: DEFAULT_APP_LOAD_DELTAS.latitudeDelta,
						longitudeDelta: DEFAULT_APP_LOAD_DELTAS.longitudeDelta,
					}, 550);
				}, 300);
			}
		}, [isLoadingLocation, isMapReadyState, locationPermission, userLocation]);

		const mapStyle = isDarkMode ? darkMapStyle : lightMapStyle;

		const handleRecenter = useCallback(() => {
			if (mapRef.current && userLocation) {
				lastProgrammaticMoveAtRef.current = Date.now();
				mapRef.current.animateToRegion({ ...userLocation, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 500);
			}
		}, [userLocation]);

		const handleRegionChangeComplete = useCallback((region) => {
			if (!Number.isFinite(region?.latitudeDelta)) return;
			setIsZoomedOut(region.latitudeDelta > 0.35);

			if (__DEV__ && routeHospitalIdResolved) {
				const now = Date.now();
				if (now - lastZoomLogAtRef.current < 900) return;
				const isProgrammatic = now - (lastProgrammaticMoveAtRef.current || 0) < 900;
				lastZoomLogAtRef.current = now;
				// console.log("[RouteZoom] region", { isProgrammatic, region });
			}
		}, [routeHospitalIdResolved]);

		if (isLoadingLocation) {
		// Loading state - no debug logs
			return (
				<View style={[styles.container, styles.loadingContainer, { backgroundColor: isDarkMode ? "#0B0F1A" : "#F8FAFC" }]}>
					<ActivityIndicator size="large" color={COLORS.brandPrimary} />
					<Text style={[styles.loadingText, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>Finding nearby hospitals...</Text>
				</View>
			);
		}

		if (locationError) {
		// Error state - no debug logs
			return (
				<View style={[styles.container, styles.errorContainer, { backgroundColor: isDarkMode ? "#0B0F1A" : "#F8FAFC" }]}>
					<Ionicons name="warning-outline" size={48} color={COLORS.errorRed} />
					<Text style={[styles.errorText, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>Location Error</Text>
					<Text style={[styles.errorSubtext, { color: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted }]}>{locationError}</Text>
					<Pressable 
						style={[styles.retryButton, { backgroundColor: COLORS.brandPrimary }]}
						onPress={() => requestLocationPermission()}
					>
						<Text style={styles.retryButtonText}>Retry</Text>
					</Pressable>
				</View>
			);
		}

		if (!locationPermission) {
		// Permission denied state - no debug logs
			return (
				<View style={[styles.container, styles.errorContainer, { backgroundColor: isDarkMode ? "#0B0F1A" : "#F8FAFC" }]}>
					<Ionicons name="location-outline" size={48} color={isDarkMode ? COLORS.textMutedDark : COLORS.textMuted} />
					<Text style={[styles.errorText, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>Location permission required</Text>
					<Text style={[styles.errorSubtext, { color: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted }]}>Enable location to see nearby hospitals</Text>
					<Pressable 
						style={[styles.retryButton, { backgroundColor: COLORS.brandPrimary }]}
						onPress={() => requestLocationPermission()}
					>
						<Text style={styles.retryButtonText}>Enable Location</Text>
					</Pressable>
				</View>
			);
		}

		// Rendering MapView - no debug logs
		return (
			<View style={styles.container}>
				<MapErrorBoundary onReset={() => {
					setIsMapReadyState(false);
				}}>
					<MapView
						ref={mapRef}
						style={styles.map}
						provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
						customMapStyle={mapStyle}
						initialRegion={initialRegion}
						showsUserLocation={locationPermission}
						showsMyLocationButton={false}
						showsCompass={false}
						showsScale={false}
						showsBuildings={true}
						showsTraffic={false}
						showsIndoors={true}
						loadingEnabled={true}
						loadingIndicatorColor={COLORS.brandPrimary}
						loadingBackgroundColor={isDarkMode ? "#0B0F1A" : "#F8FAFC"}
						mapPadding={mapPadding}
						userInterfaceStyle={isDarkMode ? "dark" : "light"}
						onRegionChangeComplete={handleRegionChangeComplete}
						onMapReady={() => { setIsMapReadyState(true); onMapReady?.(); }}
						onPanDrag={() => { lastUserPanAtRef.current = Date.now(); }}
						showsZoomControls={false}
						showsPointsOfInterest={false}
					>
						<RouteLayer
							routeCoordinates={routeCoordinates}
							ambulanceCoordinate={ambulanceCoordinate}
							ambulanceHeading={ambulanceHeading}
							animateAmbulance={animateAmbulance}
						/>

						<HospitalMarkers
							hospitals={hospitals}
							selectedHospitalId={selectedHospitalId}
							onHospitalPress={onHospitalSelect}
							shouldShowHospitalLabels={shouldShowHospitalLabels}
							isDarkMode={isDarkMode}
						/>
					</MapView>
				</MapErrorBoundary>

				{Platform.OS === "ios" ? (
					<BlurView
						intensity={isDarkMode ? 60 : 40}
						tint={isDarkMode ? "dark" : "light"}
						style={[styles.statusBarBlur, { height: insets.top, opacity: 0.5 }]}
					/>
				) : (
					// Android fallback: semi-transparent status bar
					<View
						style={[
							styles.statusBarBlur, 
							{ 
								height: insets.top, 
								opacity: 0.5,
								backgroundColor: isDarkMode 
									? 'rgba(0,0,0,0.6)'  // Dark semi-transparent
									: 'rgba(255,255,255,0.6)'  // Light semi-transparent
							}
						]}
					/>
				)}

				{shouldShowControls && (
					<MapControls
						onRecenter={handleRecenter}
						onExpand={() => { ref.current?.fitToAllHospitals?.(); }}
						isZoomedOut={isZoomedOut}
						isDarkMode={isDarkMode}
						topOffset={insets.top + 200}
					/>
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
		fontWeight: "400",
		textAlign: "center",
		marginTop: 16,
		marginBottom: 4,
	},
	errorSubtext: {
		fontSize: 13,
		textAlign: "center",
		marginBottom: 20,
	},
	retryButton: {
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 25,
		marginTop: 8,
	},
	retryButtonText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "600",
	},
	statusBarBlur: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
	},
	hospitalMarker: {
		alignItems: "center",
		justifyContent: "center",
	},
	hospitalMarkerSelected: {
		transform: [{ scale: 1.1 }],
	},
	hospitalMarkerRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	hospitalLabelPill: {
		marginLeft: 6,
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 10,
		maxWidth: 140,
	},
	hospitalLabelText: {
		fontSize: 9,
		fontWeight: "600",
	},
	// Web fallback styles
	webMapFallback: {
		backgroundColor: "#F8FAFC",
		justifyContent: "center",
		alignItems: "center",
	},
	webMapContent: {
		alignItems: "center",
		justifyContent: "center",
	},
	webMapText: {
		fontSize: 24,
		fontWeight: "bold",
		marginTop: 12,
	},
	webMapSubtext: {
		fontSize: 16,
		marginTop: 4,
	},
	selectedHospitalInfo: {
		marginTop: 20,
		alignItems: "center",
	},
	selectedHospitalName: {
		fontSize: 18,
		fontWeight: "600",
		textAlign: "center",
	},
	selectedHospitalDistance: {
		fontSize: 14,
		marginTop: 4,
	},
});

FullScreenEmergencyMap.displayName = "FullScreenEmergencyMap";

export default FullScreenEmergencyMap;

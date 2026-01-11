import {
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
	Platform,
	Dimensions,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
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
import { useAmbulanceAnimation } from "../../hooks/emergency/useAmbulanceAnimation";
import { isValidCoordinate, calculateDistance } from "../../utils/mapUtils";

const DEFAULT_APP_LOAD_DELTAS = { latitudeDelta: 0.04, longitudeDelta: 0.04 };
const BASELINE_ZOOM_IN_FACTOR = 0.92;
const ROUTE_ZOOM_FACTOR = 0.84;

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
		const { isDarkMode } = useTheme();
		const { hospitals: dbHospitals } = useHospitals();
		const insets = useSafeAreaInsets();
		const mapRef = useRef(null);
		const hasCenteredOnUser = useRef(false);
		const appLoadRegionDeltasRef = useRef(DEFAULT_APP_LOAD_DELTAS);
		const hasComputedBaselineZoomRef = useRef(false);
		const hasAppliedBaselineZoomRef = useRef(false);
		const isMapReadyRef = useRef(false);
		const startupPhaseRef = useRef('initial'); // 'initial' | 'location_ready' | 'map_ready' | 'baseline_set' | 'complete'
		const lastProgrammaticMoveAtRef = useRef(0);
		const lastUserPanAtRef = useRef(0);
		const lastAutoRecoverAtRef = useRef(0);
		const pendingCenterTimeoutRef = useRef(null);

		const [nearbyHospitals, setNearbyHospitals] = useState([]);
		const [isZoomedOut, setIsZoomedOut] = useState(false);

		const screenHeight = Dimensions.get("window").height;

	// Hide controls when sheet is above 50% (index > 1)
	const shouldShowControls = showControls && sheetSnapIndex <= 1;

		const {
			userLocation,
			locationPermission,
			isLoadingLocation,
			requestLocationPermission,
		} = useMapLocation();

		const { routeCoordinates, routeInfo, calculateRoute, clearRoute } = useMapRoute();

		const hospitals =
			propHospitals && propHospitals.length > 0 ? propHospitals : nearbyHospitals;
		const hospitalsForBaseline =
			propHospitals && propHospitals.length > 0 ? propHospitals : dbHospitals;

		const selectedHospital =
			selectedHospitalId && hospitals?.length
				? hospitals.find((h) => h?.id === selectedHospitalId) ?? null
				: null;

		const routeHospitalIdResolved = routeHospitalId ?? selectedHospitalId ?? null;
		const routeHospital =
			routeHospitalIdResolved && hospitals?.length
				? hospitals.find((h) => h?.id === routeHospitalIdResolved) ?? null
				: null;

		const mapPadding = {
			top: insets.top + 40,
			bottom: bottomPadding + 20,
			left: 0,
			right: 0,
		};
		const mapPaddingRef = useRef(mapPadding);
		useEffect(() => {
			mapPaddingRef.current = mapPadding;
		}, [mapPadding]);

		useEffect(() => {
			return () => {
				if (pendingCenterTimeoutRef.current) {
					clearTimeout(pendingCenterTimeoutRef.current);
					pendingCenterTimeoutRef.current = null;
				}
			};
		}, []);

		const scheduleCenterInVisibleArea = useCallback(
			(
				points,
				{
					topPadding,
					bottomPadding: bottomPad,
					delayMs = 520,
					zoomFactor = 1,
				} = {}
			) => {
				if (!mapRef.current) return;
				if (!Array.isArray(points) || points.length === 0) return;

				if (pendingCenterTimeoutRef.current) {
					clearTimeout(pendingCenterTimeoutRef.current);
					pendingCenterTimeoutRef.current = null;
				}
				let minLat = points[0]?.latitude;
				let maxLat = points[0]?.latitude;
				let minLng = points[0]?.longitude;
				let maxLng = points[0]?.longitude;
				for (let i = 1; i < points.length; i++) {
					const p = points[i];
					if (!p) continue;
					minLat = Math.min(minLat, p.latitude);
					maxLat = Math.max(maxLat, p.latitude);
					minLng = Math.min(minLng, p.longitude);
					maxLng = Math.max(maxLng, p.longitude);
				}
				const contentCenterLat = (minLat + maxLat) / 2;
				const contentCenterLng = (minLng + maxLng) / 2;

				pendingCenterTimeoutRef.current = setTimeout(async () => {
					try {
						if (!mapRef.current) return;

						const boundaries = await mapRef.current.getMapBoundaries();
						if (!boundaries?.northEast || !boundaries?.southWest) return;
						const { northEast, southWest } = boundaries;

						const latSpan = Math.abs(northEast.latitude - southWest.latitude);
						const lngSpan = Math.abs(northEast.longitude - southWest.longitude);
						if (!Number.isFinite(latSpan) || latSpan <= 0) return;
						if (!Number.isFinite(lngSpan) || lngSpan <= 0) return;

						const topY = Math.max(0, Number.isFinite(topPadding) ? topPadding : 0);
						const bottomY =
							screenHeight - Math.max(0, Number.isFinite(bottomPad) ? bottomPad : 0);
						const desiredCenterY = (topY + bottomY) / 2;
						const screenCenterY = screenHeight / 2;
						const pixelDeltaY = desiredCenterY - screenCenterY;

						const latPerPx = latSpan / screenHeight;
						const latShift = latPerPx * pixelDeltaY;
						const targetCenterLat = contentCenterLat + latShift;
						const targetCenterLng = contentCenterLng;

						const safeZoomFactor =
							Number.isFinite(zoomFactor) && zoomFactor > 0 ? zoomFactor : 1;
						const targetLatDelta = latSpan * safeZoomFactor;
						const targetLngDelta = lngSpan * safeZoomFactor;

						lastProgrammaticMoveAtRef.current = Date.now();
						mapRef.current.animateToRegion(
							{
								latitude: targetCenterLat,
								longitude: targetCenterLng,
								latitudeDelta: Math.max(0.0005, targetLatDelta),
								longitudeDelta: Math.max(0.0005, targetLngDelta),
							},
							280
						);
					} catch (e) {
					} finally {
						pendingCenterTimeoutRef.current = null;
					}
				}, delayMs);
			},
			[screenHeight]
		);

		const computeBaselineDeltas = useCallback((location, hospitalList) => {
			if (!isValidCoordinate(location)) return null;
			if (!Array.isArray(hospitalList) || hospitalList.length === 0) return null;
			if (!isMapReadyRef.current) return null;

			const origin = { latitude: location.latitude, longitude: location.longitude };
			const valid = hospitalList
				.filter((h) => isValidCoordinate(h?.coordinates))
				.map((h) => ({
					h,
					d: calculateDistance(origin, h.coordinates),
				}))
				.sort((a, b) => a.d - b.d)
				.slice(0, 6)
				.map((x) => x.h.coordinates);

			const points = [origin, ...valid];
			let minLat = points[0].latitude;
			let maxLat = points[0].latitude;
			let minLng = points[0].longitude;
			let maxLng = points[0].longitude;
			for (let i = 1; i < points.length; i++) {
				const p = points[i];
				minLat = Math.min(minLat, p.latitude);
				maxLat = Math.max(maxLat, p.latitude);
				minLng = Math.min(minLng, p.longitude);
				maxLng = Math.max(maxLng, p.longitude);
			}

			const latRange = Math.abs(maxLat - minLat);
			const lngRange = Math.abs(maxLng - minLng);
			const latitudeDelta = Math.max(0.035, latRange * 1.9);
			const longitudeDelta = Math.max(0.035, lngRange * 1.9);

			const latitudeDeltaOut = Math.max(
				0.02,
				Math.min(0.085, latitudeDelta) * BASELINE_ZOOM_IN_FACTOR
			);
			const longitudeDeltaOut = Math.max(
				0.02,
				Math.min(0.085, longitudeDelta) * BASELINE_ZOOM_IN_FACTOR
			);
			return { latitudeDelta: latitudeDeltaOut, longitudeDelta: longitudeDeltaOut };
		}, [isMapReadyRef.current]);

		// Update startup phase when location is ready
		useEffect(() => {
			if (startupPhaseRef.current === 'initial' && userLocation && locationPermission && !isLoadingLocation) {
				startupPhaseRef.current = 'location_ready';
				console.log('[FullScreenEmergencyMap] Startup phase: location_ready');
			}
		}, [userLocation, locationPermission, isLoadingLocation]);

		// Update startup phase when map is ready
		useEffect(() => {
			if (startupPhaseRef.current === 'location_ready' && isMapReadyRef.current) {
				startupPhaseRef.current = 'map_ready';
				console.log('[FullScreenEmergencyMap] Startup phase: map_ready');
			}
		}, [isMapReadyRef.current]);

		useEffect(() => {
			if (hasComputedBaselineZoomRef.current) return;
			if (!isMapReadyRef.current) return;
			if (!isValidCoordinate(userLocation)) return;
			if (!Array.isArray(hospitalsForBaseline) || hospitalsForBaseline.length === 0) return;
			if (startupPhaseRef.current !== 'map_ready') return;

			const deltas = computeBaselineDeltas(userLocation, hospitalsForBaseline);
			if (!deltas) return;
			hasComputedBaselineZoomRef.current = true;
			appLoadRegionDeltasRef.current = deltas;
			startupPhaseRef.current = 'baseline_set';
			console.log('[FullScreenEmergencyMap] Startup phase: baseline_set');
		}, [computeBaselineDeltas, hospitalsForBaseline, userLocation]);

		useEffect(() => {
			if (!hasCenteredOnUser.current) return;
			if (!hasComputedBaselineZoomRef.current) return;
			if (hasAppliedBaselineZoomRef.current) return;
			if (!mapRef.current || !isValidCoordinate(userLocation)) return;
			if (!isMapReadyRef.current) return;
			if (selectedHospitalId) return;
			if (routeCoordinates.length > 0) return;
			if (startupPhaseRef.current !== 'baseline_set') return;

			hasAppliedBaselineZoomRef.current = true;
			startupPhaseRef.current = 'complete';
			console.log('[FullScreenEmergencyMap] Startup phase: complete');
			const base = appLoadRegionDeltasRef.current;
			lastProgrammaticMoveAtRef.current = Date.now();
			mapRef.current.animateToRegion(
				{
					latitude: userLocation.latitude,
					longitude: userLocation.longitude,
					latitudeDelta: base?.latitudeDelta ?? DEFAULT_APP_LOAD_DELTAS.latitudeDelta,
					longitudeDelta: base?.longitudeDelta ?? DEFAULT_APP_LOAD_DELTAS.longitudeDelta,
				},
				420
			);
		}, [routeCoordinates.length, selectedHospitalId, userLocation, isMapReadyRef.current]);

		const effectiveAmbulanceEtaSeconds =
			Number.isFinite(ambulanceTripEtaSeconds) && ambulanceTripEtaSeconds > 0
				? ambulanceTripEtaSeconds
				: routeInfo?.durationSec;

		const { ambulanceCoordinate, ambulanceHeading } = useAmbulanceAnimation({
			routeCoordinates,
			animateAmbulance,
			ambulanceTripEtaSeconds: effectiveAmbulanceEtaSeconds,
			responderLocation,
			responderHeading,
			onAmbulanceUpdate: undefined,
		});

		useEffect(() => {
			requestLocationPermission();
		}, [requestLocationPermission]);

		useEffect(() => {
			const canRoute =
				mode === "booking"
					? (routeHospital?.availableBeds ?? 0) > 0
					: (routeHospital?.ambulances ?? 0) > 0;

			const shouldShowRoute = !!routeHospitalIdResolved && canRoute;
			const origin = routeHospital?.coordinates ?? null;
			const destination = userLocation
				? { latitude: userLocation.latitude, longitude: userLocation.longitude }
				: null;

			if (!shouldShowRoute || !isValidCoordinate(origin) || !isValidCoordinate(destination)) {
				if (routeCoordinates.length > 0) {
					clearRoute();
				}
				return;
			}

			calculateRoute(origin, destination);
		}, [
			calculateRoute,
			mode,
			routeHospital?.ambulances,
			routeHospital?.availableBeds,
			routeHospital?.coordinates,
			routeHospitalIdResolved,
			userLocation,
		]);

		useEffect(() => {
			if (onRouteCalculated && routeCoordinates.length > 0) {
                // Avoid calling onRouteCalculated if the data hasn't changed to prevent infinite loops
                const prevInfo = mapRef.current?.lastRouteInfo;
                const isSame = prevInfo && 
                    prevInfo.durationSec === routeInfo?.durationSec && 
                    prevInfo.distanceMeters === routeInfo?.distanceMeters &&
                    prevInfo.coordsLength === routeCoordinates.length;

                if (!isSame) {
                    if (mapRef.current) {
                        mapRef.current.lastRouteInfo = {
                            durationSec: routeInfo?.durationSec,
                            distanceMeters: routeInfo?.distanceMeters,
                            coordsLength: routeCoordinates.length
                        };
                    }

                    onRouteCalculated({
                        coordinates: routeCoordinates,
                        durationSec: routeInfo?.durationSec,
                        distanceMeters: routeInfo?.distanceMeters,
                    });
                }

				// Fit map to route with better padding
				// Use a ref for padding so snap changes don't force repeated route fitting.
				if (mapRef.current) {
					const padding = mapPaddingRef.current;
					let minLat = routeCoordinates[0]?.latitude;
					let maxLat = routeCoordinates[0]?.latitude;
					let minLng = routeCoordinates[0]?.longitude;
					let maxLng = routeCoordinates[0]?.longitude;

					for (let i = 1; i < routeCoordinates.length; i++) {
						const p = routeCoordinates[i];
						if (!p) continue;
						minLat = Math.min(minLat, p.latitude);
						maxLat = Math.max(maxLat, p.latitude);
						minLng = Math.min(minLng, p.longitude);
						maxLng = Math.max(maxLng, p.longitude);
					}

					const latRange = Math.abs(maxLat - minLat);
					const lngRange = Math.abs(maxLng - minLng);
					const isVertical = latRange >= lngRange;

					const extraTop = isVertical ? 105 : 80;
					const extraBottom = isVertical ? 120 : 70;
					const extraSide = isVertical ? 55 : 80;

					mapRef.current.fitToCoordinates(routeCoordinates, {
						edgePadding: {
							top: padding.top + extraTop,
							right: extraSide,
							bottom: padding.bottom + extraBottom,
							left: extraSide,
						},
						animated: true,
					});
					scheduleCenterInVisibleArea(routeCoordinates, {
						topPadding: padding.top,
						bottomPadding: padding.bottom,
						zoomFactor: ROUTE_ZOOM_FACTOR,
					});
				}
			}
		}, [routeCoordinates, routeInfo, onRouteCalculated]);

		useImperativeHandle(ref, () => ({
			animateToHospital: (hospital, options = {}) => {
				if (!mapRef.current || !isValidCoordinate(hospital?.coordinates)) return;

				// Goal: when a hospital is selected, show the hospital + user (and later the
				// whole route) without over-zooming. Keep the polyline/markers fully visible
				// above the bottom sheet.
				const targetBottomPadding = options.bottomPadding ?? bottomPadding;
				const targetTopPadding = options.topPadding ?? mapPaddingRef.current.top;

				const points = [];
				points.push(hospital.coordinates);
				if (options.includeUser && isValidCoordinate(userLocation)) {
					points.push({
						latitude: userLocation.latitude,
						longitude: userLocation.longitude,
					});
				}

				if (points.length < 2) {
					const base = appLoadRegionDeltasRef.current;
					lastProgrammaticMoveAtRef.current = Date.now();
					mapRef.current.animateToRegion(
						{
							latitude: hospital.coordinates.latitude,
							longitude: hospital.coordinates.longitude,
							latitudeDelta: base?.latitudeDelta ?? 0.04,
							longitudeDelta: base?.longitudeDelta ?? 0.04,
						},
						550
					);
					return;
				}
				const base = appLoadRegionDeltasRef.current;
				const centerLat = (points[0].latitude + points[1].latitude) / 2;
				const centerLng = (points[0].longitude + points[1].longitude) / 2;
				lastProgrammaticMoveAtRef.current = Date.now();
				mapRef.current.animateToRegion(
					{
						latitude: centerLat,
						longitude: centerLng,
						latitudeDelta: base?.latitudeDelta ?? 0.04,
						longitudeDelta: base?.longitudeDelta ?? 0.04,
					},
					450
				);
				scheduleCenterInVisibleArea(points, {
					topPadding: targetTopPadding,
					bottomPadding: targetBottomPadding,
					delayMs: 560,
					zoomFactor: 1,
				});
			},
			fitToAllHospitals: () => {
				if (!mapRef.current || !hospitals.length) return;

				const validHospitals = hospitals.filter((h) =>
					isValidCoordinate(h?.coordinates)
				);
				if (validHospitals.length === 0) return;

				let minLat = validHospitals[0].coordinates.latitude;
				let maxLat = validHospitals[0].coordinates.latitude;
				let minLng = validHospitals[0].coordinates.longitude;
				let maxLng = validHospitals[0].coordinates.longitude;

				validHospitals.forEach((h) => {
					minLat = Math.min(minLat, h.coordinates.latitude);
					maxLat = Math.max(maxLat, h.coordinates.latitude);
					minLng = Math.min(minLng, h.coordinates.longitude);
					maxLng = Math.max(maxLng, h.coordinates.longitude);
				});

				const latRange = maxLat - minLat;
				const lngRange = maxLng - minLng;
				const latitudeDelta = Math.max(0.02, latRange * 1.8);
				const longitudeDelta = Math.max(0.02, lngRange * 1.8);

				lastProgrammaticMoveAtRef.current = Date.now();
				mapRef.current.animateToRegion(
					{
						latitude: (minLat + maxLat) / 2,
						longitude: (minLng + maxLng) / 2,
						latitudeDelta,
						longitudeDelta,
					},
					550
				);
			},
		}));

		useEffect(() => {
			if (
				mapRef.current &&
				!isLoadingLocation &&
				locationPermission &&
				userLocation &&
				!hasCenteredOnUser.current &&
				isMapReadyRef.current &&
				startupPhaseRef.current === 'baseline_set'
			) {
				hasCenteredOnUser.current = true;
				hasAppliedBaselineZoomRef.current = false;
				const timer = setTimeout(() => {
					lastProgrammaticMoveAtRef.current = Date.now();
					mapRef.current.animateToRegion(
						{
							latitude: userLocation.latitude,
							longitude: userLocation.longitude,
							latitudeDelta: DEFAULT_APP_LOAD_DELTAS.latitudeDelta,
							longitudeDelta: DEFAULT_APP_LOAD_DELTAS.longitudeDelta,
						},
						550
					);
				}, 300);
				return () => clearTimeout(timer);
			}
		}, [computeBaselineDeltas, hospitalsForBaseline, isLoadingLocation, locationPermission, userLocation, isMapReadyRef.current]);

		const mapStyle = isDarkMode ? darkMapStyle : lightMapStyle;

		const handleRecenter = useCallback(() => {
			if (mapRef.current && userLocation) {
				lastProgrammaticMoveAtRef.current = Date.now();
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

		const handleRegionChangeComplete = useCallback((region) => {
			const latDelta = region?.latitudeDelta;
			const lngDelta = region?.longitudeDelta;
			if (!Number.isFinite(latDelta) || !Number.isFinite(lngDelta)) return;

			const zoomedOutNow = latDelta > 0.35 || lngDelta > 0.35;
			setIsZoomedOut(zoomedOutNow);
		}, []);

		const handleHospitalPress = (hospital) => {
			if (onHospitalSelect) {
				onHospitalSelect(hospital);
			}
		};

		if (isLoadingLocation) {
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
					provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
					customMapStyle={mapStyle}
					initialRegion={
						userLocation ?? {
							latitude: 37.7749,
							longitude: -122.4194,
							latitudeDelta: 0.04,
							longitudeDelta: 0.04,
						}
					}
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
					mapPadding={mapPadding}
					userInterfaceStyle={isDarkMode ? "dark" : "light"}
					onRegionChangeComplete={handleRegionChangeComplete}
					onMapReady={() => {
						isMapReadyRef.current = true;
						onMapReady?.();
					}}
					onPanDrag={() => {
						lastUserPanAtRef.current = Date.now();
					}}
				>
					{routeCoordinates.length > 1 && (
						<Polyline
							coordinates={routeCoordinates}
							strokeColor={COLORS.brandPrimary}
							strokeWidth={4}
							lineCap="round"
							lineJoin="round"
						/>
					)}

					{ambulanceCoordinate && (
						<Marker
							coordinate={ambulanceCoordinate}
							anchor={{ x: 0.5, y: 0.5 }}
							flat={true}
							rotation={ambulanceHeading}
							tracksViewChanges={Platform.OS === "ios" || animateAmbulance}
							zIndex={200}
						>
							<View
								style={{
									width: 44,
									height: 44,
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<View
									style={{
										shadowColor: "#000",
										shadowOffset: { width: 0, height: 2 },
										shadowOpacity: 0.3,
										shadowRadius: 3,
										zIndex: 2,
									}}
								>
									<Ionicons
										name="navigate-circle"
										size={42}
										color={COLORS.brandPrimary}
									/>
								</View>
								<View
									style={{
										position: "absolute",
										width: 22,
										height: 22,
										borderRadius: 11,
										backgroundColor: "#FFFFFF",
										alignItems: "center",
										justifyContent: "center",
										zIndex: 1,
									}}
								/>
							</View>
						</Marker>
					)}

					{hospitals
						.filter((h) => isValidCoordinate(h?.coordinates) && h?.id)
						.map((hospital) => {
							const isSelected = selectedHospitalId === hospital.id;
							return (
								<Marker
									key={hospital.id}
									coordinate={hospital.coordinates}
									onPress={() => handleHospitalPress(hospital)}
									anchor={{ x: 0.5, y: 1 }}
									centerOffset={{ x: 0, y: -16 }}
									tracksViewChanges={isSelected}
									zIndex={isSelected ? 100 : 1}
								>
									<PulsingMarker isSelected={isSelected}>
										<View
											style={[
												styles.hospitalMarker,
												isSelected && styles.hospitalMarkerSelected,
											]}
										>
											<Ionicons
												name="location"
												size={isSelected ? 42 : 32}
												color={
													isSelected ? COLORS.brandPrimary : "#EF4444"
												}
												style={{
													shadowColor: "#000",
													shadowOffset: { width: 0, height: 2 },
													shadowOpacity: 0.25,
													shadowRadius: 4,
												}}
											/>
											<View
												style={{
													position: "absolute",
													top: isSelected ? 8 : 6,
													width: isSelected ? 16 : 12,
													height: isSelected ? 16 : 12,
													borderRadius: isSelected ? 8 : 6,
													backgroundColor: "#FFFFFF",
													alignItems: "center",
													justifyContent: "center",
												}}
											>
												<Ionicons
													name="medical"
													size={isSelected ? 10 : 8}
													color={
														isSelected
															? COLORS.brandPrimary
															: "#EF4444"
													}
												/>
											</View>
										</View>
									</PulsingMarker>
								</Marker>
							);
						})}
				</MapView>

				<BlurView
					intensity={isDarkMode ? 60 : 40}
					tint={isDarkMode ? "dark" : "light"}
					style={[styles.statusBarBlur, { height: insets.top, opacity: 0.5 }]}
				/>

				{shouldShowControls && (
					<View style={[styles.controlsContainer, { top: insets.top + 200 }]}>
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

						<Pressable
							onPress={() => {
								const ref_handle = ref.current;
								if (ref_handle?.fitToAllHospitals) {
									ref_handle.fitToAllHospitals();
								}
							}}
							style={({ pressed }) => [
								styles.controlButton,
								{
									backgroundColor: isDarkMode ? "#0B0F1A" : "#F3E7E7",
									transform: [{ scale: pressed ? 0.95 : 1 }],
									opacity: isZoomedOut ? 1 : 0.5,
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
		fontWeight: "400",
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
	hospitalMarker: {
		alignItems: "center",
		justifyContent: "center",
	},
	hospitalMarkerSelected: {
		transform: [{ scale: 1.1 }],
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
		borderRadius: 16,
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.06,
		shadowRadius: 6,
		elevation: 2,
	},
});

FullScreenEmergencyMap.displayName = "FullScreenEmergencyMap";

export default FullScreenEmergencyMap;

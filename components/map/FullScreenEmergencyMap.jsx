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
	Platform,
	Dimensions,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons, Fontisto, FontAwesome5 } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import PulsingMarker from "./PulsingMarker";
import generateNearbyHospitals from "./generateNearbyHospitals";
import { darkMapStyle, lightMapStyle } from "./mapStyles";

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
			routeHospitalId = null,
			animateAmbulance = false,
			ambulanceTripEtaSeconds = null,
			mode = "emergency",
			showControls = true,
			bottomPadding = 0,
            onRouteCalculated, 
            responderLocation,
            responderHeading,
		},
		ref
	) => {
		const { isDarkMode } = useTheme();
		const insets = useSafeAreaInsets();
		const mapRef = useRef(null);
		const hasCenteredOnUser = useRef(false);
		const lastProgrammaticMoveAtRef = useRef(0);
		const lastUserPanAtRef = useRef(0);
		const lastAutoRecoverAtRef = useRef(0);

		const [userLocation, setUserLocation] = useState(null);
		const [locationPermission, setLocationPermission] = useState(false);
		const [isLoading, setIsLoading] = useState(true);
		const [nearbyHospitals, setNearbyHospitals] = useState([]);
		const [isZoomedOut, setIsZoomedOut] = useState(false);
		const [routeCoordinates, setRouteCoordinates] = useState([]);
		const [routeInfo, setRouteInfo] = useState({ durationSec: null, distanceMeters: null });
		const [ambulanceCoordinate, setAmbulanceCoordinate] = useState(null);
		const [ambulanceHeading, setAmbulanceHeading] = useState(0);

		const routeFetchIdRef = useRef(0);
		const ambulanceTimerRef = useRef(null);
		const lastRouteFitKeyRef = useRef(null);

		const hospitals =
			propHospitals && propHospitals.length > 0
				? propHospitals
				: nearbyHospitals;

		const selectedHospital =
			selectedHospitalId && hospitals?.length
				? hospitals.find((h) => h?.id === selectedHospitalId) ?? null
				: null;

		const routeHospitalIdResolved = routeHospitalId ?? selectedHospitalId ?? null;
		const routeHospital =
			routeHospitalIdResolved && hospitals?.length
				? hospitals.find((h) => h?.id === routeHospitalIdResolved) ?? null
				: null;

		// Dynamic map padding based on sheet position
		// Ensures markers are centered in the visible area
		const mapPadding = {
			top: insets.top + 10,
			bottom: bottomPadding + 20, // Add buffer
			left: 0,
			right: 0,
		};

		const screenHeight = Dimensions.get("window").height;

		const isValidCoordinate = useCallback(
			(coordinate) =>
				Number.isFinite(coordinate?.latitude) && Number.isFinite(coordinate?.longitude),
			[]
		);

		const decodeGooglePolyline = useCallback((encoded) => {
			if (!encoded || typeof encoded !== "string") return [];
			let index = 0;
			let lat = 0;
			let lng = 0;
			const coordinates = [];
			while (index < encoded.length) {
				let b;
				let shift = 0;
				let result = 0;
				do {
					b = encoded.charCodeAt(index++) - 63;
					result |= (b & 0x1f) << shift;
					shift += 5;
				} while (b >= 0x20);
				const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
				lat += dlat;

				shift = 0;
				result = 0;
				do {
					b = encoded.charCodeAt(index++) - 63;
					result |= (b & 0x1f) << shift;
					shift += 5;
				} while (b >= 0x20);
				const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
				lng += dlng;

				coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
			}
			return coordinates;
		}, []);

		const calculateBearing = useCallback((from, to) => {
			if (!isValidCoordinate(from) || !isValidCoordinate(to)) return 0;
			const toRadians = (deg) => (deg * Math.PI) / 180;
			const toDegrees = (rad) => (rad * 180) / Math.PI;
			const lat1 = toRadians(from.latitude);
			const lat2 = toRadians(to.latitude);
			const dLon = toRadians(to.longitude - from.longitude);
			const y = Math.sin(dLon) * Math.cos(lat2);
			const x =
				Math.cos(lat1) * Math.sin(lat2) -
				Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
			const brng = toDegrees(Math.atan2(y, x));
			return (brng + 360) % 360;
		}, [isValidCoordinate]);

		const getDrivingRoute = useCallback(
			async ({ origin, destination }) => {
				const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
				if (googleApiKey) {
					const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=driving&departure_time=now&traffic_model=best_guess&key=${googleApiKey}`;
					const res = await fetch(url);
					const json = await res.json();
					const route = json?.routes?.[0];
					const poly = route?.overview_polyline?.points;
					const coords = decodeGooglePolyline(poly);
					const leg = route?.legs?.[0];
					const durationSec =
						leg?.duration_in_traffic?.value ??
						leg?.duration?.value ??
						null;
					const distanceMeters = leg?.distance?.value ?? null;
					if (coords.length >= 2) {
						return { coordinates: coords, durationSec, distanceMeters };
					}
				}

				const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&alternatives=false&steps=false`;
				const osrmRes = await fetch(osrmUrl);
				const osrmJson = await osrmRes.json();
				const osrmRoute = osrmJson?.routes?.[0];
				const coordsRaw = osrmRoute?.geometry?.coordinates;
				if (Array.isArray(coordsRaw) && coordsRaw.length >= 2) {
					return {
						coordinates: coordsRaw.map(([lon, lat]) => ({
							latitude: lat,
							longitude: lon,
						})),
						durationSec: Number.isFinite(osrmRoute?.duration) ? osrmRoute.duration : null,
						distanceMeters: Number.isFinite(osrmRoute?.distance) ? osrmRoute.distance : null,
					};
				}

				return { coordinates: [], durationSec: null, distanceMeters: null };
			},
			[decodeGooglePolyline]
		);

		const haversineMeters = useCallback((a, b) => {
			if (!isValidCoordinate(a) || !isValidCoordinate(b)) return 0;
			const toRad = (deg) => (deg * Math.PI) / 180;
			const R = 6371000;
			const dLat = toRad(b.latitude - a.latitude);
			const dLon = toRad(b.longitude - a.longitude);
			const lat1 = toRad(a.latitude);
			const lat2 = toRad(b.latitude);
			const sinDLat = Math.sin(dLat / 2);
			const sinDLon = Math.sin(dLon / 2);
			const h =
				sinDLat * sinDLat +
				Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
			return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
		}, [isValidCoordinate]);

		const routeDistanceCacheRef = useRef(null);

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
				setRouteCoordinates([]);
				setRouteInfo({ durationSec: null, distanceMeters: null });
				routeDistanceCacheRef.current = null;
				return;
			}

			const fetchId = ++routeFetchIdRef.current;
			(async () => {
				try {
					const route = await getDrivingRoute({ origin, destination });
					if (routeFetchIdRef.current !== fetchId) return;
					setRouteCoordinates(route.coordinates);
					setRouteInfo({ durationSec: route.durationSec, distanceMeters: route.distanceMeters });
                    
                    // Expose route to parent
                    if (onRouteCalculated) {
                        onRouteCalculated({ 
                            coordinates: route.coordinates, 
                            durationSec: route.durationSec, 
                            distanceMeters: route.distanceMeters 
                        });
                    }
				} catch {
					if (routeFetchIdRef.current !== fetchId) return;
					setRouteCoordinates([]);
					setRouteInfo({ durationSec: null, distanceMeters: null });
					routeDistanceCacheRef.current = null;
				}
			})();
		}, [
			getDrivingRoute,
			isValidCoordinate,
			mode,
			routeHospital?.ambulances,
			routeHospital?.availableBeds,
			routeHospital?.coordinates,
			routeHospitalIdResolved,
			userLocation,
            // We can't put options.onRouteCalculated in dep array as it might be a new function every render
		]);

		useEffect(() => {
			if (ambulanceTimerRef.current) {
				clearInterval(ambulanceTimerRef.current);
				ambulanceTimerRef.current = null;
			}

            // Real-time Override: If we have live location, use it directly
            if (responderLocation) {
                setAmbulanceCoordinate(responderLocation);
                if (Number.isFinite(responderHeading)) {
                    setAmbulanceHeading(responderHeading);
                }
                return;
            }

			if (!animateAmbulance || !routeCoordinates || routeCoordinates.length < 2) {
				setAmbulanceCoordinate(null);
				setAmbulanceHeading(0);
				return;
			}

			let cached = routeDistanceCacheRef.current;
			if (!cached || cached.key !== routeCoordinates) {
				const cumulative = [0];
				let total = 0;
				for (let i = 1; i < routeCoordinates.length; i++) {
					total += haversineMeters(routeCoordinates[i - 1], routeCoordinates[i]);
					cumulative.push(total);
				}
				cached = { key: routeCoordinates, cumulative, total };
				routeDistanceCacheRef.current = cached;
			}

			const durationSecCandidate =
				Number.isFinite(ambulanceTripEtaSeconds)
					? ambulanceTripEtaSeconds
					: Number.isFinite(routeInfo?.durationSec)
						? routeInfo.durationSec
						: null;
			const durationMs =
				Number.isFinite(durationSecCandidate) && durationSecCandidate > 0
					? durationSecCandidate * 1000
					: 120000;

			const startAt = Date.now();
			const intervalMs = 450;
			const totalDistance = cached.total;

			const getPositionAtDistance = (targetMeters) => {
				if (!Number.isFinite(targetMeters) || targetMeters <= 0) {
					return { coordinate: routeCoordinates[0], heading: calculateBearing(routeCoordinates[0], routeCoordinates[1]) };
				}
				if (targetMeters >= totalDistance) {
					const last = routeCoordinates[routeCoordinates.length - 1];
					const prev = routeCoordinates[routeCoordinates.length - 2] ?? last;
					return { coordinate: last, heading: calculateBearing(prev, last) };
				}

				const cumulative = cached.cumulative;
				let i = 1;
				while (i < cumulative.length && cumulative[i] < targetMeters) i++;
				const segEnd = routeCoordinates[i];
				const segStart = routeCoordinates[i - 1];
				const segStartDist = cumulative[i - 1];
				const segEndDist = cumulative[i];
				const segLen = Math.max(1e-6, segEndDist - segStartDist);
				const t = Math.min(1, Math.max(0, (targetMeters - segStartDist) / segLen));
				const coordinate = {
					latitude: segStart.latitude + (segEnd.latitude - segStart.latitude) * t,
					longitude: segStart.longitude + (segEnd.longitude - segStart.longitude) * t,
				};
				return { coordinate, heading: calculateBearing(segStart, segEnd) };
			};

			const initial = getPositionAtDistance(0);
			setAmbulanceCoordinate(initial.coordinate);
			setAmbulanceHeading(initial.heading);

			ambulanceTimerRef.current = setInterval(() => {
				const elapsed = Date.now() - startAt;
				const progress = Math.min(1, Math.max(0, elapsed / durationMs));
				const targetMeters = totalDistance * progress;
				const pos = getPositionAtDistance(targetMeters);
				setAmbulanceCoordinate(pos.coordinate);
				setAmbulanceHeading(pos.heading);
				if (progress >= 1) {
					clearInterval(ambulanceTimerRef.current);
					ambulanceTimerRef.current = null;
				}
			}, intervalMs);

			return () => {
				if (ambulanceTimerRef.current) {
					clearInterval(ambulanceTimerRef.current);
					ambulanceTimerRef.current = null;
				}
			};
		}, [
			ambulanceTripEtaSeconds,
			animateAmbulance,
			calculateBearing,
			haversineMeters,
			routeCoordinates,
			routeInfo?.durationSec,
		]);

		const getRegionForCoordinates = useCallback(
			(coordinates, options = {}) => {
				if (!coordinates || coordinates.length === 0) return null;
				const valid = coordinates.filter(isValidCoordinate);
				if (valid.length === 0) return null;

				const sheetRatio = options.sheetRatio ?? 0;
				const minDelta = options.minDelta ?? 0.02;
				const maxDelta = options.maxDelta ?? 0.18;
				const rangeMultiplier = options.rangeMultiplier ?? 1.8;

				if (valid.length === 1) {
					const only = valid[0];
					const baseDelta = options.baseDelta ?? 0.06;
					const inflation = 1 + Math.min(0.6, sheetRatio) * 0.6;
					const delta = Math.min(maxDelta, Math.max(minDelta, baseDelta * inflation));
					const verticalShiftFactor = sheetRatio >= 0.4 ? 0.22 : 0.12;
					return {
						latitude: only.latitude - delta * verticalShiftFactor,
						longitude: only.longitude,
						latitudeDelta: delta,
						longitudeDelta: delta,
					};
				}

				let minLat = Infinity;
				let maxLat = -Infinity;
				let minLng = Infinity;
				let maxLng = -Infinity;
				for (const c of valid) {
					minLat = Math.min(minLat, c.latitude);
					maxLat = Math.max(maxLat, c.latitude);
					minLng = Math.min(minLng, c.longitude);
					maxLng = Math.max(maxLng, c.longitude);
				}

				const latRange = maxLat - minLat;
				const lngRange = maxLng - minLng;
				if (!Number.isFinite(latRange) || !Number.isFinite(lngRange)) return null;

				const baseLatDelta = Math.max(minDelta, latRange * rangeMultiplier);
				const baseLngDelta = Math.max(minDelta, lngRange * rangeMultiplier);

				const inflation = 1 + Math.min(0.6, sheetRatio) * 0.65;
				const latitudeDelta = Math.min(maxDelta, Math.max(minDelta, baseLatDelta * inflation));
				const longitudeDelta = Math.min(
					maxDelta,
					Math.max(minDelta, Math.max(baseLngDelta * inflation, latitudeDelta))
				);

				const verticalShiftFactor = sheetRatio >= 0.4 ? 0.22 : 0.12;
				const centerLat = (minLat + maxLat) / 2 - latitudeDelta * verticalShiftFactor;
				const centerLng = (minLng + maxLng) / 2;

				return {
					latitude: centerLat,
					longitude: centerLng,
					latitudeDelta,
					longitudeDelta,
				};
			},
			[]
		);

		useEffect(() => {
			if (!mapRef.current) return;
			if (!routeCoordinates || routeCoordinates.length < 2) {
				lastRouteFitKeyRef.current = null;
				return;
			}

			if (lastRouteFitKeyRef.current === routeCoordinates) return;

			const now = Date.now();
			const recentlyUserPanned = now - lastUserPanAtRef.current < 800;
			if (recentlyUserPanned) return;

			const sheetRatio = screenHeight > 0 ? bottomPadding / screenHeight : 0;
			const region = getRegionForCoordinates(routeCoordinates, {
				sheetRatio,
				minDelta: 0.009,
				maxDelta: 0.22,
				rangeMultiplier: 1.05,
			});
			if (!region) return;

			lastRouteFitKeyRef.current = routeCoordinates;
			lastProgrammaticMoveAtRef.current = Date.now();
			mapRef.current.animateToRegion(region, 600);
		}, [
			bottomPadding,
			getRegionForCoordinates,
			routeCoordinates,
			screenHeight,
		]);

		const getFitCoordinates = useCallback(() => {
			const MAX_ITEMS = 8;

			const validHospitals = hospitals.filter((h) => isValidCoordinate(h?.coordinates));

			const sortedHospitals = userLocation && isValidCoordinate(userLocation)
				? [...validHospitals].sort((a, b) => {
						const daLat = a.coordinates.latitude - userLocation.latitude;
						const daLng = a.coordinates.longitude - userLocation.longitude;
						const dbLat = b.coordinates.latitude - userLocation.latitude;
						const dbLng = b.coordinates.longitude - userLocation.longitude;
						return (daLat * daLat + daLng * daLng) - (dbLat * dbLat + dbLng * dbLng);
					})
				: validHospitals;

			const coordinates = sortedHospitals.slice(0, MAX_ITEMS).map((h) => h.coordinates);

			if (userLocation && isValidCoordinate(userLocation)) {
				coordinates.push({
					latitude: userLocation.latitude,
					longitude: userLocation.longitude,
				});
			}

			return coordinates;
		}, [hospitals, isValidCoordinate, userLocation]);

		const fitToLocalHospitals = useCallback(() => {
			if (!mapRef.current) return;
			const coordinates = getFitCoordinates();
			if (!coordinates || coordinates.length === 0) return;

			const sheetRatio = screenHeight > 0 ? bottomPadding / screenHeight : 0;
			const region = getRegionForCoordinates(coordinates, { sheetRatio });
			if (!region) return;
			lastProgrammaticMoveAtRef.current = Date.now();
			mapRef.current.animateToRegion(region, 550);
		}, [bottomPadding, getFitCoordinates, getRegionForCoordinates, screenHeight]);

		const animateToHospitalInternal = useCallback(
			(hospital, options = {}) => {
				if (!mapRef.current || !isValidCoordinate(hospital?.coordinates)) return;

				const targetBottomPadding = options.bottomPadding ?? bottomPadding;
				const sheetRatio =
					screenHeight > 0 ? targetBottomPadding / screenHeight : 0;

				if (options.includeUser && isValidCoordinate(userLocation)) {
					const fitPoints = [
						{ latitude: hospital.coordinates.latitude, longitude: hospital.coordinates.longitude },
						{ latitude: userLocation.latitude, longitude: userLocation.longitude },
					];
					const region = getRegionForCoordinates(fitPoints, {
						sheetRatio,
						minDelta: 0.012,
						maxDelta: 0.08,
					});
					if (region) {
						lastProgrammaticMoveAtRef.current = Date.now();
						mapRef.current.animateToRegion(region, 550);
						return;
					}
				}

				const latitudeDelta =
					options.latitudeDelta ?? (sheetRatio >= 0.4 ? 0.03 : 0.02);
				const longitudeDelta = options.longitudeDelta ?? latitudeDelta;

				const verticalShiftFactor = sheetRatio >= 0.4 ? 0.22 : 0.12;
				const centerLatitude =
					hospital.coordinates.latitude - latitudeDelta * verticalShiftFactor;

				lastProgrammaticMoveAtRef.current = Date.now();
				mapRef.current.animateToRegion(
					{
						latitude: centerLatitude,
						longitude: hospital.coordinates.longitude,
						latitudeDelta,
						longitudeDelta,
					},
					550
				);
			},
			[bottomPadding, getRegionForCoordinates, isValidCoordinate, screenHeight, userLocation]
		);

		// Expose methods to parent via ref
		useImperativeHandle(ref, () => ({
			animateToHospital: animateToHospitalInternal,
			fitToAllHospitals: fitToLocalHospitals,
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

			animateToHospitalInternal(hospital);
		};

		// Center map on user after initial load (preserve default behavior)
		useEffect(() => {
			if (
				mapRef.current &&
				!isLoading &&
				locationPermission &&
				userLocation &&
				!hasCenteredOnUser.current
			) {
				hasCenteredOnUser.current = true;
				const timer = setTimeout(() => {
					lastProgrammaticMoveAtRef.current = Date.now();
					mapRef.current.animateToRegion(
						{
							latitude: userLocation.latitude,
							longitude: userLocation.longitude,
							latitudeDelta: userLocation.latitudeDelta ?? 0.04,
							longitudeDelta: userLocation.longitudeDelta ?? 0.04,
						},
						550
					);
				}, 300);
				return () => clearTimeout(timer);
			}
		}, [isLoading, locationPermission, userLocation]);

		const mapStyle = isDarkMode ? darkMapStyle : lightMapStyle;

		// Recenter to user location - must be before early returns
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

		const handleRegionChangeComplete = useCallback(
			(region) => {
				const latDelta = region?.latitudeDelta;
				const lngDelta = region?.longitudeDelta;
				if (!Number.isFinite(latDelta) || !Number.isFinite(lngDelta)) return;

				const zoomedOutNow = latDelta > 0.35 || lngDelta > 0.35;
				setIsZoomedOut(zoomedOutNow);

				if (!zoomedOutNow) return;

				const now = Date.now();
				const recentlyUserPanned = now - lastUserPanAtRef.current < 900;
				const recentlyProgrammatic = now - lastProgrammaticMoveAtRef.current < 900;
				const recentlyAutoRecovered = now - lastAutoRecoverAtRef.current < 4000;
				if (recentlyUserPanned || recentlyProgrammatic || recentlyAutoRecovered) return;

				if (latDelta > 0.8 || lngDelta > 0.8) {
					lastAutoRecoverAtRef.current = now;
					fitToLocalHospitals();
				}
			},
			[fitToLocalHospitals]
		);

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
							tracksViewChanges={false}
							zIndex={200}
						>
							<View style={styles.ambulanceMarker}>
								<FontAwesome5 name="ambulance" size={16} color="#FFFFFF" />
							</View>
						</Marker>
					)}

					{/* Hospital Markers */}
					{hospitals.filter((h) => isValidCoordinate(h?.coordinates) && h?.id).map((hospital) => {
						const isSelected = selectedHospitalId === hospital.id;
						return (
							<Marker
								key={hospital.id}
								coordinate={hospital.coordinates}
								onPress={() => handleHospitalPress(hospital)}
								anchor={{ x: 0.5, y: 0.5 }}
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
							onPress={fitToLocalHospitals}
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
	ambulanceMarker: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: COLORS.brandPrimary,
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 3,
		borderColor: "#FFFFFF",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.22,
		shadowRadius: 10,
		elevation: 8,
	},
});

FullScreenEmergencyMap.displayName = "FullScreenEmergencyMap";

export default FullScreenEmergencyMap;

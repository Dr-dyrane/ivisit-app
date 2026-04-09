import { useState, useCallback, useRef } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { calculateDistance, decodeGooglePolyline } from "../../utils/mapUtils";
import { ROUTE_CONFIG } from "../../constants/mapConfig";
import { isEmergencyDebugEnabled } from "../../utils/emergencyDebug";

export const useMapRoute = () => {
	const emergencyDebugEnabled = isEmergencyDebugEnabled();
	const isBrowserRuntime =
		typeof window !== "undefined" && typeof document !== "undefined";
	const [routeCoordinates, setRouteCoordinates] = useState([]);
	const [routeInfo, setRouteInfo] = useState({
		durationSec: null,
		distanceMeters: null,
	});
	const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
	const routeFetchIdRef = useRef(0);
	const lastRouteFitKeyRef = useRef(null);
	const lastRequestedRouteKeyRef = useRef(null);
	const routeCoordinatesRef = useRef([]);
	const routeInfoRef = useRef({
		durationSec: null,
		distanceMeters: null,
	});
	const inflightRouteKeyRef = useRef(null);
	const routeCacheRef = useRef(new Map());
	const lastRouteWasFallbackRef = useRef(false);

	const fetchJsonWithTimeout = useCallback(async (url) => {
		const controller = typeof AbortController === "function" ? new AbortController() : null;
		const timeoutMs =
			Platform.OS === "web"
				? Math.min(ROUTE_CONFIG.ROUTE_FETCH_TIMEOUT, 4500)
				: ROUTE_CONFIG.ROUTE_FETCH_TIMEOUT;
		const timeoutId = setTimeout(() => {
			controller?.abort?.();
		}, timeoutMs);

		try {
			const response = await fetch(url, {
				signal: controller?.signal,
				headers: {
					Accept: "application/json",
				},
			});

			if (!response?.ok) {
				throw new Error(`HTTP ${response?.status || "unknown"}`);
			}

			return await response.json();
		} catch (error) {
			if (error?.name === "AbortError") {
				throw new Error("Timeout");
			}
			throw error;
		} finally {
			clearTimeout(timeoutId);
		}
	}, []);

	const getFallbackRoute = useCallback(({ origin, destination, reason = "unavailable" }) => {
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

		if (!Number.isFinite(origin?.latitude) || !Number.isFinite(origin?.longitude) || !Number.isFinite(destination?.latitude) || !Number.isFinite(destination?.longitude)) {
			return null;
		}

		if (emergencyDebugEnabled) {
			console.warn(`[useMapRoute] Using direct fallback route (${reason})`);
		}

		return {
			coordinates: [
				{ latitude: Number(origin.latitude), longitude: Number(origin.longitude) },
				{ latitude: Number(destination.latitude), longitude: Number(destination.longitude) },
			],
			durationSec: estimatedDurationSec,
			distanceMeters: estimatedRoadDistanceMeters,
			isFallback: true,
		};
	}, [emergencyDebugEnabled]);

	const buildRouteKey = useCallback((origin, destination) => {
		if (!origin || !destination) return null;
		return [
			Number(origin.latitude).toFixed(6),
			Number(origin.longitude).toFixed(6),
			Number(destination.latitude).toFixed(6),
			Number(destination.longitude).toFixed(6),
		].join(":");
	}, []);

	const getGoogleApiKey = useCallback(() => {
		return (
			process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
			process.env.GOOGLE_MAPS_API_KEY ||
			Constants?.expoConfig?.extra?.googleMapsApiKey ||
			null
		);
	}, []);

	const getGoogleRoute = useCallback(async ({ origin, destination }) => {
		const googleApiKey = getGoogleApiKey();

		if (!googleApiKey) {
			console.warn(
				"[useMapRoute] Google API key not available (set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY for Expo, or provide expo.extra.googleMapsApiKey)"
			);
			return null;
		}

		if (isBrowserRuntime) {
			try {
				const mapsApi = await new Promise((resolve) => {
					const getMaps = () =>
						typeof window !== "undefined" && window.google?.maps
							? window.google.maps
							: null;

					const readyMaps = getMaps();
					if (readyMaps) {
						resolve(readyMaps);
						return;
					}

					const startedAt = Date.now();
					const timer = setInterval(() => {
						const nextMaps = getMaps();
						if (nextMaps || Date.now() - startedAt >= 4500) {
							clearInterval(timer);
							resolve(nextMaps || null);
						}
					}, 120);
				});

				if (!mapsApi) {
					return null;
				}

				const routesModule = typeof mapsApi.importLibrary === "function"
					? await mapsApi.importLibrary("routes").catch(() => mapsApi)
					: mapsApi;
				const DirectionsServiceClass =
					routesModule?.DirectionsService || mapsApi.DirectionsService;
				const travelMode = mapsApi.TravelMode?.DRIVING || "DRIVING";
				const trafficModel = mapsApi.TrafficModel?.BEST_GUESS || "BEST_GUESS";

				if (typeof DirectionsServiceClass !== "function") {
					return null;
				}

				const directionsService = new DirectionsServiceClass();
				const request = {
					origin: { lat: Number(origin.latitude), lng: Number(origin.longitude) },
					destination: { lat: Number(destination.latitude), lng: Number(destination.longitude) },
					travelMode,
					drivingOptions: {
						departureTime: new Date(),
						trafficModel,
					},
					provideRouteAlternatives: false,
				};

				const result = await Promise.race([
					new Promise((resolve, reject) => {
						directionsService.route(request, (response, status) => {
							if (status === "OK" || status === mapsApi.DirectionsStatus?.OK) {
								resolve(response);
								return;
							}
							reject(new Error(`Directions status: ${status}`));
						});
					}),
					new Promise((_, reject) =>
						setTimeout(() => reject(new Error("Timeout")), 4500),
					),
				]);

				const route = result?.routes?.[0];
				const leg = route?.legs?.[0];
				const path = Array.isArray(route?.overview_path) ? route.overview_path : [];
				const coords = path
					.map((point) => ({
						latitude:
							typeof point?.lat === "function" ? point.lat() : Number(point?.lat),
						longitude:
							typeof point?.lng === "function" ? point.lng() : Number(point?.lng),
					}))
					.filter(
						(point) =>
							Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
					);

				const durationSec =
					leg?.duration_in_traffic?.value ?? leg?.duration?.value ?? null;
				const distanceMeters = leg?.distance?.value ?? null;

				if (coords.length >= 2) {
					return { coordinates: coords, durationSec, distanceMeters, isFallback: false };
				}
			} catch (err) {
				console.warn("[useMapRoute] Web Google route failed:", err);
			}

			return null;
		}

		try {
			const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=driving&departure_time=now&traffic_model=best_guess&key=${googleApiKey}`;

			const json = await fetchJsonWithTimeout(url);
			const route = json?.routes?.[0];
			const poly = route?.overview_polyline?.points;
			const coords = decodeGooglePolyline(poly);
			const leg = route?.legs?.[0];

			const durationSec =
				leg?.duration_in_traffic?.value ?? leg?.duration?.value ?? null;
			const distanceMeters = leg?.distance?.value ?? null;

			if (coords.length >= 2) {
				return { coordinates: coords, durationSec, distanceMeters };
			}
		} catch (err) {
			console.error("[useMapRoute] Google route failed:", err);
		}

		return null;
	}, [fetchJsonWithTimeout, getGoogleApiKey, isBrowserRuntime]);

	const getOSRMRoute = useCallback(async ({ origin, destination }) => {
		if (isBrowserRuntime) {
			if (emergencyDebugEnabled) {
				console.warn(
					"[useMapRoute] Skipping direct OSRM fetch in browser runtime; using JS route service or fallback preview."
				);
			}
			return null;
		}

		try {
			const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&alternatives=false&steps=false`;

			const json = await fetchJsonWithTimeout(url);
			const osrmRoute = json?.routes?.[0];
			const coordsRaw = osrmRoute?.geometry?.coordinates;

			if (Array.isArray(coordsRaw) && coordsRaw.length >= 2) {
				return {
					coordinates: coordsRaw.map(([lon, lat]) => ({
						latitude: lat,
						longitude: lon,
					})),
					durationSec: Number.isFinite(osrmRoute?.duration)
						? osrmRoute.duration
						: null,
					distanceMeters: Number.isFinite(osrmRoute?.distance)
						? osrmRoute.distance
						: null,
				};
			}
		} catch (err) {
			if (err?.message === "Timeout") {
				console.warn("[useMapRoute] OSRM route timed out, falling back to a direct preview line.");
			} else {
				console.error("[useMapRoute] OSRM route failed:", err);
			}
		}

		return null;
	}, [emergencyDebugEnabled, fetchJsonWithTimeout, isBrowserRuntime]);

	const calculateRoute = useCallback(
		async (origin, destination) => {
			if (!origin || !destination) {
				if (emergencyDebugEnabled) {
					console.warn("[useMapRoute] Missing origin or destination");
				}
				return;
			}

			const routeKey = buildRouteKey(origin, destination);
			if (!routeKey) {
				return;
			}

			const applyRouteResult = (result) => {
				lastRequestedRouteKeyRef.current = routeKey;
				lastRouteWasFallbackRef.current = Boolean(result?.isFallback);
				routeCoordinatesRef.current = result.coordinates;
				setRouteCoordinates(result.coordinates);
				if (emergencyDebugEnabled) {
					console.log("[useMapRoute] Route calculated:", {
						distance: result.distanceMeters,
						duration: result.durationSec,
					});
				}

				const finalDuration =
					result.durationSec === 0
						? 900
						: Math.max(result.durationSec, 60);

				const nextRouteInfo = {
					durationSec: finalDuration,
					distanceMeters: result.distanceMeters,
				};
				routeInfoRef.current = nextRouteInfo;
				setRouteInfo(nextRouteInfo);
			};

			if (
				lastRequestedRouteKeyRef.current === routeKey &&
				routeCoordinatesRef.current.length >= 2 &&
				!lastRouteWasFallbackRef.current
			) {
				return;
			}

			if (inflightRouteKeyRef.current === routeKey) {
				return;
			}

			const cachedRoute = routeCacheRef.current.get(routeKey);
			if (cachedRoute?.coordinates?.length >= 2 && !cachedRoute?.isFallback) {
				applyRouteResult(cachedRoute);
				return;
			}

			setIsCalculatingRoute(true);
			const currentFetchId = ++routeFetchIdRef.current;
			inflightRouteKeyRef.current = routeKey;

			try {
				let result = null;
				const routeOrder = isBrowserRuntime
					? ["GOOGLE"]
					: ROUTE_CONFIG.PRIMARY_ROUTE_API === "GOOGLE"
						? ["GOOGLE", "OSRM"]
						: ["OSRM", "GOOGLE"];

				for (const api of routeOrder) {
					if (api === "GOOGLE") {
						result = await getGoogleRoute({ origin, destination });
					} else {
						result = await getOSRMRoute({ origin, destination });
					}

					if (result) {
						break;
					}

					if (emergencyDebugEnabled) {
						console.log(
							`[useMapRoute] ${api} route failed, trying next API if available`
						);
					}
				}

				if (!result) {
					result = getFallbackRoute({
						origin,
						destination,
						reason: isBrowserRuntime ? "browser_route_fallback" : "route_api_unavailable",
					});
				}

				if (currentFetchId === routeFetchIdRef.current && result) {
					if (result?.isFallback) {
						routeCacheRef.current.delete(routeKey);
					} else {
						routeCacheRef.current.set(routeKey, result);
					}
					applyRouteResult(result);
				}
			} catch (err) {
				console.error("[useMapRoute] Route calculation failed:", err);
			} finally {
				if (currentFetchId === routeFetchIdRef.current) {
					inflightRouteKeyRef.current = null;
					setIsCalculatingRoute(false);
				}
			}
		},
		[buildRouteKey, emergencyDebugEnabled, getFallbackRoute, getGoogleRoute, getOSRMRoute, isBrowserRuntime]
	);

	const clearRoute = useCallback(() => {
		setRouteCoordinates([]);
		setRouteInfo({ durationSec: null, distanceMeters: null });
		routeCoordinatesRef.current = [];
		routeInfoRef.current = { durationSec: null, distanceMeters: null };
		lastRequestedRouteKeyRef.current = null;
		inflightRouteKeyRef.current = null;
		lastRouteWasFallbackRef.current = false;
		lastRouteFitKeyRef.current = null;
	}, []);

	return {
		routeCoordinates,
		routeInfo,
		isCalculatingRoute,
		calculateRoute,
		clearRoute,
		lastRouteFitKey: lastRouteFitKeyRef.current,
	};
};

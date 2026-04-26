import { useState, useCallback, useRef } from "react";
import { Platform } from "react-native";
import { calculateDistance } from "../../utils/mapUtils";
import { ROUTE_CONFIG } from "../../constants/mapConfig";
import { isEmergencyDebugEnabled } from "../../utils/emergencyDebug";
import mapboxService from "../../services/mapboxService";

export const useMapRoute = () => {
	const emergencyDebugEnabled = isEmergencyDebugEnabled();
	const isBrowserRuntime =
		typeof window !== "undefined" && typeof document !== "undefined";
	const [routeCoordinates, setRouteCoordinates] = useState([]);
	const [routeInfo, setRouteInfo] = useState({
		durationSec: null,
		distanceMeters: null,
	});
	const [isFallbackRoute, setIsFallbackRoute] = useState(false);
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

	// Mapbox Directions API v5 - free tier: 100,000 requests/month
	const getMapboxRoute = useCallback(async ({ origin, destination }) => {
		const accessToken = mapboxService.accessToken;
		if (!accessToken) {
			console.warn("[useMapRoute] Mapbox access token not available");
			return null;
		}

		try {
			// Mapbox Directions v5 API with driving profile
			const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?geometries=geojson&overview=full&access_token=${accessToken}`;

			const controller = typeof AbortController === "function" ? new AbortController() : null;
			const timeoutMs = Platform.OS === "web" ? 4500 : ROUTE_CONFIG.ROUTE_FETCH_TIMEOUT;
			const timeoutId = setTimeout(() => controller?.abort?.(), timeoutMs);

			const response = await fetch(url, {
				signal: controller?.signal,
				headers: { Accept: "application/json" },
			});

			clearTimeout(timeoutId);

			if (!response?.ok) {
				throw new Error(`HTTP ${response?.status || "unknown"}`);
			}

			const json = await response.json();
			const route = json?.routes?.[0];
			const geometry = route?.geometry;

			if (geometry?.type === "LineString" && Array.isArray(geometry.coordinates)) {
				const coords = geometry.coordinates.map(([lon, lat]) => ({
					latitude: lat,
					longitude: lon,
				}));

				if (coords.length >= 2) {
					return {
						coordinates: coords,
						durationSec: route?.duration ?? null,
						distanceMeters: route?.distance ?? null,
						isFallback: false,
					};
				}
			}
		} catch (err) {
			if (err?.message === "Timeout" || err?.name === "AbortError") {
				console.warn("[useMapRoute] Mapbox route timed out, falling back to OSRM");
			} else {
				console.error("[useMapRoute] Mapbox route failed:", err);
			}
		}

		return null;
	}, []);


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
				setIsFallbackRoute(Boolean(result?.isFallback));
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
				// Mapbox primary (100k free/month), OSRM fallback (free), direct line last resort
				const routeOrder = ["MAPBOX", "OSRM"];

				for (const api of routeOrder) {
					if (api === "MAPBOX") {
						result = await getMapboxRoute({ origin, destination });
					} else {
						result = await getOSRMRoute({ origin, destination });
					}

					if (result) {
						break;
					}

					if (emergencyDebugEnabled) {
						console.log(
							`[useMapRoute] ${api} route failed, trying fallback`
						);
					}
				}

				if (!result) {
					result = getFallbackRoute({
						origin,
						destination,
						reason: "route_api_unavailable",
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
		[buildRouteKey, emergencyDebugEnabled, getFallbackRoute, getMapboxRoute, getOSRMRoute]
	);

	const clearRoute = useCallback(() => {
		setRouteCoordinates([]);
		setRouteInfo({ durationSec: null, distanceMeters: null });
		setIsFallbackRoute(false);
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
		isFallbackRoute,
		isCalculatingRoute,
		calculateRoute,
		clearRoute,
		lastRouteFitKey: lastRouteFitKeyRef.current,
	};
};

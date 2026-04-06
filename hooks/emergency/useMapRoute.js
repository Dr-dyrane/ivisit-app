import { useState, useCallback, useRef } from "react";
import Constants from "expo-constants";
import { decodeGooglePolyline } from "../../utils/mapUtils";
import { ROUTE_CONFIG } from "../../constants/mapConfig";
import { isEmergencyDebugEnabled } from "../../utils/emergencyDebug";

export const useMapRoute = () => {
	const emergencyDebugEnabled = isEmergencyDebugEnabled();
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

		try {
			const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=driving&departure_time=now&traffic_model=best_guess&key=${googleApiKey}`;

			const res = await Promise.race([
				fetch(url),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error("Timeout")), ROUTE_CONFIG.ROUTE_FETCH_TIMEOUT)
				),
			]);

			const json = await res.json();
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
	}, [getGoogleApiKey]);

	const getOSRMRoute = useCallback(async ({ origin, destination }) => {
		try {
			const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&alternatives=false&steps=false`;

			const res = await Promise.race([
				fetch(url),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error("Timeout")), ROUTE_CONFIG.ROUTE_FETCH_TIMEOUT)
				),
			]);

			const json = await res.json();
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
			console.error("[useMapRoute] OSRM route failed:", err);
		}

		return null;
	}, []);

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
				routeCoordinatesRef.current.length >= 2
			) {
				return;
			}

			if (inflightRouteKeyRef.current === routeKey) {
				return;
			}

			const cachedRoute = routeCacheRef.current.get(routeKey);
			if (cachedRoute?.coordinates?.length >= 2) {
				applyRouteResult(cachedRoute);
				return;
			}

			setIsCalculatingRoute(true);
			const currentFetchId = ++routeFetchIdRef.current;
			inflightRouteKeyRef.current = routeKey;

			try {
				let result = null;

				if (ROUTE_CONFIG.PRIMARY_ROUTE_API === "GOOGLE") {
					result = await getGoogleRoute({ origin, destination });
					if (!result) {
						if (emergencyDebugEnabled) {
							console.log("[useMapRoute] Falling back to OSRM");
						}
						result = await getOSRMRoute({ origin, destination });
					}
				} else {
					result = await getOSRMRoute({ origin, destination });
					if (!result) {
						if (emergencyDebugEnabled) {
							console.log("[useMapRoute] Falling back to Google");
						}
						result = await getGoogleRoute({ origin, destination });
					}
				}

				if (currentFetchId === routeFetchIdRef.current && result) {
					routeCacheRef.current.set(routeKey, result);
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
		[buildRouteKey, emergencyDebugEnabled, getGoogleRoute, getOSRMRoute]
	);

	const clearRoute = useCallback(() => {
		setRouteCoordinates([]);
		setRouteInfo({ durationSec: null, distanceMeters: null });
		routeCoordinatesRef.current = [];
		routeInfoRef.current = { durationSec: null, distanceMeters: null };
		lastRequestedRouteKeyRef.current = null;
		inflightRouteKeyRef.current = null;
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

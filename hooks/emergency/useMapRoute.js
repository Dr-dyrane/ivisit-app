import { useState, useCallback, useRef } from "react";
import Constants from "expo-constants";
import { decodeGooglePolyline } from "../../utils/mapUtils";
import { ROUTE_CONFIG } from "../../constants/mapConfig";

export const useMapRoute = () => {
	const [routeCoordinates, setRouteCoordinates] = useState([]);
	const [routeInfo, setRouteInfo] = useState({
		durationSec: null,
		distanceMeters: null,
	});
	const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
	const routeFetchIdRef = useRef(0);
	const lastRouteFitKeyRef = useRef(null);

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
				console.warn("[useMapRoute] Missing origin or destination");
				return;
			}

			setIsCalculatingRoute(true);
			const currentFetchId = ++routeFetchIdRef.current;

			try {
				let result = null;

				if (ROUTE_CONFIG.PRIMARY_ROUTE_API === "GOOGLE") {
					result = await getGoogleRoute({ origin, destination });
					if (!result) {
						console.log("[useMapRoute] Falling back to OSRM");
						result = await getOSRMRoute({ origin, destination });
					}
				} else {
					result = await getOSRMRoute({ origin, destination });
					if (!result) {
						console.log("[useMapRoute] Falling back to Google");
						result = await getGoogleRoute({ origin, destination });
					}
				}

				if (currentFetchId === routeFetchIdRef.current && result) {
					setRouteCoordinates(result.coordinates);
					setRouteInfo({
						durationSec: result.durationSec,
						distanceMeters: result.distanceMeters,
					});

					lastRouteFitKeyRef.current = `${origin.latitude}-${origin.longitude}-${destination.latitude}-${destination.longitude}`;

					console.log("[useMapRoute] Route calculated:", {
						distance: result.distanceMeters,
						duration: result.durationSec,
					});
				}
			} catch (err) {
				console.error("[useMapRoute] Route calculation failed:", err);
			} finally {
				setIsCalculatingRoute(false);
			}
		},
		[getGoogleRoute, getOSRMRoute]
	);

	const clearRoute = useCallback(() => {
		setRouteCoordinates([]);
		setRouteInfo({ durationSec: null, distanceMeters: null });
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

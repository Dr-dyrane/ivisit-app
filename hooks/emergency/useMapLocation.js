import { useState, useCallback, useRef, useEffect } from "react";
import * as Location from "expo-location";
import { LOCATION_CONFIG } from "../../constants/mapConfig";

export const useMapLocation = () => {
	const [userLocation, setUserLocation] = useState(null);
	const [locationPermission, setLocationPermission] = useState(false);
	const [isLoadingLocation, setIsLoadingLocation] = useState(true);
	const hasCenteredOnUser = useRef(false);
	const locationWatcherRef = useRef(null);

	const requestLocationPermission = useCallback(async () => {
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();
			const hasPermission = status === "granted";
			setLocationPermission(hasPermission);

			if (hasPermission) {
				const location = await Location.getCurrentPositionAsync({
					accuracy: Location.Accuracy.High,
				});
				setUserLocation({
					latitude: location.coords.latitude,
					longitude: location.coords.longitude,
				});
			}
			setIsLoadingLocation(false);
		} catch (err) {
			console.error("[useMapLocation] Permission request failed:", err);
			setIsLoadingLocation(false);
		}
	}, []);

	const startLocationTracking = useCallback(() => {
		if (!locationPermission) {
			console.warn("[useMapLocation] Location permission not granted");
			return;
		}

		try {
			locationWatcherRef.current = Location.watchPositionAsync(
				{
					accuracy: LOCATION_CONFIG.ACCURACY,
					timeInterval: LOCATION_CONFIG.DISTANCE_INTERVAL,
					distanceInterval: LOCATION_CONFIG.DISTANCE_INTERVAL,
				},
				(location) => {
					setUserLocation({
						latitude: location.coords.latitude,
						longitude: location.coords.longitude,
					});
				}
			).then((subscription) => subscription);
		} catch (err) {
			console.error("[useMapLocation] Location tracking failed:", err);
		}
	}, [locationPermission]);

	const stopLocationTracking = useCallback(() => {
		if (locationWatcherRef.current) {
			locationWatcherRef.current.then((subscription) => {
				subscription?.remove?.();
			});
			locationWatcherRef.current = null;
		}
	}, []);

	useEffect(() => {
		return () => {
			stopLocationTracking();
		};
	}, [stopLocationTracking]);

	return {
		userLocation,
		locationPermission,
		isLoadingLocation,
		hasCenteredOnUser,
		requestLocationPermission,
		startLocationTracking,
		stopLocationTracking,
	};
};

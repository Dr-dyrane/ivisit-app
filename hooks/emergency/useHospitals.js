import { useState, useEffect, useCallback } from "react";
import { hospitalsService } from "../../services/hospitalsService";
import * as Location from "expo-location";

/**
 * Hook to fetch hospitals using the hospitals service with real-time location
 *
 * @returns {Object} { hospitals, isLoading, error, refetch, userLocation }
 */
export function useHospitals() {
	const [hospitals, setHospitals] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [userLocation, setUserLocation] = useState(null);

	const fetchHospitals = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			// Get user's current location
			let location = userLocation;
			if (!location) {
				const { status } = await Location.requestForegroundPermissionsAsync();
				if (status !== 'granted') {
					console.warn('Location permission denied');
					// Fallback to Hemet coordinates
					location = { latitude: 33.7475, longitude: -116.9730 };
				} else {
					const currentLocation = await Location.getCurrentPositionAsync({});
					location = {
						latitude: currentLocation.coords.latitude,
						longitude: currentLocation.coords.longitude
					};
				}
				setUserLocation(location);
			}

			// Use nearby hospitals function with real location
			const data = await hospitalsService.listNearby(
				location.latitude, 
				location.longitude, 
				50 // 50km radius
			);
			
			console.log('[useHospitals] Fetched nearby hospitals:', data.length, 'from location:', location);
			setHospitals(data);
		} catch (err) {
			console.error("Error fetching hospitals:", err);
			setError(err);
		} finally {
			setIsLoading(false);
		}
	}, [userLocation]);

	useEffect(() => {
		fetchHospitals();
	}, [fetchHospitals]);

	return {
		hospitals,
		isLoading,
		error,
		refetch: fetchHospitals,
		userLocation,
	};
}

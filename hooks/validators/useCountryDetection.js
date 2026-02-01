import { useState, useEffect } from "react";
import * as Location from "expo-location";
import countries from "../../data/countries";
import { useOptionalLocation } from "../../contexts/GlobalLocationContext";

/**
 * useCountryDetection Hook
 *
 * Detects user's country via location with fallback
 * Now uses GlobalLocationContext for instant cached location
 * Separates location logic from UI
 *
 * @returns {Object} - Country detection state
 */
export default function useCountryDetection() {
	const [country, setCountry] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	
	// Use cached location from GlobalLocationContext
	const { location, hasPermission, isLoading: locationLoading } = useOptionalLocation();

	useEffect(() => {
		detectCountry();
	}, [location, hasPermission, locationLoading]);

	const detectCountry = async () => {
		try {
			// If location is already available from global context, use it immediately
			if (location && hasPermission) {
				console.log("[useCountryDetection] Using cached location from GlobalLocationContext");
				const geocode = await Location.reverseGeocodeAsync({
					latitude: location.latitude,
					longitude: location.longitude,
				});

				if (geocode[0]?.isoCountryCode) {
					const found = countries.find(
						(c) => c.code === geocode[0].isoCountryCode
					);
					if (found) {
						setCountry(found);
						setLoading(false);
						return;
					}
				}
			}
			
			// If no cached location or permission, request it (fallback)
			if (!locationLoading && !hasPermission) {
				console.log("[useCountryDetection] No cached location, requesting permission...");
				const { status } = await Location.requestForegroundPermissionsAsync();

				if (status === "granted") {
					const locationData = await Location.getCurrentPositionAsync({
						accuracy: Location.Accuracy.Low,
					});
					const geocode = await Location.reverseGeocodeAsync(locationData.coords);

					if (geocode[0]?.isoCountryCode) {
						const found = countries.find(
							(c) => c.code === geocode[0].isoCountryCode
						);
						if (found) {
							setCountry(found);
							setLoading(false);
							return;
						}
					}
				}
			}
		} catch (err) {
			console.error("[useCountryDetection] Country detection error:", err);
			setError(err);
		}

		// Fallback to US
		const fallback = countries.find((c) => c.code === "US") || countries[0];
		setCountry(fallback);
		setLoading(false);
	};

	return { country, setCountry, loading, error };
}

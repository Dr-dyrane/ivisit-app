import { useState, useEffect, useCallback, useRef } from "react";
import { hospitalsService } from "../../services/hospitalsService";
import * as Location from "expo-location";

/**
 * Calculate relevance score for hospitals based on distance, rating, and availability
 */
const calculateRelevanceScore = (hospital, userLocation) => {
  const distance = hospital.distanceKm || 0;
  const rating = hospital.rating || 0;
  const verified = hospital.verified;
  const availableBeds = hospital.availableBeds || 0;
  
  let score = 100;
  
  // Distance penalty (closer is better)
  score -= Math.min(distance * 5, 50); // Max 50 points penalty
  
  // Rating bonus
  score += Math.min(rating * 5, 25); // Max 25 points bonus
  
  // Verification bonus
  if (verified) score += 15;
  
  // Availability bonus
  if (availableBeds > 0) score += 10;
  
  return Math.max(0, score);
};

/**
 * Categorize hospitals by distance ranges
 */
const categorizeHospitals = (hospitals) => {
  return {
    immediate: hospitals.filter(h => h.distanceKm <= 5),     // 0-5km
    nearby: hospitals.filter(h => h.distanceKm > 5 && h.distanceKm <= 15), // 5-15km  
    extended: hospitals.filter(h => h.distanceKm > 15 && h.distanceKm <= 50) // 15-50km
  };
};

/**
 * Get display hospitals with smart sorting and auto-expansion
 */
const getDisplayHospitals = (hospitals, userLocation) => {
  const categorized = categorizeHospitals(hospitals);
  
  // Start with immediate + nearby
  let display = [...categorized.immediate, ...categorized.nearby];
  
  // Auto-expand if less than 3 hospitals
  if (display.length < 3 && categorized.extended.length > 0) {
    display = [...display, ...categorized.extended.slice(0, 5 - display.length)];
  }
  
  // Sort by relevance score
  return display
    .map(h => ({ ...h, relevanceScore: calculateRelevanceScore(h, userLocation) }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
};

/**
 * Hook to fetch hospitals using the hospitals service with real-time location
 * Enhanced with smart categorization and relevance scoring
 *
 * @returns {Object} { hospitals, allHospitals, categories, isLoading, error, refetch, userLocation }
 */
export function useHospitals() {
	const [hospitals, setHospitals] = useState([]);
	const [allHospitals, setAllHospitals] = useState([]);
	const [categories, setCategories] = useState({});
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

			console.log('[useHospitals] Fetching hospitals for location:', location);

			// Auto-expand radius if no hospitals found
			let radius = 15000; // Start with 15km
			let data = [];
			let attempts = 0;
			const maxRadius = 50000; // Max 50km
			const radiusIncrement = 10000; // Increase by 10km each attempt
			const targetHospitalCount = 5; // Target 5 hospitals

			while (attempts < 5 && radius <= maxRadius) {
				console.log(`[useHospitals] Attempt ${attempts + 1}: Searching ${radius/1000}km radius`);
				
				data = await hospitalsService.discoverNearby(
					location.latitude,
					location.longitude,
					radius
				);

				// Check if we found enough hospitals with available resources
				// This will be checked at the context level for mode-specific filtering
				const hasEnoughHospitals = data.length >= targetHospitalCount;

				if (data.length > 0 && hasEnoughHospitals) {
					console.log(`[useHospitals] Found ${data.length} hospitals at ${radius/1000}km radius`);
					break;
				}

				console.log(`[useHospitals] Only ${data.length} hospitals found at ${radius/1000}km, expanding radius...`);
				radius += radiusIncrement;
				attempts++;
			}

			if (data.length === 0) {
				console.warn('[useHospitals] No hospitals found even after expanding radius to max');
			} else {
				console.log(`[useHospitals] Final result: ${data.length} hospitals total`);
			}

			console.log('[useHospitals] Fetched nearby hospitals:', data.length, 'from location:', location);
			
			// Apply smart logic with dynamic wait times
			const categorized = categorizeHospitals(data);
			const display = getDisplayHospitals(data, location);
			
			// Calculate dynamic wait times for display hospitals
			const hospitalsWithWaitTimes = display.map(hospital => {
				const waitTimeInfo = hospitalsService.calculateDynamicWaitTime(hospital, location);
				return {
					...hospital,
					dynamicWaitTime: waitTimeInfo
				};
			});
			
			setAllHospitals(data);
			setHospitals(hospitalsWithWaitTimes);
			setCategories(categorized);
			
			console.log('[useHospitals] Smart categorization:', {
				total: data.length,
				immediate: categorized.immediate.length,
				nearby: categorized.nearby.length,
				extended: categorized.extended.length,
				display: display.length
			});
			
		} catch (err) {
			console.error("Error fetching hospitals:", err);
			setError(err);
		} finally {
			setIsLoading(false);
		}
	}, []); // 🔴 REVERT POINT: Fixed infinite loop dependency
	// PREVIOUS: [userLocation] caused infinite loop when setUserLocation was called
	// NEW: Empty dependency array - fetchHospitals doesn't depend on userLocation
	// REVERT TO: }, [userLocation]);

	// 🔴 REVERT POINT: Add location comparison to prevent duplicate fetches
	// PREVIOUS: useEffect with just fetchHospitals dependency
	// NEW: Compare location coordinates before fetching to avoid duplicate calls
	// REVERT TO: useEffect(() => { fetchHospitals(); }, [fetchHospitals]);
	
	const lastLocationRef = useRef(null);
	
	useEffect(() => {
		// Only fetch if location actually changed significantly (more than 10 meters)
		if (lastLocationRef.current) {
			const latDiff = Math.abs(lastLocationRef.current.latitude - userLocation.latitude);
			const lngDiff = Math.abs(lastLocationRef.current.longitude - userLocation.longitude);
			
			if (latDiff < 0.0001 && lngDiff < 0.0001) {
				console.log('[useHospitals] Location change too small, skipping fetch');
				return;
			}
		}
		
		lastLocationRef.current = userLocation;
		fetchHospitals();
	}, [fetchHospitals, userLocation]);

	return {
		hospitals, // Smart-sorted, auto-expanded hospitals
		allHospitals, // Raw data from API
		categories, // Immediate/nearby/extended groups
		isLoading,
		error,
		refetch: fetchHospitals,
		userLocation,
	};
}

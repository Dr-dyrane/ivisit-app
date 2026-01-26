import { useState, useEffect, useCallback } from "react";
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

			// Use nearby hospitals function with real location
			// This now triggers the Edge Function to seed Google Places data
			const data = await hospitalsService.discoverNearby(
				location.latitude,
				location.longitude,
				15000 // 15km radius in meters
			);

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
	}, [userLocation]);

	useEffect(() => {
		fetchHospitals();
	}, [fetchHospitals]);

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

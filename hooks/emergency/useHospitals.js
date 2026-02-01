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

// 🔴 REVERT POINT: Module-level SWR Cache
// PREVIOUS: Internal hook state only, cleared on unmount/refresh
// NEW: Global module cache for instant "Apple-style" loading
// REVERT TO: Remove globalHospitalCache and related logic
let globalHospitalCache = {
	hospitals: [],
	allHospitals: [],
	categories: {},
	timestamp: 0
};

/**
 * Hook to fetch hospitals using the hospitals service with real-time location.
 * Streamlined to prevent infinite loops and excessive API calls.
 * 
 * @returns {Object} { hospitals, allHospitals, categories, isLoading, error, refetch, userLocation }
 */
export function useHospitals() {
	const [hospitals, setHospitals] = useState(globalHospitalCache.hospitals);
	const [allHospitals, setAllHospitals] = useState(globalHospitalCache.allHospitals);
	const [categories, setCategories] = useState(globalHospitalCache.categories);
	const [isLoading, setIsLoading] = useState(globalHospitalCache.hospitals.length === 0);
	const [error, setError] = useState(null);
	const [userLocation, setUserLocation] = useState(null);

	const lastLocationRef = useRef(null);
	const isInitialLoadRef = useRef(true);

	// Core fetching logic - pure functional approach
	const performFetch = useCallback(async (location) => {
		if (!location) return;

		try {
			// 🔴 REVERT POINT: Background Refresh Stability
			// PREVIOUS: Always set isLoading(true), clearing UI state
			// NEW: Only show loading spinner on initial fetch; keep data visible during updates
			// REVERT TO: setIsLoading(true); setError(null);
			if (hospitals.length === 0) {
				setIsLoading(true);
			}

			console.log('[useHospitals] Fetching hospitals for location:', location);

			// We use a generous 50km radius by default to avoid multiple roundtrips
			// The backend/RPC handles the heavy lifting
			const data = await hospitalsService.discoverNearby(
				location.latitude,
				location.longitude,
				50000 // 50km
			);

			if (data.length === 0) {
				console.warn('[useHospitals] No hospitals found in 50km radius');
			}

			// Apply smart logic
			const categorized = categorizeHospitals(data);
			const display = getDisplayHospitals(data, location);

			// Calculate dynamic wait times
			const hospitalsWithWaitTimes = display.map(hospital => ({
				...hospital,
				dynamicWaitTime: hospitalsService.calculateDynamicWaitTime(hospital, location)
			}));

			setAllHospitals(data);
			setHospitals(hospitalsWithWaitTimes);
			setCategories(categorized);

			// Update the global cache for the next remount
			globalHospitalCache = {
				hospitals: hospitalsWithWaitTimes,
				allHospitals: data,
				categories: categorized,
				timestamp: Date.now()
			};

		} catch (err) {
			console.error("[useHospitals] Fetch error:", err);
			setError(err);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Get initial location
	useEffect(() => {
		let isMounted = true;

		const getInitialLocation = async () => {
			try {
				const { status } = await Location.requestForegroundPermissionsAsync();
				let location;

				if (status !== 'granted') {
					console.warn('[useHospitals] Location permission denied, using fallback');
					location = { latitude: 33.7475, longitude: -116.9730 };
				} else {
					const currentLocation = await Location.getCurrentPositionAsync({
						accuracy: Location.Accuracy.Balanced
					});
					location = {
						latitude: currentLocation.coords.latitude,
						longitude: currentLocation.coords.longitude
					};
				}

				if (isMounted) {
					setUserLocation(location);
					lastLocationRef.current = location;
					performFetch(location);
				}
			} catch (err) {
				console.error("[useHospitals] Location error:", err);
				if (isMounted) setError(err);
			}
		};

		getInitialLocation();
		return () => { isMounted = false; };
	}, [performFetch]);

	// Refetch only on significant location change
	useEffect(() => {
		if (!userLocation || isInitialLoadRef.current) {
			isInitialLoadRef.current = false;
			return;
		}

		const significantChange = lastLocationRef.current ? (
			Math.abs(lastLocationRef.current.latitude - userLocation.latitude) > 0.005 ||
			Math.abs(lastLocationRef.current.longitude - userLocation.longitude) > 0.005
		) : true;

		if (significantChange) {
			lastLocationRef.current = userLocation;
			performFetch(userLocation);
		}
	}, [userLocation, performFetch]);

	const manualRefetch = useCallback(() => {
		if (userLocation) performFetch(userLocation);
	}, [userLocation, performFetch]);

	return {
		hospitals,
		allHospitals,
		categories,
		isLoading,
		error,
		refetch: manualRefetch,
		userLocation,
	};
}

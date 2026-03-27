import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { hospitalsService } from "../../services/hospitalsService";
import { demoEcosystemService } from "../../services/demoEcosystemService";
import * as Location from "expo-location";
import { DEFAULT_APP_COORDINATES } from "../../constants/locationDefaults";

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

const normalizeLocation = (location) => {
	const latitude = Number(location?.latitude);
	const longitude = Number(location?.longitude);

	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return null;
	}

	return { latitude, longitude };
};

const isSameLocation = (left, right) =>
	Number(left?.latitude) === Number(right?.latitude) &&
	Number(left?.longitude) === Number(right?.longitude);

/**
 * Hook to fetch hospitals using the hospitals service with real-time location.
 * Streamlined to prevent infinite loops and excessive API calls.
 * 
 * @returns {Object} { hospitals, allHospitals, categories, isLoading, error, refetch, userLocation }
 */
export function useHospitals(options = {}) {
	const externalLocation = useMemo(
		() => normalizeLocation(options?.location),
		[options?.location?.latitude, options?.location?.longitude]
	);
	const demoModeEnabled = options?.demoModeEnabled !== false;
	const userId = options?.userId ?? null;
	const [hospitals, setHospitals] = useState(globalHospitalCache.hospitals);
	const [allHospitals, setAllHospitals] = useState(globalHospitalCache.allHospitals);
	const [categories, setCategories] = useState(globalHospitalCache.categories);
	const [isLoading, setIsLoading] = useState(globalHospitalCache.hospitals.length === 0);
	const [error, setError] = useState(null);
	const [resolvedLocation, setResolvedLocation] = useState(externalLocation);

	const lastLocationRef = useRef(null);
	const hasFetchedRef = useRef(globalHospitalCache.hospitals.length > 0);
	const userLocation = externalLocation || resolvedLocation;

	// Core fetching logic - pure functional approach
	const performFetch = useCallback(async (location) => {
		const normalizedLocation = normalizeLocation(location);
		if (!normalizedLocation) return;

		try {
			// 🔴 REVERT POINT: Background Refresh Stability
			// PREVIOUS: Always set isLoading(true), clearing UI state
			// NEW: Only show loading spinner on initial fetch; keep data visible during updates
			// REVERT TO: setIsLoading(true); setError(null);
			// Use ref instead of state to avoid stale closure
			if (!hasFetchedRef.current) {
				setIsLoading(true);
			}
			setError(null);

			if (demoModeEnabled && userId) {
				try {
					await demoEcosystemService.ensureDemoEcosystemForLocation({
						userId,
						latitude: normalizedLocation.latitude,
						longitude: normalizedLocation.longitude,
						radiusKm: 50,
					});
				} catch (bootstrapError) {
					console.warn("[useHospitals] Demo bootstrap sync skipped", bootstrapError);
				}
			}

			// We use a generous 50km radius by default to avoid multiple roundtrips
			// The backend/RPC handles the heavy lifting
			const data = await hospitalsService.discoverNearby(
				normalizedLocation.latitude,
				normalizedLocation.longitude,
				50000 // 50km
			);

			if (data.length === 0) {
				console.warn('[useHospitals] No hospitals found in 50km radius');
			}

			// Apply smart logic
			const categorized = categorizeHospitals(data);
			const display = getDisplayHospitals(data, normalizedLocation);

			// Calculate dynamic wait times
			const hospitalsWithWaitTimes = display.map(hospital => ({
				...hospital,
				dynamicWaitTime: hospitalsService.calculateDynamicWaitTime(hospital, normalizedLocation)
			}));

			setAllHospitals(data);
			setHospitals(hospitalsWithWaitTimes);
			setCategories(categorized);

			// Mark as fetched to prevent loading spinner on subsequent fetches
			hasFetchedRef.current = true;

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
	}, [demoModeEnabled, userId]);

	// Resolve initial location when nothing upstream has provided one yet.
	useEffect(() => {
		let isMounted = true;

		if (externalLocation) {
			setResolvedLocation((current) =>
				isSameLocation(current, externalLocation) ? current : externalLocation
			);
			return () => {
				isMounted = false;
			};
		}

		const getInitialLocation = async () => {
			try {
				const { status } = await Location.requestForegroundPermissionsAsync();
				let location;

				if (status !== 'granted') {
					console.warn('[useHospitals] Location permission denied, using fallback');
					location = { ...DEFAULT_APP_COORDINATES };
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
					setResolvedLocation(location);
				}
			} catch (err) {
				console.error("[useHospitals] Location error (falling back):", err);
				// 🔴 REVERT POINT: Graceful Fallback
				// PREVIOUS: if (isMounted) setError(err);
				// NEW: Fallback to default location so app isn't broken
				const fallbackLocation = { ...DEFAULT_APP_COORDINATES };
				if (isMounted) {
					setResolvedLocation(fallbackLocation);
				}
			}
		};

		getInitialLocation();
		return () => { isMounted = false; };
	}, [externalLocation]);

	// Refetch only on significant location change, regardless of whether the
	// location came from the emergency map or direct device lookup.
	useEffect(() => {
		const nextLocation = normalizeLocation(userLocation);
		if (!nextLocation) {
			return;
		}

		const significantChange = lastLocationRef.current ? (
			Math.abs(lastLocationRef.current.latitude - nextLocation.latitude) > 0.005 ||
			Math.abs(lastLocationRef.current.longitude - nextLocation.longitude) > 0.005
		) : true;

		if (significantChange) {
			lastLocationRef.current = nextLocation;
			performFetch(nextLocation);
		}
	}, [userLocation, performFetch]);

	const manualRefetch = useCallback(() => {
		performFetch(userLocation || DEFAULT_APP_COORDINATES);
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

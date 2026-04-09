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
const HOSPITAL_CACHE_TTL_MS = 2 * 60 * 1000;
const LOCATION_BUCKET_PRECISION = 3;

let globalHospitalCache = {
	hospitals: [],
	allHospitals: [],
	categories: {},
	timestamp: 0,
	lastKey: null,
	keyedSnapshots: {},
};

const globalFetchRegistry = new Map();
const globalBootstrapRegistry = new Map();

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

const buildLocationBucketKey = (location) => {
	const normalizedLocation = normalizeLocation(location);
	if (!normalizedLocation) return "fallback";
	return [
		normalizedLocation.latitude.toFixed(LOCATION_BUCKET_PRECISION),
		normalizedLocation.longitude.toFixed(LOCATION_BUCKET_PRECISION),
	].join(":");
};

const hasFreshSnapshot = (snapshot) => {
	if (!snapshot?.timestamp) return false;
	return Date.now() - snapshot.timestamp < HOSPITAL_CACHE_TTL_MS;
};

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
	const demoBootstrapEnabled = options?.demoBootstrapEnabled === true;
	const skipInternalLocationLookup = options?.skipInternalLocationLookup === true;
	const userId = options?.userId ?? null;
	const [hospitals, setHospitals] = useState(globalHospitalCache.hospitals);
	const [allHospitals, setAllHospitals] = useState(globalHospitalCache.allHospitals);
	const [categories, setCategories] = useState(globalHospitalCache.categories);
	const [isLoading, setIsLoading] = useState(globalHospitalCache.hospitals.length === 0);
	const [error, setError] = useState(null);
	const [resolvedLocation, setResolvedLocation] = useState(externalLocation);

	const lastLocationRef = useRef(null);
	const lastLocationKeyRef = useRef(globalHospitalCache.lastKey);
	const requestSequenceRef = useRef(0);
	const hasFetchedRef = useRef(globalHospitalCache.hospitals.length > 0);
	const userLocation = externalLocation || resolvedLocation;

	// Core fetching logic - pure functional approach
	const performFetch = useCallback(async (location) => {
		const normalizedLocation = normalizeLocation(location);
		if (!normalizedLocation) return;

		const locationKey = buildLocationBucketKey(normalizedLocation);
		const activeRequestId = ++requestSequenceRef.current;
		const cachedSnapshot = globalHospitalCache.keyedSnapshots?.[locationKey] ?? null;

		try {
			if (cachedSnapshot?.hospitals?.length) {
				setAllHospitals(cachedSnapshot.allHospitals || []);
				setHospitals(cachedSnapshot.hospitals || []);
				setCategories(cachedSnapshot.categories || {});
				hasFetchedRef.current = true;
				setIsLoading(false);
			} else if (!hasFetchedRef.current) {
				setIsLoading(true);
			}
			setError(null);

			if (demoModeEnabled && demoBootstrapEnabled) {
				const bootstrapKey = `${locationKey}:${userId || "guest"}`;
				let bootstrapPromise = globalBootstrapRegistry.get(bootstrapKey);
				if (!bootstrapPromise) {
					bootstrapPromise = (async () => {
						try {
							const provisioningUserId =
								await demoEcosystemService.getProvisioningUserId(userId);
							await demoEcosystemService.ensureDemoEcosystemForLocation({
								userId: provisioningUserId,
								latitude: normalizedLocation.latitude,
								longitude: normalizedLocation.longitude,
								radiusKm: 50,
							});
						} catch (bootstrapError) {
							console.warn("[useHospitals] Demo bootstrap sync skipped", bootstrapError);
						}
					})();
					globalBootstrapRegistry.set(bootstrapKey, bootstrapPromise);
					bootstrapPromise.finally(() => {
						if (globalBootstrapRegistry.get(bootstrapKey) === bootstrapPromise) {
							globalBootstrapRegistry.delete(bootstrapKey);
						}
					});
				}
				await bootstrapPromise;
			}

			let fetchPromise = globalFetchRegistry.get(locationKey);
			if (!fetchPromise) {
				fetchPromise = hospitalsService.discoverNearby(
					normalizedLocation.latitude,
					normalizedLocation.longitude,
					50000 // 50km
				);
				globalFetchRegistry.set(locationKey, fetchPromise);
				fetchPromise.finally(() => {
					if (globalFetchRegistry.get(locationKey) === fetchPromise) {
						globalFetchRegistry.delete(locationKey);
					}
				});
			}

			const data = await fetchPromise;
			if (activeRequestId !== requestSequenceRef.current) {
				return;
			}

			if (data.length === 0) {
				console.warn('[useHospitals] No hospitals found in 50km radius');
			}

			const categorized = categorizeHospitals(data);
			const display = getDisplayHospitals(data, normalizedLocation);
			const hospitalsWithWaitTimes = display.map(hospital => ({
				...hospital,
				dynamicWaitTime: hospitalsService.calculateDynamicWaitTime(hospital, normalizedLocation)
			}));

			setAllHospitals(data);
			setHospitals(hospitalsWithWaitTimes);
			setCategories(categorized);
			hasFetchedRef.current = true;

			const nextSnapshot = {
				hospitals: hospitalsWithWaitTimes,
				allHospitals: data,
				categories: categorized,
				timestamp: Date.now(),
			};
			globalHospitalCache = {
				...globalHospitalCache,
				hospitals: hospitalsWithWaitTimes,
				allHospitals: data,
				categories: categorized,
				timestamp: nextSnapshot.timestamp,
				lastKey: locationKey,
				keyedSnapshots: {
					...globalHospitalCache.keyedSnapshots,
					[locationKey]: nextSnapshot,
				},
			};
		} catch (err) {
			if (activeRequestId !== requestSequenceRef.current) {
				return;
			}
			console.error("[useHospitals] Fetch error:", err);
			setError(err);
		} finally {
			if (activeRequestId === requestSequenceRef.current) {
				setIsLoading(false);
			}
		}
	}, [demoBootstrapEnabled, demoModeEnabled, userId]);

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

		if (skipInternalLocationLookup) {
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
	}, [externalLocation, skipInternalLocationLookup]);

	// Refetch only on significant location change, regardless of whether the
	// location came from the emergency map or direct device lookup.
	useEffect(() => {
		const nextLocation = normalizeLocation(userLocation);
		if (!nextLocation) {
			return;
		}

		const locationKey = buildLocationBucketKey(nextLocation);
		const cachedSnapshot = globalHospitalCache.keyedSnapshots?.[locationKey] ?? null;
		if (cachedSnapshot?.hospitals?.length) {
			setAllHospitals(cachedSnapshot.allHospitals || []);
			setHospitals(cachedSnapshot.hospitals || []);
			setCategories(cachedSnapshot.categories || {});
			hasFetchedRef.current = true;
			setIsLoading(false);
		}

		const significantChange = lastLocationRef.current ? (
			buildLocationBucketKey(lastLocationRef.current) !== locationKey
		) : true;
		const shouldRefreshCache = !cachedSnapshot || !hasFreshSnapshot(cachedSnapshot);

		if (significantChange || shouldRefreshCache) {
			lastLocationRef.current = nextLocation;
			lastLocationKeyRef.current = locationKey;
			performFetch(nextLocation);
		}
	}, [userLocation, performFetch]);

	const manualRefetch = useCallback(() => {
		const activeLocation = userLocation || (skipInternalLocationLookup ? null : DEFAULT_APP_COORDINATES);
		if (!activeLocation) {
			return;
		}
		const locationKey = buildLocationBucketKey(activeLocation);
		if (locationKey && globalHospitalCache.keyedSnapshots?.[locationKey]) {
			delete globalHospitalCache.keyedSnapshots[locationKey];
		}
		globalFetchRegistry.delete(locationKey);
		performFetch(activeLocation);
	}, [performFetch, skipInternalLocationLookup, userLocation]);

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

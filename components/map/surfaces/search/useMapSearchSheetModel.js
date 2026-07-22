import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useGlobalLocation } from "../../../../contexts/GlobalLocationContext";
import { useSearch } from "../../../../contexts/SearchContext";
import { useLocationStore } from "../../../../stores/locationStore";
import googleLocationService from "../../../../services/googleLocationService";
import { hospitalsService } from "../../../../services/hospitalsService";
import { areLocationsNearby } from "../../../../utils/mapUtils";
import {
	buildHospitalMeta,
	buildHospitalSubtitle,
	buildLocalPopularSearches,
	buildTrendingSubtitle,
	humanizeQueryLabel,
	mapSuggestionToLocation,
	normalizeText,
	scoreHospitalMatch,
} from "./mapSearchSheet.helpers";

// Query type detection for smart result ordering
const ADDRESS_INDICATORS = [
	/\d+/, // Contains numbers (street address)
	/\b(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|ct|court|cir|circle|way|pl|place|trl|trail|hwy|highway)\b/i, // Street types
	/\b\d{5}\b/, // Zip code
	/\b(apt|suite|unit|#)\b/i, // Apartment/unit
];

const CARE_INDICATORS = [
	/\b(hospital|clinic|urgent|emergency|er|care|medical|health|doctor|dr\.?|pediatric|cardiac|ortho|dental|vet|veterinary)\b/i,
	/\b(urgent care|emergency room|walk-in|primary care|specialist)\b/i,
];

function detectQueryIntent(query) {
	if (!query || query.length < 2) return "neutral";
	const lower = query.toLowerCase();

	const addressScore = ADDRESS_INDICATORS.filter((r) => r.test(lower)).length;
	const careScore = CARE_INDICATORS.filter((r) => r.test(lower)).length;

	if (addressScore > careScore) return "location";
	if (careScore > addressScore) return "hospital";
	return "neutral";
}

export function useMapSearchSheetModel({
	visible,
	hospitals = [],
	selectedHospitalId = null,
	currentLocation = null,
	onClose,
	onOpenHospital,
	onBrowseHospitals,
	onUseCurrentLocation,
	onSelectLocation,
	onOpenLocationIntent,
}) {
	// Unified search model - no mode switching (mode chips removed per p3-1)
	const { isDarkMode } = useTheme();
	const {
		query,
		setSearchQuery,
		recentQueries = [],
		trendingSearches = [],
		trendingLoading = false,
		commitQuery,
	} = useSearch();
	const [locationSuggestions, setLocationSuggestions] = useState([]);
	const [isSearchingLocations, setIsSearchingLocations] = useState(false);
	const [isResolvingLocation, setIsResolvingLocation] = useState(null);
	const [locationError, setLocationError] = useState(null);
	const [remoteHospitalResults, setRemoteHospitalResults] = useState([]);
	const [isSearchingHospitals, setIsSearchingHospitals] = useState(false);
	const [hospitalSearchError, setHospitalSearchError] = useState(null);
	const [showNearbyHospitals, setShowNearbyHospitals] = useState(false);
	const [isDismissing, setIsDismissing] = useState(false);
	const [showClearConfirm, setShowClearConfirm] = useState(false);
	const requestIdRef = useRef(0);
	const hospitalRequestIdRef = useRef(0);
	const sessionTokenRef = useRef(null);

	// Get saved locations from store
	const savedLocations = useLocationStore((state) => state.savedLocations || []);
	const { clearHistory } = useSearch();
	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	// Glass-style surfaces for better legibility (matching payment sheet)
	const groupedSurface = isDarkMode
		? "rgba(30, 41, 59, 0.72)"  // Dark: higher opacity for readability
		: "rgba(255, 255, 255, 0.72)"; // Light: glass effect
	const cardSurface = isDarkMode
		? "rgba(30, 41, 59, 0.84)"
		: "rgba(255, 255, 255, 0.94)";
	const activeChipSurface = isDarkMode
		? "rgba(51, 65, 85, 0.90)"
		: "rgba(255, 255, 255, 0.98)";
	const rowDividerColor = isDarkMode
		? "rgba(255, 255, 255, 0.10)"
		: "rgba(15, 23, 42, 0.08)";
	const hasQuery = typeof query === "string" && query.trim().length > 0;
	const trimmedQuery = String(query || "").trim();
	const requiresLocationSelection = Boolean(currentLocation?.requiresLocationSelection);
	const manualEntryActionLabel =
		currentLocation?.manualEntryActionLabel || "Enter address manually";
	const searchPlaceholder = "Search hospitals, addresses, or specialties";
	const locationPromptTitle = requiresLocationSelection
		? "Set pickup area"
		: currentLocation?.primaryText || "Current location";
	const locationPromptBody =
		currentLocation?.secondaryText ||
		"Search for a street, area, city, or landmark near the pickup point.";
	const currentLocationBadgeLabel = requiresLocationSelection
		? "Required"
		: currentLocation?.source === "manual"
			? "Manual"
			: "Live";
	const nearbyHospitals = Array.isArray(hospitals) ? hospitals.filter(Boolean).slice(0, 4) : [];
	const locationBias = currentLocation?.location || currentLocation || null;
	const hospitalSearchOrigin = locationBias?.location || locationBias;
	const hospitalSearchLatitude = Number(hospitalSearchOrigin?.latitude);
	const hospitalSearchLongitude = Number(hospitalSearchOrigin?.longitude);
	const hospitalSearchCountryCode =
		hospitalSearchOrigin?.countryCode || currentLocation?.countryCode || null;

	// Get device location to compare with current selected location
	// PULLBACK NOTE: useGlobalLocation() returns userLocation directly, not wrapped in a location property.
	// Previously incorrectly destructured as { location: deviceLocation } which returned undefined.
	// Fixed to { userLocation: deviceLocation } to access the raw location object with latitude/longitude.
	const { userLocation: deviceLocation } = useGlobalLocation();

	// Determine if current location matches device location (within 150m threshold)
	const isUsingDeviceLocation = useMemo(() => {
		const currentCoords = currentLocation?.location || currentLocation;

		if (!currentCoords || !deviceLocation) return false;

		// Use the utility with 150m threshold (generous for GPS variance)
		return areLocationsNearby(currentCoords, deviceLocation, 150);
	}, [currentLocation, deviceLocation]);
	const localPopularSearches = useMemo(
		() => buildLocalPopularSearches(hospitals, 5),
		[hospitals],
	);

	useEffect(() => {
		if (!visible) {
			setIsDismissing(false);
			setSearchQuery("");
			setShowNearbyHospitals(false);
			setLocationSuggestions([]);
			setLocationError(null);
			setRemoteHospitalResults([]);
			setHospitalSearchError(null);
			setIsSearchingLocations(false);
			setIsSearchingHospitals(false);
			setIsResolvingLocation(null);
			requestIdRef.current += 1;
			hospitalRequestIdRef.current += 1;
			sessionTokenRef.current = null;
			return;
		}

		sessionTokenRef.current = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
	}, [setSearchQuery, visible]);

	useEffect(() => {
		return () => {
			setSearchQuery("");
		};
	}, [setSearchQuery]);

	useEffect(() => {
		if (!visible) return undefined;

		if (trimmedQuery.length < 2) {
			setLocationSuggestions([]);
			setLocationError(null);
			setIsSearchingLocations(false);
			return undefined;
		}

		const requestId = requestIdRef.current + 1;
		requestIdRef.current = requestId;

		const timeout = setTimeout(async () => {
			setIsSearchingLocations(true);
			setLocationError(null);

			try {
				const nextSuggestions = await googleLocationService.suggestAddresses(trimmedQuery, locationBias);

				if (requestIdRef.current !== requestId) return;
				setLocationSuggestions(Array.isArray(nextSuggestions) ? nextSuggestions : []);
			} catch (_error) {
				if (requestIdRef.current !== requestId) return;
				setLocationSuggestions([]);
				setLocationError("We couldn't search locations right now.");
			} finally {
				if (requestIdRef.current === requestId) {
					setIsSearchingLocations(false);
				}
			}
		}, 240);

		return () => clearTimeout(timeout);
	}, [locationBias, trimmedQuery, visible]);

	useEffect(() => {
		if (!visible) return undefined;

		const canSearchHospitals =
			trimmedQuery.length >= 3 &&
			Number.isFinite(hospitalSearchLatitude) &&
			Number.isFinite(hospitalSearchLongitude) &&
			detectQueryIntent(trimmedQuery) !== "location";

		if (!canSearchHospitals) {
			hospitalRequestIdRef.current += 1;
			setRemoteHospitalResults([]);
			setHospitalSearchError(null);
			setIsSearchingHospitals(false);
			return undefined;
		}

		const requestId = hospitalRequestIdRef.current + 1;
		hospitalRequestIdRef.current = requestId;
		setRemoteHospitalResults([]);

		const timeout = setTimeout(async () => {
			setIsSearchingHospitals(true);
			setHospitalSearchError(null);

			try {
				const results = await hospitalsService.searchNearbyProvidersByText(
					hospitalSearchLatitude,
					hospitalSearchLongitude,
					trimmedQuery,
					"hospital",
					50000,
					{
						limit: 25,
						includeGooglePlaces: true,
						includeMapboxPlaces: true,
						countryCode: hospitalSearchCountryCode,
					},
				);

				if (hospitalRequestIdRef.current !== requestId) return;
				setRemoteHospitalResults(Array.isArray(results) ? results : []);
			} catch (_error) {
				if (hospitalRequestIdRef.current !== requestId) return;
				setRemoteHospitalResults([]);
				setHospitalSearchError("We couldn't search hospital directories right now.");
			} finally {
				if (hospitalRequestIdRef.current === requestId) {
					setIsSearchingHospitals(false);
				}
			}
		}, 420);

		return () => clearTimeout(timeout);
	}, [
		hospitalSearchCountryCode,
		hospitalSearchLatitude,
		hospitalSearchLongitude,
		trimmedQuery,
		visible,
	]);

	const visibleTrending = useMemo(() => {
		const merged = [];
		const seen = new Set();

		const addItems = (items) => {
			for (const item of Array.isArray(items) ? items : []) {
				const queryLabel = humanizeQueryLabel(item?.query);
				const key = normalizeText(queryLabel);
				if (!queryLabel || seen.has(key)) continue;
				seen.add(key);
				merged.push({
					...item,
					query: queryLabel,
				});
				if (merged.length >= 5) break;
			}
		};

		addItems(trendingSearches);
		if (merged.length < 5) {
			addItems(localPopularSearches);
		}

		return merged.slice(0, 5);
	}, [localPopularSearches, trendingSearches]);

	const orderedQuerySections = useMemo(() => {
		if (!hasQuery) return [];
		
		// Smart ordering based on query intent
		const intent = detectQueryIntent(trimmedQuery);
		
		if (intent === "location") {
			// Address-like query: show areas first
			return ["places", "hospitals"];
		}
		if (intent === "hospital") {
			// Care-related query: show hospitals first
			return ["hospitals", "places"];
		}
		// Neutral: hospitals first (default)
		return ["hospitals", "places"];
	}, [hasQuery, trimmedQuery]);

	const hospitalResults = useMemo(() => {
		if (!hasQuery) return [];

		const candidates = [];
		const seen = new Set();
		for (const hospital of [
			...(Array.isArray(hospitals) ? hospitals : []),
			...(Array.isArray(remoteHospitalResults) ? remoteHospitalResults : []),
		]) {
			if (!hospital) continue;
			const key =
				hospital?.placeId ||
				hospital?.place_id ||
				hospital?.id ||
				`${normalizeText(hospital?.name)}:${hospital?.latitude}:${hospital?.longitude}`;
			if (seen.has(key)) continue;
			seen.add(key);
			candidates.push(hospital);
		}

		return candidates
			.filter(Boolean)
			.map((hospital) => ({
				hospital,
				score: scoreHospitalMatch(query, hospital),
				key: hospital?.id || hospital?.name || `${hospital?.latitude}-${hospital?.longitude}`,
			}))
			.filter((entry) => entry.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, 5) // Cap at 5 to keep areas visible
			.map((s) => ({ hospital: s.hospital, score: s.score }));
	}, [hasQuery, hospitals, query, remoteHospitalResults]);

	const placeResults = useMemo(
		() =>
			(Array.isArray(locationSuggestions) ? locationSuggestions : []).map((item, index) => ({
				...item,
				key: item?.placeId || item?.primaryText || `place-${index}`,
			})),
		[locationSuggestions],
	);

	const handleDismiss = useCallback(() => {
		if (isDismissing) return;
		setIsDismissing(true);
		onClose?.();
	}, [isDismissing, onClose]);

	const handleBrowseNearby = useCallback(() => {
		setShowNearbyHospitals(true);
	}, []);

	const handleClearHistory = useCallback(() => {
		setShowClearConfirm(true);
	}, []);

	const handleConfirmClear = useCallback(() => {
		clearHistory();
		setShowClearConfirm(false);
	}, [clearHistory]);

	const handleCancelClear = useCallback(() => {
		setShowClearConfirm(false);
	}, []);

	const handleOpenHospital = useCallback(
		(hospital) => {
			if (!hospital) return;
			commitQuery(query || hospital?.name || "");
			handleDismiss();
			setTimeout(() => {
				onOpenHospital?.(hospital);
			}, 80);
		},
		[commitQuery, handleDismiss, onOpenHospital, query],
	);

	const handleOpenHospitalList = useCallback(() => {
		handleDismiss();
		setTimeout(() => {
			onBrowseHospitals?.();
		}, 80);
	}, [handleDismiss, onBrowseHospitals]);

	const handleUseCurrent = useCallback(() => {
		onUseCurrentLocation?.();
		handleDismiss();
	}, [handleDismiss, onUseCurrentLocation]);

	const handleChangeLocation = useCallback(() => {
		handleDismiss();
		setTimeout(() => {
			onOpenLocationIntent?.({ query: trimmedQuery });
		}, 80);
	}, [handleDismiss, onOpenLocationIntent, trimmedQuery]);

	const handleSelectSavedLocation = useCallback(
		(location) => {
			if (!location) return;
			onSelectLocation?.({
				primaryText: location.label || "Saved pickup",
				secondaryText: location.address || "",
				formattedAddress: location.address || "",
				location: {
					latitude: location.latitude,
					longitude: location.longitude,
				},
				countryCode: location.countryCode || null,
				source: "saved",
			});
			handleDismiss();
		},
		[handleDismiss, onSelectLocation],
	);

	const handleUseSuggestion = useCallback(
		async (suggestion) => {
			if (!suggestion?.placeId) return;
			setLocationError(null);
			setIsResolvingLocation(suggestion.placeId);

			try {
				const readyMapped = mapSuggestionToLocation(suggestion);
				// Mapbox suggestions already include location data
				const mapped = readyMapped || mapSuggestionToLocation(suggestion);

				if (!mapped.location) {
					throw new Error("Location not found");
				}

				commitQuery(query || mapped.primaryText || "");
				onSelectLocation?.(mapped);
				handleDismiss();
			} catch (_error) {
				setLocationError("We couldn't use that area yet.");
			} finally {
				setIsResolvingLocation(null);
			}
		},
		[commitQuery, handleDismiss, onSelectLocation, query],
	);

	return {
		activeChipSurface,
		cardSurface,
		commitQuery,
		currentLocation,
		currentLocationActionLabel: currentLocation?.useCurrentLocationActionLabel || "Use device location",
		groupedSurface,
		handleBrowseNearby,
		handleClearHistory,
		handleConfirmClear,
		handleCancelClear,
		handleDismiss,
		handleOpenHospital,
		handleOpenHospitalList,
		handleUseCurrent,
		handleChangeLocation,
		handleSelectSavedLocation,
		handleUseSuggestion,
		hasQuery,
		hospitalResults,
		isDarkMode,
		isDismissing,
		isResolvingLocation,
		isUsingDeviceLocation,
		isSearchingLocations,
		isSearchingHospitals,
		locationError,
		hospitalSearchError,
		locationPromptBody,
		locationPromptTitle,
		locationSectionTitle: "Places",
		manualEntryActionLabel,
		mutedColor,
		nearbyHospitals,
		onClearHistory: handleClearHistory,
		orderedQuerySections,
		placeResults,
		query,
		recentQueries,
		rowDividerColor,
		savedLocations,
		searchPlaceholder,
		selectedHospitalId,
		setSearchQuery,
		showClearConfirm,
		showNearbyHospitals,
		titleColor,
		trendingLoading,
		visibleTrending,
	};
}

export default useMapSearchSheetModel;

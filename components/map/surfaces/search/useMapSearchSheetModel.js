import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useSearch } from "../../../../contexts/SearchContext";
import googlePlacesService from "../../../../services/googlePlacesService";
import {
	buildHospitalMeta,
	buildHospitalSubtitle,
	buildLocalPopularSearches,
	buildTrendingSubtitle,
	humanizeQueryLabel,
	mapGeocodeResult,
	mapSuggestionToLocation,
	MAP_SEARCH_SHEET_MODES,
	normalizeText,
	scoreHospitalMatch,
} from "./mapSearchSheet.helpers";

export function useMapSearchSheetModel({
	visible,
	mode = MAP_SEARCH_SHEET_MODES.SEARCH,
	hospitals = [],
	selectedHospitalId = null,
	currentLocation = null,
	onClose,
	onOpenHospital,
	onBrowseHospitals,
	onUseCurrentLocation,
	onSelectLocation,
}) {
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
	const [activeMode, setActiveMode] = useState(mode);
	const [isDismissing, setIsDismissing] = useState(false);
	const requestIdRef = useRef(0);
	const sessionTokenRef = useRef(null);

	const isLocationMode = activeMode === MAP_SEARCH_SHEET_MODES.LOCATION;
	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const groupedSurface = isDarkMode ? "rgba(255,255,255,0.055)" : "rgba(15,23,42,0.045)";
	const cardSurface = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.94)";
	const activeChipSurface = isDarkMode ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.98)";
	const rowDividerColor = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
	const hasQuery = typeof query === "string" && query.trim().length > 0;
	const trimmedQuery = String(query || "").trim();
	const nearbyHospitals = Array.isArray(hospitals) ? hospitals.filter(Boolean).slice(0, 4) : [];
	const locationBias = currentLocation?.location || currentLocation || null;
	const localPopularSearches = useMemo(
		() => buildLocalPopularSearches(hospitals, 5),
		[hospitals],
	);

	useEffect(() => {
		if (!visible) {
			setIsDismissing(false);
			setSearchQuery("");
			setActiveMode(mode);
			setLocationSuggestions([]);
			setLocationError(null);
			setIsSearchingLocations(false);
			setIsResolvingLocation(null);
			requestIdRef.current += 1;
			sessionTokenRef.current = null;
			return;
		}

		sessionTokenRef.current = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
	}, [mode, setSearchQuery, visible]);

	useEffect(() => {
		return () => {
			setSearchQuery("");
		};
	}, [setSearchQuery]);

	useEffect(() => {
		if (!visible) return;
		setActiveMode(mode);
	}, [mode, visible]);

	useEffect(() => {
		if (!visible) return undefined;

		if (!isLocationMode || trimmedQuery.length < 2) {
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
				const nextSuggestions = await googlePlacesService.searchAddressSuggestions(trimmedQuery, {
					location: locationBias,
					sessionToken: sessionTokenRef.current,
				});

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
	}, [isLocationMode, locationBias, trimmedQuery, visible]);

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

	const hospitalResults = useMemo(() => {
		if (!hasQuery) return [];

		return (Array.isArray(hospitals) ? hospitals : [])
			.filter(Boolean)
			.map((hospital) => ({
				hospital,
				score: scoreHospitalMatch(query, hospital),
				key: hospital?.id || hospital?.name || `${hospital?.latitude}-${hospital?.longitude}`,
			}))
			.filter((entry) => entry.score > 0)
			.sort((left, right) => right.score - left.score)
			.slice(0, 10);
	}, [hasQuery, hospitals, query]);

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

	const handleModeChange = useCallback(
		(nextMode) => {
			if (isDismissing) return;
			setActiveMode(nextMode);
		},
		[isDismissing],
	);

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

	const handleUseSuggestion = useCallback(
		async (suggestion) => {
			if (!suggestion?.placeId) return;
			setLocationError(null);
			setIsResolvingLocation(suggestion.placeId);

			try {
				const readyMapped = mapSuggestionToLocation(suggestion);
				const mapped = readyMapped
					? readyMapped
					: mapGeocodeResult(
						await googlePlacesService.getPlaceDetails(suggestion.placeId, {
							sessionToken: sessionTokenRef.current,
						}),
					);

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
		activeMode,
		activeChipSurface,
		cardSurface,
		commitQuery,
		currentLocation,
		groupedSurface,
		handleDismiss,
		handleModeChange,
		handleOpenHospital,
		handleOpenHospitalList,
		handleUseCurrent,
		handleUseSuggestion,
		hasQuery,
		hospitalResults,
		isDarkMode,
		isDismissing,
		isResolvingLocation,
		isSearchingLocations,
		locationError,
		locationSectionTitle: isLocationMode ? "Areas" : "Places",
		mutedColor,
		nearbyHospitals,
		orderedQuerySections: isLocationMode ? ["places", "hospitals"] : ["hospitals", "places"],
		placeResults,
		query,
		recentQueries,
		rowDividerColor,
		selectedHospitalId,
		setSearchQuery,
		titleColor,
		trendingLoading,
		visibleTrending,
	};
}

export default useMapSearchSheetModel;

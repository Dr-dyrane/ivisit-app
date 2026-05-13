import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearch } from "../../../../contexts/SearchContext";
import { useLocationSearchQuery } from "../../../../hooks/search/useLocationSearchQuery";
import useDebounce from "../../../../hooks/ui/useDebounce";

const SEARCH_ERROR_COPY = "We couldn't search locations right now.";
const DEBOUNCE_MS = 240;

export default function useAddressSearchController({
	isActive = false,
	locationBias = null,
	onOpenSearch,
} = {}) {
	const { recentQueries = [], commitQuery } = useSearch();
	const [searchQuery, setSearchQueryState] = useState("");
	const [selectionError, setSelectionError] = useState(null);
	const locationBiasLatitude = Number.isFinite(Number(locationBias?.latitude))
		? Number(locationBias.latitude)
		: null;
	const locationBiasLongitude = Number.isFinite(Number(locationBias?.longitude))
		? Number(locationBias.longitude)
		: null;
	const stableLocationBias = useMemo(
		() =>
			locationBiasLatitude !== null && locationBiasLongitude !== null
				? { latitude: locationBiasLatitude, longitude: locationBiasLongitude }
				: null,
		[locationBiasLatitude, locationBiasLongitude],
	);
	const debouncedSearchQuery = useDebounce(searchQuery, DEBOUNCE_MS);
	const trimmedQuery = debouncedSearchQuery.trim();
	const rawTrimmedQuery = searchQuery.trim();
	const shouldSearch = isActive && trimmedQuery.length >= 2;
	const {
		data: queriedResults = [],
		isFetching: isFetchingLocations,
		isError: hasSearchQueryError,
	} = useLocationSearchQuery(trimmedQuery, stableLocationBias, {
		enabled: shouldSearch,
	});
	const isDebouncePending =
		isActive &&
		rawTrimmedQuery.length >= 2 &&
		rawTrimmedQuery !== trimmedQuery;
	const searchResults = shouldSearch && Array.isArray(queriedResults) ? queriedResults : [];
	const isSearchingLocations = shouldSearch && (isFetchingLocations || isDebouncePending);
	const locationSearchError = hasSearchQueryError ? SEARCH_ERROR_COPY : selectionError;

	useEffect(() => {
		if (!isActive || rawTrimmedQuery.length < 2) {
			setSelectionError(null);
		}
	}, [isActive, rawTrimmedQuery]);

	const setSearchQuery = useCallback(
		(value, options = {}) => {
			setSearchQueryState(value);
			setSelectionError(null);
			if (options.open !== false) {
				onOpenSearch?.();
			}
		},
		[onOpenSearch],
	);

	const clearSearch = useCallback(() => {
		setSearchQueryState("");
		setSelectionError(null);
	}, []);

	const commitSearchQuery = useCallback(
		(fallbackLabel) => {
			commitQuery?.(searchQuery || fallbackLabel);
		},
		[commitQuery, searchQuery],
	);

	return {
		searchQuery,
		setSearchQuery,
		clearSearch,
		searchResults,
		isSearchingLocations,
		locationSearchError,
		setLocationSearchError: setSelectionError,
		recentSearchQueries: recentQueries,
		commitSearchQuery,
	};
}

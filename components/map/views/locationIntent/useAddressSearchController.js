import { useCallback, useEffect, useRef, useState } from "react";
import { useSearch } from "../../../../contexts/SearchContext";
import mapboxService from "../../../../services/mapboxService";

const SEARCH_ERROR_COPY = "We couldn't search locations right now.";
const DEBOUNCE_MS = 240;

export default function useAddressSearchController({
	isActive = false,
	locationBias = null,
	onOpenSearch,
} = {}) {
	const { recentQueries = [], commitQuery } = useSearch();
	const [searchQuery, setSearchQueryState] = useState("");
	const [searchResults, setSearchResults] = useState([]);
	const [isSearchingLocations, setIsSearchingLocations] = useState(false);
	const [selectionError, setSelectionError] = useState(null);
	const requestIdRef = useRef(0);

	useEffect(() => {
		const trimmed = searchQuery.trim();
		if (!isActive || trimmed.length < 2) {
			setSearchResults([]);
			setIsSearchingLocations(false);
			setSelectionError(null);
			return;
		}

		const requestId = ++requestIdRef.current;

		const timeout = setTimeout(async () => {
			setIsSearchingLocations(true);
			setSelectionError(null);
			try {
				const results = await mapboxService.suggestAddresses(trimmed, locationBias);
				if (requestIdRef.current !== requestId) return;
				setSearchResults(Array.isArray(results) ? results : []);
			} catch (_err) {
				if (requestIdRef.current !== requestId) return;
				setSearchResults([]);
				setSelectionError(SEARCH_ERROR_COPY);
			} finally {
				if (requestIdRef.current === requestId) {
					setIsSearchingLocations(false);
				}
			}
		}, DEBOUNCE_MS);

		return () => clearTimeout(timeout);
	}, [isActive, locationBias, searchQuery]);

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
		setSearchResults([]);
		setSelectionError(null);
		requestIdRef.current += 1;
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
		locationSearchError: selectionError,
		setLocationSearchError: setSelectionError,
		recentSearchQueries: recentQueries,
		commitSearchQuery,
	};
}

import { useCallback, useMemo, useState } from "react";
import { useSearch } from "../../../../contexts/SearchContext";
import { useLocationSearchQuery } from "../../../../hooks/search/useLocationSearchQuery";
import useDebounce from "../../../../hooks/ui/useDebounce";
import { DEBOUNCE_MS } from "../../../../services/addressAssistService";

const SEARCH_ERROR_COPY = "We couldn't search locations right now.";

export default function useAddressSearchController({
	isActive = false,
	locationBias = null,
	onOpenSearch,
} = {}) {
	const { recentQueries = [], commitQuery } = useSearch();
	const [searchQuery, setSearchQueryState] = useState("");
	const [selectionError, setSelectionError] = useState(null);
	// PULLBACK NOTE: debounce gap fix — OLD: raw searchQuery passed directly → new query key on every keystroke
	// NEW: debouncedQuery gates the query key, searchQuery stays raw for the visible input value.
	const debouncedQuery = useDebounce(searchQuery, DEBOUNCE_MS);
	const trimmedQuery = debouncedQuery.trim();
	const shouldSearch = isActive && trimmedQuery.length >= 2;
	// Rollback note: search is server/cache state, not a render effect. Keep
	// provider requests on the shared TanStack hook so LocationSheet does not
	// recreate the old SearchSheet/manual `useEffect` race pattern.
	const suggestionsQuery = useLocationSearchQuery(debouncedQuery, locationBias, {
		enabled: shouldSearch,
	});

	const searchResults = useMemo(
		() => (Array.isArray(suggestionsQuery.data) ? suggestionsQuery.data : []),
		[suggestionsQuery.data],
	);

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
		isSearchingLocations: shouldSearch && suggestionsQuery.isFetching,
		locationSearchError:
			selectionError || (suggestionsQuery.isError ? SEARCH_ERROR_COPY : null),
		setLocationSearchError: setSelectionError,
		recentSearchQueries: recentQueries,
		commitSearchQuery,
	};
}

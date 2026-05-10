import { useCallback, useMemo, useState } from "react";
import { useSearch } from "../../../../contexts/SearchContext";
import { useLocationSearchQuery } from "../../../../hooks/search/useLocationSearchQuery";

const SEARCH_ERROR_COPY = "We couldn't search locations right now.";

export default function useAddressSearchController({
	isActive = false,
	locationBias = null,
	onOpenSearch,
} = {}) {
	const { recentQueries = [], commitQuery } = useSearch();
	const [searchQuery, setSearchQueryState] = useState("");
	const [selectionError, setSelectionError] = useState(null);
	const trimmedQuery = searchQuery.trim();
	const shouldSearch = isActive && trimmedQuery.length >= 2;
	// Rollback note: search is server/cache state, not a render effect. Keep
	// provider requests on the shared TanStack hook so LocationSheet does not
	// recreate the old SearchSheet/manual `useEffect` race pattern.
	const suggestionsQuery = useLocationSearchQuery(searchQuery, locationBias, {
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

/**
 * Search Atoms
 *
 * Atomic state for map search functionality.
 * Replaces useState in useMapSearchSheetModel.
 */

import { atom } from "jotai";

// =============================================================================
// SEARCH MODE & QUERY
// =============================================================================

export type SearchMode = "SEARCH" | "LOCATION";

/**
 * Current search mode
 */
export const searchModeAtom = atom<SearchMode>("SEARCH");

/**
 * Current search query string
 */
export const searchQueryAtom = atom("");

/**
 * Search debounced query (for API calls)
 */
export const searchDebouncedQueryAtom = atom("");

// =============================================================================
// LOCATION SUGGESTIONS
// =============================================================================

export interface LocationSuggestion {
  id: string;
  description: string;
  placeId?: string;
  coordinate?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Location suggestions from Google Places
 */
export const locationSuggestionsAtom = atom<LocationSuggestion[]>([]);

/**
 * Whether location suggestions are being fetched
 */
export const isSearchingLocationsAtom = atom(false);

/**
 * Whether location is being resolved (geocoding)
 */
export const isResolvingLocationAtom = atom(false);

/**
 * Location search error
 */
export const locationSearchErrorAtom = atom<string | null>(null);

/**
 * Google Places session token
 */
export const searchSessionTokenAtom = atom<string | null>(null);

// =============================================================================
// UI STATE
// =============================================================================

/**
 * Whether search sheet is being dismissed
 */
export const isDismissingSearchAtom = atom(false);

/**
 * Whether search has focus
 */
export const searchHasFocusAtom = atom(false);

// =============================================================================
// DERIVED ATOMS
// =============================================================================

/**
 * Whether there are location suggestions to display
 */
export const hasLocationSuggestionsAtom = atom((get) => {
  const suggestions = get(locationSuggestionsAtom);
  return suggestions.length > 0;
});

/**
 * Whether search is active (has query or suggestions)
 */
export const isSearchActiveAtom = atom((get) => {
  const query = get(searchQueryAtom);
  const suggestions = get(locationSuggestionsAtom);
  return query.length > 0 || suggestions.length > 0;
});

/**
 * Whether to show location suggestions
 */
export const showLocationSuggestionsAtom = atom((get) => {
  const suggestions = get(locationSuggestionsAtom);
  const isSearching = get(isSearchingLocationsAtom);
  const query = get(searchQueryAtom);
  return (suggestions.length > 0 || isSearching) && query.length >= 2;
});

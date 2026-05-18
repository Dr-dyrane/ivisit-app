// hooks/search/useLocationSearchQuery.js
import { useQuery, useQueryClient } from '@tanstack/react-query';
import googleLocationService from '../../services/googleLocationService';

const STALE_TIME = 60 * 1000; // 1 minute

/**
 * TanStack Query hook for location search suggestions
 * 
 * Benefits:
 * - Automatic request deduplication across components
 * - Global caching with staleTime
 * - No manual useEffect/debounce needed
 * - Error handling built-in
 * 
 * @param {string} query - Search query
 * @param {Object} locationBias - Optional {latitude, longitude} for proximity bias
 * @param {Object} options - Optional config (enabled, etc.)
 */
export function useLocationSearchQuery(query, locationBias = null, options = {}) {
  const trimmedQuery = query?.trim() || '';
  const { enabled: enabledOption, ...restOptions } = options;
  const enabled =
    trimmedQuery.length >= 2 && (enabledOption === undefined || enabledOption !== false);

  return useQuery({
    queryKey: ['locationSuggestions', trimmedQuery, locationBias?.latitude, locationBias?.longitude],
    queryFn: () => googleLocationService.suggestAddresses(trimmedQuery, locationBias),
    enabled,
    staleTime: STALE_TIME,
    placeholderData: (previousData) => previousData,
    ...restOptions,
  });
}

/**
 * Prefetch location suggestions (for predictive search)
 * @param {Object} queryClient - TanStack Query client instance
 * @param {string} query - Search query to prefetch
 * @param {Object} locationBias - Optional location bias
 */
export function prefetchLocationSuggestions(queryClient, query, locationBias = null) {
  const trimmedQuery = query?.trim() || '';
  if (trimmedQuery.length < 2) return Promise.resolve();
  
  return queryClient.prefetchQuery({
    queryKey: ['locationSuggestions', trimmedQuery, locationBias?.latitude, locationBias?.longitude],
    queryFn: () => googleLocationService.suggestAddresses(trimmedQuery, locationBias),
    staleTime: STALE_TIME,
  });
}

/**
 * Hook to get the query client for prefetching
 */
export function useLocationSearchPrefetch() {
  const queryClient = useQueryClient();
  
  return {
    prefetch: (query, locationBias) => prefetchLocationSuggestions(queryClient, query, locationBias),
  };
}

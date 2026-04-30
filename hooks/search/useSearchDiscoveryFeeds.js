import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { discoveryService } from "../../services/discoveryService";

export const SEARCH_DISCOVERY_QUERY_KEYS = Object.freeze({
  trending: ["searchDiscovery", "trendingSearches"],
  news: ["searchDiscovery", "healthNews"],
});

// PULLBACK NOTE: Search discovery feeds are server-backed data, not provider-local effects.
// This hook moves trending searches and health news onto TanStack Query while preserving
// the SearchContext public contract used by stack search and map search surfaces.

export function useSearchDiscoveryFeeds() {
  const trendingQuery = useQuery({
    queryKey: SEARCH_DISCOVERY_QUERY_KEYS.trending,
    queryFn: () =>
      discoveryService.getTrendingSearches({
        limit: 8,
        days: 7,
      }),
    staleTime: 30 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  });

  const healthNewsQuery = useQuery({
    queryKey: SEARCH_DISCOVERY_QUERY_KEYS.news,
    queryFn: () =>
      discoveryService.getHealthNews({
        limit: 10,
      }),
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
  });

  const refreshDiscovery = useCallback(async () => {
    await Promise.all([trendingQuery.refetch(), healthNewsQuery.refetch()]);
  }, [healthNewsQuery, trendingQuery]);

  return {
    trendingSearches: Array.isArray(trendingQuery.data)
      ? trendingQuery.data
      : [],
    trendingLoading: trendingQuery.isLoading,
    healthNews: Array.isArray(healthNewsQuery.data) ? healthNewsQuery.data : [],
    healthNewsLoading: healthNewsQuery.isLoading,
    discoveryRefreshing:
      (trendingQuery.isFetching && !trendingQuery.isLoading) ||
      (healthNewsQuery.isFetching && !healthNewsQuery.isLoading),
    refreshDiscovery,
  };
}

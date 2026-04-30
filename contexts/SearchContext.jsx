"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { database, StorageKeys } from "../database";
import { useSearchDiscoveryFeeds } from "../hooks/search/useSearchDiscoveryFeeds";
import { discoveryService } from "../services/discoveryService";

const SearchContext = createContext();

export function SearchProvider({ children }) {
  const [query, setQuery] = useState("");
  const [recentQueries, setRecentQueries] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const {
    trendingSearches,
    trendingLoading,
    healthNews,
    healthNewsLoading,
    discoveryRefreshing,
    refreshDiscovery,
  } = useSearchDiscoveryFeeds();

  useEffect(() => {
    let isActive = true;
    (async () => {
      const stored = await database.read(StorageKeys.SEARCH_HISTORY, []);
      if (!isActive) return;
      setRecentQueries(Array.isArray(stored) ? stored.filter(Boolean) : []);
      setHistoryLoading(false);
    })();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (historyLoading || !Array.isArray(recentQueries)) return;
    database.write(StorageKeys.SEARCH_HISTORY, recentQueries).catch(() => {});
  }, [historyLoading, recentQueries]);

  const setSearchQuery = useCallback((next) => {
    setQuery(typeof next === "string" ? next : "");
  }, []);

  const commitQuery = useCallback((raw) => {
    const next = typeof raw === "string" ? raw.trim() : "";
    if (!next) return;

    discoveryService.trackSearchSelection({
      query: next,
      source: "search_screen",
    });

    setRecentQueries((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      const deduped = base.filter(
        (item) => String(item).toLowerCase() !== next.toLowerCase(),
      );
      return [next, ...deduped].slice(0, 12);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setRecentQueries([]);
  }, []);

  const value = useMemo(
    () => ({
      query,
      recentQueries,
      historyLoading,
      trendingSearches,
      trendingLoading,
      healthNews,
      healthNewsLoading,
      discoveryRefreshing,
      setSearchQuery,
      commitQuery,
      clearHistory,
      refreshDiscovery,
    }),
    [
      clearHistory,
      commitQuery,
      discoveryRefreshing,
      healthNews,
      healthNewsLoading,
      historyLoading,
      query,
      recentQueries,
      refreshDiscovery,
      setSearchQuery,
      trendingLoading,
      trendingSearches,
    ],
  );

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function SearchBoundary({ children }) {
  const ctx = useContext(SearchContext);
  if (ctx) return children;
  return <SearchProvider>{children}</SearchProvider>;
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within a SearchProvider");
  return ctx;
}

export default SearchContext;

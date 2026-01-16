"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { database, StorageKeys } from "../database";
import { discoveryService } from "../services/discoveryService";

const SearchContext = createContext();

export function SearchProvider({ children }) {
	const [query, setQuery] = useState("");
	const [recentQueries, setRecentQueries] = useState([]);
	const [trendingSearches, setTrendingSearches] = useState([]);
	const [trendingLoading, setTrendingLoading] = useState(false);

	// Fetch trending searches on app startup
	useEffect(() => {
		const loadTrendingSearches = async () => {
			setTrendingLoading(true);
			const trending = await discoveryService.getTrendingSearches({
				limit: 8,
				days: 7,
			});
			setTrendingSearches(trending);
			setTrendingLoading(false);
		};

		loadTrendingSearches();

		// Refresh trending searches every 30 minutes
		const interval = setInterval(loadTrendingSearches, 30 * 60 * 1000);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		let isActive = true;
		(async () => {
			const stored = await database.read(StorageKeys.SEARCH_HISTORY, []);
			if (!isActive) return;
			setRecentQueries(Array.isArray(stored) ? stored.filter(Boolean) : []);
		})();
		return () => {
			isActive = false;
		};
	}, []);

	useEffect(() => {
		if (!Array.isArray(recentQueries)) return;
		database.write(StorageKeys.SEARCH_HISTORY, recentQueries).catch(() => {});
	}, [recentQueries]);

	const setSearchQuery = useCallback((next) => {
		setQuery(typeof next === "string" ? next : "");
	}, []);

	const commitQuery = useCallback((raw) => {
		const next = typeof raw === "string" ? raw.trim() : "";
		if (!next) return;

		// Track selection
		discoveryService.trackSearchSelection({
			query: next,
			source: 'search_screen',
		});

		setRecentQueries((prev) => {
			const base = Array.isArray(prev) ? prev : [];
			const deduped = base.filter((q) => String(q).toLowerCase() !== next.toLowerCase());
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
			trendingSearches,
			trendingLoading,
			setSearchQuery,
			commitQuery,
			clearHistory,
		}),
		[clearHistory, commitQuery, query, recentQueries, trendingSearches, trendingLoading, setSearchQuery]
	);

	return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
	const ctx = useContext(SearchContext);
	if (!ctx) throw new Error("useSearch must be used within a SearchProvider");
	return ctx;
}

export default SearchContext;


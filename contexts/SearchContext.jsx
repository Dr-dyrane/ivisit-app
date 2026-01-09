"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { database, StorageKeys } from "../database";

const SearchContext = createContext();

export function SearchProvider({ children }) {
	const [query, setQuery] = useState("");
	const [recentQueries, setRecentQueries] = useState([]);

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
			setSearchQuery,
			commitQuery,
			clearHistory,
		}),
		[clearHistory, commitQuery, query, recentQueries, setSearchQuery]
	);

	return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
	const ctx = useContext(SearchContext);
	if (!ctx) throw new Error("useSearch must be used within a SearchProvider");
	return ctx;
}

export default SearchContext;


// contexts/EmergencyUIContext.jsx
/**
 * EmergencyUIContext - Manages UI state for the Emergency Screen
 * 
 * Separates concerns:
 * - Animation timing tracking (for debugging performance)
 * - Bottom sheet snap state
 * - Search state
 * - Loading states
 * - Mini profile modal visibility
 * 
 * This prevents prop drilling and makes debugging easier
 */

import { createContext, useContext, useState, useCallback, useRef, useMemo } from "react";

const EmergencyUIContext = createContext();

// Animation timing tracker for debugging
const createTimingTracker = (enabled = __DEV__) => {
	const timings = useRef({});
	
	const startTiming = useCallback((name) => {
		if (!enabled) return;
		timings.current[name] = {
			start: performance.now(),
			end: null,
			duration: null,
		};
	}, [enabled]);
	
	const endTiming = useCallback((name) => {
		if (!enabled || !timings.current[name]) return;
		const end = performance.now();
		timings.current[name].end = end;
		timings.current[name].duration = end - timings.current[name].start;
		
		// Log slow animations (> 16ms = dropped frame)
		if (timings.current[name].duration > 16) {
			console.warn(`[EmergencyUI] Slow: ${name} took ${timings.current[name].duration.toFixed(2)}ms`);
		}
	}, [enabled]);
	
	const getTimings = useCallback(() => ({ ...timings.current }), []);
	
	const clearTimings = useCallback(() => {
		timings.current = {};
	}, []);
	
	return { startTiming, endTiming, getTimings, clearTimings };
};

export function EmergencyUIProvider({ children }) {
	// Bottom sheet state
	const [snapIndex, setSnapIndex] = useState(1); // 0=collapsed, 1=half, 2=expanded
	const [isAnimating, setIsAnimating] = useState(false);
	
	// Search state
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearchFocused, setIsSearchFocused] = useState(false);
	
	// Modal states
	const [showProfileModal, setShowProfileModal] = useState(false);
	
	// Loading states
	const [isMapLoading, setIsMapLoading] = useState(true);
	const [isHospitalsLoading, setIsHospitalsLoading] = useState(false);
	
	// Scroll tracking
	const lastScrollY = useRef(0);
	
	// Animation timing tracker
	const timing = createTimingTracker(__DEV__);
	
	// Bottom sheet actions
	const handleSnapChange = useCallback((index, source = "user") => {
		timing.startTiming(`snap_${index}_${source}`);
		setSnapIndex(index);
		setIsAnimating(true);
		
		// Animation typically takes ~300ms
		setTimeout(() => {
			setIsAnimating(false);
			timing.endTiming(`snap_${index}_${source}`);
		}, 350);
	}, [timing]);
	
	// Search actions
	const updateSearch = useCallback((text) => {
		timing.startTiming("search_update");
		setSearchQuery(text);
		timing.endTiming("search_update");
	}, [timing]);
	
	const clearSearch = useCallback(() => {
		setSearchQuery("");
		setIsSearchFocused(false);
	}, []);
	
	// Profile modal actions
	const openProfileModal = useCallback(() => {
		timing.startTiming("profile_modal_open");
		setShowProfileModal(true);
	}, [timing]);
	
	const closeProfileModal = useCallback(() => {
		setShowProfileModal(false);
		timing.endTiming("profile_modal_open");
	}, [timing]);
	
	// Scroll tracking
	const updateScrollPosition = useCallback((y) => {
		lastScrollY.current = y;
	}, []);
	
	const getLastScrollY = useCallback(() => lastScrollY.current, []);
	
	// Map loading
	const setMapReady = useCallback(() => {
		timing.endTiming("map_load");
		setIsMapLoading(false);
	}, [timing]);
	
	const startMapLoading = useCallback(() => {
		timing.startTiming("map_load");
		setIsMapLoading(true);
	}, [timing]);

	const value = useMemo(() => ({
		// State
		snapIndex,
		isAnimating,
		searchQuery,
		isSearchFocused,
		showProfileModal,
		isMapLoading,
		isHospitalsLoading,
		
		// Actions
		handleSnapChange,
		updateSearch,
		clearSearch,
		setIsSearchFocused,
		openProfileModal,
		closeProfileModal,
		updateScrollPosition,
		getLastScrollY,
		setMapReady,
		startMapLoading,
		setIsHospitalsLoading,
		
		// Debug
		timing,
	}), [
		snapIndex, isAnimating, searchQuery, isSearchFocused,
		showProfileModal, isMapLoading, isHospitalsLoading,
		handleSnapChange, updateSearch, clearSearch,
		openProfileModal, closeProfileModal,
		updateScrollPosition, getLastScrollY,
		setMapReady, startMapLoading, timing,
	]);

	return (
		<EmergencyUIContext.Provider value={value}>
			{children}
		</EmergencyUIContext.Provider>
	);
}

export function useEmergencyUI() {
	const context = useContext(EmergencyUIContext);
	if (context === undefined) {
		throw new Error("useEmergencyUI must be used within EmergencyUIProvider");
	}
	return context;
}


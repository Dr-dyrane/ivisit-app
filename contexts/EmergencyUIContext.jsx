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

import { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from "react";

const EmergencyUIContext = createContext();

// Animation timing tracker for debugging
// Different thresholds for different operation types
const TIMING_THRESHOLDS = {
	instant: 50,       // Quick operations - button presses, search updates
	animation: 1000,   // Sheet/modal animations can take 300-600ms with spring
	network: 5000,     // Network calls
	userAction: 10000, // User-driven actions (modals stay open until user closes)
};

// Operations that are user-driven (open/close pairs where user controls timing)
const USER_DRIVEN_OPS = ["profile_modal", "modal_open", "modal_close"];

const useTimingTracker = (enabled = __DEV__) => {
	const timings = useRef({});

	// Determine threshold based on operation name
	const getThreshold = (name) => {
		// User-driven operations shouldn't warn
		if (USER_DRIVEN_OPS.some(op => name.includes(op))) {
			return TIMING_THRESHOLDS.userAction;
		}
		if (name.includes("snap") || name.includes("animation") || name.includes("sheet")) {
			return TIMING_THRESHOLDS.animation;
		}
		if (name.includes("fetch") || name.includes("load") || name.includes("network")) {
			return TIMING_THRESHOLDS.network;
		}
		return TIMING_THRESHOLDS.instant;
	};

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

		const threshold = getThreshold(name);
		const duration = timings.current[name].duration;

		// Only warn if exceeds threshold for this operation type
		// Skip warnings for user-driven operations entirely
		if (duration > threshold && !USER_DRIVEN_OPS.some(op => name.includes(op))) {
			console.warn(`[EmergencyUI] Slow: ${name} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
		}
	}, [enabled]);

	const getTimings = useCallback(() => ({ ...timings.current }), []);

	const clearTimings = useCallback(() => {
		timings.current = {};
	}, []);

	return useMemo(() => ({
		startTiming,
		endTiming,
		getTimings,
		clearTimings
	}), [startTiming, endTiming, getTimings, clearTimings]);
};

export function EmergencyUIProvider({ children }) {
	// Bottom sheet state
	// 🔴 REVERT POINT: Safe initial snap index
	// PREVIOUS: Fixed initial index of 1, which can be invalid in detail mode
	// NEW: Start with 1 (halfway) for better initial visibility
	// REVERT TO: const [snapIndex, setSnapIndex] = useState(0);
	const [snapIndex, setSnapIndex] = useState(1);
	const [isAnimating, setIsAnimating] = useState(false);
	const snapIndexRef = useRef(snapIndex);
	useEffect(() => {
		snapIndexRef.current = snapIndex;
	}, [snapIndex]);

	// Log initial state
	useEffect(() => {
		// console.log('[EmergencyUIContext] Initial state:', { snapIndex, isAnimating });
	}, []);

	// Log snap index changes
	useEffect(() => {
		// console.log('[EmergencyUIContext] snapIndex changed:', { 
		// 	newSnapIndex: snapIndex, 
		// 	isAnimating,
		// 	timestamp: Date.now()
		// });
	}, [snapIndex, isAnimating]);

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
	const timing = useTimingTracker(__DEV__);

	// 🔴 REVERT POINT: Proactive Index Clamping
	// PREVIOUS: Context didn't track constraints, relied on components to clamp
	// NEW: Force index 0 for focused states (detail/trip) at the source
	// REVERT TO: Remove these constraints
	const forceIndexZero = useMemo(() => {
		// We'll need to pass these from the children or find another way.
		// For now, let's keep the handleSnapChange defensive.
		return false;
	}, []);

	// Bottom sheet actions
	const handleSnapChange = useCallback((index, source = "user") => {
		if (typeof index !== "number") {
			console.warn('[EmergencyUIContext] Invalid snap index received:', index, 'source:', source);
			return;
		}

		// Ensure index is within the global safe bounds [0, 2]
		// 🔴 REVERT POINT: Defensive Clamping
		// index 0: collapsed/detail
		// index 1: half/trip
		// index 2: full/standard
		let safeIndex = Math.min(Math.max(0, index), 2);

		setSnapIndex(prevIndex => {
			if (prevIndex === safeIndex) return prevIndex;
			// console.log('[EmergencyUIContext] snapIndex updated:', { from: prevIndex, to: safeIndex, source });
			return safeIndex;
		});
		setIsAnimating(true);

		// Animation typically takes ~300ms
		const timer = setTimeout(() => {
			setIsAnimating(false);
		}, 350);
		return () => clearTimeout(timer);
	}, []);

	// Reset snap index to 0 (collapsed/detail mode safe value)
	// Call this when transitioning to modes with fewer snap points (e.g., detail mode)
	const resetSnapIndex = useCallback(() => {
		setSnapIndex(0);
	}, []);

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
		resetSnapIndex,
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
		handleSnapChange, resetSnapIndex, updateSearch, clearSearch,
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

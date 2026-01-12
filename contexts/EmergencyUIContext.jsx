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

const createTimingTracker = (enabled = __DEV__) => {
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

	return { startTiming, endTiming, getTimings, clearTimings };
};

export function EmergencyUIProvider({ children }) {
	// Bottom sheet state
	const [snapIndex, setSnapIndex] = useState(1); // 0=collapsed, 1=half, 2=expanded - start halfway for better UX
	const [isAnimating, setIsAnimating] = useState(false);
	const snapIndexRef = useRef(snapIndex);
	useEffect(() => {
		snapIndexRef.current = snapIndex;
	}, [snapIndex]);
	
	// Log initial state
	useEffect(() => {
		console.log('[EmergencyUIContext] Initial state:', { snapIndex, isAnimating });
	}, []);
	
	// Log snap index changes
	useEffect(() => {
		console.log('[EmergencyUIContext] snapIndex changed:', { 
			newSnapIndex: snapIndex, 
			isAnimating,
			timestamp: Date.now()
		});
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
	const timing = createTimingTracker(__DEV__);
	
	// Bottom sheet actions
	const handleSnapChange = useCallback((index, source = "user") => {
		console.log('[EmergencyUIContext] handleSnapChange called:', { 
			newIndex: index, 
			source, 
			currentSnapIndex: snapIndexRef.current,
			timestamp: Date.now()
		});
		
		// Only update if the index is actually different to prevent fighting states
		setSnapIndex(prevIndex => {
			console.log('[EmergencyUIContext] setSnapIndex:', { 
				prevIndex, 
				newIndex: index, 
				willUpdate: prevIndex !== index,
				source
			});
			if (prevIndex === index) return prevIndex;
			return index;
		});
		setIsAnimating(true);

		// Animation typically takes ~300ms
		setTimeout(() => {
			console.log('[EmergencyUIContext] Animation completed, setIsAnimating(false)');
			setIsAnimating(false);
		}, 350);
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

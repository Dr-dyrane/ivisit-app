"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { View } from "react-native";

// Create context
const GlobalMapContext = createContext();

/**
 * Global Map Provider
 * Manages map state across tabs to prevent multiple instances
 * Simplified approach - just tracks active tab and prevents duplicate rendering
 */
export function GlobalMapProvider({ children }) {
	const [activeTab, setActiveTab] = useState(null); // 'emergency' | 'bed'
	
	// Switch active tab (emergency/bed)
	const switchTab = useCallback((tab) => {
		console.log("[GlobalMapContext] Switching to tab:", tab);
		setActiveTab(tab);
	}, []);

	// Get map state for current tab
	const getMapForTab = useCallback((tab) => {
		console.log("[GlobalMapContext] Providing map for tab:", tab);
		
		return {
			mapInstance: null, // Let EmergencyScreen manage its own map
			isMapReady: true,   // Always ready
			mapError: null,
			isActive: activeTab === tab,
		};
	}, [activeTab]);

	// Context value
	const value = {
		// Map state
		mapInstance: null,
		isMapReady: true,
		mapError: null,
		activeTab,
		
		// Methods
		switchTab,
		getMapForTab,
		
		// Computed values
		hasMap: false,
		isMapError: false,
	};

	return (
		<GlobalMapContext.Provider value={value}>
			{children}
		</GlobalMapContext.Provider>
	);
}

/**
 * Hook to use global map context
 * Provides access to shared map state across all components
 */
export function useGlobalMap() {
	const context = useContext(GlobalMapContext);
	
	if (!context) {
		throw new Error("useGlobalMap must be used within a GlobalMapProvider");
	}
	
	return context;
}

/**
 * Hook for components that need the map for a specific tab
 * Returns map instance and state for the requested tab
 */
export function useMapForTab(tab) {
	const { getMapForTab, switchTab } = useGlobalMap();
	
	// Ensure this tab is active
	useEffect(() => {
		switchTab(tab);
	}, [tab, switchTab]);
	
	return getMapForTab(tab);
}

/**
 * Hook for EmergencyScreen to get shared map
 * Prevents multiple map instances across emergency/bed tabs
 */
export function useEmergencyMap() {
	const { getMapForTab, switchTab } = useGlobalMap();
	
	// Emergency tab uses 'emergency' as the key
	const tabKey = 'emergency';
	
	// Ensure this tab is active
	useEffect(() => {
		switchTab(tabKey);
	}, [tabKey, switchTab]);
	
	return getMapForTab(tabKey);
}

/**
 * Hook for BedScreen to get shared map
 * Uses the same map instance as emergency tab
 */
export function useBedMap() {
	const { getMapForTab, switchTab } = useGlobalMap();
	
	// Bed tab uses 'bed' as the key
	const tabKey = 'bed';
	
	// Ensure this tab is active
	useEffect(() => {
		switchTab(tabKey);
	}, [tabKey, switchTab]);
	
	return getMapForTab(tabKey);
}

export default GlobalMapContext;

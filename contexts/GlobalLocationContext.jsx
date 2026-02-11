"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import * as Location from "expo-location";

// Location configuration constants
const LOCATION_CONFIG = {
	TIMEOUT: 10000, // 10 seconds
	MAX_AGE: 30000, // 30 seconds cache
	ACCURACY: Location.Accuracy.High,
};

// Create context
const GlobalLocationContext = createContext();

/**
 * Global Location Provider
 * Loads location once at app startup and shares across all components
 * Prevents multiple location requests and improves performance
 */
export function GlobalLocationProvider({ children }) {
	const [userLocation, setUserLocation] = useState(null);
	const [locationPermission, setLocationPermission] = useState(null);
	const [isLoadingLocation, setIsLoadingLocation] = useState(true);
	const [locationError, setLocationError] = useState(null);
	const [lastUpdated, setLastUpdated] = useState(null);

	// Prevent multiple simultaneous permission requests
	const isRequestingPermission = useRef(false);
	const isInitialized = useRef(false);

	// Request location permission and get location
	const requestLocationPermission = useCallback(async () => {
		console.log("[GlobalLocationContext] Requesting location permission...");

		// Prevent multiple simultaneous requests
		if (isRequestingPermission.current) {
			console.log("[GlobalLocationContext] Permission request already in progress");
			return;
		}

		isRequestingPermission.current = true;
		setLocationError(null);

		try {
			// Check if permission is already granted
			const { status } = await Location.getForegroundPermissionsAsync();

			if (status === "granted") {
				setLocationPermission(true);
				console.log("[GlobalLocationContext] Permission already granted");

				// Get current location with timeout and error handling
				try {
					const location = await Promise.race([
						Location.getCurrentPositionAsync({
							accuracy: LOCATION_CONFIG.ACCURACY,
							maxAge: LOCATION_CONFIG.MAX_AGE,
							timeout: LOCATION_CONFIG.TIMEOUT,
						}),
						new Promise((_, reject) =>
							setTimeout(() => reject(new Error("Location timeout")), LOCATION_CONFIG.TIMEOUT)
						)
					]);

					const locationData = {
						latitude: location.coords.latitude,
						longitude: location.coords.longitude,
					};

					setUserLocation(locationData);
					setLastUpdated(Date.now());
					console.log("[GlobalLocationContext] Location obtained:", locationData);
				} catch (locationErr) {
					console.error("[GlobalLocationContext] Failed to get location (using fallback):", locationErr);
					const fallbackData = { latitude: 33.7475, longitude: -116.9730 };
					setUserLocation(fallbackData);
					setLastUpdated(Date.now());
					setLocationError(null);
				}
			} else {
				// Request permission
				console.log("[GlobalLocationContext] Requesting permission...");
				const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
				const hasPermission = newStatus === "granted";
				setLocationPermission(hasPermission);

				if (hasPermission) {
					console.log("[GlobalLocationContext] Permission granted, getting location...");
					try {
						const location = await Promise.race([
							Location.getCurrentPositionAsync({
								accuracy: LOCATION_CONFIG.ACCURACY,
								maxAge: LOCATION_CONFIG.MAX_AGE,
								timeout: LOCATION_CONFIG.TIMEOUT,
							}),
							new Promise((_, reject) =>
								setTimeout(() => reject(new Error("Location timeout")), LOCATION_CONFIG.TIMEOUT)
							)
						]);

						const locationData = {
							latitude: location.coords.latitude,
							longitude: location.coords.longitude,
						};

						setUserLocation(locationData);
						setLastUpdated(Date.now());
						console.log("[GlobalLocationContext] Location obtained after permission:", locationData);
					} catch (locationErr) {
						console.error("[GlobalLocationContext] Failed to get location after permission (using fallback):", locationErr);
						// 🔴 REVERT POINT: Context Fallback
						// NEW: Use standard coordinate if GPS fails
						const fallbackData = { latitude: 33.7475, longitude: -116.9730 };
						setUserLocation(fallbackData);
						setLastUpdated(Date.now());
						setLocationError(null); // Clear error since we have a fallback
					}
				} else {
					console.log("[GlobalLocationContext] Permission denied (using fallback)");
					const fallbackData = { latitude: 33.7475, longitude: -116.9730 };
					setUserLocation(fallbackData);
					setLastUpdated(Date.now());
					setLocationError(null);
				}
			}
		} catch (err) {
			console.error("[GlobalLocationContext] Permission request failed:", err);
			setLocationError(err.message);
		} finally {
			setIsLoadingLocation(false);
			isRequestingPermission.current = false;
		}
	}, []);

	// Initialize location on mount
	useEffect(() => {
		if (isInitialized.current) {
			console.log("[GlobalLocationContext] Already initialized, skipping...");
			return;
		}

		isInitialized.current = true;
		console.log("[GlobalLocationContext] Initializing global location...");

		// Start location loading
		requestLocationPermission();
	}, [requestLocationPermission]);

	// Refresh location (for manual refresh)
	const refreshLocation = useCallback(async () => {
		console.log("[GlobalLocationContext] Manually refreshing location...");
		setIsLoadingLocation(true);
		await requestLocationPermission();
	}, [requestLocationPermission]);

	// Check if location is fresh (within MAX_AGE)
	const isLocationFresh = useCallback(() => {
		if (!lastUpdated || !userLocation) return false;
		const age = Date.now() - lastUpdated;
		return age < LOCATION_CONFIG.MAX_AGE;
	}, [lastUpdated, userLocation]);

	// Context value
	const value = React.useMemo(() => ({
		// Location data
		userLocation,
		locationPermission,
		isLoadingLocation,
		locationError,
		lastUpdated,

		// Methods
		refreshLocation,
		isLocationFresh,
		requestLocationPermission,

		// Computed values
		hasUserLocation: !!userLocation,
		isLocationError: !!locationError,
	}), [
		userLocation,
		locationPermission,
		isLoadingLocation,
		locationError,
		lastUpdated,
		refreshLocation,
		isLocationFresh,
		requestLocationPermission
	]);

	return (
		<GlobalLocationContext.Provider value={value}>
			{children}
		</GlobalLocationContext.Provider>
	);
}

/**
 * Hook to use global location context
 * Provides instant access to cached location across all components
 */
export function useGlobalLocation() {
	const context = useContext(GlobalLocationContext);

	if (!context) {
		throw new Error("useGlobalLocation must be used within a GlobalLocationProvider");
	}

	return context;
}

/**
 * Hook for components that need location but can work without it
 * Returns cached location immediately, no waiting required
 */
export function useOptionalLocation() {
	const { userLocation, locationPermission, isLoadingLocation, hasUserLocation } = useGlobalLocation();

	return {
		location: userLocation,
		hasPermission: locationPermission,
		isLoading: isLoadingLocation,
		hasLocation: hasUserLocation,
		// No blocking - components can work without location
	};
}

export default GlobalLocationContext;

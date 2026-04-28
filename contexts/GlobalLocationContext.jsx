"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import * as Location from "expo-location";
import { Platform } from "react-native";
import { DEFAULT_APP_COORDINATES } from "../constants/locationDefaults";
import { useLocationStore } from "../stores/locationStore";
import mapboxService from "../services/mapboxService";
import {
	normalizeLocationCoordinates,
	buildFallbackPlaceModel,
	buildPlaceModelFromOpenStreetMap,
	reverseGeocodeWithOpenStreetMap,
	buildPlaceModelFromFormattedAddress,
	buildPlaceModelFromNativePlace,
} from "../utils/locationHelpers";

// PULLBACK NOTE: Location fallback priority: GPS → Zustand persisted last-known → DEFAULT_APP_COORDINATES
// OLD: all GPS failures fell straight to hardcoded Lagos coords
// NEW: check locationStore.userLocation first (persisted across sessions); hardcoded only on true cold install
const getLocationFallback = () => {
  const stored = useLocationStore.getState().userLocation;
  const lat = Number(stored?.latitude);
  const lng = Number(stored?.longitude);
  if (stored && Number.isFinite(lat) && Number.isFinite(lng)) return stored;
  return { ...DEFAULT_APP_COORDINATES };
};

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
	const [resolvedPlace, setResolvedPlace] = useState(null);
	const [isResolvingPlaceName, setIsResolvingPlaceName] = useState(false);

	// Prevent multiple simultaneous permission requests
	const isRequestingPermission = useRef(false);
	const isInitialized = useRef(false);
	const placeRequestIdRef = useRef(0);
	const resolvedPlaceKeyRef = useRef(null);

	const resolveLocationDetails = useCallback(async (locationInput) => {
		const normalizedLocation = normalizeLocationCoordinates(locationInput);
		if (!normalizedLocation) {
			const fallbackPlace = buildFallbackPlaceModel(locationInput);
			setResolvedPlace(fallbackPlace);
			return fallbackPlace;
		}

		const locationKey = `${normalizedLocation.latitude.toFixed(4)}:${normalizedLocation.longitude.toFixed(4)}`;
		if (resolvedPlaceKeyRef.current === locationKey && resolvedPlace) {
			return resolvedPlace;
		}

		const requestId = ++placeRequestIdRef.current;
		setIsResolvingPlaceName(true);

		try {
			let nextPlace = null;

			try {
				const nativePlaces = await Location.reverseGeocodeAsync(normalizedLocation);
				const nativePlace = buildPlaceModelFromNativePlace(
					nativePlaces?.[0],
					normalizedLocation,
				);
				if (nativePlace?.source !== "fallback") {
					nextPlace = nativePlace;
				}
			} catch (_nativeError) {
				// Fall through to Mapbox reverse geocoding below.
			}

			if (!nextPlace) {
				try {
					const formattedAddress = await mapboxService.reverseGeocode(
						normalizedLocation.latitude,
						normalizedLocation.longitude,
					);
					if (
						typeof formattedAddress === "string" &&
						formattedAddress.trim() &&
						formattedAddress !== "Unknown Address"
					) {
						nextPlace = buildPlaceModelFromFormattedAddress(
							formattedAddress,
							normalizedLocation,
							"mapbox",
						);
					}
				} catch (_mapboxError) {
					// Fall through to web-safe public reverse geocoding below.
				}
			}

			if (!nextPlace) {
				nextPlace = await reverseGeocodeWithOpenStreetMap(normalizedLocation);
			}

			if (!nextPlace) {
				nextPlace = buildFallbackPlaceModel(normalizedLocation);
			}

			if (requestId === placeRequestIdRef.current) {
				resolvedPlaceKeyRef.current = locationKey;
				setResolvedPlace(nextPlace);
			}

			return nextPlace;
		} finally {
			if (requestId === placeRequestIdRef.current) {
				setIsResolvingPlaceName(false);
			}
		}
	}, [resolvedPlace]);

	// Request location permission and get location
	const requestLocationPermission = useCallback(async () => {

		// Prevent multiple simultaneous requests
		if (isRequestingPermission.current) {
			return;
		}

		isRequestingPermission.current = true;
		setLocationError(null);

		try {
			if (Platform.OS === "web" && typeof window !== "undefined" && !window.isSecureContext) {
				console.warn(
					"[GlobalLocationContext] Web geolocation may be blocked because this page is not a secure context. Use HTTPS or localhost for precise browser location."
				);
			}

			// Check if permission is already granted
			const { status } = await Location.getForegroundPermissionsAsync();

			if (status === "granted") {
				setLocationPermission(true);

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
					void resolveLocationDetails(locationData);
				} catch (locationErr) {
					console.error("[GlobalLocationContext] Failed to get location (using fallback):", locationErr);
					const fallbackData = getLocationFallback();
					setUserLocation(fallbackData);
					setLastUpdated(Date.now());
					void resolveLocationDetails(fallbackData);
					setLocationError(null);
				}
			} else {
				// Request permission
				const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
				const hasPermission = newStatus === "granted";
				setLocationPermission(hasPermission);

				if (hasPermission) {
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
						void resolveLocationDetails(locationData);
					} catch (locationErr) {
						console.error("[GlobalLocationContext] Failed to get location after permission (using fallback):", locationErr);
						const fallbackData = getLocationFallback();
						setUserLocation(fallbackData);
						setLastUpdated(Date.now());
						void resolveLocationDetails(fallbackData);
						setLocationError(null);
					}
				} else {
					const fallbackData = getLocationFallback();
					setUserLocation(fallbackData);
					setLastUpdated(Date.now());
					void resolveLocationDetails(fallbackData);
					setLocationError(null);
				}
			}
		} catch (err) {
			console.error("[GlobalLocationContext] Permission request failed — using fallback:", err?.message ?? err);
			const fallbackData = getLocationFallback();
			setUserLocation(fallbackData);
			setLastUpdated(Date.now());
			void resolveLocationDetails(fallbackData);
			setLocationError(null);
		} finally {
			isRequestingPermission.current = false;
			setIsLoadingLocation(false);
		}
	}, [resolveLocationDetails]);

	useEffect(() => {
		if (isInitialized.current) {
			return;
		}

		isInitialized.current = true;

		// Start location loading
		requestLocationPermission();
	}, [requestLocationPermission]);

	// Refresh location (for manual refresh)
	const refreshLocation = useCallback(async () => {
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
	const value = {
		// Location data
		userLocation,
		locationPermission,
		isLoadingLocation,
		locationError,
		lastUpdated,
		resolvedPlace,
		isResolvingPlaceName,
		locationLabel: resolvedPlace?.primaryText || null,
		locationLabelDetail: resolvedPlace?.secondaryText || null,

		// Methods
		refreshLocation,
		isLocationFresh,
		requestLocationPermission,
		resolveLocationDetails,

		// Computed values
		hasUserLocation: !!userLocation,
		isLocationError: !!locationError,
		hasResolvedPlace: !!resolvedPlace,
	};

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
	const {
		userLocation,
		locationPermission,
		isLoadingLocation,
		hasUserLocation,
		locationError,
		resolvedPlace,
	} = useGlobalLocation();

	return {
		location: userLocation,
		hasPermission: locationPermission,
		isLoading: isLoadingLocation,
		hasLocation: hasUserLocation,
		locationError,
		resolvedPlace,
		// No blocking - components can work without location
	};
}

export default GlobalLocationContext;

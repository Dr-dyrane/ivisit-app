"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import * as Location from "expo-location";
import { Platform } from "react-native";
import { DEFAULT_APP_COORDINATES } from "../constants/locationDefaults";
import mapboxService from "../services/mapboxService";

// Location configuration constants
const LOCATION_CONFIG = {
	TIMEOUT: 10000, // 10 seconds
	MAX_AGE: 30000, // 30 seconds cache
	ACCURACY: Location.Accuracy.High,
};

const normalizeLocationCoordinates = (location) => {
	const latitude = Number(location?.latitude);
	const longitude = Number(location?.longitude);
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return null;
	}
	return { latitude, longitude };
};

const buildFallbackPlaceModel = (location) => ({
	primaryText: "Current location",
	secondaryText: "Nearby area",
	formattedAddress: "Current location",
	source: "fallback",
	location: normalizeLocationCoordinates(location),
});

const buildPlaceModelFromOpenStreetMap = (payload, location) => {
	if (!payload || typeof payload !== "object") {
		return buildFallbackPlaceModel(location);
	}

	const address = payload.address || {};
	const locality =
		address.city || address.town || address.village || address.hamlet || address.county;
	const primaryText =
		[address.house_number, address.road].filter(Boolean).join(" ").trim() ||
		address.neighbourhood ||
		address.suburb ||
		locality ||
		payload.name ||
		"Current location";
	const secondaryText = [address.suburb, locality, address.state]
		.filter(Boolean)
		.filter((value, index, values) => values.indexOf(value) === index)
		.join(", ");

	return {
		primaryText,
		secondaryText,
		formattedAddress:
			typeof payload.display_name === "string" && payload.display_name.trim()
				? payload.display_name.trim()
				: [primaryText, secondaryText].filter(Boolean).join(", "),
		source: "openstreetmap",
		location: normalizeLocationCoordinates(location),
	};
};

const reverseGeocodeWithOpenStreetMap = async (location) => {
	const normalizedLocation = normalizeLocationCoordinates(location);
	if (!normalizedLocation) {
		return null;
	}

	try {
		const response = await fetch(
			`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${normalizedLocation.latitude}&lon=${normalizedLocation.longitude}&zoom=18&addressdetails=1`,
			{
				headers: {
					Accept: "application/json",
					"Accept-Language": "en",
				},
			},
		);

		if (!response.ok) {
			throw new Error(`OpenStreetMap reverse geocode failed with ${response.status}`);
		}

		const data = await response.json();
		if (!data?.display_name && !data?.address) {
			return null;
		}

		return buildPlaceModelFromOpenStreetMap(data, normalizedLocation);
	} catch (_openStreetMapError) {
		return null;
	}
};

const buildPlaceModelFromFormattedAddress = (formattedAddress, location, source = "mapbox") => {
	if (typeof formattedAddress !== "string" || !formattedAddress.trim()) {
		return buildFallbackPlaceModel(location);
	}

	const parts = formattedAddress
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);
	const primaryText = parts[0] || formattedAddress.trim();
	const secondaryText = parts.slice(1).join(", ");

	return {
		primaryText,
		secondaryText,
		formattedAddress: formattedAddress.trim(),
		source,
		location: normalizeLocationCoordinates(location),
	};
};

const buildPlaceModelFromNativePlace = (place, location) => {
	if (!place || typeof place !== "object") {
		return buildFallbackPlaceModel(location);
	}

	const primaryText =
		[place.name, place.street]
			.filter(Boolean)
			.join(" ")
			.trim() ||
		place.city ||
		place.region ||
		"Current location";
	const secondaryText = [place.district, place.city, place.region, place.country]
		.filter(Boolean)
		.join(", ");

	return {
		primaryText,
		secondaryText,
		formattedAddress: [primaryText, secondaryText].filter(Boolean).join(", "),
		source: "native",
		location: normalizeLocationCoordinates(location),
	};
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
					const fallbackData = { ...DEFAULT_APP_COORDINATES };
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
						// 🔴 REVERT POINT: Context Fallback
						// NEW: Use standard coordinate if GPS fails
						const fallbackData = { ...DEFAULT_APP_COORDINATES };
						setUserLocation(fallbackData);
						setLastUpdated(Date.now());
						void resolveLocationDetails(fallbackData);
						setLocationError(null); // Clear error since we have a fallback
					}
				} else {
					const fallbackData = { ...DEFAULT_APP_COORDINATES };
					setUserLocation(fallbackData);
					setLastUpdated(Date.now());
					void resolveLocationDetails(fallbackData);
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
	}, [resolveLocationDetails]);

	// Initialize location on mount
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

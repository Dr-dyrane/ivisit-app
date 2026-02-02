import { useState, useCallback, useRef, useEffect } from "react";
import * as Location from "expo-location";
import { LOCATION_CONFIG } from "../../constants/mapConfig";
import { useOptionalLocation } from "../../contexts/GlobalLocationContext";

export const useMapLocation = () => {
	// Hook initializing - no debug logs
	
	// Use cached location from GlobalLocationContext
	const { location, hasPermission, isLoading: globalLoading, locationError: globalError } = useOptionalLocation();
	
	const [userLocation, setUserLocation] = useState(location);
	const [locationPermission, setLocationPermission] = useState(hasPermission);
	const [isLoadingLocation, setIsLoadingLocation] = useState(globalLoading);
	const [locationError, setLocationError] = useState(globalError);
	const hasCenteredOnUser = useRef(false);
	const locationWatcherRef = useRef(null);
	const isRequestingPermission = useRef(false);

	// Sync with global location state
	useEffect(() => {
		if (location) {
			setUserLocation(location);
			setLocationPermission(hasPermission);
			setIsLoadingLocation(globalLoading);
			setLocationError(globalError);
			// Synced with GlobalLocationContext
		}
	}, [location, hasPermission, globalLoading, globalError]);

	const requestLocationPermission = useCallback(async () => {
		// Requesting location permission
		
		// If we already have location from global context, use it immediately
		if (location && hasPermission) {
			// Using cached location from GlobalLocationContext
			setUserLocation(location);
			setLocationPermission(true);
			setIsLoadingLocation(false);
			setLocationError(null);
			return;
		}
		
		// Prevent multiple simultaneous permission requests
		if (isRequestingPermission.current) {
			// Permission request already in progress
			return;
		}
		
		isRequestingPermission.current = true;
		setLocationError(null);
		
		try {
			// Check if permission is already granted
			const { status } = await Location.getForegroundPermissionsAsync();
			
			if (status === "granted") {
				setLocationPermission(true);
				
				// Get current location with timeout and error handling
				try {
					const locationData = await Promise.race([
						Location.getCurrentPositionAsync({
							accuracy: Location.Accuracy.High,
							maxAge: LOCATION_CONFIG.MAX_AGE,
							timeout: LOCATION_CONFIG.TIMEOUT,
						}),
						new Promise((_, reject) => 
							setTimeout(() => reject(new Error("Location timeout")), LOCATION_CONFIG.TIMEOUT)
						)
					]);
					
					const locationObj = {
						latitude: locationData.coords.latitude,
						longitude: locationData.coords.longitude,
					};
					
					setUserLocation(locationObj);
					// Fresh location obtained
				} catch (locationErr) {
					// Failed to get location
					setLocationError(locationErr.message);
				}
			} else {
				// Request permission
				const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
				const hasNewPermission = newStatus === "granted";
				setLocationPermission(hasNewPermission);
				
				if (hasNewPermission) {
					try {
						const locationData = await Promise.race([
							Location.getCurrentPositionAsync({
								accuracy: Location.Accuracy.High,
								maxAge: LOCATION_CONFIG.MAX_AGE,
								timeout: LOCATION_CONFIG.TIMEOUT,
							}),
							new Promise((_, reject) => 
								setTimeout(() => reject(new Error("Location timeout")), LOCATION_CONFIG.TIMEOUT)
							)
						]);
						
						const locationObj = {
							latitude: locationData.coords.latitude,
							longitude: locationData.coords.longitude,
						};
						
						setUserLocation(locationObj);
						// Fresh location obtained after permission
					} catch (locationErr) {
						// Failed to get location after permission
						setLocationError(locationErr.message);
					}
				}
			}
		} catch (err) {
			// Permission request failed
			setLocationError(err.message);
		} finally {
			setIsLoadingLocation(false);
			isRequestingPermission.current = false;
		}
	}, [location, hasPermission]);

	const startLocationTracking = useCallback(() => {
		if (!locationPermission) {
			// Location permission not granted
			return;
		}

		try {
			locationWatcherRef.current = Location.watchPositionAsync(
				{
					accuracy: LOCATION_CONFIG.ACCURACY,
					timeInterval: LOCATION_CONFIG.DISTANCE_INTERVAL,
					distanceInterval: LOCATION_CONFIG.DISTANCE_INTERVAL,
				},
				(location) => {
					setUserLocation({
						latitude: location.coords.latitude,
						longitude: location.coords.longitude,
					});
				}
			).then((subscription) => subscription);
		} catch (err) {
			// Location tracking failed
		}
	}, [locationPermission]);

	const stopLocationTracking = useCallback(() => {
		if (locationWatcherRef.current) {
			locationWatcherRef.current.then((subscription) => {
				subscription?.remove?.();
			});
			locationWatcherRef.current = null;
		}
	}, []);

	useEffect(() => {
		// Hook mounted, returning cleanup
		return () => {
			// Hook unmounting
			stopLocationTracking();
		};
	}, [stopLocationTracking]);

	return {
		userLocation,
		locationPermission,
		isLoadingLocation,
		locationError,
		hasCenteredOnUser,
		requestLocationPermission,
		startLocationTracking,
		stopLocationTracking,
	};
};

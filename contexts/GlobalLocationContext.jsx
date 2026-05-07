"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as Location from "expo-location";
import { Linking, Platform } from "react-native";
import mapboxService from "../services/mapboxService";
import { useLocationStore } from "../stores/locationStore";
import {
  buildFallbackPlaceModel,
  buildPlaceModelFromFormattedAddress,
  buildPlaceModelFromNativePlace,
  normalizeLocationCoordinates,
  reverseGeocodeWithOpenStreetMap,
} from "../utils/locationHelpers";

const LOCATION_CONFIG = {
  TIMEOUT: 10000,
  MAX_AGE: 30000,
  ACCURACY: Location.Accuracy.High,
};

const GlobalLocationContext = createContext();

function getStoredLocationFallback({ allowDevice = false } = {}) {
  const state = useLocationStore.getState();
  const normalizedLocation = normalizeLocationCoordinates(state.userLocation);
  const source = state.userLocationSource || "persisted";

  if (!normalizedLocation) {
    return null;
  }
  if (source === "manual") {
    return {
      location: normalizedLocation,
      source: "manual_fallback",
    };
  }
  if (allowDevice && (source === "device" || source === "persisted")) {
    return {
      location: normalizedLocation,
      source: "stored_fallback",
    };
  }
  return null;
}

export function GlobalLocationProvider({ children }) {
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [locationPermissionStatus, setLocationPermissionStatus] =
    useState("undetermined");
  const [locationSource, setLocationSource] = useState("unknown");
  const [locationServicesEnabled, setLocationServicesEnabled] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [resolvedPlace, setResolvedPlace] = useState(null);
  const [isResolvingPlaceName, setIsResolvingPlaceName] = useState(false);

  const isRequestingPermission = useRef(false);
  const isInitialized = useRef(false);
  const placeRequestIdRef = useRef(0);
  const resolvedPlaceKeyRef = useRef(null);

  const syncStorePermissionStatus = useCallback((status) => {
    useLocationStore.getState().setLocationPermission(status);
  }, []);

  const setPermissionState = useCallback(
    (status) => {
      setLocationPermissionStatus(status);
      setLocationPermission(status === "granted");
      syncStorePermissionStatus(status);
    },
    [syncStorePermissionStatus],
  );

  const resolveLocationDetails = useCallback(
    async (locationInput) => {
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
          const nativePlaces = await Location.reverseGeocodeAsync(
            normalizedLocation,
          );
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
            // Fall through to public reverse geocoding below.
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
    },
    [resolvedPlace],
  );

  const applyResolvedLocation = useCallback(
    async ({ locationData, source, permissionStatus, errorMessage = null }) => {
      const normalizedLocation = normalizeLocationCoordinates(locationData);
      setPermissionState(permissionStatus);
      setLocationSource(source);
      setLocationError(errorMessage);
      setUserLocation(normalizedLocation);
      setLastUpdated(Date.now());

      if (!normalizedLocation) {
        resolvedPlaceKeyRef.current = null;
        setResolvedPlace(null);
        return null;
      }

      return resolveLocationDetails(normalizedLocation);
    },
    [resolveLocationDetails, setPermissionState],
  );

  const openLocationSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (_settingsError) {
      // Settings open is best-effort only.
    }
  }, []);

  const requestLocationPermission = useCallback(async () => {
    if (isRequestingPermission.current) {
      return;
    }

    isRequestingPermission.current = true;
    setLocationError(null);

    try {
      if (
        Platform.OS === "web" &&
        typeof window !== "undefined" &&
        !window.isSecureContext
      ) {
        console.warn(
          "[GlobalLocationContext] Web geolocation may be blocked because this page is not a secure context. Use HTTPS or localhost for precise browser location.",
        );
      }

      const servicesEnabled =
        typeof Location.hasServicesEnabledAsync === "function"
          ? await Location.hasServicesEnabledAsync()
          : true;
      setLocationServicesEnabled(servicesEnabled);

      if (!servicesEnabled) {
        const manualFallback = getStoredLocationFallback({
          allowDevice: false,
        });
        const resolvedPlaceResult = await applyResolvedLocation({
          locationData: manualFallback?.location || null,
          source: manualFallback?.source || "services_disabled",
          permissionStatus: "services_disabled",
          errorMessage: manualFallback
            ? "Location Services are off. Update the pickup area or turn location back on."
            : "Location Services are off. Turn them on or enter a pickup area manually.",
        });
        return {
          permissionStatus: "services_disabled",
          source: manualFallback?.source || "services_disabled",
          location: manualFallback?.location || null,
          resolvedPlace: resolvedPlaceResult,
        };
      }

      let permission = await Location.getForegroundPermissionsAsync();
      let permissionStatus = permission?.status || "undetermined";

      if (permissionStatus !== "granted") {
        permission = await Location.requestForegroundPermissionsAsync();
        permissionStatus = permission?.status || "undetermined";
      }

      if (permissionStatus !== "granted") {
        const manualFallback = getStoredLocationFallback({
          allowDevice: false,
        });
        const resolvedPlaceResult = await applyResolvedLocation({
          locationData: manualFallback?.location || null,
          source:
            manualFallback?.source ||
            (permission?.canAskAgain === false
              ? "permission_denied"
              : "permission_required"),
          permissionStatus,
          errorMessage: manualFallback
            ? "Location access is off. Update the pickup area or turn location back on."
            : "Location access is off. Turn it on or search for a pickup area manually.",
        });
        return {
          permissionStatus,
          source:
            manualFallback?.source ||
            (permission?.canAskAgain === false
              ? "permission_denied"
              : "permission_required"),
          location: manualFallback?.location || null,
          resolvedPlace: resolvedPlaceResult,
        };
      }

      try {
        const location = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: LOCATION_CONFIG.ACCURACY,
            maxAge: LOCATION_CONFIG.MAX_AGE,
            timeout: LOCATION_CONFIG.TIMEOUT,
          }),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Location timeout")),
              LOCATION_CONFIG.TIMEOUT,
            ),
          ),
        ]);

        const locationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        const resolvedPlaceResult = await applyResolvedLocation({
          locationData,
          source: "device",
          permissionStatus: "granted",
        });
        return {
          permissionStatus: "granted",
          source: "device",
          location: locationData,
          resolvedPlace: resolvedPlaceResult,
        };
      } catch (locationErr) {
        console.error(
          "[GlobalLocationContext] Failed to get live location:",
          locationErr,
        );
        const storedFallback = getStoredLocationFallback({ allowDevice: true });
        const resolvedPlaceResult = await applyResolvedLocation({
          locationData: storedFallback?.location || null,
          source: storedFallback?.source || "location_unavailable",
          permissionStatus: "granted",
          errorMessage: storedFallback
            ? "Couldn't refresh your live location. Using your last saved area for now."
            : "Couldn't fetch your current location. Turn location on again or enter a pickup area manually.",
        });
        return {
          permissionStatus: "granted",
          source: storedFallback?.source || "location_unavailable",
          location: storedFallback?.location || null,
          resolvedPlace: resolvedPlaceResult,
        };
      }
    } catch (err) {
      console.error(
        "[GlobalLocationContext] Permission request failed:",
        err?.message ?? err,
      );
      const manualFallback = getStoredLocationFallback({ allowDevice: false });
      const resolvedPlaceResult = await applyResolvedLocation({
        locationData: manualFallback?.location || null,
        source: manualFallback?.source || "location_unavailable",
        permissionStatus: "undetermined",
        errorMessage: manualFallback
          ? "Location access failed. Using your saved pickup area for now."
          : "We couldn't fetch your location. Enter a pickup area manually or try again.",
      });
      return {
        permissionStatus: "undetermined",
        source: manualFallback?.source || "location_unavailable",
        location: manualFallback?.location || null,
        resolvedPlace: resolvedPlaceResult,
      };
    } finally {
      isRequestingPermission.current = false;
      setIsLoadingLocation(false);
    }
  }, [applyResolvedLocation]);

  useEffect(() => {
    if (isInitialized.current) {
      return;
    }

    isInitialized.current = true;
    requestLocationPermission();
  }, [requestLocationPermission]);

  const refreshLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    return requestLocationPermission();
  }, [requestLocationPermission]);

  const isLocationFresh = useCallback(() => {
    if (!lastUpdated || !userLocation) return false;
    const age = Date.now() - lastUpdated;
    return age < LOCATION_CONFIG.MAX_AGE;
  }, [lastUpdated, userLocation]);

  const hasPreciseDeviceLocation = Boolean(
    userLocation?.latitude &&
      userLocation?.longitude &&
      locationSource === "device",
  );
  const isUsingFallbackLocation = [
    "stored_fallback",
    "manual_fallback",
  ].includes(locationSource);

  const value = {
    userLocation,
    locationPermission,
    locationPermissionStatus,
    locationSource,
    locationServicesEnabled,
    isLoadingLocation,
    locationError,
    lastUpdated,
    resolvedPlace,
    isResolvingPlaceName,
    locationLabel: resolvedPlace?.primaryText || null,
    locationLabelDetail: resolvedPlace?.secondaryText || null,
    refreshLocation,
    isLocationFresh,
    requestLocationPermission,
    resolveLocationDetails,
    openLocationSettings,
    hasUserLocation: !!userLocation,
    hasPreciseDeviceLocation,
    isUsingFallbackLocation,
    isLocationError: !!locationError,
    hasResolvedPlace: !!resolvedPlace,
  };

  return (
    <GlobalLocationContext.Provider value={value}>
      {children}
    </GlobalLocationContext.Provider>
  );
}

export function useGlobalLocation() {
  const context = useContext(GlobalLocationContext);

  if (!context) {
    throw new Error(
      "useGlobalLocation must be used within a GlobalLocationProvider",
    );
  }

  return context;
}

export function useOptionalLocation() {
  const {
    userLocation,
    locationPermission,
    locationPermissionStatus,
    locationSource,
    isLoadingLocation,
    locationError,
    resolvedPlace,
    hasPreciseDeviceLocation,
    isUsingFallbackLocation,
    openLocationSettings,
    requestLocationPermission,
  } = useGlobalLocation();

  return {
    location: userLocation,
    hasPermission: locationPermission,
    permissionStatus: locationPermissionStatus,
    locationSource,
    isLoading: isLoadingLocation,
    hasLocation: !!userLocation,
    hasPreciseDeviceLocation,
    isUsingFallbackLocation,
    locationError,
    resolvedPlace,
    openLocationSettings,
    requestLocationPermission,
  };
}

export default GlobalLocationContext;

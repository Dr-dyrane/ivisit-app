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
  PLACE_TIMEOUT: 5000,
  MAX_AGE: 30000,
  ACCURACY: Location.Accuracy.High,
};

const withLocationDeadline = (promise, timeoutMs, message) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
};

// LOC-3: Location Recovery - Structured error classification
const LOCATION_ERROR_TYPES = {
  PERMISSION_DENIED: "permission_denied",
  PERMISSION_RESTRICTED: "permission_restricted",
  SERVICE_DISABLED: "service_disabled",
  NETWORK_ERROR: "network_error",
  TIMEOUT: "timeout",
  UNKNOWN: "unknown",
};

const LOCATION_ERROR_ACTIONS = {
  [LOCATION_ERROR_TYPES.PERMISSION_DENIED]: {
    title: "Location Permission Required",
    message: "Please enable location access in settings to find nearby hospitals.",
    primaryAction: "Open Settings",
    secondaryAction: "Use Manual Address",
    onPrimary: () => Linking.openSettings(),
  },
  [LOCATION_ERROR_TYPES.PERMISSION_RESTRICTED]: {
    title: "Location Access Restricted",
    message: "Your device has restricted location access. Please use manual address entry.",
    primaryAction: "Enter Address",
    secondaryAction: null,
    onPrimary: null, // Will trigger manual entry
  },
  [LOCATION_ERROR_TYPES.SERVICE_DISABLED]: {
    title: "Location Services Off",
    message: "Please enable location services in your device settings.",
    primaryAction: "Open Settings",
    secondaryAction: "Use Manual Address",
    onPrimary: () => {
      if (Platform.OS === "ios") {
        Linking.openURL("app-settings:");
      } else {
        Linking.openSettings();
      }
    },
  },
  [LOCATION_ERROR_TYPES.NETWORK_ERROR]: {
    title: "Connection Issue",
    message: "Unable to determine location. Please check your connection and try again.",
    primaryAction: "Retry",
    secondaryAction: "Use Manual Address",
    onPrimary: null, // Will trigger retry
  },
  [LOCATION_ERROR_TYPES.TIMEOUT]: {
    title: "Location Timeout",
    message: "Taking too long to get your location. Try again or use manual entry.",
    primaryAction: "Retry",
    secondaryAction: "Use Manual Address",
    onPrimary: null,
  },
  [LOCATION_ERROR_TYPES.UNKNOWN]: {
    title: "Location Error",
    message: "Something went wrong getting your location. Please try again.",
    primaryAction: "Retry",
    secondaryAction: "Use Manual Address",
    onPrimary: null,
  },
};

// LOC-3: Classify error strings into structured error types
const classifyLocationError = (error) => {
  const message = error?.message || error || "";
  const code = error?.code || "";

  if (code === "E_LOCATION_DENIED" || message.includes("denied")) {
    return LOCATION_ERROR_TYPES.PERMISSION_DENIED;
  }
  if (code === "E_LOCATION_RESTRICTED" || message.includes("restricted")) {
    return LOCATION_ERROR_TYPES.PERMISSION_RESTRICTED;
  }
  if (message.includes("disabled") || message.includes("service")) {
    return LOCATION_ERROR_TYPES.SERVICE_DISABLED;
  }
  if (message.includes("network") || message.includes("fetch")) {
    return LOCATION_ERROR_TYPES.NETWORK_ERROR;
  }
  if (message.includes("timeout") || message.includes("timed out")) {
    return LOCATION_ERROR_TYPES.TIMEOUT;
  }
  return LOCATION_ERROR_TYPES.UNKNOWN;
};

// LOC-6: Runtime Validation - GPS quality thresholds
const GPS_WARN_ACCURACY_METERS = 100;
const GPS_WARN_AGE_MS = 5 * 60 * 1000; // 5 minutes

// LOC-6: Assess GPS quality with warnings (not blocks)
const assessGPSQuality = (location) => {
  if (!location) {
    return { isValid: false, quality: "poor", warnings: [], accuracy: null, age: null };
  }

  const accuracy = location?.coords?.accuracy;
  const timestamp = location?.timestamp || location?.coords?.timestamp;
  const age = timestamp ? Date.now() - timestamp : null;

  const warnings = [];

  if (accuracy && accuracy > GPS_WARN_ACCURACY_METERS) {
    warnings.push({
      type: "low_accuracy",
      message: "Location accuracy is low. Move outdoors if possible.",
      severity: "warning",
    });
  }

  if (age && age > GPS_WARN_AGE_MS) {
    warnings.push({
      type: "stale",
      message: "Location may be outdated. Refreshing...",
      severity: "info",
    });
  }

  const lat = location?.coords?.latitude ?? location?.latitude;
  const lng = location?.coords?.longitude ?? location?.longitude;
  const isValid = Number.isFinite(lat) && Number.isFinite(lng);

  return {
    isValid,
    accuracy,
    age,
    warnings,
    quality: warnings.length === 0 ? "high" : 
             warnings.some(w => w.severity === "error") ? "poor" : "fair",
  };
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
          const nativePlaces = await withLocationDeadline(
            Location.reverseGeocodeAsync(normalizedLocation),
            LOCATION_CONFIG.PLACE_TIMEOUT,
            "Native reverse geocoding timed out",
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
            const formattedAddress = await withLocationDeadline(
              mapboxService.reverseGeocode(
                normalizedLocation.latitude,
                normalizedLocation.longitude,
              ),
              LOCATION_CONFIG.PLACE_TIMEOUT,
              "Mapbox reverse geocoding timed out",
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
          nextPlace = await withLocationDeadline(
            reverseGeocodeWithOpenStreetMap(normalizedLocation),
            LOCATION_CONFIG.PLACE_TIMEOUT,
            "OpenStreetMap reverse geocoding timed out",
          );
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

      // Coordinates are sufficient to render the map. Place-name lookup is secondary.
      setIsLoadingLocation(false);

      return resolveLocationDetails(normalizedLocation);
    },
    [resolveLocationDetails, setPermissionState],
  );

  const openLocationSettings = useCallback(async () => {
    try {
      // PULLBACK NOTE: Platform-specific location settings
      // Android: Open system location settings directly
      // iOS: Open app settings (Apple doesn't allow direct location settings access)
      if (Platform.OS === "android") {
        await Linking.openURL("android.settings.LOCATION_SOURCE_SETTINGS");
      } else {
        await Linking.openSettings();
      }
    } catch (_settingsError) {
      // Fallback to app settings if direct location settings fail
      try {
        await Linking.openSettings();
      } catch (_fallbackError) {
        // Settings open is best-effort only.
      }
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
          ? await withLocationDeadline(
              Location.hasServicesEnabledAsync(),
              LOCATION_CONFIG.TIMEOUT,
              "Location services check timed out",
            )
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

      let permission = await withLocationDeadline(
        Location.getForegroundPermissionsAsync(),
        LOCATION_CONFIG.TIMEOUT,
        "Location permission check timed out",
      );
      let permissionStatus = permission?.status || "undetermined";

      if (permissionStatus !== "granted") {
        permission = await withLocationDeadline(
          Location.requestForegroundPermissionsAsync(),
          LOCATION_CONFIG.TIMEOUT,
          "Location permission request timed out",
        );
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
        const location = await withLocationDeadline(
          Location.getCurrentPositionAsync({
            accuracy: LOCATION_CONFIG.ACCURACY,
            maxAge: LOCATION_CONFIG.MAX_AGE,
            timeout: LOCATION_CONFIG.TIMEOUT,
          }),
          LOCATION_CONFIG.TIMEOUT,
          "Location timeout",
        );

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
    if (isRequestingPermission.current) {
      return null;
    }
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

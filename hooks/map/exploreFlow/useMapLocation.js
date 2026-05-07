// hooks/map/exploreFlow/useMapLocation.js
// Owns: canonical pickup-location resolution for the live /map flow,
//       explicit location-access state, and the search/current-location handlers.

import { useCallback, useMemo } from "react";
import { useBillingQuoteStore } from "../../../stores/billingQuoteStore";
import {
  buildHeaderLocationModel,
  toEmergencyLocation,
} from "../../../utils/map/mapLocationPresentation";
import { hasMeaningfulLocationChange } from "./mapExploreFlow.helpers";
import { MAP_SHEET_PHASES } from "../../../components/map/core/MapSheetOrchestrator";

const TRUSTED_EMERGENCY_LOCATION_SOURCES = new Set(["device", "manual"]);

function hasValidCoords(loc) {
  return (
    loc &&
    Number.isFinite(Number(loc.latitude)) &&
    Number.isFinite(Number(loc.longitude))
  );
}

export function useMapLocation({
  globalUserLocation,
  globalLocationSource,
  globalLocationPermissionStatus,
  locationLabel,
  locationLabelDetail,
  resolvedPlace,
  refreshLocation,
  requestLocationPermission,
  openLocationSettings,
  locationError,
  emergencyUserLocation,
  emergencyUserLocationSource,
  setUserLocation,
  manualLocation,
  setManualLocation,
  setSheetPhase,
  setMapReadiness,
  setHasCompletedInitialMapLoad,
  isDarkMode,
  width,
  height,
}) {
  const setBillingOverrides = useBillingQuoteStore(
    (state) => state.setBillingOverrides,
  );

  const hasManualLocation = hasValidCoords(manualLocation?.location);
  const hasTrustedEmergencyLocation =
    hasValidCoords(emergencyUserLocation) &&
    TRUSTED_EMERGENCY_LOCATION_SOURCES.has(emergencyUserLocationSource);
  const hasTrustedGlobalLocation =
    hasValidCoords(globalUserLocation) && globalLocationSource === "device";

  const activeLocation =
    (hasManualLocation && manualLocation.location) ||
    (hasTrustedEmergencyLocation && emergencyUserLocation) ||
    (hasTrustedGlobalLocation && globalUserLocation) ||
    null;

  const requiresLocationSelection = !activeLocation;
  const shouldOpenSettings =
    globalLocationPermissionStatus === "denied" ||
    globalLocationPermissionStatus === "services_disabled";
  const currentCountryCode =
    manualLocation?.countryCode || resolvedPlace?.countryCode || null;
  const activeLocationSource = hasManualLocation
    ? "manual"
    : hasTrustedEmergencyLocation
      ? emergencyUserLocationSource
      : hasTrustedGlobalLocation
        ? globalLocationSource
        : globalLocationSource || emergencyUserLocationSource || "missing";

  const currentLocationDetails = useMemo(() => {
    if (hasManualLocation) {
      return buildHeaderLocationModel({
        ...manualLocation,
        source: "manual",
        countryCode: manualLocation?.countryCode || null,
        useCurrentLocationActionLabel: shouldOpenSettings
          ? "Turn on location"
          : "Use device location",
        manualEntryActionLabel: "Change address",
        searchPlaceholder: "Enter street, area, city, or landmark",
      });
    }

    if (requiresLocationSelection) {
      return buildHeaderLocationModel({
        primaryText: "Set pickup area",
        secondaryText:
          "Turn on location or search a street, area, or city manually.",
        source: activeLocationSource,
        permissionStatus: globalLocationPermissionStatus,
        requiresLocationSelection: true,
        useCurrentLocationActionLabel: shouldOpenSettings
          ? "Turn on location"
          : "Use device location",
        manualEntryActionLabel: "Enter address manually",
        searchPlaceholder: "Enter street, area, city, or landmark",
      });
    }

    return buildHeaderLocationModel({
      primaryText:
        locationLabel ||
        (hasTrustedEmergencyLocation && emergencyUserLocationSource === "manual"
          ? "Saved pickup area"
          : "Current location"),
      secondaryText:
        locationLabelDetail ||
        (hasTrustedEmergencyLocation && emergencyUserLocationSource === "manual"
          ? "Change anytime"
          : ""),
      location: activeLocation,
      source: activeLocationSource,
      countryCode: currentCountryCode,
      searchPlaceholder: "Search hospitals, specialties, or area",
      useCurrentLocationActionLabel: shouldOpenSettings
        ? "Turn on location"
        : "Use device location",
      manualEntryActionLabel: "Change address",
    });
  }, [
    activeLocationSource,
    activeLocation,
    currentCountryCode,
    emergencyUserLocationSource,
    globalLocationPermissionStatus,
    globalLocationSource,
    hasManualLocation,
    hasTrustedEmergencyLocation,
    locationLabel,
    locationLabelDetail,
    manualLocation,
    requiresLocationSelection,
    shouldOpenSettings,
  ]);

  const loadingBackgroundImageUri = useMemo(() => {
    const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
    const latitude = Number(
      activeLocation?.latitude ?? activeLocation?.coords?.latitude,
    );
    const longitude = Number(
      activeLocation?.longitude ?? activeLocation?.coords?.longitude,
    );

    if (!token || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    const styleId = isDarkMode ? "navigation-night-v1" : "light-v11";
    const imageWidth = Math.max(
      360,
      Math.min(1280, Math.round((width || 390) * 1.4)),
    );
    const imageHeight = Math.max(
      720,
      Math.min(1600, Math.round((height || 844) * 1.3)),
    );

    return `https://api.mapbox.com/styles/v1/mapbox/${styleId}/static/${longitude.toFixed(5)},${latitude.toFixed(5)},13.2,0,0/${imageWidth}x${imageHeight}?logo=false&attribution=false&access_token=${encodeURIComponent(token)}`;
  }, [activeLocation, height, isDarkMode, width]);

  const resetMapForLocationChange = useCallback(
    (locationChanged) => {
      if (!locationChanged) return;
      setHasCompletedInitialMapLoad(false);
      setMapReadiness({
        mapReady: false,
        routeReady: false,
        isCalculatingRoute: false,
      });
    },
    [setHasCompletedInitialMapLoad, setMapReadiness],
  );

  const handleSearchLocation = useCallback(
    (nextLocation) => {
      if (!nextLocation?.location) return;

      const locationChanged = hasMeaningfulLocationChange(
        activeLocation,
        nextLocation.location,
      );
      const emergencyLocation = toEmergencyLocation(nextLocation.location);

      if (emergencyLocation) {
        setUserLocation(emergencyLocation, "manual");
      }
      if (nextLocation?.countryCode) {
        setBillingOverrides({
          billingCountryCode: nextLocation.countryCode,
          billingCurrencyCode: null,
        });
      }

      resetMapForLocationChange(locationChanged);
      setManualLocation(nextLocation);
      setSheetPhase(MAP_SHEET_PHASES.EXPLORE_INTENT);
    },
    [
      activeLocation,
      resetMapForLocationChange,
      setBillingOverrides,
      setManualLocation,
      setSheetPhase,
      setUserLocation,
    ],
  );

  const handleUseCurrentLocation = useCallback(async () => {
    if (shouldOpenSettings) {
      await openLocationSettings?.();
      return;
    }

    const fallbackCurrentLocation =
      (hasTrustedGlobalLocation && globalUserLocation) ||
      (hasTrustedEmergencyLocation && emergencyUserLocation) ||
      null;
    const locationChanged = manualLocation?.location
      ? hasMeaningfulLocationChange(
          manualLocation.location,
          fallbackCurrentLocation,
        )
      : false;

    const locationRequestResult =
      globalLocationPermissionStatus === "granted"
        ? await refreshLocation?.()
        : await requestLocationPermission?.();
    const nextDeviceLocation = toEmergencyLocation(locationRequestResult?.location);
    const didResolvePreciseDeviceLocation =
      locationRequestResult?.permissionStatus === "granted" &&
      locationRequestResult?.source === "device" &&
      Boolean(nextDeviceLocation);

    if (!didResolvePreciseDeviceLocation) {
      return;
    }

    resetMapForLocationChange(locationChanged);
    setUserLocation(nextDeviceLocation, "device");
    setManualLocation(null);
    setBillingOverrides({
      billingCountryCode:
        locationRequestResult?.resolvedPlace?.countryCode ||
        resolvedPlace?.countryCode ||
        null,
      billingCurrencyCode: null,
    });
    setSheetPhase(MAP_SHEET_PHASES.EXPLORE_INTENT);
  }, [
    emergencyUserLocation,
    globalLocationPermissionStatus,
    globalUserLocation,
    hasTrustedEmergencyLocation,
    hasTrustedGlobalLocation,
    manualLocation?.location,
    openLocationSettings,
    refreshLocation,
    resolvedPlace?.countryCode,
    requestLocationPermission,
    resetMapForLocationChange,
    setBillingOverrides,
    setManualLocation,
    setSheetPhase,
    setUserLocation,
    shouldOpenSettings,
  ]);

  const locationControl = useMemo(
    () => ({
      requiresLocationSelection,
      shouldOpenSettings,
      locationError,
      locationSource: activeLocationSource,
      permissionStatus: globalLocationPermissionStatus,
      currentCountryCode,
      searchPlaceholder:
        currentLocationDetails?.searchPlaceholder ||
        "Search hospitals, specialties, or area",
      currentLocationActionLabel:
      currentLocationDetails?.useCurrentLocationActionLabel ||
        (shouldOpenSettings ? "Turn on location" : "Use device location"),
      manualEntryActionLabel:
        currentLocationDetails?.manualEntryActionLabel || "Enter address manually",
    }),
    [
      activeLocationSource,
      currentCountryCode,
      currentLocationDetails?.manualEntryActionLabel,
      currentLocationDetails?.searchPlaceholder,
      currentLocationDetails?.useCurrentLocationActionLabel,
      globalLocationPermissionStatus,
      globalLocationSource,
      locationError,
      requiresLocationSelection,
      shouldOpenSettings,
    ],
  );

  return {
    activeLocation,
    currentLocationDetails,
    loadingBackgroundImageUri,
    handleSearchLocation,
    handleUseCurrentLocation,
    locationControl,
  };
}

// hooks/map/exploreFlow/useMapLocation.js
// Owns: canonical pickup-location resolution for the live /map flow,
//       explicit location-access state, and the search/current-location handlers.

import { useCallback, useEffect, useMemo } from "react";
import { useBillingQuoteStore } from "../../../stores/billingQuoteStore";
import {
  buildHeaderLocationModel,
  toEmergencyLocation,
} from "../../../utils/map/mapLocationPresentation";
import { hasMeaningfulLocationChange } from "./mapExploreFlow.helpers";
import { MAP_SHEET_PHASES } from "../../../components/map/core/MapSheetOrchestrator";
import {
  MAP_PICKUP_LOCATION_SOURCES,
  resolveMapPickupLocationTruth,
} from "./mapPickupLocationTruth";
import {
  buildExploreIntentSheetView,
  buildSourceReturnSheetView,
} from "./mapExploreFlow.transitions";
import mapboxService from "../../../services/mapboxService";

const PICKUP_EDIT_RETURN_PHASES = new Set([
  MAP_SHEET_PHASES.HOSPITAL_LIST,
  MAP_SHEET_PHASES.HOSPITAL_DETAIL,
  MAP_SHEET_PHASES.SERVICE_DETAIL,
  MAP_SHEET_PHASES.AMBULANCE_DECISION,
  MAP_SHEET_PHASES.BED_DECISION,
  MAP_SHEET_PHASES.COMMIT_PAYMENT,
]);

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
  setUserLocation,
  manualLocation,
  setManualLocation,
  sheetPayload,
  defaultExploreSnapState,
  setSheetView,
  clearLocationScopedMapState,
  setMapReadiness,
  setHasCompletedInitialMapLoad,
  isDarkMode,
  width,
  height,
}) {
  const setBillingOverrides = useBillingQuoteStore(
    (state) => state.setBillingOverrides,
  );
  const locationTruth = useMemo(
    () =>
      resolveMapPickupLocationTruth({
        manualLocation,
        globalUserLocation,
        globalLocationSource,
        resolvedPlace,
      }),
    [globalLocationSource, globalUserLocation, manualLocation, resolvedPlace],
  );
  const {
    activeLocation,
    currentCountryCode,
    requiresLocationSelection,
    source: activeLocationSource,
  } = locationTruth;

  // CRITICAL FIX: Sync location country to billing store on initial load and changes
  // Ensures deterministic pricing even when location comes from GPS/saved fallback (not manual search)
  useEffect(() => {
    if (currentCountryCode) {
      setBillingOverrides({
        billingCountryCode: currentCountryCode,
        billingCurrencyCode: null,
      });
    }
  }, [currentCountryCode, setBillingOverrides]);

  const shouldOpenSettings =
    globalLocationPermissionStatus === "denied" ||
    globalLocationPermissionStatus === "services_disabled";

  const currentLocationDetails = useMemo(() => {
    if (
      activeLocationSource === MAP_PICKUP_LOCATION_SOURCES.SESSION_MANUAL
    ) {
      return buildHeaderLocationModel({
        ...manualLocation,
        source: activeLocationSource,
        countryCode: manualLocation?.countryCode || null,
        useCurrentLocationActionLabel: shouldOpenSettings
          ? "Turn on location"
          : "Use device location",
        manualEntryActionLabel: "Change address",
        searchPlaceholder: "Search address or area",
      });
    }

    if (
      activeLocationSource ===
      MAP_PICKUP_LOCATION_SOURCES.SAVED_MANUAL_FALLBACK
    ) {
      return buildHeaderLocationModel({
        primaryText: locationLabel || "Saved pickup area",
        secondaryText: locationLabelDetail || "Using your saved pickup",
        location: activeLocation,
        source: activeLocationSource,
        countryCode: currentCountryCode,
        searchPlaceholder: "Change pickup or address",
        useCurrentLocationActionLabel: shouldOpenSettings
          ? "Turn on location"
          : "Use device location",
        manualEntryActionLabel: "Change address",
      });
    }

    if (
      activeLocationSource ===
      MAP_PICKUP_LOCATION_SOURCES.SAVED_DEVICE_FALLBACK
    ) {
      return buildHeaderLocationModel({
        primaryText: locationLabel || "Last known area",
        secondaryText: locationLabelDetail || "Using saved location for now",
        location: activeLocation,
        source: activeLocationSource,
        countryCode: currentCountryCode,
        searchPlaceholder: "Change pickup or address",
        useCurrentLocationActionLabel: shouldOpenSettings
          ? "Turn on location"
          : "Use device location",
        manualEntryActionLabel: "Change address",
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
        searchPlaceholder: "Search address or area",
      });
    }

    return buildHeaderLocationModel({
      primaryText: locationLabel || "Current location",
      secondaryText: locationLabelDetail || "",
      location: activeLocation,
      source: activeLocationSource,
      countryCode: currentCountryCode,
      searchPlaceholder: "Change pickup or address",
      useCurrentLocationActionLabel: shouldOpenSettings
        ? "Turn on location"
        : "Use device location",
      manualEntryActionLabel: "Change address",
    });
  }, [
    activeLocationSource,
    activeLocation,
    currentCountryCode,
    globalLocationPermissionStatus,
    locationLabel,
    locationLabelDetail,
    manualLocation,
    requiresLocationSelection,
    shouldOpenSettings,
  ]);

  const loadingBackgroundImageUri = useMemo(() => {
    const latitude = Number(
      activeLocation?.latitude ?? activeLocation?.coords?.latitude,
    );
    const longitude = Number(
      activeLocation?.longitude ?? activeLocation?.coords?.longitude,
    );

    return mapboxService.buildStaticMapImageUrl({
      latitude,
      longitude,
      width: width || 390,
      height: height || 844,
      isDarkMode,
    });
  }, [activeLocation, height, isDarkMode, width]);

  const resetMapForLocationChange = useCallback(
    (locationChanged) => {
      if (!locationChanged) return;
      clearLocationScopedMapState?.();
      setHasCompletedInitialMapLoad(false);
      setMapReadiness({
        mapReady: false,
        routeReady: false,
        isCalculatingRoute: false,
      });
    },
    [
      clearLocationScopedMapState,
      setHasCompletedInitialMapLoad,
      setMapReadiness,
    ],
  );

  const buildPickupReturnSheetView = useCallback(() => {
    const sourcePhase = sheetPayload?.sourcePhase || null;
    if (
      sourcePhase &&
      PICKUP_EDIT_RETURN_PHASES.has(sourcePhase)
    ) {
      return buildSourceReturnSheetView({
        payload: sheetPayload,
        fallbackPhase: sourcePhase,
        fallbackSnapState:
          sheetPayload?.sourceSnapState || defaultExploreSnapState,
        fallbackPayload: sheetPayload?.sourcePayload || null,
      });
    }

    return buildExploreIntentSheetView(defaultExploreSnapState);
  }, [defaultExploreSnapState, sheetPayload]);

  const handleSearchLocation = useCallback(
    (nextLocation) => {
      if (!nextLocation?.location) return;

      // LOC-2: Validate coordinates at entry point
      const lat = Number(nextLocation.location.latitude);
      const lng = Number(nextLocation.location.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        console.warn("[LOC-2] Invalid coordinates in handleSearchLocation", nextLocation);
        return;
      }

      const locationChanged = hasMeaningfulLocationChange(
        activeLocation,
        nextLocation.location,
      );
      const emergencyLocation = toEmergencyLocation(nextLocation.location);
      const nextSource =
        typeof nextLocation?.source === "string" && nextLocation.source.trim()
          ? nextLocation.source.trim()
          : "manual";

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
      setManualLocation({
        ...nextLocation,
        source: nextSource,
      });
      setSheetView(buildPickupReturnSheetView());
    },
    [
      activeLocation,
      buildPickupReturnSheetView,
      resetMapForLocationChange,
      setBillingOverrides,
      setManualLocation,
      setSheetView,
      setUserLocation,
    ],
  );

  const handleUseCurrentLocation = useCallback(async (options = {}) => {
    const stayInLocationIntent = options?.stayInLocationIntent === true;

    if (shouldOpenSettings) {
      await openLocationSettings?.();
      return { ok: false, reason: "settings" };
    }

    const fallbackCurrentLocation =
      activeLocationSource === MAP_PICKUP_LOCATION_SOURCES.DEVICE
        ? globalUserLocation
        : activeLocation;
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
      return { ok: false, reason: "unresolved" };
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
    if (!stayInLocationIntent) {
      setSheetView(buildPickupReturnSheetView());
    }

    return {
      ok: true,
      location: nextDeviceLocation,
      resolvedPlace: locationRequestResult?.resolvedPlace || resolvedPlace || null,
      countryCode:
        locationRequestResult?.resolvedPlace?.countryCode ||
        resolvedPlace?.countryCode ||
        null,
    };
  }, [
    activeLocation,
    activeLocationSource,
    buildPickupReturnSheetView,
    globalLocationPermissionStatus,
    globalUserLocation,
    manualLocation?.location,
    openLocationSettings,
    refreshLocation,
    resolvedPlace,
    requestLocationPermission,
    resetMapForLocationChange,
    setBillingOverrides,
    setManualLocation,
    setSheetView,
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
    locationTruth,
  };
}

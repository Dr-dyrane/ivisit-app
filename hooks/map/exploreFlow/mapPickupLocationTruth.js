const GLOBAL_SAVED_FALLBACK_SOURCES = new Set([
  "manual_fallback",
  "stored_fallback",
  "location_unavailable",
]);

export const MAP_PICKUP_LOCATION_SOURCES = {
  SESSION_MANUAL: "session_manual",
  DEVICE: "device",
  SAVED_MANUAL_FALLBACK: "saved_manual_fallback",
  SAVED_DEVICE_FALLBACK: "saved_device_fallback",
  MISSING: "missing",
};

export function hasValidPickupCoordinates(location) {
  return (
    location &&
    Number.isFinite(Number(location.latitude)) &&
    Number.isFinite(Number(location.longitude))
  );
}

export function resolveMapPickupLocationTruth({
  manualLocation,
  globalUserLocation,
  globalLocationSource,
  resolvedPlace,
} = {}) {
  const sessionManualLocation = manualLocation?.location || null;
  const manualCountryCode = manualLocation?.countryCode || null;
  const resolvedCountryCode = resolvedPlace?.countryCode || null;

  if (hasValidPickupCoordinates(sessionManualLocation)) {
    return {
      activeLocation: sessionManualLocation,
      source: MAP_PICKUP_LOCATION_SOURCES.SESSION_MANUAL,
      currentCountryCode: manualCountryCode || null,
      requiresLocationSelection: false,
      isFallback: false,
      isDevice: false,
      isManual: true,
      isSaved: false,
    };
  }

  if (
    hasValidPickupCoordinates(globalUserLocation) &&
    globalLocationSource === "device"
  ) {
    return {
      activeLocation: globalUserLocation,
      source: MAP_PICKUP_LOCATION_SOURCES.DEVICE,
      currentCountryCode: resolvedCountryCode || null,
      requiresLocationSelection: false,
      isFallback: false,
      isDevice: true,
      isManual: false,
      isSaved: false,
    };
  }

  if (
    hasValidPickupCoordinates(globalUserLocation) &&
    globalLocationSource === "manual_fallback"
  ) {
    return {
      activeLocation: globalUserLocation,
      source: MAP_PICKUP_LOCATION_SOURCES.SAVED_MANUAL_FALLBACK,
      currentCountryCode: manualCountryCode || resolvedCountryCode || null,
      requiresLocationSelection: false,
      isFallback: true,
      isDevice: false,
      isManual: true,
      isSaved: true,
    };
  }

  if (
    hasValidPickupCoordinates(globalUserLocation) &&
    GLOBAL_SAVED_FALLBACK_SOURCES.has(globalLocationSource)
  ) {
    return {
      activeLocation: globalUserLocation,
      source: MAP_PICKUP_LOCATION_SOURCES.SAVED_DEVICE_FALLBACK,
      currentCountryCode: resolvedCountryCode || null,
      requiresLocationSelection: false,
      isFallback: true,
      isDevice: false,
      isManual: false,
      isSaved: true,
    };
  }

  return {
    activeLocation: null,
    source: MAP_PICKUP_LOCATION_SOURCES.MISSING,
    currentCountryCode: null,
    requiresLocationSelection: true,
    isFallback: false,
    isDevice: false,
    isManual: false,
    isSaved: false,
  };
}

export default {
  MAP_PICKUP_LOCATION_SOURCES,
  hasValidPickupCoordinates,
  resolveMapPickupLocationTruth,
};

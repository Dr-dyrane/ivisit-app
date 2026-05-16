const GLOBAL_SAVED_FALLBACK_SOURCES = new Set([
  "manual_fallback",
  "stored_fallback",
  "location_unavailable",
]);

// LOC-1: Extended source enum with new pickup sources
export const MAP_PICKUP_LOCATION_SOURCES = {
  SESSION_MANUAL: "session_manual",
  RESOLVED_PLACE: "resolved_place",           // LOC-1: NEW - Place from Google/Mapbox
  DEVICE: "device",
  DEMO_BOOTSTRAP: "demo_bootstrap",           // LOC-1: NEW - Synthetic demo data
  SAVED_MANUAL_FALLBACK: "saved_manual_fallback",
  SAVED_DEVICE_FALLBACK: "saved_device_fallback",
  LOCATION_UNAVAILABLE: "location_unavailable", // LOC-1: NEW - Explicit unavailable state
  MISSING: "missing",
};

/**
 * Normalize runtime source strings to canonical enum values
 * LOC-1: Mapper for backward compatibility with legacy source strings
 */
export function normalizePickupSource(runtimeValue) {
  const sourceMap = {
    "manual": MAP_PICKUP_LOCATION_SOURCES.SAVED_MANUAL_FALLBACK,
    "manual_fallback": MAP_PICKUP_LOCATION_SOURCES.SAVED_MANUAL_FALLBACK,
    "persisted": MAP_PICKUP_LOCATION_SOURCES.SAVED_DEVICE_FALLBACK,
    "stored_fallback": MAP_PICKUP_LOCATION_SOURCES.SAVED_DEVICE_FALLBACK,
    "location_unavailable": MAP_PICKUP_LOCATION_SOURCES.LOCATION_UNAVAILABLE,
  };
  return sourceMap[runtimeValue] || runtimeValue;
}

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
    const source = MAP_PICKUP_LOCATION_SOURCES.SESSION_MANUAL;
    return {
      activeLocation: sessionManualLocation,
      source,
      currentCountryCode: manualCountryCode || null,
      requiresLocationSelection: false,
      isFallback: false,
      isDevice: false,
      isManual: true,
      isSaved: false,
      sourceMetadata: {
        isDemo: source === MAP_PICKUP_LOCATION_SOURCES.DEMO_BOOTSTRAP,
        isResolvedPlace: source === MAP_PICKUP_LOCATION_SOURCES.RESOLVED_PLACE,
        isLocationUnavailable: source === MAP_PICKUP_LOCATION_SOURCES.LOCATION_UNAVAILABLE,
        canonicalSource: normalizePickupSource(source),
      }
    };
  }

  if (
    hasValidPickupCoordinates(globalUserLocation) &&
    globalLocationSource === "device"
  ) {
    const source = MAP_PICKUP_LOCATION_SOURCES.DEVICE;
    return {
      activeLocation: globalUserLocation,
      source,
      currentCountryCode: resolvedCountryCode || null,
      requiresLocationSelection: false,
      isFallback: false,
      isDevice: true,
      isManual: false,
      isSaved: false,
      sourceMetadata: {
        isDemo: source === MAP_PICKUP_LOCATION_SOURCES.DEMO_BOOTSTRAP,
        isResolvedPlace: source === MAP_PICKUP_LOCATION_SOURCES.RESOLVED_PLACE,
        isLocationUnavailable: source === MAP_PICKUP_LOCATION_SOURCES.LOCATION_UNAVAILABLE,
        canonicalSource: normalizePickupSource(source),
      }
    };
  }

  if (
    hasValidPickupCoordinates(globalUserLocation) &&
    globalLocationSource === "manual_fallback"
  ) {
    const source = MAP_PICKUP_LOCATION_SOURCES.SAVED_MANUAL_FALLBACK;
    return {
      activeLocation: globalUserLocation,
      source,
      currentCountryCode: manualCountryCode || resolvedCountryCode || null,
      requiresLocationSelection: false,
      isFallback: true,
      isDevice: false,
      isManual: true,
      isSaved: true,
      sourceMetadata: {
        isDemo: source === MAP_PICKUP_LOCATION_SOURCES.DEMO_BOOTSTRAP,
        isResolvedPlace: source === MAP_PICKUP_LOCATION_SOURCES.RESOLVED_PLACE,
        isLocationUnavailable: source === MAP_PICKUP_LOCATION_SOURCES.LOCATION_UNAVAILABLE,
        canonicalSource: normalizePickupSource(source),
      }
    };
  }

  if (
    hasValidPickupCoordinates(globalUserLocation) &&
    GLOBAL_SAVED_FALLBACK_SOURCES.has(globalLocationSource)
  ) {
    const source = MAP_PICKUP_LOCATION_SOURCES.SAVED_DEVICE_FALLBACK;
    return {
      activeLocation: globalUserLocation,
      source,
      currentCountryCode: resolvedCountryCode || null,
      requiresLocationSelection: false,
      isFallback: true,
      isDevice: false,
      isManual: false,
      isSaved: true,
      sourceMetadata: {
        isDemo: source === MAP_PICKUP_LOCATION_SOURCES.DEMO_BOOTSTRAP,
        isResolvedPlace: source === MAP_PICKUP_LOCATION_SOURCES.RESOLVED_PLACE,
        isLocationUnavailable: source === MAP_PICKUP_LOCATION_SOURCES.LOCATION_UNAVAILABLE,
        canonicalSource: normalizePickupSource(source),
      }
    };
  }

  // LOC-1: Return with sourceMetadata for cache determinism and debugging
  const source = MAP_PICKUP_LOCATION_SOURCES.MISSING;
  return {
    activeLocation: null,
    source,
    currentCountryCode: null,
    requiresLocationSelection: true,
    isFallback: false,
    isDevice: false,
    isManual: false,
    isSaved: false,
    sourceMetadata: {
      isDemo: source === MAP_PICKUP_LOCATION_SOURCES.DEMO_BOOTSTRAP,
      isResolvedPlace: source === MAP_PICKUP_LOCATION_SOURCES.RESOLVED_PLACE,
      isLocationUnavailable: source === MAP_PICKUP_LOCATION_SOURCES.LOCATION_UNAVAILABLE,
      canonicalSource: normalizePickupSource(source),
    }
  };
}

export default {
  MAP_PICKUP_LOCATION_SOURCES,
  hasValidPickupCoordinates,
  resolveMapPickupLocationTruth,
  normalizePickupSource, // LOC-1: Export mapper for use in cache keys
};

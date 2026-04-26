// hooks/map/exploreFlow/useMapComputedBooleans.js
// Owns: hasActiveLocation, hasResolvedProviders, expectsRoute,
//       isMapFrameReady, isBackgroundCoverageLoading,
//       isBackgroundRouteLoading, isMapSurfaceReady.

/**
 * useMapComputedBooleans
 *
 * Pure derived boolean flags — no hooks, no memos needed,
 * values are simple boolean expressions recalculated per render.
 * Kept as a hook for symmetry and potential future memoization.
 */
export function useMapComputedBooleans({
  activeLocation,
  discoveredHospitals,
  nearestHospital,
  mapReadiness,
  needsCoverageExpansion,
  isLoadingHospitals,
  isBootstrappingDemo,
}) {
  const safeReadiness = mapReadiness || {};

  const hasActiveLocation = Boolean(
    activeLocation?.latitude && activeLocation?.longitude,
  );

  const hasResolvedProviders =
    Array.isArray(discoveredHospitals) && discoveredHospitals.length > 0;

  const expectsRoute = Boolean(
    activeLocation?.latitude &&
      activeLocation?.longitude &&
      nearestHospital?.id,
  );

  const isMapFrameReady = hasActiveLocation && safeReadiness.mapReady;

  const isBackgroundCoverageLoading =
    needsCoverageExpansion && (isLoadingHospitals || isBootstrappingDemo);

  const isBackgroundRouteLoading =
    expectsRoute &&
    (safeReadiness.isCalculatingRoute || !safeReadiness.routeReady);

  const isMapSurfaceReady = isMapFrameReady;

  return {
    hasActiveLocation,
    hasResolvedProviders,
    expectsRoute,
    isMapFrameReady,
    isBackgroundCoverageLoading,
    isBackgroundRouteLoading,
    isMapSurfaceReady,
  };
}

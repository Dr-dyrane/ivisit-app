// hooks/map/exploreFlow/useMapLoadingState.js
// PULLBACK NOTE: Extracted from useMapExploreFlow.js
// Owns: loading derived flags, initial load effect, mapLoadingState memo

import { useEffect, useMemo, useRef } from "react";
import { buildMapLoadingState } from "./mapExploreFlow.loading";

/**
 * useMapLoadingState
 *
 * Derives all map loading flags and builds the unified mapLoadingState
 * object consumed by the map screen loading overlay and skeleton surfaces.
 * Fires the one-time initial map load effect.
 */
export function useMapLoadingState({
  activeLocation,
  nearestHospital,
  discoveredHospitals,
  mapReadiness,
  needsCoverageExpansion,
  isLoadingHospitals,
  isBootstrappingDemo,
  coverageModePreferenceLoaded,
  isLoadingLocation,
  isResolvingPlaceName,
  hasCompletedInitialMapLoad,
  setHasCompletedInitialMapLoad,
}) {
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
  // Latch hasActiveLocation: once we've ever had a location this mount, treat as having one.
  // Prevents transient location-source nulls from blocking isMapFrameReady on iOS.
  const hadLocationLatchRef = useRef(false);
  if (hasActiveLocation && !hadLocationLatchRef.current) {
    hadLocationLatchRef.current = true;
  }
  const effectiveHasActiveLocation = hasActiveLocation || hadLocationLatchRef.current;
  const isMapFrameReady = effectiveHasActiveLocation && mapReadiness.mapReady;
  const isBackgroundCoverageLoading =
    needsCoverageExpansion && (isLoadingHospitals || isBootstrappingDemo);
  const isBackgroundRouteLoading =
    expectsRoute &&
    (mapReadiness.isCalculatingRoute || !mapReadiness.routeReady);
  const isMapSurfaceReady = isMapFrameReady;
  const shouldShowMapLoadingOverlay = !hasCompletedInitialMapLoad;

  useEffect(() => {
    if (isMapFrameReady && !hasCompletedInitialMapLoad) {
      setHasCompletedInitialMapLoad(true);
    }
  }, [
    hasCompletedInitialMapLoad,
    isMapFrameReady,
    setHasCompletedInitialMapLoad,
  ]);

  const mapLoadingState = useMemo(() => {
    return buildMapLoadingState({
      coverageModePreferenceLoaded,
      expectsRoute,
      hasActiveLocation,
      hasResolvedProviders,
      isBackgroundCoverageLoading,
      isBackgroundRouteLoading,
      isBootstrappingDemo,
      isLoadingHospitals,
      isLoadingLocation,
      isResolvingPlaceName,
      mapReadiness,
      shouldShowMapLoadingOverlay,
    });
  }, [
    coverageModePreferenceLoaded,
    hasActiveLocation,
    hasCompletedInitialMapLoad,
    hasResolvedProviders,
    isBackgroundCoverageLoading,
    isBackgroundRouteLoading,
    isBootstrappingDemo,
    isLoadingHospitals,
    isLoadingLocation,
    isResolvingPlaceName,
    mapReadiness,
    expectsRoute,
    shouldShowMapLoadingOverlay,
  ]);

  return {
    hasActiveLocation,
    hasResolvedProviders,
    expectsRoute,
    isMapFrameReady,
    isMapSurfaceReady,
    isBackgroundCoverageLoading,
    isBackgroundRouteLoading,
    shouldShowMapLoadingOverlay,
    mapLoadingState,
  };
}

// hooks/map/exploreFlow/useMapLocation.js
// PULLBACK NOTE: Extracted from useMapExploreFlow.js
// Owns: active location resolution, location sync effect, search/current-location
//       handlers, loading background map URI

import { useCallback, useEffect, useMemo } from "react";
import { buildHeaderLocationModel, toEmergencyLocation } from "../../../utils/map/mapLocationPresentation";
import { hasMeaningfulLocationChange } from "./mapExploreFlow.helpers";
import { MAP_SHEET_PHASES } from "../../../components/map/core/MapSheetOrchestrator";

/**
 * useMapLocation
 *
 * Resolves the single active location from manual override or GPS providers.
 * Syncs location into EmergencyContext. Provides search and GPS-reset handlers.
 *
 * @param {{
 *   globalUserLocation: object|null,
 *   locationLabel: string,
 *   locationLabelDetail: string,
 *   refreshLocation: function,
 *   emergencyUserLocation: object|null,
 *   setUserLocation: function,
 *   manualLocation: object|null,
 *   setManualLocation: function,
 *   setSheetPhase: function,
 *   setMapReadiness: function,
 *   setHasCompletedInitialMapLoad: function,
 *   isDarkMode: boolean,
 *   width: number,
 *   height: number,
 * }}
 */
export function useMapLocation({
  globalUserLocation,
  locationLabel,
  locationLabelDetail,
  refreshLocation,
  emergencyUserLocation,
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
  const activeLocation =
    manualLocation?.location ||
    emergencyUserLocation ||
    globalUserLocation ||
    null;

  const currentLocationDetails = buildHeaderLocationModel(
    manualLocation || {
      primaryText: locationLabel || "Current location",
      secondaryText: locationLabelDetail || "",
      location: activeLocation,
    },
  );

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
    const imageWidth = Math.max(360, Math.min(1280, Math.round((width || 390) * 1.4)));
    const imageHeight = Math.max(720, Math.min(1600, Math.round((height || 844) * 1.3)));

    return `https://api.mapbox.com/styles/v1/mapbox/${styleId}/static/${longitude.toFixed(5)},${latitude.toFixed(5)},13.2,0,0/${imageWidth}x${imageHeight}?logo=false&attribution=false&access_token=${encodeURIComponent(token)}`;
  }, [activeLocation, height, isDarkMode, width]);

  useEffect(() => {
    if (manualLocation?.location) {
      setUserLocation((current) => {
        const nextLocation = toEmergencyLocation(manualLocation.location);
        if (!nextLocation) return current;
        if (
          Number(current?.latitude) === nextLocation.latitude &&
          Number(current?.longitude) === nextLocation.longitude
        ) {
          return current;
        }
        return nextLocation;
      });
      return;
    }

    if (!globalUserLocation?.latitude || !globalUserLocation?.longitude) {
      return;
    }

    setUserLocation((current) => {
      const nextLocation = toEmergencyLocation(globalUserLocation);
      if (!nextLocation) return current;
      if (
        Number(current?.latitude) === nextLocation.latitude &&
        Number(current?.longitude) === nextLocation.longitude
      ) {
        return current;
      }
      return nextLocation;
    });
  }, [
    globalUserLocation?.latitude,
    globalUserLocation?.longitude,
    manualLocation?.location,
    setUserLocation,
  ]);

  const handleSearchLocation = useCallback(
    (nextLocation) => {
      if (!nextLocation?.location) return;
      const locationChanged = hasMeaningfulLocationChange(
        activeLocation,
        nextLocation.location,
      );
      if (locationChanged) {
        setHasCompletedInitialMapLoad(false);
      }
      setManualLocation(nextLocation);
      setSheetPhase(MAP_SHEET_PHASES.EXPLORE_INTENT);
      if (locationChanged) {
        setMapReadiness({
          mapReady: false,
          routeReady: false,
          isCalculatingRoute: false,
        });
      }
    },
    [
      activeLocation,
      setHasCompletedInitialMapLoad,
      setManualLocation,
      setMapReadiness,
      setSheetPhase,
    ],
  );

  const handleUseCurrentLocation = useCallback(async () => {
    const fallbackCurrentLocation =
      globalUserLocation || emergencyUserLocation || null;
    const locationChanged = manualLocation?.location
      ? hasMeaningfulLocationChange(
          manualLocation.location,
          fallbackCurrentLocation,
        )
      : false;

    if (locationChanged) {
      setHasCompletedInitialMapLoad(false);
    }
    setManualLocation(null);
    setSheetPhase(MAP_SHEET_PHASES.EXPLORE_INTENT);
    if (locationChanged) {
      setMapReadiness({
        mapReady: false,
        routeReady: false,
        isCalculatingRoute: false,
      });
    }
    await refreshLocation?.();
  }, [
    emergencyUserLocation,
    globalUserLocation,
    manualLocation?.location,
    refreshLocation,
    setHasCompletedInitialMapLoad,
    setManualLocation,
    setMapReadiness,
    setSheetPhase,
  ]);

  return {
    activeLocation,
    currentLocationDetails,
    loadingBackgroundImageUri,
    handleSearchLocation,
    handleUseCurrentLocation,
  };
}

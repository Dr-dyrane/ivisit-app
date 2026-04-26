// hooks/map/exploreFlow/useMapViewport.js
// PULLBACK NOTE: Extracted from useMapExploreFlow.js
// Owns: viewport variant derivation, surface config, sidebar layout flag + width

import { useMemo } from "react";
import { Platform, useWindowDimensions } from "react-native";
import {
  getMapViewportSurfaceConfig,
  getMapViewportVariant,
  isSidebarMapVariant,
} from "../../../components/map/core/mapViewportConfig";

/**
 * useMapViewport
 *
 * Derives all layout/viewport constants from screen dimensions and platform.
 * Pure memos — no effects, no state, no side effects.
 *
 * @returns {{
 *   width: number,
 *   height: number,
 *   viewportVariant: string,
 *   surfaceConfig: object,
 *   usesSidebarLayout: boolean,
 *   sidebarWidth: number,
 * }}
 */
export function useMapViewport() {
  const { width, height } = useWindowDimensions();

  const viewportVariant = useMemo(
    () => getMapViewportVariant({ platform: Platform.OS, width }),
    [width],
  );

  const surfaceConfig = useMemo(
    () => getMapViewportSurfaceConfig(viewportVariant),
    [viewportVariant],
  );

  const usesSidebarLayout = useMemo(
    () => isSidebarMapVariant(viewportVariant),
    [viewportVariant],
  );

  const sidebarWidth = useMemo(
    () =>
      usesSidebarLayout
        ? Math.min(
            surfaceConfig.sidebarMaxWidth || Math.max(400, width * 0.36),
            Math.max(320, width - 48),
          )
        : 0,
    [surfaceConfig.sidebarMaxWidth, usesSidebarLayout, width],
  );

  return {
    width,
    height,
    viewportVariant,
    surfaceConfig,
    usesSidebarLayout,
    sidebarWidth,
  };
}

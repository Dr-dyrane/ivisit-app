// hooks/map/exploreFlow/useMapEffects.js
// PULLBACK NOTE: Pass 15 — extracted from useMapExploreFlow.js
// OLD: useFocusEffect header reset block declared inline in orchestrator
// NEW: owned here — navigation lifecycle side effect isolated

import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { HEADER_MODES } from "../../../constants/header";

/**
 * useMapEffects
 *
 * Owns all navigation lifecycle effects for the map explore flow.
 * On screen focus: hides the global header and resets explore presentation.
 * On screen blur: restores header visibility.
 */
export function useMapEffects({
  resetHeader,
  resetHeaderState,
  lockHeaderHidden,
  unlockHeaderHidden,
  forceHeaderVisible,
  setHeaderState,
  resetExplorePresentation,
}) {
  useFocusEffect(
    useCallback(() => {
      resetHeader();
      resetHeaderState();
      lockHeaderHidden();
      setHeaderState({
        mode: HEADER_MODES.HIDDEN,
        hidden: true,
        scrollAware: false,
        layoutInsets: null,
      });
      resetExplorePresentation();
      return () => {
        unlockHeaderHidden();
        forceHeaderVisible();
        resetHeader();
        resetHeaderState();
      };
    }, [
      forceHeaderVisible,
      lockHeaderHidden,
      resetHeader,
      resetHeaderState,
      resetExplorePresentation,
      setHeaderState,
      unlockHeaderHidden,
    ]),
  );
}

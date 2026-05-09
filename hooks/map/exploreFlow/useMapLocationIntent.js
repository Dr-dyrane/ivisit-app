// hooks/map/exploreFlow/useMapLocationIntent.js
//
// PULLBACK NOTE: MapScreen decomposition Pass 9 — location intent race condition fix
// OLD: Two separate effects both transition to LOCATION_INTENT:
//      - MapScreen: when locationControl?.requiresLocationSelection && not yet prompted
//      - useMapExploreFlow: when isLocationOffTerminal && in EXPLORE_INTENT
// NEW: Single deterministic hook with priority-based transition logic
//
// Owns:
//   - Location intent transition logic (deterministic priority-based)
//   - Ref for gating location selection prompt (hasPromptedForPickupRef)
//
// Does NOT own:
//   - isLocationOffTerminal — from useMapLoadingState, passed in
//   - locationControl?.requiresLocationSelection — from useMapLocation, passed in
//   - setSheetPhase — from useMapExploreFlow, passed in
//   - sheetPhase — from useMapExploreFlow, passed in

import { useEffect, useRef } from "react";
import { MAP_SHEET_PHASES } from "../../../components/map/core/MapSheetOrchestrator";

/**
 * useMapLocationIntent
 *
 * Manages location intent sheet phase transitions deterministically.
 * - Priority 1: If location-off-terminal AND in EXPLORE_INTENT → LOCATION_INTENT
 * - Priority 2: If requiresLocationSelection AND not yet prompted → LOCATION_INTENT
 * - Otherwise: no transition
 *
 * This eliminates the race condition between two separate effects that could both
 * transition to LOCATION_INTENT based on different conditions.
 *
 * @param {Object} params
 * @param {boolean} params.isLocationOffTerminal - Whether location is off-terminal
 * @param {Object|null} params.locationControl - Location control object
 * @param {Function} params.setSheetPhase - Set sheet phase
 * @param {string} params.sheetPhase - Current sheet phase
 */
export function useMapLocationIntent({
  isLocationOffTerminal,
  locationControl,
  setSheetPhase,
  sheetPhase,
}) {
  const hasPromptedForPickupRef = useRef(false);

  useEffect(() => {
    // Priority 1: Location-off-terminal takes precedence
    // This is the more severe state (GPS disabled/denied, no valid location)
    if (isLocationOffTerminal && sheetPhase === MAP_SHEET_PHASES.EXPLORE_INTENT) {
      setSheetPhase(MAP_SHEET_PHASES.LOCATION_INTENT);
      hasPromptedForPickupRef.current = true;
      return;
    }

    // Priority 2: Requires location selection (user needs to manually set pickup)
    // Only prompt if we haven't already prompted this session
    if (locationControl?.requiresLocationSelection) {
      if (hasPromptedForPickupRef.current) {
        return;
      }
      if (sheetPhase !== MAP_SHEET_PHASES.EXPLORE_INTENT) {
        return;
      }

      hasPromptedForPickupRef.current = true;
      setSheetPhase(MAP_SHEET_PHASES.LOCATION_INTENT);
      return;
    }

    // Reset prompt flag when location is resolved
    // Allows re-prompting if location becomes invalid again
    if (!locationControl?.requiresLocationSelection && !isLocationOffTerminal) {
      hasPromptedForPickupRef.current = false;
    }
  }, [isLocationOffTerminal, locationControl, setSheetPhase, sheetPhase]);
}

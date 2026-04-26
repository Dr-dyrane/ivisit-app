/**
 * MapScreen Atoms
 *
 * Atomic state for MapScreen.jsx local state migration.
 * Replaces useState calls with Jotai atoms for better performance and debugging.
 */

import { atom } from "jotai";

// =============================================================================
// RATING RECOVERY STATE
// =============================================================================

/**
 * Tracks which rating recovery versions have been handled
 * Prevents duplicate rating modal triggers
 */
export const ratingRecoveryVersionAtom = atom(0);

/**
 * Stores claims for rating recovery (used when rating modal needs to be shown
 * after app restart or navigation)
 */
export const ratingRecoveryClaimsAtom = atom({});

/**
 * Stores recovered rating state when showing rating modal for completed trips
 * that were rated before app close/crash
 */
export const recoveredRatingStateAtom = atom(null);

/**
 * Currently selected history visit key for visit detail/rating
 */
export const selectedHistoryVisitKeyAtom = atom(null);

/**
 * Rating state for history visit (in-progress rating data)
 */
export const historyRatingStateAtom = atom(null);

// =============================================================================
// TRACKING ROUTE STATE
// =============================================================================

/**
 * Current tracking route information including duration, distance, and coordinates
 * Updated by Mapbox route calculation during active tracking
 */
export const trackingRouteInfoAtom = atom({
  durationSec: null,
  distanceMeters: null,
  coordinates: [],
});

/**
 * Whether a route is currently being calculated
 */
export const isCalculatingRouteAtom = atom(false);

/**
 * Route calculation error, if any
 */
export const routeCalculationErrorAtom = atom(null);

// =============================================================================
// MAPSCREEN UI STATE
// =============================================================================

/**
 * Whether MapScreen has completed initial load
 * Used to prevent premature interactions
 */
export const hasCompletedInitialLoadAtom = atom(false);

/**
 * Current map loading state for staged loading sequences
 */
export const mapLoadingStageAtom = atom("initial"); // 'initial' | 'map' | 'hospitals' | 'complete'

/**
 * FAB visibility state (controlled by FABContext but mirrored here for atomic access)
 */
export const mapFabVisibleAtom = atom(true);

// =============================================================================
// DERIVED ATOMS
// =============================================================================

/**
 * Whether there's an active route being tracked
 */
export const hasActiveRouteAtom = atom((get) => {
  const routeInfo = get(trackingRouteInfoAtom);
  return !!routeInfo.durationSec && routeInfo.coordinates.length > 0;
});

/**
 * Whether a rating modal should be shown based on recovery state
 */
export const shouldShowRecoveredRatingAtom = atom((get) => {
  const recoveredState = get(recoveredRatingStateAtom);
  const version = get(ratingRecoveryVersionAtom);
  return !!recoveredState && version > 0;
});

/**
 * Formatted route duration for display
 */
export const formattedRouteDurationAtom = atom((get) => {
  const routeInfo = get(trackingRouteInfoAtom);
  if (!routeInfo.durationSec) return null;

  const minutes = Math.ceil(routeInfo.durationSec / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours} hr ${remainingMinutes} min`
    : `${hours} hr`;
});

/**
 * Formatted route distance for display
 */
export const formattedRouteDistanceAtom = atom((get) => {
  const routeInfo = get(trackingRouteInfoAtom);
  if (!routeInfo.distanceMeters) return null;

  const km = routeInfo.distanceMeters / 1000;
  return km < 1
    ? `${Math.round(routeInfo.distanceMeters)} m`
    : `${km.toFixed(1)} km`;
});

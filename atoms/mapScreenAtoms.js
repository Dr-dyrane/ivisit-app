/**
 * MapScreen Atoms
 *
 * Atomic state for MapScreen.jsx local state migration.
 * Replaces useState calls with Jotai atoms for better performance and debugging.
 */

import { atom, getDefaultStore } from "jotai";
import { database, StorageKeys } from "../database";

// PULLBACK NOTE: Phase 8 — Persistent tracking visualization via database abstraction
// OLD: AsyncStorage direct (broke codebase contract)
// NEW: Routes through database/StorageKeys like all other persistent state in the app
//
// Tracking is live data; should never restart on Metro reload or cold start.
// Bundled into a single TRACKING_VISUALIZATION key (one read/write per change)
// rather than four separate keys.
//
// Hydration: at module load we kick off an async read. When it resolves we
// write the values directly into the atoms via Jotai's default store so
// subscribers re-render. Without this, the read function would read stale
// in-memory defaults because Jotai cannot track non-atom mutables.

const TRACKING_VIZ_DEFAULTS = {
  statusPhase: "en_route",
  progressValue: 0,
  hasSheetTitleAnimated: false,
  ratingState: {
    visible: false,
    visitId: null,
    completeKind: null,
    completionCommitted: false,
    serviceType: null,
    title: null,
    subtitle: null,
    serviceDetails: null,
  },
};

// Track each field's atom so hydration can broadcast values into Jotai
const trackingFieldAtoms = {};
let trackingVizHydrated = false;

const persistTrackingViz = () => {
  // Read current values directly from atoms (Jotai is source of truth)
  const store = getDefaultStore();
  const snapshot = Object.keys(trackingFieldAtoms).reduce((acc, key) => {
    acc[key] = store.get(trackingFieldAtoms[key]);
    return acc;
  }, {});
  database.write(StorageKeys.TRACKING_VISUALIZATION, snapshot).catch(() => {});
};

const hydrateTrackingViz = async () => {
  if (trackingVizHydrated) return;
  try {
    const value = await database.read(
      StorageKeys.TRACKING_VISUALIZATION,
      TRACKING_VIZ_DEFAULTS,
    );
    const merged = { ...TRACKING_VIZ_DEFAULTS, ...(value || {}) };
    const store = getDefaultStore();
    // Write hydrated values into each atom — triggers re-render of subscribers
    Object.keys(trackingFieldAtoms).forEach((field) => {
      if (merged[field] !== undefined) {
        store.set(trackingFieldAtoms[field], merged[field]);
      }
    });
  } finally {
    trackingVizHydrated = true;
  }
};

// Kick off hydration at module load (non-blocking)
hydrateTrackingViz();

/**
 * Build a persisting atom backed by the bundled TRACKING_VISUALIZATION storage entry.
 * Reads from a base atom (single source of truth, hydrated post-load).
 * Writes through database abstraction after every set.
 */
const persistedTrackingAtom = (field, defaultValue) => {
  const baseAtom = atom(defaultValue);
  trackingFieldAtoms[field] = baseAtom;
  const wrapped = atom(
    (get) => get(baseAtom),
    (_get, set, nextValue) => {
      const resolved =
        typeof nextValue === "function" ? nextValue(_get(baseAtom)) : nextValue;
      set(baseAtom, resolved);
      // Persist the full bundle (one write per change, all fields kept in sync)
      persistTrackingViz();
    },
  );
  return wrapped;
};

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
 * In-flow tracking rating state - persists across sheet phase transitions
 * Fixes rating modal not appearing when triggered outside tracking phase
 * PULLBACK NOTE: Phase 8 — Initialized with full shape to prevent null access errors
 */
export const INITIAL_TRACKING_RATING_STATE = {
  visible: false,
  visitId: null,
  completeKind: null,
  completionCommitted: false,
  serviceType: null,
  title: null,
  subtitle: null,
  serviceDetails: null,
};
// PULLBACK NOTE: Phase 8 — Rating state bundled into TRACKING_VISUALIZATION
// Survives Metro/cold start so rating modal context is never lost mid-flow
export const trackingRatingStateAtom = persistedTrackingAtom(
  "ratingState",
  INITIAL_TRACKING_RATING_STATE,
);

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

// =============================================================================
// TRACKING STATUS VISUALIZATION STATE (5-Layer State Management)
// =============================================================================

// PULLBACK NOTE: Phase 8 — Tracking status visualization atoms
// OLD: Local useState in hooks and components
// NEW: Jotai atoms for ephemeral UI state (5th layer of state management)

// PULLBACK NOTE: Phase 8 — Persistent tracking visualization state
// Tracking is live data; should never restart on Metro reload or cold start

/**
 * Current tracking status phase for visual theming (PERSISTED via database)
 * 'en_route' | 'approaching' | 'arrived' | 'completed'
 */
export const trackingStatusPhaseAtom = persistedTrackingAtom("statusPhase", "en_route");

/**
 * Tracking progress value (0-1) for gradient underlay and animations (PERSISTED via database)
 */
export const trackingProgressValueAtom = persistedTrackingAtom("progressValue", 0);

/**
 * Whether sheet title has animated for current status change (PERSISTED via database)
 * Prevents repeated animations across app reloads
 */
export const hasSheetTitleAnimatedAtom = persistedTrackingAtom(
  "hasSheetTitleAnimated",
  false,
);

/**
 * Current sheet title color based on tracking status
 * Updates dynamically for status changes
 */
export const sheetTitleColorAtom = atom((get) => {
  const statusPhase = get(trackingStatusPhaseAtom);
  const isDarkMode = get(mapThemeAtom); // Will be created if not exists

  // Status-based colors (maintaining theme contrast)
  const colors = {
    en_route: isDarkMode ? "#F87171" : "#DC2626", // Red
    approaching: isDarkMode ? "#FBBF24" : "#D97706", // Yellow/Orange
    arrived: isDarkMode ? "#34D399" : "#059669", // Green
    completed: isDarkMode ? "#6B7280" : "#9CA3AF", // Gray
  };

  return colors[statusPhase] || colors.en_route;
});

/**
 * Hero underlay gradient colors based on tracking progress
 * Red → Yellow → Green gradient for status visualization
 */
export const heroUnderlayGradientAtom = atom((get) => {
  const progress = get(trackingProgressValueAtom);
  const statusPhase = get(trackingStatusPhaseAtom);

  // Base gradient stops
  if (statusPhase === "arrived" || statusPhase === "completed") {
    return ["#10B981", "#34D399", "#6EE7B7"]; // Green gradient
  }

  if (progress < 0.33) {
    return ["#DC2626", "#EF4444", "#F87171"]; // Red gradient (early)
  } else if (progress < 0.66) {
    return ["#D97706", "#F59E0B", "#FBBF24"]; // Yellow/Orange gradient (mid)
  } else {
    return ["#059669", "#10B981", "#34D399"]; // Green gradient (late)
  }
});

/**
 * Derived atom for CTA group theme (muted except arrival)
 */
export const trackingCtaThemeAtom = atom((get) => {
  const statusPhase = get(trackingStatusPhaseAtom);
  const isDarkMode = get(mapThemeAtom);

  return {
    // Non-arrival CTAs: muted theme
    mutedBg: isDarkMode ? "rgba(75, 85, 99, 0.4)" : "rgba(229, 231, 235, 0.6)",
    mutedText: isDarkMode ? "#9CA3AF" : "#6B7280",

    // Arrival CTA: obvious green
    arrivalBg: statusPhase === "arrived" ? "#10B981" : "#059669",
    arrivalText: "#FFFFFF",
    arrivalGlow: statusPhase === "arrived",

    // Status pill (if shown): should match status
    statusBg: statusPhase === "en_route"
      ? "#FEE2E2"
      : statusPhase === "approaching"
        ? "#FEF3C7"
        : "#D1FAE5",
    statusText: statusPhase === "en_route"
      ? "#991B1B"
      : statusPhase === "approaching"
        ? "#92400E"
        : "#065F46",
  };
});

// Placeholder for mapThemeAtom (will be defined if needed)
const mapThemeAtom = atom(false);

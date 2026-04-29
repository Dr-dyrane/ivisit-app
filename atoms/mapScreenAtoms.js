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
    // PULLBACK NOTE: BUG-012 fix — PC class (Phase Contamination)
    // OLD: ratingState.visible:true was restored blindly, re-showing the rating modal
    //      on cold start even when the visit was already rated (app killed mid-flow).
    // NEW: strip visible:true at hydration time. Server truth is unavailable here
    //      (no auth context at module load). The useTrackingRatingFlow mount-time
    //      effect handles the authoritative RATED check once visits are loaded.
    if (merged.ratingState?.visible) {
      merged.ratingState = { ...merged.ratingState, visible: false };
    }
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

/**
 * History payment modal state — promoted from useState in useMapHistoryFlow
 * so useMapShell can read .visible without a call-order dependency
 */
export const historyPaymentStateAtom = atom({
  visible: false,
  loading: false,
  paymentRecord: null,
});

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
 * Sheet title color override.
 *
 * PULLBACK NOTE: Phase G — G-1 (Reduce status channels).
 * OLD: cycled red → yellow → green based on `statusPhase` (extra cognitive
 *      channel; competed with the hero progress fill for the user's eye).
 * NEW: returns `null` so `MapTrackingTopSlot` falls back to the neutral
 *      `themeTokens.titleColor`. Status is communicated via the hero progress
 *      fill alone — Apple HIG single-channel discipline. Title fade-in
 *      animation (`hasSheetTitleAnimatedAtom`) is preserved.
 */
export const sheetTitleColorAtom = atom(() => null);

/**
 * Hero underlay gradient colors driven by tracking phase.
 *
 * PULLBACK NOTE: Phase G — G-2 (Status palette refinement).
 * OLD: red → yellow → green progression on every trip; red was the dominant
 *      colour for any in-progress request, which read as "alarm" rather than
 *      "in progress" and conflicted with the brand's emergency-red usage.
 * NEW: two-state palette — `accent` (cool blue) for en-route + approaching,
 *      `success` (green) for arrived + completed. Red is reserved for
 *      `critical` (telemetry-lost, cancellation) which is handled separately
 *      by `telemetryHeroTone` in `mapTracking.theme.js`.
 *
 * Returns 3-stop arrays `[start, mid, end]` for `LinearGradient` consumers.
 */
const HERO_GRADIENT_ACCENT = ["#0EA5E9", "#38BDF8", "#7DD3FC"]; // sky-500 → 400 → 300
const HERO_GRADIENT_SUCCESS = ["#059669", "#10B981", "#34D399"]; // emerald-600 → 500 → 400

export const heroUnderlayGradientAtom = atom((get) => {
  const statusPhase = get(trackingStatusPhaseAtom);
  if (statusPhase === "arrived" || statusPhase === "completed") {
    return HERO_GRADIENT_SUCCESS;
  }
  return HERO_GRADIENT_ACCENT;
});

/**
 * Derived atom for CTA group theme (muted except arrival).
 *
 * PULLBACK NOTE: Phase G — G-2 (Status palette refinement).
 * OLD: status pill colors cycled red (`en_route`) → amber (`approaching`) →
 *      green (`arrived`). Red on every active trip == false alarm.
 * NEW: `en_route` + `approaching` share the calm `accent` (sky) palette;
 *      `arrived` keeps `success` (emerald). Red is no longer used for
 *      in-progress trips. Arrival CTA continues to "pop" green; non-arrival
 *      CTAs stay muted to keep the eye on the progress fill.
 */
export const trackingCtaThemeAtom = atom((get) => {
  const statusPhase = get(trackingStatusPhaseAtom);
  const isDarkMode = get(mapThemeAtom);

  const isArrivedPhase = statusPhase === "arrived" || statusPhase === "completed";

  return {
    // Non-arrival CTAs: muted theme
    mutedBg: isDarkMode ? "rgba(75, 85, 99, 0.4)" : "rgba(229, 231, 235, 0.6)",
    mutedText: isDarkMode ? "#9CA3AF" : "#6B7280",

    // Arrival CTA: HIG-success green
    arrivalBg: statusPhase === "arrived" ? "#10B981" : "#059669",
    arrivalText: "#FFFFFF",
    arrivalGlow: statusPhase === "arrived",

    // Status pill — accent (in-progress) vs success (arrived); never red.
    statusBg: isArrivedPhase
      ? (isDarkMode ? "rgba(16,185,129,0.18)" : "#D1FAE5")
      : (isDarkMode ? "rgba(56,189,248,0.18)" : "#E0F2FE"),
    statusText: isArrivedPhase
      ? (isDarkMode ? "#34D399" : "#065F46")
      : (isDarkMode ? "#7DD3FC" : "#075985"),
  };
});

// Placeholder for mapThemeAtom (will be defined if needed)
const mapThemeAtom = atom(false);

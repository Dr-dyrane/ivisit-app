import { atom } from "jotai";

/**
 * Map Flow Jotai Atoms
 *
 * UI state for map explore flow.
 * Replaces useMapExploreFlowStore for client-only UI state.
 * Server state (hospitals, trips) uses TanStack Query.
 */

// Core sheet state
export const mapSheetPhaseAtom = atom("EXPLORE_INTENT");
export const mapSheetSnapStateAtom = atom("HALF");
export const mapSheetPayloadAtom = atom(null);

// Selection state
export const mapSelectedHospitalIdAtom = atom(null);
export const mapFeaturedHospitalAtom = atom(null);
// Selected care mode (ambulance, bed, both)
export const mapSelectedCareAtom = atom(null);
// Service selections by hospital (for room/ambulance service selection)
export const mapServiceSelectionsByHospitalAtom = atom({});
export const mapSelectedCareModeAtom = atom(null);

// Search state
export const mapSearchModeAtom = atom("SEARCH");
export const mapSearchQueryAtom = atom("");
export const mapSearchResultsAtom = atom([]);

// Location state
export const mapManualLocationAtom = atom(null);
export const mapGuestProfileEmailAtom = atom(null);

// Map readiness
export const mapMapReadinessAtom = atom(null);
export const mapHasCompletedInitialMapLoadAtom = atom(false);

// Viewport state
export const mapViewportAtom = atom(null);
export const mapUserLocationAtom = atom(null);
export const mapRegionAtom = atom(null);

// Hospital data (client-side cache of TanStack Query results)
export const mapHospitalsAtom = atom([]);
export const mapVisibleHospitalsAtom = atom([]);
export const mapNearestHospitalAtom = atom(null);

// Loading & error states
export const mapIsLoadingAtom = atom(false);
export const mapErrorAtom = atom(null);

// Modal states
export const mapProfileModalVisibleAtom = atom(false);
export const mapGuestProfileVisibleAtom = atom(false);
export const mapCareHistoryVisibleAtom = atom(false);
export const mapRecentVisitsVisibleAtom = atom(false);
export const mapAuthModalVisibleAtom = atom(false);

// History modals
export const mapHistoryVisitDetailsVisibleAtom = atom(false);
export const mapSelectedHistoryVisitKeyAtom = atom(null);

// Rating modals
export const mapRecoveredRatingStateAtom = atom(null);
export const mapHistoryRatingStateAtom = atom(null);

// Derived atoms
export const mapHasSelectionAtom = atom((get) => {
  return !!get(mapSelectedHospitalIdAtom);
});

export const mapIsTrackingAtom = atom((get) => {
  return get(mapSheetPhaseAtom) === "TRACKING";
});

export const mapIsInCommitFlowAtom = atom((get) => {
  const phase = get(mapSheetPhaseAtom);
  return ["COMMIT_DETAILS", "COMMIT_TRIAGE", "COMMIT_PAYMENT"].includes(phase);
});

export const mapSelectedHospitalAtom = atom((get) => {
  const selectedId = get(mapSelectedHospitalIdAtom);
  const hospitals = get(mapHospitalsAtom);
  return hospitals.find((h) => h?.id === selectedId) || null;
});

// =============================================================================
// Pass 6 — sweep-local-state additions
// =============================================================================

// PULLBACK NOTE: Pass 6 — OLD: useState(null) in MapHospitalListContent — resets to "All" on every sheet phase change
// NEW: Jotai atom — specialty filter selection persists across sheet collapse/expand
export const mapHospitalListSelectedSpecialtyAtom = atom(null);

// PULLBACK NOTE: Pass 6 — OLD: useState(null) in MapHospitalDetailServiceRail — lost if detail sheet remounts mid-commit
// NEW: Jotai atom — service selection survives sheet remount so user's choice is preserved
export const mapHospitalServiceUncontrolledIdAtom = atom(null);

// PULLBACK NOTE: Pass 6 — OLD: useState(mode) in useMapSearchSheetModel — search mode resets to default on sheet collapse
// NEW: Jotai atom — active search mode (hospital vs location) survives collapse
export const mapSearchActiveModeAtom = atom(null); // null = use prop default on first mount

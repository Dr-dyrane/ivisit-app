import { atom } from "jotai";

/**
 * Emergency Flow Atoms
 *
 * Jotai atoms for emergency flow state management.
 * Provides atomic, composable state for UI components.
 */

// Core trip state atoms
export const activeAmbulanceTripAtom = atom(null);
export const activeBedBookingAtom = atom(null);
export const pendingApprovalAtom = atom(null);
export const commitFlowAtom = atom(null);

// UI state atoms
export const selectedHospitalIdAtom = atom(null);
export const emergencyModeAtom = atom("emergency"); // 'emergency' | 'booking'
export const serviceTypeAtom = atom(null); // null | 'premium' | 'standard'
export const selectedSpecialtyAtom = atom(null);
export const viewModeAtom = atom("map"); // 'map' | 'list'
export const telemetryNowMsAtom = atom(Date.now());

// Map-related atoms
export const userLocationAtom = atom(null);
export const mapRegionAtom = atom(null);
export const hospitalsAtom = atom([]);
export const visibleHospitalsAtom = atom([]);

// Coverage mode atoms
export const coverageModeAtom = atom("AUTO");
export const demoModeEnabledAtom = atom(false);

// Derived atoms (read-only computed state)
export const hasActiveTripAtom = atom((get) => {
  return !!(get(activeAmbulanceTripAtom) || get(activeBedBookingAtom));
});

export const activeRequestKindAtom = atom((get) => {
  if (get(activeAmbulanceTripAtom)) return "ambulance";
  if (get(activeBedBookingAtom)) return "bed";
  return null;
});

export const canRequestAmbulanceAtom = atom((get) => {
  const mode = get(emergencyModeAtom);
  const hasActive = get(hasActiveTripAtom);
  return mode === "emergency" && !hasActive;
});

export const canRequestBedAtom = atom((get) => {
  const mode = get(emergencyModeAtom);
  const hasActive = get(hasActiveTripAtom);
  return mode === "booking" && !hasActive;
});

// Animation sync atoms (for fixing timing desync issues)
export const ambulanceProgressAtom = atom(0); // 0-1 progress ratio
export const trackingEtaSecondsAtom = atom(null);
export const trackingStartedAtAtom = atom(null);

// Synced atom that coordinates animation and progress
export const trackingSyncAtom = atom((get) => ({
  progress: get(ambulanceProgressAtom),
  etaSeconds: get(trackingEtaSecondsAtom),
  startedAt: get(trackingStartedAtAtom),
  now: Date.now(),
}));

// Writable atom for updating trip with progress
export const updateAmbulanceProgressAtom = atom(
  null,
  (get, set, progress) => {
    set(ambulanceProgressAtom, progress);
    // Also update the trip atom if needed
    const trip = get(activeAmbulanceTripAtom);
    if (trip) {
      set(activeAmbulanceTripAtom, {
        ...trip,
        progress,
        updatedAt: Date.now(),
      });
    }
  }
);

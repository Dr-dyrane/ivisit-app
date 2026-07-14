import { useMemo } from 'react';
import useEmergencyTripStore from './emergencyTripStore';

// Telemetry thresholds
const TELEMETRY_STALE_THRESHOLD_MS = 30000;
const TELEMETRY_LOST_THRESHOLD_MS = 120000;

// Pure selectors - can be used outside React
export const selectActiveAmbulanceTrip = (state) => state.activeAmbulanceTrip;
export const selectActiveBedBooking = (state) => state.activeBedBooking;
export const selectPendingApproval = (state) => state.pendingApproval;
export const selectCommitFlow = (state) => state.commitFlow;

export const selectHasActiveTrip = (state) => {
  return !!(state.activeAmbulanceTrip?.requestId || state.activeBedBooking?.requestId);
};

export const selectActiveTripType = (state) => {
  if (state.activeAmbulanceTrip?.requestId) return 'ambulance';
  if (state.activeBedBooking?.requestId) return 'bed';
  return null;
};

export const selectAmbulanceTelemetryHealth = (state, nowMs = Date.now()) => {
  const trip = state.activeAmbulanceTrip;
  if (!trip?.requestId) {
    return createInactiveTelemetryHealth();
  }
  
  const status = String(trip.status ?? '').toLowerCase();
  const isTracked = ['accepted', 'in_progress', 'arrived'].includes(status);
  const hasLocation = !!(trip.currentResponderLocation || trip.assignedAmbulance?.location);
  const rawTs = trip.responderLocationReceivedAt ?? trip.responderTelemetryAt ?? null;
  const leaseExpiresAt = trip.responderTelemetryLeaseExpiresAt ?? null;
  const tsMs = rawTs ? Date.parse(rawTs) : null;
  const leaseExpiresAtMs = leaseExpiresAt ? Date.parse(leaseExpiresAt) : null;
  
  if (!isTracked || !hasLocation || !tsMs) {
    return createInactiveTelemetryHealth(rawTs, hasLocation);
  }
  
  const ageMs = Math.max(0, nowMs - tsMs);
  const ageSeconds = Math.floor(ageMs / 1000);
  const ageLabel = formatTelemetryAge(ageSeconds);
  
  let healthState = 'live';
  if (ageMs > TELEMETRY_LOST_THRESHOLD_MS) healthState = 'lost';
  else if (
    (Number.isFinite(leaseExpiresAtMs) && nowMs > leaseExpiresAtMs) ||
    (!Number.isFinite(leaseExpiresAtMs) && ageMs > TELEMETRY_STALE_THRESHOLD_MS)
  ) healthState = 'stale';
  
  return {
    state: healthState,
    ageMs,
    ageSeconds,
    ageLabel,
    lastUpdateAt: rawTs,
    leaseExpiresAt,
    hasResponderLocation: hasLocation,
    staleAfterMs: TELEMETRY_STALE_THRESHOLD_MS,
    lostAfterMs: TELEMETRY_LOST_THRESHOLD_MS,
    isFresh: healthState === 'live',
    isStale: healthState === 'stale',
    isLost: healthState === 'lost',
    summary: healthState === 'lost'
      ? `Signal lost ${ageLabel ? `${ageLabel} ago` : ''}`.trim()
      : healthState === 'stale'
        ? `Signal delayed ${ageLabel ? `${ageLabel} ago` : ''}`.trim()
        : 'Live tracking',
  };
};

export const selectTripProgress = (state, nowMs = Date.now()) => {
  const trip = state.activeAmbulanceTrip;
  if (!trip) return { progress: 0, remainingSeconds: null, isComplete: false };
  
  const status = String(trip.status ?? '').toLowerCase();
  if (status === 'completed') {
    return { progress: 1, remainingSeconds: 0, isComplete: true };
  }
  if (status === 'arrived') {
    return { progress: 1, remainingSeconds: 0, isComplete: false };
  }
  
  const etaSeconds = Number.isFinite(trip.etaSeconds) ? trip.etaSeconds : null;
  const startedAt = Number.isFinite(trip.startedAt) ? trip.startedAt : null;
  
  if (!etaSeconds || !startedAt) {
    return { progress: 0, remainingSeconds: etaSeconds, isComplete: false };
  }
  
  const elapsedSeconds = Math.max(0, (nowMs - startedAt) / 1000);
  const remainingSeconds = Math.max(0, Math.round(etaSeconds - elapsedSeconds));
  const progress = Math.min(1, elapsedSeconds / etaSeconds);
  
  return { progress, remainingSeconds, isComplete: false };
};

export const selectBedProgress = (state, nowMs = Date.now()) => {
  const booking = state.activeBedBooking;
  if (!booking) return { progress: 0, remainingSeconds: null };
  
  const status = String(booking.status ?? '').toLowerCase();
  if (status === 'arrived' || status === 'completed' || status === 'occupied') {
    return { progress: 1, remainingSeconds: 0 };
  }
  
  const etaSeconds = Number.isFinite(booking.etaSeconds) ? booking.etaSeconds : null;
  const startedAt = Number.isFinite(booking.startedAt) ? booking.startedAt : null;
  
  if (!etaSeconds || !startedAt) {
    return { progress: 0, remainingSeconds: etaSeconds };
  }
  
  const elapsedSeconds = Math.max(0, (nowMs - startedAt) / 1000);
  const remainingSeconds = Math.max(0, Math.round(etaSeconds - elapsedSeconds));
  const progress = Math.min(1, elapsedSeconds / etaSeconds);
  
  return { progress, remainingSeconds };
};

export const selectCanMarkArrived = (state) => {
  const trip = state.activeAmbulanceTrip;
  if (!trip) return false;
  const status = String(trip.status ?? '').toLowerCase();
  return status === 'arrived' && !trip.patientAcknowledgedArrivalAt;
};

export const selectCanCompleteAmbulance = (state) => {
  void state;
  return false;
};

export const selectCanCheckInBed = (state) => {
  void state;
  return false;
};

export const selectCanCompleteBed = (state) => {
  void state;
  return false;
};

// React hooks for derived state
export const useActiveAmbulanceTrip = () => 
  useEmergencyTripStore(selectActiveAmbulanceTrip);

export const useActiveBedBooking = () => 
  useEmergencyTripStore(selectActiveBedBooking);

export const usePendingApproval = () => 
  useEmergencyTripStore(selectPendingApproval);

export const useCommitFlow = () => 
  useEmergencyTripStore(selectCommitFlow);

export const useHasActiveTrip = () => 
  useEmergencyTripStore(selectHasActiveTrip);

export const useActiveTripType = () => 
  useEmergencyTripStore(selectActiveTripType);

export const useAmbulanceTelemetryHealth = (nowMs = Date.now()) => {
  const store = useEmergencyTripStore();
  return useMemo(() => selectAmbulanceTelemetryHealth(store, nowMs), [store, nowMs]);
};

export const useTripProgress = (nowMs = Date.now()) => {
  const store = useEmergencyTripStore();
  return useMemo(() => selectTripProgress(store, nowMs), [store, nowMs]);
};

export const useBedProgress = (nowMs = Date.now()) => {
  const store = useEmergencyTripStore();
  return useMemo(() => selectBedProgress(store, nowMs), [store, nowMs]);
};

// Helper functions
function createInactiveTelemetryHealth(lastUpdateAt = null, hasResponderLocation = false) {
  return {
    state: 'inactive',
    ageMs: null,
    ageSeconds: null,
    ageLabel: null,
    lastUpdateAt,
    leaseExpiresAt: null,
    hasResponderLocation,
    staleAfterMs: TELEMETRY_STALE_THRESHOLD_MS,
    lostAfterMs: TELEMETRY_LOST_THRESHOLD_MS,
    isFresh: false,
    isStale: false,
    isLost: false,
    summary: null,
  };
}

function formatTelemetryAge(ageSeconds) {
  if (!Number.isFinite(ageSeconds) || ageSeconds < 0) return null;
  if (ageSeconds < 60) return `${Math.round(ageSeconds)}s`;
  const mins = Math.floor(ageSeconds / 60);
  const secs = ageSeconds % 60;
  if (secs <= 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

/**
 * emergencyContextHelpers.js
 *
 * Pure, stateless helper functions extracted from EmergencyContext.
 * No React imports, no side effects. Safe to import anywhere.
 */

import { calculateBearing, isValidCoordinate } from "./mapUtils";

// ─── Constants ────────────────────────────────────────────────────────────────

export const AMBULANCE_LIVE_TRACK_STATUSES = new Set([
  "accepted",
  "in_progress",
  "arrived",
]);
export const TELEMETRY_STALE_THRESHOLD_MS = 30000;
export const TELEMETRY_LOST_THRESHOLD_MS = 120000;
export const REALTIME_RECOVERY_STATUSES = new Set([
  "CHANNEL_ERROR",
  "TIMED_OUT",
  "CLOSED",
]);
export const REALTIME_HEALTHY_STATUSES = new Set(["SUBSCRIBED"]);
export const REALTIME_TRUTH_SYNC_DEBOUNCE_MS = 6000;
export const DEMO_RESPONDER_HEARTBEAT_MS = 4000;

// ─── State helpers ────────────────────────────────────────────────────────────

export const parseTimestampMs = (value) => {
  if (!value) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const areRuntimeStateValuesEqual = (left, right) =>
  JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

export const resolveStateUpdate = (prev, nextValueOrUpdater) =>
  typeof nextValueOrUpdater === "function"
    ? nextValueOrUpdater(prev)
    : nextValueOrUpdater;

// ─── Telemetry ────────────────────────────────────────────────────────────────

const formatTelemetryAge = (ageSeconds) => {
  if (!Number.isFinite(ageSeconds) || ageSeconds < 0) return null;
  if (ageSeconds < 60) return `${Math.round(ageSeconds)}s`;
  const mins = Math.floor(ageSeconds / 60);
  const secs = ageSeconds % 60;
  if (secs <= 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
};

export const deriveAmbulanceTelemetryHealth = (trip, nowMs = Date.now()) => {
  const tripKey = trip?.requestId ?? trip?.id ?? null;
  const inactive = {
    state: "inactive",
    ageMs: null,
    ageSeconds: null,
    ageLabel: null,
    lastUpdateAt: null,
    hasResponderLocation: false,
    staleAfterMs: TELEMETRY_STALE_THRESHOLD_MS,
    lostAfterMs: TELEMETRY_LOST_THRESHOLD_MS,
    isFresh: false,
    isStale: false,
    isLost: false,
    summary: null,
  };
  if (!tripKey) return inactive;

  const status = String(trip?.status ?? "").toLowerCase();
  const isTrackedStatus = AMBULANCE_LIVE_TRACK_STATUSES.has(status);
  const hasResponderLocation = !!(
    trip?.currentResponderLocation || trip?.assignedAmbulance?.location
  );
  const rawTelemetryTs = trip?.responderTelemetryAt ?? trip?.updatedAt ?? null;
  const telemetryTsMs = parseTimestampMs(rawTelemetryTs);

  if (!isTrackedStatus || !hasResponderLocation || !telemetryTsMs) {
    return { ...inactive, lastUpdateAt: rawTelemetryTs, hasResponderLocation };
  }

  const ageMs = Math.max(0, nowMs - telemetryTsMs);
  const ageSeconds = Math.floor(ageMs / 1000);
  const ageLabel = formatTelemetryAge(ageSeconds);
  const state =
    ageMs > TELEMETRY_LOST_THRESHOLD_MS
      ? "lost"
      : ageMs > TELEMETRY_STALE_THRESHOLD_MS
        ? "stale"
        : "live";

  return {
    state,
    ageMs,
    ageSeconds,
    ageLabel,
    lastUpdateAt: rawTelemetryTs,
    hasResponderLocation,
    staleAfterMs: TELEMETRY_STALE_THRESHOLD_MS,
    lostAfterMs: TELEMETRY_LOST_THRESHOLD_MS,
    isFresh: state === "live",
    isStale: state === "stale",
    isLost: state === "lost",
    summary:
      state === "lost"
        ? `Signal lost ${ageLabel ? `${ageLabel} ago` : ""}`.trim()
        : state === "stale"
          ? `Signal delayed ${ageLabel ? `${ageLabel} ago` : ""}`.trim()
          : "Live tracking",
  };
};

// ─── Coordinate helpers ───────────────────────────────────────────────────────

export const normalizeCoordinate = (value) => {
  if (!value || typeof value !== "object") return null;
  if (isValidCoordinate(value)) {
    return {
      latitude: Number(value.latitude),
      longitude: Number(value.longitude),
    };
  }
  const geoPair = Array.isArray(value?.coordinates?.coordinates)
    ? value.coordinates.coordinates
    : Array.isArray(value?.geometry?.coordinates)
      ? value.geometry.coordinates
      : null;
  const latitude = Number(
    value.latitude ??
      value.lat ??
      value?.coords?.latitude ??
      value?.coordinate?.latitude ??
      value?.location?.latitude ??
      value?.coordinates?.latitude ??
      (geoPair ? geoPair[1] : NaN),
  );
  const longitude = Number(
    value.longitude ??
      value.lng ??
      value.lon ??
      value?.coords?.longitude ??
      value?.coordinate?.longitude ??
      value?.location?.longitude ??
      value?.coordinates?.longitude ??
      (geoPair ? geoPair[0] : NaN),
  );
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return { latitude, longitude };
  }
  return null;
};

export const normalizeRouteCoordinates = (route) => {
  if (!Array.isArray(route)) return [];
  return route
    .map((p) => normalizeCoordinate(p))
    .filter((p) => isValidCoordinate(p));
};

export const interpolateRoutePosition = (routeCoordinates, progressRatio) => {
  if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 2)
    return null;
  const bounded = Math.min(1, Math.max(0, progressRatio));
  const totalSegments = routeCoordinates.length - 1;
  const segmentProgress = bounded * totalSegments;
  const segIdx = Math.min(
    routeCoordinates.length - 2,
    Math.floor(segmentProgress),
  );
  const segRatio = segmentProgress - segIdx;
  const cur = routeCoordinates[segIdx];
  const nxt = routeCoordinates[segIdx + 1];
  return {
    coordinate: {
      latitude: cur.latitude + (nxt.latitude - cur.latitude) * segRatio,
      longitude: cur.longitude + (nxt.longitude - cur.longitude) * segRatio,
    },
    heading: calculateBearing(cur, nxt),
  };
};

// ─── Hospital helpers ─────────────────────────────────────────────────────────

export const enrichHospitalsWithServiceTypes = (hospitalList) => {
  if (!Array.isArray(hospitalList)) return [];
  return hospitalList.map((hospital, index) => {
    if (
      hospital.serviceTypes &&
      Array.isArray(hospital.serviceTypes) &&
      hospital.serviceTypes.length > 0
    ) {
      return hospital;
    }
    let serviceTypes = [];
    if (hospital.type === "premium") {
      serviceTypes = ["premium"];
      if (index % 3 === 0) serviceTypes.push("standard");
    } else {
      serviceTypes = ["standard"];
      if (index % 5 === 0) serviceTypes.push("premium");
    }
    return { ...hospital, serviceTypes };
  });
};

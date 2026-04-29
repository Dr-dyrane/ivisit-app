const TIMELINE_RECONCILE_TOLERANCE_SECONDS = 15;

export function parseTrackingTimestampMs(value) {
  if (Number.isFinite(value)) return Number(value);
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function hasUsableTrackingStartedAt(startedAt) {
  return Number.isFinite(parseTrackingTimestampMs(startedAt));
}

export function getTrackingEtaRemainingSeconds({
  etaSeconds,
  startedAt,
  nowMs = Date.now(),
}) {
  const resolvedEtaSeconds = Number(etaSeconds);
  const startedAtMs = parseTrackingTimestampMs(startedAt);
  if (
    !Number.isFinite(resolvedEtaSeconds) ||
    resolvedEtaSeconds <= 0 ||
    !Number.isFinite(startedAtMs)
  ) {
    return null;
  }
  const elapsedSeconds = Math.max(0, (nowMs - startedAtMs) / 1000);
  return Math.max(0, Math.round(resolvedEtaSeconds - elapsedSeconds));
}

export function shouldReconcileTrackingTimeline({
  routeEtaSeconds,
  tripEtaSeconds,
  tripStartedAt,
  hasPolylineRoute = false,
  nowMs = Date.now(),
  toleranceSeconds = TIMELINE_RECONCILE_TOLERANCE_SECONDS,
}) {
  const resolvedRouteEtaSeconds = Number(routeEtaSeconds);
  if (!Number.isFinite(resolvedRouteEtaSeconds) || resolvedRouteEtaSeconds <= 0) {
    return false;
  }

  const resolvedTripEtaSeconds = Number(tripEtaSeconds);
  if (!Number.isFinite(resolvedTripEtaSeconds) || resolvedTripEtaSeconds <= 0) {
    return true;
  }

  if (!hasUsableTrackingStartedAt(tripStartedAt)) {
    return true;
  }

  if (Math.abs(resolvedRouteEtaSeconds - resolvedTripEtaSeconds) > toleranceSeconds) {
    return true;
  }

  if (!hasPolylineRoute) {
    return false;
  }

  const snapshotRemainingSeconds = getTrackingEtaRemainingSeconds({
    etaSeconds: resolvedTripEtaSeconds,
    startedAt: tripStartedAt,
    nowMs,
  });

  if (!Number.isFinite(snapshotRemainingSeconds)) {
    return true;
  }

  return Math.abs(resolvedRouteEtaSeconds - snapshotRemainingSeconds) > toleranceSeconds;
}

export function normalizeTrackingRouteCoordinates(route = []) {
  if (!Array.isArray(route)) return [];
  return route
    .map((point) => ({
      latitude: Number(point?.latitude),
      longitude: Number(point?.longitude),
    }))
    .filter(
      (point) =>
        Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
    );
}

export function buildTrackingRouteSignature(route = []) {
  return normalizeTrackingRouteCoordinates(route)
    .map(
      (point) =>
        `${point.latitude.toFixed(5)}:${point.longitude.toFixed(5)}`,
    )
    .join("|");
}

function normalizeTrackingMetric(value) {
  const resolved = Number(value);
  if (!Number.isFinite(resolved) || resolved <= 0) {
    return null;
  }
  return Math.round(resolved);
}

export function normalizeTrackingRouteInfo(routeInfo = {}) {
  return {
    durationSec: normalizeTrackingMetric(routeInfo?.durationSec),
    distanceMeters: normalizeTrackingMetric(routeInfo?.distanceMeters),
    coordinates: normalizeTrackingRouteCoordinates(routeInfo?.coordinates),
  };
}

export function areTrackingRouteInfosEqual(left, right) {
  const normalizedLeft = normalizeTrackingRouteInfo(left);
  const normalizedRight = normalizeTrackingRouteInfo(right);

  return (
    normalizedLeft.durationSec === normalizedRight.durationSec &&
    normalizedLeft.distanceMeters === normalizedRight.distanceMeters &&
    buildTrackingRouteSignature(normalizedLeft.coordinates) ===
      buildTrackingRouteSignature(normalizedRight.coordinates)
  );
}

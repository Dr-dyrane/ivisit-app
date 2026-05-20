// hooks/map/tracking/useMapTrackingSync.js
// PULLBACK NOTE: MapScreen decomposition Pass 4 - tracking route reconciliation extracted.
//
// Owns:
//   - trackingRouteInfo (Jotai atom - live polyline data from EmergencyLocationPreviewMap)
//   - trackingRouteCoordinates (normalized coordinate array)
//   - activeTripRouteSignature (hash of the trip's stored route)
//   - trackingRouteSignature (hash of the live map route)
//   - trackingTimeline (etaSeconds + startedAt snapshot)
//   - Route-reconciliation useEffect -> calls patchActiveAmbulanceTrip when route/ETA drifts
//
// Does NOT own:
//   - activeAmbulanceTrip - comes from useMapExploreFlow (Zustand store)
//   - patchActiveAmbulanceTrip - action from useMapExploreFlow
//   - setTrackingRouteInfo - returned so MapScreen can wire it to EmergencyLocationPreviewMap

import { useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  isCalculatingRouteAtom,
  routeCalculationErrorAtom,
  trackingRouteInfoAtom,
} from "../../../atoms/mapScreenAtoms";
import {
  areTrackingRouteInfosEqual,
  buildTrackingRouteSignature,
  hasUsableTrackingStartedAt,
  normalizeTrackingRouteCoordinates,
  normalizeTrackingRouteInfo,
  shouldReconcileTrackingTimeline,
} from "../../../components/map/views/tracking/mapTracking.timeline";

function mergeTrackingRouteInfo(
  current,
  incoming,
  preserveDuringCalculation = false,
) {
  const normalizedCurrent = normalizeTrackingRouteInfo(current);
  const normalizedIncoming = normalizeTrackingRouteInfo(incoming);
  if (!preserveDuringCalculation) {
    return normalizedIncoming;
  }

  const currentCoordinates = normalizedCurrent.coordinates;
  const incomingCoordinates = normalizedIncoming.coordinates;

  return {
    requestKey:
      normalizedIncoming.requestKey ?? normalizedCurrent.requestKey ?? null,
    routeSource:
      normalizedIncoming.routeSource !== "none"
        ? normalizedIncoming.routeSource
        : normalizedCurrent.routeSource,
    durationSec:
      normalizedIncoming.durationSec ?? normalizedCurrent.durationSec ?? null,
    distanceMeters:
      normalizedIncoming.distanceMeters ??
      normalizedCurrent.distanceMeters ??
      null,
    coordinates:
      incomingCoordinates.length >= 2
        ? incomingCoordinates
        : currentCoordinates.length >= 2
          ? currentCoordinates
          : [],
  };
}

const EMPTY_TRACKING_ROUTE_INFO = {
  requestKey: null,
  routeSource: "none",
  durationSec: null,
  distanceMeters: null,
  coordinates: [],
};
const UNINITIALIZED_REQUEST_KEY = "__uninitialized_tracking_request__";

export function useMapTrackingSync({
  activeAmbulanceTrip,
  patchActiveAmbulanceTrip,
  activeRequestKey = null,
  isTrackingMapActive = false,
  trackingKind = null,
}) {
  const [trackingRouteInfo, setTrackingRouteInfoState] = useAtom(
    trackingRouteInfoAtom,
  );
  const setIsCalculatingRoute = useSetAtom(isCalculatingRouteAtom);
  const setRouteCalculationError = useSetAtom(routeCalculationErrorAtom);
  const previousRequestKeyRef = useRef(UNINITIALIZED_REQUEST_KEY);
  const explicitActiveRequestKey =
    activeRequestKey != null && activeRequestKey !== ""
      ? String(activeRequestKey)
      : null;
  const normalizedAmbulanceRequestKey =
    activeAmbulanceTrip?.requestId != null
      ? String(activeAmbulanceTrip.requestId)
      : activeAmbulanceTrip?.id != null
        ? String(activeAmbulanceTrip.id)
        : null;
  const normalizedActiveRequestKey =
    explicitActiveRequestKey ||
    (trackingKind === "ambulance" ? normalizedAmbulanceRequestKey : null);

  const setTrackingRouteInfo = useCallback(
    (nextRouteInfo) => {
      const nextPayload =
        nextRouteInfo && typeof nextRouteInfo === "object" ? nextRouteInfo : {};
      const scopedPayload = {
        ...nextPayload,
        requestKey: normalizedActiveRequestKey,
        routeSource: "live_route",
      };

      if ("isCalculatingRoute" in scopedPayload) {
        setIsCalculatingRoute(Boolean(scopedPayload.isCalculatingRoute));
      }

      if ("routeError" in scopedPayload) {
        setRouteCalculationError(scopedPayload.routeError ?? null);
      }

      setTrackingRouteInfoState((current) => {
        const merged = mergeTrackingRouteInfo(
          current,
          scopedPayload,
          Boolean(scopedPayload.isCalculatingRoute),
        );
        return areTrackingRouteInfosEqual(current, merged) ? current : merged;
      });
    },
    [
      setIsCalculatingRoute,
      setRouteCalculationError,
      setTrackingRouteInfoState,
      normalizedActiveRequestKey,
    ],
  );

  const activeTripRouteCoordinates = useMemo(
    () => normalizeTrackingRouteCoordinates(activeAmbulanceTrip?.route),
    [activeAmbulanceTrip?.route],
  );

  useEffect(() => {
    if (previousRequestKeyRef.current === normalizedActiveRequestKey) {
      return;
    }

    previousRequestKeyRef.current = normalizedActiveRequestKey;
    setIsCalculatingRoute(false);
    setRouteCalculationError(null);

    if (!normalizedActiveRequestKey) {
      setTrackingRouteInfoState((current) => {
        const reset = EMPTY_TRACKING_ROUTE_INFO;
        return areTrackingRouteInfosEqual(current, reset) ? current : reset;
      });
      return;
    }

    if (
      trackingKind === "ambulance" &&
      normalizedAmbulanceRequestKey === normalizedActiveRequestKey
    ) {
      // PULLBACK NOTE: ETA display fix — preserve the atom's existing durationSec when
      // seeding for a new request. EmergencyLocationPreviewMap's routeInfoChangeSignatureRef
      // won't re-fire (it already emitted this data before tracking opened), so overwriting
      // with null leaves the atom empty until the next route change. Prefer: store etaSeconds
      // if present, otherwise keep the live atom value, otherwise null.
      setTrackingRouteInfoState((current) => {
        const storeDuration =
          Number.isFinite(activeAmbulanceTrip?.etaSeconds) &&
          activeAmbulanceTrip.etaSeconds > 0
            ? Math.round(Number(activeAmbulanceTrip.etaSeconds))
            : null;
        const sameRequest = current?.requestKey === normalizedActiveRequestKey;
        const seededRouteInfo = normalizeTrackingRouteInfo({
          requestKey: normalizedActiveRequestKey,
          routeSource: storeDuration
            ? "trip"
            : sameRequest
              ? current?.routeSource
              : "none",
          durationSec:
            storeDuration ??
            (sameRequest ? current?.durationSec : null) ??
            null,
          coordinates: activeAmbulanceTrip?.route,
        });
        return areTrackingRouteInfosEqual(current, seededRouteInfo)
          ? current
          : seededRouteInfo;
      });
      return;
    }

    // PULLBACK NOTE: ETA fix — preserve durationSec in fallthrough reset (same reason as above).
    setTrackingRouteInfoState((current) => {
      const sameRequest = current?.requestKey === normalizedActiveRequestKey;
      const reset = {
        ...EMPTY_TRACKING_ROUTE_INFO,
        requestKey: normalizedActiveRequestKey,
        routeSource: sameRequest ? current?.routeSource : "none",
        durationSec: sameRequest ? (current?.durationSec ?? null) : null,
      };
      return areTrackingRouteInfosEqual(current, reset) ? current : reset;
    });
  }, [
    activeAmbulanceTrip?.etaSeconds,
    activeAmbulanceTrip?.route,
    normalizedActiveRequestKey,
    normalizedAmbulanceRequestKey,
    setIsCalculatingRoute,
    setRouteCalculationError,
    setTrackingRouteInfoState,
    trackingKind,
  ]);

  useEffect(() => {
    if (
      trackingKind !== "ambulance" ||
      !normalizedActiveRequestKey ||
      normalizedAmbulanceRequestKey !== normalizedActiveRequestKey ||
      activeTripRouteCoordinates.length < 2
    ) {
      return;
    }

    setTrackingRouteInfoState((current) => {
      const normalizedCurrent = normalizeTrackingRouteInfo(current);
      if (normalizedCurrent.coordinates.length >= 2) {
        return current;
      }

      const seeded = {
        ...normalizedCurrent,
        requestKey: normalizedActiveRequestKey,
        routeSource: normalizedCurrent.durationSec
          ? "stored_route"
          : normalizedCurrent.routeSource,
        durationSec:
          normalizedCurrent.durationSec ??
          (Number.isFinite(activeAmbulanceTrip?.etaSeconds)
            ? Math.round(Number(activeAmbulanceTrip.etaSeconds))
            : null),
        coordinates: activeTripRouteCoordinates,
      };

      return areTrackingRouteInfosEqual(current, seeded) ? current : seeded;
    });
  }, [
    activeAmbulanceTrip?.etaSeconds,
    activeTripRouteCoordinates,
    normalizedActiveRequestKey,
    normalizedAmbulanceRequestKey,
    setTrackingRouteInfoState,
    trackingKind,
  ]);

  const scopedTrackingRouteInfo =
    trackingRouteInfo?.requestKey === normalizedActiveRequestKey
      ? trackingRouteInfo
      : EMPTY_TRACKING_ROUTE_INFO;

  const trackingRouteCoordinates = useMemo(
    () =>
      normalizeTrackingRouteCoordinates(scopedTrackingRouteInfo?.coordinates),
    [scopedTrackingRouteInfo?.coordinates],
  );

  const activeTripRouteSignature = useMemo(
    () => buildTrackingRouteSignature(activeAmbulanceTrip?.route),
    [activeAmbulanceTrip?.route],
  );

  const trackingRouteSignature = useMemo(
    () => buildTrackingRouteSignature(trackingRouteCoordinates),
    [trackingRouteCoordinates],
  );

  const trackingTimeline = useMemo(
    () => ({
      etaSeconds:
        activeAmbulanceTrip?.etaSeconds ??
        scopedTrackingRouteInfo?.durationSec ??
        null,
      startedAt: activeAmbulanceTrip?.startedAt ?? null,
    }),
    [
      activeAmbulanceTrip?.etaSeconds,
      activeAmbulanceTrip?.startedAt,
      scopedTrackingRouteInfo?.durationSec,
    ],
  );

  useEffect(() => {
    if (
      !isTrackingMapActive ||
      trackingKind !== "ambulance" ||
      !activeAmbulanceTrip?.requestId ||
      typeof patchActiveAmbulanceTrip !== "function"
    ) {
      return;
    }

    const updates = {};
    const nowMs = Date.now();
    const routeEtaSeconds = Number(scopedTrackingRouteInfo?.durationSec);
    const rawTripEtaSeconds = activeAmbulanceTrip?.etaSeconds;
    const hasPolylineRoute = trackingRouteCoordinates.length >= 2;
    const shouldReconcileRouteTimeline = shouldReconcileTrackingTimeline({
      routeEtaSeconds,
      tripEtaSeconds: rawTripEtaSeconds,
      tripStartedAt: activeAmbulanceTrip?.startedAt,
      hasPolylineRoute,
      nowMs,
    });

    if (shouldReconcileRouteTimeline) {
      updates.etaSeconds = routeEtaSeconds;
      updates.estimatedArrival = `${Math.max(
        1,
        Math.ceil(routeEtaSeconds / 60),
      )} min`;
      updates.etaSource = scopedTrackingRouteInfo?.routeSource || "live_route";
      updates.startedAt = nowMs;
    }

    if (
      !shouldReconcileRouteTimeline &&
      !hasUsableTrackingStartedAt(activeAmbulanceTrip?.startedAt)
    ) {
      updates.startedAt = nowMs;
    }

    if (
      trackingRouteCoordinates.length >= 2 &&
      trackingRouteSignature &&
      trackingRouteSignature !== activeTripRouteSignature
    ) {
      updates.route = trackingRouteCoordinates;
    }

    if (Object.keys(updates).length > 0) {
      patchActiveAmbulanceTrip(updates);
    }
  }, [
    activeAmbulanceTrip?.etaSeconds,
    activeAmbulanceTrip?.requestId,
    activeAmbulanceTrip?.startedAt,
    activeTripRouteSignature,
    isTrackingMapActive,
    patchActiveAmbulanceTrip,
    trackingKind,
    trackingRouteCoordinates,
    scopedTrackingRouteInfo?.durationSec,
    scopedTrackingRouteInfo?.routeSource,
    trackingRouteSignature,
  ]);

  return {
    trackingRouteInfo,
    setTrackingRouteInfo,
    trackingTimeline,
  };
}

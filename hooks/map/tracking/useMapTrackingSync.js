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
  const [trackingRouteInfo, setTrackingRouteInfoState] =
    useAtom(trackingRouteInfoAtom);
  const setIsCalculatingRoute = useSetAtom(isCalculatingRouteAtom);
  const setRouteCalculationError = useSetAtom(routeCalculationErrorAtom);
  const previousRequestKeyRef = useRef(UNINITIALIZED_REQUEST_KEY);
  const normalizedActiveRequestKey =
    activeRequestKey != null && activeRequestKey !== ""
      ? String(activeRequestKey)
      : null;
  const normalizedAmbulanceRequestKey =
    activeAmbulanceTrip?.requestId != null
      ? String(activeAmbulanceTrip.requestId)
      : activeAmbulanceTrip?.id != null
        ? String(activeAmbulanceTrip.id)
        : null;

  const setTrackingRouteInfo = useCallback(
    (nextRouteInfo) => {
      const nextPayload =
        nextRouteInfo && typeof nextRouteInfo === "object" ? nextRouteInfo : {};

      if ("isCalculatingRoute" in nextPayload) {
        setIsCalculatingRoute(Boolean(nextPayload.isCalculatingRoute));
      }

      if ("routeError" in nextPayload) {
        setRouteCalculationError(nextPayload.routeError ?? null);
      }

      setTrackingRouteInfoState((current) => {
        const merged = mergeTrackingRouteInfo(
          current,
          nextPayload,
          Boolean(nextPayload.isCalculatingRoute),
        );
        return areTrackingRouteInfosEqual(current, merged) ? current : merged;
      });
    },
    [
      setIsCalculatingRoute,
      setRouteCalculationError,
      setTrackingRouteInfoState,
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
      setTrackingRouteInfoState((current) =>
        areTrackingRouteInfosEqual(current, EMPTY_TRACKING_ROUTE_INFO)
          ? current
          : EMPTY_TRACKING_ROUTE_INFO,
      );
      return;
    }

    if (
      trackingKind === "ambulance" &&
      normalizedAmbulanceRequestKey === normalizedActiveRequestKey
    ) {
      const seededRouteInfo = normalizeTrackingRouteInfo({
        durationSec: activeAmbulanceTrip?.etaSeconds ?? null,
        coordinates: activeAmbulanceTrip?.route,
      });
      setTrackingRouteInfoState((current) =>
        areTrackingRouteInfosEqual(current, seededRouteInfo)
          ? current
          : seededRouteInfo,
      );
      return;
    }

    setTrackingRouteInfoState((current) =>
      areTrackingRouteInfosEqual(current, EMPTY_TRACKING_ROUTE_INFO)
        ? current
        : EMPTY_TRACKING_ROUTE_INFO,
    );
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

  const trackingRouteCoordinates = useMemo(
    () => normalizeTrackingRouteCoordinates(trackingRouteInfo?.coordinates),
    [trackingRouteInfo?.coordinates],
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
        activeAmbulanceTrip?.etaSeconds ?? trackingRouteInfo?.durationSec ?? null,
      startedAt: activeAmbulanceTrip?.startedAt ?? null,
    }),
    [
      activeAmbulanceTrip?.etaSeconds,
      activeAmbulanceTrip?.startedAt,
      trackingRouteInfo?.durationSec,
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
    const routeEtaSeconds = Number(trackingRouteInfo?.durationSec);
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
      updates.etaSource = "map_route";
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
    trackingRouteInfo?.durationSec,
    trackingRouteSignature,
  ]);

  return {
    trackingRouteInfo,
    setTrackingRouteInfo,
    trackingTimeline,
  };
}

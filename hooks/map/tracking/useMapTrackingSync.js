// hooks/map/tracking/useMapTrackingSync.js
// PULLBACK NOTE: MapScreen decomposition Pass 4 — tracking route reconciliation extracted.
//
// Owns:
//   - trackingRouteInfo (useState — live polyline data from EmergencyLocationPreviewMap)
//   - trackingRouteCoordinates (normalised coordinate array)
//   - activeTripRouteSignature (hash of the trip's stored route)
//   - trackingRouteSignature (hash of the live map route)
//   - trackingTimeline (etaSeconds + startedAt snapshot)
//   - Route-reconciliation useEffect → calls patchActiveAmbulanceTrip when route/ETA drifts
//
// Does NOT own:
//   - activeAmbulanceTrip — comes from useMapExploreFlow (Zustand store)
//   - patchActiveAmbulanceTrip — action from useMapExploreFlow
//   - setTrackingRouteInfo — returned so MapScreen can wire it to EmergencyLocationPreviewMap

import { useEffect, useMemo, useState } from "react";
import {
  buildTrackingRouteSignature,
  hasUsableTrackingStartedAt,
  normalizeTrackingRouteCoordinates,
  shouldReconcileTrackingTimeline,
} from "../../../components/map/views/tracking/mapTracking.timeline";

export function useMapTrackingSync({ activeAmbulanceTrip, patchActiveAmbulanceTrip }) {
  const [trackingRouteInfo, setTrackingRouteInfo] = useState({
    durationSec: null,
    distanceMeters: null,
    coordinates: [],
  });

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
      updates.estimatedArrival = `${Math.max(1, Math.ceil(routeEtaSeconds / 60))} min`;
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
    patchActiveAmbulanceTrip,
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

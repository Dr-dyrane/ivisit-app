/**
 * useEmergencyActions.js
 *
 * Owns: startAmbulanceTrip, stopAmbulanceTrip, startBedBooking, stopBedBooking,
 * demo responder heartbeat, and telemetry ticker.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AmbulanceStatus } from "../../constants/emergency";
import {
  emergencyRequestsService,
  EmergencyRequestStatus,
} from "../../services/emergencyRequestsService";
import { normalizeBedBookingRuntimeState } from "./bedBookingRuntime";
import {
  AMBULANCE_LIVE_TRACK_STATUSES,
  DEMO_RESPONDER_HEARTBEAT_MS,
  deriveAmbulanceTelemetryHealth,
  normalizeCoordinate,
  normalizeRouteCoordinates,
  interpolateRoutePosition,
} from "../../utils/emergencyContextHelpers";
import { isValidCoordinate } from "../../utils/mapUtils";
import { useEmergencyTripStore } from "../../stores/emergencyTripStore";
import { ACTIVE_TRIP_QUERY_KEY } from "./useActiveTripQuery";

const DEMO_LIFECYCLE_TICK_MS = 4000;
const DEMO_DISPATCH_RETRY_MS = 8000;
const DEMO_COMPLETION_DELAY_MS = 2000;

const getRequestIdentityKeys = (record) => {
  if (!record || typeof record !== "object") return [];
  return [
    record.requestId,
    record.id,
    record._realId,
    record.displayId,
    record.display_id,
  ]
    .filter((value) => value != null && value !== "")
    .map((value) => String(value));
};

const hasSameRequestIdentity = (a, b) => {
  const aKeys = getRequestIdentityKeys(a);
  const bKeys = getRequestIdentityKeys(b);
  if (aKeys.length === 0 || bKeys.length === 0) return false;
  return aKeys.some((key) => bKeys.includes(key));
};

const normalizeTripIdentity = (trip) => {
  const canonicalRequestId =
    trip?.id != null && trip.id !== ""
      ? String(trip.id)
      : trip?._realId != null && trip._realId !== ""
        ? String(trip._realId)
        : trip?.request?.id != null && trip.request.id !== ""
          ? String(trip.request.id)
          : trip?.requestId != null && trip.requestId !== ""
            ? String(trip.requestId)
            : null;
  const displayId =
    trip?.displayId != null && trip.displayId !== ""
      ? String(trip.displayId)
      : trip?.display_id != null && trip.display_id !== ""
        ? String(trip.display_id)
        : trip?.request?.display_id != null && trip.request.display_id !== ""
          ? String(trip.request.display_id)
          : trip?.requestId != null && trip.requestId !== ""
            ? String(trip.requestId)
            : canonicalRequestId;

  return { canonicalRequestId, displayId };
};

export function useEmergencyActions({
  activeAmbulanceTrip,
  activeBedBookingRef,
  activeAmbulanceTripRef,
  userLocationRef,
  activeAmbulances,
  setActiveAmbulanceTrip,
  setActiveBedBooking,
  patchActiveAmbulanceTrip,
  parseEtaToSeconds,
  getActiveAmbulanceDemoHospital,
  resetAmbulanceEventVersion,
}) {
  const queryClient = useQueryClient();
  const [telemetryNowMs, setTelemetryNowMs] = useState(Date.now());
  const demoLifecycleSyncRef = useRef({
    requestId: null,
    action: null,
    inFlight: false,
    lastAttemptAt: 0,
  });
  const transitionPendingToActive = useEmergencyTripStore(
    (s) => s.transitionPendingToActive,
  );

  // Telemetry ticker — only runs when trip is in a live-tracked status
  useEffect(() => {
    const shouldTrack =
      !!activeAmbulanceTrip?.requestId &&
      AMBULANCE_LIVE_TRACK_STATUSES.has(
        String(activeAmbulanceTrip?.status ?? "").toLowerCase(),
      );
    if (!shouldTrack) return;

    setTelemetryNowMs(Date.now());
    const intervalId = setInterval(() => setTelemetryNowMs(Date.now()), 5000);
    return () => clearInterval(intervalId);
  }, [activeAmbulanceTrip?.requestId, activeAmbulanceTrip?.status]);

  const ambulanceTelemetryHealth = useMemo(
    () => deriveAmbulanceTelemetryHealth(activeAmbulanceTrip, telemetryNowMs),
    [activeAmbulanceTrip, telemetryNowMs],
  );

  // Demo responder heartbeat
  const activeAmbulanceDemoHospital =
    getActiveAmbulanceDemoHospital(activeAmbulanceTrip);

  useEffect(() => {
    const requestId = activeAmbulanceTrip?.requestId ?? null;
    if (!requestId || !activeAmbulanceDemoHospital) return;

    let cancelled = false;
    const syncLifecycle = async () => {
      const trip = activeAmbulanceTripRef.current;
      if (!trip || String(trip?.requestId ?? "") !== String(requestId)) return;

      const status = String(trip?.status ?? "").toLowerCase();
      let action = null;
      if (status === EmergencyRequestStatus.IN_PROGRESS) {
        action = "ensure_dispatch";
      } else if (status === EmergencyRequestStatus.ACCEPTED) {
        const etaSeconds =
          Number.isFinite(trip?.etaSeconds) && trip.etaSeconds > 0
            ? Number(trip.etaSeconds)
            : 600;
        const startedAt = Number.isFinite(trip?.startedAt)
          ? Number(trip.startedAt)
          : null;
        if (
          Number.isFinite(startedAt) &&
          Math.max(0, (Date.now() - startedAt) / 1000) >= etaSeconds
        ) {
          action = "mark_arrived";
        }
      } else if (
        status === EmergencyRequestStatus.ARRIVED &&
        trip?.patientAcknowledgedArrivalAt
      ) {
        const acknowledgedAt = Date.parse(trip.patientAcknowledgedArrivalAt);
        if (
          Number.isFinite(acknowledgedAt) &&
          Date.now() - acknowledgedAt >= DEMO_COMPLETION_DELAY_MS
        ) {
          action = "mark_completed";
        }
      }
      if (!action) return;

      const syncState = demoLifecycleSyncRef.current;
      const now = Date.now();
      const sameAttempt =
        syncState.requestId === requestId && syncState.action === action;
      const retryWindow = action === "ensure_dispatch"
        ? DEMO_DISPATCH_RETRY_MS
        : DEMO_LIFECYCLE_TICK_MS;
      if (
        syncState.inFlight ||
        (sameAttempt && now - syncState.lastAttemptAt < retryWindow)
      ) {
        return;
      }

      demoLifecycleSyncRef.current = {
        requestId,
        action,
        inFlight: true,
        lastAttemptAt: now,
      };
      try {
        const result = await emergencyRequestsService.syncDemoResponderLifecycle(
          requestId,
          action,
        );
        if (!cancelled && result?.success === true) {
          await queryClient.invalidateQueries({ queryKey: ACTIVE_TRIP_QUERY_KEY });
        }
      } catch (error) {
        if (__DEV__ && !cancelled) {
          console.warn(
            `[useEmergencyActions] Demo lifecycle ${action} failed:`,
            error?.message || error,
          );
        }
      } finally {
        if (
          demoLifecycleSyncRef.current.requestId === requestId &&
          demoLifecycleSyncRef.current.action === action
        ) {
          demoLifecycleSyncRef.current.inFlight = false;
        }
      }
    };

    void syncLifecycle();
    const intervalId = setInterval(syncLifecycle, DEMO_LIFECYCLE_TICK_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [
    activeAmbulanceDemoHospital,
    activeAmbulanceTrip?.requestId,
    activeAmbulanceTripRef,
    queryClient,
  ]);

  useEffect(() => {
    const requestId = activeAmbulanceTrip?.requestId ?? null;
    if (!requestId || !activeAmbulanceDemoHospital) return;

    const status = String(activeAmbulanceTrip?.status ?? "").toLowerCase();
    if (status !== EmergencyRequestStatus.ACCEPTED) return;

    const hospitalCoordinate =
      normalizeCoordinate(activeAmbulanceDemoHospital?.coordinates) ||
      (Number.isFinite(activeAmbulanceDemoHospital?.latitude) &&
      Number.isFinite(activeAmbulanceDemoHospital?.longitude)
        ? {
            latitude: Number(activeAmbulanceDemoHospital.latitude),
            longitude: Number(activeAmbulanceDemoHospital.longitude),
          }
        : null);

    const tickHeartbeat = () => {
      const trip = activeAmbulanceTripRef.current;
      if (!trip || trip?.requestId !== requestId) return;
      const tripStatus = String(trip?.status ?? "").toLowerCase();
      if (tripStatus !== EmergencyRequestStatus.ACCEPTED) return;

      const now = Date.now();
      const nowIso = new Date(now).toISOString();
      const leaseExpiresAt = new Date(
        now + DEMO_RESPONDER_HEARTBEAT_MS * 3,
      ).toISOString();
      const explicitRoute = normalizeRouteCoordinates(trip?.route);
      const reversedRoute =
        explicitRoute.length >= 2 ? [...explicitRoute].reverse() : [];
      const destinationCoordinate =
        normalizeCoordinate(trip?.patientLocation) ||
        normalizeCoordinate(userLocationRef.current);
      const syntheticRoute =
        reversedRoute.length >= 2
          ? reversedRoute
          : isValidCoordinate(hospitalCoordinate) &&
              isValidCoordinate(destinationCoordinate)
            ? [hospitalCoordinate, destinationCoordinate]
            : [];

      const reportCanonicalTelemetry = (coordinate, heading = 0) => {
        const normalized = normalizeCoordinate(coordinate);
        if (!isValidCoordinate(normalized)) return;
        void emergencyRequestsService
          .syncDemoResponderLifecycle(requestId, "report_telemetry", {
            telemetry: {
              location: normalized,
              heading: Number.isFinite(Number(heading)) ? Number(heading) : 0,
              accuracyMeters: 5,
            },
          })
          .catch((error) => {
            if (__DEV__) {
              console.warn(
                "[useEmergencyActions] Demo telemetry sync failed:",
                error?.message || error,
              );
            }
          });
      };

      if (syntheticRoute.length < 2) {
        reportCanonicalTelemetry(
          trip?.currentResponderLocation || hospitalCoordinate,
          trip?.currentResponderHeading,
        );
        patchActiveAmbulanceTrip({
          responderTelemetryAt: nowIso,
          responderTelemetryLeaseExpiresAt: leaseExpiresAt,
        });
        return;
      }

      const etaSeconds =
        Number.isFinite(trip?.etaSeconds) && trip.etaSeconds > 0
          ? trip.etaSeconds
          : 600;
      const startedAt = Number.isFinite(trip?.startedAt) ? trip.startedAt : now;
      const elapsedSeconds = Math.max(0, (now - startedAt) / 1000);
      const progressRatio = Math.min(0.985, elapsedSeconds / etaSeconds);
      const projected = interpolateRoutePosition(syntheticRoute, progressRatio);

      if (!projected?.coordinate) {
        reportCanonicalTelemetry(
          trip?.currentResponderLocation || hospitalCoordinate,
          trip?.currentResponderHeading,
        );
        patchActiveAmbulanceTrip({
          responderTelemetryAt: nowIso,
          responderTelemetryLeaseExpiresAt: leaseExpiresAt,
        });
        return;
      }

      const previousCoordinate = normalizeCoordinate(
        trip?.currentResponderLocation,
      );
      const previousHeading = Number.isFinite(trip?.currentResponderHeading)
        ? Number(trip.currentResponderHeading)
        : null;
      const locationChanged =
        !previousCoordinate ||
        Math.abs(previousCoordinate.latitude - projected.coordinate.latitude) >
          0.000001 ||
        Math.abs(
          previousCoordinate.longitude - projected.coordinate.longitude,
        ) > 0.000001;
      const headingChanged =
        previousHeading === null ||
        Math.abs(previousHeading - projected.heading) > 0.1;

      const updates = {
        responderTelemetryAt: nowIso,
        responderTelemetryLeaseExpiresAt: leaseExpiresAt,
      };
      reportCanonicalTelemetry(projected.coordinate, projected.heading);
      if (locationChanged)
        updates.currentResponderLocation = projected.coordinate;
      if (headingChanged) updates.currentResponderHeading = projected.heading;
      patchActiveAmbulanceTrip(updates);
    };

    tickHeartbeat();
    const intervalId = setInterval(tickHeartbeat, DEMO_RESPONDER_HEARTBEAT_MS);
    return () => clearInterval(intervalId);
  }, [
    activeAmbulanceDemoHospital,
    activeAmbulanceTrip?.requestId,
    activeAmbulanceTrip?.status,
    patchActiveAmbulanceTrip,
    activeAmbulanceTripRef,
    userLocationRef,
  ]);

  // ─── Trip actions ─────────────────────────────────────────────────────────

  const startAmbulanceTrip = useCallback(
    (trip) => {
      if (!trip?.hospitalId) return;
      const { canonicalRequestId, displayId } = normalizeTripIdentity(trip);

      // DIAGNOSTIC LOG
      const logPrefix = `[EmergencyActions.startAmbulanceTrip ${Date.now().toString(36).slice(-4)}]`;
      console.log(`${logPrefix} Called with:`, {
        requestId: trip?.requestId,
        canonicalRequestId,
        displayId,
        status: trip?.status,
        assignedAmbulanceName: trip?.assignedAmbulance?.name,
        stack: new Error().stack?.split("\n").slice(1, 4).join(" | "),
      });

      const etaSeconds = Number.isFinite(trip?.etaSeconds)
        ? trip.etaSeconds
        : parseEtaToSeconds(trip?.estimatedArrival);
      const explicitAssigned =
        trip?.assignedAmbulance && typeof trip.assignedAmbulance === "object"
          ? trip.assignedAmbulance
          : null;
      const byId = trip?.ambulanceId
        ? (activeAmbulances.find((a) => a?.id === trip.ambulanceId) ?? null)
        : null;
      const byHospital = trip?.hospitalName
        ? (activeAmbulances.find((a) => a?.hospital === trip.hospitalName) ??
          null)
        : null;
      // PULLBACK NOTE: Pass 1 raw-status sweep — OLD: "available" inline  NEW: AmbulanceStatus.AVAILABLE
      const fallback =
        activeAmbulances.find((a) => a?.status === AmbulanceStatus.AVAILABLE) ??
        activeAmbulances[0] ??
        null;
      const hasAcceptedResponder = [
        EmergencyRequestStatus.ACCEPTED,
        EmergencyRequestStatus.ARRIVED,
        EmergencyRequestStatus.COMPLETED,
      ].includes(String(trip?.status ?? "").toLowerCase());
      const discoveredAssigned = hasAcceptedResponder
        ? byId ?? byHospital ?? fallback
        : null;
      const assignedAmbulance = explicitAssigned
        ? { ...(discoveredAssigned || {}), ...explicitAssigned }
        : discoveredAssigned;
      const hospitalCoordinate = normalizeCoordinate(trip?.hospitalCoordinate);
      const triageSnapshot =
        trip?.triageSnapshot ??
        trip?.triage ??
        (trip?.triageCheckin
          ? { signals: { userCheckin: trip.triageCheckin } }
          : null);
      const triageCheckin =
        trip?.triageCheckin ?? triageSnapshot?.signals?.userCheckin ?? null;

      console.log(
        `${logPrefix} Setting trip with assignedAmbulance.name:`,
        assignedAmbulance?.name,
      );

      const nextTrip = {
        id: trip.id ?? null,
        hospitalId: trip.hospitalId,
        requestId: canonicalRequestId,
        displayId,
        status: trip.status ?? null,
        ambulanceId: assignedAmbulance?.id ?? trip.ambulanceId ?? null,
        ambulanceType: trip.ambulanceType ?? assignedAmbulance?.type ?? null,
        estimatedArrival: trip.estimatedArrival ?? null,
        etaSeconds: Number.isFinite(etaSeconds) ? etaSeconds : null,
        assignedAmbulance,
        startedAt: hasAcceptedResponder
          ? Number.isFinite(trip?.startedAt)
            ? trip.startedAt
            : Date.now()
          : null,
        currentResponderLocation:
          hasAcceptedResponder
            ? trip?.currentResponderLocation ??
              hospitalCoordinate ??
              assignedAmbulance?.location ??
              null
            : null,
        patientLocation: trip?.patientLocation ?? null,
        route: normalizeRouteCoordinates(trip?.route),
        currentResponderHeading: Number.isFinite(trip?.currentResponderHeading)
          ? hasAcceptedResponder
            ? trip.currentResponderHeading
            : null
          : hasAcceptedResponder && Number.isFinite(assignedAmbulance?.heading)
            ? assignedAmbulance.heading
            : null,
        triage: triageSnapshot,
        triageSnapshot,
        triageCheckin,
        triageProgress:
          trip?.triageProgress ?? triageSnapshot?.progress ?? null,
        responderTelemetryAt:
          trip?.responderLocationReceivedAt ??
          trip?.responderTelemetryAt ??
          assignedAmbulance?.locationReceivedAt ??
          null,
        responderLocationObservedAt:
          trip?.responderLocationObservedAt ??
          assignedAmbulance?.locationObservedAt ??
          null,
        responderLocationAccuracyMeters:
          trip?.responderLocationAccuracyMeters ??
          assignedAmbulance?.locationAccuracyMeters ??
          null,
        responderTelemetrySequence:
          trip?.responderTelemetrySequence ??
          assignedAmbulance?.telemetrySequence ??
          null,
        responderTelemetryLeaseExpiresAt:
          trip?.responderTelemetryLeaseExpiresAt ??
          assignedAmbulance?.telemetryLeaseExpiresAt ??
          null,
        patientAcknowledgedArrivalAt:
          trip?.patientAcknowledgedArrivalAt ?? null,
        updatedAt: trip?.updatedAt ?? null,
      };

      const pendingApproval = useEmergencyTripStore.getState().pendingApproval;
      if (
        pendingApproval?.serviceType === "ambulance" &&
        hasSameRequestIdentity(pendingApproval, nextTrip)
      ) {
        transitionPendingToActive(nextTrip);
        return;
      }

      setActiveAmbulanceTrip(nextTrip);
    },
    [
      activeAmbulances,
      parseEtaToSeconds,
      setActiveAmbulanceTrip,
      transitionPendingToActive,
    ],
  );

  const stopAmbulanceTrip = useCallback(() => {
    // DIAGNOSTIC LOG
    const logPrefix = `[EmergencyActions.stopAmbulanceTrip ${Date.now().toString(36).slice(-4)}]`;
    console.log(
      `${logPrefix} Called`,
      new Error().stack?.split("\n").slice(1, 4).join(" | "),
    );

    resetAmbulanceEventVersion();
    setActiveAmbulanceTrip(null);
  }, [resetAmbulanceEventVersion, setActiveAmbulanceTrip]);

  const startBedBooking = useCallback(
    (booking) => {
      if (!booking?.hospitalId) return;
      setActiveBedBooking(
        normalizeBedBookingRuntimeState(booking, activeBedBookingRef.current),
      );
    },
    [activeBedBookingRef, setActiveBedBooking],
  );

  const stopBedBooking = useCallback(
    () => setActiveBedBooking(null),
    [setActiveBedBooking],
  );

  return {
    ambulanceTelemetryHealth,
    startAmbulanceTrip,
    stopAmbulanceTrip,
    startBedBooking,
    stopBedBooking,
  };
}

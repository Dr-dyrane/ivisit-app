/**
 * useEmergencyActions.js
 *
 * Owns: startAmbulanceTrip, stopAmbulanceTrip, startBedBooking, stopBedBooking,
 * demo responder heartbeat, and telemetry ticker.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AmbulanceStatus } from "../../constants/emergency";
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
	const [telemetryNowMs, setTelemetryNowMs] = useState(Date.now());

	// Telemetry ticker — only runs when trip is in a live-tracked status
	useEffect(() => {
		const shouldTrack =
			!!activeAmbulanceTrip?.requestId &&
			AMBULANCE_LIVE_TRACK_STATUSES.has(String(activeAmbulanceTrip?.status ?? "").toLowerCase());
		if (!shouldTrack) return;

		setTelemetryNowMs(Date.now());
		const intervalId = setInterval(() => setTelemetryNowMs(Date.now()), 5000);
		return () => clearInterval(intervalId);
	}, [activeAmbulanceTrip?.requestId, activeAmbulanceTrip?.status]);

	const ambulanceTelemetryHealth = useMemo(
		() => deriveAmbulanceTelemetryHealth(activeAmbulanceTrip, telemetryNowMs),
		[activeAmbulanceTrip, telemetryNowMs]
	);

	// Demo responder heartbeat
	const activeAmbulanceDemoHospital = getActiveAmbulanceDemoHospital(activeAmbulanceTrip);

	useEffect(() => {
		const requestId = activeAmbulanceTrip?.requestId ?? null;
		if (!requestId || !activeAmbulanceDemoHospital) return;

		const status = String(activeAmbulanceTrip?.status ?? "").toLowerCase();
		if (!AMBULANCE_LIVE_TRACK_STATUSES.has(status)) return;

		const hospitalCoordinate =
			normalizeCoordinate(activeAmbulanceDemoHospital?.coordinates) ||
			(Number.isFinite(activeAmbulanceDemoHospital?.latitude) && Number.isFinite(activeAmbulanceDemoHospital?.longitude)
				? { latitude: Number(activeAmbulanceDemoHospital.latitude), longitude: Number(activeAmbulanceDemoHospital.longitude) }
				: null);

		const tickHeartbeat = () => {
			const trip = activeAmbulanceTripRef.current;
			if (!trip || trip?.requestId !== requestId) return;
			const tripStatus = String(trip?.status ?? "").toLowerCase();
			if (!AMBULANCE_LIVE_TRACK_STATUSES.has(tripStatus)) return;

			const now = Date.now();
			const nowIso = new Date(now).toISOString();
			const explicitRoute = normalizeRouteCoordinates(trip?.route);
			const reversedRoute = explicitRoute.length >= 2 ? [...explicitRoute].reverse() : [];
			const destinationCoordinate =
				normalizeCoordinate(trip?.patientLocation) || normalizeCoordinate(userLocationRef.current);
			const syntheticRoute =
				reversedRoute.length >= 2
					? reversedRoute
					: isValidCoordinate(hospitalCoordinate) && isValidCoordinate(destinationCoordinate)
						? [hospitalCoordinate, destinationCoordinate]
						: [];

			if (syntheticRoute.length < 2) {
				patchActiveAmbulanceTrip({ responderTelemetryAt: nowIso, updatedAt: nowIso });
				return;
			}

			const etaSeconds = Number.isFinite(trip?.etaSeconds) && trip.etaSeconds > 0 ? trip.etaSeconds : 600;
			const startedAt = Number.isFinite(trip?.startedAt) ? trip.startedAt : now;
			const elapsedSeconds = Math.max(0, (now - startedAt) / 1000);
			const progressRatio = Math.min(0.985, elapsedSeconds / etaSeconds);
			const projected = interpolateRoutePosition(syntheticRoute, progressRatio);

			if (!projected?.coordinate) {
				patchActiveAmbulanceTrip({ responderTelemetryAt: nowIso, updatedAt: nowIso });
				return;
			}

			const previousCoordinate = normalizeCoordinate(trip?.currentResponderLocation);
			const previousHeading = Number.isFinite(trip?.currentResponderHeading) ? Number(trip.currentResponderHeading) : null;
			const locationChanged =
				!previousCoordinate ||
				Math.abs(previousCoordinate.latitude - projected.coordinate.latitude) > 0.000001 ||
				Math.abs(previousCoordinate.longitude - projected.coordinate.longitude) > 0.000001;
			const headingChanged = previousHeading === null || Math.abs(previousHeading - projected.heading) > 0.1;

			const updates = { responderTelemetryAt: nowIso, updatedAt: nowIso };
			if (locationChanged) updates.currentResponderLocation = projected.coordinate;
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

			// DIAGNOSTIC LOG
			const logPrefix = `[EmergencyActions.startAmbulanceTrip ${Date.now().toString(36).slice(-4)}]`;
			console.log(`${logPrefix} Called with:`, {
				requestId: trip?.requestId,
				status: trip?.status,
				assignedAmbulanceName: trip?.assignedAmbulance?.name,
				stack: new Error().stack?.split('\n').slice(1, 4).join(' | ')
			});

			const etaSeconds = Number.isFinite(trip?.etaSeconds)
				? trip.etaSeconds
				: parseEtaToSeconds(trip?.estimatedArrival);
			const explicitAssigned =
				trip?.assignedAmbulance && typeof trip.assignedAmbulance === "object" ? trip.assignedAmbulance : null;
			const byId = trip?.ambulanceId ? activeAmbulances.find((a) => a?.id === trip.ambulanceId) ?? null : null;
			const byHospital = trip?.hospitalName ? activeAmbulances.find((a) => a?.hospital === trip.hospitalName) ?? null : null;
			// PULLBACK NOTE: Pass 1 raw-status sweep — OLD: "available" inline  NEW: AmbulanceStatus.AVAILABLE
			const fallback = activeAmbulances.find((a) => a?.status === AmbulanceStatus.AVAILABLE) ?? activeAmbulances[0] ?? null;
			const discoveredAssigned = byId ?? byHospital ?? fallback;
			const assignedAmbulance = explicitAssigned
				? { ...(discoveredAssigned || {}), ...explicitAssigned }
				: discoveredAssigned;
			const hospitalCoordinate = normalizeCoordinate(trip?.hospitalCoordinate);
			const triageSnapshot =
				trip?.triageSnapshot ?? trip?.triage ??
				(trip?.triageCheckin ? { signals: { userCheckin: trip.triageCheckin } } : null);
			const triageCheckin = trip?.triageCheckin ?? triageSnapshot?.signals?.userCheckin ?? null;

			console.log(`${logPrefix} Setting trip with assignedAmbulance.name:`, assignedAmbulance?.name);

			setActiveAmbulanceTrip({
				id: trip.id ?? null,
				hospitalId: trip.hospitalId,
				requestId: trip.requestId ?? null,
				status: trip.status ?? null,
				ambulanceId: assignedAmbulance?.id ?? trip.ambulanceId ?? null,
				ambulanceType: trip.ambulanceType ?? assignedAmbulance?.type ?? null,
				estimatedArrival: trip.estimatedArrival ?? null,
				etaSeconds: Number.isFinite(etaSeconds) ? etaSeconds : null,
				assignedAmbulance,
				startedAt: Number.isFinite(trip?.startedAt) ? trip.startedAt : Date.now(),
				currentResponderLocation:
					trip?.currentResponderLocation ?? hospitalCoordinate ?? assignedAmbulance?.location ?? null,
				patientLocation: trip?.patientLocation ?? null,
				route: normalizeRouteCoordinates(trip?.route),
				currentResponderHeading: Number.isFinite(trip?.currentResponderHeading)
					? trip.currentResponderHeading
					: Number.isFinite(assignedAmbulance?.heading) ? assignedAmbulance.heading : null,
				triage: triageSnapshot,
				triageSnapshot,
				triageCheckin,
				triageProgress: trip?.triageProgress ?? triageSnapshot?.progress ?? null,
				responderTelemetryAt: trip?.responderTelemetryAt ?? trip?.updatedAt ?? null,
				updatedAt: trip?.updatedAt ?? null,
			});
		},
		[activeAmbulances, parseEtaToSeconds, setActiveAmbulanceTrip]
	);

	const stopAmbulanceTrip = useCallback(() => {
		// DIAGNOSTIC LOG
		const logPrefix = `[EmergencyActions.stopAmbulanceTrip ${Date.now().toString(36).slice(-4)}]`;
		console.log(`${logPrefix} Called`, new Error().stack?.split('\n').slice(1, 4).join(' | '));

		resetAmbulanceEventVersion();
		setActiveAmbulanceTrip(null);
	}, [resetAmbulanceEventVersion, setActiveAmbulanceTrip]);

	const startBedBooking = useCallback(
		(booking) => {
			if (!booking?.hospitalId) return;
			setActiveBedBooking(normalizeBedBookingRuntimeState(booking, activeBedBookingRef.current));
		},
		[activeBedBookingRef, setActiveBedBooking]
	);

	const stopBedBooking = useCallback(() => setActiveBedBooking(null), [setActiveBedBooking]);

	return {
		ambulanceTelemetryHealth,
		startAmbulanceTrip,
		stopAmbulanceTrip,
		startBedBooking,
		stopBedBooking,
	};
}

/**
 * useEmergencyServerSync.js
 *
 * Owns: syncActiveTripsFromServer — fetches active emergency_requests from
 * the server and hydrates activeAmbulanceTrip, activeBedBooking, pendingApproval.
 * Also owns ambulance detail hydration (lazy enrichment of assignedAmbulance).
 */

import { useCallback, useEffect, useRef } from "react";
import { supabase } from "../../services/supabase";
import { emergencyRequestsService } from "../../services/emergencyRequestsService";
import { ambulanceService } from "../../services/ambulanceService";
import { normalizeBedBookingRuntimeState } from "./bedBookingRuntime";
import { parsePointGeometry } from "../../utils/emergencyRealtimeProjection";
import {
	normalizeRouteCoordinates,
	normalizeCoordinate,
} from "../../utils/emergencyContextHelpers";

const isActiveStatus = (status) =>
	status === "pending_approval" ||
	status === "in_progress" ||
	status === "accepted" ||
	status === "arrived";

export function useEmergencyServerSync({
	activeAmbulanceTripRef,
	activeBedBookingRef,
	setActiveAmbulanceTrip,
	setActiveBedBooking,
	setPendingApproval,
	parseEtaToSeconds,
}) {
	const syncActiveTripsInFlightRef = useRef(false);
	const lastHydratedAmbulanceIdRef = useRef(null);
	const isHydratingAmbulanceRef = useRef(false);

	const syncActiveTripsFromServer = useCallback(
		async (reason = "manual", { waitForSession = false } = {}) => {
			if (syncActiveTripsInFlightRef.current) return;
			syncActiveTripsInFlightRef.current = true;

			try {
				if (waitForSession) {
					let attempt = 0;
					while (attempt < 10) {
						const { data: { user: sessionUser } } = await supabase.auth.getUser();
						if (sessionUser) break;
						attempt += 1;
						await new Promise((resolve) => setTimeout(resolve, 400));
					}
				}

				const activeRequests = await emergencyRequestsService.list();
				const parsePoint = parsePointGeometry;

				const activeAmbulance = activeRequests.find(
					(r) => r?.serviceType === "ambulance" && isActiveStatus(r?.status)
				);
				const activeBed = activeRequests.find(
					(r) => r?.serviceType === "bed" && isActiveStatus(r?.status)
				);

				if (activeAmbulance) {
					const previousAmbulanceTrip = activeAmbulanceTripRef.current;
					const isSameAmbulanceTrip = !!(
						previousAmbulanceTrip &&
						((previousAmbulanceTrip?.id && activeAmbulance?.id &&
							String(previousAmbulanceTrip.id) === String(activeAmbulance.id)) ||
							(previousAmbulanceTrip?.requestId && activeAmbulance?.requestId &&
								String(previousAmbulanceTrip.requestId) === String(activeAmbulance.requestId)))
					);

					const loc = parsePoint(activeAmbulance.responderLocation);
					let fullAmbulance = null;
					if (activeAmbulance.ambulanceId) {
						try {
							fullAmbulance = await ambulanceService.getById(activeAmbulance.ambulanceId);
						} catch (_error) {
							fullAmbulance = null;
						}
					}

					const hydratedAtMs = Date.now();
					const serverEtaSeconds = parseEtaToSeconds(activeAmbulance.estimatedArrival);
					const preservedRoute = isSameAmbulanceTrip
						? normalizeRouteCoordinates(previousAmbulanceTrip?.route)
						: [];
					const preservedStartedAtMs = isSameAmbulanceTrip
						? (typeof previousAmbulanceTrip?.startedAt === "number" ? previousAmbulanceTrip.startedAt : null)
						: null;
					const preservedEtaSeconds =
						isSameAmbulanceTrip &&
						previousAmbulanceTrip?.etaSource === "map_route" &&
						Number.isFinite(previousAmbulanceTrip?.etaSeconds) &&
						previousAmbulanceTrip.etaSeconds > 0
							? Number(previousAmbulanceTrip.etaSeconds)
							: null;
					const etaSource = Number.isFinite(preservedEtaSeconds) ? "map_route" : "server_snapshot";
					const etaSeconds = Number.isFinite(preservedEtaSeconds)
						? preservedEtaSeconds
						: Number.isFinite(serverEtaSeconds) ? serverEtaSeconds : null;
					const startedAt = Number.isFinite(preservedStartedAtMs)
						? preservedStartedAtMs
						: Number.isFinite(etaSeconds) ? hydratedAtMs : null;

					const triageSnapshot =
						activeAmbulance.triageSnapshot ??
						activeAmbulance.triage ??
						(activeAmbulance.triageCheckin
							? { signals: { userCheckin: activeAmbulance.triageCheckin } }
							: null);
					const triageCheckin =
						activeAmbulance.triageCheckin ?? triageSnapshot?.signals?.userCheckin ?? null;
					const hasResponderIdentity = !!(
						activeAmbulance.responderName || activeAmbulance.responderPhone ||
						activeAmbulance.responderVehicleType || activeAmbulance.responderVehiclePlate ||
						activeAmbulance.ambulanceId || loc
					);

					setActiveAmbulanceTrip({
						id: activeAmbulance.id ?? null,
						hospitalId: activeAmbulance.hospitalId,
						requestId: activeAmbulance.requestId,
						status: activeAmbulance.status,
						triage: triageSnapshot,
						triageSnapshot,
						triageCheckin,
						triageProgress: activeAmbulance.triageProgress ?? triageSnapshot?.progress ?? null,
						estimatedArrival:
							etaSource === "map_route"
								? previousAmbulanceTrip?.estimatedArrival ?? activeAmbulance.estimatedArrival ?? null
								: activeAmbulance.estimatedArrival ?? null,
						etaSeconds: Number.isFinite(etaSeconds) ? etaSeconds : null,
						etaSource,
						startedAt,
						assignedAmbulance: hasResponderIdentity
							? {
									...fullAmbulance,
									...(previousAmbulanceTrip?.assignedAmbulance || {}),
									id: activeAmbulance.ambulanceId || "ems_001",
									type: activeAmbulance.responderVehicleType || fullAmbulance?.type || "Ambulance",
									plate: activeAmbulance.responderVehiclePlate || fullAmbulance?.vehicleNumber,
									name: activeAmbulance.responderName,
									phone: activeAmbulance.responderPhone,
									location:
										loc || fullAmbulance?.location ||
										previousAmbulanceTrip?.assignedAmbulance?.location || null,
									heading:
										activeAmbulance.responderHeading || fullAmbulance?.heading ||
										previousAmbulanceTrip?.assignedAmbulance?.heading || 0,
							  }
							: previousAmbulanceTrip?.assignedAmbulance || null,
						currentResponderLocation: loc || previousAmbulanceTrip?.currentResponderLocation || null,
						currentResponderHeading:
							activeAmbulance.responderHeading ?? previousAmbulanceTrip?.currentResponderHeading ?? null,
						responderTelemetryAt: activeAmbulance.updatedAt ?? null,
						patientLocation: parsePoint(activeAmbulance.patientLocation),
						route: preservedRoute.length >= 2 ? preservedRoute : null,
						updatedAt: activeAmbulance.updatedAt ?? null,
					});
				} else {
					setActiveAmbulanceTrip(null);
				}

				if (activeBed) {
					setActiveBedBooking(
						normalizeBedBookingRuntimeState(
							{
								id: activeBed.id ?? null,
								hospitalId: activeBed.hospitalId,
								bookingId: activeBed.bookingId ?? activeBed.requestId ?? null,
								requestId: activeBed.requestId ?? activeBed.bookingId ?? null,
								status: activeBed.status ?? null,
								triage: activeBed.triage ?? null,
								triageSnapshot: activeBed.triageSnapshot ?? null,
								triageCheckin: activeBed.triageCheckin ?? null,
								triageProgress: activeBed.triageProgress ?? null,
								bedNumber: activeBed.bedNumber ?? null,
								bedType: activeBed.bedType ?? null,
								bedCount: activeBed.bedCount ?? null,
								specialty: activeBed.specialty ?? null,
								hospitalName: activeBed.hospitalName ?? null,
								estimatedWait: activeBed.estimatedArrival ?? null,
								estimatedArrival: activeBed.estimatedArrival ?? null,
							},
							activeBedBookingRef.current,
						),
					);
				} else {
					setActiveBedBooking(null);
				}

				const pendingMatch = activeRequests.find((r) => r?.status === "pending_approval");
				if (pendingMatch) {
					const pendingEtaSeconds = parseEtaToSeconds(pendingMatch.estimatedArrival);
					const triageSnapshot =
						pendingMatch.triageSnapshot ??
						pendingMatch.triage ??
						(pendingMatch.triageCheckin
							? { signals: { userCheckin: pendingMatch.triageCheckin } }
							: null);
					setPendingApproval({
						id: pendingMatch.id ?? null,
						requestId: pendingMatch.requestId,
						displayId: pendingMatch.displayId ?? pendingMatch.requestId ?? null,
						hospitalId: pendingMatch.hospitalId,
						hospitalName: pendingMatch.hospitalName,
						serviceType: pendingMatch.serviceType,
						ambulanceType: pendingMatch.responderVehicleType,
						specialty: pendingMatch.specialty ?? null,
						bedNumber: pendingMatch.bedNumber ?? null,
						bedType: pendingMatch.bedType,
						bedCount: pendingMatch.bedCount ?? null,
						totalAmount: pendingMatch.totalCost ?? null,
						paymentStatus: pendingMatch.paymentStatus ?? null,
						estimatedArrival: pendingMatch.estimatedArrival ?? null,
						etaSeconds: Number.isFinite(pendingEtaSeconds) ? pendingEtaSeconds : null,
						triageSnapshot,
						triageCheckin:
							pendingMatch.triageCheckin ?? triageSnapshot?.signals?.userCheckin ?? null,
						triageProgress:
							pendingMatch.triageProgress ?? triageSnapshot?.progress ?? null,
					});
				} else {
					setPendingApproval(null);
				}
			} catch (error) {
				console.warn(`[useEmergencyServerSync] Truth sync failed (${reason}):`, error);
			} finally {
				syncActiveTripsInFlightRef.current = false;
			}
		},
		[activeAmbulanceTripRef, activeBedBookingRef, setActiveAmbulanceTrip, setActiveBedBooking, setPendingApproval, parseEtaToSeconds]
	);

	// Initial hydrate on mount
	useEffect(() => {
		syncActiveTripsFromServer("initial_hydrate", { waitForSession: true });
	}, [syncActiveTripsFromServer]);

	// Lazy ambulance detail enrichment
	const hydrateAmbulanceDetails = useCallback((activeAmbulanceTrip, setActiveAmbulanceTrip) => {
		const assigned = activeAmbulanceTrip?.assignedAmbulance;
		const ambulanceId = assigned?.id ?? null;
		if (!ambulanceId) return;
		if (lastHydratedAmbulanceIdRef.current === ambulanceId) return;
		if (isHydratingAmbulanceRef.current) return;

		const needsHydrate =
			!Number.isFinite(assigned?.rating) ||
			!Array.isArray(assigned?.crew) ||
			(!assigned?.vehicleNumber && !assigned?.callSign);
		if (!needsHydrate) {
			lastHydratedAmbulanceIdRef.current = ambulanceId;
			return;
		}

		isHydratingAmbulanceRef.current = true;
		(async () => {
			try {
				const full = await ambulanceService.getById(ambulanceId);
				if (!full || typeof full !== "object") return;
				lastHydratedAmbulanceIdRef.current = ambulanceId;
				setActiveAmbulanceTrip((prev) => {
					if (!prev) return prev;
					const prevAssigned = prev?.assignedAmbulance;
					if (!prevAssigned || prevAssigned.id !== ambulanceId) return prev;
					const merged = { ...full };
					Object.keys(prevAssigned).forEach((key) => {
						const value = prevAssigned[key];
						if (value !== undefined && value !== null) merged[key] = value;
					});
					return { ...prev, assignedAmbulance: merged };
				});
			} catch (_e) {
				// silent
			} finally {
				isHydratingAmbulanceRef.current = false;
			}
		})();
	}, []);

	return {
		syncActiveTripsFromServer,
		hydrateAmbulanceDetails,
	};
}

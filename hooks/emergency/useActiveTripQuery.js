/**
 * useActiveTripQuery.js
 *
 * PULLBACK NOTE: Phase 2 — Gold Standard State Migration
 * OLD: syncActiveTripsFromServer in useEmergencyServerSync.js —
 *      manually called, in-flight guard, 6s debounce on realtime recovery,
 *      non-deterministic timing after payment completion.
 * NEW: TanStack Query — deterministic cache, background refetch, invalidation
 *      on payment completion. queryFn preserves ALL normalization logic from
 *      useEmergencyServerSync (ETA preservation, route preservation, triage
 *      mapping, bed booking normalization, ambulance detail enrichment).
 *
 * Wiring:
 * - useEmergencyServerSync becomes a thin adapter that calls refetch/invalidate
 * - useEffect auto-syncs query data → Zustand store (Phase 1)
 * - Payment completion calls queryClient.invalidateQueries(['activeTrip'])
 *
 * EmergencyContext still wraps everything — zero consumer blast radius.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../../services/supabase";
import { emergencyRequestsService, EmergencyRequestStatus } from "../../services/emergencyRequestsService";
import { ambulanceService } from "../../services/ambulanceService";
import { normalizeBedBookingRuntimeState } from "./bedBookingRuntime";
import { parsePointGeometry } from "../../utils/emergencyRealtimeProjection";
import {
	normalizeRouteCoordinates,
} from "../../utils/emergencyContextHelpers";
import { useEmergencyTripStore, useStoreHydrated } from "../../stores/emergencyTripStore";

export const ACTIVE_TRIP_QUERY_KEY = ["activeTrip"];

const STALE_TIME = 10 * 1000;
const REFETCH_INTERVAL = 15 * 1000;

const isDispatchedStatus = (status) =>
	status === "in_progress" ||
	status === "accepted" ||
	status === "arrived";

const RESPONDER_ACCEPTED_STATUSES = new Set([
	EmergencyRequestStatus.ACCEPTED,
	EmergencyRequestStatus.ARRIVED,
	EmergencyRequestStatus.COMPLETED,
]);

const isTerminalStatus = (status) =>
	status === EmergencyRequestStatus.COMPLETED ||
	status === EmergencyRequestStatus.CANCELLED ||
	status === "COMPLETED" ||
	status === "CANCELLED";

const toTimestampMs = (value) => {
	if (Number.isFinite(value)) return Number(value);
	if (typeof value !== "string" || !value.trim()) return null;
	const parsed = Date.parse(value);
	return Number.isFinite(parsed) ? parsed : null;
};

const getRequestIdentityKeys = (record) => {
	if (!record || typeof record !== "object") return [];
	return [
		record.id,
		record.requestId,
		record.displayId,
		record.display_id,
		record._realId,
		record.bookingId,
		record.request?.id,
		record.request?.display_id,
	]
		.filter((value) => value != null && value !== "")
		.map((value) => String(value));
};

const hasSameRequestIdentity = (a, b) => {
	const aKeys = getRequestIdentityKeys(a);
	const bKeys = getRequestIdentityKeys(b);
	if (!aKeys.length || !bKeys.length) return false;
	return aKeys.some((key) => bKeys.includes(key));
};

export function reconcileCanonicalAmbulanceTrip(queryTrip, storeTrip) {
	if (!queryTrip) {
		return storeTrip && isTerminalStatus(storeTrip.status) ? storeTrip : queryTrip;
	}

	if (!hasSameRequestIdentity(storeTrip, queryTrip)) {
		return queryTrip;
	}

	const queryStatus = String(queryTrip?.status ?? "").toLowerCase();
	if (!RESPONDER_ACCEPTED_STATUSES.has(queryStatus)) {
		return queryTrip;
	}

	const storeAssigned = storeTrip?.assignedAmbulance;
	const queryAssigned = queryTrip?.assignedAmbulance;
	const needsMerge =
		storeAssigned &&
		(!queryAssigned || (!queryAssigned.name && storeAssigned.name));

	if (!needsMerge) return queryTrip;

	return {
		...queryTrip,
		assignedAmbulance: {
			...(queryAssigned || {}),
			name: queryAssigned?.name || storeAssigned.name || null,
			phone: queryAssigned?.phone || storeAssigned.phone || null,
			type: queryAssigned?.type || storeAssigned.type || null,
			plate: queryAssigned?.plate || storeAssigned.plate || null,
			id: queryAssigned?.id || storeAssigned.id || null,
		},
	};
}

/**
 * Build the normalized ambulance trip snapshot from a raw server record.
 * Preserves ETA, route and assignedAmbulance from the previous trip snapshot.
 * PULLBACK NOTE: Phase 2 — logic lifted verbatim from useEmergencyServerSync
 * queryFn to avoid silent drops. Any changes here must be mirrored there until
 * useEmergencyServerSync is retired.
 */
export async function buildAmbulanceTripSnapshot(activeAmbulance, previousAmbulanceTrip, parseEtaToSeconds) {
	const parsePoint = parsePointGeometry;
	const isSameAmbulanceTrip = hasSameRequestIdentity(previousAmbulanceTrip, activeAmbulance);

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
	const normalizedStatus = String(activeAmbulance?.status ?? "").toLowerCase();
	const hasAcceptedResponder = RESPONDER_ACCEPTED_STATUSES.has(normalizedStatus);
	const serverEtaSeconds = parseEtaToSeconds(activeAmbulance.estimatedArrival);
	const preservedRoute = isSameAmbulanceTrip
		? normalizeRouteCoordinates(previousAmbulanceTrip?.route)
		: [];
	const previousHadAcceptedResponder = RESPONDER_ACCEPTED_STATUSES.has(
		String(previousAmbulanceTrip?.status ?? "").toLowerCase(),
	);
	const preservedStartedAtMs = isSameAmbulanceTrip && previousHadAcceptedResponder
		? (typeof previousAmbulanceTrip?.startedAt === "number" ? previousAmbulanceTrip.startedAt : null)
		: null;
	const canonicalDispatchStartedAtMs = toTimestampMs(
		activeAmbulance?.dispatchAcceptedAt,
	);
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
	const startedAt = !hasAcceptedResponder
		? null
		: Number.isFinite(preservedStartedAtMs)
			? preservedStartedAtMs
			: Number.isFinite(canonicalDispatchStartedAtMs)
				? canonicalDispatchStartedAtMs
				: hydratedAtMs;

	const triageSnapshot =
		activeAmbulance.triageSnapshot ??
		activeAmbulance.triage ??
		(activeAmbulance.triageCheckin
			? { signals: { userCheckin: activeAmbulance.triageCheckin } }
			: null);
	const triageCheckin =
		activeAmbulance.triageCheckin ?? triageSnapshot?.signals?.userCheckin ?? null;
	const hasResponderIdentity = hasAcceptedResponder && !!(
		activeAmbulance.responderId ||
		activeAmbulance.responderName || activeAmbulance.responderPhone ||
		activeAmbulance.responderVehicleType || activeAmbulance.responderVehiclePlate ||
		activeAmbulance.ambulanceId || fullAmbulance?.id || loc
	);
	const fullAmbulanceName =
		fullAmbulance?.name ||
		fullAmbulance?.callSign ||
		fullAmbulance?.vehicleNumber ||
		fullAmbulance?.licensePlate ||
		null;
	const fullAmbulancePlate =
		fullAmbulance?.vehicleNumber ||
		fullAmbulance?.licensePlate ||
		fullAmbulance?.plate ||
		null;

	return {
		id: activeAmbulance.id ?? null,
		hospitalId: activeAmbulance.hospitalId,
		requestId: activeAmbulance.id ?? activeAmbulance.requestId ?? null,
		displayId: activeAmbulance.displayId ?? activeAmbulance.requestId ?? null,
		status: activeAmbulance.status,
		ambulanceId: activeAmbulance.ambulanceId ?? null,
		responderId: activeAmbulance.responderId ?? null,
		currentResponderAssignmentId:
			activeAmbulance.currentResponderAssignmentId ?? null,
		dispatchOrganizationId: activeAmbulance.dispatchOrganizationId ?? null,
		dispatchAcceptedAt: activeAmbulance.dispatchAcceptedAt ?? null,
		responderArrivedAt: activeAmbulance.responderArrivedAt ?? null,
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
		// PULLBACK NOTE: Tracking sheet — preserve responder identity across server merges.
		// OLD: `name` and `phone` were assigned from `activeAmbulance.*` directly, with no
		//      fallback to the previous snapshot. When the server emitted a partial payload
		//      (e.g. responderLocation present but responderName absent), the merge wrote
		//      `name: undefined` and the hero card fell back to the "Driver assigned"
		//      placeholder even though the responder identity was already persisted.
		// NEW: `name` and `phone` join `type`/`plate`/`location`/`heading` in chaining
		//      `||` fallbacks: server → previous snapshot → fullAmbulance → null. Once the
		//      driver is identified, partial server updates can never erase that identity.
		assignedAmbulance: hasResponderIdentity
			? {
					...fullAmbulance,
					...(previousAmbulanceTrip?.assignedAmbulance || {}),
					id:
						activeAmbulance.ambulanceId ||
						previousAmbulanceTrip?.assignedAmbulance?.id ||
						fullAmbulance?.id ||
						null,
					type: activeAmbulance.responderVehicleType || fullAmbulance?.type || "Ambulance",
					plate: activeAmbulance.responderVehiclePlate || fullAmbulancePlate,
					vehicleNumber:
						activeAmbulance.responderVehiclePlate ||
						fullAmbulancePlate ||
						previousAmbulanceTrip?.assignedAmbulance?.vehicleNumber ||
						null,
					name:
						activeAmbulance.responderName ||
						previousAmbulanceTrip?.assignedAmbulance?.name ||
						fullAmbulanceName ||
						null,
					phone:
						activeAmbulance.responderPhone ||
						previousAmbulanceTrip?.assignedAmbulance?.phone ||
						fullAmbulance?.phone ||
						null,
					location:
						loc || fullAmbulance?.location ||
						previousAmbulanceTrip?.assignedAmbulance?.location || null,
					heading:
						activeAmbulance.responderHeading || fullAmbulance?.heading ||
						previousAmbulanceTrip?.assignedAmbulance?.heading || 0,
			  }
			: null,
		currentResponderLocation:
			hasAcceptedResponder
				? loc ||
					fullAmbulance?.location ||
					previousAmbulanceTrip?.currentResponderLocation ||
					null
				: null,
		currentResponderHeading:
			hasAcceptedResponder
				? activeAmbulance.responderHeading ?? previousAmbulanceTrip?.currentResponderHeading ?? null
				: null,
		responderTelemetryAt: hasAcceptedResponder
			? activeAmbulance.responderLocationReceivedAt ??
				fullAmbulance?.locationReceivedAt ??
				(isSameAmbulanceTrip ? previousAmbulanceTrip?.responderTelemetryAt : null) ??
				null
			: null,
		responderLocationObservedAt: hasAcceptedResponder
			? activeAmbulance.responderLocationObservedAt ??
				fullAmbulance?.locationObservedAt ??
				(isSameAmbulanceTrip ? previousAmbulanceTrip?.responderLocationObservedAt : null) ??
				null
			: null,
		responderLocationAccuracyMeters: hasAcceptedResponder
			? activeAmbulance.responderLocationAccuracyMeters ??
				fullAmbulance?.locationAccuracyMeters ??
				(isSameAmbulanceTrip ? previousAmbulanceTrip?.responderLocationAccuracyMeters : null) ??
				null
			: null,
		responderTelemetrySequence: hasAcceptedResponder
			? activeAmbulance.responderTelemetrySequence ??
				fullAmbulance?.telemetrySequence ??
				(isSameAmbulanceTrip ? previousAmbulanceTrip?.responderTelemetrySequence : null) ??
				null
			: null,
		responderTelemetryLeaseExpiresAt: hasAcceptedResponder
			? activeAmbulance.responderTelemetryLeaseExpiresAt ??
				fullAmbulance?.telemetryLeaseExpiresAt ??
				(isSameAmbulanceTrip
					? previousAmbulanceTrip?.responderTelemetryLeaseExpiresAt
					: null) ??
				null
			: null,
		patientAcknowledgedArrivalAt: hasAcceptedResponder
			? activeAmbulance.patientAcknowledgedArrivalAt ??
				(isSameAmbulanceTrip
					? previousAmbulanceTrip?.patientAcknowledgedArrivalAt
					: null) ??
				null
			: null,
		patientLocation: parsePointGeometry(activeAmbulance.patientLocation),
		route: preservedRoute.length >= 2 ? preservedRoute : null,
		updatedAt: activeAmbulance.updatedAt ?? null,
	};
}

/**
 * useActiveTripQuery
 *
 * TanStack Query that fetches + normalizes active trip state from the server.
 * Auto-syncs normalized result into Zustand store (useEmergencyTripStore).
 *
 * @param {Function} parseEtaToSeconds - ETA string → seconds parser from useEmergencyActions
 */
export function useActiveTripQuery({ parseEtaToSeconds, userId }) {
	const hydrated = useStoreHydrated();
	const setActiveAmbulanceTrip = useEmergencyTripStore((s) => s.setActiveAmbulanceTrip);
	const setActiveBedBooking = useEmergencyTripStore((s) => s.setActiveBedBooking);
	const setPendingApproval = useEmergencyTripStore((s) => s.setPendingApproval);
	// PULLBACK NOTE: Tracking sheet — Metro reload progress reset bug fix.
	// OLD: previous trip snapshots were captured via `useEmergencyTripStore((s) => s.activeAmbulanceTrip)`
	//      and closed over in the queryFn. On cold start the queryFn fires before
	//      Zustand hydration completes, so previousTrip = null → preservedStartedAtMs = null
	//      → startedAt = Date.now() → setActiveAmbulanceTrip clobbers the hydrated startedAt
	//      → trip progress resets to 0 on every Metro reload.
	// NEW: read previous trip imperatively inside queryFn via store.getState() so the
	//      query always observes the post-hydration value. Same fix applied to bedBooking.

	const query = useQuery({
		queryKey: [...ACTIVE_TRIP_QUERY_KEY, userId],
		queryFn: async () => {
			// Session guard — wait for auth before querying
			let attempt = 0;
			let sessionUser = null;
			while (attempt < 10) {
				const { data: { user } } = await supabase.auth.getUser();
				sessionUser = user ?? null;
				if (sessionUser?.id === userId) break;
				attempt += 1;
				await new Promise((resolve) => setTimeout(resolve, 400));
			}
			if (!sessionUser || sessionUser.id !== userId) {
				const error = new Error("Emergency session is not ready.");
				error.code = "AUTH_SESSION_UNAVAILABLE";
				throw error;
			}

			const activeRequests = await emergencyRequestsService.list();

			let activeAmbulance = activeRequests.find(
				(r) => r?.serviceType === "ambulance" && isDispatchedStatus(r?.status)
			);
			let activeBed = activeRequests.find(
				(r) => r?.serviceType === "bed" && isDispatchedStatus(r?.status)
			);
			// PULLBACK NOTE: Pass 1 raw-status sweep — OLD: "pending_approval" inline  NEW: EmergencyRequestStatus.PENDING_APPROVAL
			const pendingMatch = activeRequests.find((r) => r?.status === EmergencyRequestStatus.PENDING_APPROVAL);

			// Read previous snapshots imperatively from the store at fetch time.
			// This avoids capturing pre-hydration React state in the queryFn closure.
			const storeState = useEmergencyTripStore.getState();
			const previousAmbulanceTrip = storeState.activeAmbulanceTrip;
			const previousBedBooking = storeState.activeBedBooking;

			if (
				!activeAmbulance &&
				previousAmbulanceTrip &&
				String(previousAmbulanceTrip.status ?? "").toLowerCase() !==
					EmergencyRequestStatus.COMPLETED
			) {
				const previousRequestId =
					previousAmbulanceTrip.id ?? previousAmbulanceTrip.requestId ?? null;
				const latestRequest = previousRequestId
					? await emergencyRequestsService.getOwnedById(previousRequestId)
					: null;
				if (
					latestRequest?.serviceType === "ambulance" &&
					latestRequest?.status === EmergencyRequestStatus.COMPLETED &&
					hasSameRequestIdentity(previousAmbulanceTrip, latestRequest)
				) {
					activeAmbulance = latestRequest;
				}
			}

			if (
				!activeBed &&
				previousBedBooking &&
				String(previousBedBooking.status ?? "").toLowerCase() !==
					EmergencyRequestStatus.COMPLETED
			) {
				const previousRequestId =
					previousBedBooking.id ??
					previousBedBooking.requestId ??
					previousBedBooking.bookingId ??
					null;
				const latestRequest = previousRequestId
					? await emergencyRequestsService.getOwnedById(previousRequestId)
					: null;
				if (
					latestRequest?.serviceType === "bed" &&
					latestRequest?.status === EmergencyRequestStatus.COMPLETED &&
					hasSameRequestIdentity(previousBedBooking, latestRequest)
				) {
					activeBed = latestRequest;
				}
			}

			// Build normalized ambulance trip — preserves ETA/route from previous snapshot
			const ambulanceTrip = activeAmbulance
				? await buildAmbulanceTripSnapshot(activeAmbulance, previousAmbulanceTrip, parseEtaToSeconds)
				: null;

			// Build normalized bed booking
			const bedBooking = activeBed
				? normalizeBedBookingRuntimeState(
						{
							id: activeBed.id ?? null,
							hospitalId: activeBed.hospitalId,
							bookingId: activeBed.id ?? activeBed.bookingId ?? activeBed.requestId ?? null,
							requestId: activeBed.id ?? activeBed.requestId ?? activeBed.bookingId ?? null,
							displayId: activeBed.displayId ?? activeBed.requestId ?? null,
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
						previousBedBooking,
					)
				: null;

			// Build normalized pending approval
			let pending = null;
			if (pendingMatch) {
				const pendingEtaSeconds = parseEtaToSeconds(pendingMatch.estimatedArrival);
				const triageSnapshot =
					pendingMatch.triageSnapshot ??
					pendingMatch.triage ??
					(pendingMatch.triageCheckin
						? { signals: { userCheckin: pendingMatch.triageCheckin } }
						: null);
				pending = {
					id: pendingMatch.id ?? null,
					requestId: pendingMatch.id ?? pendingMatch.requestId ?? null,
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
				};
			}

			return { ambulanceTrip, bedBooking, pending };
		},
		staleTime: STALE_TIME,
		refetchInterval: REFETCH_INTERVAL,
		refetchOnWindowFocus: true,
		refetchOnReconnect: true,
		enabled: hydrated && Boolean(userId),
	});

	// Auto-sync query result → Zustand store
	// PULLBACK NOTE: Phase 2 — replaces useEffect in useEmergencyServerSync that
	// called setActiveAmbulanceTrip/setActiveBedBooking/setPendingApproval directly
	// PULLBACK NOTE: Tracking sheet — defender against query-overwrite race.
	// The query may return with incomplete assignedAmbulance (e.g., responderLocation
	// present but responderName absent) while the store already has the full identity
	// from a previous server event or from payment completion. We must never overwrite
	// good data with incomplete data.
	//
	// Active list reads exclude terminal rows. The query fetches the current request
	// by id to observe missed completion events, then preserves terminal snapshots
	// until an explicit stop action clears them.
	useEffect(() => {
		if (!hydrated) return;
		if (!query.data) return;

		const storeState = useEmergencyTripStore.getState();

		// Same logic for bed bookings
		const mergeBedBooking = (queryBooking) => {
			if (!queryBooking) {
				const storeBooking = storeState.activeBedBooking;
				if (storeBooking && isTerminalStatus(storeBooking.status)) {
					return storeBooking;
				}
				return queryBooking;
			}
			return queryBooking;
		};

		const finalTrip = reconcileCanonicalAmbulanceTrip(
			query.data.ambulanceTrip,
			storeState.activeAmbulanceTrip,
		);
		setActiveAmbulanceTrip(finalTrip);
		setActiveBedBooking(mergeBedBooking(query.data.bedBooking));
		setPendingApproval(query.data.pending);
	}, [hydrated, query.data, setActiveAmbulanceTrip, setActiveBedBooking, setPendingApproval]);

	return query;
}

/**
 * useInvalidateActiveTrip
 *
 * Returns a stable function that invalidates the activeTrip query cache.
 * Call this after payment completion to trigger an immediate deterministic refetch.
 *
 * PULLBACK NOTE: Phase 2 — replaces awaiting syncActiveTripsFromServer after payment.
 * OLD: await syncActiveTripsFromServer('payment_complete')
 * NEW: invalidateActiveTrip() → TanStack Query refetches, syncs to Zustand store
 */
export function useInvalidateActiveTrip() {
	const queryClient = useQueryClient();
	return () => queryClient.invalidateQueries({ queryKey: ACTIVE_TRIP_QUERY_KEY });
}

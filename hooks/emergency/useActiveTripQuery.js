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
import { emergencyRequestsService } from "../../services/emergencyRequestsService";
import { ambulanceService } from "../../services/ambulanceService";
import { normalizeBedBookingRuntimeState } from "./bedBookingRuntime";
import { parsePointGeometry } from "../../utils/emergencyRealtimeProjection";
import {
	normalizeRouteCoordinates,
} from "../../utils/emergencyContextHelpers";
import { useEmergencyTripStore } from "../../stores/emergencyTripStore";

export const ACTIVE_TRIP_QUERY_KEY = ["activeTrip"];

const STALE_TIME = 10 * 1000;
const REFETCH_INTERVAL = 15 * 1000;

const isActiveStatus = (status) =>
	status === "pending_approval" ||
	status === "in_progress" ||
	status === "accepted" ||
	status === "arrived";

/**
 * Build the normalized ambulance trip snapshot from a raw server record.
 * Preserves ETA, route and assignedAmbulance from the previous trip snapshot.
 * PULLBACK NOTE: Phase 2 — logic lifted verbatim from useEmergencyServerSync
 * queryFn to avoid silent drops. Any changes here must be mirrored there until
 * useEmergencyServerSync is retired.
 */
async function buildAmbulanceTripSnapshot(activeAmbulance, previousAmbulanceTrip, parseEtaToSeconds) {
	const parsePoint = parsePointGeometry;
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

	return {
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
					id: activeAmbulance.ambulanceId || "ems_001",
					type: activeAmbulance.responderVehicleType || fullAmbulance?.type || "Ambulance",
					plate: activeAmbulance.responderVehiclePlate || fullAmbulance?.vehicleNumber,
					name:
						activeAmbulance.responderName ||
						previousAmbulanceTrip?.assignedAmbulance?.name ||
						fullAmbulance?.name ||
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
			: previousAmbulanceTrip?.assignedAmbulance || null,
		currentResponderLocation: loc || previousAmbulanceTrip?.currentResponderLocation || null,
		currentResponderHeading:
			activeAmbulance.responderHeading ?? previousAmbulanceTrip?.currentResponderHeading ?? null,
		responderTelemetryAt: activeAmbulance.updatedAt ?? null,
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
export function useActiveTripQuery({ parseEtaToSeconds }) {
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
		queryKey: ACTIVE_TRIP_QUERY_KEY,
		queryFn: async () => {
			// Session guard — wait for auth before querying
			let attempt = 0;
			while (attempt < 10) {
				const { data: { user: sessionUser } } = await supabase.auth.getUser();
				if (sessionUser) break;
				attempt += 1;
				await new Promise((resolve) => setTimeout(resolve, 400));
			}

			const activeRequests = await emergencyRequestsService.list();

			const activeAmbulance = activeRequests.find(
				(r) => r?.serviceType === "ambulance" && isActiveStatus(r?.status)
			);
			const activeBed = activeRequests.find(
				(r) => r?.serviceType === "bed" && isActiveStatus(r?.status)
			);
			const pendingMatch = activeRequests.find((r) => r?.status === "pending_approval");

			// Read previous snapshots imperatively from the store at fetch time.
			// This avoids capturing pre-hydration React state in the queryFn closure.
			const storeState = useEmergencyTripStore.getState();
			const previousAmbulanceTrip = storeState.activeAmbulanceTrip;
			const previousBedBooking = storeState.activeBedBooking;

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
				};
			}

			return { ambulanceTrip, bedBooking, pending };
		},
		staleTime: STALE_TIME,
		refetchInterval: REFETCH_INTERVAL,
		refetchOnWindowFocus: false,
		refetchOnReconnect: true,
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
	// PULLBACK NOTE: Terminal state preservation — query filters by isActiveStatus
	// which excludes COMPLETED/CANCELLED. When a trip completes, query returns null
	// which would wipe the hero card data before rating. We preserve terminal-state
	// trips in the store until an explicit stopAmbulanceTrip() is called.
	const isTerminalStatus = (status) =>
		status === "completed" ||
		status === "cancelled" ||
		status === "COMPLETED" ||
		status === "CANCELLED";

	useEffect(() => {
		if (!query.data) return;

		const storeState = useEmergencyTripStore.getState();

		// DIAGNOSTIC LOGS — Track sync behavior
		const logPrefix = `[ActiveTripQuery.Sync ${Date.now().toString(36).slice(-4)}]`;
		const queryTrip = query.data.ambulanceTrip;
		const storeTrip = storeState.activeAmbulanceTrip;

		console.log(`${logPrefix} Query trip:`, queryTrip
			? { requestId: queryTrip.requestId, status: queryTrip.status, hasAssignedAmbulance: !!queryTrip.assignedAmbulance, assignedName: queryTrip.assignedAmbulance?.name }
			: null);
		console.log(`${logPrefix} Store trip:`, storeTrip
			? { requestId: storeTrip.requestId, status: storeTrip.status, hasAssignedAmbulance: !!storeTrip.assignedAmbulance, assignedName: storeTrip.assignedAmbulance?.name }
			: null);

		// Merge helper: preserve responder identity if query data is incomplete
		const mergeAmbulanceTrip = (queryTrip) => {
			// If query returns null but store has a terminal-state trip, preserve it
			// This prevents the hero card from wiping when completing a trip
			if (!queryTrip) {
				const storeTrip = storeState.activeAmbulanceTrip;
				if (storeTrip && isTerminalStatus(storeTrip.status)) {
					console.log(`${logPrefix} PRESERVING terminal store trip (query is null)`);
					return storeTrip;
				}
				console.log(`${logPrefix} Accepting null (no store trip or not terminal)`);
				return queryTrip;
			}

			const storeTrip = storeState.activeAmbulanceTrip;
			// If same trip identity and store has assignedAmbulance but query doesn't (or has incomplete)
			const sameTrip = storeTrip && queryTrip.requestId && storeTrip.requestId === queryTrip.requestId;
			console.log(`${logPrefix} Same trip check:`, { sameTrip: !!sameTrip, storeReq: storeTrip?.requestId, queryReq: queryTrip.requestId });
			if (!sameTrip) {
				console.log(`${logPrefix} Different trip — accepting query data`);
				return queryTrip;
			}

			const storeAssigned = storeTrip?.assignedAmbulance;
			const queryAssigned = queryTrip?.assignedAmbulance;
			const needsMerge = storeAssigned && (!queryAssigned || (!queryAssigned.name && storeAssigned.name));
			console.log(`${logPrefix} Merge check:`, { needsMerge: !!needsMerge, storeName: storeAssigned?.name, queryName: queryAssigned?.name });

			// If store has name/phone but query doesn't, merge store's identity into query result
			if (needsMerge) {
				console.log(`${logPrefix} MERGING responder identity from store into query`);
				return {
					...queryTrip,
					assignedAmbulance: {
						...(queryAssigned || {}),
						name: queryAssigned?.name || storeAssigned.name || null,
						phone: queryAssigned?.phone || storeAssigned.phone || null,
						// Also preserve other identity fields if missing in query
						type: queryAssigned?.type || storeAssigned.type || null,
						plate: queryAssigned?.plate || storeAssigned.plate || null,
						id: queryAssigned?.id || storeAssigned.id || null,
					},
				};
			}
			console.log(`${logPrefix} No merge needed — accepting query data`);
			return queryTrip;
		};

		// Same logic for bed bookings
		const mergeBedBooking = (queryBooking) => {
			if (!queryBooking) {
				const storeBooking = storeState.activeBedBooking;
				if (storeBooking && isTerminalStatus(storeBooking.status)) {
					console.log(`${logPrefix} PRESERVING terminal store bed booking`);
					return storeBooking;
				}
				return queryBooking;
			}
			return queryBooking;
		};

		const finalTrip = mergeAmbulanceTrip(query.data.ambulanceTrip);
		console.log(`${logPrefix} Final trip to sync:`, finalTrip
			? { requestId: finalTrip.requestId, assignedName: finalTrip.assignedAmbulance?.name }
			: null);

		setActiveAmbulanceTrip(finalTrip);
		setActiveBedBooking(mergeBedBooking(query.data.bedBooking));
		setPendingApproval(query.data.pending);
	}, [query.data, setActiveAmbulanceTrip, setActiveBedBooking, setPendingApproval]);

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

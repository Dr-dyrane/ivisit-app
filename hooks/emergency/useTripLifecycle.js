/**
 * useTripLifecycle.js
 *
 * PULLBACK NOTE: Phase 4 — Gold Standard State Migration
 * OLD: trip lifecycle derived ad-hoc from status strings in EmergencyContext,
 *      useEmergencyHandlers, useMapExploreFlow — race conditions possible,
 *      illegal state combinations possible (e.g. active + completed simultaneously).
 * NEW: thin React adapter over tripLifecycleMachine (XState v5).
 *      Machine state is the single source of truth for lifecycle phase.
 *      Zustand store (Phase 1) owns the full trip data object.
 *      TanStack Query (Phase 2) owns server sync — sends SERVER_SYNC events here.
 *
 * Return contract: exposes machine state + send for consumers.
 * EmergencyContext wraps this — zero consumer blast radius.
 */

import { useMachine } from "@xstate/react";
import { useEffect, useCallback } from "react";
import {
	tripLifecycleMachine,
	TripState,
	serverStatusToMachineEvent,
} from "../../machines/tripLifecycleMachine";
import { useEmergencyTripStore, useStoreHydrated } from "../../stores/emergencyTripStore";

export function useTripLifecycle() {
	const [snapshot, send] = useMachine(tripLifecycleMachine);

	// Read Zustand store for active trip data (Phase 1 ownership)
	const activeAmbulanceTrip = useEmergencyTripStore((s) => s.activeAmbulanceTrip);
	const activeBedBooking = useEmergencyTripStore((s) => s.activeBedBooking);
	const pendingApproval = useEmergencyTripStore((s) => s.pendingApproval);
	// PULLBACK NOTE: HR-A fix — Zustand hydration gate.
	// OLD: effect fired on first render with pre-hydration nulls → RESET event sent
	//      → machine stayed IDLE → hasActiveTrip = false → auto-open blocked
	//      (~10-15s delay until TanStack query resolved and updated the store).
	// NEW: effect is a no-op until initFromStorage completes (hydrated = true).
	//      First meaningful fire uses the real persisted values from storage.
	const storeHydrated = useStoreHydrated();

	// ─── Drive machine from Zustand store state ────────────────────────────
	// PULLBACK NOTE: Phase 4 — Zustand is truth for trip data,
	// XState is truth for lifecycle state. We sync server status → machine.
	// When store updates (via Phase 2 TanStack Query), we send SERVER_SYNC.

	useEffect(() => {
		if (!storeHydrated) return;
		if (activeAmbulanceTrip?.status) {
			const event = serverStatusToMachineEvent(activeAmbulanceTrip.status, {
				requestId: activeAmbulanceTrip.requestId,
				hospitalId: activeAmbulanceTrip.hospitalId,
				serviceType: "ambulance",
				assignedAmbulance: activeAmbulanceTrip.assignedAmbulance ?? null,
			});
			if (event) send(event);
		} else if (activeBedBooking?.status) {
			const event = serverStatusToMachineEvent(activeBedBooking.status, {
				requestId: activeBedBooking.requestId,
				hospitalId: activeBedBooking.hospitalId,
				serviceType: "bed",
				bedNumber: activeBedBooking.bedNumber ?? null,
			});
			if (event) send(event);
		} else if (pendingApproval?.status) {
			const event = serverStatusToMachineEvent(pendingApproval.status, {
				requestId: pendingApproval.requestId,
				hospitalId: pendingApproval.hospitalId,
				serviceType: pendingApproval.serviceType ?? "ambulance",
			});
			if (event) send(event);
		} else {
			// No active trip in store — machine should be idle
			if (snapshot.value !== TripState.IDLE) {
				send({ type: "RESET" });
			}
		}
	}, [
		storeHydrated,
		activeAmbulanceTrip?.status,
		activeAmbulanceTrip?.requestId,
		activeBedBooking?.status,
		activeBedBooking?.requestId,
		pendingApproval?.status,
		pendingApproval?.requestId,
	]);

	// ─── Stable action helpers ─────────────────────────────────────────────

	const submitTrip = useCallback(
		(serviceType, requestId, hospitalId) => {
			send({ type: "SUBMIT", serviceType, requestId, hospitalId });
		},
		[send]
	);

	const approveTrip = useCallback(
		(opts = {}) => {
			send({ type: "APPROVE", ...opts });
		},
		[send]
	);

	const arriveTrip = useCallback(() => {
		send({ type: "ARRIVE" });
	}, [send]);

	const completeTrip = useCallback(
		(opts = {}) => {
			send({ type: "COMPLETE", ...opts });
		},
		[send]
	);

	const cancelTrip = useCallback(
		(reason) => {
			send({ type: "CANCEL", reason });
		},
		[send]
	);

	const resetTrip = useCallback(() => {
		send({ type: "RESET" });
	}, [send]);

	const dismissRating = useCallback(() => {
		send({ type: "RATING_DISMISSED" });
	}, [send]);

	// ─── Derived state helpers (replace ad-hoc string comparisons) ─────────

	const tripState = snapshot.value;
	const isIdle = snapshot.matches(TripState.IDLE);
	const isPendingApproval = snapshot.matches(TripState.PENDING_APPROVAL);
	const isActive = snapshot.matches(TripState.ACTIVE);
	const isArrived = snapshot.matches(TripState.ARRIVED);
	const isCompleting = snapshot.matches(TripState.COMPLETING);
	const isCompleted = snapshot.matches(TripState.COMPLETED);
	const isCancelled = snapshot.matches(TripState.CANCELLED);
	const isRatingPending = snapshot.context.ratingPending;
	const hasActiveTrip = isPendingApproval || isActive || isArrived || isCompleting;

	return {
		// Machine snapshot (for DevTools + advanced consumers)
		tripLifecycleSnapshot: snapshot,
		send,

		// Stable current state
		tripState,

		// Boolean flags — replace ad-hoc status string checks
		isIdle,
		isPendingApproval,
		isActive,
		isArrived,
		isCompleting,
		isCompleted,
		isCancelled,
		isRatingPending,
		hasActiveTrip,

		// Context from machine (supplementary — Zustand owns full trip data)
		tripLifecycleContext: snapshot.context,

		// Action helpers
		submitTrip,
		approveTrip,
		arriveTrip,
		completeTrip,
		cancelTrip,
		resetTrip,
		dismissRating,
	};
}

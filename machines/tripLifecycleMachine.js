/**
 * tripLifecycleMachine.js
 *
 * PULLBACK NOTE: Phase 4 — Gold Standard State Migration
 * OLD: trip lifecycle tracked via ad-hoc status string comparisons scattered
 *      across EmergencyContext, useEmergencyHandlers, useMapExploreFlow —
 *      illegal state combinations possible, timing bugs, no observable transitions.
 * NEW: XState v5 machine — explicit states, legal transitions only, DevTools
 *      observable, covers both ambulance AND bed booking service types.
 *
 * Machine is pure — no React, no side effects. All async work stays in actors
 * or in the React adapter (useTripLifecycle.js).
 *
 * States:
 *   idle            → no active trip
 *   pendingApproval → request submitted, awaiting org/admin approval
 *   active          → approved, responder dispatched, en-route
 *   arrived         → responder on scene
 *   completing      → ride/booking ended, cleanup in progress
 *   completed       → trip done, rating may be pending
 *   cancelled       → rejected or user-cancelled
 *
 * Events (sent from realtime subscription or explicit actions):
 *   SUBMIT          { serviceType, requestId, hospitalId }
 *   APPROVE         { requestId, assignedAmbulance?, bedNumber? }
 *   ARRIVE          { requestId }
 *   COMPLETE        { requestId, deferCleanup? }
 *   CANCEL          { requestId, reason? }
 *   RESET           — force back to idle (Metro restart recovery)
 *   SERVER_SYNC     { status } — server truth overrides local state
 */

import { setup, assign } from "xstate";

// ─── Context shape ─────────────────────────────────────────────────────────

const createInitialContext = () => ({
	serviceType: null,
	requestId: null,
	hospitalId: null,
	assignedAmbulance: null,
	bedNumber: null,
	bedType: null,
	completedAt: null,
	cancelReason: null,
	ratingPending: false,
});

// ─── Guards ────────────────────────────────────────────────────────────────

const guards = {
	isAmbulance: ({ context }) => context.serviceType === "ambulance",
	isBedBooking: ({ context }) => context.serviceType === "bed",
	hasRequestId: ({ context }) => !!context.requestId,

	serverStatusIsPendingApproval: ({ event }) =>
		event.status === "pending_approval",
	serverStatusIsActive: ({ event }) =>
		event.status === "in_progress" ||
		event.status === "accepted",
	serverStatusIsArrived: ({ event }) => event.status === "arrived",
	serverStatusIsCompleted: ({ event }) => event.status === "completed",
	serverStatusIsCancelled: ({ event }) =>
		event.status === "cancelled" || event.status === "payment_declined",
};

// ─── Actions ───────────────────────────────────────────────────────────────

const actions = {
	assignSubmit: assign({
		serviceType: ({ event }) => event.serviceType ?? null,
		requestId: ({ event }) => event.requestId ?? null,
		hospitalId: ({ event }) => event.hospitalId ?? null,
		assignedAmbulance: null,
		bedNumber: null,
		bedType: null,
		completedAt: null,
		cancelReason: null,
		ratingPending: false,
	}),

	assignApproval: assign({
		assignedAmbulance: ({ event }) => event.assignedAmbulance ?? null,
		bedNumber: ({ event }) => event.bedNumber ?? null,
		bedType: ({ event }) => event.bedType ?? null,
	}),

	assignArrival: assign({}),

	assignCompletion: assign({
		completedAt: () => Date.now(),
		ratingPending: true,
	}),

	assignCancellation: assign({
		cancelReason: ({ event }) => event.reason ?? null,
	}),

	assignServerSync: assign({
		requestId: ({ event, context }) => event.requestId ?? context.requestId,
		hospitalId: ({ event, context }) => event.hospitalId ?? context.hospitalId,
		serviceType: ({ event, context }) => event.serviceType ?? context.serviceType,
		assignedAmbulance: ({ event, context }) => event.assignedAmbulance ?? context.assignedAmbulance,
		bedNumber: ({ event, context }) => event.bedNumber ?? context.bedNumber,
	}),

	clearContext: assign(createInitialContext()),

	ratingDismissed: assign({
		ratingPending: false,
	}),
};

// ─── Machine ───────────────────────────────────────────────────────────────

export const tripLifecycleMachine = setup({
	types: {
		context: /** @type {ReturnType<typeof createInitialContext>} */ ({}),
		events: /** @type {
			| { type: "SUBMIT"; serviceType: string; requestId: string; hospitalId: string }
			| { type: "APPROVE"; requestId?: string; assignedAmbulance?: object; bedNumber?: string; bedType?: string }
			| { type: "ARRIVE"; requestId?: string }
			| { type: "COMPLETE"; requestId?: string; deferCleanup?: boolean }
			| { type: "CANCEL"; requestId?: string; reason?: string }
			| { type: "RESET" }
			| { type: "RATING_DISMISSED" }
			| { type: "SERVER_SYNC"; status: string; requestId?: string; hospitalId?: string; serviceType?: string; assignedAmbulance?: object; bedNumber?: string }
		} */ ({}),
	},
	guards,
	actions,
}).createMachine({
	id: "tripLifecycle",
	initial: "idle",
	context: createInitialContext(),

	states: {
		idle: {
			on: {
				SUBMIT: {
					target: "pendingApproval",
					actions: "assignSubmit",
				},
				SERVER_SYNC: [
					{
						guard: "serverStatusIsPendingApproval",
						target: "pendingApproval",
						actions: "assignServerSync",
					},
					{
						guard: "serverStatusIsActive",
						target: "active",
						actions: "assignServerSync",
					},
					{
						guard: "serverStatusIsArrived",
						target: "arrived",
						actions: "assignServerSync",
					},
				],
			},
		},

		pendingApproval: {
			on: {
				APPROVE: {
					target: "active",
					actions: "assignApproval",
				},
				CANCEL: {
					target: "cancelled",
					actions: "assignCancellation",
				},
				RESET: {
					target: "idle",
					actions: "clearContext",
				},
				SERVER_SYNC: [
					{
						guard: "serverStatusIsActive",
						target: "active",
						actions: "assignServerSync",
					},
					{
						guard: "serverStatusIsArrived",
						target: "arrived",
						actions: "assignServerSync",
					},
					{
						guard: "serverStatusIsCompleted",
						target: "completed",
						actions: ["assignServerSync", "assignCompletion"],
					},
					{
						guard: "serverStatusIsCancelled",
						target: "cancelled",
						actions: "assignServerSync",
					},
				],
			},
		},

		active: {
			on: {
				ARRIVE: {
					target: "arrived",
					actions: "assignArrival",
				},
				COMPLETE: {
					target: "completing",
					actions: "assignCompletion",
				},
				CANCEL: {
					target: "cancelled",
					actions: "assignCancellation",
				},
				RESET: {
					target: "idle",
					actions: "clearContext",
				},
				SERVER_SYNC: [
					{
						guard: "serverStatusIsArrived",
						target: "arrived",
						actions: "assignServerSync",
					},
					{
						guard: "serverStatusIsCompleted",
						target: "completed",
						actions: ["assignServerSync", "assignCompletion"],
					},
					{
						guard: "serverStatusIsCancelled",
						target: "cancelled",
						actions: "assignServerSync",
					},
				],
			},
		},

		arrived: {
			on: {
				COMPLETE: {
					target: "completing",
					actions: "assignCompletion",
				},
				CANCEL: {
					target: "cancelled",
					actions: "assignCancellation",
				},
				RESET: {
					target: "idle",
					actions: "clearContext",
				},
				SERVER_SYNC: [
					{
						guard: "serverStatusIsCompleted",
						target: "completed",
						actions: ["assignServerSync", "assignCompletion"],
					},
					{
						guard: "serverStatusIsCancelled",
						target: "cancelled",
						actions: "assignServerSync",
					},
				],
			},
		},

		completing: {
			after: {
				// Auto-advance to completed after brief cleanup window
				// Consumers can listen to completing state to show UI before final cleanup
				500: { target: "completed" },
			},
			on: {
				RESET: {
					target: "idle",
					actions: "clearContext",
				},
			},
		},

		completed: {
			on: {
				RATING_DISMISSED: {
					actions: "ratingDismissed",
				},
				RESET: {
					target: "idle",
					actions: "clearContext",
				},
				SUBMIT: {
					target: "pendingApproval",
					actions: "assignSubmit",
				},
			},
		},

		cancelled: {
			on: {
				RESET: {
					target: "idle",
					actions: "clearContext",
				},
				SUBMIT: {
					target: "pendingApproval",
					actions: "assignSubmit",
				},
			},
		},
	},
});

// ─── State helpers (replaces ad-hoc string comparisons) ────────────────────

export const TripState = {
	IDLE: "idle",
	PENDING_APPROVAL: "pendingApproval",
	ACTIVE: "active",
	ARRIVED: "arrived",
	COMPLETING: "completing",
	COMPLETED: "completed",
	CANCELLED: "cancelled",
};

/**
 * Map server EmergencyRequestStatus → machine TripState.
 * Used by SERVER_SYNC to drive the machine from realtime updates.
 */
export const serverStatusToMachineEvent = (serverStatus, context = {}) => {
	switch (serverStatus) {
		case "pending_approval":
			return { type: "SERVER_SYNC", status: serverStatus, ...context };
		case "in_progress":
		case "accepted":
			return { type: "SERVER_SYNC", status: serverStatus, ...context };
		case "arrived":
			return { type: "SERVER_SYNC", status: serverStatus, ...context };
		case "completed":
			return { type: "SERVER_SYNC", status: serverStatus, ...context };
		case "cancelled":
		case "payment_declined":
			return { type: "SERVER_SYNC", status: serverStatus, ...context };
		default:
			return null;
	}
};

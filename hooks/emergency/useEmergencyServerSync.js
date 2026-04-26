/**
 * useEmergencyServerSync.js
 *
 * PULLBACK NOTE: Phase 2 — Gold Standard State Migration
 * OLD: owned syncActiveTripsFromServer — a manual async function with in-flight guard,
 *      called on mount, realtime recovery (6s debounce), and optionally after payment.
 *      Non-deterministic timing, duplicate in-flight prevention, manual session guard.
 * NEW: thin adapter over useActiveTripQuery (TanStack Query).
 *      syncActiveTripsFromServer now calls query.refetch() — deterministic,
 *      deduplicated, background-refetched automatically every 15s.
 *      hydrateAmbulanceDetails preserved unchanged — not yet migrated (Phase 4).
 *
 * Return contract: 100% identical — zero consumer changes required.
 */

import { useCallback, useRef } from "react";

import { useActiveTripQuery } from "./useActiveTripQuery";
import { ambulanceService } from "../../services/ambulanceService";

export function useEmergencyServerSync({
	parseEtaToSeconds,
	// PULLBACK NOTE: Phase 2 — activeAmbulanceTripRef, activeBedBookingRef,
	// setActiveAmbulanceTrip, setActiveBedBooking, setPendingApproval are now
	// owned by useActiveTripQuery → Zustand store. Params kept for signature
	// compatibility but are not used here.
	activeAmbulanceTripRef: _activeAmbulanceTripRef,
	activeBedBookingRef: _activeBedBookingRef,
	setActiveAmbulanceTrip: _setActiveAmbulanceTrip,
	setActiveBedBooking: _setActiveBedBooking,
	setPendingApproval: _setPendingApproval,
}) {
	// Mount the query — auto-fetches on mount, background-refetches every 15s,
	// auto-syncs result → Zustand store via useEffect inside the hook.
	const query = useActiveTripQuery({ parseEtaToSeconds });

	const lastHydratedAmbulanceIdRef = useRef(null);
	const isHydratingAmbulanceRef = useRef(false);

	// PULLBACK NOTE: Phase 2 — syncActiveTripsFromServer now calls query.refetch()
	// OLD: manual fetch + in-flight guard + waitForSession loop
	// NEW: TanStack Query refetch — deduped, session guard inside queryFn
	const syncActiveTripsFromServer = useCallback(
		async (_reason = "manual") => {
			try {
				await query.refetch();
			} catch (error) {
				console.warn("[useEmergencyServerSync] Sync failed:", error);
			}
		},
		[query]
	);

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

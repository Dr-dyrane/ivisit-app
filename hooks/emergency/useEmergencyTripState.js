/**
 * useEmergencyTripState.js
 *
 * PULLBACK NOTE: Phase 1 — Gold Standard State Migration
 * OLD: trip state (activeAmbulanceTrip, activeBedBooking, pendingApproval, commitFlow)
 *      lived in useState — lost on Metro restart, timing issues on payment→tracking
 * NEW: trip state reads/writes to useEmergencyTripStore (Zustand + database persist)
 *      UI-only state (mode, serviceType, selectedSpecialty, viewMode, selectedHospitalId)
 *      stays local — no blast radius change for consumers.
 *
 * Return contract: 100% identical to before — zero consumer changes required.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { EmergencyMode } from "../../constants/emergency";
import {
	useEmergencyTripStore,
} from "../../stores/emergencyTripStore";

export function useEmergencyTripState() {
	// UI-only state — stays local (not persisted, not shared)
	const [mode, setMode] = useState(EmergencyMode.EMERGENCY);
	const [serviceType, setServiceType] = useState(null);
	const [selectedSpecialty, setSelectedSpecialty] = useState(null);
	const [viewMode, setViewMode] = useState("map");
	const [selectedHospitalId, setSelectedHospitalId] = useState(null);

	// Trip state — now sourced from Zustand store (persisted, survives Metro restart)
	// PULLBACK NOTE: Phase 1 — useState replaced with store selectors
	// OLD: const [activeAmbulanceTrip, setActiveAmbulanceTripRaw] = useState(null)
	// NEW: const activeAmbulanceTrip = useEmergencyTripStore(s => s.activeAmbulanceTrip)
	const activeAmbulanceTrip = useEmergencyTripStore((s) => s.activeAmbulanceTrip);
	const activeBedBooking = useEmergencyTripStore((s) => s.activeBedBooking);
	const pendingApproval = useEmergencyTripStore((s) => s.pendingApproval);
	const commitFlow = useEmergencyTripStore((s) => s.commitFlow);

	const setActiveAmbulanceTrip = useEmergencyTripStore((s) => s.setActiveAmbulanceTrip);
	const setActiveBedBooking = useEmergencyTripStore((s) => s.setActiveBedBooking);
	const setPendingApproval = useEmergencyTripStore((s) => s.setPendingApproval);
	const setCommitFlow = useEmergencyTripStore((s) => s.setCommitFlow);
	const patchActiveAmbulanceTripStore = useEmergencyTripStore((s) => s.patchActiveAmbulanceTrip);
	const patchActiveBedBookingStore = useEmergencyTripStore((s) => s.patchActiveBedBooking);
	const patchPendingApprovalStore = useEmergencyTripStore((s) => s.patchPendingApproval);
	const setAmbulanceTripStatusStore = useEmergencyTripStore((s) => s.setAmbulanceTripStatus);
	const setBedBookingStatusStore = useEmergencyTripStore((s) => s.setBedBookingStatus);
	const initFromStorage = useEmergencyTripStore((s) => s.initFromStorage);
	const hydrated = useEmergencyTripStore((s) => s.hydrated);

	// Stable refs for hooks that read without triggering re-renders
	const activeAmbulanceTripRef = useRef(activeAmbulanceTrip);
	const activeBedBookingRef = useRef(activeBedBooking);

	useEffect(() => { activeAmbulanceTripRef.current = activeAmbulanceTrip; }, [activeAmbulanceTrip]);
	useEffect(() => { activeBedBookingRef.current = activeBedBooking; }, [activeBedBooking]);

	// Hydrate store from database on mount (once)
	// PULLBACK NOTE: Phase 1 — replaces inline hydrate() useEffect
	// OLD: read database directly, set local useState
	// NEW: delegate to store.initFromStorage (idempotent, guarded internally)
	useEffect(() => {
		if (!hydrated) {
			void initFromStorage();
		}
	}, [hydrated, initFromStorage]);

	// Patch helpers — delegate to store, maintain same call signature
	const patchActiveAmbulanceTrip = useCallback((updates) => {
		if (!updates || typeof updates !== "object") return;
		patchActiveAmbulanceTripStore(updates);
	}, [patchActiveAmbulanceTripStore]);

	const patchActiveBedBooking = useCallback((updates) => {
		if (!updates || typeof updates !== "object") return;
		patchActiveBedBookingStore(updates);
	}, [patchActiveBedBookingStore]);

	const patchPendingApproval = useCallback((updates) => {
		if (!updates || typeof updates !== "object") return;
		patchPendingApprovalStore(updates);
	}, [patchPendingApprovalStore]);

	const setAmbulanceTripStatus = useCallback((status) => {
		setAmbulanceTripStatusStore(status);
	}, [setAmbulanceTripStatusStore]);

	const setBedBookingStatus = useCallback((status) => {
		setBedBookingStatusStore(status);
	}, [setBedBookingStatusStore]);

	// UI actions — local state only
	const toggleMode = useCallback(() => {
		setMode((prev) =>
			prev === EmergencyMode.EMERGENCY ? EmergencyMode.BOOKING : EmergencyMode.EMERGENCY
		);
		setSelectedHospitalId(null);
	}, []);

	const selectHospital = useCallback((hospitalId) => setSelectedHospitalId(hospitalId), []);
	const clearSelectedHospital = useCallback(() => setSelectedHospitalId(null), []);
	const selectSpecialty = useCallback((specialty) => { setSelectedSpecialty(specialty); setSelectedHospitalId(null); }, []);
	const selectServiceType = useCallback((type) => { setServiceType(type ? type.toLowerCase() : null); setSelectedHospitalId(null); }, []);
	const toggleViewMode = useCallback(() => setViewMode((prev) => prev === "map" ? "list" : "map"), []);
	const resetFilters = useCallback(() => { setServiceType(null); setSelectedSpecialty(null); setSelectedHospitalId(null); }, []);

	const hasActiveFilters = useMemo(() => {
		if (mode === EmergencyMode.EMERGENCY) return serviceType !== null;
		return selectedSpecialty !== null;
	}, [mode, serviceType, selectedSpecialty]);

	return {
		// State
		mode,
		setMode,
		serviceType,
		selectedSpecialty,
		viewMode,
		selectedHospitalId,
		setSelectedHospitalId,
		activeAmbulanceTrip,
		activeBedBooking,
		pendingApproval,
		commitFlow,
		hasActiveFilters,
		// Refs (for use in hooks that need to read without triggering re-renders)
		activeAmbulanceTripRef,
		activeBedBookingRef,
		// Setters
		setActiveAmbulanceTrip,
		setActiveBedBooking,
		setPendingApproval,
		setCommitFlow,
		// Patch helpers
		patchActiveAmbulanceTrip,
		patchActiveBedBooking,
		patchPendingApproval,
		// UI actions
		toggleMode,
		selectHospital,
		clearSelectedHospital,
		selectSpecialty,
		selectServiceType,
		toggleViewMode,
		resetFilters,
		setAmbulanceTripStatus,
		setBedBookingStatus,
	};
}

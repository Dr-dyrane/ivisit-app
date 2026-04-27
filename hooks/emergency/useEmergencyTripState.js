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
// PULLBACK NOTE: Phase 6d — wire mode/serviceType/selectedSpecialty/viewMode off useState to useModeStore
// OLD: local useState in this hook — reset on Metro reload, caused context-wide re-renders on every change
// NEW: useModeStore selectors — surgical subscriptions, survives Metro reload, persisted via hydration
import { useModeStore } from "../../stores/modeStore";

export function useEmergencyTripState() {
	// PULLBACK NOTE: Phase 6d — mode/serviceType/selectedSpecialty/viewMode sourced from useModeStore
	// OLD: useState(EmergencyMode.EMERGENCY) / useState(null) / useState(null) / useState('map')
	// NEW: Zustand store selectors — surgical re-renders, survives Metro reload
	const mode = useModeStore((s) => s.mode);
	const setMode = useModeStore((s) => s.setMode);
	const serviceType = useModeStore((s) => s.serviceType);
	const setServiceType = useModeStore((s) => s.setServiceType);
	const selectedSpecialty = useModeStore((s) => s.selectedSpecialty);
	const setSelectedSpecialty = useModeStore((s) => s.setSelectedSpecialty);
	const viewMode = useModeStore((s) => s.viewMode);
	const setViewMode = useModeStore((s) => s.setViewMode);
	// selectedHospitalId remains local — ephemeral UI selection, not persisted
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

	// UI actions — delegate to store, maintain same call signature
	const toggleMode = useCallback(() => {
		setMode(mode === EmergencyMode.EMERGENCY ? EmergencyMode.BOOKING : EmergencyMode.EMERGENCY);
		setSelectedHospitalId(null);
	}, [mode, setMode]);

	const selectHospital = useCallback((hospitalId) => setSelectedHospitalId(hospitalId), []);
	const clearSelectedHospital = useCallback(() => setSelectedHospitalId(null), []);
	const selectSpecialty = useCallback((specialty) => { setSelectedSpecialty(specialty); setSelectedHospitalId(null); }, [setSelectedSpecialty]);
	const selectServiceType = useCallback((type) => { setServiceType(type ? type.toLowerCase() : null); setSelectedHospitalId(null); }, [setServiceType]);
	const toggleViewMode = useCallback(() => setViewMode(viewMode === "map" ? "list" : "map"), [viewMode, setViewMode]);
	const resetFilters = useCallback(() => { setServiceType(null); setSelectedSpecialty(null); setSelectedHospitalId(null); }, [setServiceType, setSelectedSpecialty]);

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

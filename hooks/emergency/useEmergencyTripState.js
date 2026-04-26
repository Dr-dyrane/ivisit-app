/**
 * useEmergencyTripState.js
 *
 * Owns: activeAmbulanceTrip, activeBedBooking, pendingApproval, commitFlow,
 *       mode, serviceType, selectedSpecialty, viewMode, selectedHospitalId.
 * Handles: hydration from local DB, persistence on change, stable ref sync.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { database, StorageKeys } from "../../database";
import { normalizeEmergencyState } from "../../utils/domainNormalize";
import { areRuntimeStateValuesEqual, resolveStateUpdate } from "../../utils/emergencyContextHelpers";
// PULLBACK NOTE: Moved import source to break circular dep with EmergencyContext
// OLD: import { EmergencyMode } from "../../contexts/EmergencyContext"
// NEW: import { EmergencyMode } from "../../constants/emergency"
import { EmergencyMode } from "../../constants/emergency";

export function useEmergencyTripState() {
	const [mode, setMode] = useState(EmergencyMode.EMERGENCY);
	const [serviceType, setServiceType] = useState(null);
	const [selectedSpecialty, setSelectedSpecialty] = useState(null);
	const [viewMode, setViewMode] = useState("map");
	const [selectedHospitalId, setSelectedHospitalId] = useState(null);

	const [activeAmbulanceTrip, setActiveAmbulanceTripRaw] = useState(null);
	const [activeBedBooking, setActiveBedBookingRaw] = useState(null);
	const [pendingApproval, setPendingApprovalRaw] = useState(null);
	const [commitFlow, setCommitFlowRaw] = useState(null);

	const emergencyStateHydratedRef = useRef(false);
	const emergencyStatePersistSignatureRef = useRef("");
	const activeAmbulanceTripRef = useRef(activeAmbulanceTrip);
	const activeBedBookingRef = useRef(activeBedBooking);
	const pendingApprovalRef = useRef(pendingApproval);
	const commitFlowRef = useRef(commitFlow);

	// Keep refs in sync
	useEffect(() => { activeAmbulanceTripRef.current = activeAmbulanceTrip; }, [activeAmbulanceTrip]);
	useEffect(() => { activeBedBookingRef.current = activeBedBooking; }, [activeBedBooking]);
	useEffect(() => { pendingApprovalRef.current = pendingApproval; }, [pendingApproval]);
	useEffect(() => { commitFlowRef.current = commitFlow; }, [commitFlow]);

	// Stable setters with equality guard
	const setActiveAmbulanceTrip = useCallback((nextValueOrUpdater) => {
		setActiveAmbulanceTripRaw((prev) => {
			const next = resolveStateUpdate(prev, nextValueOrUpdater);
			return areRuntimeStateValuesEqual(next, prev) ? prev : next;
		});
	}, []);

	const setActiveBedBooking = useCallback((nextValueOrUpdater) => {
		setActiveBedBookingRaw((prev) => {
			const next = resolveStateUpdate(prev, nextValueOrUpdater);
			return areRuntimeStateValuesEqual(next, prev) ? prev : next;
		});
	}, []);

	const setPendingApproval = useCallback((nextValueOrUpdater) => {
		setPendingApprovalRaw((prev) => {
			const next = resolveStateUpdate(prev, nextValueOrUpdater);
			return areRuntimeStateValuesEqual(next, prev) ? prev : next;
		});
	}, []);

	const setCommitFlow = useCallback((nextValueOrUpdater) => {
		setCommitFlowRaw((prev) => {
			const next = resolveStateUpdate(prev, nextValueOrUpdater);
			return areRuntimeStateValuesEqual(next, prev) ? prev : next;
		});
	}, []);

	// Patch helpers
	const patchActiveAmbulanceTrip = useCallback((updates) => {
		if (!updates || typeof updates !== "object") return;
		setActiveAmbulanceTrip((prev) => {
			if (!prev) return prev;
			const nextAssigned =
				updates.assignedAmbulance && typeof updates.assignedAmbulance === "object"
					? { ...(prev.assignedAmbulance || {}), ...updates.assignedAmbulance }
					: prev.assignedAmbulance;
			return { ...prev, ...updates, assignedAmbulance: nextAssigned };
		});
	}, [setActiveAmbulanceTrip]);

	const patchActiveBedBooking = useCallback((updates) => {
		if (!updates || typeof updates !== "object") return;
		setActiveBedBooking((prev) => {
			if (!prev) return prev;
			const next = { ...prev, ...updates };
			return areRuntimeStateValuesEqual(next, prev) ? prev : next;
		});
	}, [setActiveBedBooking]);

	const patchPendingApproval = useCallback((updates) => {
		if (!updates || typeof updates !== "object") return;
		setPendingApproval((prev) => {
			if (!prev) return prev;
			const next = { ...prev, ...updates };
			return areRuntimeStateValuesEqual(next, prev) ? prev : next;
		});
	}, [setPendingApproval]);

	// Hydrate from local DB on mount
	useEffect(() => {
		if (emergencyStateHydratedRef.current) return undefined;
		let cancelled = false;

		const hydrate = async () => {
			try {
				const storedState = await database.read(StorageKeys.EMERGENCY_STATE, null);
				if (cancelled || !storedState || typeof storedState !== "object") return;

				const normalized = normalizeEmergencyState(storedState);

				if (!activeAmbulanceTripRef.current?.requestId && normalized.activeAmbulanceTrip?.requestId) {
					setActiveAmbulanceTripRaw(normalized.activeAmbulanceTrip);
				}
				if (!activeBedBookingRef.current?.requestId && normalized.activeBedBooking?.requestId) {
					setActiveBedBookingRaw(normalized.activeBedBooking);
				}
				if (!pendingApprovalRef.current?.requestId && normalized.pendingApproval?.requestId) {
					setPendingApprovalRaw(normalized.pendingApproval);
				}
				if (!commitFlowRef.current?.phase && normalized.commitFlow?.phase) {
					setCommitFlowRaw(normalized.commitFlow);
				}
				if (normalized.mode && normalized.mode !== mode) {
					setMode(normalized.mode);
				}
			} catch (error) {
				console.warn("[useEmergencyTripState] Failed to hydrate:", error);
			} finally {
				if (!cancelled) emergencyStateHydratedRef.current = true;
			}
		};

		void hydrate();
		return () => { cancelled = true; };
	}, [mode]);

	// Persist on change (after hydration)
	useEffect(() => {
		if (!emergencyStateHydratedRef.current) return;
		const normalized = normalizeEmergencyState({ mode, activeAmbulanceTrip, activeBedBooking, pendingApproval, commitFlow });
		const sig = JSON.stringify(normalized);
		if (sig === emergencyStatePersistSignatureRef.current) return;
		emergencyStatePersistSignatureRef.current = sig;
		database.write(StorageKeys.EMERGENCY_STATE, normalized).catch((error) => {
			console.warn("[useEmergencyTripState] Failed to persist:", error);
		});
	}, [activeAmbulanceTrip, activeBedBooking, commitFlow, mode, pendingApproval]);

	// UI derived
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

	const setAmbulanceTripStatus = useCallback((status) => {
		setActiveAmbulanceTrip((prev) => {
			if (!prev) return prev;
			return { ...prev, status };
		});
	}, [setActiveAmbulanceTrip]);

	const setBedBookingStatus = useCallback((status) => {
		setActiveBedBooking((prev) => {
			if (!prev) return prev;
			return { ...prev, status };
		});
	}, [setActiveBedBooking]);

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

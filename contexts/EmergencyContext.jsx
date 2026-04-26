import { createContext, useContext, useMemo, useEffect, useState } from "react";
import {
	useEmergencyLocationSync,
	useEmergencyTripState,
	useEmergencyServerSync,
	useEmergencyRealtime,
	useEmergencyCoverageMode,
	useEmergencyHospitalSync,
	useEmergencyActions,
	useTripLifecycle,
} from '../hooks/emergency';
// PULLBACK NOTE: EmergencyMode moved to constants/emergency.js to break circular dep
// OLD: Defined inline here
// NEW: Imported from constants, re-exported for backward compat
export { EmergencyMode } from '../constants/emergency';

const EmergencyContext = createContext();

export function EmergencyProvider({ children }) {
	const { userLocation, setUserLocation, userLocationRef, parseEtaToSeconds } =
		useEmergencyLocationSync();

	const {
		mode, setMode, serviceType, selectedSpecialty, viewMode,
		selectedHospitalId, setSelectedHospitalId,
		activeAmbulanceTrip, activeBedBooking, pendingApproval, commitFlow,
		hasActiveFilters,
		activeAmbulanceTripRef, activeBedBookingRef,
		setActiveAmbulanceTrip, setActiveBedBooking, setPendingApproval, setCommitFlow,
		patchActiveAmbulanceTrip, patchActiveBedBooking, patchPendingApproval,
		toggleMode, selectHospital, clearSelectedHospital,
		selectSpecialty, selectServiceType, toggleViewMode, resetFilters,
		setAmbulanceTripStatus, setBedBookingStatus,
	} = useEmergencyTripState();

	// Bridge state: feeds real hospitals into coverage hook each render
	const [hospitalsBridge, setHospitalsBridge] = useState(null);

	const {
		demoOwnerSlug, forceDemoFetch,
		coverageModePreference, coverageModePreferenceLoaded, coverageModeOperation,
		effectiveCoverageMode, effectiveDemoModeEnabled, isLiveOnlyAvailable,
		coverageStatus, nearbyCoverageCounts,
		hasDemoHospitalsNearby, hasComfortableDemoCoverage, hasComfortableNearbyCoverage,
		setCoverageMode, setRefetchHospitals,
	} = useEmergencyCoverageMode({ userLocation, hospitals: hospitalsBridge });

	const {
		hospitals, filteredHospitals, visibleHospitals, availableHospitals,
		specialties, selectedHospital, isLoadingHospitals,
		activeAmbulances, refetchHospitals,
		updateHospitals, refreshHospitals, getActiveAmbulanceDemoHospital,
	} = useEmergencyHospitalSync({
		userLocation, demoOwnerSlug, forceDemoFetch,
		effectiveCoverageMode, effectiveDemoModeEnabled,
		mode, serviceType, selectedSpecialty,
		selectedHospitalId, setSelectedHospitalId,
	});

	useEffect(() => { setHospitalsBridge(hospitals); }, [hospitals]);
	useEffect(() => { setRefetchHospitals(refetchHospitals); }, [refetchHospitals, setRefetchHospitals]);

	const { syncActiveTripsFromServer } = useEmergencyServerSync({
		activeAmbulanceTripRef,
		activeBedBookingRef,
		setActiveAmbulanceTrip,
		setActiveBedBooking,
		setPendingApproval,
		parseEtaToSeconds,
	});

	const { resetAmbulanceEventVersion } = useEmergencyRealtime({
		activeAmbulanceTrip,
		activeBedBooking,
		activeAmbulanceTripRef,
		userLocationRef,
		setActiveAmbulanceTrip,
		setActiveBedBooking,
		updateHospitals,
		hospitals,
		syncActiveTripsFromServer,
	});

	// PULLBACK NOTE: Phase 4 — mount XState trip lifecycle machine
	// OLD: trip lifecycle derived ad-hoc from status strings scattered across codebase
	// NEW: explicit states, legal transitions only, DevTools observable
	// additive only — existing consumers unaffected, use tripState/isActive etc. going forward
	const {
		tripState, tripLifecycleSnapshot, send: sendTripEvent,
		isIdle, isPendingApproval, isActive, isArrived,
		isCompleting, isCompleted, isCancelled,
		isRatingPending, hasActiveTrip,
		submitTrip, approveTrip, arriveTrip, completeTrip,
		cancelTrip, resetTrip, dismissRating,
	} = useTripLifecycle();

	const {
		ambulanceTelemetryHealth,
		startAmbulanceTrip, stopAmbulanceTrip,
		startBedBooking, stopBedBooking,
	} = useEmergencyActions({
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
	});

	const value = useMemo(
		() => ({
			hospitals: filteredHospitals,
			allHospitals: visibleHospitals,
			filteredHospitals,
			specialties,
			selectedHospitalId,
			selectedHospital,
			mode,
			userLocation,
			ambulanceTelemetryHealth,
			serviceType,
			selectedSpecialty,
			viewMode,
			commitFlow,
			isLoadingHospitals,
			hasActiveFilters,
			coverageMode: effectiveCoverageMode,
			coverageModePreference,
			coverageModePreferenceLoaded,
			coverageStatus,
			nearbyCoverageCounts,
			effectiveDemoModeEnabled,
			isLiveOnlyAvailable,
			hasDemoHospitalsNearby,
			hasComfortableDemoCoverage,
			hasComfortableNearbyCoverage,
			coverageModeOperation,
			selectHospital,
			clearSelectedHospital,
			toggleMode,
			setMode,
			toggleViewMode,
			selectSpecialty,
			selectServiceType,
			resetFilters,
			startAmbulanceTrip,
			stopAmbulanceTrip,
			setAmbulanceTripStatus,
			patchActiveAmbulanceTrip,
			startBedBooking,
			stopBedBooking,
			setBedBookingStatus,
			patchActiveBedBooking,
			updateHospitals,
			refreshHospitals,
			setUserLocation,
			setPendingApproval,
			setCommitFlow,
			setCoverageMode,
			clearCommitFlow: () => setCommitFlow(null),

			// PULLBACK NOTE: Phase 4 — XState lifecycle (additive, no consumer changes required)
			tripState,
			tripLifecycleSnapshot,
			sendTripEvent,
			isIdle,
			isPendingApproval,
			isActive,
			isArrived,
			isCompleting,
			isCompleted,
			isCancelled,
			isRatingPending,
			hasActiveTrip,
			submitTrip,
			approveTrip,
			arriveTrip,
			completeTrip,
			cancelTrip,
			resetTrip,
			dismissRating,
		}),
		[
			filteredHospitals, visibleHospitals, specialties,
			selectedHospitalId, selectedHospital, mode, userLocation,
			ambulanceTelemetryHealth,
			serviceType, selectedSpecialty, viewMode,
			commitFlow, isLoadingHospitals, hasActiveFilters,
			effectiveCoverageMode, coverageModePreference, coverageModePreferenceLoaded,
			coverageStatus, nearbyCoverageCounts, effectiveDemoModeEnabled,
			isLiveOnlyAvailable, hasDemoHospitalsNearby, hasComfortableDemoCoverage,
			hasComfortableNearbyCoverage, coverageModeOperation,
			selectHospital, clearSelectedHospital, toggleMode, setMode,
			toggleViewMode, selectSpecialty, selectServiceType, resetFilters,
			startAmbulanceTrip, stopAmbulanceTrip, setAmbulanceTripStatus,
			patchActiveAmbulanceTrip, startBedBooking, stopBedBooking,
			setBedBookingStatus, patchActiveBedBooking, updateHospitals,
			refreshHospitals, setUserLocation, setPendingApproval,
			setCommitFlow, setCoverageMode,
			tripState, tripLifecycleSnapshot, sendTripEvent,
			isIdle, isPendingApproval, isActive, isArrived,
			isCompleting, isCompleted, isCancelled,
			isRatingPending, hasActiveTrip,
			submitTrip, approveTrip, arriveTrip, completeTrip,
			cancelTrip, resetTrip, dismissRating,
		]
	);

	return (
		<EmergencyContext.Provider value={value}>
			{children}
		</EmergencyContext.Provider>
	);
}

export function useEmergency() {
	const context = useContext(EmergencyContext);
	if (context === undefined) {
		throw new Error("useEmergency must be used within an EmergencyProvider");
	}
	return context;
}
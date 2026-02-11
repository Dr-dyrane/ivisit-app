import { useState, useCallback, useMemo, useEffect } from "react";
import { useHospitals } from "./useHospitals";
import { useAmbulances } from "./useAmbulances";
import { useLocationSync } from "./useLocationSync";
import { useEmergencySubscription } from "./useEmergencySubscription";
import { useEmergencyHydration } from "./useEmergencyHydration";
import { processHospitalsWithLocation } from "../../services/emergencyService";
import { filterHospitals, normalizeHospitals, enrichHospitalsWithServiceTypes } from "../../services/emergency/hospitalLogic";
import { parseEtaToSeconds } from "../../services/emergency/locationUtils";
import { EmergencyMode } from "../../constants/emergency";

export const useEmergencyLogic = () => {
	const { hospitals: dbHospitals, isLoading: isLoadingHospitals } = useHospitals();
	const { ambulances: activeAmbulances } = useAmbulances();

	// State
	const [hospitals, setHospitals] = useState([]);
	const [selectedHospitalId, setSelectedHospitalId] = useState(null);
	const [mode, setMode] = useState(EmergencyMode.EMERGENCY);
	const [activeAmbulanceTrip, setActiveAmbulanceTrip] = useState(null);
	const [activeBedBooking, setActiveBedBooking] = useState(null);
	const [serviceType, setServiceType] = useState(null); 
	const [selectedSpecialty, setSelectedSpecialty] = useState(null); 
	const [viewMode, setViewMode] = useState("map");

    // Custom Hooks
    const { userLocation, setUserLocation } = useLocationSync(activeAmbulanceTrip);
    useEmergencySubscription({ setActiveBedBooking, setActiveAmbulanceTrip });
    useEmergencyHydration({ setActiveAmbulanceTrip, setActiveBedBooking, activeAmbulanceTrip });

	// Sync DB hospitals
	useEffect(() => {
		if (isLoadingHospitals || dbHospitals.length === 0) return;
        const processed = processHospitalsWithLocation(dbHospitals, userLocation);
        setHospitals(processed);
	}, [dbHospitals, isLoadingHospitals, userLocation]);

	// Memoized Computations
	const selectedHospital = useMemo(() => 
		hospitals.find(h => h.id === selectedHospitalId) || null
	, [hospitals, selectedHospitalId]);

	const filteredHospitals = useMemo(() => 
		filterHospitals(hospitals, mode, serviceType, selectedSpecialty)
	, [hospitals, mode, serviceType, selectedSpecialty]);

	// Actions
	const resetFilters = useCallback(() => {
		setServiceType(null);
		setSelectedSpecialty(null);
		setSelectedHospitalId(null);
	}, []);

	const selectHospital = useCallback((hospitalId) => setSelectedHospitalId(hospitalId), []);
	const clearSelectedHospital = useCallback(() => setSelectedHospitalId(null), []);

	const startAmbulanceTrip = useCallback((trip) => {
		if (!trip?.hospitalId) return;
		const etaSeconds = Number.isFinite(trip?.etaSeconds) ? trip.etaSeconds : parseEtaToSeconds(trip?.estimatedArrival);
		
		const byId = trip?.ambulanceId ? activeAmbulances.find((a) => a?.id === trip.ambulanceId) : null;
		const byHospital = trip?.hospitalName ? activeAmbulances.find((a) => a?.hospital === trip.hospitalName) : null;
		const fallback = activeAmbulances.find((a) => a?.status === "available") ?? activeAmbulances[0] ?? null;
		const assignedAmbulance = byId ?? byHospital ?? fallback;

		setActiveAmbulanceTrip({
			hospitalId: trip.hospitalId,
			requestId: trip.requestId ?? null,
			status: trip.status ?? null,
			ambulanceId: assignedAmbulance?.id ?? trip.ambulanceId ?? null,
			ambulanceType: trip.ambulanceType ?? assignedAmbulance?.type ?? null,
			estimatedArrival: trip.estimatedArrival ?? null,
			etaSeconds: Number.isFinite(etaSeconds) ? etaSeconds : null,
			assignedAmbulance,
			startedAt: Number.isFinite(trip?.startedAt) ? trip.startedAt : Date.now(),
		});
	}, [activeAmbulances]);

	const stopAmbulanceTrip = useCallback(() => setActiveAmbulanceTrip(null), []);
	const setAmbulanceTripStatus = useCallback((status) => setActiveAmbulanceTrip(prev => prev ? { ...prev, status } : prev), []);

	const startBedBooking = useCallback((booking) => {
		if (!booking?.hospitalId) return;
		const etaSeconds = Number.isFinite(booking?.etaSeconds) ? booking.etaSeconds : parseEtaToSeconds(booking?.estimatedWait ?? booking?.estimatedArrival);

		setActiveBedBooking({
			hospitalId: booking.hospitalId,
			bookingId: booking.bookingId ?? booking.requestId ?? null,
			requestId: booking.requestId ?? booking.bookingId ?? null,
			status: booking.status ?? null,
			bedNumber: booking.bedNumber ?? null,
			bedType: booking.bedType ?? null,
			bedCount: booking.bedCount ?? null,
			specialty: booking.specialty ?? null,
			hospitalName: booking.hospitalName ?? null,
			estimatedWait: booking.estimatedWait ?? booking.estimatedArrival ?? null,
			etaSeconds: Number.isFinite(etaSeconds) ? etaSeconds : null,
			startedAt: Number.isFinite(booking?.startedAt) ? booking.startedAt : Date.now(),
		});
	}, []);

	const stopBedBooking = useCallback(() => setActiveBedBooking(null), []);
	const setBedBookingStatus = useCallback((status) => setActiveBedBooking(prev => prev ? { ...prev, status } : prev), []);

	const toggleMode = useCallback(() => {
		setMode(prev => prev === EmergencyMode.EMERGENCY ? EmergencyMode.BOOKING : EmergencyMode.EMERGENCY);
		setSelectedHospitalId(null);
	}, []);

	const selectSpecialty = useCallback((s) => { setSelectedSpecialty(s); setSelectedHospitalId(null); }, []);
	const selectServiceType = useCallback((t) => { setServiceType(t ? t.toLowerCase() : null); setSelectedHospitalId(null); }, []);
	const toggleViewMode = useCallback(() => setViewMode(prev => prev === "map" ? "list" : "map"), []);

	// Explicit update
	const updateHospitals = useCallback((newHospitals) => {
		const normalized = normalizeHospitals(newHospitals);
		setHospitals(enrichHospitalsWithServiceTypes(normalized));
	}, []);

	// Memoized Return Value
    return useMemo(() => ({
        hospitals: filteredHospitals,
		allHospitals: hospitals,
		filteredHospitals,
		selectedHospitalId,
		selectedHospital,
		mode,
		userLocation,
		activeAmbulanceTrip,
		activeBedBooking,
		serviceType,
		selectedSpecialty,
		viewMode,
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
		startBedBooking,
		stopBedBooking,
		setBedBookingStatus,
		updateHospitals,
		setUserLocation,
    }), [
        filteredHospitals,
        hospitals,
        selectedHospitalId,
        selectedHospital,
        mode,
        userLocation,
        activeAmbulanceTrip,
        activeBedBooking,
        serviceType,
        selectedSpecialty,
        viewMode,
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
        startBedBooking,
        stopBedBooking,
        setBedBookingStatus,
        updateHospitals,
        setUserLocation
    ]);
};

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { SPECIALTIES } from "../data/hospitals";

// Create the emergency context
const EmergencyContext = createContext();

// Emergency modes
export const EmergencyMode = {
	EMERGENCY: "emergency",
	BOOKING: "booking",
};

// Emergency provider component
export function EmergencyProvider({ children }) {
	// Core state - start empty, map will generate nearby hospitals
	const [hospitals, setHospitals] = useState([]);
	const [selectedHospitalId, setSelectedHospitalId] = useState(null);
	const [mode, setMode] = useState(EmergencyMode.EMERGENCY);
	
	// Emergency mode state
	const [serviceType, setServiceType] = useState("premium"); // "premium" or "standard"
	
	// Booking mode state
	const [selectedSpecialty, setSelectedSpecialty] = useState("General Care");
	
	// View state
	const [viewMode, setViewMode] = useState("map"); // "map" or "list"
	
	// User location (for map centering and distance calculations)
	const [userLocation, setUserLocation] = useState(null);

	// Get selected hospital object
	const selectedHospital = useMemo(() => {
		return hospitals.find(h => h.id === selectedHospitalId) || null;
	}, [hospitals, selectedHospitalId]);

	// Filter hospitals based on current mode and criteria
	const filteredHospitals = useMemo(() => {
		return hospitals.filter((hospital) => {
			if (mode === EmergencyMode.EMERGENCY) {
				// Emergency: filter by service type (premium/standard)
				return hospital.type.toLowerCase() === serviceType;
			} else {
				// Booking: filter by specialty and available beds
				return hospital.specialties.includes(selectedSpecialty) && hospital.availableBeds > 0;
			}
		});
	}, [hospitals, mode, serviceType, selectedSpecialty]);

	// Actions
	const selectHospital = useCallback((hospitalId) => {
		setSelectedHospitalId(hospitalId);
	}, []);

	const clearSelectedHospital = useCallback(() => {
		setSelectedHospitalId(null);
	}, []);

	const toggleMode = useCallback(() => {
		setMode(prevMode => 
			prevMode === EmergencyMode.EMERGENCY 
				? EmergencyMode.BOOKING 
				: EmergencyMode.EMERGENCY
		);
		setSelectedHospitalId(null); // Clear selection on mode change
	}, []);

	const selectSpecialty = useCallback((specialty) => {
		setSelectedSpecialty(specialty);
		setSelectedHospitalId(null); // Clear selection on specialty change
	}, []);

	const selectServiceType = useCallback((type) => {
		setServiceType(type);
		setSelectedHospitalId(null); // Clear selection on type change
	}, []);

	const toggleViewMode = useCallback(() => {
		setViewMode(prevMode => prevMode === "map" ? "list" : "map");
	}, []);

	// Update hospitals (for when we integrate with API)
	const updateHospitals = useCallback((newHospitals) => {
		setHospitals(newHospitals);
	}, []);

	const value = {
		// State
		hospitals,
		selectedHospitalId,
		selectedHospital,
		filteredHospitals,
		mode,
		serviceType,
		selectedSpecialty,
		specialties: SPECIALTIES,
		viewMode,
		userLocation,
		
		// Actions
		selectHospital,
		clearSelectedHospital,
		toggleMode,
		setMode,
		selectSpecialty,
		selectServiceType,
		toggleViewMode,
		setViewMode,
		updateHospitals,
		setUserLocation,
	};

	return (
		<EmergencyContext.Provider value={value}>
			{children}
		</EmergencyContext.Provider>
	);
}

// Custom hook to use the emergency context
export function useEmergency() {
	const context = useContext(EmergencyContext);
	if (context === undefined) {
		throw new Error("useEmergency must be used within an EmergencyProvider");
	}
	return context;
}


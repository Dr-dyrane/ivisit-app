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
	const [serviceType, setServiceType] = useState(null); // null = show all, "premium" or "standard"
	
	// Booking mode state
	const [selectedSpecialty, setSelectedSpecialty] = useState(null); // null = show all
	
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
		if (!hospitals || hospitals.length === 0) return [];
		
		return hospitals.filter((hospital) => {
			if (!hospital) return false;
			
			if (mode === EmergencyMode.EMERGENCY) {
				// Emergency: show all by default, filter by service type if selected
				if (!serviceType) return true; // Show all if no filter selected
				return hospital.serviceTypes?.includes(serviceType) ?? hospital.type?.toLowerCase?.() === serviceType;
			} else {
				// Booking: show all with available beds by default, filter by specialty if selected
				if (!hospital.availableBeds || hospital.availableBeds <= 0) return false;
				if (!selectedSpecialty) return true; // Show all if no specialty selected
				return hospital.specialties?.includes(selectedSpecialty);
			}
		});
	}, [hospitals, mode, serviceType, selectedSpecialty]);

	// Check if any filters are active
	const hasActiveFilters = useMemo(() => {
		if (mode === EmergencyMode.EMERGENCY) {
			return serviceType !== null;
		} else {
			return selectedSpecialty !== null;
		}
	}, [mode, serviceType, selectedSpecialty]);

	// Reset all filters
	const resetFilters = useCallback(() => {
		setServiceType(null);
		setSelectedSpecialty(null);
		setSelectedHospitalId(null);
	}, []);

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
		setServiceType(type ? type.toLowerCase() : null);
		setSelectedHospitalId(null); // Clear selection on type change
	}, []);

	const toggleViewMode = useCallback(() => {
		setViewMode(prevMode => prevMode === "map" ? "list" : "map");
	}, []);

	// Enrich hospitals with dynamic service types
	const enrichHospitals = useCallback((newHospitals) => {
		return newHospitals.map((hospital, index) => {
			// Determine service types - allow some hospitals to offer both
			let serviceTypes = [];
			
			if (hospital.type === "premium") {
				serviceTypes = ["premium"];
				// Some premium hospitals also offer standard service (30% of premium)
				if (index % 3 === 0) {
					serviceTypes.push("standard");
				}
			} else {
				serviceTypes = ["standard"];
				// Some standard hospitals also offer premium service (20% of standard)
				if (index % 5 === 0) {
					serviceTypes.push("premium");
				}
			}
			
			return {
				...hospital,
				serviceTypes,
			};
		});
	}, []);

	// Update hospitals (for when we integrate with API)
	const updateHospitals = useCallback((newHospitals) => {
		const enriched = enrichHospitals(newHospitals);
		setHospitals(enriched);
	}, [enrichHospitals]);

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
		hasActiveFilters,
		
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
		resetFilters,
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


import React, { useCallback, useState, useEffect } from "react";
import { useFocusEffect } from "expo-router";
import EmergencyScreen from "../../../screens/EmergencyScreen";
import { EmergencyMode, useEmergency } from "../../../contexts/EmergencyContext";
import { useFAB } from "../../../contexts/FABContext";

const Home = () => {
	const { setMode, clearSelectedHospital, mode, selectedHospital } = useEmergency();
	const { registerFAB, unregisterFAB } = useFAB();
	const [currentMode, setCurrentMode] = useState(EmergencyMode.EMERGENCY);

	// Set mode when tab focuses
	useFocusEffect(
		useCallback(() => {
			setMode(currentMode);
			clearSelectedHospital();
		}, [clearSelectedHospital, setMode, currentMode])
	);

	// FAB VISIBILITY FIX: Changed from useFocusEffect to useEffect to keep FAB registered during navigation
	// This ensures the Home Tab FAB stays available as fallback when EmergencyScreen FAB is hidden in detailed mode
	// Added selectedHospital dependency to hide FAB when hospital is selected (detailed mode)
	// Priority: 10 (lower than EmergencyScreen's 15, so EmergencyScreen wins when visible)
	useEffect(() => {
		const fabId = 'home-tab-fab';
		
		// Hide FAB when hospital is selected (detailed mode)
		const shouldHideFAB = !!selectedHospital;
		
		if (currentMode === EmergencyMode.EMERGENCY) {
			// When in ambulance mode, show "Book Bed" to switch to bed booking
			// Registering Book Bed FAB
			
			registerFAB(fabId, {
				visible: !shouldHideFAB,
				icon: "bed-patient",
				style: "primary",
				priority: 10,
				onPress: () => {
					// Toggle to Bed mode
					setCurrentMode(EmergencyMode.BOOKING);
					setMode(EmergencyMode.BOOKING);
				},
			});
		} else {
			// When in bed booking mode, show "SOS" to switch to ambulance
			// Registering SOS FAB
			
			registerFAB(fabId, {
				visible: !shouldHideFAB,
				icon: "medical-outline",
				style: "emergency",
				priority: 10,
				onPress: () => {
					// Toggle to SOS mode
					setCurrentMode(EmergencyMode.EMERGENCY);
					setMode(EmergencyMode.EMERGENCY);
				},
			});
		}

		// Cleanup on unmount or mode change
		return () => {
			// Unregistering FAB
			unregisterFAB(fabId);
		};
	}, [currentMode, selectedHospital, registerFAB, unregisterFAB, setMode]);

	return <EmergencyScreen />;
};

export default Home;

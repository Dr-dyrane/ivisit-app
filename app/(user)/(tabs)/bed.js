import React, { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import EmergencyScreen from "../../../screens/EmergencyScreen";
import { EmergencyMode, useEmergency } from "../../../contexts/EmergencyContext";

export default function BedTab() {
	const { setMode, clearSelectedHospital } = useEmergency();

	useFocusEffect(
		useCallback(() => {
			setMode(EmergencyMode.BOOKING);
			clearSelectedHospital();
		}, [clearSelectedHospital, setMode])
	);

	return <EmergencyScreen />;
}

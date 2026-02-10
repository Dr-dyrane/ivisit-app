import React, { useCallback, useEffect } from "react";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import EmergencyScreen from "../../../screens/EmergencyScreen";
import { EmergencyMode, useEmergency } from "../../../contexts/EmergencyContext";
import { useFABActions } from "../../../contexts/FABContext";

const Home = () => {
	const { setMode, clearSelectedHospital, mode, selectedHospital, activeBedBooking, activeAmbulanceTrip } = useEmergency();
	const { registerFAB, unregisterFAB } = useFABActions();

	// Track if we've already synced the mode to the active trip on this focus session
	const hasSyncedRef = React.useRef(false);

	// Sync mode on focus - only once per entry to the tab
	useFocusEffect(
		useCallback(() => {
			if (hasSyncedRef.current) return;

			// Logic: Initial landing should prioritize where the action is
			const hasActiveAmbulance = !!activeAmbulanceTrip?.requestId;
			const hasActiveBed = !!activeBedBooking?.requestId;

			if (!hasActiveAmbulance && hasActiveBed) {
				setMode(EmergencyMode.BOOKING);
			} else if (!hasActiveBed && hasActiveAmbulance) {
				setMode(EmergencyMode.EMERGENCY);
			}

			hasSyncedRef.current = true;
			clearSelectedHospital();
		}, [clearSelectedHospital, setMode, activeBedBooking?.requestId, activeAmbulanceTrip?.requestId])
	);

	// Reset sync ref when the tab is actually unfocused
	useEffect(() => {
		return () => {
			hasSyncedRef.current = false;
		};
	}, []);

	useEffect(() => {
		const fabId = 'home-tab-fab';
		const shouldHideFAB = !!selectedHospital;

		if (mode === EmergencyMode.EMERGENCY) {
			registerFAB(fabId, {
				visible: !shouldHideFAB,
				icon: "bed-outline",
				style: "primary",
				priority: 10,
				onPress: () => {
					setMode(EmergencyMode.BOOKING);
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
				},
			});
		} else {
			registerFAB(fabId, {
				visible: !shouldHideFAB,
				icon: "alarm-light-outline",
				style: "emergency",
				priority: 10,
				onPress: () => {
					setMode(EmergencyMode.EMERGENCY);
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
				},
			});
		}

		return () => unregisterFAB(fabId);
	}, [mode, selectedHospital, registerFAB, unregisterFAB, setMode]);

	return <EmergencyScreen />;
};

export default Home;

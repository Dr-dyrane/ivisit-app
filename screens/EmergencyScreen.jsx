"use client";

import { useRef, useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { View, StyleSheet, Platform } from "react-native";
import { useEmergency } from "../contexts/EmergencyContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useFAB } from "../contexts/FABContext";
import { COLORS } from "../constants/colors";
import { Ionicons, Fontisto } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import FullScreenEmergencyMap from "../components/map/FullScreenEmergencyMap";
import EmergencyBottomSheet from "../components/emergency/EmergencyBottomSheet";
import NotificationIconButton from "../components/headers/NotificationIconButton";
import ProfileAvatarButton from "../components/headers/ProfileAvatarButton";

/**
 * EmergencyScreen - Apple Maps Style Layout
 *
 * Features:
 * - Full-screen map as background
 * - Smart context-aware search bar
 * - Draggable bottom sheet with hospital list
 * - Responsive service/specialty selector (collapses on small snap)
 * - Live map feedback on hospital selection
 * - Scroll-aware header/tab bar hiding
 * - Glass effect header
 * - Works with tab bar and FAB
 */
export default function EmergencyScreen() {
	const { resetTabBar } = useTabBarVisibility();
	const { resetHeader } = useScrollAwareHeader();
	const { setHeaderState } = useHeaderState();
	const { registerFAB } = useFAB();

	// Refs for map and bottom sheet
	const mapRef = useRef(null);
	const bottomSheetRef = useRef(null);

	// Track sheet snap point - hide recenter when sheet is fully expanded
	const [sheetSnapIndex, setSheetSnapIndex] = useState(1);

	// Search state - filters hospitals and can zoom map to matches
	const [searchQuery, setSearchQuery] = useState("");

	// Emergency context state
	const {
		hospitals,
		selectedHospital,
		filteredHospitals,
		mode,
		serviceType,
		selectedSpecialty,
		specialties,
		selectHospital,
		toggleMode,
		selectSpecialty,
		selectServiceType,
		updateHospitals,
	} = useEmergency();

	// Header components - memoized
	const leftComponent = useMemo(() => <ProfileAvatarButton />, []);
	const rightComponent = useMemo(() => <NotificationIconButton />, []);

	// Calculate tab bar height for bottom sheet offset
	const tabBarHeight = Platform.OS === "ios" ? 85 : 70;

	// Handle sheet snap changes - hide map controls when fully expanded
	const handleSheetSnapChange = useCallback((index) => {
		setSheetSnapIndex(index);
	}, []);

	// Set up header on focus
	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: mode === "emergency" ? "Ambulance Call" : "Reserve Bed",
				subtitle: mode === "emergency" ? "EMERGENCY" : "BOOK BED",
				icon:
					mode === "emergency" ? (
						<Ionicons name="medical" size={26} color="#FFFFFF" />
					) : (
						<Fontisto name="bed-patient" size={22} color="#FFFFFF" />
					),
				backgroundColor: COLORS.brandPrimary,
				leftComponent,
				rightComponent,
			});
		}, [resetTabBar, resetHeader, setHeaderState, mode, leftComponent, rightComponent])
	);

	// FAB toggles between emergency and bed booking modes
	const handleFloatingButtonPress = useCallback(() => {
		toggleMode();
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
	}, [toggleMode]);

	useFocusEffect(
		useCallback(() => {
			registerFAB({
				icon: mode === "emergency" ? "bed-patient" : "medical",
				visible: true,
				onPress: handleFloatingButtonPress,
			});
		}, [mode, handleFloatingButtonPress, registerFAB])
	);

	// Hospital selection - zoom map to location
	const handleHospitalSelect = useCallback((hospital) => {
		selectHospital(hospital.id);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

		// Animate map to selected hospital
		if (mapRef.current) {
			mapRef.current.animateToHospital(hospital);
		}
	}, [selectHospital]);

	// Emergency call handler
	const handleEmergencyCall = useCallback((hospitalId) => {
		const hospital = hospitals.find((h) => h.id === hospitalId);
		selectHospital(hospitalId);
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		console.log("[iVisit] Emergency call requested for:", hospital?.name);
	}, [hospitals, selectHospital]);

	// Service type selection
	const handleServiceTypeSelect = useCallback((type) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		selectServiceType(type);
	}, [selectServiceType]);

	// Specialty selection
	const handleSpecialtySelect = useCallback((specialty) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		selectSpecialty(specialty);
	}, [selectSpecialty]);

	// Search handler - filters hospitals by name, specialty, address
	const handleSearch = useCallback((query) => {
		setSearchQuery(query);
		// If search matches a single hospital, zoom to it on map
		if (query.length > 2 && mapRef.current) {
			const matches = filteredHospitals.filter((h) =>
				h.name.toLowerCase().includes(query.toLowerCase()) ||
				h.address?.toLowerCase().includes(query.toLowerCase()) ||
				h.specialties?.some((s) => s.toLowerCase().includes(query.toLowerCase()))
			);
			if (matches.length === 1) {
				mapRef.current.animateToHospital(matches[0]);
			}
		}
	}, [filteredHospitals]);

	// Filter hospitals based on search query
	const searchFilteredHospitals = useMemo(() => {
		if (!searchQuery.trim()) return filteredHospitals;
		const query = searchQuery.toLowerCase();
		return filteredHospitals.filter((h) =>
			h.name.toLowerCase().includes(query) ||
			h.address?.toLowerCase().includes(query) ||
			h.specialties?.some((s) => s.toLowerCase().includes(query))
		);
	}, [filteredHospitals, searchQuery]);

	// Hide recenter button when sheet is fully expanded (no map visible)
	const showMapControls = sheetSnapIndex < 2;

	return (
		<View style={styles.container}>
			{/* Full-screen map as background */}
			<FullScreenEmergencyMap
				ref={mapRef}
				hospitals={hospitals.length > 0 ? searchFilteredHospitals : undefined}
				onHospitalSelect={handleHospitalSelect}
				onHospitalsGenerated={updateHospitals}
				selectedHospitalId={selectedHospital?.id}
				mode={mode}
				showControls={showMapControls}
			/>

			{/* Draggable bottom sheet overlay */}
			<EmergencyBottomSheet
				ref={bottomSheetRef}
				mode={mode}
				serviceType={serviceType}
				selectedSpecialty={selectedSpecialty}
				specialties={specialties}
				hospitals={searchFilteredHospitals}
				selectedHospital={selectedHospital}
				onServiceTypeSelect={handleServiceTypeSelect}
				onSpecialtySelect={handleSpecialtySelect}
				onHospitalSelect={handleHospitalSelect}
				onHospitalCall={handleEmergencyCall}
				onSnapChange={handleSheetSnapChange}
				onSearch={handleSearch}
				searchQuery={searchQuery}
				tabBarHeight={tabBarHeight}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});

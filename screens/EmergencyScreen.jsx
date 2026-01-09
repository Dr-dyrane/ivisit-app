"use client";

import { useRef, useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import { View, StyleSheet, Dimensions } from "react-native";
import { useEmergency } from "../contexts/EmergencyContext";
import { useEmergencyUI } from "../contexts/EmergencyUIContext";
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
 * Uses EmergencyUIContext for UI state (animations, snap points, search)
 * Uses EmergencyContext for data (hospitals, mode, filters)
 *
 * This separation enables:
 * - Animation timing tracking for debugging
 * - Centralized UI state management
 * - Easier performance optimization
 */
export default function EmergencyScreen() {
	const { resetTabBar, lockTabBarHidden, unlockTabBarHidden } =
		useTabBarVisibility();
	const { resetHeader } = useScrollAwareHeader();
	const { setHeaderState } = useHeaderState();
	const { registerFAB } = useFAB();

	// Refs for map and bottom sheet
	const mapRef = useRef(null);
	const bottomSheetRef = useRef(null);

	// UI state from EmergencyUIContext
	const {
		snapIndex: sheetSnapIndex,
		handleSnapChange: setSheetSnapIndex,
		searchQuery,
		updateSearch: setSearchQuery,
		setMapReady,
		getLastScrollY,
		timing,
	} = useEmergencyUI();

	const lastListStateRef = useRef({ snapIndex: 1, scrollY: 0 });

	// Calculate map padding based on sheet position to ensure markers are visible
	// Sheet Snap Points: 0 (Collapsed ~15%), 1 (Half 50%), 2 (Expanded 92%)
	const screenHeight = Dimensions.get("window").height;
	const mapBottomPadding = useMemo(() => {
		if (selectedHospital) return screenHeight * 0.5;
		
		switch (sheetSnapIndex) {
			case 0: return screenHeight * 0.15; // Collapsed
			case 1: return screenHeight * 0.50; // Half
			case 2: return screenHeight * 0.90; // Expanded (almost full)
			default: return screenHeight * 0.50;
		}
	}, [selectedHospital, sheetSnapIndex, screenHeight]);

	// Data state from EmergencyContext
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
		hasActiveFilters,
		resetFilters,
		clearSelectedHospital,
	} = useEmergency();

	// Header components - memoized
	const leftComponent = useMemo(() => <ProfileAvatarButton />, []);
	const rightComponent = useMemo(() => <NotificationIconButton />, []);

	// Handle sheet snap changes
	const handleSheetSnapChange = useCallback((index) => {
		setSheetSnapIndex(index, "screen");
	}, [setSheetSnapIndex]);

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

	useFocusEffect(
		useCallback(() => {
			if (selectedHospital) {
				lockTabBarHidden();
			} else {
				unlockTabBarHidden();
			}
		}, [lockTabBarHidden, selectedHospital, unlockTabBarHidden])
	);

	// FAB toggles between emergency and bed booking modes
	const handleFloatingButtonPress = useCallback(() => {
		toggleMode();
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
	}, [toggleMode]);

	useFocusEffect(
		useCallback(() => {
			const shouldHideFAB = !!selectedHospital || sheetSnapIndex === 0;
			registerFAB({
				icon: mode === "emergency" ? "bed-patient" : "medical",
				visible: !shouldHideFAB,
				onPress: handleFloatingButtonPress,
			});
		}, [handleFloatingButtonPress, mode, registerFAB, selectedHospital, sheetSnapIndex])
	);

	// Hospital selection - zoom map to location (tracked)
	const handleHospitalSelect = useCallback((hospital) => {
		if (!hospital?.id) return;
		timing.startTiming("hospital_select");
		lastListStateRef.current = {
			snapIndex: Number.isFinite(sheetSnapIndex) ? sheetSnapIndex : 1,
			scrollY: Number.isFinite(getLastScrollY()) ? getLastScrollY() : 0,
		};
		selectHospital(hospital.id);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

		// Animate map to selected hospital
		// Force bottom padding to 50% of screen height since we know the sheet will snap there
		if (mapRef.current) {
			mapRef.current.animateToHospital(hospital, {
				bottomPadding: Dimensions.get("window").height * 0.5,
				includeUser: true,
			});
		}
		timing.endTiming("hospital_select");
	}, [getLastScrollY, selectHospital, sheetSnapIndex, timing]);

	const handleCloseFocus = useCallback(() => {
		const state = lastListStateRef.current ?? { snapIndex: 1, scrollY: 0 };
		clearSelectedHospital();
		setTimeout(() => {
			bottomSheetRef.current?.restoreListState?.(state);
		}, 0);
	}, [clearSelectedHospital]);

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

	// Search handler - filters hospitals by name, specialty, address (tracked)
	const handleSearch = useCallback((query) => {
		timing.startTiming("search_filter");
		setSearchQuery(query);
		// If search matches a single hospital, zoom to it on map
		if (query.length > 2 && mapRef.current) {
			const q = query.toLowerCase();
			const matches = filteredHospitals.filter((h) => {
				const name = typeof h?.name === "string" ? h.name.toLowerCase() : "";
				const address =
					typeof h?.address === "string" ? h.address.toLowerCase() : "";
				const specialtiesMatch =
					Array.isArray(h?.specialties) &&
					h.specialties.some(
						(s) => (typeof s === "string" ? s.toLowerCase() : "").includes(q)
					);
				return name.includes(q) || address.includes(q) || specialtiesMatch;
			});
			if (matches.length === 1) {
				mapRef.current.animateToHospital(matches[0]);
			}
		}
		timing.endTiming("search_filter");
	}, [filteredHospitals, setSearchQuery, timing]);

	// Filter hospitals based on search query
	const searchFilteredHospitals = useMemo(() => {
		if (!searchQuery.trim()) return filteredHospitals;
		const query = searchQuery.toLowerCase();
		return filteredHospitals.filter((h) => {
			const name = typeof h?.name === "string" ? h.name.toLowerCase() : "";
			const address =
				typeof h?.address === "string" ? h.address.toLowerCase() : "";
			const specialtiesMatch =
				Array.isArray(h?.specialties) &&
				h.specialties.some(
					(s) => (typeof s === "string" ? s.toLowerCase() : "").includes(query)
				);
			return name.includes(query) || address.includes(query) || specialtiesMatch;
		});
	}, [filteredHospitals, searchQuery]);

	// Calculate service type counts
	const serviceTypeCounts = useMemo(() => {
		return {
			premium:
				hospitals.filter((h) => h?.serviceTypes?.includes("premium")).length || 0,
			standard:
				hospitals.filter((h) => h?.serviceTypes?.includes("standard")).length || 0,
		};
	}, [hospitals]);

	// Calculate specialty counts
	const specialtyCounts = useMemo(() => {
		const counts = {};
		specialties.forEach(specialty => {
			counts[specialty] = hospitals.filter((h) =>
				h?.specialties?.includes(specialty) && (h?.availableBeds ?? 0) > 0
			).length || 0;
		});
		return counts;
	}, [hospitals, specialties]);

	// Hide recenter button when sheet is fully expanded (no map visible)
	const showMapControls = sheetSnapIndex < 2;

	return (
		<View style={styles.container}>
			{/* Full-screen map as background */}
			<FullScreenEmergencyMap
				ref={mapRef}
				hospitals={hospitals && hospitals.length > 0 ? searchFilteredHospitals : undefined}
				onHospitalSelect={handleHospitalSelect}
				onHospitalsGenerated={updateHospitals}
				onMapReady={setMapReady}
				selectedHospitalId={selectedHospital?.id || null}
				mode={mode}
				showControls={showMapControls}
				bottomPadding={mapBottomPadding}
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
				serviceTypeCounts={serviceTypeCounts}
				specialtyCounts={specialtyCounts}
				hasActiveFilters={hasActiveFilters}
				onServiceTypeSelect={handleServiceTypeSelect}
				onSpecialtySelect={handleSpecialtySelect}
				onHospitalSelect={handleHospitalSelect}
				onHospitalCall={handleEmergencyCall}
				onSnapChange={handleSheetSnapChange}
				onSearch={handleSearch}
				onResetFilters={resetFilters}
				onCloseFocus={handleCloseFocus}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});

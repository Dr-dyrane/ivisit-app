"use client";

import { useRef, useCallback, useMemo, useState } from "react";
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
import EmergencyRequestModal from "../components/emergency/EmergencyRequestModal";
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
	const [showEmergencyRequestModal, setShowEmergencyRequestModal] =
		useState(false);
	const [requestHospitalId, setRequestHospitalId] = useState(null);

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
		activeAmbulanceTrip,
		activeBedBooking,
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
		startAmbulanceTrip,
		stopAmbulanceTrip,
		startBedBooking,
		stopBedBooking,
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
			if (selectedHospital || activeAmbulanceTrip || activeBedBooking) {
				lockTabBarHidden();
			} else {
				unlockTabBarHidden();
			}
		}, [activeAmbulanceTrip, activeBedBooking, lockTabBarHidden, selectedHospital, unlockTabBarHidden])
	);

	// FAB toggles between emergency and bed booking modes
	const handleFloatingButtonPress = useCallback(() => {
		toggleMode();
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
	}, [toggleMode]);

	useFocusEffect(
		useCallback(() => {
			const shouldHideFAB =
				!!selectedHospital || !!activeAmbulanceTrip || !!activeBedBooking || sheetSnapIndex === 0;
			registerFAB({
				icon: mode === "emergency" ? "bed-patient" : "medical",
				visible: !shouldHideFAB,
				onPress: handleFloatingButtonPress,
			});
		}, [activeAmbulanceTrip, activeBedBooking, handleFloatingButtonPress, mode, registerFAB, selectedHospital, sheetSnapIndex])
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
		if (!hospitalId) return;
		lastListStateRef.current = {
			snapIndex: Number.isFinite(sheetSnapIndex) ? sheetSnapIndex : 1,
			scrollY: Number.isFinite(getLastScrollY()) ? getLastScrollY() : 0,
		};
		selectHospital(hospitalId);
		setRequestHospitalId(hospitalId);
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		setShowEmergencyRequestModal(true);
	}, [getLastScrollY, mode, selectHospital, sheetSnapIndex]);

	const requestHospital = useMemo(() => {
		if (!requestHospitalId) return selectedHospital;
		return hospitals.find((h) => h?.id === requestHospitalId) || selectedHospital;
	}, [hospitals, requestHospitalId, selectedHospital]);

	const handleCloseEmergencyRequestModal = useCallback(() => {
		setShowEmergencyRequestModal(false);
		setRequestHospitalId(null);
		if (activeAmbulanceTrip || activeBedBooking) {
			clearSelectedHospital();
			setTimeout(() => {
				bottomSheetRef.current?.snapToIndex?.(0);
			}, 0);
			return;
		}
		handleCloseFocus();
	}, [activeAmbulanceTrip, activeBedBooking, clearSelectedHospital, handleCloseFocus]);

	const handleRequestComplete = useCallback((request) => {
		if (request?.serviceType !== "ambulance" && request?.serviceType !== "bed") return;
		const hospitalId = requestHospitalId ?? selectedHospital?.id ?? null;
		if (!hospitalId) return;
		if (request?.serviceType === "ambulance") {
			startAmbulanceTrip({
				hospitalId,
				requestId: request?.requestId ?? null,
				ambulanceId: request?.ambulanceId ?? null,
				ambulanceType: request?.ambulanceType ?? null,
				estimatedArrival: request?.estimatedArrival ?? null,
				hospitalName: request?.hospitalName ?? null,
			});
		}
		if (request?.serviceType === "bed") {
			startBedBooking({
				hospitalId,
				requestId: request?.requestId ?? null,
				hospitalName: request?.hospitalName ?? null,
				specialty: request?.specialty ?? null,
				bedNumber: request?.bedNumber ?? null,
				bedType: request?.bedType ?? null,
				bedCount: request?.bedCount ?? null,
				estimatedWait: request?.estimatedArrival ?? null,
			});
		}
		clearSelectedHospital();
		setTimeout(() => {
			bottomSheetRef.current?.snapToIndex?.(0);
		}, 0);
	}, [clearSelectedHospital, requestHospitalId, selectedHospital?.id, startAmbulanceTrip, startBedBooking]);

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

	const routeHospitalId =
		mode === "emergency"
			? activeAmbulanceTrip?.hospitalId ?? selectedHospital?.id ?? null
			: activeBedBooking?.hospitalId ?? selectedHospital?.id ?? null;
	const animateAmbulance = mode === "emergency" && !!activeAmbulanceTrip;
	const ambulanceTripEtaSeconds = activeAmbulanceTrip?.etaSeconds ?? null;

	const hospitalsForMap = useMemo(() => {
		if (!hospitals || hospitals.length === 0) return undefined;
		if (!activeAmbulanceTrip) return searchFilteredHospitals;

		const routeHospital =
			hospitals.find((h) => h?.id === activeAmbulanceTrip.hospitalId) ?? null;
		if (!routeHospital) return searchFilteredHospitals;

		const alreadyIncluded = searchFilteredHospitals.some(
			(h) => h?.id === routeHospital.id
		);
		return alreadyIncluded ? searchFilteredHospitals : [...searchFilteredHospitals, routeHospital];
	}, [activeAmbulanceTrip, hospitals, searchFilteredHospitals]);

	return (
		<View style={styles.container}>
			{/* Full-screen map as background */}
			<FullScreenEmergencyMap
				ref={mapRef}
				hospitals={hospitalsForMap}
				onHospitalSelect={handleHospitalSelect}
				onHospitalsGenerated={updateHospitals}
				onMapReady={setMapReady}
				selectedHospitalId={selectedHospital?.id || null}
				routeHospitalId={routeHospitalId}
				animateAmbulance={animateAmbulance}
				ambulanceTripEtaSeconds={ambulanceTripEtaSeconds}
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
				allHospitals={hospitals}
				selectedHospital={selectedHospital}
				activeAmbulanceTrip={activeAmbulanceTrip}
				activeBedBooking={activeBedBooking}
				onCancelAmbulanceTrip={() => {
					stopAmbulanceTrip();
					setTimeout(() => {
						bottomSheetRef.current?.snapToIndex?.(1);
					}, 0);
				}}
				onCancelBedBooking={() => {
					stopBedBooking();
					setTimeout(() => {
						bottomSheetRef.current?.snapToIndex?.(1);
					}, 0);
				}}
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

			<EmergencyRequestModal
				visible={showEmergencyRequestModal}
				onClose={handleCloseEmergencyRequestModal}
				selectedHospital={requestHospital}
				mode={mode}
				selectedSpecialty={selectedSpecialty}
				onRequestComplete={handleRequestComplete}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});

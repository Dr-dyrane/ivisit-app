"use client";

import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { View, StyleSheet, Dimensions } from "react-native";
import { useEmergency } from "../contexts/EmergencyContext";
import { useEmergencyUI } from "../contexts/EmergencyUIContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useFAB } from "../contexts/FABContext";
import { useVisits } from "../contexts/VisitsContext";
import { useAuth } from "../contexts/AuthContext";
import { COLORS } from "../constants/colors";
import { Ionicons, Fontisto } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { EMERGENCY_VISIT_LIFECYCLE, VISIT_STATUS, VISIT_TYPES } from "../constants/visits";
import { usePreferences } from "../contexts/PreferencesContext";
import { useEmergencyContacts } from "../hooks/emergency/useEmergencyContacts";
import { useMedicalProfile } from "../hooks/user/useMedicalProfile";
import { useEmergencyRequests } from "../hooks/emergency/useEmergencyRequests";
import { EmergencyRequestStatus } from "../services/emergencyRequestsService";
import {
	NOTIFICATION_PRIORITY,
	NOTIFICATION_TYPES,
} from "../constants/notifications";
import { useNotifications } from "../contexts/NotificationsContext";
import { getMapPaddingForSnapIndex } from "../constants/emergencyAnimations";
import { simulationService } from "../services/simulationService";
import { navigateToBookBed, navigateToRequestAmbulance } from "../utils/navigationHelpers";

import { EmergencyMapContainer } from "../components/emergency/EmergencyMapContainer";
import { BottomSheetController } from "../components/emergency/BottomSheetController";
import { VisitRatingModal } from "../components/emergency/VisitRatingModal";
import ProfileAvatarButton from "../components/headers/ProfileAvatarButton";
import { useEmergencyHandlers } from "../hooks/emergency/useEmergencyHandlers";
import { useHospitalSelection } from "../hooks/emergency/useHospitalSelection";
import { useSearchFiltering } from "../hooks/emergency/useSearchFiltering";

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
	const router = useRouter();
	const simulationDebugRef = useRef(null);
	const { resetTabBar, lockTabBarHidden, unlockTabBarHidden } =
		useTabBarVisibility();
	const { resetHeader } = useScrollAwareHeader();
	const { setHeaderState } = useHeaderState();
	const { registerFAB } = useFAB();
	const { addVisit, updateVisit, cancelVisit, completeVisit } = useVisits();
	const { user } = useAuth();
	const { preferences } = usePreferences();
	const { contacts: emergencyContacts } = useEmergencyContacts();
	const { profile: medicalProfile } = useMedicalProfile();
	const { setRequestStatus } = useEmergencyRequests();
	const { addNotification } = useNotifications();

	const screenHeight = Dimensions.get("window").height;

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

	// Local state
	const [currentRoute, setCurrentRoute] = useState(null);
	const [ratingState, setRatingState] = useState({
		visible: false,
		visitId: null,
		title: null,
		subtitle: null,
	});

	// Map padding - calculated from snap index
	const mapBottomPadding = useMemo(() => {
		return getMapPaddingForSnapIndex(
			sheetSnapIndex,
			!!selectedHospital
		);
	}, [selectedHospital, sheetSnapIndex]);

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
		setMode,
		selectSpecialty,
		selectServiceType,
		updateHospitals,
		hasActiveFilters,
		resetFilters,
		clearSelectedHospital,
		startAmbulanceTrip,
		stopAmbulanceTrip,
		setAmbulanceTripStatus,
		startBedBooking,
		stopBedBooking,
		setBedBookingStatus,
	} = useEmergency();

	// Debugging hospitals
	useMemo(() => {
		if (hospitals && hospitals.length > 0) {
			console.log("EmergencyScreen: Hospitals loaded:", hospitals.length);
		} else {
			console.log("EmergencyScreen: No hospitals loaded yet");
		}
	}, [hospitals]);

	// Header components - memoized
	const leftComponent = useMemo(() => <ProfileAvatarButton />, []);

	// Handle sheet snap changes
	const handleSheetSnapChange = useCallback(
		(index) => {
			setSheetSnapIndex(index, "screen");
		},
		[setSheetSnapIndex]
	);

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
				rightComponent: null,
			});
		}, [resetTabBar, resetHeader, setHeaderState, mode, leftComponent])
	);

	useFocusEffect(
		useCallback(() => {
			const shouldHide = !!selectedHospital || !!activeAmbulanceTrip || !!activeBedBooking;

			if (shouldHide) {
				lockTabBarHidden();
			} else {
				unlockTabBarHidden();
			}
		}, [
			activeAmbulanceTrip,
			activeBedBooking,
			selectedHospital,
			mode,
			lockTabBarHidden,
			unlockTabBarHidden,
		])
	);

	// FAB toggles between emergency and bed booking modes
	const handleFloatingButtonPress = useCallback(() => {
		toggleMode();
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
	}, [toggleMode]);

	useFocusEffect(
		useCallback(() => {
			const shouldHideFAB =
				!!selectedHospital || sheetSnapIndex === 0;
				
			registerFAB({
				icon: mode === "emergency" ? "bed-patient" : "medical",
				visible: !shouldHideFAB,
				onPress: handleFloatingButtonPress,
			});
		}, [
			activeAmbulanceTrip,
			activeBedBooking,
			handleFloatingButtonPress,
			mode,
			registerFAB,
			selectedHospital,
			sheetSnapIndex,
		])
	);

	// Hook: Hospital selection logic
	const { handleHospitalSelect, handleCloseFocus } = useHospitalSelection({
		selectHospital,
		clearSelectedHospital,
		mapRef,
		sheetSnapIndex,
		getLastScrollY,
		timing,
	});

	const wrappedHandleCloseFocus = useCallback(() => {
		const state = handleCloseFocus(() => {
			bottomSheetRef.current?.restoreListState?.(state);
		});
	}, [handleCloseFocus]);

	// Emergency call handler
	const handlePrimaryAction = useCallback(
		(hospitalId) => {
			if (!hospitalId) return;
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			if (mode === "booking") {
				navigateToBookBed({ router, hospitalId, method: "push" });
				return;
			}
			navigateToRequestAmbulance({ router, hospitalId, method: "push" });
		},
		[mode, router]
	);

	// Service type selection
	const handleServiceTypeSelect = useCallback(
		(type) => {
			if (!type) return;
			
			const normalizedType = type.toLowerCase();
			const normalizedCurrent = serviceType ? serviceType.toLowerCase() : null;
			
			if (normalizedType === normalizedCurrent) {
				return;
			}
			
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			selectServiceType(type);
		},
		[selectServiceType, serviceType]
	);

	// Specialty selection
	const handleSpecialtySelect = useCallback(
		(specialty) => {
			if (specialty === selectedSpecialty) {
				return;
			}
			
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			selectSpecialty(specialty);
		},
		[selectSpecialty, selectedSpecialty]
	);

	// Hook: Search and filter logic
	const { searchFilteredHospitals, handleSearch } = useSearchFiltering({
		hospitals,
		filteredHospitals,
		mode,
		selectedSpecialty,
		searchQuery,
		setSearchQuery,
		mapRef,
		timing,
	});

	// Calculate service type counts
	const serviceTypeCounts = useMemo(() => {
		return {
			premium:
				hospitals.filter((h) => h?.serviceTypes?.includes("premium")).length ||
				0,
			standard:
				hospitals.filter((h) => h?.serviceTypes?.includes("standard")).length ||
				0,
		};
	}, [hospitals]);

	// Calculate specialty counts
	const specialtyCounts = useMemo(() => {
		const counts = {};
		if (!Array.isArray(specialties)) return counts;

		specialties.forEach((specialty) => {
			if (!specialty) return;
			counts[specialty] =
				hospitals.filter(
					(h) =>
						Array.isArray(h?.specialties) &&
						h.specialties.some(
							(s) =>
								s &&
								typeof s === "string" &&
								s.toLowerCase() === specialty.toLowerCase()
						) &&
						(h?.availableBeds ?? 0) > 0
				).length || 0;
		});
		return counts;
	}, [hospitals, specialties]);

	// Keep controls available since expanded is capped to semi-full and map remains visible.
	const showMapControls = true;

	const handleModeSelect = useCallback(
		(nextMode) => {
			if (nextMode !== "emergency" && nextMode !== "booking") return;
			setMode(nextMode);
		},
		[setMode]
	);

	const routeHospitalId =
		mode === "emergency"
			? activeAmbulanceTrip?.hospitalId ?? selectedHospital?.id ?? null
			: activeBedBooking?.hospitalId ?? selectedHospital?.id ?? null;
	const animateAmbulance = mode === "emergency" && !!activeAmbulanceTrip;
	const ambulanceTripEtaSeconds = activeAmbulanceTrip?.etaSeconds ?? null;

	useEffect(() => {
		if (!routeHospitalId && currentRoute) {
			setCurrentRoute(null);
		}
	}, [currentRoute, routeHospitalId]);

	useEffect(() => {
		const requestId = activeAmbulanceTrip?.requestId ?? null;
		if (!requestId) return;
		const coords = currentRoute?.coordinates ?? null;
		if (!Array.isArray(coords) || coords.length < 2) return;

		const status = activeAmbulanceTrip?.status ?? null;
		const isInProgress =
			status === EmergencyRequestStatus.IN_PROGRESS || status === "in_progress" || !status;
		const hasResponder = !!activeAmbulanceTrip?.assignedAmbulance?.name;
		const debugKey = `${requestId}|${String(status)}|${hasResponder ? "has" : "no"}|${coords.length}`;
		if (__DEV__ && simulationDebugRef.current !== debugKey) {
			simulationDebugRef.current = debugKey;
			console.log("[EmergencyScreen] Simulation gate:", {
				requestId,
				status,
				isInProgress,
				hasResponder,
				routePoints: coords.length,
			});
		}
		if (!isInProgress || hasResponder) return;

		if (__DEV__) {
			console.log("[EmergencyScreen] Starting simulation:", {
				requestId,
				routePoints: coords.length,
			});
		}
		simulationService.startSimulation(requestId, coords);
	}, [
		activeAmbulanceTrip?.requestId,
		activeAmbulanceTrip?.status,
		activeAmbulanceTrip?.assignedAmbulance?.name,
		currentRoute?.coordinates,
	]);

	const hospitalsForMap = useMemo(() => {
		if (!hospitals || hospitals.length === 0) return undefined;
		if (!activeAmbulanceTrip) return searchFilteredHospitals;

		const routeHospital =
			hospitals.find((h) => h?.id === activeAmbulanceTrip.hospitalId) ?? null;
		if (!routeHospital) return searchFilteredHospitals;

		const alreadyIncluded = searchFilteredHospitals.some(
			(h) => h?.id === routeHospital.id
		);
		return alreadyIncluded
			? searchFilteredHospitals
			: [...searchFilteredHospitals, routeHospital];
	}, [activeAmbulanceTrip, hospitals, searchFilteredHospitals]);

	// Hook: All trip completion and cancellation handlers
	const {
		onCancelAmbulanceTrip,
		onMarkAmbulanceArrived,
		onCompleteAmbulanceTrip,
		onCancelBedBooking,
		onMarkBedOccupied,
		onCompleteBedBooking,
	} = useEmergencyHandlers({
		activeAmbulanceTrip,
		activeBedBooking,
		setRequestStatus,
		cancelVisit,
		completeVisit,
		updateVisit,
		setAmbulanceTripStatus,
		setBedBookingStatus,
		stopAmbulanceTrip,
		stopBedBooking,
		addNotification,
		onSheetSnap: (index) => {
			bottomSheetRef.current?.snapToIndex?.(index);
		},
	});

	const handleCompleteAmbulanceTripWithRating = useCallback(async () => {
		const visitId = activeAmbulanceTrip?.requestId ?? null;
		const hospitalName = activeAmbulanceTrip?.hospitalName ?? null;
		await onCompleteAmbulanceTrip?.();
		if (!visitId) return;
		setRatingState({
			visible: true,
			visitId,
			title: "Rate your ambulance visit",
			subtitle: hospitalName ? `Trip to ${hospitalName}` : null,
		});
	}, [activeAmbulanceTrip?.hospitalName, activeAmbulanceTrip?.requestId, onCompleteAmbulanceTrip]);

	const handleCompleteBedBookingWithRating = useCallback(async () => {
		const visitId = activeBedBooking?.requestId ?? null;
		const hospitalName = activeBedBooking?.hospitalName ?? null;
		await onCompleteBedBooking?.();
		if (!visitId) return;
		setRatingState({
			visible: true,
			visitId,
			title: "Rate your bed visit",
			subtitle: hospitalName ? `Stay at ${hospitalName}` : null,
		});
	}, [activeBedBooking?.hospitalName, activeBedBooking?.requestId, onCompleteBedBooking]);

	return (
		<View style={styles.container}>
			<VisitRatingModal
				visible={ratingState.visible}
				title={ratingState.title || "Rate your visit"}
				subtitle={ratingState.subtitle}
				onClose={() => {
					setRatingState({ visible: false, visitId: null, title: null, subtitle: null });
				}}
				onSubmit={async ({ rating, comment }) => {
					const visitId = ratingState.visitId;
					if (!visitId) return;
					const nowIso = new Date().toISOString();
					await updateVisit?.(visitId, {
						rating,
						ratingComment: comment,
						ratedAt: nowIso,
						lifecycleState: EMERGENCY_VISIT_LIFECYCLE.RATED,
						lifecycleUpdatedAt: nowIso,
					});
					setRatingState({ visible: false, visitId: null, title: null, subtitle: null });
				}}
			/>
			<EmergencyMapContainer
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
				onRouteCalculated={setCurrentRoute}
				responderLocation={activeAmbulanceTrip?.currentResponderLocation}
				responderHeading={activeAmbulanceTrip?.currentResponderHeading}
				sheetSnapIndex={sheetSnapIndex}
			/>

			<BottomSheetController
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
				onCancelAmbulanceTrip={onCancelAmbulanceTrip}
				onMarkAmbulanceArrived={onMarkAmbulanceArrived}
				onCompleteAmbulanceTrip={handleCompleteAmbulanceTripWithRating}
				onCancelBedBooking={onCancelBedBooking}
				onMarkBedOccupied={onMarkBedOccupied}
				onCompleteBedBooking={handleCompleteBedBookingWithRating}
				onModeSelect={handleModeSelect}
				serviceTypeCounts={serviceTypeCounts}
				specialtyCounts={specialtyCounts}
				hasActiveFilters={hasActiveFilters}
				onServiceTypeSelect={handleServiceTypeSelect}
				onSpecialtySelect={handleSpecialtySelect}
				onHospitalSelect={handleHospitalSelect}
				onHospitalCall={handlePrimaryAction}
				onSnapChange={handleSheetSnapChange}
				onSearch={handleSearch}
				onResetFilters={resetFilters}
				onCloseFocus={wrappedHandleCloseFocus}
			/>

		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});

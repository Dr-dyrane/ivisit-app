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
import { useToast } from "../contexts/ToastContext";

import { EmergencyMapContainer } from "../components/emergency/EmergencyMapContainer";
import { BottomSheetController } from "../components/emergency/BottomSheetController";
import { ServiceRatingModal } from "../components/emergency/ServiceRatingModal";
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
	const { registerFAB, unregisterFAB } = useFAB();
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

	const sheetSnapIndexRef = useRef(sheetSnapIndex);
	useEffect(() => {
		sheetSnapIndexRef.current = sheetSnapIndex;
	}, [sheetSnapIndex]);

	// Local state
	const [currentRoute, setCurrentRoute] = useState(null);
	const [ratingState, setRatingState] = useState({
		visible: false,
		visitId: null,
		title: null,
		subtitle: null,
	});

	// Data state from EmergencyContext
	const {
		hospitals,
		selectedHospitalId,
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
	const { showToast } = useToast();

	const [pendingSelectedHospitalId, setPendingSelectedHospitalId] = useState(null);
	useEffect(() => {
		if (!pendingSelectedHospitalId) return;
		if (selectedHospitalId === pendingSelectedHospitalId) {
			setPendingSelectedHospitalId(null);
		}
	}, [pendingSelectedHospitalId, selectedHospitalId]);

	// Map padding - calculated from snap index
	const mapBottomPadding = useMemo(() => {
		const isHospitalFlowOpen = !!selectedHospitalId || !!pendingSelectedHospitalId;
		return getMapPaddingForSnapIndex(sheetSnapIndex, isHospitalFlowOpen);
	}, [pendingSelectedHospitalId, selectedHospitalId, sheetSnapIndex]);

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
			lockTabBarHidden,
			unlockTabBarHidden,
		])
	);

	useFocusEffect(
		useCallback(() => {
			if (selectedHospital || activeAmbulanceTrip || activeBedBooking) return;
			if (sheetSnapIndexRef.current !== 0) return;
			setSheetSnapIndex(1, "return_fix");
		}, [
			activeAmbulanceTrip,
			activeBedBooking,
			selectedHospital,
			setSheetSnapIndex,
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
			const hasBothActive = !!activeAmbulanceTrip && !!activeBedBooking;
			const nextLabel =
				hasBothActive
					? (mode === "emergency" ? "View Bed" : "View Ambulance")
					: undefined;
			const nextSubText = hasBothActive ? "Switch summary" : undefined;
				
			// Register FAB with unique ID and enhanced configuration
			registerFAB('emergency-mode-toggle', {
				icon: mode === "emergency" ? "bed-patient" : "medical",
				visible: !shouldHideFAB,
				allowInStack: true, // Allow FAB in stack screens when trip is active
				onPress: handleFloatingButtonPress,
				style: 'primary',
				haptic: 'medium',
				priority: 8, // High priority for emergency actions
				animation: 'subtle',
				label: nextLabel,
				subText: nextSubText,
			});
			
			// Cleanup
			return () => {
				unregisterFAB('emergency-mode-toggle');
			};
		}, [
			registerFAB,
			unregisterFAB,
			mode,
			selectedHospital,
			sheetSnapIndex,
			handleFloatingButtonPress,
			activeAmbulanceTrip,
			activeBedBooking,
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

	const handleHospitalSelectWithSheet = useCallback(
		(hospital) => {
			if (hospital?.id) {
				setPendingSelectedHospitalId(hospital.id);
			}
			handleHospitalSelect(hospital);
		},
		[handleHospitalSelect]
	);

	const wrappedHandleCloseFocus = useCallback(() => {
		handleCloseFocus((nextState) => {
			bottomSheetRef.current?.restoreListState?.(nextState);
		});
	}, [handleCloseFocus]);

	// Emergency call handler
	const handlePrimaryAction = useCallback(
		(hospitalId) => {
			if (!hospitalId) return;
			
			const hasActiveByMode =
				mode === "booking"
					? !!activeBedBooking?.requestId
					: !!activeAmbulanceTrip?.requestId;

			if (hasActiveByMode) {
				try {
					showToast(
						mode === "booking"
							? "You already have an active bed booking"
							: "You already have an active ambulance trip",
						"warning"
					);
				} catch (e) {}
				bottomSheetRef.current?.snapToIndex?.(1);
				return;
			}

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			if (mode === "booking") {
				navigateToBookBed({ router, hospitalId, method: "push" });
				return;
			}
				navigateToRequestAmbulance({ router, hospitalId, method: "push" });
		},
		[mode, router, activeAmbulanceTrip?.requestId, activeBedBooking?.requestId, showToast]
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

	// Snap to summary when active state matches current mode; do not force mode
	useEffect(() => {
		if (activeAmbulanceTrip?.requestId && mode === "emergency") {
			bottomSheetRef.current?.snapToIndex?.(1);
		}
	}, [activeAmbulanceTrip?.requestId, mode]);

	useEffect(() => {
		if (activeBedBooking?.requestId && mode === "booking") {
			bottomSheetRef.current?.snapToIndex?.(1);
		}
	}, [activeBedBooking?.requestId, mode]);

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
			serviceType: "ambulance",
			title: "Rate your ambulance response",
			subtitle: hospitalName ? `Response to ${hospitalName}` : null,
			serviceDetails: {
				hospital: hospitalName,
				duration: activeAmbulanceTrip?.duration ? `${activeAmbulanceTrip.duration} minutes` : null,
				provider: activeAmbulanceTrip?.assignedAmbulance?.name || "Emergency Services",
			},
		});
	}, [activeAmbulanceTrip?.hospitalName, activeAmbulanceTrip?.requestId, activeAmbulanceTrip?.duration, activeAmbulanceTrip?.assignedAmbulance?.name, onCompleteAmbulanceTrip]);

	const handleCompleteBedBookingWithRating = useCallback(() => {
		const visitId = activeBedBooking?.requestId;
		const hospitalName = activeBedBooking?.hospitalName;
		if (!visitId) return;
		
		setRatingState({
			visible: true,
			visitId,
			serviceType: "bed",
			title: "Rate your hospital stay",
			subtitle: hospitalName ? `Stay at ${hospitalName}` : null,
			serviceDetails: {
				hospital: hospitalName,
				duration: activeBedBooking?.duration ? `${activeBedBooking.duration} minutes` : null,
				provider: activeBedBooking?.provider || "Hospital Staff",
			},
		});
	}, [activeBedBooking?.hospitalName, activeBedBooking?.requestId, activeBedBooking?.duration, activeBedBooking?.provider]);

	return (
		<View style={styles.container}>
			<ServiceRatingModal
				visible={ratingState.visible}
				serviceType={ratingState.serviceType || "visit"}
				title={ratingState.title || "Rate your visit"}
				subtitle={ratingState.subtitle}
				serviceDetails={ratingState.serviceDetails}
				onClose={() => {
					setRatingState({ 
						visible: false, 
						visitId: null, 
						title: null, 
						subtitle: null,
						serviceType: null,
						serviceDetails: null
					});
				}}
				onSubmit={async ({ rating, comment, serviceType }) => {
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
					setRatingState({ visible: false, visitId: null, title: null, subtitle: null, serviceType: null, serviceDetails: null });
				}}
			/>
			<EmergencyMapContainer
				ref={mapRef}
				hospitals={hospitalsForMap}
				onHospitalSelect={handleHospitalSelectWithSheet}
				onHospitalsGenerated={updateHospitals}
				onMapReady={setMapReady}
				selectedHospitalId={pendingSelectedHospitalId || selectedHospitalId || null}
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
				onHospitalSelect={handleHospitalSelectWithSheet}
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

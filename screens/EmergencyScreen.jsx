"use client";

import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import { useFocusEffect } from "expo-router";
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

import { EmergencyMapContainer } from "../components/emergency/EmergencyMapContainer";
import { BottomSheetController } from "../components/emergency/BottomSheetController";
import { VisitRatingModal } from "../components/emergency/VisitRatingModal";
import ProfileAvatarButton from "../components/headers/ProfileAvatarButton";
import { useEmergencyHandlers } from "../hooks/emergency/useEmergencyHandlers";
import { useHospitalSelection } from "../hooks/emergency/useHospitalSelection";
import { useSearchFiltering } from "../hooks/emergency/useSearchFiltering";
import { useRequestFlow } from "../hooks/emergency/useRequestFlow";

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
	const { addVisit, updateVisit, cancelVisit, completeVisit } = useVisits();
	const { user } = useAuth();
	const { preferences } = usePreferences();
	const { contacts: emergencyContacts } = useEmergencyContacts();
	const { profile: medicalProfile } = useMedicalProfile();
	const { createRequest, updateRequest, setRequestStatus } = useEmergencyRequests();
	const { addNotification } = useNotifications();

	const screenHeight = Dimensions.get("window").height;

	// Refs for map and bottom sheet
	const mapRef = useRef(null);
	const bottomSheetRef = useRef(null);
	const lastListStateRef = useRef({ snapIndex: 1, scrollY: 0 });

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
	const [isRequestFlowOpen, setIsRequestFlowOpen] = useState(false);
	const [requestHospitalId, setRequestHospitalId] = useState(null);
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
			!!selectedHospital && !isRequestFlowOpen
		);
	}, [isRequestFlowOpen, selectedHospital, sheetSnapIndex]);

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
				!!selectedHospital || sheetSnapIndex === 0 || isRequestFlowOpen;
				
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
			isRequestFlowOpen,
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
	const handleEmergencyCall = useCallback(
		(hospitalId) => {
			if (!hospitalId) return;
			lastListStateRef.current = {
				snapIndex: Number.isFinite(sheetSnapIndex) ? sheetSnapIndex : 1,
				scrollY: Number.isFinite(getLastScrollY()) ? getLastScrollY() : 0,
			};
			selectHospital(hospitalId);
			setRequestHospitalId(hospitalId);
			setIsRequestFlowOpen(true);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			setTimeout(() => {
				bottomSheetRef.current?.expand?.();
			}, 0);
		},
		[getLastScrollY, selectHospital, sheetSnapIndex]
	);

	const requestHospital = useMemo(() => {
		if (!requestHospitalId) return selectedHospital;
		return (
			hospitals.find((h) => h?.id === requestHospitalId) || selectedHospital
		);
	}, [hospitals, requestHospitalId, selectedHospital]);

	const handleCloseRequestFlow = useCallback(() => {
		setIsRequestFlowOpen(false);
		setRequestHospitalId(null);
		if (activeAmbulanceTrip || activeBedBooking) {
			clearSelectedHospital();
			setTimeout(() => {
				// Derive max index dynamically instead of hard-coding 1
				const maxIndex = Math.max(0, (bottomSheetRef.current?.snapPoints?.length ?? 3) - 1);
				const targetIndex = Math.min(maxIndex, 1);
				bottomSheetRef.current?.snapToIndex?.(targetIndex);
			}, 0);
			return;
		}
		handleCloseFocus();
	}, [activeAmbulanceTrip, activeBedBooking, clearSelectedHospital, handleCloseFocus]);

	// Hook: Request flow (create request + visits)
	const { handleRequestInitiated, handleRequestComplete } = useRequestFlow({
		createRequest,
		updateRequest,
		addVisit,
		updateVisit,
		setRequestStatus,
		startAmbulanceTrip,
		startBedBooking,
		clearSelectedHospital,
		user,
		preferences,
		medicalProfile,
		emergencyContacts,
		hospitals,
		selectedSpecialty,
		requestHospitalId,
		selectedHospital,
		activeAmbulanceTrip,
		activeBedBooking,
		currentRoute,
		onRequestComplete: () => {
			setTimeout(() => {
				bottomSheetRef.current?.expand?.();
			}, 0);
		},
	});

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
	// Hide controls when request flow is active to prevent clutter
	const showMapControls = !isRequestFlowOpen;

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
				isRequestMode={isRequestFlowOpen}
				requestHospital={requestHospital}
				onRequestClose={handleCloseRequestFlow}
				onRequestInitiated={handleRequestInitiated}
				onRequestComplete={handleRequestComplete}
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
				onHospitalCall={handleEmergencyCall}
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

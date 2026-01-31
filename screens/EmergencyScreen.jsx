"use client";

import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { View, StyleSheet, Dimensions, Text, TouchableOpacity } from "react-native";
import { useEmergency } from "../contexts/EmergencyContext";
import { useEmergencyUI } from "../contexts/EmergencyUIContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useFAB } from "../contexts/FABContext";
import { useVisits } from "../contexts/VisitsContext";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { COLORS } from "../constants/colors";
import { Ionicons, Fontisto } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { EMERGENCY_VISIT_LIFECYCLE, VISIT_STATUS, VISIT_TYPES } from "../constants/visits";
import { usePreferences } from "../contexts/PreferencesContext";
import { useEmergencyContacts } from "../hooks/emergency/useEmergencyContacts";
import { useMedicalProfile } from "../hooks/user/useMedicalProfile";
import { useEmergencyRequests } from "../hooks/emergency/useEmergencyRequests";
import { EmergencyRequestStatus, emergencyRequestsService } from "../services/emergencyRequestsService";
import {
	NOTIFICATION_PRIORITY,
	NOTIFICATION_TYPES,
} from "../constants/notifications";
import { useNotifications } from "../contexts/NotificationsContext";
import { getMapPaddingForSnapIndex } from "../constants/emergencyAnimations";
// import { simulationService } from "../services/simulationService"; // REMOVED: Mock service
import { discoveryService } from "../services/discoveryService";
import { navigateToBookBed, navigateToRequestAmbulance } from "../utils/navigationHelpers";
import { useToast } from "../contexts/ToastContext";

import { EmergencyMapContainer } from "../components/emergency/EmergencyMapContainer";
import { BottomSheetController } from "../components/emergency/BottomSheetController";
import { ServiceRatingModal } from "../components/emergency/ServiceRatingModal";
import ProfileAvatarButton from "../components/headers/ProfileAvatarButton";
import NotificationIconButton from "../components/headers/NotificationIconButton";
import { useEmergencyHandlers } from "../hooks/emergency/useEmergencyHandlers";
import { useHospitalSelection } from "../hooks/emergency/useHospitalSelection";
import { useRequestFlow } from "../hooks/emergency/useRequestFlow";
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
	const { isDarkMode } = useTheme(); // Get theme state
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
	const [quickButtonPulse, setQuickButtonPulse] = useState(false);

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

	// 🚨 Quick Emergency - Auto-dispatch without hospital selection
	const { handleQuickEmergency } = useRequestFlow({
		createRequest: emergencyRequestsService.create,
		updateRequest: emergencyRequestsService.update,
		addVisit: emergencyRequestsService.addVisit,
		updateVisit: emergencyRequestsService.updateVisit,
		setRequestStatus: emergencyRequestsService.setStatus,
		startAmbulanceTrip,
		startBedBooking,
		clearSelectedHospital,
		user,
		preferences,
		medicalProfile,
		emergencyContacts,
		hospitals,
		selectedSpecialty,
		requestHospitalId: selectedHospitalId,
		selectedHospital,
		activeAmbulanceTrip,
		activeBedBooking,
		currentRoute,
	});

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

	useEffect(() => {
		// Start Matrix-style pulsing after 2 seconds when button is visible
		if (mode === "emergency" && !activeAmbulanceTrip?.requestId) {
			const timer = setTimeout(() => {
				setQuickButtonPulse(true);
			}, 2000);

			// Create Matrix-style flicker effect
			const flickerInterval = setInterval(() => {
				setQuickButtonPulse(prev => Math.random() > 0.3);
			}, 3000);

			return () => {
				clearTimeout(timer);
				clearInterval(flickerInterval);
			};
		} else {
			setQuickButtonPulse(false);
		}
	}, [mode, activeAmbulanceTrip?.requestId]);

	// Debugging hospitals
	useMemo(() => {
		if (hospitals && hospitals.length > 0) {
			// console.log("EmergencyScreen: Hospitals loaded:", hospitals.length);
		} else {
			// console.log("EmergencyScreen: No hospitals loaded yet");
		}
	}, [hospitals]);

	// 🚨 Quick Emergency Handler - Auto-dispatch without hospital selection
	const handleQuickEmergencyAction = useCallback(async () => {
		console.log('[EmergencyScreen] Quick emergency button pressed');
		console.log('[EmergencyScreen] Mode:', mode);
		console.log('[EmergencyScreen] Active trip:', activeAmbulanceTrip?.requestId);
		console.log('[EmergencyScreen] handleQuickEmergency available:', !!handleQuickEmergency);

		if (mode !== "emergency") {
			showToast("Quick Emergency only available in Ambulance mode", "warning");
			return;
		}

		const hasActiveTrip = !!activeAmbulanceTrip?.requestId;
		if (hasActiveTrip) {
			showToast("You already have an active ambulance trip", "warning");
			return;
		}

		try {
			console.log('[EmergencyScreen] Calling handleQuickEmergency...');
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			const result = await handleQuickEmergency("ambulance");

			if (result.ok) {
				showToast(`🚨 Auto-dispatched to ${result.hospital}`, "success");
				console.log('[EmergencyScreen] Quick emergency successful:', result);

				// 🎯 Navigate to selected hospital view after auto-dispatch
				if (result.requestId) {
					console.log('[EmergencyScreen] Navigating to ambulance request with ID:', result.requestId);
					navigateToRequestAmbulance({
						router,
						hospitalId: result.hospitalId || 'auto-dispatched',
						method: "push"
					});
				}
			} else {
				showToast(`Emergency failed: ${result.reason}`, "error");
				console.log('[EmergencyScreen] Quick emergency failed:', result);
			}
		} catch (error) {
			console.error('[EmergencyScreen] Quick emergency error:', error);
			showToast("Emergency request failed", "error");
		}
	}, [mode, activeAmbulanceTrip?.requestId, showToast, handleQuickEmergency, router]);

	// Header components - memoized
	const leftComponent = useMemo(() => <ProfileAvatarButton />, []);

	// Memoize the quick action handlers to prevent infinite re-renders
	const handleQuickEmergencyPress = useCallback(() => {
		console.log('[EmergencyScreen] QUICK BUTTON TAPPED!');
		handleQuickEmergencyAction();
	}, [handleQuickEmergencyAction]);

	const handleQuickEmergencyPressIn = useCallback(() => {
		console.log('[EmergencyScreen] Button press IN');
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
	}, []);

	const handleQuickEmergencyPressOut = useCallback(() => {
		console.log('[EmergencyScreen] Button press OUT');
		setQuickButtonPulse(false);
	}, []);

	const rightComponent = useMemo(() => {
		console.log('[EmergencyScreen] Rendering header - Mode:', mode, 'Active trip:', !!activeAmbulanceTrip?.requestId);

		// Theme-sensitive colors for dark/light mode
		const adaptiveColors = {
			bgColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : `rgba(134, 16, 14, 0.1)`, // brandPrimary for light mode
			shadowColor: COLORS.brandPrimary, // Keep brand glow for Matrix effect
			iconColor: quickButtonPulse ? '#FFFFFF' : (isDarkMode ? COLORS.textLight : COLORS.brandPrimary), // Use theme colors
		};

		return (
			<View style={{ flexDirection: 'row', alignItems: 'center' }}>
				{/* Quick Emergency Button - Adaptive Dark/Light Mode */}
				{mode === "emergency" && !activeAmbulanceTrip?.requestId && (
					<TouchableOpacity
						onPress={handleQuickEmergencyPress}
						onPressIn={handleQuickEmergencyPressIn}
						onPressOut={handleQuickEmergencyPressOut}
						style={{
							marginRight: 12,
							backgroundColor: adaptiveColors.bgColor,
							width: 28,
							height: 28,
							borderRadius: 14,
							alignItems: 'center',
							justifyContent: 'center',
							zIndex: 9999,
							borderWidth: 0, // Remove border for Apple-style
							// Seamless bleed effect
							shadowColor: adaptiveColors.shadowColor,
							shadowOffset: { width: 0, height: 0 },
							shadowOpacity: quickButtonPulse ? 1 : 0.4,
							shadowRadius: quickButtonPulse ? 15 : 8,
							transform: [{ scale: quickButtonPulse ? 1.08 : 1 }],
						}}
						activeOpacity={0.8}
					>
						<Ionicons
							name="flash"
							size={14}
							color={adaptiveColors.iconColor}
						/>
					</TouchableOpacity>
				)}
				<NotificationIconButton />
			</View>
		);
	}, [mode, activeAmbulanceTrip?.requestId, handleQuickEmergencyAction, quickButtonPulse, isDarkMode]);

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
				rightComponent,
			});
		}, [resetTabBar, resetHeader, setHeaderState, mode, leftComponent])
	);

	// Tab bar locking: Prevent tab switching during active trips (Uber-like behavior)
	// But allow FAB to remain for mode switching between emergency/booking
	useFocusEffect(
		useCallback(() => {
			const hasAnyVisitActive = !!activeAmbulanceTrip || !!activeBedBooking;

			// Lock tab bar during any active trip or hospital selection
			if (hasAnyVisitActive || selectedHospital) {
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

	// FAB toggles between emergency and bed booking modes
	const handleFloatingButtonPress = useCallback(() => {
		toggleMode();
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
	}, [toggleMode]);

	// Enhanced FAB visibility logic that accounts for different modes and snap points
	const hasAnyVisitActive = !!activeAmbulanceTrip || !!activeBedBooking;
	const shouldHideFAB = useMemo(() => {
		// Always hide when hospital is selected (detail mode)
		if (selectedHospital) return true;

		// During active trips, always show FAB for mode switching regardless of snap position
		if (hasAnyVisitActive) return false;

		// Collapsed sheet should hide FAB at all times
		if (sheetSnapIndex === 0) return true;

		// Show FAB in all other cases
		return false;
	}, [selectedHospital, hasAnyVisitActive, sheetSnapIndex]);

	useFocusEffect(
		useCallback(() => {
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
				mode: mode, // Pass mode for context-aware behavior
				allowInStack: hasAnyVisitActive, // Allow FAB in stack screens when trip is active
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
			shouldHideFAB,
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
				} catch (e) { }
				bottomSheetRef.current?.snapToIndex?.(1);
				return;
			}

			discoveryService.trackConversion({
				action: mode === "booking" ? "book_bed_start" : "request_ambulance_start",
				hospitalId,
				mode,
				query: searchQuery,
			});

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			if (mode === "booking") {
				navigateToBookBed({ router, hospitalId, method: "push" });
				return;
			}
			navigateToRequestAmbulance({ router, hospitalId, method: "push" });
		},
		[mode, router, activeAmbulanceTrip?.requestId, activeBedBooking?.requestId, showToast, searchQuery]
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

	// Calculate service type counts - mode-aware filtering with status check
	const serviceTypeCounts = useMemo(() => {
		let availableHospitals;
		
		if (mode === 'emergency') {
			// Emergency mode: count available hospitals (be lenient about ambulance data)
			availableHospitals = hospitals.filter(h => 
				h.status === 'available' && 
				(h.ambulances === undefined || h.ambulances > 0) // Show if ambulance data missing OR > 0
			);
		} else {
			// Booking mode: only count available hospitals with beds
			availableHospitals = hospitals.filter(h => 
				h.status === 'available' && h.availableBeds > 0
			);
		}
		
		return {
			premium:
				availableHospitals.filter((h) => 
					(h?.serviceTypes?.includes("premium")) ||
					(h?.type?.toLowerCase() === "premium")
				).length || 0,
			standard:
				availableHospitals.filter((h) => 
					(h?.serviceTypes?.includes("standard")) ||
					(h?.type?.toLowerCase() === "standard")
				).length || 0,
		};
	}, [hospitals, mode]);

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
			// console.log("[EmergencyScreen] Simulation gate:", {
			// 	requestId,
			// 	status,
			// 	isInProgress,
			// 	hasResponder,
			// 	routePoints: coords.length,
			// });
		}
		if (!isInProgress || hasResponder) return;

		if (__DEV__) {
			// console.log("[EmergencyScreen] Real-time tracking enabled:", {
			// 	requestId,
			// 	routePoints: coords.length,
			// });
		}
		// ❌ REMOVED: simulationService.startSimulation(requestId, coords);
		// ✅ REAL-TIME: EmergencyContext now handles real-time subscriptions
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

	useEffect(() => {
		// console.log("[EmergencyScreen] Active State:", {
		// 	mode,
		// 	selectedHospitalId,
		// 	activeAmbulanceTripId: activeAmbulanceTrip?.requestId,
		// 	activeBedBookingId: activeBedBooking?.requestId,
		// 	sheetSnapIndex
		// });
	}, [mode, selectedHospitalId, activeAmbulanceTrip, activeBedBooking, sheetSnapIndex]);

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
			// console.log("[EmergencyScreen] onSheetSnap called with index:", index);
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

	const handleCompleteBedBookingWithRating = useCallback(async () => {
		const visitId = activeBedBooking?.requestId;
		const hospitalName = activeBedBooking?.hospitalName;

		// Complete the booking first (like ambulance)
		await onCompleteBedBooking?.();

		if (!visitId) return;

		// Then show rating modal
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
	}, [activeBedBooking?.hospitalName, activeBedBooking?.requestId, activeBedBooking?.duration, activeBedBooking?.provider, onCompleteBedBooking]);

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

					// Only update rating data (completion already handled)
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

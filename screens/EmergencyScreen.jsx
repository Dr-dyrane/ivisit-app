"use client";

import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import React from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, Linking, Switch } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEmergency } from "../contexts/EmergencyContext";
import { useEmergencyUI } from "../contexts/EmergencyUIContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useFABActions } from "../contexts/FABContext";
import { useVisits } from "../contexts/VisitsContext";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { COLORS } from "../constants/colors";
import { Ionicons, Fontisto, MaterialCommunityIcons } from "@expo/vector-icons";
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
import Constants from "expo-constants";
import { hospitalsService } from "../services/hospitalsService";
import { demoEcosystemService, DEMO_BOOTSTRAP_PHASES } from "../services/demoEcosystemService";

import { EmergencyMapContainer } from "../components/emergency/EmergencyMapContainer";
import { BottomSheetController } from "../components/emergency/BottomSheetController";
import { ServiceRatingModal } from "../components/emergency/ServiceRatingModal";
import CoverageDisclaimerModal from "../components/emergency/CoverageDisclaimerModal";
import DemoBootstrapModal from "../components/emergency/DemoBootstrapModal";
import ProfileAvatarButton from "../components/headers/ProfileAvatarButton";
import NotificationIconButton from "../components/headers/NotificationIconButton";
import { useEmergencyHandlers } from "../hooks/emergency/useEmergencyHandlers";
import { useHospitalSelection } from "../hooks/emergency/useHospitalSelection";
import { useRequestFlow } from "../hooks/emergency/useRequestFlow";
import { useSearchFiltering } from "../hooks/emergency/useSearchFiltering";

const COVERAGE_POOR_THRESHOLD = 3;
const COVERAGE_DISCLAIMER_STORAGE_KEY = "@ivisit/coverage_disclaimer_opt_out_v1";
const createDemoPhaseStatuses = () =>
	DEMO_BOOTSTRAP_PHASES.reduce((acc, phase) => {
		acc[phase.key] = "pending";
		return acc;
	}, {});

const isHospitalVerifiedForCoverage = (hospital) => {
	if (!hospital || typeof hospital !== "object") return false;

	const verified = hospital?.verified === true;
	const importStatus = String(
		hospital?.importStatus ?? hospital?.import_status ?? ""
	).toLowerCase();

	return verified || importStatus === "verified";
};

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
const EmergencyScreen = () => {
	const screenId = useRef(Math.random().toString(36).substr(2, 9));
	// Component mounting - no debug logs

	const router = useRouter();
	const hasShownCoverageDisclaimerRef = useRef(false);

	// Track focus state manually using useFocusEffect
	const [isFocused, setIsFocused] = useState(false);

	// Add cleanup tracking
	useEffect(() => {
		return () => {
			// Component unmounting...
		};
	}, []);

	// Track focus state manually using useFocusEffect
	useFocusEffect(
		useCallback(() => {
			// Tab focused
			setIsFocused(true);
			hasShownCoverageDisclaimerRef.current = false;
			return () => {
				// Tab unfocused
				setIsFocused(false);
				setCoverageDisclaimerVisible(false);
			};
		}, [])
	);

	const simulationDebugRef = useRef(null);
	const { resetTabBar, lockTabBarHidden, unlockTabBarHidden } =
		useTabBarVisibility();
	const { resetHeader } = useScrollAwareHeader();
	const { setHeaderState } = useHeaderState();
	const { registerFAB, unregisterFAB } = useFABActions();
	const { addVisit, updateVisit, cancelVisit, completeVisit } = useVisits();
	const { user } = useAuth();
	const { preferences, updatePreferences } = usePreferences();
	const { isDarkMode } = useTheme(); // Get theme state
	const { contacts: emergencyContacts } = useEmergencyContacts();
	const { profile: medicalProfile } = useMedicalProfile();
	const { setRequestStatus } = useEmergencyRequests();
	const { addNotification } = useNotifications();
	const demoModeEnabled = preferences?.demoModeEnabled !== false;

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
		isMapLoading,
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
	// DEV ONLY: temporary map-design trigger to preview ambulance motion on route.
	const [forceAmbulanceAnimation, setForceAmbulanceAnimation] = useState(false);
	const [coverageDisclaimerVisible, setCoverageDisclaimerVisible] = useState(false);
	const [coverageDontRemind, setCoverageDontRemind] = useState(false);
	const [coverageOptOut, setCoverageOptOut] = useState(false);
	const [coveragePreferenceLoaded, setCoveragePreferenceLoaded] = useState(false);
	const [demoBootstrapVisible, setDemoBootstrapVisible] = useState(false);
	const [demoBootstrapRunning, setDemoBootstrapRunning] = useState(false);
	const [demoBootstrapCompleted, setDemoBootstrapCompleted] = useState(false);
	const [demoBootstrapError, setDemoBootstrapError] = useState(null);
	const [demoActivePhaseKey, setDemoActivePhaseKey] = useState(null);
	const [demoPhaseStatuses, setDemoPhaseStatuses] = useState(createDemoPhaseStatuses);

	// Data state from EmergencyContext
	const {
		hospitals,
		allHospitals,
		selectedHospitalId,
		selectedHospital,
		filteredHospitals,
		activeAmbulanceTrip,
		ambulanceTelemetryHealth,
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
		patchActiveAmbulanceTrip,
		startBedBooking,
		stopBedBooking,
		setBedBookingStatus,
		userLocation,
		mode, // Add missing mode
	} = useEmergency();
	const { showToast } = useToast();

	// 🚨 Quick Emergency - Auto-dispatch without hospital selection
	const { handleQuickEmergency } = useRequestFlow({
		createRequest: emergencyRequestsService.create,
		updateRequest: emergencyRequestsService.update,
		addVisit,
		updateVisit,
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

	useEffect(() => {
		let isMounted = true;
		const loadCoveragePreference = async () => {
			try {
				const stored = await AsyncStorage.getItem(COVERAGE_DISCLAIMER_STORAGE_KEY);
				if (!isMounted) return;
				setCoverageOptOut(stored === "1");
			} catch (error) {
				console.warn("[EmergencyScreen] Failed to load coverage disclaimer preference", error);
			} finally {
				if (isMounted) setCoveragePreferenceLoaded(true);
			}
		};

		loadCoveragePreference();
		return () => {
			isMounted = false;
		};
	}, []);

	// 🔴 REVERT POINT: Clear route when selection is reset
	// PREVIOUS: Route persisted until a new one was calculated
	// NEW: Clear route immediately when no hospital is selected AND no active trip
	// REVERT TO: Remove this useEffect
	useEffect(() => {
		const hasActiveTrip = !!activeAmbulanceTrip?.requestId || !!activeBedBooking?.requestId;

		if (!selectedHospitalId && !pendingSelectedHospitalId && currentRoute && !hasActiveTrip) {
			setCurrentRoute(null);
		}
	}, [selectedHospitalId, pendingSelectedHospitalId, currentRoute, activeAmbulanceTrip?.requestId, activeBedBooking?.requestId]);

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

			// 🔴 REVERT POINT: Stabilized flicker interval
			// PREVIOUS: 3000ms
			// NEW: 8000ms to reduce render-loop noise
			// REVERT TO: 3000ms
			const flickerInterval = setInterval(() => {
				setQuickButtonPulse(prev => Math.random() > 0.3);
			}, 8000);

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
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			const result = await handleQuickEmergency("ambulance");

			if (result.ok) {
				showToast(`🚨 Auto-dispatched to ${result.hospital}`, "success");

				// 🎯 Navigate to selected hospital view after auto-dispatch
				if (result.requestId) {
					navigateToRequestAmbulance({
						router,
						hospitalId: result.hospitalId || 'auto-dispatched',
						method: "push"
					});
				}
			} else {
				showToast(`Emergency failed: ${result.reason}`, "error");
			}
		} catch (error) {
			showToast("Emergency request failed", "error");
		}
	}, [mode, activeAmbulanceTrip?.requestId, showToast, handleQuickEmergency, router]);

	// Header components - memoized
	const leftComponent = useMemo(() => <ProfileAvatarButton />, []);

	// Memoize the quick action handlers to prevent infinite re-renders
	const handleQuickEmergencyPress = useCallback(() => {
		handleQuickEmergencyAction();
	}, [handleQuickEmergencyAction]);

	const handleQuickEmergencyPressIn = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
	}, []);

	const handleQuickEmergencyPressOut = useCallback(() => {
		setQuickButtonPulse(false);
	}, []);

	const rightComponent = useMemo(() => {
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
		}, [resetTabBar, resetHeader, setHeaderState, mode, leftComponent, rightComponent])
	);

	// Tab bar locking: removed aggressive locking to prevent "locked out" feeling.
	// We now rely on useBottomSheetSnap and GlobalFAB's decoupled translation.
	useFocusEffect(
		useCallback(() => {
			// Always start unlocked when focusing this screen
			unlockTabBarHidden();

			return () => {
				// Ensure unlocked when leaving
				unlockTabBarHidden();
			};
		}, [unlockTabBarHidden])
	);

	// FAB toggles between emergency and bed booking modes
	const handleFloatingButtonPress = useCallback(() => {
		toggleMode();
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
	}, [toggleMode]);

	// Enhanced FAB visibility logic that accounts for different modes and snap points
	const hasAnyVisitActive = !!activeAmbulanceTrip?.requestId || !!activeBedBooking?.requestId;
	const shouldHideFAB = useMemo(() => {
		// During active trips, ALWAYS show FAB for mode switching
		if (hasAnyVisitActive) {
			return false;
		}

		// Hide when hospital is selected (detail mode)
		if (selectedHospital) {
			return true;
		}

		// Hide when sheet is collapsed
		if (sheetSnapIndex === 0) {
			return true;
		}

		return false;
	}, [selectedHospital, hasAnyVisitActive, sheetSnapIndex]);

	useFocusEffect(
		useCallback(() => {
			// Registering FAB
			const fabDetails = {
				id: 'emergency-mode-toggle',
				visible: !shouldHideFAB,
				priority: 15,
				mode: mode,
				selectedHospital: selectedHospital?.name,
				hasAnyVisitActive
			};

			// Register FAB with unique ID and enhanced configuration
			registerFAB('emergency-mode-toggle', {
				icon: mode === "emergency" ? "bed-outline" : "alarm-light-outline",
				visible: !shouldHideFAB,
				mode: mode, // Pass mode for context-aware behavior
				hasAnyVisitActive: hasAnyVisitActive, // Pass trip status for positioning
				allowInStack: hasAnyVisitActive, // Allow FAB in stack screens when trip is active
				onPress: handleFloatingButtonPress,
				style: 'primary',
				haptic: 'medium',
				priority: 15, // Higher priority to override Home tab FAB (priority 10)
				animation: 'subtle',
			});

			// Cleanup
			return () => {
				// Unregistering FAB: emergency-mode-toggle
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

			// Find hospital and check availability fallbacks
			const hospital = hospitals.find(h => h.id === hospitalId);

			const isGoogleHospital = hospital?.importedFromGoogle && hospital?.importStatus !== 'verified';

			// Check for zero ambulances in emergency mode
			const noAmbulances = mode === 'emergency' &&
				hospital?.ambulances !== undefined &&
				hospital?.ambulances !== null &&
				Number(hospital.ambulances) <= 0;

			const noBeds = mode === 'booking' && hospital?.availableBeds !== undefined && hospital.availableBeds <= 0;

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
				// 🔴 REVERT POINT: Safe Snapping
				// PREVIOUS: bottomSheetRef.current?.snapToIndex?.(1) - triggered crash in detail mode
				// NEW: Use the safe context handler which is aware of current mode constraints
				// REVERT TO: The old hardcoded snapToIndex call
				handleSheetSnapChange(1);
				return;
			}

			// 🔴 REVERT POINT: Smart Fallback Logic
			// PREVIOUS: Navigated to request screens regardless of service availability
			// NEW: Triggers direct phone call if hospital is unverified or has no resources
			// REVERT TO: Remove the block below
			if (isGoogleHospital || noAmbulances || noBeds) {
				const phone = hospital?.phone;
				if (phone) {
					Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
					const cleanPhone = phone.replace(/[^\d+]/g, "");
					Linking.openURL(`tel:${cleanPhone}`);
					return;
				} else {
					showToast("Hospital phone number not available. Contacting emergency services...", "error");
					Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

					// 🔴 REVERT POINT: Emergency Fallback
					// PREVIOUS: Only 911 in emergency mode
					// NEW: Unified 911 fallback for any critical failure where phone is missing
					Linking.openURL("tel:911");
					return;
				}
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
		[mode, router, activeAmbulanceTrip?.requestId, activeBedBooking?.requestId, showToast, searchQuery, hospitals]
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
		hospitals: allHospitals || hospitals,
		filteredHospitals: filteredHospitals || hospitals,
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
	const canUseDesignAnimation =
		mode === "emergency" &&
		!!routeHospitalId &&
		!activeAmbulanceTrip?.requestId;
	const animateAmbulance =
		(mode === "emergency" && !!activeAmbulanceTrip) ||
		(canUseDesignAnimation && forceAmbulanceAnimation);
	const ambulanceTripEtaSeconds =
		activeAmbulanceTrip?.etaSeconds ??
		(canUseDesignAnimation && forceAmbulanceAnimation
			? currentRoute?.durationSec ?? currentRoute?.duration ?? 180
			: null);

	useEffect(() => {
		if (canUseDesignAnimation) return;
		if (forceAmbulanceAnimation) {
			setForceAmbulanceAnimation(false);
		}
	}, [canUseDesignAnimation, forceAmbulanceAnimation]);

	useEffect(() => {
		const routeEtaRaw = currentRoute?.durationSec ?? currentRoute?.duration ?? null;
		const routeEtaSeconds = Number.isFinite(routeEtaRaw) ? Math.max(1, Math.round(routeEtaRaw)) : null;
		if (!activeAmbulanceTrip?.requestId) return;
		if (!Number.isFinite(routeEtaSeconds)) return;

		const hasEtaSeconds =
			Number.isFinite(activeAmbulanceTrip?.etaSeconds) && activeAmbulanceTrip.etaSeconds > 0;
		const hasEstimatedArrivalText =
			typeof activeAmbulanceTrip?.estimatedArrival === "string" &&
			activeAmbulanceTrip.estimatedArrival.trim().length > 0;

		if (hasEtaSeconds && hasEstimatedArrivalText) return;

		const fallbackEtaLabel =
			routeEtaSeconds < 60
				? `${routeEtaSeconds}s`
				: routeEtaSeconds % 60 === 0
					? `${Math.floor(routeEtaSeconds / 60)} min`
					: `${Math.floor(routeEtaSeconds / 60)}m ${routeEtaSeconds % 60}s`;

		if (__DEV__) {
			console.log("[EmergencyScreen] Backfilling activeAmbulanceTrip ETA from route", {
				requestId: activeAmbulanceTrip?.requestId ?? null,
				id: activeAmbulanceTrip?.id ?? null,
				routeEtaSeconds,
				prevEtaSeconds: activeAmbulanceTrip?.etaSeconds ?? null,
				prevEstimatedArrival: activeAmbulanceTrip?.estimatedArrival ?? null,
				nextEstimatedArrival: hasEstimatedArrivalText
					? activeAmbulanceTrip?.estimatedArrival
					: fallbackEtaLabel,
			});
		}

		patchActiveAmbulanceTrip?.({
			etaSeconds: hasEtaSeconds ? activeAmbulanceTrip?.etaSeconds : routeEtaSeconds,
			estimatedArrival: hasEstimatedArrivalText
				? activeAmbulanceTrip?.estimatedArrival
				: fallbackEtaLabel,
		});
	}, [
		activeAmbulanceTrip?.id,
		activeAmbulanceTrip?.requestId,
		activeAmbulanceTrip?.etaSeconds,
		activeAmbulanceTrip?.estimatedArrival,
		currentRoute?.duration,
		currentRoute?.durationSec,
		patchActiveAmbulanceTrip,
	]);

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
			(allHospitals || hospitals).find((h) => h?.id === activeAmbulanceTrip.hospitalId) ?? null;
		if (!routeHospital) return searchFilteredHospitals;

		const alreadyIncluded = searchFilteredHospitals.some(
			(h) => h?.id === routeHospital.id
		);
		return alreadyIncluded
			? searchFilteredHospitals
			: [...searchFilteredHospitals, routeHospital];
	}, [activeAmbulanceTrip, hospitals, allHospitals, searchFilteredHospitals]);

	const nearbyCoverageCounts = useMemo(() => {
		const source = Array.isArray(allHospitals) && allHospitals.length > 0 ? allHospitals : hospitals;
		if (!Array.isArray(source) || source.length === 0) {
			return { allNearby: 0, verifiedNearby: 0 };
		}

		const seen = new Set();
		return source.reduce((acc, hospital) => {
			const latitude = hospital?.coordinates?.latitude ?? hospital?.latitude;
			const longitude = hospital?.coordinates?.longitude ?? hospital?.longitude;
			if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return acc;

			const key =
				hospital?.id ??
				`${hospital?.name || "hospital"}:${Number(latitude).toFixed(4)}:${Number(longitude).toFixed(4)}`;
			if (seen.has(key)) return acc;

			seen.add(key);
			acc.allNearby += 1;
			if (isHospitalVerifiedForCoverage(hospital)) {
				acc.verifiedNearby += 1;
			}
			return acc;
		}, { allNearby: 0, verifiedNearby: 0 });
	}, [allHospitals, hospitals]);

	const hasDemoHospitalsNearby = useMemo(() => {
		const source = Array.isArray(allHospitals) && allHospitals.length > 0 ? allHospitals : hospitals;
		if (!Array.isArray(source) || source.length === 0) return false;
		return source.some((hospital) => demoEcosystemService.isDemoHospital(hospital));
	}, [allHospitals, hospitals]);

	const demoModeActive = demoModeEnabled && hasDemoHospitalsNearby;

	const coverageStatus = useMemo(() => {
		if (nearbyCoverageCounts.verifiedNearby <= 0) return "none";
		if (nearbyCoverageCounts.verifiedNearby < COVERAGE_POOR_THRESHOLD) return "poor";
		return "good";
	}, [nearbyCoverageCounts]);

	const handleCoverageDisclaimerContinue = useCallback(async () => {
		setCoverageDisclaimerVisible(false);

		if (!coverageDontRemind) return;

		try {
			await AsyncStorage.setItem(COVERAGE_DISCLAIMER_STORAGE_KEY, "1");
			setCoverageOptOut(true);
		} catch (error) {
			console.warn("[EmergencyScreen] Failed to persist coverage disclaimer preference", error);
		} finally {
			setCoverageDontRemind(false);
		}
	}, [coverageDontRemind]);

	const handleCoverageDisclaimerCall911 = useCallback(() => {
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
		Linking.openURL("tel:911");
	}, []);

	const handleCoverageDisclaimerToggle = useCallback(() => {
		setCoverageDontRemind((prev) => !prev);
	}, []);

	const resolveCoverageCoordinates = useCallback(() => {
		const fallbackHospital =
			(Array.isArray(allHospitals) && allHospitals[0]) ||
			(Array.isArray(hospitals) && hospitals[0]) ||
			null;
		const latitude =
			userLocation?.latitude ??
			fallbackHospital?.coordinates?.latitude ??
			fallbackHospital?.latitude ??
			null;
		const longitude =
			userLocation?.longitude ??
			fallbackHospital?.coordinates?.longitude ??
			fallbackHospital?.longitude ??
			null;

		if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
			throw new Error("Unable to resolve your location for demo provisioning");
		}

		return { latitude: Number(latitude), longitude: Number(longitude) };
	}, [allHospitals, hospitals, userLocation?.latitude, userLocation?.longitude]);

	const handleCloseDemoBootstrap = useCallback(() => {
		if (demoBootstrapRunning) return;
		setDemoBootstrapVisible(false);
		if (!demoBootstrapCompleted) {
			setDemoBootstrapError(null);
			setDemoActivePhaseKey(null);
			setDemoPhaseStatuses(createDemoPhaseStatuses());
		}
	}, [demoBootstrapCompleted, demoBootstrapRunning]);

	const handleCoverageDisclaimerSwitchToDemo = useCallback(async () => {
		try {
			const coords = resolveCoverageCoordinates();

			setCoverageDisclaimerVisible(false);
			setDemoBootstrapVisible(true);
			setDemoBootstrapRunning(true);
			setDemoBootstrapCompleted(false);
			setDemoBootstrapError(null);
			setDemoActivePhaseKey(null);
			setDemoPhaseStatuses(createDemoPhaseStatuses());

			await demoEcosystemService.bootstrapDemoEcosystem({
				latitude: coords.latitude,
				longitude: coords.longitude,
				radiusKm: 50,
				onProgress: ({ key, status }) => {
					if (!key) return;
					setDemoActivePhaseKey(status === "running" ? key : null);
					setDemoPhaseStatuses((prev) => ({
						...prev,
						[key]: status === "completed" ? "completed" : "running",
					}));
				},
			});

			try {
				await updatePreferences?.({ demoModeEnabled: true });
			} catch (prefError) {
				console.warn("[EmergencyScreen] Failed to persist demo mode preference", prefError);
			}

			try {
				const refreshed = await hospitalsService.discoverNearby(
					coords.latitude,
					coords.longitude,
					50000
				);
				if (Array.isArray(refreshed) && refreshed.length > 0) {
					updateHospitals(refreshed);
				}
			} catch (refreshError) {
				console.warn("[EmergencyScreen] Demo bootstrap refresh failed", refreshError);
			}

			setDemoBootstrapCompleted(true);
			showToast("Demo experience is ready. You can disable it later in More > Demo Mode.", "success");
		} catch (error) {
			const message = error?.message || "Failed to create demo ecosystem";
			console.error("[EmergencyScreen] Demo bootstrap failed", error);
			setDemoBootstrapError(message);
			setDemoPhaseStatuses((prev) => {
				const runningPhase = Object.keys(prev).find((phaseKey) => prev[phaseKey] === "running");
				if (!runningPhase) return prev;
				return { ...prev, [runningPhase]: "failed" };
			});
			showToast(message, "error");
		} finally {
			setDemoBootstrapRunning(false);
			setDemoActivePhaseKey(null);
		}
	}, [resolveCoverageCoordinates, showToast, updateHospitals, updatePreferences]);

	useEffect(() => {
		const hasActiveEmergency =
			!!activeAmbulanceTrip?.requestId || !!activeBedBooking?.requestId;

		if (
			!isFocused ||
			isMapLoading ||
			!coveragePreferenceLoaded ||
			coverageOptOut ||
			hasActiveEmergency ||
			demoBootstrapVisible
		) {
			return;
		}

		if (coverageStatus === "good" || hasShownCoverageDisclaimerRef.current) {
			return;
		}

		const timer = setTimeout(() => {
			if (hasShownCoverageDisclaimerRef.current) return;
			if (coverageStatus === "good" || coverageOptOut || !isFocused || isMapLoading) return;
			setCoverageDontRemind(false);
			setCoverageDisclaimerVisible(true);
			hasShownCoverageDisclaimerRef.current = true;
		}, 1000);

		return () => clearTimeout(timer);
	}, [
		isFocused,
		isMapLoading,
		coveragePreferenceLoaded,
		coverageOptOut,
		coverageStatus,
		demoBootstrapVisible,
		activeAmbulanceTrip?.requestId,
		activeBedBooking?.requestId,
	]);

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
			<CoverageDisclaimerModal
				visible={coverageDisclaimerVisible}
				coverageStatus={coverageStatus}
				nearbyHospitalCount={nearbyCoverageCounts.allNearby}
				nearbyVerifiedHospitalCount={nearbyCoverageCounts.verifiedNearby}
				coverageThreshold={COVERAGE_POOR_THRESHOLD}
				demoModeEnabled={demoModeActive}
				dontRemind={coverageDontRemind}
				onToggleDontRemind={handleCoverageDisclaimerToggle}
				onSwitchToDemo={handleCoverageDisclaimerSwitchToDemo}
				onContinue={handleCoverageDisclaimerContinue}
				onCall911={handleCoverageDisclaimerCall911}
			/>

			<DemoBootstrapModal
				visible={demoBootstrapVisible}
				phases={DEMO_BOOTSTRAP_PHASES}
				phaseStatuses={demoPhaseStatuses}
				activePhaseKey={demoActivePhaseKey}
				isRunning={demoBootstrapRunning}
				isCompleted={demoBootstrapCompleted}
				error={demoBootstrapError}
				onClose={handleCloseDemoBootstrap}
			/>

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

			{demoModeActive && !coverageOptOut && !coverageDisclaimerVisible && (
				<View
					style={[
						styles.demoModeBanner,
						{
							backgroundColor: isDarkMode
								? "rgba(15,23,42,0.82)"
								: "rgba(255,255,255,0.86)",
						},
					]}
				>
					<Ionicons name="flask-outline" size={14} color={COLORS.brandPrimary} />
					<Text
						style={[
							styles.demoModeBannerText,
							{ color: isDarkMode ? "#E2E8F0" : "#334155" },
						]}
					>
						Demo mode is active. Turn it off in More {">"} Demo Mode.
					</Text>
				</View>
			)}

			{/* Emergency Map Container - Always render since only one instance exists */}
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
				ambulanceTelemetryHealth={ambulanceTelemetryHealth}
				sheetSnapIndex={sheetSnapIndex}
			/>

			<BottomSheetController
				ref={bottomSheetRef}
				mode={mode}
				serviceType={serviceType}
				selectedSpecialty={selectedSpecialty}
				specialties={specialties}
				hospitals={searchFilteredHospitals}
				allHospitals={allHospitals || hospitals}
				selectedHospital={selectedHospital}
				activeAmbulanceTrip={activeAmbulanceTrip}
				ambulanceTelemetryHealth={ambulanceTelemetryHealth}
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

			{/* Subtle Version Display */}
			<View style={styles.versionContainer} pointerEvents="none">
				<Text style={[styles.versionText, { color: isDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)" }]}>
					v{Constants.expoConfig?.version || '1.0.4'} • {Constants.expoConfig?.extra?.eas?.buildId?.substring(0, 8) || 'dev'}
				</Text>
			</View>

			{canUseDesignAnimation && (
				<View
					style={[
						styles.designAnimationToggle,
						{
							backgroundColor: isDarkMode ? "rgba(15,23,42,0.46)" : "rgba(255,255,255,0.62)",
						},
					]}
				>
					<MaterialCommunityIcons
						name="ambulance"
						size={16}
						color={isDarkMode ? "rgba(241,245,249,0.68)" : "rgba(15,23,42,0.62)"}
					/>
					<Switch
						value={forceAmbulanceAnimation}
						onValueChange={setForceAmbulanceAnimation}
						trackColor={{
							false: isDarkMode ? "rgba(148,163,184,0.34)" : "rgba(148,163,184,0.4)",
							true: "rgba(134,16,14,0.66)",
						}}
						thumbColor={forceAmbulanceAnimation ? "#F8FAFC" : "#E2E8F0"}
						ios_backgroundColor={isDarkMode ? "rgba(148,163,184,0.34)" : "rgba(148,163,184,0.4)"}
						style={styles.designAnimationSwitch}
					/>
				</View>
			)}
		</View>
	);
};

export default EmergencyScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	demoModeBanner: {
		position: "absolute",
		top: 124,
		left: 12,
		right: 12,
		zIndex: 12,
		borderRadius: 16,
		paddingHorizontal: 12,
		paddingVertical: 8,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	demoModeBannerText: {
		flex: 1,
		fontSize: 12,
		fontWeight: "600",
	},
	versionContainer: {
		position: 'absolute',
		bottom: 54, // Avoid map attribution
		left: 12,
		zIndex: 0,
	},
	versionText: {
		fontSize: 10,
		fontWeight: '500',
		letterSpacing: 0.5,
	},
	designAnimationToggle: {
		position: "absolute",
		left: 10,
		top: 156,
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 24,
		flexDirection: "row",
		alignItems: "center",
		gap: 0,
		opacity: 0.62,
	},
	designAnimationSwitch: {
		transform: [{ scaleX: 0.68 }, { scaleY: 0.68 }],
	},
});

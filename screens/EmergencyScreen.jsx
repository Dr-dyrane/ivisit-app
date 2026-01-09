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
import { useVisits } from "../contexts/VisitsContext";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { COLORS } from "../constants/colors";
import { Ionicons, Fontisto } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { VISIT_STATUS, VISIT_TYPES } from "../data/visits";
import { getPreferencesAPI } from "../api/preferences";
import { listEmergencyContactsAPI } from "../api/emergencyContacts";
import { getMedicalProfileAPI } from "../api/medicalProfile";
import { createEmergencyRequestAPI, setEmergencyRequestStatusAPI } from "../api/emergencyRequests";
import { EmergencyRequestStatus } from "../services/emergencyRequestsService";
import { NOTIFICATION_PRIORITY, NOTIFICATION_TYPES } from "../data/notifications";

import FullScreenEmergencyMap from "../components/map/FullScreenEmergencyMap";
import EmergencyBottomSheet from "../components/emergency/EmergencyBottomSheet";
import EmergencyRequestModal from "../components/emergency/EmergencyRequestModal";
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
	const { addVisit, cancelVisit, completeVisit } = useVisits();
	const { user } = useAuth();
	const { addNotification } = useNotifications();

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
				rightComponent: null,
			});
		}, [resetTabBar, resetHeader, setHeaderState, mode, leftComponent])
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
		const now = new Date();
		const visitId = request?.requestId ? String(request.requestId) : `local_${Date.now()}`;
		const hospital = hospitals.find((h) => h?.id === hospitalId) ?? null;
		const date = now.toISOString().slice(0, 10);
		const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
		(async () => {
			try {
				const preferences = await getPreferencesAPI();
				const shareMedicalProfile = preferences?.privacyShareMedicalProfile === true;
				const shareEmergencyContacts = preferences?.privacyShareEmergencyContacts === true;

				const shared = {
					medicalProfile: shareMedicalProfile ? await getMedicalProfileAPI() : null,
					emergencyContacts: shareEmergencyContacts
						? await listEmergencyContactsAPI()
						: null,
				};

				const patient = {
					fullName: user?.fullName ?? null,
					phone: user?.phone ?? null,
					email: user?.email ?? null,
					username: user?.username ?? null,
				};

				await createEmergencyRequestAPI({
					id: visitId,
					requestId: visitId,
					serviceType: request.serviceType,
					hospitalId,
					hospitalName: request?.hospitalName ?? hospital?.name ?? null,
					specialty: request?.specialty ?? selectedSpecialty ?? null,
					ambulanceType: request?.ambulanceType ?? null,
					ambulanceId: request?.ambulanceId ?? null,
					bedNumber: request?.bedNumber ?? null,
					bedType: request?.bedType ?? null,
					bedCount: request?.bedCount ?? null,
					estimatedArrival: request?.estimatedArrival ?? null,
					status: EmergencyRequestStatus.IN_PROGRESS,
					patient,
					shared,
				});

				addNotification({
					type:
						request?.serviceType === "ambulance"
							? NOTIFICATION_TYPES.EMERGENCY
							: NOTIFICATION_TYPES.APPOINTMENT,
					title:
						request?.serviceType === "ambulance"
							? "Ambulance requested"
							: "Bed reserved",
					message: `${request?.hospitalName ?? hospital?.name ?? "Hospital"} • ${date} ${time}`,
					timestamp: new Date().toISOString(),
					read: false,
					priority:
						request?.serviceType === "ambulance"
							? NOTIFICATION_PRIORITY.URGENT
							: NOTIFICATION_PRIORITY.HIGH,
					actionType: request?.serviceType === "ambulance" ? "track" : "view_appointment",
					actionData: { visitId },
				});
			} catch {}
		})();
		if (request?.serviceType === "ambulance") {
			startAmbulanceTrip({
				hospitalId,
				requestId: visitId,
				ambulanceId: request?.ambulanceId ?? null,
				ambulanceType: request?.ambulanceType ?? null,
				estimatedArrival: request?.estimatedArrival ?? null,
				hospitalName: request?.hospitalName ?? null,
			});

			addVisit({
				id: visitId,
				hospital: request?.hospitalName ?? hospital?.name ?? "Hospital",
				doctor: "Ambulance Dispatch",
				specialty: "Emergency Response",
				date,
				time,
				type: VISIT_TYPES.AMBULANCE_RIDE,
				status: VISIT_STATUS.IN_PROGRESS,
				image: hospital?.image ?? null,
				address: hospital?.address ?? null,
				phone: hospital?.phone ?? null,
				notes: "Ambulance requested via iVisit.",
			});
		}
		if (request?.serviceType === "bed") {
			startBedBooking({
				hospitalId,
				requestId: visitId,
				hospitalName: request?.hospitalName ?? null,
				specialty: request?.specialty ?? null,
				bedNumber: request?.bedNumber ?? null,
				bedType: request?.bedType ?? null,
				bedCount: request?.bedCount ?? null,
				estimatedWait: request?.estimatedArrival ?? null,
			});

			addVisit({
				id: visitId,
				hospital: request?.hospitalName ?? hospital?.name ?? "Hospital",
				doctor: "Admissions Desk",
				specialty: request?.specialty ?? selectedSpecialty ?? "General Care",
				date,
				time,
				type: VISIT_TYPES.BED_BOOKING,
				status: VISIT_STATUS.IN_PROGRESS,
				image: hospital?.image ?? null,
				address: hospital?.address ?? null,
				phone: hospital?.phone ?? null,
				notes: "Bed reserved via iVisit.",
				roomNumber: request?.bedNumber ?? null,
				estimatedDuration: request?.estimatedArrival ?? null,
			});
		}
		clearSelectedHospital();
		setTimeout(() => {
			bottomSheetRef.current?.snapToIndex?.(0);
		}, 0);
	}, [addNotification, addVisit, clearSelectedHospital, hospitals, mode, requestHospitalId, selectedHospital?.id, selectedSpecialty, startAmbulanceTrip, startBedBooking, user?.email, user?.fullName, user?.phone, user?.username]);

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
			const base =
				mode === "booking"
					? selectedSpecialty
						? hospitals.filter((h) => h?.specialties?.includes?.(selectedSpecialty))
						: hospitals
					: filteredHospitals;
			const matches = base.filter((h) => {
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
	}, [filteredHospitals, hospitals, mode, selectedSpecialty, setSearchQuery, timing]);

	// Filter hospitals based on search query
	const searchFilteredHospitals = useMemo(() => {
		if (!searchQuery.trim()) return filteredHospitals;
		const query = searchQuery.toLowerCase();
		const base =
			mode === "booking"
				? selectedSpecialty
					? hospitals.filter((h) => h?.specialties?.includes?.(selectedSpecialty))
					: hospitals
				: filteredHospitals;
		return base.filter((h) => {
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
	}, [filteredHospitals, hospitals, mode, searchQuery, selectedSpecialty]);

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
					if (activeAmbulanceTrip?.requestId) {
						setEmergencyRequestStatusAPI(
							activeAmbulanceTrip.requestId,
							EmergencyRequestStatus.CANCELLED
						).catch(() => {});
						cancelVisit(activeAmbulanceTrip.requestId);
						addNotification({
							type: NOTIFICATION_TYPES.EMERGENCY,
							title: "Ambulance request cancelled",
							message: "You cancelled the active ambulance request.",
							timestamp: new Date().toISOString(),
							read: false,
							priority: NOTIFICATION_PRIORITY.NORMAL,
							actionType: null,
							actionData: { visitId: activeAmbulanceTrip.requestId },
						});
					}
					stopAmbulanceTrip();
					setTimeout(() => {
						bottomSheetRef.current?.snapToIndex?.(1);
					}, 0);
				}}
				onCompleteAmbulanceTrip={() => {
					if (activeAmbulanceTrip?.requestId) {
						setEmergencyRequestStatusAPI(
							activeAmbulanceTrip.requestId,
							EmergencyRequestStatus.COMPLETED
						).catch(() => {});
						completeVisit(activeAmbulanceTrip.requestId);
						addNotification({
							type: NOTIFICATION_TYPES.EMERGENCY,
							title: "Ambulance ride completed",
							message: "Your emergency trip has been marked complete.",
							timestamp: new Date().toISOString(),
							read: false,
							priority: NOTIFICATION_PRIORITY.NORMAL,
							actionType: "view_summary",
							actionData: { visitId: activeAmbulanceTrip.requestId },
						});
					}
					stopAmbulanceTrip();
					setTimeout(() => {
						bottomSheetRef.current?.snapToIndex?.(1);
					}, 0);
				}}
				onCancelBedBooking={() => {
					if (activeBedBooking?.requestId) {
						setEmergencyRequestStatusAPI(
							activeBedBooking.requestId,
							EmergencyRequestStatus.CANCELLED
						).catch(() => {});
						cancelVisit(activeBedBooking.requestId);
						addNotification({
							type: NOTIFICATION_TYPES.APPOINTMENT,
							title: "Bed reservation cancelled",
							message: "You cancelled the active bed reservation.",
							timestamp: new Date().toISOString(),
							read: false,
							priority: NOTIFICATION_PRIORITY.NORMAL,
							actionType: null,
							actionData: { visitId: activeBedBooking.requestId },
						});
					}
					stopBedBooking();
					setTimeout(() => {
						bottomSheetRef.current?.snapToIndex?.(1);
					}, 0);
				}}
				onCompleteBedBooking={() => {
					if (activeBedBooking?.requestId) {
						setEmergencyRequestStatusAPI(
							activeBedBooking.requestId,
							EmergencyRequestStatus.COMPLETED
						).catch(() => {});
						completeVisit(activeBedBooking.requestId);
						addNotification({
							type: NOTIFICATION_TYPES.APPOINTMENT,
							title: "Bed booking completed",
							message: "Your bed booking has been marked complete.",
							timestamp: new Date().toISOString(),
							read: false,
							priority: NOTIFICATION_PRIORITY.NORMAL,
							actionType: "view_summary",
							actionData: { visitId: activeBedBooking.requestId },
						});
					}
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

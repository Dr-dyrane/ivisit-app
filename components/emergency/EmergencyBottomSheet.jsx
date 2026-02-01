import {
	useCallback,
	useMemo,
	useState,
	forwardRef,
	useRef,
	useImperativeHandle,
	useEffect,
} from "react";
import {
	StyleSheet,
	Platform,
} from "react-native";
import BottomSheet, {
	BottomSheetView,
	BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { usePreferences } from "../../contexts/PreferencesContext";
import { useEmergencyUI } from "../../contexts/EmergencyUIContext";
import HospitalDetailView from "./HospitalDetailView";
import EmergencySheetHandle from "./bottomSheet/EmergencySheetHandle";
import EmergencySheetBackground from "./bottomSheet/EmergencySheetBackground";
import EmergencySheetTopRow from "./bottomSheet/EmergencySheetTopRow";
import EmergencySheetFilters from "./bottomSheet/EmergencySheetFilters";
import EmergencySheetSectionHeader from "./bottomSheet/EmergencySheetSectionHeader";
import EmergencySheetHospitalList from "./bottomSheet/EmergencySheetHospitalList";
import { TripSummaryCard } from "./bottomSheet/TripSummaryCard";
import { BedBookingSummaryCard } from "./bottomSheet/BedBookingSummaryCard";

import { useBottomSheetSnap } from "../../hooks/emergency/useBottomSheetSnap";
import { useBottomSheetScroll } from "../../hooks/emergency/useBottomSheetScroll";
import { useBottomSheetSearch } from "../../hooks/emergency/useBottomSheetSearch";

const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 85 : 70;

const EmergencyBottomSheet = forwardRef(
	(
		{
			mode = "emergency",
			serviceType,
			selectedSpecialty,
			specialties = [],
			hospitals = [],
			allHospitals = [],
			selectedHospital,
			activeAmbulanceTrip = null,
			onCancelAmbulanceTrip,
			onMarkAmbulanceArrived,
			onCompleteAmbulanceTrip,
			activeBedBooking = null,
			onCancelBedBooking,
			onMarkBedOccupied,
			onCompleteBedBooking,
			onModeSelect,
			serviceTypeCounts = {},
			specialtyCounts = {},
			hasActiveFilters = false,
			onServiceTypeSelect,
			onSpecialtySelect,
			onHospitalSelect,
			onHospitalCall,
			onSnapChange,
			onSearch,
			onResetFilters,
			onCloseFocus,
		},
		ref
	) => {
		const { isDarkMode } = useTheme();
		const { user } = useAuth();
		const { preferences } = usePreferences();
		const insets = useSafeAreaInsets();

		const { snapIndex: newSnapIndex, resetSnapIndex } = useEmergencyUI();

		const [sheetPhase, setSheetPhase] = useState("half");

		const isDetailMode = !!selectedHospital;
		const hasAnyVisitActive = !!activeAmbulanceTrip || !!activeBedBooking;
		const isTripMode =
			mode === "emergency" && !!activeAmbulanceTrip && !isDetailMode;
		const isBedBookingMode =
			mode === "booking" && !!activeBedBooking && !isDetailMode;

		// Reset snap index when entering detail mode to prevent out-of-range errors
		// This runs BEFORE the derivedIndex calculation and snapPoints change
		useEffect(() => {
			if (isDetailMode && newSnapIndex > 0) {
				resetSnapIndex();
			}
		}, [isDetailMode, newSnapIndex, resetSnapIndex]);

		const isBelowHalf = sheetPhase === "collapsed" || (sheetPhase === "half" && newSnapIndex === 0);
		const isFloating = newSnapIndex === 0 || newSnapIndex === 1;

		const {
			showProfileModal,
			openProfileModal,
			closeProfileModal,
			searchQuery: localSearchQuery,
			timing,
			clearSearch,
		} = useEmergencyUI();

		const bottomSheetRef = useRef(null);
		const listScrollRef = useRef(null);

		const { snapPoints, animationConfigs, currentSnapIndex, handleSheetChange } =
			useBottomSheetSnap({
				isDetailMode,
				isTripMode,
				isBedBookingMode,
				hasAnyVisitActive,
				onSnapChange,
			});

		const { handleScroll } = useBottomSheetScroll({ currentSnapIndex });

		const { handleSearchChange, handleSearchFocus, handleSearchBlur, handleSearchClear } =
			useBottomSheetSearch({
				onSearch,
				sheetRef: bottomSheetRef,
			});

		const handleAvatarPress = useCallback(() => {
			timing.startTiming("avatar_press");
			openProfileModal();
			timing.endTiming("avatar_press");
		}, [openProfileModal, timing]);

		/**
		 * Prevents 'Invariant Violation: out of range index' crashes.
		 * Occurs when snapPoints length decreases (e.g. transitioning from 3 to 2 points)
		 * while the current index is at the now-invalid higher position.
		 */
		const clampSheetIndex = useCallback(
			(index) => {
				console.log('[EmergencyBottomSheet] clampSheetIndex called with:', index, 'snapPoints:', snapPoints, 'length:', snapPoints.length);

				// 🔴 REVERT POINT: Enhanced snap point validation
				// PREVIOUS: Basic index clamping
				// NEW: More robust validation with detailed logging
				// REVERT TO: Remove the enhanced logging and validation

				if (!Number.isFinite(index)) {
					console.log('[EmergencyBottomSheet] Invalid index, returning 0');
					return 0;
				}

				if (!snapPoints || snapPoints.length === 0) {
					console.log('[EmergencyBottomSheet] No snap points available, returning 0');
					return 0;
				}

				const maxIndex = snapPoints.length - 1;
				const clampedIndex = Math.min(Math.max(index, 0), maxIndex);

				console.log('[EmergencyBottomSheet] Final clamped index:', clampedIndex, 'maxIndex:', maxIndex);
				return clampedIndex;
			},
			[snapPoints]
		);

		useImperativeHandle(ref, () => ({
			snapToIndex: (index) => {
				const clampedIndex = clampSheetIndex(index);
				console.log('[EmergencyBottomSheet] snapToIndex called with clamped index:', clampedIndex);

				// 🔴 REVERT POINT: Additional safety check for bottom sheet ref
				// PREVIOUS: Direct snapToIndex call
				// NEW: Check if bottom sheet is ready before snapping
				// REVERT TO: Remove the ref check
				if (bottomSheetRef.current && snapPoints.length > 0) {
					return bottomSheetRef.current.snapToIndex(clampedIndex);
				} else {
					console.warn('[EmergencyBottomSheet] Cannot snapToIndex - bottom sheet not ready or no snap points');
					return null;
				}
			},
			expand: () => bottomSheetRef.current?.expand(),
			collapse: () => bottomSheetRef.current?.collapse(),
			getCurrentSnapIndex: () => currentSnapIndex,
			scrollTo: (y, animated = true) =>
				listScrollRef.current?.scrollTo?.({ y, animated }),
			restoreListState: (state = {}) => {
				const snapIndex = state?.snapIndex;
				const scrollY = state?.scrollY;
				// Use a small delay to ensure snapPoints are updated and UI has settled
				setTimeout(() => {
					// 🔴 REVERT POINT: Safe index restoration during mode transitions
					// PREVIOUS: Direct snapIndex restoration without mode awareness
					// NEW: Ensure restored index is valid for current snap points
					// REVERT TO: Remove the mode-aware index calculation

					if (typeof snapIndex === "number") {
						// When transitioning from detail mode (1 point) to normal mode (3 points),
						// the restored index might be out of bounds. Clamp it safely.
						const safeIndex = clampSheetIndex(snapIndex);
						console.log('[EmergencyBottomSheet] Restoring to safe index:', safeIndex, 'from original:', snapIndex);

						// Additional safety: if we're transitioning from detail mode, start at index 0 (collapsed)
						const finalIndex = isDetailMode ? 0 : safeIndex;

						bottomSheetRef.current?.snapToIndex(finalIndex);
					}
					if (typeof scrollY === "number") {
						listScrollRef.current?.scrollTo?.({ y: scrollY, animated: false });
					}
				}, 100);
			},
		}), [clampSheetIndex, currentSnapIndex]);

		const gradientColors = isDarkMode
			? ["rgba(18, 24, 38, 0.95)", "rgba(18, 24, 38, 0.85)", "rgba(18, 24, 38, 0.85)"]
			: ["rgba(255, 255, 255, 0.95)", "rgba(255, 255, 255, 0.85)", "rgba(255, 255, 255, 0.85)"];

		const handleColor = isDarkMode
			? "rgba(255, 255, 255, 0.3)"
			: "rgba(0, 0, 0, 0.15)";

		// 🔴 REVERT POINT: Consoldated Stability Synchronizer
		// PREVIOUS: Multiple scattered useEffects fighting over snapIndex
		// NEW: Single effect that respects mode-specific constraints and defers to native side
		// REVERT TO: The multiple useEffects from previous version (lines 216-243 and 290-302)
		useEffect(() => {
			if (!bottomSheetRef.current || snapPoints.length === 0) return;

			const maxIdx = snapPoints.length - 1;

			// Determing target index based on constraints
			let targetIdx = newSnapIndex;
			if (isDetailMode) {
				targetIdx = 0;
			} else if (hasAnyVisitActive && snapPoints.length === 1) {
				targetIdx = 0;
			} else {
				// Global clamp based on current component's snap points
				targetIdx = Math.min(Math.max(0, newSnapIndex), maxIdx);
			}

			// Don't snap if we are already there to avoid recursion/fighting
			if (currentSnapIndex === targetIdx) return;

			// Use a small delay to ensure snapPoints prop has reached native side
			const timer = setTimeout(() => {
				try {
					if (bottomSheetRef.current) {
						// console.log('[EmergencyBottomSheet] Stability Sync:', { targetIdx, maxIdx, points: snapPoints.length });
						bottomSheetRef.current.snapToIndex(targetIdx);
					}
				} catch (error) {
					console.warn('[EmergencyBottomSheet] Safe snap failed:', error?.message);
				}
			}, 1);
			return () => clearTimeout(timer);
		}, [newSnapIndex, snapPoints.length, isDetailMode, hasAnyVisitActive, currentSnapIndex]);

		const renderHandle = useCallback(
			() => (
				<EmergencySheetHandle
					gradientColors={gradientColors}
					handleColor={handleColor}
					styles={styles}
				/>
			),
			[gradientColors, handleColor]
		);

		const renderBackground = useCallback(
			(props) => (
				<EmergencySheetBackground
					gradientColors={gradientColors}
					styles={styles}
					sheetStyle={props.style}
				/>
			),
			[gradientColors]
		);

		// 🔴 REVERT POINT: Derived Index Sync
		// PREVIOUS: initialIndex was only calculated on mount/memo
		// NEW: derivedIndex is calculated every render and passed to the 'index' prop
		// to ensure it never deviates from what the native component can handle.
		//
		// CRITICAL: This MUST return a valid index for the CURRENT snapPoints array.
		// The snapPoints.length check is the primary safety mechanism - all other
		// conditions are secondary. This prevents the "index out of range" error
		// that occurs during mode transitions (e.g., from 3 snap points to 1).
		const derivedIndex = useMemo(() => {
			// Primary safety: always clamp to valid range based on current snapPoints
			const maxIdx = Math.max(0, snapPoints.length - 1);

			// For detail mode or single snap point scenarios, always use index 0
			if (isDetailMode || snapPoints.length <= 1) {
				return 0;
			}

			// For trip/bed booking mode with 2 snap points, clamp appropriately
			if (hasAnyVisitActive && snapPoints.length === 2) {
				return Math.min(newSnapIndex, 1);
			}

			// Standard mode: clamp the global context index to the current snap points range
			return Math.min(Math.max(0, newSnapIndex), maxIdx);
		}, [isDetailMode, hasAnyVisitActive, newSnapIndex, snapPoints.length, snapPoints]);


		// Track sheet phase changes using currentSnapIndex
		useEffect(() => {
			if (snapPoints.length <= 1) {
				setSheetPhase("half");
				return;
			}

			if (snapPoints.length === 2) {
				const phase = (currentSnapIndex || 0) <= 0 ? "collapsed" : "full";
				setSheetPhase(phase);
				return;
			}

			const phase =
				(currentSnapIndex || 0) <= 0
					? "collapsed"
					: (currentSnapIndex || 0) === 1
						? "half"
						: "full";
			setSheetPhase(phase);
		}, [currentSnapIndex, snapPoints.length, isDetailMode]);

		return (
			<BottomSheet
				ref={bottomSheetRef}
				index={derivedIndex}
				snapPoints={snapPoints}
				onChange={handleSheetChange}
				handleComponent={renderHandle}
				backgroundComponent={renderBackground}
				style={[
					styles.sheet,
					(isFloating || isBelowHalf) && { marginHorizontal: 0 }
				]}
				enablePanDownToClose={false}
				enableOverDrag={true}
				enableHandlePanningGesture={!selectedHospital}
				enableContentPanningGesture={!selectedHospital}
				keyboardBehavior="extend"
				keyboardBlurBehavior="restore"
				animateOnMount={false}
				safeAreaInsets={{ top: 0, bottom: 0, left: 0, right: 0 }}
			>
				{isDetailMode ? (
					<BottomSheetView style={[styles.scrollContent, { paddingBottom: 0 }]}>
						<HospitalDetailView
							hospital={selectedHospital}
							onClose={onCloseFocus}
							onCall={() => {
								if (selectedHospital?.id) onHospitalCall(selectedHospital.id);
							}}
							mode={mode}
						/>
					</BottomSheetView>
				) : (
					<BottomSheetScrollView
						ref={listScrollRef}
						contentContainerStyle={[
							styles.scrollContent,
							{
								paddingBottom: isTripMode || isBedBookingMode ? 0 : TAB_BAR_HEIGHT,
								paddingHorizontal: isTripMode || isBedBookingMode ? 0 : 12,
								paddingTop: isTripMode || isBedBookingMode ? 0 : 8,
								flexGrow:
									(isTripMode || isBedBookingMode) && sheetPhase === "full"
										? 1
										: undefined,
							},
						]}
						showsVerticalScrollIndicator={false}
						scrollEventThrottle={16}
						onScroll={handleScroll}
						keyboardShouldPersistTaps="handled"
					>
						{isTripMode ? (
							<TripSummaryCard
								activeAmbulanceTrip={activeAmbulanceTrip}
								hasOtherActiveVisit={!!activeBedBooking?.requestId}
								allHospitals={allHospitals}
								onCancelAmbulanceTrip={onCancelAmbulanceTrip}
								onMarkAmbulanceArrived={onMarkAmbulanceArrived}
								onCompleteAmbulanceTrip={onCompleteAmbulanceTrip}
								isDarkMode={isDarkMode}
								isCollapsed={sheetPhase === "collapsed"}
								isExpanded={sheetPhase === "full"}
								sheetPhase={sheetPhase}
							/>
						) : isBedBookingMode ? (
							<BedBookingSummaryCard
								activeBedBooking={activeBedBooking}
								hasOtherActiveVisit={!!activeAmbulanceTrip?.requestId}
								allHospitals={allHospitals}
								onCancelBedBooking={onCancelBedBooking}
								onMarkBedOccupied={onMarkBedOccupied}
								onCompleteBedBooking={onCompleteBedBooking}
								isDarkMode={isDarkMode}
								isCollapsed={sheetPhase === "collapsed"}
								isExpanded={sheetPhase === "full"}
								sheetPhase={sheetPhase}
							/>
						) : (
							<EmergencySheetTopRow
								searchValue={localSearchQuery}
								onSearchChange={handleSearchChange}
								onSearchFocus={handleSearchFocus}
								onSearchBlur={handleSearchBlur}
								onSearchClear={handleSearchClear}
								placeholder={
									mode === "emergency"
										? "Search ambulance services..."
										: "Search hospitals, specialties..."
								}
								avatarSource={
									user?.imageUri
										? { uri: user.imageUri }
										: require("../../assets/profile.jpg")
								}
								onAvatarPress={handleAvatarPress}
								showProfileModal={showProfileModal}
								onCloseProfileModal={closeProfileModal}
							/>
						)}

						{!isTripMode && !isBedBookingMode && (
							<EmergencySheetFilters
								visible={sheetPhase !== "collapsed"}
								mode={mode}
								serviceType={serviceType}
								selectedSpecialty={selectedSpecialty}
								specialties={specialties}
								serviceTypeCounts={serviceTypeCounts}
								specialtyCounts={specialtyCounts}
								onServiceTypeSelect={onServiceTypeSelect}
								onSpecialtySelect={onSpecialtySelect}
								styles={styles}
							/>
						)}

						{!isTripMode && !isBedBookingMode && (
							<EmergencySheetSectionHeader
								visible={sheetPhase !== "collapsed"}
								mode={mode}
								searchQuery={localSearchQuery}
								hospitalsCount={hospitals.length}
								hasActiveFilters={hasActiveFilters}
								onReset={() => {
									clearSearch();
									if (onSearch) onSearch("");
									if (onResetFilters) onResetFilters();
								}}
								textMuted={isDarkMode ? "#94A3B8" : "#64748B"}
								styles={styles}
							/>
						)}

						{!isTripMode && !isBedBookingMode && (
							<EmergencySheetHospitalList
								visible={sheetPhase !== "collapsed"}
								hospitals={hospitals}
								selectedHospitalId={selectedHospital?.id}
								onHospitalSelect={onHospitalSelect}
								onHospitalCall={onHospitalCall}
								mode={mode}
							/>
						)}
					</BottomSheetScrollView>
				)}
			</BottomSheet>
		);
	}
);

const styles = StyleSheet.create({
	sheet: {
		zIndex: 1000,
		elevation: 1000,
	},
	sheetBackground: {
		borderTopLeftRadius: 36,
		borderTopRightRadius: 36,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -6 },
		shadowOpacity: 0.12,
		shadowRadius: 20,
		elevation: 20,
	},
	handleContainer: {
		paddingTop: 8,
		paddingBottom: 0,
		alignItems: "center",
		borderTopLeftRadius: 48,
		borderTopRightRadius: 48,
	},
	handle: {
		width: 40,
		height: 5,
		borderRadius: 3,
	},
	scrollContent: {
		paddingHorizontal: 12,
		paddingTop: 8,
	},
	sectionHeader: {
		fontSize: 10,
		fontWeight: "900",
		letterSpacing: 2,
		marginBottom: 14,
		textTransform: "uppercase",
	},
	headerWithReset: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 8,
		marginBottom: 8,
	},
	resetButton: {
		fontSize: 10,
		fontWeight: "500",
		letterSpacing: 1,
		textTransform: "uppercase",
	},
});

EmergencyBottomSheet.displayName = "EmergencyBottomSheet";

export default EmergencyBottomSheet;

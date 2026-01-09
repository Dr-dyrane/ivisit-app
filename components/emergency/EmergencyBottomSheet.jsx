import React, {
	useCallback,
	useMemo,
	forwardRef,
	useRef,
	useImperativeHandle,
	useEffect,
} from "react";
import {
	View,
	StyleSheet,
	Keyboard,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
	BottomSheetView,
	BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useEmergencyUI } from "../../contexts/EmergencyUIContext";
import { COLORS } from "../../constants/colors";

const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 85 : 70;

import HospitalDetailView from "./HospitalDetailView";
import EmergencySheetHandle from "./bottomSheet/EmergencySheetHandle";
import EmergencySheetBackground from "./bottomSheet/EmergencySheetBackground";
import EmergencySheetTopRow from "./bottomSheet/EmergencySheetTopRow";
import EmergencySheetFilters from "./bottomSheet/EmergencySheetFilters";
import EmergencySheetSectionHeader from "./bottomSheet/EmergencySheetSectionHeader";
import EmergencySheetHospitalList from "./bottomSheet/EmergencySheetHospitalList";

import { useEmergencySheetController } from "../../hooks/useEmergencySheetController";

/**
 * EmergencyBottomSheet - Apple Maps style draggable bottom sheet
 *
 * Features:
 * - Smart search bar (visible when collapsed)
 * - Three snap points: collapsed (15%), half (50%), expanded (92%)
 * - Service/specialty selector as filter chips
 * - Scrollable hospital list with scroll-aware header/tab bar hiding
 * - Gradient background (matching Welcome/Onboarding screens)
 * - Works with tab bar and FAB
 *
 * Uses EmergencyUIContext for state management and animation tracking
 */
const EmergencyBottomSheet = forwardRef(
	(
		{
			mode = "emergency",
			serviceType,
			selectedSpecialty,
			specialties = [],
			hospitals = [],
			selectedHospital,
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
		const insets = useSafeAreaInsets();
		
		const isDetailMode = !!selectedHospital;

		const {
			handleScroll: handleTabBarScroll,
			resetTabBar,
			hideTabBar,
		} = useTabBarVisibility();
		const { handleScroll: handleHeaderScroll, resetHeader } =
			useScrollAwareHeader();

		// Use EmergencyUI context for state management
		const {
			handleSnapChange: updateSnapIndex,
			searchQuery: localSearchQuery,
			updateSearch,
			clearSearch,
			showProfileModal,
			openProfileModal,
			closeProfileModal,
			updateScrollPosition,
			getLastScrollY,
			timing,
		} = useEmergencyUI();

		const bottomSheetRef = useRef(null);
		const listScrollRef = useRef(null);

		// Handle avatar press - tracked
		const handleAvatarPress = useCallback(() => {
			timing.startTiming("avatar_press");
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
			openProfileModal();
			timing.endTiming("avatar_press");
		}, [openProfileModal, timing]);

		// Use the dedicated controller for sheet behavior
		const {
			snapPoints,
			animationConfigs,
			currentSnapIndex,
		} = useEmergencySheetController({
			isDetailMode,
			onSnapChange,
		});

		useEffect(() => {
			if (isDetailMode) {
				hideTabBar();
			} else {
				resetTabBar();
			}
		}, [hideTabBar, isDetailMode, resetTabBar]);

		// Expose snap index and ref methods to parent
		useImperativeHandle(ref, () => ({
			snapToIndex: (index) => bottomSheetRef.current?.snapToIndex(index),
			expand: () => bottomSheetRef.current?.expand(),
			collapse: () => bottomSheetRef.current?.collapse(),
			getCurrentSnapIndex: () => currentSnapIndex,
			scrollTo: (y, animated = true) =>
				listScrollRef.current?.scrollTo?.({ y, animated }),
			restoreListState: (state = {}) => {
				const snapIndex = state?.snapIndex;
				const scrollY = state?.scrollY;
				if (typeof snapIndex === "number") {
					updateSnapIndex(snapIndex, "restore");
				}
				if (typeof scrollY === "number") {
					setTimeout(() => {
						listScrollRef.current?.scrollTo?.({ y: scrollY, animated: true });
					}, 380);
				}
			},
		}));

		// Gradient background colors
		const gradientColors = isDarkMode
			? ["#121826", "#121826", "#121826"]
			: ["#FFFFFF", "#ffffff", "#ffffff"];

		const handleColor = isDarkMode
			? "rgba(255, 255, 255, 0.3)"
			: "rgba(0, 0, 0, 0.15)";
		const textMuted = isDarkMode ? "#94A3B8" : "#64748B";

		// Handle search input change - tracked
		const handleSearchChange = useCallback(
			(text) => {
				updateSearch(text);
				if (onSearch) onSearch(text);
			},
			[onSearch, updateSearch]
		);

		// Handle search focus - expand sheet to show results
		const handleSearchFocus = useCallback(() => {
			if (currentSnapIndex === 0) {
				bottomSheetRef.current?.snapToIndex(1);
			}
		}, [currentSnapIndex]);

		// Handle search clear
		const handleSearchClear = useCallback(() => {
			clearSearch();
			if (onSearch) onSearch("");
			Keyboard.dismiss();
		}, [onSearch, clearSearch]);

		// Handle sheet changes
		const handleSheetChange = useCallback(
			(index) => {
				updateSnapIndex(index, "sheet");

				if (index >= 0) {
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
				}

				if (onSnapChange) onSnapChange(index);

				if (isDetailMode) {
					hideTabBar();
					return;
				}

				if (index === 0) {
					resetTabBar();
					resetHeader();
					updateScrollPosition(0);
					Keyboard.dismiss();
				}

				if (index === 2) {
					hideTabBar();
				}
			},
			[
				hideTabBar,
				isDetailMode,
				resetTabBar,
				resetHeader,
				onSnapChange,
				updateSnapIndex,
				updateScrollPosition,
			]
		);

		// Handle scroll events - optimized with context tracking
		const handleScroll = useCallback(
			(event) => {
				const currentY = event.nativeEvent?.contentOffset?.y || 0;
				const lastY = getLastScrollY();
				const diff = currentY - lastY;

				if (currentSnapIndex >= 1) {
					const amplifiedY = lastY + diff * 2;
					const syntheticEvent = {
						nativeEvent: { contentOffset: { y: Math.max(0, amplifiedY) } },
					};
					handleTabBarScroll(syntheticEvent);
					handleHeaderScroll(syntheticEvent);
				}

				updateScrollPosition(currentY);
			},
			[
				handleTabBarScroll,
				handleHeaderScroll,
				currentSnapIndex,
				getLastScrollY,
				updateScrollPosition,
			]
		);

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

		const safeIndex = isDetailMode
			? 0
			: Math.min(
					Math.max(0, Number.isFinite(currentSnapIndex) ? currentSnapIndex : 0),
					Math.max(0, snapPoints.length - 1)
				);

		return (
			<BottomSheet
				ref={bottomSheetRef}
				index={safeIndex}
				snapPoints={snapPoints}
				onChange={handleSheetChange}
				handleComponent={renderHandle}
				backgroundComponent={renderBackground}
				style={styles.sheet}
				enablePanDownToClose={false}
				enableOverDrag={true}
				animateOnMount={true}
				animationConfigs={animationConfigs}
				safeAreaInsets={{ top: 0, bottom: 0, left: 0, right: 0 }}
			>
				{isDetailMode ? (
					<BottomSheetView
						style={[styles.scrollContent, { paddingBottom: 0 }]}
					>
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
							{ paddingBottom: TAB_BAR_HEIGHT },
						]}
						showsVerticalScrollIndicator={false}
						scrollEventThrottle={16}
						onScroll={handleScroll}
						keyboardShouldPersistTaps="handled"
					>
						<EmergencySheetTopRow
							searchValue={localSearchQuery}
							onSearchChange={handleSearchChange}
							onSearchFocus={handleSearchFocus}
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

						<EmergencySheetFilters
							visible={currentSnapIndex > 0}
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

						<EmergencySheetSectionHeader
							visible={currentSnapIndex > 0}
							mode={mode}
							searchQuery={localSearchQuery}
							hospitalsCount={hospitals.length}
							hasActiveFilters={hasActiveFilters}
							onReset={() => {
								clearSearch();
								if (onSearch) onSearch("");
								if (onResetFilters) onResetFilters();
							}}
							textMuted={textMuted}
							styles={styles}
						/>

						<EmergencySheetHospitalList
							visible={currentSnapIndex > 0}
							hospitals={hospitals}
							selectedHospitalId={selectedHospital?.id}
							onHospitalSelect={onHospitalSelect}
							onHospitalCall={onHospitalCall}
							mode={mode}
						/>
					</BottomSheetScrollView>
				)}
			</BottomSheet>
		);
	}
);

const styles = StyleSheet.create({
	sheet: {
		zIndex: 100,
		elevation: 100,
	},
	sheetBackground: {
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -6 },
		shadowOpacity: 0.12,
		shadowRadius: 20,
		elevation: 20,
	},
	handleContainer: {
		paddingTop: 14,
		paddingBottom: 8,
		alignItems: "center",
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
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
	selectorContainer: {
		marginBottom: 24,
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
		marginBottom: 14,
	},
	resetButton: {
		fontSize: 10,
		fontWeight: "700",
		letterSpacing: 1,
		textTransform: "uppercase",
	},
	// detailContainer & detailHeader removed as they are now in HospitalDetailView
});

EmergencyBottomSheet.displayName = "EmergencyBottomSheet";

export default EmergencyBottomSheet;

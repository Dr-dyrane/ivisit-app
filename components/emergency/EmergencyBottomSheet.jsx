import React, { useCallback, useMemo, forwardRef, useRef, useImperativeHandle } from "react";
import { View, Text, StyleSheet, Keyboard, Image, Pressable, Dimensions, Platform } from "react-native";
import BottomSheet, { BottomSheetScrollView, useBottomSheetSpringConfigs } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useEmergencyUI } from "../../contexts/EmergencyUIContext";
import { COLORS } from "../../constants/colors";

// Tab bar height matching AnimatedTabBar.jsx
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 70;

import EmergencySearchBar from "./EmergencySearchBar";
import ServiceTypeSelector from "./ServiceTypeSelector";
import SpecialtySelector from "./SpecialtySelector";
import HospitalCard from "./HospitalCard";
import Call911Card from "./Call911Card";
import MiniProfileModal from "./MiniProfileModal";

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
const EmergencyBottomSheet = forwardRef(({
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
}, ref) => {
	const { isDarkMode } = useTheme();
	const { user } = useAuth();
	const insets = useSafeAreaInsets();
	const {
		handleScroll: handleTabBarScroll,
		resetTabBar,
		hideTabBar,
	} = useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();

	// Use EmergencyUI context for state management
	const {
		snapIndex: currentSnapIndex,
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

	// Handle avatar press - tracked
	const handleAvatarPress = useCallback(() => {
		timing.startTiming("avatar_press");
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		openProfileModal();
		timing.endTiming("avatar_press");
	}, [openProfileModal, timing]);

	// Expose snap index and ref methods to parent
	useImperativeHandle(ref, () => ({
		snapToIndex: (index) => bottomSheetRef.current?.snapToIndex(index),
		expand: () => bottomSheetRef.current?.expand(),
		collapse: () => bottomSheetRef.current?.collapse(),
		getCurrentSnapIndex: () => currentSnapIndex,
	}));

	// Calculate collapsed snap point to stay above tab bar
	// Tab bar height + bottom inset + search bar area (~120px for handle + search bar + padding)
	const screenHeight = Dimensions.get('window').height;
	const searchBarArea = 120; // Handle (20) + search bar (50) + padding (50)
	const marginAboveTabBar = 16; // Extra buffer to keep above tab bar
	const collapsedHeight = TAB_BAR_HEIGHT + insets.bottom + searchBarArea + marginAboveTabBar;
	const collapsedPercent = Math.round((collapsedHeight / screenHeight) * 100);

	// Snap points: collapsed (above tab bar), half, expanded
	const snapPoints = useMemo(() => [
		`${Math.max(15, collapsedPercent)}%`, // Minimum 15%, or calculated height
		"50%",
		"92%"
	], [collapsedPercent]);

	// Spring animation config - slower, smoother transitions
	const animationConfigs = useBottomSheetSpringConfigs({
		damping: 80,              // Higher = less bounce, smoother feel
		stiffness: 200,           // Lower = slower, more deliberate response
		mass: 1.2,                // Higher = heavier, slower feel
		overshootClamping: true,  // No overshoot for smooth, controlled snap
		restDisplacementThreshold: 0.1,
		restSpeedThreshold: 0.1,
	});

	// Gradient background colors
	const gradientColors = isDarkMode
		? ["#121826", "#121826", "#121826"]
		: ["#FFFFFF", "#ffffff", "#ffffff"];

	const handleColor = isDarkMode ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.15)";
	const textMuted = isDarkMode ? "#94A3B8" : "#64748B";

	// Handle search input change - tracked
	const handleSearchChange = useCallback((text) => {
		updateSearch(text);
		if (onSearch) onSearch(text);
	}, [onSearch, updateSearch]);

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
	const handleSheetChange = useCallback((index) => {
		updateSnapIndex(index, "sheet");

		if (index >= 0) {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		}

		if (onSnapChange) onSnapChange(index);

		if (index === 0) {
			resetTabBar();
			resetHeader();
			updateScrollPosition(0);
			Keyboard.dismiss();
		}

		if (index === 2) {
			hideTabBar();
		}
	}, [resetTabBar, resetHeader, hideTabBar, onSnapChange, updateSnapIndex, updateScrollPosition]);

	// Handle scroll events - optimized with context tracking
	const handleScroll = useCallback((event) => {
		const currentY = event.nativeEvent?.contentOffset?.y || 0;
		const lastY = getLastScrollY();
		const diff = currentY - lastY;

		if (currentSnapIndex >= 1) {
			const amplifiedY = lastY + (diff * 2);
			const syntheticEvent = {
				nativeEvent: { contentOffset: { y: Math.max(0, amplifiedY) } },
			};
			handleTabBarScroll(syntheticEvent);
			handleHeaderScroll(syntheticEvent);
		}

		updateScrollPosition(currentY);
	}, [handleTabBarScroll, handleHeaderScroll, currentSnapIndex, getLastScrollY, updateScrollPosition]);

	// Custom handle component - seamless with content
	const renderHandle = useCallback(() => (
		<LinearGradient
			colors={gradientColors}
			style={styles.handleContainer}
		>
			<View style={[styles.handle, { backgroundColor: handleColor }]} />
		</LinearGradient>
	), [gradientColors, handleColor]);

	// Custom background with gradient - matches Welcome/Auth screens
	const renderBackground = useCallback((props) => (
		<LinearGradient
			colors={gradientColors}
			style={[props.style, styles.sheetBackground]}
		/>
	), [gradientColors]);

	return (
		<BottomSheet
			ref={bottomSheetRef}
			index={1}
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
			{/* Scrollable Content */}
			<BottomSheetScrollView
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: TAB_BAR_HEIGHT },
				]}
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
				onScroll={handleScroll}
				keyboardShouldPersistTaps="handled"
			>
				{/* Search Bar + Avatar (4:1 grid-like ratio) */}
				<View style={{ flexDirection: "row", alignItems: "flex-start" }}>
					<EmergencySearchBar
						value={localSearchQuery}
						onChangeText={handleSearchChange}
						onFocus={handleSearchFocus}
						onClear={handleSearchClear}
						placeholder={
							mode === "emergency"
								? "Search ambulance services..."
								: "Search hospitals, specialties..."
						}
						style={{ flex: 1 }}
					/>
					<Pressable
						onPress={handleAvatarPress}
						style={({ pressed }) => ({
							width: 52,
							height: 52,
							marginLeft: 10,
							alignItems: "center",
							justifyContent: "center",
							transform: [{ scale: pressed ? 0.95 : 1 }],
						})}
					>
						<Image
							source={
								user?.imageUri
									? { uri: user.imageUri }
									: require("../../assets/profile.jpg")
							}
							style={{
								width: 48,
								height: 48,
								borderRadius: 24,
								borderWidth: 2,
								borderColor: COLORS.brandPrimary,
							}}
						/>
					</Pressable>
				</View>

				{/* Mini Profile Modal */}
				<MiniProfileModal
					visible={showProfileModal}
					onClose={closeProfileModal}
				/>

				{/* Service Type or Specialty Selector - Acts as filters */}
				{currentSnapIndex > 0 && (
					<View style={styles.selectorContainer}>
						{mode === "emergency" ? (
							<ServiceTypeSelector
								selectedType={serviceType}
								onSelect={onServiceTypeSelect}
								counts={serviceTypeCounts}
							/>
						) : (
							<SpecialtySelector
								specialties={specialties}
								selectedSpecialty={selectedSpecialty}
								onSelect={onSpecialtySelect}
								counts={specialtyCounts}
							/>
						)}
					</View>
				)}

				{/* Section Header with Search Results Info and Reset Button */}
				{currentSnapIndex > 0 && (
					<View style={styles.headerWithReset}>
						<Text style={[styles.sectionHeader, { color: textMuted }]}>
							{localSearchQuery.trim()
								? `SEARCH RESULTS (${hospitals.length})`
								: `${mode === "emergency" ? "NEARBY SERVICES" : "AVAILABLE BEDS"} (${hospitals.length})`
							}
						</Text>
						{hasActiveFilters && (
							<Pressable
								onPress={() => {
									Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
									if (onResetFilters) onResetFilters();
								}}
								style={({ pressed }) => ({
									opacity: pressed ? 0.6 : 1,
								})}
							>
								<Text style={[styles.resetButton, { color: COLORS.brandPrimary }]}>
									RESET
								</Text>
							</Pressable>
						)}
					</View>
				)}

				{/* Hospital List or 911 Fallback - Only visible when not collapsed */}
				{currentSnapIndex > 0 && (
					hospitals.length > 0 ? (
						hospitals.map((hospital) => (
							<HospitalCard
								key={hospital.id}
								hospital={hospital}
								isSelected={selectedHospital?.id === hospital.id}
								onSelect={() => onHospitalSelect(hospital)}
								onCall={() => onHospitalCall(hospital.id)}
								mode={mode}
							/>
						))
					) : (
						<Call911Card
							message={
								mode === "emergency"
									? "No ambulance services found nearby. For immediate assistance, call 911."
									: "No hospitals with available beds found. For urgent care, call 911."
							}
						/>
					)
				)}
			</BottomSheetScrollView>
		</BottomSheet>
	);
});

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
});

EmergencyBottomSheet.displayName = "EmergencyBottomSheet";

export default EmergencyBottomSheet;


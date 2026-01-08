import React, { useCallback, useMemo, useState, forwardRef, useRef, useImperativeHandle } from "react";
import { View, Text, StyleSheet, Keyboard, Image, Pressable } from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { COLORS } from "../../constants/colors";

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
 */
const EmergencyBottomSheet = forwardRef(({
	mode = "emergency",
	serviceType,
	selectedSpecialty,
	specialties = [],
	hospitals = [],
	selectedHospital,
	onServiceTypeSelect,
	onSpecialtySelect,
	onHospitalSelect,
	onHospitalCall,
	onSnapChange,
	onSearch,
	searchQuery = "",
	tabBarHeight = 85,
}, ref) => {
	const { isDarkMode } = useTheme();
	const { user } = useAuth();
	const { handleScroll: handleTabBarScroll, resetTabBar, hideTabBar } = useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();

	// Track last scroll position for proper direction detection
	const lastScrollY = useRef(0);
	const bottomSheetRef = useRef(null);

	// Track current snap point index
	const [currentSnapIndex, setCurrentSnapIndex] = useState(1);

	// Local search state (will sync with parent)
	const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

	// Mini profile modal state
	const [showProfileModal, setShowProfileModal] = useState(false);

	// Handle avatar press
	const handleAvatarPress = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		setShowProfileModal(true);
	}, []);

	// Expose snap index and ref methods to parent
	useImperativeHandle(ref, () => ({
		snapToIndex: (index) => bottomSheetRef.current?.snapToIndex(index),
		expand: () => bottomSheetRef.current?.expand(),
		collapse: () => bottomSheetRef.current?.collapse(),
		getCurrentSnapIndex: () => currentSnapIndex,
	}));

	// Snap points: collapsed (search only), half, expanded
	// 15% = just enough for search bar + handle
	const snapPoints = useMemo(() => ["15%", "50%", "92%"], []);

	// Gradient background colors - EXACT match with Welcome/Onboarding screens
	const gradientColors = isDarkMode
		? ["#121826", "#121826", "#121826"] // Solid dark for seamless look
		: ["#FFFFFF", "#ffffff", "#ffffff"]; // Match Welcome screen exactly

	const handleColor = isDarkMode ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.15)";
	const textMuted = isDarkMode ? "#94A3B8" : "#64748B";

	// Handle search input change
	const handleSearchChange = useCallback((text) => {
		setLocalSearchQuery(text);
		if (onSearch) onSearch(text);
	}, [onSearch]);

	// Handle search focus - expand sheet to show results
	const handleSearchFocus = useCallback(() => {
		if (currentSnapIndex === 0) {
			bottomSheetRef.current?.snapToIndex(1);
		}
	}, [currentSnapIndex]);

	// Handle search clear
	const handleSearchClear = useCallback(() => {
		setLocalSearchQuery("");
		if (onSearch) onSearch("");
		Keyboard.dismiss();
	}, [onSearch]);

	// Handle sheet changes for haptic feedback and tracking
	const handleSheetChange = useCallback((index) => {
		setCurrentSnapIndex(index);
		if (index >= 0) {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		}
		// Notify parent of snap changes
		if (onSnapChange) {
			onSnapChange(index);
		}
		// Reset header and tab bar when collapsing (going to smallest snap point)
		if (index === 0) {
			resetTabBar();
			resetHeader();
			lastScrollY.current = 0;
			Keyboard.dismiss(); // Dismiss keyboard when collapsing
		}
		// Hide tab bar when fully expanded to allow sheet to fill space
		if (index === 2) {
			hideTabBar();
		}
	}, [resetTabBar, resetHeader, hideTabBar, onSnapChange]);

	// Handle scroll events - propagate to header and tab bar contexts
	// Uses multiplier for more sensitive hide/show response in bottom sheet
	const handleScroll = useCallback((event) => {
		const currentY = event.nativeEvent?.contentOffset?.y || 0;
		const diff = currentY - lastScrollY.current;

		// Only trigger hide/show when sheet is at half or expanded snap point
		if (currentSnapIndex >= 1) {
			// Apply 2x multiplier for more sensitive response in bottom sheet
			// This makes the header/tab bar respond faster to small scrolls
			const amplifiedY = lastScrollY.current + (diff * 2);

			const syntheticEvent = {
				nativeEvent: {
					contentOffset: {
						y: Math.max(0, amplifiedY),
					},
				},
			};
			handleTabBarScroll(syntheticEvent);
			handleHeaderScroll(syntheticEvent);
		}

		lastScrollY.current = currentY;
	}, [handleTabBarScroll, handleHeaderScroll, currentSnapIndex]);

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
			bottomInset={currentSnapIndex === 2 ? 0 : tabBarHeight}
		>
			{/* Scrollable Content */}
			<BottomSheetScrollView
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: 60 },
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
					onClose={() => setShowProfileModal(false)}
				/>

				{/* Service Type or Specialty Selector - Acts as filters */}
				{currentSnapIndex > 0 && (
					<View style={styles.selectorContainer}>
						{mode === "emergency" ? (
							<ServiceTypeSelector
								selectedType={serviceType}
								onSelect={onServiceTypeSelect}
							/>
						) : (
							<SpecialtySelector
								specialties={specialties}
								selectedSpecialty={selectedSpecialty}
								onSelect={onSpecialtySelect}
							/>
						)}
					</View>
				)}

				{/* Section Header with Search Results Info */}
				{currentSnapIndex > 0 && (
					<Text style={[styles.sectionHeader, { color: textMuted }]}>
						{localSearchQuery.trim()
							? `SEARCH RESULTS (${hospitals.length})`
							: `${mode === "emergency" ? "NEARBY SERVICES" : "AVAILABLE BEDS"} (${hospitals.length})`
						}
					</Text>
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
});

EmergencyBottomSheet.displayName = "EmergencyBottomSheet";

export default EmergencyBottomSheet;


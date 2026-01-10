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
	View,
	Text,
	StyleSheet,
	Keyboard,
	Platform,
	Pressable,
	Linking,
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
import { TripSummaryCard } from "./bottomSheet/TripSummaryCard";
import { BedBookingSummaryCard } from "./bottomSheet/BedBookingSummaryCard";

import { useBottomSheetSnap } from "../../hooks/emergency/useBottomSheetSnap";
import { useBottomSheetScroll } from "../../hooks/emergency/useBottomSheetScroll";
import { useBottomSheetSearch } from "../../hooks/emergency/useBottomSheetSearch";

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
			onCompleteAmbulanceTrip,
			activeBedBooking = null,
			onCancelBedBooking,
			onCompleteBedBooking,
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
		const isTripMode = mode === "emergency" && !!activeAmbulanceTrip && !isDetailMode;
		const isBedBookingMode = mode === "booking" && !!activeBedBooking && !isDetailMode;
		const [nowMs, setNowMs] = useState(Date.now());

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
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
			openProfileModal();
			timing.endTiming("avatar_press");
		}, [openProfileModal, timing]);

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
					bottomSheetRef.current?.snapToIndex(snapIndex);
				}
				if (typeof scrollY === "number") {
					setTimeout(() => {
						listScrollRef.current?.scrollTo?.({ y: scrollY, animated: true });
					}, 380);
				}
			},
		}));

		const gradientColors = isDarkMode
			? ["#121826", "#121826", "#121826"]
			: ["#FFFFFF", "#ffffff", "#ffffff"];

		const handleColor = isDarkMode
			? "rgba(255, 255, 255, 0.3)"
			: "rgba(0, 0, 0, 0.15)";

		useEffect(() => {
			if (!isTripMode && !isBedBookingMode) return;
			const id = setInterval(() => setNowMs(Date.now()), 1000);
			return () => clearInterval(id);
		}, [isBedBookingMode, isTripMode]);

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
				keyboardBehavior="extend"
				keyboardBlurBehavior="restore"
				animateOnMount={true}
				animationConfigs={animationConfigs}
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
							{ paddingBottom: isTripMode || isBedBookingMode ? 0 : TAB_BAR_HEIGHT },
						]}
						showsVerticalScrollIndicator={false}
						scrollEventThrottle={16}
						onScroll={handleScroll}
						keyboardShouldPersistTaps="handled"
					>
						{isTripMode ? (
							<TripSummaryCard
								activeAmbulanceTrip={activeAmbulanceTrip}
								allHospitals={allHospitals}
								onCancelAmbulanceTrip={onCancelAmbulanceTrip}
								onCompleteAmbulanceTrip={onCompleteAmbulanceTrip}
								isDarkMode={isDarkMode}
								isCollapsed={currentSnapIndex === 0}
								nowMs={nowMs}
							/>
						) : isBedBookingMode ? (
							<BedBookingSummaryCard
								activeBedBooking={activeBedBooking}
								allHospitals={allHospitals}
								onCancelBedBooking={onCancelBedBooking}
								onCompleteBedBooking={onCompleteBedBooking}
								isDarkMode={isDarkMode}
								isCollapsed={currentSnapIndex === 0}
								nowMs={nowMs}
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
						)}

						{!isTripMode && !isBedBookingMode && (
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
								textMuted={isDarkMode ? "#94A3B8" : "#64748B"}
								styles={styles}
							/>
						)}

						{!isTripMode && !isBedBookingMode && (
							<EmergencySheetHospitalList
								visible={currentSnapIndex > 0}
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
		fontWeight: "500",
		letterSpacing: 1,
		textTransform: "uppercase",
	},
});

EmergencyBottomSheet.displayName = "EmergencyBottomSheet";

export default EmergencyBottomSheet;

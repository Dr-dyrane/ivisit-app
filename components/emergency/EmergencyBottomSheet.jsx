import {
	useCallback,
	forwardRef,
	useImperativeHandle,
} from "react";
import {
	Platform,
} from "react-native";
import BottomSheet, {
	BottomSheetView,
	BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import HospitalDetailView from "./HospitalDetailView";
import EmergencySheetHandle from "./bottomSheet/EmergencySheetHandle";
import EmergencySheetBackground from "./bottomSheet/EmergencySheetBackground";
import EmergencySheetTopRow from "./bottomSheet/EmergencySheetTopRow";
import EmergencySheetFilters from "./bottomSheet/EmergencySheetFilters";
import EmergencySheetSectionHeader from "./bottomSheet/EmergencySheetSectionHeader";
import EmergencySheetHospitalList from "./bottomSheet/EmergencySheetHospitalList";
import { TripSummaryCard } from "./bottomSheet/TripSummaryCard";
import { BedBookingSummaryCard } from "./bottomSheet/BedBookingSummaryCard";

import { styles } from "./EmergencyBottomSheet.styles";
import { useEmergencyBottomSheetLogic } from "../../hooks/emergency/useEmergencyBottomSheetLogic";

const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 85 : 70;

const EmergencyBottomSheet = forwardRef(
	(props, ref) => {
		const {
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
			serviceTypeCounts = {},
			specialtyCounts = {},
			hasActiveFilters = false,
			onServiceTypeSelect,
			onSpecialtySelect,
			onHospitalSelect,
			onHospitalCall,
			onResetFilters,
			onCloseFocus,
            onSearch
		} = props;

		const { state, actions } = useEmergencyBottomSheetLogic(props);
		const {
			bottomSheetRef,
			listScrollRef,
			snapPoints,
			derivedIndex,
			sheetPhase,
			localSearchQuery,
			showProfileModal,
			isDetailMode,
			isTripMode,
			isBedBookingMode,
            isBelowHalf,
            isFloating
		} = state;

		const {
			handleSheetChange,
			handleScroll,
			handleSearchChange,
			handleSearchFocus,
			handleSearchBlur,
			handleSearchClear,
			handleAvatarPress,
			snapToIndex,
			expand,
			collapse,
			getCurrentSnapIndex,
			scrollTo,
			restoreListState,
			closeProfileModal,
            clearSearch
		} = actions;

		const { isDarkMode } = useTheme();
		const { user } = useAuth();

		useImperativeHandle(ref, () => ({
			snapToIndex,
			expand,
			collapse,
			getCurrentSnapIndex,
			scrollTo,
			restoreListState,
		}));

		const gradientColors = isDarkMode
			? ["rgba(18, 24, 38, 0.95)", "rgba(18, 24, 38, 0.85)", "rgba(18, 24, 38, 0.85)"]
			: ["rgba(255, 255, 255, 0.95)", "rgba(255, 255, 255, 0.85)", "rgba(255, 255, 255, 0.85)"];

		const handleColor = isDarkMode
			? "rgba(255, 255, 255, 0.3)"
			: "rgba(0, 0, 0, 0.15)";

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
			(bgProps) => (
				<EmergencySheetBackground
					gradientColors={gradientColors}
					styles={styles}
					sheetStyle={bgProps.style}
				/>
			),
			[gradientColors]
		);

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
						{isTripMode && (
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
						)}
						{isBedBookingMode && (
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
						)}
						{!isTripMode && !isBedBookingMode && (
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

EmergencyBottomSheet.displayName = "EmergencyBottomSheet";

export default EmergencyBottomSheet;

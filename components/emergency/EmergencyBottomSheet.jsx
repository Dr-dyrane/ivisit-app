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
import {
	runOnJS,
	useAnimatedReaction,
	useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { usePreferences } from "../../contexts/PreferencesContext";
import { useEmergencyUI } from "../../contexts/EmergencyUIContext";
import { COLORS } from "../../constants/colors";
import { AMBULANCE_TYPES } from "../../constants/emergency";
import HospitalDetailView from "./HospitalDetailView";
import EmergencySheetHandle from "./bottomSheet/EmergencySheetHandle";
import EmergencySheetBackground from "./bottomSheet/EmergencySheetBackground";
import EmergencySheetTopRow from "./bottomSheet/EmergencySheetTopRow";
import EmergencySheetFilters from "./bottomSheet/EmergencySheetFilters";
import EmergencySheetSectionHeader from "./bottomSheet/EmergencySheetSectionHeader";
import EmergencySheetHospitalList from "./bottomSheet/EmergencySheetHospitalList";
import { TripSummaryCard } from "./bottomSheet/TripSummaryCard";
import { BedBookingSummaryCard } from "./bottomSheet/BedBookingSummaryCard";

import EmergencyRequestModalHeader from "./requestModal/EmergencyRequestModalHeader";
import AmbulanceTypeCard from "./requestModal/AmbulanceTypeCard";
import EmergencyRequestModalFooter from "./requestModal/EmergencyRequestModalFooter";
import EmergencyRequestModalDispatched from "./requestModal/EmergencyRequestModalDispatched";
import InfoTile from "./requestModal/InfoTile";
import BedBookingOptions from "./requestModal/BedBookingOptions";
import RequestAmbulanceFAB from "./RequestAmbulanceFAB";
import RequestBedFAB from "./requestModal/RequestBedFAB";

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
			isRequestMode = false,
			requestHospital = null,
			onRequestClose,
			onRequestComplete,
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
		const { preferences } = usePreferences();
		const insets = useSafeAreaInsets();

		const isRequestFlowActive = !!isRequestMode && !!requestHospital;
		const isDetailMode = !!selectedHospital && !isRequestFlowActive;
		const isTripMode =
			mode === "emergency" && !!activeAmbulanceTrip && !isDetailMode && !isRequestFlowActive;
		const isBedBookingMode =
			mode === "booking" && !!activeBedBooking && !isDetailMode && !isRequestFlowActive;
		const [nowMs, setNowMs] = useState(Date.now());
		const [sheetPhase, setSheetPhase] = useState("half");
		const [requestStep, setRequestStep] = useState("select");
		const [selectedAmbulanceType, setSelectedAmbulanceType] = useState(null);
		const [bedType, setBedType] = useState("standard");
		const [bedCount, setBedCount] = useState(1);
		const [isRequesting, setIsRequesting] = useState(false);
		const [requestData, setRequestData] = useState(null);

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
		const isInitializedRef = useRef(false);

		const { snapPoints, animationConfigs, currentSnapIndex, handleSheetChange } =
			useBottomSheetSnap({
				isDetailMode,
				isTripMode,
				isBedBookingMode,
				isRequestMode: isRequestFlowActive && requestHospital, // Only true when both mode and hospital are set
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

		useEffect(() => {
			if (!isRequestFlowActive) return;
			setRequestStep("select");
			setSelectedAmbulanceType(null);
			setBedType("standard");
			setBedCount(1);
			setIsRequesting(false);
			setRequestData(null);
		}, [isRequestFlowActive, requestHospital?.id]);

		useEffect(() => {
			if (!isRequestFlowActive) return;
			const id = setTimeout(() => {
				bottomSheetRef.current?.snapToIndex(1); // Snap to middle position (60%) for semi-full
			}, 80);
			return () => clearTimeout(id);
		}, [isRequestFlowActive]);

		const clampSheetIndex = useCallback(
			(index) => {
				const max = Math.max(0, snapPoints.length - 1);
				if (!Number.isFinite(index)) return 0;
				return Math.min(Math.max(index, -1), max);
			},
			[snapPoints.length]
		);

		const requestColors = useMemo(
			() => ({
				card: isDarkMode ? "#121826" : "#FFFFFF",
				text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
				textMuted: isDarkMode ? "rgba(255,255,255,0.70)" : "rgba(15,23,42,0.55)",
			}),
			[isDarkMode]
		);

		const handleRequestDone = useCallback(() => {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			onRequestClose?.();
		}, [onRequestClose]);

		const handleSubmitRequest = useCallback(() => {
			if (isRequesting) return;
			if (!requestHospital) return;
			if (mode === "emergency" && !selectedAmbulanceType) return;

			setIsRequesting(true);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

			setTimeout(() => {
				const hospitalName = requestHospital?.name ?? "Hospital";
				const waitTime = requestHospital?.waitTime ?? null;
				const hospitalEta = requestHospital?.eta ?? null;
				const ambulanceEta =
					(typeof hospitalEta === "string" && hospitalEta.length > 0 ? hospitalEta : null) ??
					"8 mins";

				const next =
					mode === "booking"
						? {
								success: true,
								requestId: `BED-${Math.floor(Math.random() * 900000) + 100000}`,
								estimatedArrival: waitTime ?? "15 mins",
								hospitalName,
								serviceType: "bed",
								specialty: selectedSpecialty ?? "Any",
								bedCount,
								bedType,
								bedNumber: `B-${Math.floor(Math.random() * 90) + 10}`,
						  }
						: {
								success: true,
								requestId: `AMB-${Math.floor(Math.random() * 900000) + 100000}`,
								hospitalName,
								ambulanceType: selectedAmbulanceType,
								serviceType: "ambulance",
								estimatedArrival: ambulanceEta,
						  };

				setRequestData(next);
				setRequestStep("dispatched");
				setIsRequesting(false);
				if (typeof onRequestComplete === "function") {
					onRequestComplete(next);
				}
			}, 900);
		}, [
			bedCount,
			bedType,
			isRequesting,
			mode,
			onRequestComplete,
			requestHospital,
			selectedAmbulanceType,
			selectedSpecialty,
		]);

		const renderRequestFlow = useCallback(() => {
			const hospitalName = requestHospital?.name ?? "Hospital";
			const availableBeds =
				typeof requestHospital?.availableBeds === "number"
					? requestHospital.availableBeds
					: Number.isFinite(Number(requestHospital?.availableBeds))
						? Number(requestHospital.availableBeds)
						: null;
			const waitTime = requestHospital?.waitTime ?? null;

			return (
				<View style={{ flex: 1 }}>
					{/* Close button in top right */}
					<Pressable
						onPress={handleRequestDone}
						style={[
							styles.closeButton,
							{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
						]}
						hitSlop={16}
					>
						<Ionicons
							name="close"
							size={24}
							color={isDarkMode ? COLORS.textLight : COLORS.textPrimary}
						/>
					</Pressable>

					<BottomSheetScrollView
						style={{ flex: 1 }}
						contentContainerStyle={styles.requestScrollContent}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
					>
						{requestStep === "select" ? (
							<>
								<Text
									style={{
										fontSize: 12,
										fontWeight: "900",
										letterSpacing: 1.6,
										color: requestColors.text,
										marginTop: 18,
										marginBottom: 14,
										textTransform: "uppercase",
									}}
								>
									{mode === "booking"
										? "Reservation details"
										: "Select ambulance type"}
								</Text>

								{mode === "booking" ? (
									<>
										<View style={styles.infoGrid}>
											<InfoTile
												label="Hospital"
												value={hospitalName}
												textColor={requestColors.text}
												mutedColor={requestColors.textMuted}
												cardColor={requestColors.card}
												icon="business-outline"
											/>
											<InfoTile
												label="Specialty"
												value={selectedSpecialty ?? "Any"}
												textColor={requestColors.text}
												mutedColor={requestColors.textMuted}
												cardColor={requestColors.card}
												icon="medical-outline"
											/>
											<InfoTile
												label="Available"
												value={
													Number.isFinite(availableBeds)
														? `${availableBeds} beds`
														: "--"
												}
												textColor={requestColors.text}
												mutedColor={requestColors.textMuted}
												cardColor={requestColors.card}
												icon="bed-outline"
											/>
											<InfoTile
												label="Est. wait"
												value={waitTime ?? "--"}
												textColor={requestColors.text}
												mutedColor={requestColors.textMuted}
												cardColor={requestColors.card}
												valueColor={COLORS.brandPrimary}
												icon="time-outline"
											/>
										</View>

										<BedBookingOptions
											bedType={bedType}
											bedCount={bedCount}
											onBedTypeChange={(next) => {
												setBedType(next);
											}}
											onBedCountChange={(next) => {
												setBedCount(next);
											}}
											textColor={requestColors.text}
											mutedColor={requestColors.textMuted}
											cardColor={requestColors.card}
										/>

										{/* Bed booking FAB */}
										<RequestBedFAB
											onPress={handleSubmitRequest}
											isLoading={isRequesting}
											isActive={true}
											bedType={bedType}
											bedCount={bedCount}
										/>
									</>
								) : (
									<View style={styles.ambulanceSelectionContainer}>
										{AMBULANCE_TYPES.map((type, index) => (
											<AmbulanceTypeCard
												key={type.id}
												type={type}
												selected={selectedAmbulanceType?.id === type.id}
												onPress={() => setSelectedAmbulanceType(type)}
												textColor={requestColors.text}
												mutedColor={requestColors.textMuted}
												cardColor={requestColors.card}
												style={styles.ambulanceCard}
											/>
										))}
									</View>
								)}

							{/* Add FAB for ambulance request - only show when ambulance type is selected - v2 */}
							{mode === "emergency" && selectedAmbulanceType && (
								<RequestAmbulanceFAB
									onPress={handleSubmitRequest}
									isLoading={isRequesting}
									isActive={!!selectedAmbulanceType}
									selectedAmbulanceType={selectedAmbulanceType}
								/>
							)}
						</>
					) : (
						<>
							<EmergencyRequestModalDispatched
								requestData={requestData}
								textColor={requestColors.text}
								mutedColor={requestColors.textMuted}
								cardColor={requestColors.card}
							/>
							
							{/* Reusable FAB for tracking state */}
							{mode === "booking" ? (
								<RequestBedFAB
									onPress={handleRequestDone}
									isLoading={false}
									isActive={true}
									bedType={requestData?.bedType || "standard"}
									bedCount={requestData?.bedCount || 1}
									mode="dispatched"
									requestData={requestData}
								/>
							) : (
								<RequestAmbulanceFAB
									onPress={handleRequestDone}
									isLoading={false}
									isActive={true}
									selectedAmbulanceType={null}
									mode="dispatched"
									requestData={requestData}
								/>
							)}
						</>
					)}
				</BottomSheetScrollView>
				</View>
			);
		}, [
			bedCount,
			bedType,
			handleRequestDone,
			handleSubmitRequest,
			isDarkMode,
			isRequesting,
			mode,
			preferences?.privacyShareEmergencyContacts,
			preferences?.privacyShareMedicalProfile,
			requestColors.card,
			requestColors.text,
			requestColors.textMuted,
			requestHospital,
			requestStep,
			selectedAmbulanceType,
			selectedSpecialty,
		]);

		useImperativeHandle(ref, () => ({
			snapToIndex: (index) => bottomSheetRef.current?.snapToIndex(clampSheetIndex(index)),
			expand: () => bottomSheetRef.current?.expand(),
			collapse: () => bottomSheetRef.current?.collapse(),
			getCurrentSnapIndex: () => currentSnapIndex,
			scrollTo: (y, animated = true) =>
				listScrollRef.current?.scrollTo?.({ y, animated }),
			restoreListState: (state = {}) => {
				const snapIndex = state?.snapIndex;
				const scrollY = state?.scrollY;
				if (typeof snapIndex === "number") {
					bottomSheetRef.current?.snapToIndex(clampSheetIndex(snapIndex));
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

		// Use current snap index for initial position, with fallbacks
		const initialIndex = useMemo(() => {
			const index = isDetailMode 
				? 0 
				: isRequestFlowActive 
					? 1 // Open to middle position (60%) for semi-full request mode
					: (Number.isFinite(currentSnapIndex) && currentSnapIndex >= 0 && currentSnapIndex < snapPoints.length 
						? currentSnapIndex 
						: 1); // Default to halfway
			
			// Only log initial calculation once and mark as initialized
			if (!isInitializedRef.current) {
				console.log('[EmergencyBottomSheet] Initial calculation:', {
					isDetailMode,
					isRequestFlowActive,
					currentSnapIndex,
					snapPointsLength: snapPoints.length,
					snapPoints,
					calculatedInitialIndex: index,
					timestamp: Date.now()
				});
				isInitializedRef.current = true;
			}
			
			return index;
		}, [isDetailMode, isRequestFlowActive, currentSnapIndex, snapPoints.length]);

		const getPhaseFromAnimatedIndex = (value) => {
			"worklet";
			if (!Number.isFinite(value)) return "half";
			
			// Better phase detection aligned with actual snap points
			// Index 0 = collapsed, 1 = half, 2 = expanded
			if (value < 0.5) return "collapsed";
			if (value < 1.5) return "half";
			return "full";
		};

		// Track sheet phase changes using currentSnapIndex
		useEffect(() => {
			const phase = currentSnapIndex === 0 ? "collapsed" : currentSnapIndex === 1 ? "half" : "full";
			console.log('[EmergencyBottomSheet] Sheet phase changed:', {
				currentSnapIndex,
				phase,
				timestamp: Date.now()
			});
			setSheetPhase(phase);
		}, [currentSnapIndex]);

		// Lock sheet to halfway when hospital is selected
		useEffect(() => {
			if (selectedHospital && !isRequestFlowActive) {
				console.log('[EmergencyBottomSheet] Hospital selected, locking to halfway');
				// Force sheet to halfway position
				if (bottomSheetRef.current && currentSnapIndex !== 1) {
					setTimeout(() => {
						bottomSheetRef.current?.snapToIndex(1);
					}, 100);
				}
			}
		}, [selectedHospital, currentSnapIndex, isRequestFlowActive]);

		// Lock sheet to limited range in dispatched state (tracking ambulance)
		useEffect(() => {
			if (isTripMode && isRequestFlowActive) {
				console.log('[EmergencyBottomSheet] Ambulance dispatched, limiting sheet movement');
				// Force sheet to middle position (index 1) in dispatched state
				if (bottomSheetRef.current && currentSnapIndex !== 1) {
					setTimeout(() => {
						bottomSheetRef.current?.snapToIndex(1);
					}, 100);
				}
			}
		}, [isTripMode, isRequestFlowActive, currentSnapIndex]);

		// Prevent sheet from leaving allowed positions
		const handleSheetChangeWithLock = useCallback((index) => {
			// If hospital is selected and we're not in request mode, lock to halfway
			if (selectedHospital && !isRequestFlowActive && index !== 1) {
				console.log('[EmergencyBottomSheet] Preventing sheet move, locking to halfway:', {
					attemptedIndex: index,
					forcedIndex: 1
				});
				// Force back to halfway
				setTimeout(() => {
					bottomSheetRef.current?.snapToIndex(1);
				}, 50);
				return;
			}

			// If in dispatched state (tracking ambulance), lock to middle position
			if (isTripMode && isRequestFlowActive && index !== 1) {
				console.log('[EmergencyBottomSheet] Preventing sheet move during tracking:', {
					attemptedIndex: index,
					forcedIndex: 1
				});
				// Force back to middle
				setTimeout(() => {
					bottomSheetRef.current?.snapToIndex(1);
				}, 50);
				return;
			}
			
			// Allow normal behavior
			handleSheetChange(index);
		}, [selectedHospital, isRequestFlowActive, isTripMode, handleSheetChange]);

		return (
			<BottomSheet
				ref={bottomSheetRef}
				index={initialIndex}
				snapPoints={snapPoints}
				onChange={handleSheetChangeWithLock}
				handleComponent={renderHandle}
				backgroundComponent={renderBackground}
				style={styles.sheet}
				enablePanDownToClose={false}
				enableOverDrag={true}
				enableHandlePanningGesture={!selectedHospital && !isRequestFlowActive}
				enableContentPanningGesture={!selectedHospital && !isRequestFlowActive}
				keyboardBehavior="extend"
				keyboardBlurBehavior="restore"
				animateOnMount={true}
				animationConfigs={animationConfigs}
				safeAreaInsets={{ top: 0, bottom: 0, left: 0, right: 0 }}
			>
				{isRequestFlowActive ? (
					<BottomSheetView style={[styles.scrollContent, { paddingBottom: 120, flex: 1 }]}>
						{renderRequestFlow()}
					</BottomSheetView>
				) : isDetailMode ? (
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
								paddingBottom: isRequestFlowActive ? 120 : (isTripMode || isBedBookingMode ? 0 : TAB_BAR_HEIGHT),
								paddingHorizontal: isRequestFlowActive ? 0 : (isTripMode || isBedBookingMode ? 0 : 12),
								paddingTop: isRequestFlowActive ? 0 : (isTripMode || isBedBookingMode ? 0 : 8),
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
								allHospitals={allHospitals}
								onCancelAmbulanceTrip={onCancelAmbulanceTrip}
								onCompleteAmbulanceTrip={onCompleteAmbulanceTrip}
								isDarkMode={isDarkMode}
								isCollapsed={sheetPhase === "collapsed"}
								isExpanded={sheetPhase === "full"}
								sheetPhase={sheetPhase}
								nowMs={nowMs}
							/>
						) : isBedBookingMode ? (
							<BedBookingSummaryCard
								activeBedBooking={activeBedBooking}
								allHospitals={allHospitals}
								onCancelBedBooking={onCancelBedBooking}
								onCompleteBedBooking={onCompleteBedBooking}
								isDarkMode={isDarkMode}
								isCollapsed={sheetPhase === "collapsed"}
								isExpanded={sheetPhase === "full"}
								sheetPhase={sheetPhase}
								nowMs={nowMs}
							/>
						) : !isRequestFlowActive && (
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

						{!isTripMode && !isBedBookingMode && !isRequestFlowActive && (
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

						{!isTripMode && !isBedBookingMode && !isRequestFlowActive && (
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

						{!isTripMode && !isBedBookingMode && !isRequestFlowActive && (
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
		zIndex: 1000, // Increased z-index to appear above map features
		elevation: 1000,
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
	closeButton: {
		position: 'absolute',
		top: 20,
		right: 24,
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 1000,
	},
	requestStatusHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingTop: 20,
		paddingBottom: 16,
	},
	statusText: {
		fontSize: 18,
		fontWeight: '800',
		color: COLORS.brandPrimary,
		letterSpacing: -0.3,
	},
	requestHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingTop: 16,
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(0,0,0,0.08)',
		backgroundColor: 'transparent',
	},
	requestScrollContent: {
		paddingHorizontal: 8, // Reduced from 24
		paddingTop: 12, // Reduced from 20
		paddingBottom: 120, // Reduced space for FAB
	},
	infoGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		marginBottom: 12, // Reduced from 16
		gap: 8, // Reduced from 12
	},
	ambulanceSelectionContainer: {
		width: '100%',
		gap: 12, // Reduced from 12
		marginTop: 8, // Reduced from 8
	},
	selectionHelper: {
		fontSize: 13,
		fontWeight: '600',
		marginBottom: 12,
		textAlign: 'center',
		fontStyle: 'italic',
	},
	ambulanceCard: {
		marginBottom: 8, // Reduced from 0 to add some spacing
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

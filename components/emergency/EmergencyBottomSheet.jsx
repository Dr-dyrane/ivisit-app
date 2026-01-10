import React, {
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
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useEmergencyUI } from "../../contexts/EmergencyUIContext";
import { COLORS } from "../../constants/colors";
import { AMBULANCE_STATUSES } from "../../constants/emergency";

const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 85 : 70;

import HospitalDetailView from "./HospitalDetailView";
import EmergencySheetHandle from "./bottomSheet/EmergencySheetHandle";
import EmergencySheetBackground from "./bottomSheet/EmergencySheetBackground";
import EmergencySheetTopRow from "./bottomSheet/EmergencySheetTopRow";
import EmergencySheetFilters from "./bottomSheet/EmergencySheetFilters";
import EmergencySheetSectionHeader from "./bottomSheet/EmergencySheetSectionHeader";
import EmergencySheetHospitalList from "./bottomSheet/EmergencySheetHospitalList";

import { useEmergencySheetController } from "../../hooks/emergency/useEmergencySheetController";

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
			handleScroll: handleTabBarScroll,
			resetTabBar,
			hideTabBar,
		} = useTabBarVisibility();
		const {
			handleScroll: handleHeaderScroll,
			resetHeader,
			hideHeader,
			showHeader,
			lockHeaderHidden,
			unlockHeaderHidden,
		} = useScrollAwareHeader();

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
			if (isDetailMode || isTripMode || isBedBookingMode) {
				hideTabBar();
			} else {
				resetTabBar();
			}
		}, [hideTabBar, isBedBookingMode, isDetailMode, isTripMode, resetTabBar]);

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
			lockHeaderHidden();
			hideHeader();
			bottomSheetRef.current?.snapToIndex(2);
		}, [hideHeader, lockHeaderHidden]);

		const handleSearchBlur = useCallback(() => {
			unlockHeaderHidden();
			showHeader();
		}, [showHeader, unlockHeaderHidden]);

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

				if (isTripMode) {
					hideTabBar();
					resetHeader();
					return;
				}

				if (isBedBookingMode) {
					hideTabBar();
					resetHeader();
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
				isTripMode,
				isBedBookingMode,
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

		const assigned = activeAmbulanceTrip?.assignedAmbulance ?? null;
		const tripHospital =
			activeAmbulanceTrip?.hospitalId && Array.isArray(allHospitals)
				? allHospitals.find((h) => h?.id === activeAmbulanceTrip.hospitalId) ?? null
				: null;
		const bookingHospital =
			activeBedBooking?.hospitalId && Array.isArray(allHospitals)
				? allHospitals.find((h) => h?.id === activeBedBooking.hospitalId) ?? null
				: null;
		const statusMeta = assigned?.status ? AMBULANCE_STATUSES[assigned.status] : null;

		useEffect(() => {
			if (!isTripMode && !isBedBookingMode) return;
			const id = setInterval(() => setNowMs(Date.now()), 1000);
			return () => clearInterval(id);
		}, [isBedBookingMode, isTripMode]);

		const remainingSeconds = useMemo(() => {
			const eta = activeAmbulanceTrip?.etaSeconds;
			const startedAt = activeAmbulanceTrip?.startedAt;
			if (!Number.isFinite(eta) || !Number.isFinite(startedAt)) return null;
			const elapsedSec = (nowMs - startedAt) / 1000;
			return Math.max(0, Math.round(eta - elapsedSec));
		}, [activeAmbulanceTrip?.etaSeconds, activeAmbulanceTrip?.startedAt, nowMs]);

		const tripProgress = useMemo(() => {
			const eta = activeAmbulanceTrip?.etaSeconds;
			const startedAt = activeAmbulanceTrip?.startedAt;
			if (!Number.isFinite(eta) || eta <= 0 || !Number.isFinite(startedAt)) return null;
			const elapsedSec = (nowMs - startedAt) / 1000;
			return Math.min(1, Math.max(0, elapsedSec / eta));
		}, [activeAmbulanceTrip?.etaSeconds, activeAmbulanceTrip?.startedAt, nowMs]);

		const computedStatus = useMemo(() => {
			if (!Number.isFinite(tripProgress)) return "En Route";
			if (tripProgress >= 1) return "Arrived";
			if (tripProgress < 0.2) return "Dispatched";
			if (tripProgress < 0.85) return "En Route";
			return "Arriving";
		}, [tripProgress]);

		const formattedRemaining = useMemo(() => {
			if (!Number.isFinite(remainingSeconds)) return null;
			const mins = Math.floor(remainingSeconds / 60);
			const secs = remainingSeconds % 60;
			if (mins <= 0) return `${secs}s`;
			return secs === 0 ? `${mins} min` : `${mins}m ${secs}s`;
		}, [remainingSeconds]);

		const remainingBedSeconds = useMemo(() => {
			const eta = activeBedBooking?.etaSeconds;
			const startedAt = activeBedBooking?.startedAt;
			if (!Number.isFinite(eta) || !Number.isFinite(startedAt)) return null;
			const elapsedSec = (nowMs - startedAt) / 1000;
			return Math.max(0, Math.round(eta - elapsedSec));
		}, [activeBedBooking?.etaSeconds, activeBedBooking?.startedAt, nowMs]);

		const bedProgress = useMemo(() => {
			const eta = activeBedBooking?.etaSeconds;
			const startedAt = activeBedBooking?.startedAt;
			if (!Number.isFinite(eta) || eta <= 0 || !Number.isFinite(startedAt)) return null;
			const elapsedSec = (nowMs - startedAt) / 1000;
			return Math.min(1, Math.max(0, elapsedSec / eta));
		}, [activeBedBooking?.etaSeconds, activeBedBooking?.startedAt, nowMs]);

		const bedStatus = useMemo(() => {
			if (!Number.isFinite(bedProgress)) return "Waiting";
			if (bedProgress >= 1) return "Ready";
			if (bedProgress < 0.15) return "Reserved";
			return "Waiting";
		}, [bedProgress]);

		const formattedBedRemaining = useMemo(() => {
			if (!Number.isFinite(remainingBedSeconds)) return null;
			const mins = Math.floor(remainingBedSeconds / 60);
			const secs = remainingBedSeconds % 60;
			if (mins <= 0) return `${secs}s`;
			return secs === 0 ? `${mins} min` : `${mins}m ${secs}s`;
		}, [remainingBedSeconds]);

		const normalizePhone = useCallback((value) => {
			if (!value || typeof value !== "string") return null;
			const trimmed = value.trim();
			if (!trimmed) return null;
			if (trimmed.startsWith("+")) {
				const plusDigits = `+${trimmed.slice(1).replace(/[^\d]/g, "")}`;
				return plusDigits.length > 1 ? plusDigits : null;
			}
			const digits = trimmed.replace(/[^\d]/g, "");
			return digits ? digits : null;
		}, []);

		const callTarget = useMemo(() => {
			const phoneRaw = (isTripMode ? tripHospital?.phone : bookingHospital?.phone) ?? null;
			const normalized = normalizePhone(phoneRaw);
			return normalized ? `tel:${normalized}` : null;
		}, [bookingHospital?.phone, isTripMode, normalizePhone, tripHospital?.phone]);

		const smsTarget = useMemo(() => {
			const phoneRaw = (isTripMode ? tripHospital?.phone : bookingHospital?.phone) ?? null;
			const normalized = normalizePhone(phoneRaw);
			return normalized ? `sms:${normalized}` : null;
		}, [bookingHospital?.phone, isTripMode, normalizePhone, tripHospital?.phone]);

		const renderTripSummary = useCallback(() => {
			const isCollapsed = currentSnapIndex === 0;
			const etaText =
				formattedRemaining ??
				activeAmbulanceTrip?.estimatedArrival ??
				(Number.isFinite(activeAmbulanceTrip?.etaSeconds)
					? `${Math.round(activeAmbulanceTrip.etaSeconds / 60)} mins`
					: "--");
			const callSign = assigned?.callSign ?? "--";
			const vehicle = assigned?.vehicleNumber ?? "--";
			const rating = Number.isFinite(assigned?.rating) ? assigned.rating.toFixed(1) : "--";
			const statusLabel = computedStatus ?? statusMeta?.label ?? "En Route";
			const driverName =
				Array.isArray(assigned?.crew) && assigned.crew.length > 0
					? assigned.crew[0]
					: callSign;

			return (
				<View
					style={[
						styles.tripCard,
						{
							backgroundColor: isDarkMode ? "#121826" : "#FFFFFF",
							borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
						},
					]}
				>
					<View style={styles.tripHeaderRow}>
						<View style={{ flex: 1 }}>
							<Text
								style={[
									styles.tripTitle,
									{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
								]}
							>
								Ambulance en route
							</Text>
							<Text
								style={[
									styles.tripSubtitle,
									{
										color: isDarkMode
											? "rgba(255,255,255,0.72)"
											: "rgba(15,23,42,0.60)",
									},
								]}
							>
								ETA {etaText} • {statusLabel}
							</Text>
						</View>
						<View style={styles.tripBadge}>
							<Ionicons name="star" size={14} color={COLORS.brandPrimary} />
							<Text
								style={[
									styles.tripBadgeText,
									{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
								]}
							>
								{rating}
							</Text>
						</View>
					</View>

					{Number.isFinite(tripProgress) && (
						<View style={styles.tripStepsRow}>
							<View style={styles.tripStep}>
								<View
									style={[
										styles.tripStepDot,
										{
											backgroundColor:
												tripProgress >= 0 ? COLORS.brandPrimary : "rgba(148,163,184,0.5)",
										},
									]}
								/>
								<Text
									style={[
										styles.tripStepLabel,
										{
											color: isDarkMode
												? "rgba(255,255,255,0.70)"
												: "rgba(15,23,42,0.60)",
										},
									]}
								>
									Dispatched
								</Text>
							</View>
							<View style={styles.tripStepLine} />
							<View style={styles.tripStep}>
								<View
									style={[
										styles.tripStepDot,
										{
											backgroundColor:
												tripProgress >= 0.2 ? COLORS.brandPrimary : "rgba(148,163,184,0.5)",
										},
									]}
								/>
								<Text
									style={[
										styles.tripStepLabel,
										{
											color: isDarkMode
												? "rgba(255,255,255,0.70)"
												: "rgba(15,23,42,0.60)",
										},
									]}
								>
									En route
								</Text>
							</View>
							<View style={styles.tripStepLine} />
							<View style={styles.tripStep}>
								<View
									style={[
										styles.tripStepDot,
										{
											backgroundColor:
												tripProgress >= 0.85 ? COLORS.brandPrimary : "rgba(148,163,184,0.5)",
										},
									]}
								/>
								<Text
									style={[
										styles.tripStepLabel,
										{
											color: isDarkMode
												? "rgba(255,255,255,0.70)"
												: "rgba(15,23,42,0.60)",
										},
									]}
								>
									Arriving
								</Text>
							</View>
						</View>
					)}

					<View
						style={[
							styles.tripMetaRow,
							{
								backgroundColor: isDarkMode
									? "rgba(255,255,255,0.06)"
									: "rgba(15,23,42,0.04)",
							},
						]}
					>
						<View style={styles.tripMetaItem}>
							<Text
								style={[
									styles.tripMetaLabel,
									{
										color: isDarkMode
											? "rgba(255,255,255,0.55)"
											: "rgba(15,23,42,0.55)",
									},
								]}
							>
								Driver
							</Text>
							<Text
								style={[
									styles.tripMetaValue,
									{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
								]}
							>
								{driverName}
							</Text>
						</View>
						<View
							style={[
								styles.tripMetaDivider,
								{
									backgroundColor: isDarkMode
										? "rgba(255,255,255,0.10)"
										: "rgba(15,23,42,0.08)",
								},
							]}
						/>
						<View style={styles.tripMetaItem}>
							<Text
								style={[
									styles.tripMetaLabel,
									{
										color: isDarkMode
											? "rgba(255,255,255,0.55)"
											: "rgba(15,23,42,0.55)",
									},
								]}
							>
								Vehicle
							</Text>
							<Text
								style={[
									styles.tripMetaValue,
									{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
								]}
							>
								{vehicle}
							</Text>
						</View>
					</View>

					{!isCollapsed && (
						<View style={styles.tripDetails}>
							<Text
								style={[
									styles.tripSectionTitle,
									{
										color: isDarkMode
											? "rgba(255,255,255,0.70)"
											: "rgba(15,23,42,0.60)",
									},
								]}
							>
								Crew
							</Text>
							{Array.isArray(assigned?.crew) && assigned.crew.length > 0 ? (
								assigned.crew.map((m) => (
									<Text
										key={m}
										style={[
											styles.tripCrewItem,
											{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
										]}
										numberOfLines={1}
									>
										{m}
									</Text>
								))
							) : (
								<Text
									style={[
										styles.tripCrewItem,
										{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
									]}
								>
									--
								</Text>
							)}

							<View style={styles.tripActionsRow}>
								<View style={styles.tripQuickActions}>
									<Pressable
										disabled={!callTarget}
										onPress={() => {
											if (!callTarget) return;
											Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
											Linking.openURL(callTarget);
										}}
										style={({ pressed }) => [
											styles.tripActionButton,
											{
												backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
												opacity: callTarget ? 1 : 0.5,
												transform: [{ scale: pressed ? 0.98 : 1 }],
											},
										]}
									>
										<Ionicons name="call" size={18} color={COLORS.brandPrimary} />
										<Text style={[styles.tripActionText, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>
											Call
										</Text>
									</Pressable>
									<Pressable
										disabled={!smsTarget}
										onPress={() => {
											if (!smsTarget) return;
											Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
											Linking.openURL(smsTarget);
										}}
										style={({ pressed }) => [
											styles.tripActionButton,
											{
												backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
												opacity: smsTarget ? 1 : 0.5,
												transform: [{ scale: pressed ? 0.98 : 1 }],
											},
										]}
									>
										<Ionicons name="chatbubble" size={18} color={COLORS.brandPrimary} />
										<Text style={[styles.tripActionText, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>
											Message
										</Text>
									</Pressable>
								</View>

								<View style={styles.tripQuickActions}>
									<Pressable
										onPress={() => {
											Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
											onCancelAmbulanceTrip?.();
										}}
										style={({ pressed }) => [
											styles.tripCancelButton,
											{
												backgroundColor: isDarkMode
													? "rgba(239,68,68,0.16)"
													: "rgba(239,68,68,0.10)",
												transform: [{ scale: pressed ? 0.98 : 1 }],
												flex: 1,
											},
										]}
									>
										<Text style={styles.tripCancelText}>Cancel request</Text>
									</Pressable>

									<Pressable
										onPress={() => {
											Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
											onCompleteAmbulanceTrip?.();
										}}
										style={({ pressed }) => [
											styles.tripCancelButton,
											{
												backgroundColor: isDarkMode
													? "rgba(16,185,129,0.16)"
													: "rgba(16,185,129,0.12)",
												transform: [{ scale: pressed ? 0.98 : 1 }],
												flex: 1,
											},
										]}
									>
										<Text
											style={[
												styles.tripCancelText,
												{ color: "#10B981" },
											]}
										>
											Mark complete
										</Text>
									</Pressable>
								</View>
								</View>
						</View>
					)}
				</View>
			);
		}, [
			assigned?.callSign,
			assigned?.crew,
			assigned?.rating,
			assigned?.vehicleNumber,
			activeAmbulanceTrip?.estimatedArrival,
			activeAmbulanceTrip?.etaSeconds,
			callTarget,
			computedStatus,
			currentSnapIndex,
			formattedRemaining,
			isDarkMode,
			onCancelAmbulanceTrip,
			onCompleteAmbulanceTrip,
			smsTarget,
			statusMeta?.label,
			tripProgress,
		]);

		const renderBedSummary = useCallback(() => {
			const isCollapsed = currentSnapIndex === 0;
			const etaText =
				formattedBedRemaining ??
				activeBedBooking?.estimatedWait ??
				(Number.isFinite(activeBedBooking?.etaSeconds)
					? `${Math.round(activeBedBooking.etaSeconds / 60)} mins`
					: "--");
			const statusLabel = bedStatus ?? "Waiting";
			const title = statusLabel === "Ready" ? "Bed ready" : "Bed reserved";

			const bedNumber = activeBedBooking?.bedNumber ?? "--";
			const bedType = activeBedBooking?.bedType ?? "--";
			const bedCount = Number.isFinite(activeBedBooking?.bedCount)
				? String(activeBedBooking.bedCount)
				: "--";
			const specialty = activeBedBooking?.specialty ?? "--";
			const hospitalName =
				activeBedBooking?.hospitalName ?? bookingHospital?.name ?? "Hospital";
			const bookingId = activeBedBooking?.bookingId ?? "--";

			return (
				<View
					style={[
						styles.tripCard,
						{
							backgroundColor: isDarkMode ? "#121826" : "#FFFFFF",
							borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
						},
					]}
				>
					<View style={styles.tripHeaderRow}>
						<View style={{ flex: 1 }}>
							<Text
								style={[
									styles.tripTitle,
									{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
								]}
							>
								{title}
							</Text>
							<Text
								style={[
									styles.tripSubtitle,
									{
										color: isDarkMode
											? "rgba(255,255,255,0.72)"
											: "rgba(15,23,42,0.60)",
									},
								]}
							>
								Wait {etaText} • {statusLabel}
							</Text>
						</View>
						<View style={styles.tripBadge}>
							<Ionicons name="bed" size={14} color={COLORS.brandPrimary} />
							<Text
								style={[
									styles.tripBadgeText,
									{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
								]}
							>
								{bedNumber}
							</Text>
						</View>
					</View>

					{Number.isFinite(bedProgress) && (
						<View style={styles.tripStepsRow}>
							<View style={styles.tripStep}>
								<View
									style={[
										styles.tripStepDot,
										{
											backgroundColor:
												bedProgress >= 0 ? COLORS.brandPrimary : "rgba(148,163,184,0.5)",
										},
									]}
								/>
								<Text
									style={[
										styles.tripStepLabel,
										{
											color: isDarkMode
												? "rgba(255,255,255,0.70)"
												: "rgba(15,23,42,0.60)",
										},
									]}
								>
									Reserved
								</Text>
							</View>
							<View style={styles.tripStepLine} />
							<View style={styles.tripStep}>
								<View
									style={[
										styles.tripStepDot,
										{
											backgroundColor:
												bedProgress >= 0.15 ? COLORS.brandPrimary : "rgba(148,163,184,0.5)",
										},
									]}
								/>
								<Text
									style={[
										styles.tripStepLabel,
										{
											color: isDarkMode
												? "rgba(255,255,255,0.70)"
												: "rgba(15,23,42,0.60)",
										},
									]}
								>
									Waiting
								</Text>
							</View>
							<View style={styles.tripStepLine} />
							<View style={styles.tripStep}>
								<View
									style={[
										styles.tripStepDot,
										{
											backgroundColor:
												bedProgress >= 1 ? COLORS.brandPrimary : "rgba(148,163,184,0.5)",
										},
									]}
								/>
								<Text
									style={[
										styles.tripStepLabel,
										{
											color: isDarkMode
												? "rgba(255,255,255,0.70)"
												: "rgba(15,23,42,0.60)",
										},
									]}
								>
									Ready
								</Text>
							</View>
						</View>
					)}

					<View
						style={[
							styles.tripMetaRow,
							{
								backgroundColor: isDarkMode
									? "rgba(255,255,255,0.06)"
									: "rgba(15,23,42,0.04)",
							},
						]}
					>
						<View style={styles.tripMetaItem}>
							<Text
								style={[
									styles.tripMetaLabel,
									{
										color: isDarkMode
											? "rgba(255,255,255,0.55)"
											: "rgba(15,23,42,0.55)",
									},
								]}
							>
								Specialty
							</Text>
							<Text
								style={[
									styles.tripMetaValue,
									{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
								]}
								numberOfLines={1}
							>
								{specialty}
							</Text>
						</View>
						<View
							style={[
								styles.tripMetaDivider,
								{
									backgroundColor: isDarkMode
										? "rgba(255,255,255,0.10)"
										: "rgba(15,23,42,0.08)",
								},
							]}
						/>
						<View style={styles.tripMetaItem}>
							<Text
								style={[
									styles.tripMetaLabel,
									{
										color: isDarkMode
											? "rgba(255,255,255,0.55)"
											: "rgba(15,23,42,0.55)",
									},
								]}
							>
								Bed
							</Text>
							<Text
								style={[
									styles.tripMetaValue,
									{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
								]}
								numberOfLines={1}
							>
								{bedCount} • {bedType}
							</Text>
						</View>
					</View>

					{!isCollapsed && (
						<View style={styles.tripDetails}>
							<Text
								style={[
									styles.tripSectionTitle,
									{
										color: isDarkMode
											? "rgba(255,255,255,0.70)"
											: "rgba(15,23,42,0.60)",
									},
								]}
							>
								Reservation
							</Text>
							<Text
								style={[
									styles.tripCrewItem,
									{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
								]}
								numberOfLines={1}
							>
								{hospitalName}
							</Text>
							<Text
								style={[
									styles.tripCrewItem,
									{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
								]}
								numberOfLines={1}
							>
								ID {bookingId}
							</Text>

							<View style={styles.tripActionsRow}>
								<View style={styles.tripQuickActions}>
									<Pressable
										disabled={!callTarget}
										onPress={() => {
											if (!callTarget) return;
											Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
											Linking.openURL(callTarget);
										}}
										style={({ pressed }) => [
											styles.tripActionButton,
											{
												backgroundColor: isDarkMode
													? "rgba(255,255,255,0.08)"
													: "rgba(15,23,42,0.06)",
												opacity: callTarget ? 1 : 0.5,
												transform: [{ scale: pressed ? 0.98 : 1 }],
											},
										]}
									>
										<Ionicons name="call" size={18} color={COLORS.brandPrimary} />
										<Text
											style={[
												styles.tripActionText,
												{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
											]}
										>
											Call
										</Text>
									</Pressable>
									<Pressable
										disabled={!smsTarget}
										onPress={() => {
											if (!smsTarget) return;
											Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
											Linking.openURL(smsTarget);
										}}
										style={({ pressed }) => [
											styles.tripActionButton,
											{
												backgroundColor: isDarkMode
													? "rgba(255,255,255,0.08)"
													: "rgba(15,23,42,0.06)",
												opacity: smsTarget ? 1 : 0.5,
												transform: [{ scale: pressed ? 0.98 : 1 }],
											},
										]}
									>
										<Ionicons name="chatbubble" size={18} color={COLORS.brandPrimary} />
										<Text
											style={[
												styles.tripActionText,
												{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
											]}
										>
											Message
										</Text>
									</Pressable>
								</View>

								<View style={styles.tripQuickActions}>
									<Pressable
										onPress={() => {
											Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
											onCancelBedBooking?.();
										}}
										style={({ pressed }) => [
											styles.tripCancelButton,
											{
												backgroundColor: isDarkMode
													? "rgba(239,68,68,0.16)"
													: "rgba(239,68,68,0.10)",
												transform: [{ scale: pressed ? 0.98 : 1 }],
												flex: 1,
											},
										]}
									>
										<Text style={styles.tripCancelText}>Cancel reservation</Text>
									</Pressable>

									<Pressable
										onPress={() => {
											Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
											onCompleteBedBooking?.();
										}}
										style={({ pressed }) => [
											styles.tripCancelButton,
											{
												backgroundColor: isDarkMode
													? "rgba(16,185,129,0.16)"
													: "rgba(16,185,129,0.12)",
												transform: [{ scale: pressed ? 0.98 : 1 }],
												flex: 1,
											},
										]}
									>
										<Text
											style={[
												styles.tripCancelText,
												{ color: "#10B981" },
											]}
										>
											Mark complete
										</Text>
									</Pressable>
								</View>
								</View>
						</View>
					)}
				</View>
			);
		}, [
			activeBedBooking?.bedCount,
			activeBedBooking?.bedNumber,
			activeBedBooking?.bedType,
			activeBedBooking?.bookingId,
			activeBedBooking?.estimatedWait,
			activeBedBooking?.etaSeconds,
			activeBedBooking?.hospitalName,
			activeBedBooking?.specialty,
			bedProgress,
			bedStatus,
			bookingHospital?.name,
			callTarget,
			currentSnapIndex,
			formattedBedRemaining,
			isDarkMode,
			onCancelBedBooking,
			onCompleteBedBooking,
			smsTarget,
		]);

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
							{ paddingBottom: isTripMode || isBedBookingMode ? 0 : TAB_BAR_HEIGHT },
						]}
						showsVerticalScrollIndicator={false}
						scrollEventThrottle={16}
						onScroll={handleScroll}
						keyboardShouldPersistTaps="handled"
					>
						{isTripMode ? (
							renderTripSummary()
						) : isBedBookingMode ? (
							renderBedSummary()
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
								textMuted={textMuted}
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
	tripCard: {
		borderRadius: 22,
		borderWidth: 1,
		paddingHorizontal: 14,
		paddingTop: 14,
		paddingBottom: 12,
		marginBottom: 10,
	},
	tripHeaderRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	tripTitle: {
		fontSize: 16,
		fontWeight: "500",
	},
	tripSubtitle: {
		marginTop: 4,
		fontSize: 12,
		fontWeight:'400',
	},
	tripBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 14,
		backgroundColor: "rgba(220,38,38,0.08)",
	},
	tripBadgeText: {
		fontSize: 12,
		fontWeight: "800",
	},
	tripMetaRow: {
		marginTop: 12,
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 16,
		overflow: "hidden",
	},
	tripMetaItem: {
		flex: 1,
		paddingVertical: 10,
		paddingHorizontal: 12,
	},
	tripMetaLabel: {
		fontSize: 11,
		fontWeight: "500",
	},
	tripMetaValue: {
		marginTop: 4,
		fontSize: 13,
		fontWeight: "800",
	},
	tripMetaDivider: {
		width: 1,
		alignSelf: "stretch",
	},
	tripDetails: {
		marginTop: 12,
	},
	tripSectionTitle: {
		fontSize: 11,
		fontWeight: "900",
		letterSpacing: 1,
		textTransform: "uppercase",
		marginBottom: 8,
	},
	tripCrewItem: {
		fontSize: 13,
		fontWeight:'400',
		marginBottom: 6,
	},
	tripActionsRow: {
		marginTop: 12,
	},
	tripQuickActions: {
		flexDirection: "row",
		gap: 10,
		marginBottom: 10,
	},
	tripActionButton: {
		flex: 1,
		height: 44,
		borderRadius: 16,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
	},
	tripActionText: {
		fontSize: 13,
		fontWeight: "800",
	},
	tripCancelButton: {
		height: 44,
		borderRadius: 16,
		justifyContent: "center",
		alignItems: "center",
	},
	tripCancelText: {
		fontSize: 13,
		fontWeight: "800",
		letterSpacing: 0.2,
		color: "#EF4444",
	},
	tripStepsRow: {
		marginTop: 12,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	tripStep: {
		alignItems: "center",
		flex: 1,
	},
	tripStepDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		marginBottom: 6,
	},
	tripStepLabel: {
		fontSize: 11,
		fontWeight: "800",
	},
	tripStepLine: {
		height: 2,
		width: 22,
		borderRadius: 1,
		backgroundColor: "rgba(148,163,184,0.35)",
		marginBottom: 18,
	},
	// detailContainer & detailHeader removed as they are now in HospitalDetailView
});

EmergencyBottomSheet.displayName = "EmergencyBottomSheet";

export default EmergencyBottomSheet;

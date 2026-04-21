import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Animated,
	Linking,
	Pressable,
	Text,
	View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useEmergency } from "../../../../contexts/EmergencyContext";
import { useVisits } from "../../../../contexts/VisitsContext";
import { formatDistanceMeters } from "../../surfaces/hospitals/mapHospitalDetail.helpers";
import MapSheetShell from "../../MapSheetShell";
import { MAP_SHEET_PHASES, MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import MapStageBodyScroll from "../shared/MapStageBodyScroll";
import sheetStageStyles from "../shared/mapSheetStage.styles";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
import useMapStageResponsiveMetrics from "../shared/useMapStageResponsiveMetrics";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import MapHeaderIconButton from "../shared/MapHeaderIconButton";
import { EMERGENCY_VISIT_LIFECYCLE } from "../../../../constants/visits";
import { useEmergencyHandlers } from "../../../../hooks/emergency/useEmergencyHandlers";
import { useEmergencyRequests } from "../../../../hooks/emergency/useEmergencyRequests";
import { useTripProgress } from "../../../../hooks/emergency/useTripProgress";
import { useBedBookingProgress } from "../../../../hooks/emergency/useBedBookingProgress";
import { EmergencyRequestStatus } from "../../../../services/emergencyRequestsService";
import { paymentService } from "../../../../services/paymentService";
import {
	hasMeaningfulTriageDraftData,
	normalizeTriageDraft,
	triageStepAnswered,
} from "../../../emergency/triage/triageFlow.shared";
import { buildMapCommitTriageSteps } from "../commitTriage/mapCommitTriage.helpers";
import { ServiceRatingModal } from "../../../emergency/ServiceRatingModal";
import { COLORS } from "../../../../constants/colors";
import { getAmbulanceVisualProfile } from "../../../emergency/requestModal/ambulanceTierVisuals";
import styles from "./mapTracking.styles";

function formatClockArrival(remainingSeconds, nowMs = Date.now()) {
	if (!Number.isFinite(remainingSeconds)) return "--";
	const arrivalDate = new Date(nowMs + remainingSeconds * 1000);
	return arrivalDate.toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
	});
}

function formatRemainingShort(remainingSeconds) {
	if (!Number.isFinite(remainingSeconds)) return "--";
	const minutes = Math.max(1, Math.ceil(remainingSeconds / 60));
	return `${minutes} min`;
}

function formatHospitalDistanceLabel(hospital) {
	if (typeof hospital?.distance === "string" && hospital.distance.trim()) {
		return hospital.distance.trim();
	}

	const distanceKm = Number(hospital?.distanceKm);
	if (Number.isFinite(distanceKm) && distanceKm > 0) {
		return distanceKm < 1
			? `${Math.round(distanceKm * 1000)} m`
			: `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
	}

	return "--";
}

function resolveDistanceLabel(routeInfo, hospital) {
	if (Number.isFinite(routeInfo?.distanceMeters) && routeInfo.distanceMeters > 0) {
		return formatDistanceMeters(routeInfo.distanceMeters) || "--";
	}
	return formatHospitalDistanceLabel(hospital);
}

function resolveHospitalPhone(hospital) {
	const source =
		hospital?.phone ||
		hospital?.phone_number ||
		hospital?.phoneNumber ||
		null;
	if (typeof source !== "string" || !source.trim()) return null;
	const normalized = source.replace(/[^\d+]/g, "");
	return normalized || null;
}

function resolveHospitalAddress(hospital) {
	return (
		hospital?.formattedAddress ||
		hospital?.address ||
		hospital?.full_address ||
		[hospital?.street, hospital?.city, hospital?.state]
			.filter(Boolean)
			.join(", ") ||
		""
	);
}

function getTrackingTone(telemetryHealth, kind, status) {
	const isResolved = status === "arrived" || status === "completed";
	if (kind === "ambulance") {
		const telemetryState = telemetryHealth?.state ?? "inactive";
		if (telemetryState === "lost") return "critical";
		if (telemetryState === "stale") return "warning";
		if (isResolved) return "success";
		return "live";
	}
	if (kind === "bed") {
		return isResolved ? "success" : "live";
	}
	return "neutral";
}

function getToneColors({ tone, isDarkMode }) {
	switch (tone) {
		case "critical":
			return {
				surface: isDarkMode ? "rgba(127,29,29,0.32)" : "rgba(254,226,226,0.92)",
				text: isDarkMode ? "#FECACA" : "#991B1B",
				icon: isDarkMode ? "#FCA5A5" : "#B91C1C",
			};
		case "warning":
			return {
				surface: isDarkMode ? "rgba(120,53,15,0.30)" : "rgba(254,243,199,0.94)",
				text: isDarkMode ? "#FDE68A" : "#92400E",
				icon: isDarkMode ? "#FBBF24" : "#B45309",
			};
		case "success":
			return {
				surface: isDarkMode ? "rgba(20,83,45,0.34)" : "rgba(220,252,231,0.95)",
				text: isDarkMode ? "#BBF7D0" : "#166534",
				icon: isDarkMode ? "#4ADE80" : "#16A34A",
			};
		case "live":
			return {
				surface: isDarkMode ? "rgba(134,16,14,0.24)" : "rgba(255,237,233,0.96)",
				text: isDarkMode ? "#FEE4E2" : "#B42318",
				icon: isDarkMode ? "#FDA29B" : "#D92D20",
			};
		default:
			return {
				surface: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.86)",
				text: isDarkMode ? "#E2E8F0" : "#334155",
				icon: isDarkMode ? "#CBD5E1" : "#475569",
			};
	}
}

function joinDisplayParts(parts = []) {
	return parts
		.filter((part) => typeof part === "string" && part.trim())
		.join(" · ");
}

function joinSummaryParts(parts = []) {
	return parts
		.filter((part) => typeof part === "string" && part.trim())
		.join(" · ");
}

function resolveTransportServiceLabel(value) {
	if (value && typeof value === "object") {
		const fromObject = value.title || value.label || value.name || null;
		if (typeof fromObject === "string" && fromObject.trim()) {
			return fromObject.trim();
		}
	}
	const raw = String(value || "").trim();
	if (!raw) return "Transport";
	const normalized = raw.toLowerCase();
	if (normalized.includes("bls") || normalized.includes("basic")) return "Everyday care";
	if (normalized.includes("als") || normalized.includes("advanced")) return "Extra support";
	if (
		normalized.includes("icu") ||
		normalized.includes("critical") ||
		normalized.includes("transfer")
	) {
		return "Hospital transfer";
	}
	const visualProfile = getAmbulanceVisualProfile(value);
	if (visualProfile?.key === "basic") return "Everyday care";
	if (visualProfile?.key === "advanced") return "Extra support";
	if (visualProfile?.key === "critical") return "Hospital transfer";
	return visualProfile?.label || raw;
}

function isGenericTransportLabel(label) {
	const normalized = String(label || "").trim().toLowerCase();
	return (
		!normalized ||
		normalized === "transport" ||
		normalized === "ambulance" ||
		normalized === "emergency" ||
		normalized === "request"
	);
}

function getDetailTone(label, isDarkMode) {
	const normalized = String(label || "").toLowerCase();
	if (normalized.includes("request")) {
		return {
			surface: isDarkMode ? "rgba(59,130,246,0.22)" : "rgba(59,130,246,0.14)",
			icon: isDarkMode ? "#93C5FD" : "#1D4ED8",
		};
	}
	if (normalized.includes("vehicle")) {
		return {
			surface: isDarkMode ? "rgba(34,197,94,0.22)" : "rgba(34,197,94,0.14)",
			icon: isDarkMode ? "#86EFAC" : "#15803D",
		};
	}
	if (normalized.includes("team") || normalized.includes("crew")) {
		return {
			surface: isDarkMode ? "rgba(20,184,166,0.22)" : "rgba(20,184,166,0.14)",
			icon: isDarkMode ? "#5EEAD4" : "#0F766E",
		};
	}
	return {
		surface: isDarkMode ? "rgba(180,35,24,0.20)" : "rgba(180,35,24,0.12)",
		icon: isDarkMode ? "#FDA29B" : "#B42318",
	};
}

function MapTrackingTopSlot({
	title,
	subtitle,
	titleColor,
	mutedColor,
	actionSurfaceColor,
	triageSurfaceColor,
	triageIconColor,
	triageIconName = "medkit",
	triageRingColor,
	triageTrackColor,
	onToggle,
	onOpenTriage,
	showTriage = false,
	triageComplete = false,
	triageProgress = 0,
	showToggle = true,
	toggleIconName = "chevron-up",
	toggleAccessibilityLabel = "Toggle tracking sheet size",
}) {
	const clampedProgress = Math.max(0, Math.min(1, Number(triageProgress) || 0));
	const visualProgress = triageComplete ? 1 : Math.max(1 / 6, clampedProgress);
	const ringProgress = useRef(new Animated.Value(visualProgress)).current;
	const breathProgress = useRef(new Animated.Value(0)).current;
	const ringSize = 38;
	const strokeWidth = 2.5;
	const radius = (ringSize - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const AnimatedCircle = Animated.createAnimatedComponent(Circle);

	useEffect(() => {
		Animated.timing(ringProgress, {
			toValue: visualProgress,
			duration: 420,
			useNativeDriver: false,
		}).start();
	}, [ringProgress, visualProgress]);

	useEffect(() => {
		if (triageComplete) {
			breathProgress.setValue(0);
			return undefined;
		}
		const animation = Animated.loop(
			Animated.sequence([
				Animated.timing(breathProgress, {
					toValue: 1,
					duration: 1600,
					useNativeDriver: true,
				}),
				Animated.timing(breathProgress, {
					toValue: 0,
					duration: 1600,
					useNativeDriver: true,
				}),
			]),
		);
		animation.start();
		return () => animation.stop();
	}, [breathProgress, triageComplete]);

	const ringDashOffset = ringProgress.interpolate({
		inputRange: [0, 1],
		outputRange: [circumference, 0],
	});
	const breathScale = breathProgress.interpolate({
		inputRange: [0, 1],
		outputRange: [1, 1.018],
	});

	const rightAction = showTriage ? (
		<Animated.View
			style={[
				styles.triageProgressWrap,
				{ transform: [{ scale: breathScale }] },
			]}
		>
			<Svg width={ringSize} height={ringSize} style={styles.triageProgressSvg}>
				<Circle
					cx={ringSize / 2}
					cy={ringSize / 2}
					r={radius}
					stroke={
						triageTrackColor ||
						(triageComplete ? "rgba(22,163,74,0.35)" : "rgba(148,163,184,0.34)")
					}
					strokeWidth={strokeWidth}
					fill="none"
				/>
				<AnimatedCircle
					cx={ringSize / 2}
					cy={ringSize / 2}
					r={radius}
					stroke={
						triageRingColor ||
						(triageComplete ? "#16A34A" : COLORS.brandPrimary)
					}
					strokeWidth={strokeWidth}
					fill="none"
					strokeLinecap="round"
					strokeDasharray={`${circumference} ${circumference}`}
					strokeDashoffset={ringDashOffset}
					transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
				/>
			</Svg>
			<MapHeaderIconButton
				onPress={onOpenTriage}
				accessibilityLabel="Update your info"
				backgroundColor={triageSurfaceColor || actionSurfaceColor}
				color={triageIconColor || titleColor}
				iconName={triageIconName}
				pressableStyle={styles.topSlotAction}
				style={styles.topSlotActionButton}
			/>
		</Animated.View>
	) : (
		<View style={styles.topSlotSpacer} />
	);

	return (
		<View style={styles.topSlot}>
			<View style={[styles.topSlotSide, styles.topSlotSideLeft]}>
				{showToggle ? (
					<MapHeaderIconButton
						onPress={onToggle}
						accessibilityLabel={toggleAccessibilityLabel}
						backgroundColor={actionSurfaceColor}
						color={titleColor}
						iconName={toggleIconName}
						pressableStyle={styles.topSlotAction}
						style={styles.topSlotActionButton}
					/>
				) : (
					<View style={styles.topSlotSpacer} />
				)}
			</View>
			<View style={styles.topSlotCopy}>
				<Text numberOfLines={1} style={[styles.topSlotTitle, { color: titleColor }]}>
					{title}
				</Text>
				{subtitle ? (
					<Text
						numberOfLines={1}
						style={[styles.topSlotSubtitle, { color: mutedColor }]}
					>
						{subtitle}
					</Text>
				) : null}
			</View>
			<View style={[styles.topSlotSide, styles.topSlotSideRight]}>
				{rightAction}
			</View>
		</View>
	);
}

function TrackingUtilityButton({
	action,
	backgroundColor,
	borderColor = "transparent",
	iconColor,
	labelColor,
}) {
	return (
		<Pressable
			onPress={action.onPress}
			style={({ pressed }) => [
				styles.utilityButton,
				{ backgroundColor, borderColor },
				pressed ? styles.utilityButtonPressed : null,
			]}
		>
			{action.loading ? (
				<ActivityIndicator size="small" color={labelColor} />
			) : (
				<>
					<Ionicons name={action.iconName} size={16} color={iconColor} />
					<Text style={[styles.utilityLabel, { color: labelColor }]}>
						{action.label}
					</Text>
				</>
			)}
		</Pressable>
	);
}

function TrackingInfoCard({
	label,
	title,
	subtitle,
	backgroundColor,
	titleColor,
	mutedColor,
}) {
	return (
		<View style={[styles.infoCard, { backgroundColor }]}>
			<Text numberOfLines={1} style={[styles.infoLabel, { color: mutedColor }]}>
				{label}
			</Text>
			<Text numberOfLines={1} style={[styles.infoTitle, { color: titleColor }]}>
				{title || "--"}
			</Text>
			{subtitle ? (
				<Text numberOfLines={1} style={[styles.infoSubtitle, { color: mutedColor }]}>
					{subtitle}
				</Text>
			) : null}
		</View>
	);
}

function TrackingTeamHeroCard({
	title,
	subtitle,
	rightMeta,
	progressValue = 0,
	avatarIcon = "person",
	backgroundColor,
	progressColor,
	titleColor,
	mutedColor,
}) {
	const clampedProgress = Math.max(0, Math.min(1, Number(progressValue) || 0));
	return (
		<View style={[styles.teamHeroCard, { backgroundColor }]}>
			<View
				pointerEvents="none"
				style={[
					styles.teamHeroProgressFill,
					{
						width: `${clampedProgress * 100}%`,
						backgroundColor: progressColor,
					},
				]}
			/>
			<View style={styles.teamHeroContent}>
				<View style={styles.teamHeroRow}>
					<View style={styles.teamHeroAvatar}>
						<Ionicons name={avatarIcon} size={20} color="#FFFFFF" />
					</View>
					<View style={styles.teamHeroCopy}>
						<Text numberOfLines={1} style={[styles.teamHeroTitle, { color: titleColor }]}>
							{title || "--"}
						</Text>
						{subtitle ? (
							<Text numberOfLines={1} style={[styles.teamHeroSubtitle, { color: mutedColor }]}>
								{subtitle}
							</Text>
						) : null}
					</View>
					{rightMeta ? (
						<View style={styles.teamHeroRight}>
							<Text
								numberOfLines={1}
								style={[styles.teamHeroRightText, { color: mutedColor }]}
							>
								{rightMeta}
							</Text>
						</View>
					) : null}
				</View>
			</View>
		</View>
	);
}

function resolveCtaIconName(action = {}) {
	const iconByKey = {
		info: "medkit",
		bed: "bed",
		home: "map",
		arrived: "navigate-circle",
		"check-in": "clipboard",
		"complete-ambulance": "checkmark-circle",
		"complete-bed": "checkmark-circle",
	};
	if (iconByKey[action.key]) return iconByKey[action.key];
	const raw = String(action.iconName || "").trim();
	if (!raw) return "ellipse";
	if (raw.endsWith("-outline")) return raw.replace("-outline", "");
	return raw;
}

function renderCtaIcon(action, iconColor) {
	const iconName = resolveCtaIconName(action);
	if (action?.iconFamily === "material-community") {
		return <MaterialCommunityIcons name={iconName} size={32} color={iconColor} />;
	}
	return <Ionicons name={iconName} size={32} color={iconColor} />;
}

function toTitleCaseLabel(value) {
	return String(value || "")
		.toLowerCase()
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function TrackingCtaButton({
	action,
	iconColor,
	labelColor,
	showDivider = false,
	isGrouped = false,
}) {
	return (
		<View>
			<Pressable
				onPress={action.onPress}
				style={({ pressed }) => [
					styles.ctaButton,
					isGrouped ? styles.ctaButtonGrouped : null,
					pressed ? styles.ctaButtonPressed : null,
				]}
			>
				{action.loading ? (
					<ActivityIndicator size="small" color={labelColor} />
				) : (
					<>
						{renderCtaIcon(action, iconColor)}
						<Text numberOfLines={1} style={[styles.ctaButtonText, { color: labelColor }]}>
							{action.label}
						</Text>
					</>
				)}
			</Pressable>
			{showDivider ? <View style={styles.ctaDivider} /> : null}
		</View>
	);
}

function TrackingPrimaryActionCard({
	action,
	backgroundColor,
	buttonColor,
	buttonTextColor,
	iconBackgroundColor,
	iconColor,
	labelColor,
	shadowStyle,
}) {
	return (
		<View style={[styles.primaryActionCardShell, shadowStyle]}>
			<Pressable
				onPress={action.onPress}
				style={({ pressed }) => [
					styles.primaryActionCard,
					{ backgroundColor },
					pressed ? styles.primaryActionCardPressed : null,
				]}
			>
				<View style={[styles.primaryActionIconWrap, { backgroundColor: iconBackgroundColor }]}>
					<Ionicons name={action.iconName} size={18} color={iconColor} />
				</View>
				<View style={styles.primaryActionCopy}>
					<Text style={[styles.primaryActionTitle, { color: labelColor }]}>
						{action.label}
					</Text>
				</View>
				<View style={[styles.primaryActionButton, { backgroundColor: buttonColor }]}>
					{action.loading ? (
						<ActivityIndicator size="small" color={buttonTextColor} />
					) : (
						<Text style={[styles.primaryActionButtonText, { color: buttonTextColor }]}>
							{action.ctaLabel || action.label}
						</Text>
					)}
				</View>
			</Pressable>
		</View>
	);
}

export default function MapTrackingStageBase({
	sheetHeight,
	snapState,
	hospital,
	payload = null,
	currentLocation = null,
	routeInfo = null,
	headerActionRequest = null,
	onConsumeHeaderActionRequest,
	onOpenCommitTriageFromTracking,
	onAddBedFromTracking,
	onClose,
	onSnapStateChange,
}) {
	const { isDarkMode } = useTheme();
	const {
		hospitals = [],
		allHospitals = [],
		activeAmbulanceTrip,
		ambulanceTelemetryHealth,
		activeBedBooking,
		pendingApproval,
		setAmbulanceTripStatus,
		setBedBookingStatus,
		setPendingApproval,
		stopAmbulanceTrip,
		stopBedBooking,
	} = useEmergency();
	const { updateVisit, cancelVisit, completeVisit } = useVisits();
	const { setRequestStatus } = useEmergencyRequests();
	const { isSidebarPresentation, contentMaxWidth, presentationMode, shellWidth } =
		useMapStageSurfaceLayout();
	const stageMetrics = useMapStageResponsiveMetrics({ presentationMode });
	const [busyAction, setBusyAction] = useState(null);
	const [ratingState, setRatingState] = useState({
		visible: false,
		visitId: null,
		completeKind: null,
		serviceType: null,
		title: null,
		subtitle: null,
		serviceDetails: null,
	});
	const [nowMs, setNowMs] = useState(Date.now());
	const handledHeaderActionRef = useRef(null);

	useEffect(() => {
		setNowMs(Date.now());
		const intervalId = setInterval(() => {
			setNowMs(Date.now());
		}, 1000);
		return () => clearInterval(intervalId);
	}, []);

	const allKnownHospitals =
		Array.isArray(allHospitals) && allHospitals.length > 0 ? allHospitals : hospitals;
	const trackedHospitalId =
		activeAmbulanceTrip?.hospitalId ||
		activeBedBooking?.hospitalId ||
		pendingApproval?.hospitalId ||
		payload?.hospital?.id ||
		hospital?.id ||
		null;
	const resolvedHospital =
		hospital ||
		payload?.hospital ||
		allKnownHospitals.find((entry) => entry?.id === trackedHospitalId) ||
		null;
	const hospitalName =
		resolvedHospital?.name ||
		activeAmbulanceTrip?.hospitalName ||
		activeBedBooking?.hospitalName ||
		pendingApproval?.hospitalName ||
		"Hospital";
	const hospitalAddress = resolveHospitalAddress(resolvedHospital);
	const pickupLabel = currentLocation?.primaryText || "My location";
	const pickupDetail =
		currentLocation?.secondaryText ||
		currentLocation?.formattedAddress ||
		"";
	const hospitalPhone = resolveHospitalPhone(resolvedHospital);
	const responder = activeAmbulanceTrip?.assignedAmbulance || null;
	const responderName =
		responder?.crew?.[0] ||
		responder?.name ||
		responder?.callSign ||
		responder?.vehicleNumber ||
		responder?.type ||
		null;
	const responderMeta = [responder?.type, responder?.rating ? `${responder.rating}` : null]
		.filter(Boolean)
		.join(" · ");
	const responderPlate = responder?.vehicleNumber || responder?.plate || null;
	const responderPhone = resolveHospitalPhone({ phone: responder?.phone });
	const responderMetaText = joinDisplayParts([
		responder?.type || null,
		responder?.rating ? `${responder.rating}` : null,
	]);
	const trackingKind = activeAmbulanceTrip?.requestId
		? "ambulance"
		: activeBedBooking?.requestId
			? "bed"
			: pendingApproval?.requestId
				? "pending"
				: "idle";
	const triageRequestId =
		activeAmbulanceTrip?.requestId ||
		activeBedBooking?.requestId ||
		pendingApproval?.requestId ||
		null;
	const triageRequestDraft = useMemo(
		() =>
			normalizeTriageDraft(
				activeAmbulanceTrip?.triage?.signals?.userCheckin ||
					activeAmbulanceTrip?.triageSnapshot?.signals?.userCheckin ||
					activeAmbulanceTrip?.triageCheckin ||
					activeBedBooking?.triage?.signals?.userCheckin ||
					activeBedBooking?.triageSnapshot?.signals?.userCheckin ||
					activeBedBooking?.triageCheckin ||
					pendingApproval?.triage?.signals?.userCheckin ||
					pendingApproval?.triageSnapshot?.signals?.userCheckin ||
					pendingApproval?.initiatedData?.triageCheckin ||
					null,
			),
		[
			activeAmbulanceTrip?.triage?.signals?.userCheckin,
			activeAmbulanceTrip?.triageCheckin,
			activeAmbulanceTrip?.triageSnapshot?.signals?.userCheckin,
			activeBedBooking?.triage?.signals?.userCheckin,
			activeBedBooking?.triageCheckin,
			activeBedBooking?.triageSnapshot?.signals?.userCheckin,
			pendingApproval?.initiatedData?.triageCheckin,
			pendingApproval?.triage?.signals?.userCheckin,
			pendingApproval?.triageSnapshot?.signals?.userCheckin,
		],
	);
	const triageSteps = useMemo(
		() => buildMapCommitTriageSteps(false),
		[],
	);
	const triageDisplayTotalSteps = Math.max(6, triageSteps.length || 0);
	const triageAnsweredCount = useMemo(
		() =>
			triageSteps.filter((step) => triageStepAnswered(step, triageRequestDraft)).length,
		[triageRequestDraft, triageSteps],
	);
	const triageIsComplete =
		triageSteps.length > 0 && triageAnsweredCount >= triageSteps.length;
	const triageProgressValue =
		triageDisplayTotalSteps > 0
			? triageAnsweredCount / triageDisplayTotalSteps
			: 0;
	const triageHasData = hasMeaningfulTriageDraftData(triageRequestDraft);
	const openTrackingTriage = useCallback(() => {
		onOpenCommitTriageFromTracking?.({
			requestId: triageRequestId || null,
			triageDraft: triageRequestDraft || null,
			sourcePhase: MAP_SHEET_PHASES.TRACKING,
			sourceSnapState: snapState,
			careIntent: trackingKind === "bed" ? "bed" : "ambulance",
		});
	}, [
		onOpenCommitTriageFromTracking,
		snapState,
		trackingKind,
		triageRequestDraft,
		triageRequestId,
	]);
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
	});

	const {
		remainingSeconds: ambulanceRemainingSeconds,
		tripProgress: ambulanceTripProgress,
		computedStatus: ambulanceComputedStatus,
	} = useTripProgress({
		activeAmbulanceTrip,
		nowMs,
	});
	const {
		remainingBedSeconds,
		bedStatus,
	} = useBedBookingProgress({
		activeBedBooking,
		nowMs,
	});

	const resolvedStatus = String(
		(activeAmbulanceTrip?.status ||
			activeBedBooking?.status ||
			pendingApproval?.status ||
			"").toLowerCase(),
	);
	const canToggleSnapState =
		presentationMode === "sheet" &&
		(snapState === MAP_SHEET_SNAP_STATES.HALF ||
			snapState === MAP_SHEET_SNAP_STATES.EXPANDED);
	const effectiveSnapState =
		presentationMode === "sheet"
			? snapState
			: MAP_SHEET_SNAP_STATES.EXPANDED;
	const isExpanded = effectiveSnapState === MAP_SHEET_SNAP_STATES.EXPANDED;

	const allowedSnapStates = useMemo(
		() =>
			presentationMode === "sheet"
				? [MAP_SHEET_SNAP_STATES.HALF, MAP_SHEET_SNAP_STATES.EXPANDED]
				: [MAP_SHEET_SNAP_STATES.EXPANDED],
		[presentationMode],
	);
	const {
		allowScrollDetents,
		bodyScrollEnabled,
		bodyScrollRef,
		handleBodyScroll,
		handleBodyScrollBeginDrag,
		handleBodyScrollEndDrag,
		handleBodyWheel,
	} = useMapSheetDetents({
		snapState: effectiveSnapState,
		onSnapStateChange,
		presentationMode,
		allowedSnapStates,
	});
	const {
		androidExpandedBodyGesture,
		androidExpandedBodyStyle,
		handleAndroidCollapseScroll,
		handleAndroidCollapseScrollBeginDrag,
	} = useMapAndroidExpandedCollapse({
		snapState: effectiveSnapState,
		onSnapStateChange,
		bodyScrollRef,
		onScroll: handleBodyScroll,
		onScrollBeginDrag: handleBodyScrollBeginDrag,
	});
	const modalContainedStyle =
		presentationMode === "modal" && contentMaxWidth
			? { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }
			: null;

	const remainingSeconds =
		trackingKind === "ambulance"
			? Number.isFinite(ambulanceRemainingSeconds)
				? ambulanceRemainingSeconds
				: routeInfo?.durationSec ?? null
			: trackingKind === "bed"
				? Number.isFinite(remainingBedSeconds)
					? remainingBedSeconds
					: routeInfo?.durationSec ?? null
				: routeInfo?.durationSec ?? null;
	const arrivalLabel =
		trackingKind === "pending"
			? "Pending"
			: formatClockArrival(remainingSeconds, nowMs);
	const etaLabel =
		trackingKind === "pending"
			? "Pending"
			: formatRemainingShort(remainingSeconds);
	const distanceLabel = resolveDistanceLabel(routeInfo, resolvedHospital);
	const serviceLabel =
		trackingKind === "ambulance"
			? (() => {
					const candidates = [
						activeAmbulanceTrip?.ambulanceType,
						activeAmbulanceTrip?.initiatedData?.ambulanceType,
						activeAmbulanceTrip?.assignedAmbulance?.type,
						payload?.transport?.service_type,
						payload?.transport?.serviceType,
						payload?.transport?.tierKey,
						payload?.service?.service_type,
						payload?.service?.serviceType,
						payload?.service?.tierKey,
						pendingApproval?.ambulanceType,
					];
					for (const candidate of candidates) {
						const next = resolveTransportServiceLabel(candidate);
						if (!isGenericTransportLabel(next)) return next;
					}
					return "Everyday care";
				})()
			: trackingKind === "bed"
				? activeBedBooking?.bedType || "Admission"
				: pendingApproval?.serviceType === "bed"
					? pendingApproval?.bedType || "Admission"
					: resolveTransportServiceLabel(pendingApproval?.ambulanceType);
	const requestLabel =
		pendingApproval?.displayId ||
		activeAmbulanceTrip?.requestId ||
		activeBedBooking?.requestId ||
		pendingApproval?.requestId ||
		"";
	const telemetryLabel =
		ambulanceTelemetryHealth?.state === "lost"
			? "Tracking lost"
			: ambulanceTelemetryHealth?.state === "stale"
				? "Tracking delayed"
				: trackingKind === "ambulance"
					? resolvedStatus === EmergencyRequestStatus.COMPLETED ||
					  resolvedStatus === EmergencyRequestStatus.ARRIVED
						? "Complete"
						: ambulanceComputedStatus === "Arrived"
							? "Arrived"
							: "En route"
					: trackingKind === "bed"
						? resolvedStatus === EmergencyRequestStatus.ARRIVED
							? "Ready"
							: "Reserved"
						: "Awaiting approval";
	const secondaryTrackingLabel =
		activeAmbulanceTrip?.requestId && activeBedBooking?.requestId
			? activeBedBooking?.status === "arrived"
				? "Bed ready"
				: "Bed reserved"
			: null;
	const sheetTitle =
		trackingKind === "pending"
			? "Confirming"
			: trackingKind === "bed"
				? resolvedStatus === EmergencyRequestStatus.ARRIVED ||
				  resolvedStatus === EmergencyRequestStatus.COMPLETED
					? "Bed ready"
					: "Bed reserved"
				: resolvedStatus === EmergencyRequestStatus.COMPLETED ||
				  resolvedStatus === EmergencyRequestStatus.ARRIVED
					? "Complete"
					: ambulanceComputedStatus === "Arrived"
						? "Arrived"
						: "En route";
	const sheetSubtitle = hospitalName;
	const sheetTitleDisplay = toTitleCaseLabel(sheetTitle);
	const crewCountLabel =
		Array.isArray(responder?.crew) && responder.crew.length > 0
			? `${responder.crew.length} crew`
			: null;
	const ambulanceDetailTitle =
		responder?.name ||
		resolveTransportServiceLabel(responder?.type) ||
		serviceLabel ||
		"Transport";
	const ambulanceDetailSubtitle = joinDisplayParts([
		responderPlate,
		responder?.type && responder?.name
			? resolveTransportServiceLabel(responder.type)
			: null,
		crewCountLabel,
	]);
	const trackingTone = getTrackingTone(
		ambulanceTelemetryHealth,
		trackingKind,
		resolvedStatus,
	);
	const toneColors = getToneColors({ tone: trackingTone, isDarkMode });
	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedColor = isDarkMode ? "rgba(226,232,240,0.78)" : "#64748B";
	const surfaceColor = isDarkMode ? "rgba(15,23,42,0.74)" : "rgba(255,255,255,0.88)";
	const elevatedSurfaceColor = isDarkMode
		? "rgba(8,15,27,0.88)"
		: "rgba(255,255,255,0.96)";
	const actionSurfaceColor = isDarkMode
		? "rgba(255,255,255,0.07)"
		: "rgba(255,255,255,0.82)";
	const triageProgressTone = triageIsComplete
		? "complete"
		: triageAnsweredCount > 0
			? "partial"
			: "empty";
	const triageActionSurface =
		triageProgressTone === "complete"
			? isDarkMode
				? "rgba(34,197,94,0.18)"
				: "rgba(22,163,74,0.12)"
			: triageProgressTone === "partial"
				? isDarkMode
					? "rgba(245,158,11,0.20)"
					: "rgba(245,158,11,0.14)"
				: isDarkMode
					? "rgba(180,35,24,0.18)"
					: "rgba(180,35,24,0.10)";
	const triageActionIconColor =
		triageProgressTone === "complete"
			? isDarkMode
				? "#86EFAC"
				: "#16A34A"
			: triageProgressTone === "partial"
				? isDarkMode
					? "#FCD34D"
					: "#D97706"
				: COLORS.brandPrimary;
	const triageRingColor = triageActionIconColor;
	const triageTrackColor =
		triageProgressTone === "complete"
			? isDarkMode
				? "rgba(134,239,172,0.24)"
				: "rgba(22,163,74,0.20)"
			: triageProgressTone === "partial"
				? isDarkMode
					? "rgba(252,211,77,0.22)"
					: "rgba(217,119,6,0.18)"
				: isDarkMode
					? "rgba(180,35,24,0.22)"
					: "rgba(180,35,24,0.16)";
	const routeGradientColors = isDarkMode
		? ["rgba(255,255,255,0.04)", "rgba(255,255,255,0.00)", "rgba(255,255,255,0.02)"]
		: ["rgba(15,23,42,0.02)", "rgba(15,23,42,0.00)", "rgba(15,23,42,0.03)"];
	const detailGradientColors = isDarkMode
		? ["rgba(255,255,255,0.03)", "rgba(255,255,255,0.01)"]
		: ["rgba(248,250,252,0.92)", "rgba(255,255,255,0.82)"];
	const routeFadeColors = isDarkMode
		? ["rgba(15,23,42,0.00)", "rgba(15,23,42,0.92)"]
		: ["rgba(255,255,255,0.00)", "rgba(255,255,255,0.98)"];
	const utilitySurfaceColor = isDarkMode
		? "rgba(255,255,255,0.06)"
		: "rgba(255,255,255,0.9)";
	const metricsSurfaceColor = isDarkMode
		? "rgba(8,15,27,0.88)"
		: "rgba(255,255,255,0.94)";
	const metricsAccentSurface = isDarkMode
		? "rgba(134,16,14,0.16)"
		: "rgba(134,16,14,0.08)";
	const stopIconSurface = isDarkMode
		? "rgba(255,255,255,0.07)"
		: "rgba(248,250,252,0.92)";
	const requestSurfaceColor = isDarkMode
		? "rgba(255,255,255,0.08)"
		: "rgba(255,255,255,0.88)";
	const connectorTrackColor = isDarkMode
		? "rgba(255,255,255,0.14)"
		: "rgba(15,23,42,0.12)";
	const connectorProgressColor = isDarkMode
		? "rgba(252,165,165,0.84)"
		: "rgba(180,35,24,0.78)";
	const primaryActionSurface = isDarkMode
		? "rgba(19,30,50,0.94)"
		: "rgba(255,255,255,0.97)";
	const teamHeroSurface = isDarkMode
		? "rgba(15,23,42,0.72)"
		: "rgba(255,255,255,0.9)";
	const teamHeroProgressColor = isDarkMode
		? "rgba(180,35,24,0.38)"
		: "rgba(180,35,24,0.20)";
	const primaryActionButtonColor = "#B42318";
	const primaryActionButtonTextColor = "#FFFFFF";
	const secondaryCtaSurface = isDarkMode
		? "rgba(255,255,255,0.08)"
		: "rgba(255,255,255,0.9)";
	const bedCareBlueColor = isDarkMode ? "#38BDF8" : "#2563EB";
	const destructiveCtaSurface = isDarkMode
		? "rgba(180,35,24,0.18)"
		: "rgba(180,35,24,0.10)";
	const primaryActionIconSurface = isDarkMode
		? "rgba(180,35,24,0.18)"
		: "rgba(180,35,24,0.08)";
	const primaryActionShadowStyle = {
		shadowColor: "#020617",
		shadowOpacity: 0.16,
		shadowRadius: 20,
		shadowOffset: { width: 0, height: 12 },
		elevation: 10,
	};
	const destructiveActionSurface = isDarkMode
		? "rgba(255,255,255,0.06)"
		: "rgba(15,23,42,0.06)";
	const destructiveActionBorder = isDarkMode
		? "rgba(248,113,113,0.22)"
		: "rgba(185,28,28,0.10)";

	const metricsCardStyle = stageMetrics?.route?.cardStyle || null;
	const detailCardRadius = stageMetrics?.panel?.cardStyle?.borderRadius || 26;
	const routeCardRadius = stageMetrics?.route?.cardStyle?.borderRadius || 28;
	const routeVisualProgress = useMemo(() => {
		if (trackingKind !== "ambulance") return 0;
		if (
			resolvedStatus === EmergencyRequestStatus.ARRIVED ||
			resolvedStatus === EmergencyRequestStatus.COMPLETED
		) {
			return 1;
		}
		if (!Number.isFinite(ambulanceTripProgress)) return 0;
		return Math.max(0, Math.min(1, ambulanceTripProgress));
	}, [ambulanceTripProgress, resolvedStatus, trackingKind]);
	const pickupIconSurfaceColor =
		trackingKind === "ambulance"
			? isDarkMode
				? `rgba(180,35,24,${(0.08 + routeVisualProgress * 0.24).toFixed(3)})`
				: `rgba(180,35,24,${(0.06 + routeVisualProgress * 0.2).toFixed(3)})`
			: stopIconSurface;
	const hospitalIconSurfaceColor =
		trackingKind === "ambulance"
			? isDarkMode
				? `rgba(180,35,24,${(0.14 + (1 - routeVisualProgress) * 0.1).toFixed(3)})`
				: `rgba(180,35,24,${(0.1 + (1 - routeVisualProgress) * 0.08).toFixed(3)})`
			: stopIconSurface;

	const handleSheetToggle = useCallback(() => {
		if (!canToggleSnapState || typeof onSnapStateChange !== "function") return;
		onSnapStateChange(
			effectiveSnapState === MAP_SHEET_SNAP_STATES.EXPANDED
				? MAP_SHEET_SNAP_STATES.HALF
				: MAP_SHEET_SNAP_STATES.EXPANDED,
		);
	}, [canToggleSnapState, effectiveSnapState, onSnapStateChange]);

	const handleCallHospital = useCallback(async () => {
		if (!hospitalPhone) return;
		const target = `tel:${hospitalPhone}`;
		try {
			await Linking.openURL(target);
		} catch (_error) {
			// Ignore failed call handoff.
		}
	}, [hospitalPhone]);

	const handleCallResponder = useCallback(async () => {
		if (!responderPhone) return;
		const target = `tel:${responderPhone}`;
		try {
			await Linking.openURL(target);
		} catch (_error) {
			// Ignore failed call handoff.
		}
	}, [responderPhone]);

	const runBusyAction = useCallback(async (key, handler) => {
		if (typeof handler !== "function") return;
		setBusyAction(key);
		try {
			await handler();
		} finally {
			setBusyAction(null);
		}
	}, []);

	const handleCancelPendingRequest = useCallback(async () => {
		if (!pendingApproval?.requestId) return;
		const lifecycleUpdatedAt = new Date().toISOString();
		await Promise.all([
			setRequestStatus(pendingApproval.requestId, EmergencyRequestStatus.CANCELLED),
			cancelVisit(pendingApproval.requestId),
			updateVisit?.(pendingApproval.requestId, {
				lifecycleState: EMERGENCY_VISIT_LIFECYCLE.CANCELLED,
				lifecycleUpdatedAt,
			}),
		]);
		setPendingApproval(null);
	}, [cancelVisit, pendingApproval?.requestId, setPendingApproval, setRequestStatus, updateVisit]);
	const handleCompleteAmbulanceWithRating = useCallback(async () => {
		const visitId = activeAmbulanceTrip?.id ?? activeAmbulanceTrip?.requestId ?? null;
		const hospitalTitle = activeAmbulanceTrip?.hospitalName || hospitalName;
		const providerName =
			activeAmbulanceTrip?.assignedAmbulance?.name ||
			activeAmbulanceTrip?.assignedAmbulance?.crew?.[0] ||
			"Emergency services";
		if (!visitId) return;
		setRatingState({
			visible: true,
			visitId,
			completeKind: "ambulance",
			serviceType: "ambulance",
			title: "Rate your transport",
			subtitle: hospitalTitle ? `For ${hospitalTitle}` : null,
			serviceDetails: {
				hospital: hospitalTitle || null,
				provider: providerName,
			},
		});
	}, [
		activeAmbulanceTrip?.assignedAmbulance?.crew,
		activeAmbulanceTrip?.assignedAmbulance?.name,
		activeAmbulanceTrip?.hospitalName,
		activeAmbulanceTrip?.id,
		activeAmbulanceTrip?.requestId,
		hospitalName,
	]);
	const handleCompleteBedWithRating = useCallback(async () => {
		const visitId = activeBedBooking?.id ?? activeBedBooking?.requestId ?? null;
		const hospitalTitle = activeBedBooking?.hospitalName || hospitalName;
		if (!visitId) return;
		setRatingState({
			visible: true,
			visitId,
			completeKind: "bed",
			serviceType: "bed",
			title: "Rate your stay",
			subtitle: hospitalTitle ? `For ${hospitalTitle}` : null,
			serviceDetails: {
				hospital: hospitalTitle || null,
				provider: "Hospital staff",
			},
		});
	}, [
		activeBedBooking?.hospitalName,
		activeBedBooking?.id,
		activeBedBooking?.requestId,
		hospitalName,
	]);

	const canMarkArrived =
		trackingKind === "ambulance" &&
		ambulanceComputedStatus === "Arrived" &&
		activeAmbulanceTrip?.status !== EmergencyRequestStatus.ARRIVED;
	const canCompleteAmbulance =
		trackingKind === "ambulance" &&
		activeAmbulanceTrip?.status === EmergencyRequestStatus.ARRIVED;
	const canCheckInBed =
		trackingKind === "bed" &&
		bedStatus === "Ready" &&
		activeBedBooking?.status !== EmergencyRequestStatus.ARRIVED;
	const canCompleteBed =
		trackingKind === "bed" &&
		activeBedBooking?.status === EmergencyRequestStatus.ARRIVED;
	const shouldPromoteTriage =
		Boolean(pendingApproval?.requestId) && (!triageHasData || !triageIsComplete);

	const primaryAction = useMemo(() => {
		if (shouldPromoteTriage) {
			return {
				key: "intake",
				label: "Continue check-in",
				ctaLabel: "Continue",
				iconName: "chatbubble-ellipses-outline",
				onPress: openTrackingTriage,
				loading: false,
			};
		}
		if (canMarkArrived) {
			return {
				key: "arrived",
				label: "Confirm arrival",
				ctaLabel: "Confirm",
				iconName: "locate-outline",
				onPress: () => runBusyAction("arrived", onMarkAmbulanceArrived),
				loading: busyAction === "arrived",
			};
		}
		if (canCompleteAmbulance) {
			return {
				key: "complete-ambulance",
				label: "Complete trip",
				ctaLabel: "Complete",
				iconName: "checkmark-circle-outline",
				onPress: handleCompleteAmbulanceWithRating,
				loading: busyAction === "complete",
			};
		}
		if (canCheckInBed) {
			return {
				key: "check-in",
				label: "Check in",
				ctaLabel: "Confirm",
				iconName: "bed-outline",
				onPress: () => runBusyAction("occupied", onMarkBedOccupied),
				loading: busyAction === "occupied",
			};
		}
		if (canCompleteBed) {
			return {
				key: "complete-bed",
				label: "Complete stay",
				ctaLabel: "Complete",
				iconName: "checkmark-circle-outline",
				onPress: handleCompleteBedWithRating,
				loading: busyAction === "complete",
			};
		}
		return null;
	}, [
		activeAmbulanceTrip?.status,
		activeBedBooking?.status,
		bedStatus,
		busyAction,
		canCheckInBed,
		canCompleteAmbulance,
		canCompleteBed,
		canMarkArrived,
		handleCompleteAmbulanceWithRating,
		handleCompleteBedWithRating,
		onCompleteAmbulanceTrip,
		onMarkAmbulanceArrived,
		onMarkBedOccupied,
		shouldPromoteTriage,
		runBusyAction,
	]);

	const secondaryActions = useMemo(() => {
		const actions = [];
		if (
			activeAmbulanceTrip?.requestId &&
			!activeBedBooking?.requestId &&
			typeof onAddBedFromTracking === "function"
		) {
			actions.push({
				key: "bed",
				label: "Reserve bed",
				iconName: "bed-outline",
				onPress: onAddBedFromTracking,
			});
		}
		return actions;
	}, [
		activeAmbulanceTrip?.requestId,
		activeBedBooking?.requestId,
		onAddBedFromTracking,
	]);

	const destructiveAction = useMemo(() => {
		if (pendingApproval?.requestId) {
			return {
				key: "cancel-pending",
				label: "Cancel request",
				iconName: "close-outline",
				onPress: () => runBusyAction("cancel", handleCancelPendingRequest),
				loading: busyAction === "cancel",
			};
		}
		if (activeAmbulanceTrip?.requestId) {
			return {
				key: "cancel-ambulance",
				label: "Cancel request",
				iconName: "close-outline",
				onPress: () => runBusyAction("cancel", onCancelAmbulanceTrip),
				loading: busyAction === "cancel",
			};
		}
		if (activeBedBooking?.requestId) {
			return {
				key: "cancel-bed",
				label: "Cancel booking",
				iconName: "close-outline",
				onPress: () => runBusyAction("cancel", onCancelBedBooking),
				loading: busyAction === "cancel",
			};
		}
		return null;
	}, [
		activeAmbulanceTrip?.requestId,
		activeBedBooking?.requestId,
		busyAction,
		handleCancelPendingRequest,
		onCancelAmbulanceTrip,
		onCancelBedBooking,
		pendingApproval?.requestId,
		runBusyAction,
	]);

	useEffect(() => {
		if (!headerActionRequest?.type || !headerActionRequest?.requestedAt) return;
		if (handledHeaderActionRef.current === headerActionRequest.requestedAt) return;
		handledHeaderActionRef.current = headerActionRequest.requestedAt;

		if (headerActionRequest.type === "triage" && triageRequestId) {
			onConsumeHeaderActionRequest?.();
			openTrackingTriage();
			return;
		}
		if (
			headerActionRequest.type === "bed" &&
			typeof onAddBedFromTracking === "function"
		) {
			onConsumeHeaderActionRequest?.();
			onAddBedFromTracking();
			return;
		}
		if (headerActionRequest.type === "cancel" && destructiveAction?.onPress) {
			onConsumeHeaderActionRequest?.();
			destructiveAction.onPress();
		}
	}, [
		destructiveAction,
		headerActionRequest?.requestedAt,
		headerActionRequest?.type,
		onAddBedFromTracking,
		onConsumeHeaderActionRequest,
		openTrackingTriage,
		triageRequestId,
	]);

	const detailRows = useMemo(() => {
		if (trackingKind === "idle") return [];
		return [
			{ label: "Status", value: telemetryLabel || "Active" },
			{ label: "Request", value: requestLabel || "Active" },
			...(responderName
				? [{ label: "Responder", value: responderName }]
				: []),
			{
				label: "Hospital",
				value:
					hospitalName +
					(hospitalAddress ? ` · ${hospitalAddress}` : ""),
			},
		];
	}, [
		hospitalAddress,
		hospitalName,
		requestLabel,
		responderName,
		telemetryLabel,
		trackingKind,
	]);

	const trackingDetailRows = useMemo(
		() => [
			...(requestLabel
				? [{ icon: "receipt-outline", label: "Request ID", value: requestLabel }]
				: []),
			...(responderPlate
				? [{ icon: "car-outline", label: "Vehicle", value: responderPlate }]
				: []),
			...(crewCountLabel
				? [{ icon: "people-outline", label: "Team", value: crewCountLabel }]
				: []),
			...(secondaryTrackingLabel
				? [{ icon: "bed-outline", label: "Bed", value: secondaryTrackingLabel }]
				: []),
			...(triageRequestId
				? [
						{
							icon: "medkit",
							label: "Check-in",
							value: triageIsComplete
								? "Complete"
								: triageHasData
									? `${triageAnsweredCount}/${triageDisplayTotalSteps}`
									: "Not started",
						},
					]
				: []),
		],
		[
			crewCountLabel,
			requestLabel,
			responderPlate,
			secondaryTrackingLabel,
			triageAnsweredCount,
			triageDisplayTotalSteps,
			triageHasData,
			triageIsComplete,
			triageRequestId,
		],
	);
	const midActions = useMemo(() => {
		const actions = [];
		if (triageRequestId) {
			actions.push({
				key: "info",
				label: toTitleCaseLabel("My information"),
				iconName: "medkit",
				onPress: openTrackingTriage,
				loading: false,
				tone: "info",
			});
		}
		const reserveBedAction =
			Array.isArray(secondaryActions)
				? secondaryActions.find((action) => action?.key === "bed")
				: null;
		if (reserveBedAction) {
			actions.push({
				...reserveBedAction,
				label: toTitleCaseLabel("Reserve my bed space"),
				iconName: "hospital-box",
				iconFamily: "material-community",
				tone: "bed",
			});
		}
		if (primaryAction) {
			if (trackingKind === "ambulance" && primaryAction.key === "arrived") {
				actions.push({
					...primaryAction,
					label: toTitleCaseLabel("Confirm arrival"),
					tone: "state",
				});
			} else if (
				trackingKind === "ambulance" &&
				primaryAction.key === "complete-ambulance"
			) {
				// Complete Request is promoted to the bottom primary slot after arrival.
			} else {
				actions.push({
					...primaryAction,
					label: toTitleCaseLabel(primaryAction.label),
					tone: "state",
				});
			}
		} else if (trackingKind === "ambulance") {
			actions.push({
				key: "home",
				label: toTitleCaseLabel("Return home"),
				iconName: "map",
				onPress: () => onClose?.(),
				loading: false,
				tone: "state",
			});
		}
		return actions;
	}, [
		onClose,
		onSnapStateChange,
		openTrackingTriage,
		primaryAction,
		secondaryActions,
		trackingKind,
		triageRequestId,
	]);

	const bottomAction = useMemo(() => {
		if (trackingKind === "ambulance" && primaryAction?.key === "complete-ambulance") {
			return {
				...primaryAction,
				label: "Complete Request",
			};
		}
		return destructiveAction;
	}, [destructiveAction, primaryAction, trackingKind]);

	const expandedSnapContent = isExpanded ? (
		<>
			<View
				style={[
					styles.routeCard,
					{ backgroundColor: elevatedSurfaceColor, borderRadius: routeCardRadius },
				]}
			>
				<LinearGradient
					pointerEvents="none"
					colors={routeGradientColors}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.routeCardGradient}
				/>

				<View style={styles.routeHeader}>
					<View style={[styles.servicePill, { backgroundColor: toneColors.surface }]}>
						<Ionicons
							name={trackingKind === "bed" ? "bed-outline" : "car-outline"}
							size={15}
							color={toneColors.icon}
						/>
						<Text style={[styles.servicePillText, { color: toneColors.text }]}>
							{serviceLabel}
						</Text>
					</View>
					{requestLabel ? (
						<View style={[styles.requestPill, { backgroundColor: toneColors.surface }]}>
							<Ionicons name="receipt-outline" size={15} color={toneColors.icon} />
							<Text style={[styles.requestPillText, { color: toneColors.text }]}>
								{requestLabel}
							</Text>
						</View>
					) : null}
				</View>

				<View style={styles.stopList}>
					<View
						style={[styles.stopConnector, { backgroundColor: connectorTrackColor }]}
					/>
					<View
						style={[
							styles.stopConnectorProgress,
							{
								backgroundColor: connectorProgressColor,
								height: `${Math.max(0, Math.min(100, routeVisualProgress * 100))}%`,
							},
						]}
					/>

					<View style={styles.stopRow}>
						<View
							style={[
								styles.stopIconWrap,
								{ backgroundColor: pickupIconSurfaceColor },
							]}
						>
							<Ionicons name="navigate" size={18} color={toneColors.icon} />
						</View>
						<View style={styles.stopCopyWrap}>
							<View style={styles.stopCopy}>
								<Text style={[styles.stopLabel, { color: mutedColor }]}>Pickup</Text>
								<Text numberOfLines={1} style={[styles.stopTitle, { color: titleColor }]}>
									{pickupLabel}
								</Text>
								{pickupDetail ? (
									<Text
										numberOfLines={1}
										style={[styles.stopSubtitle, { color: mutedColor }]}
									>
										{pickupDetail}
									</Text>
								) : null}
							</View>
							<LinearGradient
								pointerEvents="none"
								colors={routeFadeColors}
								start={{ x: 0, y: 0.5 }}
								end={{ x: 1, y: 0.5 }}
								style={styles.stopFade}
							/>
						</View>
					</View>

					<View style={styles.stopRow}>
						<View
							style={[
								styles.stopIconWrap,
								{ backgroundColor: hospitalIconSurfaceColor },
							]}
						>
							<Ionicons name="business-outline" size={18} color={titleColor} />
						</View>
						<View style={styles.stopCopyWrap}>
							<View style={styles.stopCopy}>
								<Text style={[styles.stopLabel, { color: mutedColor }]}>Hospital</Text>
								<Text numberOfLines={1} style={[styles.stopTitle, { color: titleColor }]}>
									{hospitalName}
								</Text>
								{hospitalAddress ? (
									<Text
										numberOfLines={1}
										style={[styles.stopSubtitle, { color: mutedColor }]}
									>
										{hospitalAddress}
									</Text>
								) : null}
							</View>
							<LinearGradient
								pointerEvents="none"
								colors={routeFadeColors}
								start={{ x: 0, y: 0.5 }}
								end={{ x: 1, y: 0.5 }}
								style={styles.stopFade}
							/>
						</View>
					</View>
				</View>
			</View>

			<View
				style={[
					styles.detailCard,
					{ backgroundColor: surfaceColor, borderRadius: detailCardRadius },
				]}
			>
				<LinearGradient
					pointerEvents="none"
					colors={detailGradientColors}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.detailCardGradient}
				/>
				<Text style={[styles.detailHeader, { color: mutedColor }]}>
					Details
				</Text>
				<View style={styles.detailList}>
					{trackingDetailRows.map((detail, index) => (
						<View
							key={`${detail.label}-${index}`}
							style={[styles.detailRow, { backgroundColor: requestSurfaceColor }]}
						>
							<View style={styles.detailLeading}>
								{(() => {
									const tone = getDetailTone(detail.label, isDarkMode);
									return (
										<View
											style={[
												styles.detailIconWrap,
												{ backgroundColor: tone.surface },
											]}
										>
											<Ionicons
												name={detail.icon || "information-circle-outline"}
												size={14}
												color={tone.icon}
											/>
										</View>
									);
								})()}
								<Text style={[styles.detailLabel, { color: mutedColor }]}>
									{detail.label}
								</Text>
							</View>
							<Text
								numberOfLines={1}
								style={[styles.detailValue, { color: titleColor }]}
							>
								{detail.value}
							</Text>
						</View>
					))}
				</View>
			</View>
		</>
	) : null;

	const midSnapContent = (
		<>
			<TrackingTeamHeroCard
				title={trackingKind === "bed" ? serviceLabel : responderName || "Driver assigned"}
				subtitle={
					trackingKind === "bed"
						? joinDisplayParts([hospitalName, secondaryTrackingLabel])
						: toTitleCaseLabel(serviceLabel)
				}
				rightMeta={trackingKind === "ambulance" ? crewCountLabel : null}
				progressValue={trackingKind === "ambulance" ? ambulanceTripProgress : 0}
				avatarIcon={trackingKind === "bed" ? "bed" : "person"}
				backgroundColor={teamHeroSurface}
				progressColor={teamHeroProgressColor}
				titleColor={titleColor}
				mutedColor={mutedColor}
			/>

			{midActions.length ? (
				<View style={[styles.ctaGroupCard, { backgroundColor: secondaryCtaSurface }]}>
					{midActions.map((action, index) => (
						<TrackingCtaButton
							key={`mid-${action.key}`}
							action={action}
							isGrouped
							showDivider={index < midActions.length - 1}
							iconColor={
								action.tone === "bed"
									? bedCareBlueColor
									: action.tone === "state"
										? COLORS.brandPrimary
										: isDarkMode
											? "#FDA29B"
											: "#B42318"
							}
							labelColor={titleColor}
						/>
					))}
				</View>
			) : null}

			{bottomAction ? (
				<View style={styles.cancelCtaWrap}>
					<Pressable
						onPress={bottomAction.onPress}
						style={({ pressed }) => [
							styles.cancelCtaButton,
							{ backgroundColor: primaryActionButtonColor },
							pressed ? styles.ctaButtonPressed : null,
						]}
					>
						{bottomAction.loading ? (
							<ActivityIndicator size="small" color={primaryActionButtonTextColor} />
						) : (
							<Text style={[styles.cancelCtaText, { color: primaryActionButtonTextColor }]}>
								{toTitleCaseLabel(bottomAction.label)}
							</Text>
						)}
					</Pressable>
				</View>
			) : null}
		</>
	);

	const body =
		trackingKind === "idle" ? (
			<View style={[styles.emptyCard, { backgroundColor: surfaceColor }]}>
				<Text style={[styles.emptyTitle, { color: titleColor }]}>
					No active request
				</Text>
				<Text style={[styles.emptyMeta, { color: mutedColor }]}>
					{hospitalName}
				</Text>
			</View>
		) : (
			<View style={styles.sectionStack}>
				{expandedSnapContent}
				{midSnapContent}
			</View>
		);

	return (
		<>
			<MapSheetShell
				sheetHeight={sheetHeight}
				snapState={effectiveSnapState}
				presentationMode={presentationMode}
				shellWidth={shellWidth}
				allowedSnapStates={allowedSnapStates}
				topSlot={
					<MapTrackingTopSlot
						title={trackingKind === "idle" ? "Tracking" : sheetTitleDisplay}
						subtitle={trackingKind === "idle" ? hospitalName : sheetSubtitle}
						titleColor={titleColor}
						mutedColor={mutedColor}
						actionSurfaceColor={actionSurfaceColor}
						triageSurfaceColor={triageActionSurface}
						triageIconColor={triageActionIconColor}
						triageIconName="medkit"
						triageRingColor={triageRingColor}
						triageTrackColor={triageTrackColor}
						onToggle={handleSheetToggle}
						onOpenTriage={openTrackingTriage}
						showTriage={Boolean(triageRequestId)}
						triageComplete={triageIsComplete}
						triageProgress={triageProgressValue}
						showToggle={canToggleSnapState}
						toggleIconName={
							isExpanded
								? "chevron-down"
								: "chevron-up"
						}
						toggleAccessibilityLabel={
							isExpanded
								? "Collapse tracking sheet"
								: "Expand tracking sheet"
						}
					/>
				}
				onHandlePress={handleSheetToggle}
			>
				<MapStageBodyScroll
					bodyScrollRef={bodyScrollRef}
					viewportStyle={sheetStageStyles.bodyScrollViewport}
					contentContainerStyle={[
						sheetStageStyles.bodyScrollContent,
						sheetStageStyles.bodyScrollContentSheet,
						presentationMode === "modal"
							? sheetStageStyles.bodyScrollContentModal
							: null,
						isSidebarPresentation
							? sheetStageStyles.bodyScrollContentPanel
							: null,
						isSidebarPresentation
							? sheetStageStyles.bodyScrollContentSidebar
							: null,
						modalContainedStyle,
						styles.bodyContent,
					]}
					isSidebarPresentation={isSidebarPresentation}
					allowScrollDetents={allowScrollDetents}
					handleBodyWheel={handleBodyWheel}
					onScrollBeginDrag={handleAndroidCollapseScrollBeginDrag}
					onScroll={handleAndroidCollapseScroll}
					onScrollEndDrag={handleBodyScrollEndDrag}
					scrollEnabled={bodyScrollEnabled}
					androidExpandedBodyGesture={androidExpandedBodyGesture}
					androidExpandedBodyStyle={androidExpandedBodyStyle}
				>
					{body}
				</MapStageBodyScroll>
			</MapSheetShell>

			<ServiceRatingModal
				visible={ratingState.visible}
				serviceType={ratingState.serviceType || "visit"}
				title={ratingState.title || "Rate your visit"}
				subtitle={ratingState.subtitle}
				serviceDetails={ratingState.serviceDetails}
				onClose={() =>
					setRatingState({
						visible: false,
						visitId: null,
						completeKind: null,
						serviceType: null,
						title: null,
						subtitle: null,
						serviceDetails: null,
					})
				}
				onSubmit={async ({
					rating,
					comment,
					tipAmount,
					tipCurrency,
				}) => {
					const visitId = ratingState.visitId;
					if (!visitId) return;
					if (ratingState.completeKind === "ambulance") {
						await runBusyAction("complete", onCompleteAmbulanceTrip);
					} else if (ratingState.completeKind === "bed") {
						await runBusyAction("complete", onCompleteBedBooking);
					}
					const nowIso = new Date().toISOString();
					await updateVisit?.(visitId, {
						rating,
						ratingComment: comment,
						ratedAt: nowIso,
						lifecycleState: EMERGENCY_VISIT_LIFECYCLE.RATED,
						lifecycleUpdatedAt: nowIso,
					});
					if (Number(tipAmount) > 0) {
						try {
							await paymentService.processVisitTip(
								visitId,
								Number(tipAmount),
								tipCurrency || "USD",
							);
						} catch (error) {
							console.warn("[MapTracking] Tip processing failed:", error);
						}
					}
					setRatingState({
						visible: false,
						visitId: null,
						completeKind: null,
						serviceType: null,
						title: null,
						subtitle: null,
						serviceDetails: null,
					});
				}}
			/>
		</>
	);
}

import { View, Text, StyleSheet, Pressable, Linking, ActivityIndicator, Platform, Animated } from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../../constants/colors";
import { useTripProgress } from "../../../hooks/emergency/useTripProgress";
import { navigateToBookBed } from "../../../utils/navigationHelpers";
import TriageIntakeModal from "../triage/TriageIntakeModal";

const SummaryCardSurface = ({ isDarkMode, children, style }) => {
	const isAndroid = Platform.OS === "android";
	const shadowLayerColor = isDarkMode ? "rgba(0, 0, 0, 0.22)" : "rgba(15, 23, 42, 0.10)";

	return (
		<View style={styles.cardShell}>
			{isAndroid && (
				<View
					pointerEvents="none"
					style={[styles.cardShadowUnderlay, { backgroundColor: shadowLayerColor }]}
				/>
			)}
			<View
				style={[
					styles.card,
					{
						backgroundColor: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLight,
					},
					style,
				]}
			>
				{children}
			</View>
		</View>
	);
};

const TripSummaryCollapsed = ({ isDarkMode, statusLabel, etaText, telemetryStatusLabel }) => (
	<SummaryCardSurface isDarkMode={isDarkMode} style={styles.collapsedPadding}>
		<View style={styles.headerIsland}>
			<View style={{ flex: 1 }}>
				<Text style={[styles.editorialSubtitle, { color: COLORS.brandPrimary }]}>STATUS</Text>
				<Text style={[styles.editorialTitle, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary, fontSize: 20 }]} numberOfLines={1}>
					{statusLabel.toUpperCase()}
				</Text>
				{telemetryStatusLabel ? (
					<Text style={[styles.telemetryCollapsedText, { color: isDarkMode ? "#FDBA74" : "#B45309" }]}>
						{telemetryStatusLabel}
					</Text>
				) : null}
			</View>
			<View style={styles.etaBadge}>
				<Text style={[styles.etaValue, { fontSize: etaText?.length > 5 ? 14 : 22 }]}>{etaText}</Text>
				{!etaText?.toLowerCase()?.includes('min') && !etaText?.toLowerCase()?.includes('s') && (
					<Text style={styles.etaUnit}>MINS</Text>
				)}
			</View>
		</View>
	</SummaryCardSurface>
);

const TripSummaryHalf = (props) => {
	const {
		isDarkMode,
		statusLabel,
		etaText,
		tripProgress,
		driverName,
		rating,
		vehicle,
		assigned,
		callTarget,
		isBusy,
		busyAction,
		showMarkArrived,
		showComplete,
		showSecondaryCta,
		secondaryCtaLabel,
		telemetryState,
		telemetryStatusLabel,
		telemetryMetaText,
	} = props;
	const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
	const mutedColor = isDarkMode ? COLORS.textMutedDark : COLORS.textMuted;
	const showTelemetryAlert = telemetryState === "stale" || telemetryState === "lost";
	const telemetryTone = telemetryState === "lost"
		? {
			bg: isDarkMode ? "rgba(127, 29, 29, 0.38)" : "rgba(254, 226, 226, 0.9)",
			icon: isDarkMode ? "#FCA5A5" : "#B91C1C",
			text: isDarkMode ? "#FCA5A5" : "#B91C1C",
		}
		: {
			bg: isDarkMode ? "rgba(146, 64, 14, 0.34)" : "rgba(255, 237, 213, 0.92)",
			icon: isDarkMode ? "#FDBA74" : "#B45309",
			text: isDarkMode ? "#FDBA74" : "#B45309",
		};

	return (
		<SummaryCardSurface isDarkMode={isDarkMode}>
			{/* IDENTITY ISLAND */}
			<View style={styles.headerIsland}>
				<View style={{ flex: 1 }}>
					<Text style={[styles.editorialSubtitle, { color: COLORS.brandPrimary }]}>AMBULANCE STATUS</Text>
					<Text style={[styles.editorialTitle, { color: textColor }]}>{statusLabel.toUpperCase()}</Text>
				</View>
				<View style={styles.etaBadge}>
					<Text style={[styles.etaValue, { fontSize: etaText?.length > 5 ? 14 : 22 }]}>{etaText}</Text>
					{!etaText?.toLowerCase()?.includes('min') && !etaText?.toLowerCase()?.includes('s') && (
						<Text style={styles.etaUnit}>MINS</Text>
					)}
				</View>
			</View>
			{showTelemetryAlert ? (
				<View style={[styles.telemetryAlertPill, { backgroundColor: telemetryTone.bg }]}>
					<Ionicons
						name={telemetryState === "lost" ? "alert-circle-outline" : "time-outline"}
						size={14}
						color={telemetryTone.icon}
					/>
					<Text style={[styles.telemetryAlertText, { color: telemetryTone.text }]}>
						{telemetryStatusLabel}
					</Text>
				</View>
			) : null}

			{/* VITAL SIGNAL TRACK - Hide if pending since no trip has started */}
			{!props.isPending && (
				<View style={styles.vitalTrack}>
					<View style={[styles.vitalFill, { width: `${(tripProgress ?? 0) * 100}%` }]} />
					<Animated.View
						style={[
							styles.vitalPlow,
							{
								left: `${(tripProgress ?? 0) * 100}%`,
								transform: [{ scale: props.pulseAnim || 1 }]
							}
						]}
					>
						<MaterialCommunityIcons name="ambulance" size={16} color="#FFF" />
					</Animated.View>
				</View>
			)}

			{/* RESPONDER WIDGET */}
			<View style={[styles.identityWidget, { backgroundColor: isDarkMode ? COLORS.bgDark : "rgba(0,0,0,0.03)" }]}>
				<View style={[styles.squircleAvatar, { backgroundColor: COLORS.brandPrimary + '15' }]}>
					<Ionicons name={props.isPending ? "time-outline" : "person"} size={24} color={COLORS.brandPrimary} />
				</View>
				<View style={styles.identityText}>
					<Text style={[styles.nameText, { color: textColor }]}>{driverName}</Text>
						<Text style={[styles.metaText, { color: mutedColor }]}>
							{props.isPending ? "Cash payment verification" : (telemetryMetaText || `${rating} - ${vehicle}`)}
						</Text>
				</View>
				{!props.isPending && (
					<View style={styles.plateBadge}>
						<Text style={styles.plateText}>{assigned?.vehicleNumber || "IVISIT"}</Text>
					</View>
				)}
			</View>

			{/* ACTION GRID */}
			<View style={styles.actionGrid}>
				{callTarget && !props.isPending && (
					<Pressable onPress={props.onPressCall ?? (() => Linking.openURL(callTarget))} style={styles.iconAction}>
						<Ionicons name="call" size={22} color={COLORS.brandPrimary} />
					</Pressable>
				)}
				<Pressable onPress={props.onPressCancel ?? props.onCancelAmbulanceTrip} style={styles.cancelAction}>
					{busyAction === "cancel" ? <ActivityIndicator size="small" color={COLORS.brandPrimary} /> : <Text style={[styles.cancelActionText, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>CANCEL</Text>}
				</Pressable>
				{(showMarkArrived || showComplete) && !props.isPending && (
					<Pressable onPress={showMarkArrived ? (props.onPressArrived ?? props.onMarkAmbulanceArrived) : (props.onPressComplete ?? props.onCompleteAmbulanceTrip)} style={styles.completeAction}>
						{isBusy && (busyAction === 'arrived' || busyAction === 'complete') ? (
							<ActivityIndicator size="small" color="#FFF" />
						) : (
							<Text style={styles.completeActionText}>{showMarkArrived ? "MARK ARRIVED" : "COMPLETE"}</Text>
						)}
					</Pressable>
				)}
			</View>

			{
				showSecondaryCta && (
					<Pressable onPress={props.onPressSecondaryCta} style={styles.secondaryCta}>
						<Text style={[styles.secondaryCtaText, { color: COLORS.brandPrimary }]}>{secondaryCtaLabel ?? "BOOK BED"}</Text>
					</Pressable>
				)
			}

			{props.showTriageLane ? (
				<Pressable onPress={props.onPressTriage} style={styles.triageCta}>
					<Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.brandPrimary} />
					<Text style={styles.triageCtaText}>
						Continue Guided Intake
					</Text>
				</Pressable>
			) : null}
		</SummaryCardSurface >
	);
};

// ... TripSummaryFull follows the same structural pattern as Half but includes the Ambulance Image section ...
// Exported Component remains the same logic-wise
export const TripSummaryCard = ({
	activeAmbulanceTrip,
	ambulanceTelemetryHealth = null,
	hasOtherActiveVisit,
	allHospitals = [],
	onCancelAmbulanceTrip,
	onMarkAmbulanceArrived,
	onCompleteAmbulanceTrip,
	isDarkMode,
	sheetPhase,
}) => {
	const router = useRouter();
	const collapsed = sheetPhase === "collapsed";
	const [nowMs, setNowMs] = useState(Date.now());
	const [busyAction, setBusyAction] = useState(null);
	const [triageModalVisible, setTriageModalVisible] = useState(false);
	const [triageDraft, setTriageDraft] = useState(null);
	const pulseAnim = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		if (collapsed) return;

		// 1. Progress Timer
		const id = setInterval(() => setNowMs(Date.now()), 1000);

		// 2. Pulse Animation
		Animated.loop(
			Animated.sequence([
				Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
				Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
			])
		).start();

		return () => clearInterval(id);
	}, [collapsed, activeAmbulanceTrip?.requestId]);

	const assigned = activeAmbulanceTrip?.assignedAmbulance ?? null;
	const tripHospital = activeAmbulanceTrip?.hospitalId && Array.isArray(allHospitals) ? allHospitals.find((h) => h?.id === activeAmbulanceTrip.hospitalId) : null;
	const { tripProgress, computedStatus, formattedRemaining } = useTripProgress({ activeAmbulanceTrip, nowMs });

	const callTarget = useMemo(() => {
		const phone = tripHospital?.phone;
		return phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : null;
	}, [tripHospital?.phone]);

	const isPending = activeAmbulanceTrip?.status === "pending_approval";
	const telemetryState = ambulanceTelemetryHealth?.state ?? "inactive";
	const telemetryAgeLabel = ambulanceTelemetryHealth?.ageLabel ?? null;
	const telemetryStatusLabel =
		telemetryState === "lost"
			? `Tracking lost${telemetryAgeLabel ? ` (${telemetryAgeLabel})` : ""}`
			: telemetryState === "stale"
				? `Tracking delayed${telemetryAgeLabel ? ` (${telemetryAgeLabel})` : ""}`
				: null;
	const displayStatus = isPending
		? "Awaiting Approval"
		: (activeAmbulanceTrip?.status === "arrived"
			? "Arrived"
			: (telemetryState === "lost"
				? "Signal Lost"
				: telemetryState === "stale"
					? "Signal Delayed"
					: (computedStatus || "En Route")));
	const etaText = telemetryState === "lost" && !isPending ? "--" : formattedRemaining;
	const canAdvanceTripStatus = telemetryState !== "lost";
	const driverName =
		assigned?.crew?.[0] ||
		assigned?.name ||
		assigned?.callSign ||
		assigned?.vehicleNumber ||
		assigned?.type ||
		(isPending ? "Waiting for Hospital" : "Responder");
	const triageRequestId = activeAmbulanceTrip?.id ?? activeAmbulanceTrip?.requestId ?? null;
	const triageRequestContext = useMemo(
		() => ({
			serviceType: "ambulance",
			specialty: tripHospital?.specialty ?? null,
			hospitalId: activeAmbulanceTrip?.hospitalId ?? null,
			hospitalName: tripHospital?.name ?? activeAmbulanceTrip?.hospitalName ?? null,
			requestId: activeAmbulanceTrip?.requestId ?? null,
		}),
		[
			tripHospital?.specialty,
			tripHospital?.name,
			activeAmbulanceTrip?.hospitalId,
			activeAmbulanceTrip?.hospitalName,
			activeAmbulanceTrip?.requestId,
		]
	);
	const initialTriageDraft = activeAmbulanceTrip?.triage?.signals?.userCheckin ?? null;

	useEffect(() => {
		setTriageDraft(initialTriageDraft);
	}, [triageRequestId, initialTriageDraft]);

	if (collapsed) {
		return (
			<TripSummaryCollapsed
				isDarkMode={isDarkMode}
				statusLabel={displayStatus}
				etaText={etaText}
				telemetryStatusLabel={telemetryStatusLabel}
			/>
		);
	}

	return (
		<>
			<TripSummaryHalf
				{...{
					isDarkMode,
					statusLabel: displayStatus,
					etaText,
					tripProgress,
					driverName,
					rating: assigned?.rating || "4.8",
					vehicle: assigned?.plate || assigned?.vehicleNumber || assigned?.callSign || assigned?.type || "Ambulance",
					assigned,
					callTarget,
					isBusy: !!busyAction,
					busyAction,
					computedStatus,
					pulseAnim,
					isPending,
					telemetryState,
					telemetryStatusLabel,
					telemetryMetaText: telemetryStatusLabel ? "ETA may shift until signal returns" : null,
					showTriageLane: !!triageRequestId,
					triageRequestId,
					triageRequestContext,
					hospitalsForTriage: Array.isArray(allHospitals) ? allHospitals : [],
					initialTriageDraft,
				}}
				showMarkArrived={canAdvanceTripStatus && computedStatus === "Arrived" && activeAmbulanceTrip?.status !== "arrived" && !isPending}
				showComplete={activeAmbulanceTrip?.status === "arrived" && !isPending}
				onCancelAmbulanceTrip={onCancelAmbulanceTrip}
				onMarkAmbulanceArrived={() => {
					setBusyAction('arrived');
					onMarkAmbulanceArrived().finally(() => setBusyAction(null));
				}}
				onCompleteAmbulanceTrip={() => {
					setBusyAction('complete');
					onCompleteAmbulanceTrip().finally(() => setBusyAction(null));
				}}
				showSecondaryCta={!hasOtherActiveVisit}
				onPressSecondaryCta={() => navigateToBookBed({ router, hospitalId: activeAmbulanceTrip.hospitalId })}
				onPressTriage={() => setTriageModalVisible(true)}
			/>

			{triageRequestId ? (
				<TriageIntakeModal
					visible={triageModalVisible}
					onClose={() => setTriageModalVisible(false)}
					phase="waiting"
					requestId={triageRequestId}
					requestContext={triageRequestContext}
					hospitals={Array.isArray(allHospitals) ? allHospitals : []}
					selectedHospitalId={triageRequestContext?.hospitalId || null}
					initialDraft={triageDraft}
					onDraftChange={setTriageDraft}
					isDarkMode={isDarkMode}
				/>
			) : null}
		</>
	);
};

const styles = StyleSheet.create({
	cardShell: {
		position: "relative",
		marginHorizontal: 8,
		marginBottom: 16,
		borderRadius: 36,
	},
	cardShadowUnderlay: {
		position: "absolute",
		top: 2,
		left: 0,
		right: 0,
		bottom: -2,
		borderRadius: 36,
	},
	card: {
		borderRadius: 36,
		padding: 24,
		shadowColor: COLORS.brandPrimary,
		shadowOffset: { width: 0, height: 12 },
		shadowOpacity: Platform.OS === "android" ? 0 : 0.15,
		shadowRadius: Platform.OS === "android" ? 0 : 20,
		elevation: Platform.OS === "android" ? 0 : 10,
	},
	collapsedPadding: { paddingVertical: 16 },
	headerIsland: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
	editorialSubtitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
	editorialTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -1.2 },
	telemetryCollapsedText: { marginTop: 4, fontSize: 11, fontWeight: "700" },
	etaBadge: { backgroundColor: COLORS.brandPrimary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, alignItems: 'center', minWidth: 65 },
	etaValue: { color: '#FFF', fontSize: 22, fontWeight: '900' },
	etaUnit: { color: 'rgba(255,255,255,0.7)', fontSize: 8, fontWeight: '900', marginTop: -2 },
	telemetryAlertPill: {
		marginTop: -8,
		marginBottom: 14,
		borderRadius: 12,
		paddingHorizontal: 10,
		paddingVertical: 7,
		flexDirection: "row",
		alignItems: "center",
	},
	telemetryAlertText: {
		fontSize: 12,
		fontWeight: "700",
		marginLeft: 6,
	},
	vitalTrack: { height: 4, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 2, marginBottom: 24, position: 'relative' },
	vitalFill: { height: '100%', backgroundColor: COLORS.brandPrimary, borderRadius: 2 },
	vitalPlow: {
		position: 'absolute',
		top: -10,
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: COLORS.brandPrimary,
		borderWidth: 2,
		borderColor: '#FFF',
		shadowColor: COLORS.brandPrimary,
		shadowOpacity: 0.5,
		shadowRadius: 5,
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: -12, // Center the circle on the progress line
	},
	identityWidget: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, marginBottom: 20 },
	squircleAvatar: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
	identityText: { flex: 1, marginLeft: 14 },
	nameText: { fontSize: 17, fontWeight: '900', letterSpacing: -0.5 },
	metaText: { fontSize: 12, fontWeight: '600' },
	plateBadge: { backgroundColor: COLORS.brandPrimary + '10', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
	plateText: { color: COLORS.brandPrimary, fontSize: 12, fontWeight: '900' },
	actionGrid: { flexDirection: 'row', gap: 12 },
	iconAction: { width: 56, height: 56, borderRadius: 20, backgroundColor: COLORS.brandPrimary + '10', alignItems: 'center', justifyContent: 'center' },
	cancelAction: { flex: 1, height: 56, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
	cancelActionText: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
	completeAction: { flex: 1.5, height: 56, borderRadius: 20, backgroundColor: COLORS.brandPrimary, alignItems: 'center', justifyContent: 'center' },
	completeActionText: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
	secondaryCta: { marginTop: 12, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.brandPrimary + '08' },
	secondaryCtaText: { fontSize: 13, fontWeight: '900' },
	triageCta: {
		marginTop: 12,
		height: 44,
		borderRadius: 22,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: COLORS.brandPrimary + "0F",
		flexDirection: "row",
	},
	triageCtaText: {
		marginLeft: 8,
		fontSize: 13,
		fontWeight: "900",
		color: COLORS.brandPrimary,
	},
});

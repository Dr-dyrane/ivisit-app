import { View, Text, StyleSheet, Pressable, Linking, Image, ActivityIndicator, Platform } from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { COLORS } from "../../../constants/colors";
import { AMBULANCE_STATUSES, AMBULANCE_TYPES } from "../../../constants/emergency";
import { useTripProgress } from "../../../hooks/emergency/useTripProgress";
import { navigateToBookBed } from "../../../utils/navigationHelpers";

const TripSummaryCollapsed = ({ isDarkMode, statusLabel, etaText, tripHospital, callSign }) => (
	<View style={[styles.card, styles.collapsedPadding, { backgroundColor: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLight }]}>
		<View style={styles.headerIsland}>
			<View style={{ flex: 1 }}>
				<Text style={[styles.editorialSubtitle, { color: COLORS.brandPrimary }]}>STATUS</Text>
				<Text style={[styles.editorialTitle, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary, fontSize: 20 }]} numberOfLines={1}>
					{statusLabel.toUpperCase()}
				</Text>
			</View>
			<View style={styles.etaBadge}>
				<Text style={styles.etaValue}>{etaText}</Text>
				<Text style={styles.etaUnit}>MIN</Text>
			</View>
		</View>
	</View>
);

const TripSummaryHalf = (props) => {
	const { isDarkMode, statusLabel, etaText, tripProgress, driverName, rating, vehicle, assigned, callTarget, isBusy, busyAction, showMarkArrived, showComplete, showSecondaryCta, secondaryCtaLabel, computedStatus } = props;
	const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
	const mutedColor = isDarkMode ? COLORS.textMutedDark : COLORS.textMuted;

	return (
		<View style={[styles.card, { backgroundColor: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLight }]}>
			{/* IDENTITY ISLAND */}
			<View style={styles.headerIsland}>
				<View style={{ flex: 1 }}>
					<Text style={[styles.editorialSubtitle, { color: COLORS.brandPrimary }]}>AMBULANCE STATUS</Text>
					<Text style={[styles.editorialTitle, { color: textColor }]}>{statusLabel.toUpperCase()}</Text>
				</View>
				<View style={styles.etaBadge}>
					<Text style={styles.etaValue}>{etaText}</Text>
					<Text style={styles.etaUnit}>MIN</Text>
				</View>
			</View>

			{/* VITAL SIGNAL TRACK */}
			<View style={styles.vitalTrack}>
				<View style={[styles.vitalFill, { width: `${(tripProgress ?? 0) * 100}%` }]} />
				<View style={[styles.vitalPlow, { left: `${(tripProgress ?? 0) * 100}%` }]} />
			</View>

			{/* RESPONDER WIDGET */}
			<View style={[styles.identityWidget, { backgroundColor: isDarkMode ? COLORS.bgDark : "rgba(0,0,0,0.03)" }]}>
				<View style={[styles.squircleAvatar, { backgroundColor: COLORS.brandPrimary + '15' }]}>
					<Ionicons name="person" size={24} color={COLORS.brandPrimary} />
				</View>
				<View style={styles.identityText}>
					<Text style={[styles.nameText, { color: textColor }]}>{driverName}</Text>
					<Text style={[styles.metaText, { color: mutedColor }]}>{rating} ★ • {vehicle}</Text>
				</View>
				<View style={styles.plateBadge}>
					<Text style={styles.plateText}>{assigned?.vehicleNumber || "IVISIT"}</Text>
				</View>
			</View>

			{/* ACTION GRID */}
			<View style={styles.actionGrid}>
				{callTarget && (
					<Pressable onPress={props.onPressCall ?? (() => Linking.openURL(callTarget))} style={styles.iconAction}>
						<Ionicons name="call" size={22} color={COLORS.brandPrimary} />
					</Pressable>
				)}
				<Pressable onPress={props.onPressCancel ?? props.onCancelAmbulanceTrip} style={styles.cancelAction}>
					{busyAction === "cancel" ? <ActivityIndicator size="small" color={COLORS.brandPrimary} /> : <Text style={[styles.cancelActionText, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>CANCEL</Text>}
				</Pressable>
				{(showMarkArrived || showComplete) && (
					<Pressable onPress={showMarkArrived ? (props.onPressArrived ?? props.onMarkAmbulanceArrived) : (props.onPressComplete ?? props.onCompleteAmbulanceTrip)} style={styles.completeAction}>
						{isBusy && (busyAction === 'arrived' || busyAction === 'complete') ? (
							<ActivityIndicator size="small" color="#FFF" />
						) : (
							<Text style={styles.completeActionText}>{showMarkArrived ? "MARK ARRIVED" : "COMPLETE"}</Text>
						)}
					</Pressable>
				)}
			</View>

			{showSecondaryCta && (
				<Pressable onPress={props.onPressSecondaryCta} style={styles.secondaryCta}>
					<Text style={[styles.secondaryCtaText, { color: COLORS.brandPrimary }]}>{secondaryCtaLabel ?? "BOOK BED"}</Text>
				</Pressable>
			)}
		</View>
	);
};

// ... TripSummaryFull follows the same structural pattern as Half but includes the Ambulance Image section ...
// Exported Component remains the same logic-wise
export const TripSummaryCard = ({ activeAmbulanceTrip, hasOtherActiveVisit, allHospitals = [], onCancelAmbulanceTrip, onMarkAmbulanceArrived, onCompleteAmbulanceTrip, isDarkMode, sheetPhase }) => {
	const router = useRouter();
	const collapsed = sheetPhase === "collapsed";
	const expanded = sheetPhase === "full";
	const [nowMs, setNowMs] = useState(Date.now());
	const [busyAction, setBusyAction] = useState(null);
	const mountedRef = useRef(true);

	useEffect(() => {
		if (!activeAmbulanceTrip?.requestId || collapsed) return;
		const id = setInterval(() => setNowMs(Date.now()), 1000);
		return () => clearInterval(id);
	}, [activeAmbulanceTrip?.requestId, collapsed]);

	const assigned = activeAmbulanceTrip?.assignedAmbulance ?? null;
	const tripHospital = activeAmbulanceTrip?.hospitalId && Array.isArray(allHospitals) ? allHospitals.find((h) => h?.id === activeAmbulanceTrip.hospitalId) : null;
	const { tripProgress, computedStatus, formattedRemaining } = useTripProgress({ activeAmbulanceTrip, nowMs });

	const callTarget = useMemo(() => {
		const phone = tripHospital?.phone;
		return phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : null;
	}, [tripHospital?.phone]);

	const displayStatus = activeAmbulanceTrip?.status === "arrived" ? "Arrived" : (computedStatus || "En Route");
	const driverName = assigned?.crew?.[0] || assigned?.name || "Responder";

	if (collapsed) return <TripSummaryCollapsed isDarkMode={isDarkMode} statusLabel={displayStatus} etaText={formattedRemaining} callSign={assigned?.callSign} />;

	return <TripSummaryHalf
		{...{ isDarkMode, statusLabel: displayStatus, etaText: formattedRemaining, tripProgress, driverName, rating: assigned?.rating || "4.8", vehicle: assigned?.plate, assigned, callTarget, isBusy: !!busyAction, busyAction, computedStatus }}
		showMarkArrived={computedStatus === "Arrived" && activeAmbulanceTrip?.status !== "arrived"}
		showComplete={activeAmbulanceTrip?.status === "arrived"}
		onCancelAmbulanceTrip={onCancelAmbulanceTrip}
		onMarkAmbulanceArrived={() => {
			console.log("[TripSummaryCard] MARK ARRIVED pressed");
			setBusyAction('arrived');
			onMarkAmbulanceArrived().finally(() => setBusyAction(null));
		}}
		onCompleteAmbulanceTrip={() => {
			console.log("[TripSummaryCard] COMPLETE pressed");
			setBusyAction('complete');
			onCompleteAmbulanceTrip().finally(() => setBusyAction(null));
		}}
		showSecondaryCta={!hasOtherActiveVisit}
		onPressSecondaryCta={() => navigateToBookBed({ router, hospitalId: activeAmbulanceTrip.hospitalId })}
	/>;
};

const styles = StyleSheet.create({
	card: {
		borderRadius: 36,
		padding: 24,
		marginHorizontal: 8,
		marginBottom: 16,
		shadowColor: COLORS.brandPrimary,
		shadowOffset: { width: 0, height: 12 },
		shadowOpacity: 0.15,
		shadowRadius: 20,
		elevation: 10,
	},
    collapsedPadding: { paddingVertical: 16 },
	headerIsland: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
	editorialSubtitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
	editorialTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -1.2 },
	etaBadge: { backgroundColor: COLORS.brandPrimary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, alignItems: 'center', minWidth: 65 },
	etaValue: { color: '#FFF', fontSize: 22, fontWeight: '900' },
	etaUnit: { color: 'rgba(255,255,255,0.7)', fontSize: 8, fontWeight: '900', marginTop: -2 },
	vitalTrack: { height: 4, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 2, marginBottom: 24, position: 'relative' },
	vitalFill: { height: '100%', backgroundColor: COLORS.brandPrimary, borderRadius: 2 },
	vitalPlow: { position: 'absolute', top: -4, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.brandPrimary, borderWidth: 3, borderColor: '#FFF', shadowColor: COLORS.brandPrimary, shadowOpacity: 0.5, shadowRadius: 5 },
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
    secondaryCtaText: { fontSize: 13, fontWeight: '900' }
});
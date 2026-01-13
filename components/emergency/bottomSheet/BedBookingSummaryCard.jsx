import { View, Text, StyleSheet, Pressable, Linking, ActivityIndicator } from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons, Fontisto } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { COLORS } from "../../../constants/colors";
import { useBedBookingProgress } from "../../../hooks/emergency/useBedBookingProgress";
import { navigateToRequestAmbulance } from "../../../utils/navigationHelpers";

const BedBookingSummaryHalf = (props) => {
	const { isDarkMode, statusLabel, etaText, hospitalName, bedType, bedNumber, specialty, bedProgress, isBusy, busyAction, showMarkOccupied, showComplete, showSecondaryCta, secondaryCtaLabel } = props;
	const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;

	return (
		<View style={[styles.card, { backgroundColor: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLight }]}>
			{/* LUXURY RESERVATION HEADER */}
			<View style={styles.headerIsland}>
				<View style={{ flex: 1 }}>
					<Text style={[styles.editorialSubtitle, { color: COLORS.brandPrimary }]}>RESERVATION</Text>
					<Text style={[styles.editorialTitle, { color: textColor }]}>{statusLabel.toUpperCase()}</Text>
				</View>
				<View style={styles.etaBadge}>
					<Text style={styles.etaValue}>{bedNumber}</Text>
					<Text style={styles.etaUnit}>BED</Text>
				</View>
			</View>

			<View style={styles.vitalTrack}>
				<View style={[styles.vitalFill, { width: `${(bedProgress ?? 0) * 100}%` }]} />
				<View style={[styles.vitalPlow, { left: `${(bedProgress ?? 0) * 100}%` }]} />
			</View>

			{/* BED IDENTITY WIDGET */}
			<View style={[styles.identityWidget, { backgroundColor: isDarkMode ? COLORS.bgDark : "rgba(0,0,0,0.03)" }]}>
				<View style={[styles.squircleAvatar, { backgroundColor: COLORS.brandPrimary + '15' }]}>
					<Fontisto name="bed-patient" size={22} color={COLORS.brandPrimary} />
				</View>
				<View style={styles.identityText}>
					<Text style={[styles.nameText, { color: textColor }]}>{bedType}</Text>
					<Text style={[styles.metaText, { color: COLORS.textMuted }]}>{hospitalName} • {specialty}</Text>
				</View>
			</View>

			{/* ACTIONS */}
			<View style={styles.actionGrid}>
				<Pressable onPress={props.onPressCall} style={styles.iconAction}>
					<Ionicons name="call" size={22} color={COLORS.brandPrimary} />
				</Pressable>
				<Pressable onPress={props.onCancelBedBooking} style={styles.cancelAction}>
					{busyAction === 'cancel' ? <ActivityIndicator size="small" color={COLORS.brandPrimary} /> : <Text style={[styles.cancelActionText, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>CANCEL</Text>}
				</Pressable>
				{(showMarkOccupied || showComplete) && (
					<Pressable onPress={showMarkOccupied ? props.onMarkBedOccupied : props.onCompleteBedBooking} style={styles.completeAction}>
						{isBusy && (busyAction === 'occupied' || busyAction === 'complete') ? (
							<ActivityIndicator size="small" color="#FFF" />
						) : (
							<Text style={styles.completeActionText}>{showMarkOccupied ? "CHECK-IN" : "FINISH"}</Text>
						)}
					</Pressable>
				)}
			</View>
		</View>
	);
};

export const BedBookingSummaryCard = ({ activeBedBooking, hasOtherActiveVisit, allHospitals = [], onCancelBedBooking, onMarkBedOccupied, onCompleteBedBooking, isDarkMode, sheetPhase }) => {
	const router = useRouter();
	const collapsed = sheetPhase === "collapsed";
	const [nowMs, setNowMs] = useState(Date.now());
	const [busyAction, setBusyAction] = useState(null);
	
	useEffect(() => {
		if (!activeBedBooking?.requestId || collapsed) return;
		const id = setInterval(() => setNowMs(Date.now()), 1000);
		return () => clearInterval(id);
	}, [activeBedBooking?.requestId, collapsed]);

	const { bedProgress, bedStatus, formattedBedRemaining } = useBedBookingProgress({ activeBedBooking, nowMs });
	const hospitalName = activeBedBooking?.hospitalName || "Hospital";

	const displayStatus = activeBedBooking?.status === "arrived" ? "Occupied" : (bedStatus || "Confirmed");
	
	return <BedBookingSummaryHalf 
        {...{isDarkMode, statusLabel: displayStatus, hospitalName, bedType: "Private Suite", bedNumber: activeBedBooking?.bedNumber || "TBA", bedProgress, isBusy: !!busyAction, busyAction}}
        showMarkOccupied={bedStatus === "Ready" && activeBedBooking?.status !== "arrived"}
        showComplete={activeBedBooking?.status === "arrived"}
        onCancelBedBooking={() => {
            setBusyAction('cancel');
            onCancelBedBooking().finally(() => setBusyAction(null));
        }}
        onMarkBedOccupied={() => {
            console.log("[BedBookingSummaryCard] CHECK-IN pressed");
            setBusyAction('occupied');
            onMarkBedOccupied().finally(() => setBusyAction(null));
        }}
        onCompleteBedBooking={() => {
            setBusyAction('complete');
            onCompleteBedBooking().finally(() => setBusyAction(null));
        }}
        showSecondaryCta={!hasOtherActiveVisit}
        onPressSecondaryCta={() => navigateToRequestAmbulance({ router, hospitalId: activeBedBooking.hospitalId })}
    />;
};

// CONSOLIDATED SHARED STYLES
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

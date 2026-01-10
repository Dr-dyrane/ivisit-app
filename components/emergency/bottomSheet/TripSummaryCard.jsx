import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../../constants/colors";
import { AMBULANCE_STATUSES } from "../../../constants/emergency";
import { useTripProgress } from "../../../hooks/emergency/useTripProgress";

export const TripSummaryCard = ({
	activeAmbulanceTrip,
	allHospitals = [],
	onCancelAmbulanceTrip,
	onCompleteAmbulanceTrip,
	isDarkMode,
	isCollapsed,
	nowMs = Date.now(),
}) => {
	const assigned = activeAmbulanceTrip?.assignedAmbulance ?? null;
	const tripHospital =
		activeAmbulanceTrip?.hospitalId && Array.isArray(allHospitals)
			? allHospitals.find((h) => h?.id === activeAmbulanceTrip.hospitalId) ?? null
			: null;
	const statusMeta = assigned?.status ? AMBULANCE_STATUSES[assigned.status] : null;

	const { tripProgress, computedStatus, formattedRemaining } = useTripProgress({
		activeAmbulanceTrip,
		nowMs,
	});

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
		const phoneRaw = tripHospital?.phone ?? null;
		const normalized = normalizePhone(phoneRaw);
		return normalized ? `tel:${normalized}` : null;
	}, [normalizePhone, tripHospital?.phone]);

	const smsTarget = useMemo(() => {
		const phoneRaw = tripHospital?.phone ?? null;
		const normalized = normalizePhone(phoneRaw);
		return normalized ? `sms:${normalized}` : null;
	}, [normalizePhone, tripHospital?.phone]);

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
								color: isDarkMode ? "rgba(255,255,255,0.72)" : "rgba(15,23,42,0.60)",
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
									color: isDarkMode ? "rgba(255,255,255,0.70)" : "rgba(15,23,42,0.60)",
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
									color: isDarkMode ? "rgba(255,255,255,0.70)" : "rgba(15,23,42,0.60)",
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
									color: isDarkMode ? "rgba(255,255,255,0.70)" : "rgba(15,23,42,0.60)",
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
								color: isDarkMode ? "rgba(255,255,255,0.55)" : "rgba(15,23,42,0.55)",
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
								color: isDarkMode ? "rgba(255,255,255,0.55)" : "rgba(15,23,42,0.55)",
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
								color: isDarkMode ? "rgba(255,255,255,0.70)" : "rgba(15,23,42,0.60)",
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
										backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
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
								<Text style={[styles.tripCancelText, { color: "#10B981" }]}>
									Mark complete
								</Text>
							</Pressable>
						</View>
					</View>
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
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
		fontWeight: "400",
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
		fontWeight: "400",
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
});

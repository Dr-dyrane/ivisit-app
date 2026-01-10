import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../../constants/colors";
import { useBedBookingProgress } from "../../../hooks/emergency/useBedBookingProgress";

export const BedBookingSummaryCard = ({
	activeBedBooking,
	allHospitals = [],
	onCancelBedBooking,
	onCompleteBedBooking,
	isDarkMode,
	isCollapsed,
	nowMs = Date.now(),
}) => {
	const bookingHospital =
		activeBedBooking?.hospitalId && Array.isArray(allHospitals)
			? allHospitals.find((h) => h?.id === activeBedBooking.hospitalId) ?? null
			: null;

	const { bedProgress, bedStatus, formattedBedRemaining } = useBedBookingProgress({
		activeBedBooking,
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
		const phoneRaw = bookingHospital?.phone ?? null;
		const normalized = normalizePhone(phoneRaw);
		return normalized ? `tel:${normalized}` : null;
	}, [normalizePhone, bookingHospital?.phone]);

	const smsTarget = useMemo(() => {
		const phoneRaw = bookingHospital?.phone ?? null;
		const normalized = normalizePhone(phoneRaw);
		return normalized ? `sms:${normalized}` : null;
	}, [normalizePhone, bookingHospital?.phone]);

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
								color: isDarkMode ? "rgba(255,255,255,0.72)" : "rgba(15,23,42,0.60)",
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
									color: isDarkMode ? "rgba(255,255,255,0.70)" : "rgba(15,23,42,0.60)",
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
									color: isDarkMode ? "rgba(255,255,255,0.70)" : "rgba(15,23,42,0.60)",
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
									color: isDarkMode ? "rgba(255,255,255,0.70)" : "rgba(15,23,42,0.60)",
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
								color: isDarkMode ? "rgba(255,255,255,0.55)" : "rgba(15,23,42,0.55)",
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
								color: isDarkMode ? "rgba(255,255,255,0.55)" : "rgba(15,23,42,0.55)",
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
								color: isDarkMode ? "rgba(255,255,255,0.70)" : "rgba(15,23,42,0.60)",
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

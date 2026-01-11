import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../../constants/colors";
import { useBedBookingProgress } from "../../../hooks/emergency/useBedBookingProgress";

const BedBookingSummaryCollapsed = ({
	isDarkMode,
	statusLabel,
	etaText,
	hospitalName,
	bedNumber,
}) => {
	return (
		<View
			style={[
				styles.collapsedContainer,
				{
					backgroundColor: isDarkMode ? "#1A2333" : "#FFFFFF",
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: isDarkMode ? 0.35 : 0.08,
					shadowRadius: 12,
					elevation: 5,
				},
			]}
		>
			<View style={styles.collapsedRow}>
				<View style={{ flex: 1, paddingRight: 10 }}>
					<Text
						style={[
							styles.statusTitle,
							{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
						]}
						numberOfLines={1}
					>
						{statusLabel}
					</Text>
					<Text
						style={[
							styles.statusSub,
							{
								color: isDarkMode
									? "rgba(255,255,255,0.65)"
									: "rgba(15,23,42,0.6)",
							},
						]}
						numberOfLines={1}
					>
						{hospitalName} • {bedNumber}
					</Text>
				</View>
				<View style={styles.etaContainer}>
					<Text style={[styles.etaTime, { color: COLORS.textLight }]}>{etaText}</Text>
					<Text style={[styles.etaLabel, { color: "rgba(255,255,255,0.8)" }]}>min</Text>
				</View>
			</View>
		</View>
	);
};

const BedBookingSummaryFull = ({
	isDarkMode,
	statusLabel,
	etaText,
	hospitalName,
	bedType,
	bedCount,
	bedNumber,
	specialty,
	callTarget,
	onCancelBedBooking,
	showComplete,
	onCompleteBedBooking,
}) => {
	return (
		<View style={[styles.fullContainer, { backgroundColor: isDarkMode ? "#121826" : "#FFFFFF" }]}>
			<View style={[styles.fullHeader, { backgroundColor: COLORS.brandPrimary }]}
			>
				<View style={{ flex: 1, paddingRight: 12 }}>
					<Text style={[styles.fullStatusTitle, { color: "#FFFFFF" }]} numberOfLines={1}>
						{statusLabel}
					</Text>
					<Text style={[styles.fullStatusSub, { color: "rgba(255,255,255,0.85)" }]} numberOfLines={1}>
						{hospitalName}
					</Text>
				</View>
				<View style={styles.etaContainer}>
					<Text style={[styles.etaTime, { color: COLORS.textLight }]}>{etaText}</Text>
					<Text style={[styles.etaLabel, { color: "rgba(255,255,255,0.8)" }]}>min</Text>
				</View>
			</View>

			<View style={styles.fullBody}>
				<View style={[styles.progressTrack, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#F1F5F9" }]}>
					<View style={[styles.progressBar, { width: "100%", backgroundColor: COLORS.brandPrimary }]} />
				</View>

				<View style={{ marginBottom: 16 }}>
					<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
						<Ionicons name="clipboard-outline" size={18} color={COLORS.brandPrimary} />
						<Text
							style={{
								marginLeft: 10,
								fontSize: 13,
								fontWeight: "500",
								color: isDarkMode ? "rgba(255,255,255,0.75)" : "rgba(15,23,42,0.75)",
							}}
						>
							Reservation: {bedCount} {bedCount === "1" ? "bed" : "beds"} • {bedType}
						</Text>
					</View>
					<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
						<Ionicons name="bed-outline" size={18} color={COLORS.brandPrimary} />
						<Text
							style={{
								marginLeft: 10,
								fontSize: 13,
								fontWeight: "500",
								color: isDarkMode ? "rgba(255,255,255,0.75)" : "rgba(15,23,42,0.75)",
							}}
						>
							Bed: {bedNumber}
						</Text>
					</View>
					<View style={{ flexDirection: "row", alignItems: "center" }}>
						<Ionicons name="medkit-outline" size={18} color={COLORS.brandPrimary} />
						<Text
							style={{
								marginLeft: 10,
								fontSize: 13,
								fontWeight: "500",
								color: isDarkMode ? "rgba(255,255,255,0.75)" : "rgba(15,23,42,0.75)",
							}}
						>
							Specialty: {specialty}
						</Text>
					</View>
				</View>

				<View style={styles.actionsRow}>
					{callTarget && (
						<Pressable
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
								Linking.openURL(callTarget);
							}}
							style={({ pressed }) => [
								styles.actionBtn,
								{
									backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#F1F5F9",
									opacity: pressed ? 0.7 : 1,
								},
							]}
						>
							<Ionicons name="call" size={20} color={isDarkMode ? COLORS.textLight : COLORS.textPrimary} />
						</Pressable>
					)}

					<Pressable
						onPress={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
							onCancelBedBooking?.();
						}}
						style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}
					>
						<Text style={styles.cancelText}>Cancel</Text>
					</Pressable>

					{showComplete && (
						<Pressable
							onPress={onCompleteBedBooking}
							style={({ pressed }) => [styles.completeBtn, { opacity: pressed ? 0.7 : 1 }]}
						>
							<Text style={styles.completeText}>Complete</Text>
						</Pressable>
					)}
				</View>
			</View>
		</View>
	);
};

export const BedBookingSummaryCard = ({
	activeBedBooking,
	allHospitals = [],
	onCancelBedBooking,
	onCompleteBedBooking,
	isDarkMode,
	isCollapsed,
	isExpanded,
	sheetPhase,
	nowMs = Date.now(),
}) => {
	const collapsed = sheetPhase ? sheetPhase === "collapsed" : !!isCollapsed;
	const expanded = sheetPhase ? sheetPhase === "full" : !!isExpanded;

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

	const etaText =
		formattedBedRemaining ??
		activeBedBooking?.estimatedWait ??
		(Number.isFinite(activeBedBooking?.etaSeconds)
			? `${Math.round(activeBedBooking.etaSeconds / 60)}`
			: "--");

	const lifecycleStatus = activeBedBooking?.status ?? null;
	const lifecycleLabel = useMemo(() => {
		switch (String(lifecycleStatus || "")) {
			case "in_progress":
				return "Reserved";
			case "accepted":
				return "Confirmed";
			case "arrived":
				return "Ready";
			default:
				return null;
		}
	}, [lifecycleStatus]);

	const statusLabel = lifecycleLabel ?? bedStatus ?? "Waiting";
	// e.g. "Reserved", "Ready"
	
	const bedNumber = activeBedBooking?.bedNumber ?? "--";
	const bedType = activeBedBooking?.bedType 
		? activeBedBooking.bedType.charAt(0).toUpperCase() + activeBedBooking.bedType.slice(1) + " Bed"
		: "Standard Bed";
	const bedCount = Number.isFinite(activeBedBooking?.bedCount)
		? String(activeBedBooking.bedCount)
		: "1";
	const specialty = activeBedBooking?.specialty ?? "General";
	const hospitalName =
		activeBedBooking?.hospitalName ?? bookingHospital?.name ?? "Hospital";

	const showComplete =
		typeof onCompleteBedBooking === "function" &&
		(statusLabel === "Ready" || bedStatus === "Ready");

	if (collapsed) {
		return (
			<BedBookingSummaryCollapsed
				isDarkMode={isDarkMode}
				statusLabel={statusLabel}
				etaText={etaText}
				hospitalName={hospitalName}
				bedNumber={bedNumber}
			/>
		);
	}

	if (expanded) {
		return (
			<BedBookingSummaryFull
				isDarkMode={isDarkMode}
				statusLabel={statusLabel}
				etaText={etaText}
				hospitalName={hospitalName}
				bedType={bedType}
				bedCount={bedCount}
				bedNumber={bedNumber}
				specialty={specialty}
				callTarget={callTarget}
				onCancelBedBooking={onCancelBedBooking}
				showComplete={showComplete}
				onCompleteBedBooking={onCompleteBedBooking}
			/>
		);
	}

	return (
		<View
			style={[
				styles.container,
				{
					backgroundColor: isDarkMode ? "#1A2333" : "#FFFFFF",
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: isDarkMode ? 0.4 : 0.08,
					shadowRadius: 12,
					elevation: 5,
				},
			]}
		>
			{/* Header: Status & Time */}
			<View style={styles.headerRow}>
				<View>
					<Text style={[styles.statusTitle, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>
						{statusLabel}
					</Text>
					<Text style={[styles.statusSub, { color: isDarkMode ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)" }]}>
						{hospitalName}
					</Text>
				</View>
				<View style={styles.etaContainer}>
					<Text style={[styles.etaTime, { color: COLORS.textLight }]}>
						{etaText}
					</Text>
					<Text style={[styles.etaLabel, { color: "rgba(255,255,255,0.8)" }]}>
						min
					</Text>
				</View>
			</View>

			{!collapsed && (
				<View>
					{/* Progress Bar */}
					<View style={[styles.progressTrack, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#F1F5F9" }]}>
						<View 
							style={[
								styles.progressBar, 
								{ 
									width: `${Math.max(5, (bedProgress ?? 0) * 100)}%`,
									backgroundColor: COLORS.brandPrimary 
								}
							]} 
						/>
					</View>

					{/* Bed Info Row */}
					<View style={styles.driverRow}>
						<View style={[styles.driverAvatar, { backgroundColor: isDarkMode ? "#252D3B" : "#E2E8F0" }]}>
							<Ionicons name="bed" size={24} color={isDarkMode ? "#94A3B8" : "#64748B"} />
						</View>
						
						<View style={styles.driverInfo}>
							<Text style={[styles.driverName, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>
								{bedType}
							</Text>
							<View style={styles.ratingRow}>
								<Text style={[styles.ratingText, { color: isDarkMode ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)" }]}>
									{specialty} • {bedCount} {bedCount === "1" ? "bed" : "beds"}
								</Text>
							</View>
						</View>

						<View style={styles.plateContainer}>
							<Text style={styles.plateText}>{bedNumber}</Text>
						</View>
					</View>
				</View>
			)}

			{/* Actions */}
			<View style={styles.actionsRow}>
				{callTarget && (
					<Pressable
						onPress={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
							Linking.openURL(callTarget);
						}}
						style={({ pressed }) => [
							styles.actionBtn,
							{ 
								backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#F1F5F9",
								opacity: pressed ? 0.7 : 1
							}
						]}
					>
						<Ionicons name="call" size={20} color={isDarkMode ? COLORS.textLight : COLORS.textPrimary} />
					</Pressable>
				)}
				
				<Pressable
					onPress={() => {
						Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
						onCancelBedBooking?.();
					}}
					style={({ pressed }) => [
						styles.cancelBtn,
						{ opacity: pressed ? 0.7 : 1 }
					]}
				>
					<Text style={styles.cancelText}>Cancel Reservation</Text>
				</Pressable>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	collapsedContainer: {
		borderRadius: 18,
		padding: 14,
		marginBottom: 0,
		marginHorizontal: 0,
	},
	collapsedRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	container: {
		borderRadius: 20,
		padding: 20,
		marginBottom: 0,
		marginHorizontal: 0,
	},
	headerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 16,
	},
	statusTitle: {
		fontSize: 22,
		fontWeight: "700",
		letterSpacing: -0.5,
		marginBottom: 4,
	},
	statusSub: {
		fontSize: 14,
		fontWeight: "500",
	},
	etaContainer: {
		backgroundColor: COLORS.brandPrimary,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	etaTime: {
		fontSize: 18,
		fontWeight: "800",
		lineHeight: 22,
	},
	etaLabel: {
		fontSize: 10,
		fontWeight: "600",
		textTransform: "uppercase",
	},
	progressTrack: {
		height: 6,
		borderRadius: 3,
		overflow: "hidden",
		marginBottom: 20,
	},
	progressBar: {
		height: "100%",
		borderRadius: 3,
	},
	driverRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 20,
	},
	driverAvatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	driverInfo: {
		flex: 1,
	},
	driverName: {
		fontSize: 16,
		fontWeight: "700",
		marginBottom: 2,
	},
	ratingRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	ratingText: {
		fontSize: 13,
		fontWeight: "500",
	},
	plateContainer: {
		backgroundColor: "#F1F5F9",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: "#E2E8F0",
	},
	plateText: {
		fontSize: 12,
		fontWeight: "700",
		color: "#475569",
		letterSpacing: 0.5,
	},
	actionsRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	fullContainer: {
		flex: 1,
		borderRadius: 24,
		overflow: "hidden",
		marginBottom: 0,
	},
	fullHeader: {
		paddingHorizontal: 18,
		paddingVertical: 14,
		flexDirection: "row",
		alignItems: "center",
	},
	fullBody: {
		paddingHorizontal: 16,
		paddingTop: 14,
		paddingBottom: 0,
	},
	fullStatusTitle: {
		fontSize: 22,
		fontWeight: "800",
		letterSpacing: -0.5,
		marginBottom: 4,
	},
	fullStatusSub: {
		fontSize: 14,
		fontWeight: "600",
	},
	actionBtn: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
	},
	cancelBtn: {
		flex: 1,
		height: 48,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(239, 68, 68, 0.1)",
	},
	cancelText: {
		color: "#EF4444",
		fontSize: 15,
		fontWeight: "600",
	},
	completeBtn: {
		flex: 1,
		height: 48,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(16, 185, 129, 0.12)",
	},
	completeText: {
		color: "#10B981",
		fontSize: 15,
		fontWeight: "600",
	},
});

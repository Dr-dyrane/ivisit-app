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

	const etaText =
		formattedRemaining ??
		activeAmbulanceTrip?.estimatedArrival ??
		(Number.isFinite(activeAmbulanceTrip?.etaSeconds)
			? `${Math.round(activeAmbulanceTrip.etaSeconds / 60)}`
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
						{tripHospital?.name ?? "Hospital"}
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

			{/* Progress Bar */}
			<View style={[styles.progressTrack, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#F1F5F9" }]}>
				<View 
					style={[
						styles.progressBar, 
						{ 
							width: `${Math.max(5, (tripProgress ?? 0) * 100)}%`,
							backgroundColor: COLORS.brandPrimary 
						}
					]} 
				/>
			</View>

			{/* Driver / Vehicle Info */}
			<View style={styles.driverRow}>
				<View style={[styles.driverAvatar, { backgroundColor: isDarkMode ? "#252D3B" : "#E2E8F0" }]}>
					<Ionicons name="person" size={20} color={isDarkMode ? "#94A3B8" : "#64748B"} />
				</View>
				
				<View style={styles.driverInfo}>
					<Text style={[styles.driverName, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>
						{driverName}
					</Text>
					<View style={styles.ratingRow}>
						<Ionicons name="star" size={12} color="#FBBF24" />
						<Text style={[styles.ratingText, { color: isDarkMode ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)" }]}>
							{rating} • {vehicle}
						</Text>
					</View>
				</View>

				<View style={styles.plateContainer}>
					<Text style={styles.plateText}>{assigned?.vehicleNumber ?? "IVISIT"}</Text>
				</View>
			</View>

			{/* Actions */}
			<View style={styles.actionsRow}>
				{callTarget && (
					<Pressable
						onPress={() => Linking.openURL(callTarget)}
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
					onPress={onCancelAmbulanceTrip}
					style={({ pressed }) => [
						styles.cancelBtn,
						{ opacity: pressed ? 0.7 : 1 }
					]}
				>
					<Text style={styles.cancelText}>Cancel Trip</Text>
				</Pressable>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		borderRadius: 20,
		padding: 20,
		marginBottom: 20,
		marginHorizontal: 4, // Prevent shadow clipping
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
		marginLeft: 4,
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
});

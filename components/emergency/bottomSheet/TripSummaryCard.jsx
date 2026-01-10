import { View, Text, StyleSheet, Pressable, Linking, Image } from "react-native";
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
			
	const callSign = assigned?.callSign ?? assigned?.type ?? "--";
	const vehicle = assigned?.vehicleNumber ?? assigned?.plate ?? "--";
	const rating = Number.isFinite(assigned?.rating) ? assigned.rating.toFixed(1) : "--";
	const statusLabel = computedStatus ?? statusMeta?.label ?? "En Route";
	const driverName =
		Array.isArray(assigned?.crew) && assigned.crew.length > 0
			? assigned.crew[0]
			: assigned?.name ?? "--";

	// Get ambulance type for image and pricing
	const ambulanceType = useMemo(() => {
		if (!assigned?.type) return null;
		return AMBULANCE_TYPES.find(t => t.id === assigned.type) || null;
	}, [assigned?.type]);

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

			{/* Expanded Content */}
			{!isCollapsed && (
				<View>
					{/* Ambulance Type Image & Details */}
					{ambulanceType && (
						<View style={styles.ambulanceSection}>
							<View style={styles.ambulanceImageContainer}>
								<Ionicons 
									name={ambulanceType.icon} 
									size={64} 
									color={COLORS.brandPrimary} 
								/>
							</View>
							<View style={styles.ambulanceInfo}>
								<Text style={[styles.ambulanceTitle, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>
									{ambulanceType.title}
								</Text>
								<Text style={[styles.ambulanceSubtitle, { color: isDarkMode ? "rgba(255,255,255,0.7)" : "rgba(15,23,42,0.7)" }]}>
									{ambulanceType.subtitle}
								</Text>
								<Text style={[styles.ambulancePrice, { color: COLORS.brandPrimary }]}>
									{ambulanceType.price}
								</Text>
							</View>
						</View>
					)}

					{/* Full Crew List */}
					{assigned?.crew && assigned.crew.length > 1 && (
						<View style={styles.crewSection}>
							<Text style={[styles.sectionTitle, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>
								Medical Team
							</Text>
							<View style={styles.crewList}>
								{assigned.crew.map((member, index) => (
									<View key={index} style={styles.crewMemberRow}>
										<Ionicons name="person" size={16} color={isDarkMode ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)"} />
										<Text style={[styles.crewMember, { color: isDarkMode ? "rgba(255,255,255,0.8)" : "rgba(15,23,42,0.8)" }]}>
											{member}
										</Text>
									</View>
								))}
							</View>
						</View>
					)}

					{/* Trip Details */}
					{ambulanceType && (
						<View style={styles.detailsSection}>
							<View style={styles.detailRow}>
								<Ionicons name="cash-outline" size={20} color={COLORS.brandPrimary} />
								<View style={styles.detailText}>
									<Text style={[styles.detailLabel, { color: isDarkMode ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)" }]}>
										Estimated Cost
									</Text>
									<Text style={[styles.detailValue, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>
										{ambulanceType.price}
									</Text>
								</View>
							</View>
							<View style={styles.detailRow}>
								<Ionicons name="time-outline" size={20} color={COLORS.brandPrimary} />
								<View style={styles.detailText}>
									<Text style={[styles.detailLabel, { color: isDarkMode ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)" }]}>
										Estimated ETA
									</Text>
									<Text style={[styles.detailValue, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>
										{ambulanceType.eta}
									</Text>
								</View>
							</View>
						</View>
					)}

					{/* Safety & Support */}
					<View style={styles.safetySection}>
						<Text style={[styles.sectionTitle, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>
							Safety & Support
						</Text>
						<Pressable style={({ pressed }) => [styles.safetyRow, { opacity: pressed ? 0.7 : 1 }]}>
							<Ionicons name="shield-checkmark-outline" size={24} color={isDarkMode ? "rgba(255,255,255,0.8)" : "rgba(15,23,42,0.8)"} />
							<View style={styles.safetyTextContainer}>
								<Text style={[styles.safetyLabel, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>
									Share Trip Status
								</Text>
								<Text style={[styles.safetySublabel, { color: isDarkMode ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)" }]}>
									Let family and friends follow your trip.
								</Text>
							</View>
							<Ionicons name="chevron-forward" size={20} color={isDarkMode ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)"} />
						</Pressable>
						<Pressable style={({ pressed }) => [styles.safetyRow, { opacity: pressed ? 0.7 : 1 }]}>
							<Ionicons name="help-buoy-outline" size={24} color={isDarkMode ? "rgba(255,255,255,0.8)" : "rgba(15,23,42,0.8)"} />
							<View style={styles.safetyTextContainer}>
								<Text style={[styles.safetyLabel, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>
									Emergency Support
								</Text>
								<Text style={[styles.safetySublabel, { color: isDarkMode ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)" }]}>
									Get help in case of an emergency.
								</Text>
							</View>
							<Ionicons name="chevron-forward" size={20} color={isDarkMode ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)"} />
						</Pressable>
					</View>
				</View>
			)}

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
		padding: 24,
		marginBottom: 20,
		marginHorizontal: 0, // Uber-like edge-to-edge card
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 8,
		elevation: 3,
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
	ambulanceSection: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 24,
		paddingVertical: 12,
	},
	ambulanceImageContainer: {
		width: 80,
		height: 80,
		borderRadius: 16,
		backgroundColor: "#F3F4F6",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 16,
	},
	ambulanceInfo: {
		flex: 1,
	},
	ambulanceTitle: {
		fontSize: 16,
		fontWeight: "700",
		marginBottom: 4,
	},
	ambulanceSubtitle: {
		fontSize: 13,
		fontWeight: "500",
		marginBottom: 8,
	},
	ambulancePrice: {
		fontSize: 20,
		fontWeight: "800",
	},
	crewSection: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: "600",
		marginBottom: 12,
		color: "#6B7280",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	crewList: {
		gap: 8,
	},
	crewMemberRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	crewMember: {
		fontSize: 14,
		fontWeight: "500",
	},
	detailsSection: {
		marginBottom: 24,
	},
	detailRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 12,
	},
	detailText: {
		marginLeft: 12,
	},
	detailLabel: {
		fontSize: 13,
		fontWeight: "500",
		marginBottom: 2,
	},
	detailValue: {
		fontSize: 15,
		fontWeight: "600",
	},
	actionBtn: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#F3F4F6", // Softer Uber-like gray
	},
	cancelBtn: {
		flex: 1,
		height: 48,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#FEF2F2", // Softer Uber-like red
	},
	cancelText: {
		color: "#DC2626", // Softer Uber-like red
		fontSize: 15,
		fontWeight: "600",
	},
	safetySection: {
		marginBottom: 24,
	},
	safetyRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
	},
	safetyTextContainer: {
		flex: 1,
		marginHorizontal: 16,
	},
	safetyLabel: {
		fontSize: 16,
		fontWeight: "600",
	},
	safetySublabel: {
		fontSize: 13,
		marginTop: 2,
	},
});

import { View, Text, StyleSheet, Pressable, Linking, Image } from "react-native";
import { useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../../constants/colors";
import { AMBULANCE_STATUSES, AMBULANCE_TYPES } from "../../../constants/emergency";
import { useTripProgress } from "../../../hooks/emergency/useTripProgress";
import HospitalCard from "../HospitalCard";

const TripSummaryCollapsed = ({
	isDarkMode,
	statusLabel,
	etaText,
	tripHospital,
	callSign,
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
						{tripHospital?.name ?? "Hospital"} • {callSign}
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
		</View>
	);
};

const TripSummaryHalf = ({
	isDarkMode,
	statusLabel,
	etaText,
	tripHospital,
	tripProgress,
	driverName,
	rating,
	vehicle,
	assigned,
	callTarget,
	onCancelAmbulanceTrip,
	showComplete,
	onCompleteAmbulanceTrip,
}) => {
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
					<Text
						style={[
							styles.statusTitle,
							{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
						]}
					>
						{statusLabel}
					</Text>
					<Text
						style={[
							styles.statusSub,
							{
								color: isDarkMode
									? "rgba(255,255,255,0.6)"
									: "rgba(15,23,42,0.6)",
							},
						]}
					>
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
			<View
				style={[
					styles.progressTrack,
					{ backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#F1F5F9" },
				]}
			>
				<View
					style={[
						styles.progressBar,
						{
							width: `${Math.max(5, (tripProgress ?? 0) * 100)}%`,
							backgroundColor: COLORS.brandPrimary,
						},
					]}
				/>
			</View>

			{/* Driver / Vehicle Info */}
			<View style={styles.driverRow}>
				<View
					style={[
						styles.driverAvatar,
						{ backgroundColor: isDarkMode ? "#252D3B" : "#E2E8F0" },
					]}
				>
					<Ionicons
						name="person"
						size={20}
						color={isDarkMode ? "#94A3B8" : "#64748B"}
					/>
				</View>

				<View style={styles.driverInfo}>
					<Text
						style={[
							styles.driverName,
							{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
						]}
					>
						{driverName}
					</Text>
					<View style={styles.ratingRow}>
						<Ionicons name="star" size={12} color="#FBBF24" />
						<Text
							style={[
								styles.ratingText,
								{
									color: isDarkMode
										? "rgba(255,255,255,0.6)"
										: "rgba(15,23,42,0.6)",
								},
							]}
						>
							{rating} • {vehicle}
						</Text>
					</View>
				</View>

				<View style={styles.plateContainer}>
					<Text style={styles.plateText}>
						{assigned?.vehicleNumber ?? "IVISIT"}
					</Text>
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
								backgroundColor: isDarkMode
									? "rgba(255,255,255,0.1)"
									: "#F1F5F9",
								opacity: pressed ? 0.7 : 1,
							},
						]}
					>
						<Ionicons
							name="call"
							size={20}
							color={isDarkMode ? COLORS.textLight : COLORS.textPrimary}
						/>
					</Pressable>
				)}

				<Pressable
					onPress={onCancelAmbulanceTrip}
					style={({ pressed }) => [
						styles.cancelBtn,
						{ opacity: pressed ? 0.7 : 1 },
					]}
				>
					<Text style={styles.cancelText}>Cancel Trip</Text>
				</Pressable>

				{showComplete && (
					<Pressable
						onPress={onCompleteAmbulanceTrip}
						style={({ pressed }) => [
							styles.completeBtn,
							{ opacity: pressed ? 0.7 : 1 },
						]}
					>
						<Text style={styles.completeText}>Complete</Text>
					</Pressable>
				)}
			</View>
		</View>
	);
};

const TripSummaryFull = ({
	isDarkMode,
	statusLabel,
	etaText,
	tripHospital,
	tripProgress,
	driverName,
	rating,
	vehicle,
	assigned,
	ambulanceType,
	callTarget,
	onCancelAmbulanceTrip,
	showComplete,
	onCompleteAmbulanceTrip,
}) => {
	return (
		<View
			style={[
				styles.fullContainer,
				{
					backgroundColor: isDarkMode ? "#121826" : "#FFFFFF",
				},
			]}
		>
			<View
				style={[
					styles.fullHeader,
					{ backgroundColor: COLORS.brandPrimary },
				]}
			>
				<View style={{ flex: 1, paddingRight: 12 }}>
					<Text
						style={[
							styles.fullStatusTitle,
							{ color: "#FFFFFF" },
						]}
						numberOfLines={1}
					>
						{statusLabel}
					</Text>
					<Text
						style={[
							styles.fullStatusSub,
							{ color: "rgba(255,255,255,0.85)" },
						]}
						numberOfLines={1}
					>
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

			<View style={styles.fullBody}>
				<View
					style={[
						styles.progressTrack,
						{ backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#F1F5F9" },
					]}
				>
					<View
						style={[
							styles.progressBar,
							{
								width: `${Math.max(5, (tripProgress ?? 0) * 100)}%`,
								backgroundColor: COLORS.brandPrimary,
							},
						]}
					/>
				</View>

				<View style={styles.driverRow}>
					<View
						style={[
							styles.driverAvatar,
							{ backgroundColor: isDarkMode ? "#252D3B" : "#E2E8F0" },
						]}
					>
						<Ionicons
							name="person"
							size={20}
							color={isDarkMode ? "#94A3B8" : "#64748B"}
						/>
					</View>

					<View style={styles.driverInfo}>
						<Text
							style={[
								styles.driverName,
								{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
							]}
						>
							{driverName}
						</Text>
						<View style={styles.ratingRow}>
							<Ionicons name="star" size={12} color="#FBBF24" />
							<Text
								style={[
									styles.ratingText,
									{
										color: isDarkMode
											? "rgba(255,255,255,0.6)"
											: "rgba(15,23,42,0.6)",
									},
								]}
							>
								{rating} • {vehicle}
							</Text>
						</View>
					</View>

					<View style={styles.plateContainer}>
						<Text style={styles.plateText}>
							{assigned?.vehicleNumber ?? "IVISIT"}
						</Text>
					</View>
				</View>

				{tripHospital && (
					<View style={{ marginBottom: 18 }}>
						<HospitalCard
							hospital={tripHospital}
							isSelected={true}
							onSelect={undefined}
							onCall={undefined}
							mode="emergency"
							hidePrimaryAction={true}
						/>
					</View>
				)}

				{ambulanceType && (
					<View style={styles.ambulanceSection}>
						<View
							style={[
								styles.ambulanceImageContainer,
								{
									backgroundColor: isDarkMode
										? COLORS.brandPrimary
										: "rgba(37, 99, 235, 0.10)",
								},
							]}
						>
							<Ionicons
								name={ambulanceType.icon}
								size={64}
								color={isDarkMode ? "#FFFFFF" : COLORS.brandPrimary}
							/>
						</View>
						<View style={styles.ambulanceInfo}>
							<Text
								style={[
									styles.ambulanceTitle,
									{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
								]}
							>
								{ambulanceType.title}
							</Text>
							<Text
								style={[
									styles.ambulanceSubtitle,
									{
										color: isDarkMode
											? "rgba(255,255,255,0.7)"
											: "rgba(15,23,42,0.7)",
									},
								]}
							>
								{ambulanceType.subtitle}
							</Text>
							<Text
								style={[styles.ambulancePrice, { color: COLORS.brandPrimary }]}
							>
								{ambulanceType.price}
							</Text>
						</View>
					</View>
				)}

				<View style={styles.actionsRow}>
					{callTarget && (
						<Pressable
							onPress={() => Linking.openURL(callTarget)}
							style={({ pressed }) => [
								styles.actionBtn,
								{
									backgroundColor: isDarkMode
										? "rgba(255,255,255,0.1)"
										: "#F1F5F9",
									opacity: pressed ? 0.7 : 1,
								},
							]}
						>
							<Ionicons
								name="call"
								size={20}
								color={isDarkMode ? COLORS.textLight : COLORS.textPrimary}
							/>
						</Pressable>
					)}

					<Pressable
						onPress={onCancelAmbulanceTrip}
						style={({ pressed }) => [
							styles.cancelBtn,
							{ opacity: pressed ? 0.7 : 1 },
						]}
					>
						<Text style={styles.cancelText}>Cancel Trip</Text>
					</Pressable>

					{showComplete && (
						<Pressable
							onPress={onCompleteAmbulanceTrip}
							style={({ pressed }) => [
								styles.completeBtn,
								{ opacity: pressed ? 0.7 : 1 },
							]}
						>
							<Text style={styles.completeText}>Complete</Text>
						</Pressable>
					)}
				</View>
			</View>
		</View>
	);
};

export const TripSummaryCard = ({
	activeAmbulanceTrip,
	allHospitals = [],
	onCancelAmbulanceTrip,
	onCompleteAmbulanceTrip,
	isDarkMode,
	isCollapsed,
	isExpanded,
	sheetPhase,
	nowMs = Date.now(),
}) => {
	const collapsed = sheetPhase ? sheetPhase === "collapsed" : !!isCollapsed;
	const expanded = sheetPhase ? sheetPhase === "full" : !!isExpanded;

	const assigned = activeAmbulanceTrip?.assignedAmbulance ?? null;
	const tripHospital =
		activeAmbulanceTrip?.hospitalId && Array.isArray(allHospitals)
			? allHospitals.find((h) => h?.id === activeAmbulanceTrip.hospitalId) ?? null
			: null;
	const statusMeta = assigned?.status ? AMBULANCE_STATUSES[assigned.status] : null;
	const lifecycleStatus = activeAmbulanceTrip?.status ?? null;

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
	const lifecycleLabel = useMemo(() => {
		switch (String(lifecycleStatus || "")) {
			case "in_progress":
				return "Request sent";
			case "accepted":
				return "Responder assigned";
			case "arrived":
				return "Arrived";
			default:
				return null;
		}
	}, [lifecycleStatus]);

	const statusLabel = lifecycleLabel ?? computedStatus ?? statusMeta?.label ?? "En Route";
	const showComplete =
		typeof onCompleteAmbulanceTrip === "function" &&
		(String(lifecycleStatus || "") === "arrived" || computedStatus === "Arrived");
	const driverName =
		Array.isArray(assigned?.crew) && assigned.crew.length > 0
			? assigned.crew[0]
			: assigned?.name ?? "--";

	// Get ambulance type for image and pricing
	const ambulanceType = useMemo(() => {
		if (!assigned?.type) return null;
		const raw = String(assigned.type);
		const normalized =
			raw === "basic" ? "standard" : raw === "Ambulance" ? "advanced" : raw;
		return AMBULANCE_TYPES.find((t) => t.id === normalized) || null;
	}, [assigned?.type]);

	if (collapsed) {
		return (
			<TripSummaryCollapsed
				isDarkMode={isDarkMode}
				statusLabel={statusLabel}
				etaText={etaText}
				tripHospital={tripHospital}
				callSign={callSign}
			/>
		);
	}

	if (expanded) {
		return (
			<TripSummaryFull
				isDarkMode={isDarkMode}
				statusLabel={statusLabel}
				etaText={etaText}
				tripHospital={tripHospital}
				tripProgress={tripProgress}
				driverName={driverName}
				rating={rating}
				vehicle={vehicle}
				assigned={assigned}
				ambulanceType={ambulanceType}
				callTarget={callTarget}
				onCancelAmbulanceTrip={onCancelAmbulanceTrip}
				showComplete={showComplete}
				onCompleteAmbulanceTrip={onCompleteAmbulanceTrip}
			/>
		);
	}

	return (
		<TripSummaryHalf
			isDarkMode={isDarkMode}
			statusLabel={statusLabel}
			etaText={etaText}
			tripHospital={tripHospital}
			tripProgress={tripProgress}
			driverName={driverName}
			rating={rating}
			vehicle={vehicle}
			assigned={assigned}
			callTarget={callTarget}
			onCancelAmbulanceTrip={onCancelAmbulanceTrip}
			showComplete={showComplete}
			onCompleteAmbulanceTrip={onCompleteAmbulanceTrip}
		/>
	);
};

const styles = StyleSheet.create({
	collapsedContainer: {
		borderRadius: 22, // Slightly more rounded for Apple feel
		padding: 12,
		marginBottom: 0,
		marginHorizontal: 0,
	},
	collapsedRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	collapsedIconBox: {
		width: 48,
		height: 48,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	collapsedContent: {
		flex: 1,
		justifyContent: "center",
	},
	collapsedTitle: {
		fontSize: 17,
		fontWeight: "600", // Semibold
		letterSpacing: -0.4,
		marginBottom: 2,
	},
	collapsedSub: {
		fontSize: 13,
		fontWeight: "400",
	},
	collapsedRightAction: {
		alignItems: "flex-end",
		justifyContent: "center",
	},
	collapsedEtaBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 20, // Capsule shape
	},
	collapsedEtaText: {
		fontSize: 15,
		fontWeight: "700",
		marginRight: 2,
	},
	collapsedEtaLabel: {
		fontSize: 11,
		fontWeight: "600",
		marginTop: 1,
	},
	container: {
		borderRadius: 20,
		padding: 24,
		marginBottom: 0,
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
	fullContainer: {
		flex: 1,
		borderRadius: 24,
		overflow: "hidden",
		marginBottom: 16,
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
		paddingBottom: 18,
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
		backgroundColor: "rgba(37, 99, 235, 0.10)",
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

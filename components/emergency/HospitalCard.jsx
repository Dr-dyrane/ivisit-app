import React from "react";
import { View, Text, Pressable, Image, Platform, StyleSheet } from "react-native";
import { Ionicons, Fontisto } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";

export default function HospitalCard({
	hospital,
	isSelected,
	onSelect,
	onCall,
	mode = "emergency",
	hideDistanceEta = false,
	hidePrimaryAction = false,
}) {
	const { isDarkMode } = useTheme();

	if (!hospital) return null;

	// --- RESTORED ORIGINAL DATA LOGIC ---
	const hospitalId = hospital?.id;
	const hospitalName = typeof hospital?.name === "string" ? hospital.name : "Hospital";
	const hospitalImageUri = typeof hospital?.image === "string" && hospital.image.length > 0 ? hospital.image : null;
	const hospitalRating = hospital?.rating ?? "--";
	const hospitalDistance = hospital?.distance ?? "--";
	const hospitalEta = hospital?.eta ?? "--";
	const hospitalWaitTime = hospital?.waitTime ?? "--";
	const hospitalPrice = hospital?.price ?? "";
	const hospitalBeds = Number.isFinite(hospital?.availableBeds) ? hospital.availableBeds : 0;
	const hospitalSpecialties = Array.isArray(hospital?.specialties)
		? hospital.specialties.filter((s) => typeof s === "string")
		: [];

	// --- PREMIUM UI STYLING ---
	const activeBG = isSelected
		? isDarkMode ? COLORS.brandPrimary + "20" : COLORS.brandPrimary + "15"
		: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";

	const textColor = isDarkMode ? "#FFFFFF" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";

	const handlePress = () => {
		if (!hospitalId || typeof onSelect !== "function") return;
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onSelect(hospitalId);
	};

	const handleCallPress = () => {
		if (!hospitalId || typeof onCall !== "function") return;
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		onCall(hospitalId);
	};

	return (
		<Pressable
			onPress={hospitalId && onSelect ? handlePress : undefined}
			style={({ pressed }) => [
				styles.card,
				{
					backgroundColor: activeBG,
					transform: [{ scale: pressed ? 0.98 : 1 }],
					shadowColor: isSelected ? COLORS.brandPrimary : "#000",
					shadowOpacity: isDarkMode ? 0.2 : 0.08,
					elevation: isSelected ? 10 : 2,
				},
			]}
		>
			{/* Image Section with Overlay Badges */}
			<View style={styles.imageContainer}>
				{hospitalImageUri ? (
					<Image source={{ uri: hospitalImageUri }} style={styles.image} resizeMode="cover" />
				) : (
					<View style={[styles.image, { backgroundColor: isDarkMode ? "#252D3B" : "#E2E8F0" }]} />
				)}

				<View style={styles.priceBadge}>
					<Text style={styles.priceText}>{hospitalPrice}</Text>
				</View>

				{hospital.verified && (
					<View style={styles.verifiedBadge}>
						<Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
						<Text style={styles.verifiedText}>VERIFIED</Text>
					</View>
				)}
			</View>

			{/* Info Section */}
			<View style={styles.content}>
				<View style={styles.titleRow}>
					<Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
						{hospitalName}
					</Text>
					<View style={styles.ratingBox}>
						<Ionicons name="star" size={14} color="#FFC107" />
						<Text style={[styles.ratingText, { color: textColor }]}>{hospitalRating}</Text>
					</View>
				</View>

				{/* Restored Specialty Slice Logic */}
				<Text style={[styles.specialties, { color: mutedColor }]} numberOfLines={1}>
					{hospitalSpecialties.length > 0 ? hospitalSpecialties.slice(0, 3).join(" • ") : "General Care"}
				</Text>

				{/* Stats Pills */}
				{!hideDistanceEta && (
					<View style={styles.pillRow}>
						<View style={[styles.statPill, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#FFFFFF" }]}>
							<Ionicons name="location" size={12} color={COLORS.brandPrimary} />
							<Text style={[styles.statText, { color: textColor }]}>{hospitalDistance}</Text>
						</View>
						<View style={[styles.statPill, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#FFFFFF" }]}>
							<Ionicons name="time" size={12} color={COLORS.brandPrimary} />
							<Text style={[styles.statText, { color: textColor }]}>
								{mode === "booking" ? `${hospitalBeds} Beds` : `Wait: ${hospitalWaitTime}`}
							</Text>
						</View>
					</View>
				)}
			</View>

			{/* Selection/Action Logic */}
			{isSelected && !hidePrimaryAction ? (
				<Pressable onPress={handleCallPress} style={styles.primaryAction}>
					<View style={styles.actionLeft}>
						<Fontisto
							name={mode === "booking" ? "bed-patient" : "ambulance"}
							size={18}
							color="#FFFFFF"
						/>
						<Text style={styles.actionText}>
							{mode === "booking" ? "Secure a Bed" : "Request Now"}
						</Text>
					</View>
					<Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
				</Pressable>
			) : (
				isSelected && (
					<View style={styles.checkmarkWrapper}>
						<Ionicons name="checkmark-circle" size={32} color={COLORS.brandPrimary} />
					</View>
				)
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 36,
		padding: 16,
		marginBottom: 20,
		minHeight: 200,
		position: "relative",
		shadowOffset: { width: 0, height: 10 },
		shadowRadius: 15,
	},
	imageContainer: {
		width: "100%",
		height: 140,
		borderRadius: 26,
		overflow: "hidden",
		marginBottom: 16,
	},
	image: {
		width: "100%",
		height: "100%",
	},
	priceBadge: {
		position: "absolute",
		top: 12,
		right: 12,
		backgroundColor: COLORS.brandPrimary,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 14,
	},
	priceText: {
		color: "#FFFFFF",
		fontWeight: "900",
		fontSize: 15,
	},
	verifiedBadge: {
		position: "absolute",
		top: 12,
		left: 12,
		backgroundColor: "rgba(16, 185, 129, 0.95)",
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 12,
		gap: 4,
	},
	verifiedText: {
		color: "#FFFFFF",
		fontSize: 10,
		fontWeight: "900",
		letterSpacing: 0.5,
	},
	content: {
		paddingHorizontal: 4,
	},
	titleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 4,
	},
	name: {
		fontSize: 20,
		fontWeight: "800",
		flex: 1,
		letterSpacing: -0.5,
	},
	ratingBox: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	ratingText: {
		fontSize: 14,
		fontWeight: "700",
	},
	specialties: {
		fontSize: 13,
		fontWeight: "500",
		marginBottom: 16,
	},
	pillRow: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 4,
	},
	statPill: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 14,
		gap: 6,
	},
	statText: {
		fontSize: 12,
		fontWeight: "700",
	},
	primaryAction: {
		backgroundColor: COLORS.brandPrimary,
		marginTop: 16,
		height: 54,
		borderRadius: 20,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
	},
	actionLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	actionText: {
		color: "#FFFFFF",
		fontSize: 15,
		fontWeight: "800",
	},
	checkmarkWrapper: {
		position: "absolute",
		right: -4,
		bottom: -4,
	},
});
import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import HospitalCard from "./HospitalCard";

const HospitalDetailView = ({ hospital, onClose, onCall, mode }) => {
	const { isDarkMode } = useTheme();
	const isAndroid = Platform.OS === "android";
	if (!hospital) return null;

	const travelTime = useMemo(() => {
		const etaRaw = hospital?.eta ?? hospital?.waitTime ?? null;
		if (typeof etaRaw === "string" && etaRaw.length > 0) return etaRaw;
		return "--";
	}, [hospital?.eta, hospital?.waitTime]);

	const formattedDistance = useMemo(() => {
		if (hospital.distance == null) return "--";
		if (typeof hospital.distance === "number") {
			return `${hospital.distance.toFixed(1)} km`;
		}
		return hospital.distance;
	}, [hospital.distance]);

	const iconSurface = isAndroid
		? (isDarkMode ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.26)")
		: "rgba(255,255,255,0.18)";
	const closeSurface = isAndroid
		? (isDarkMode ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.30)")
		: "rgba(255,255,255,0.15)";
	const metricsColor = isAndroid ? "rgba(255,255,255,0.86)" : "rgba(255,255,255,0.8)";
	const headerSurface = isAndroid
		? (isDarkMode ? "rgba(30,41,59,0.90)" : "rgba(134,16,14,0.90)")
		: (isDarkMode ? "#1E293B" : COLORS.brandPrimary);

	return (
		<View style={styles.container}>
			{/* Compact Premium Header - Exactly matches your original height profile */}
			<View style={[styles.headerRow, { backgroundColor: headerSurface }]}>
				<View style={styles.titleWrapper}>
					{/* Nested Squircle Icon (16px radius) */}
					<View style={[styles.iconBox, { backgroundColor: iconSurface }]}>
						<MaterialCommunityIcons
							name="hospital-building"
							size={22}
							color="#FFFFFF"
						/>
					</View>

					<View style={styles.titleTextContainer}>
						<Text style={styles.hospitalName} numberOfLines={1}>
							{hospital?.name ?? "Hospital"}
						</Text>
						<Text style={[styles.metricsText, { color: metricsColor }]}>
							{formattedDistance} | {travelTime}
						</Text>
					</View>
				</View>

				{/* Ghost Pill Close Button */}
				<Pressable
					onPress={() => {
						Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
						onClose();
					}}
					style={({ pressed }) => [
						styles.closePill,
						{
							backgroundColor: closeSurface,
							opacity: pressed ? 0.7 : 1,
						},
					]}
				>
					<Ionicons name="close" size={20} color="#FFFFFF" />
				</Pressable>
			</View>

			{/* The 36px Rounded Hospital Card */}
			<HospitalCard
				hospital={{
					...hospital,
					distance: formattedDistance,
					eta: hospital?.eta ?? travelTime,
				}}
				isSelected={true}
				hideDistanceEta={true}
				onSelect={() => {}}
				onCall={() => onCall?.()}
				mode={mode}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 2, // Keeps layout tight
	},
	headerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
		borderRadius: 36, // Match HospitalCard radius
		paddingHorizontal: 12,
		paddingVertical: 10, // Optimized for your exact height
		// Depth without borders
		shadowColor: "#000",
		shadowOffset: { width: 0, height: Platform.OS === "android" ? 2 : 4 },
		shadowOpacity: Platform.OS === "android" ? 0.04 : 0.1,
		shadowRadius: Platform.OS === "android" ? 4 : 8,
		elevation: Platform.OS === "android" ? 1 : 4,
	},
	titleWrapper: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
	},
	iconBox: {
		width: 44,
		height: 44,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	titleTextContainer: {
		flex: 1,
	},
	hospitalName: {
		fontSize: 18,
		fontWeight: "900", // Editorial Weight
		color: "#FFFFFF",
		letterSpacing: -0.6,
	},
	metricsText: {
		fontSize: 12,
		fontWeight: "700",
		marginTop: 1,
	},
	closePill: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
		marginLeft: 8,
	},
});

export default HospitalDetailView;

import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import HospitalCard from "./HospitalCard";

const HospitalDetailView = ({ hospital, onClose, onCall, mode }) => {
	const { isDarkMode } = useTheme();
	if (!hospital) return null;

	const travelTime = useMemo(() => {
		const etaRaw = hospital?.eta ?? hospital?.waitTime ?? null;
		if (typeof etaRaw === "string" && etaRaw.length > 0) return etaRaw;
		return "--";
	}, [hospital?.eta, hospital?.waitTime]);
	
	const formattedDistance = useMemo(() => {
		if (hospital.distance == null) return "--";
		if (typeof hospital.distance === 'number') {
			return `${hospital.distance.toFixed(1)} km`;
		}
		return hospital.distance;
	}, [hospital.distance]);

	return (
		<View style={styles.container}>
			{/* Compact Premium Header - Exactly matches your original height profile */}
			<View style={[styles.headerRow, { backgroundColor: isDarkMode ? "#1E293B":COLORS.brandPrimary }]}>
				<View style={styles.titleWrapper}>
					{/* Nested Squircle Icon (16px radius) */}
					<View style={styles.iconBox}>
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
						<Text style={styles.metricsText}>
							{formattedDistance}  •  {travelTime}
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
							backgroundColor: "rgba(255,255,255,0.15)",
							opacity: pressed ? 0.7 : 1 
						}
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
		borderRadius: 24, // Matches the new design language
		paddingHorizontal: 12,
		paddingVertical: 10, // Optimized for your exact height
		// Depth without borders
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},
	titleWrapper: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
	},
	iconBox: {
		width: 44,
		height: 44,
		borderRadius: 14, // Nested Squircle Logic
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(255,255,255,0.18)",
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
		color: "rgba(255,255,255,0.8)",
		marginTop: 1,
	},
	closePill: {
		width: 32,
		height: 32,
		borderRadius: 10, // Squircle Pill
		alignItems: "center",
		justifyContent: "center",
		marginLeft: 8,
	},
});

export default HospitalDetailView;
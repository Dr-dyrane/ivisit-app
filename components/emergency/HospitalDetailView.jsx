import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import HospitalCard from "./HospitalCard";

/**
 * HospitalDetailView
 * 
 * Displays detailed information about the selected hospital.
 * Follows iVisit design philosophy:
 * - Clear hierarchy (Name > Distance > Actions)
 * - Large, bold typography for primary info
 * - Semantic colors
 * 
 * @param {Object} props
 * @param {Object} props.hospital - The selected hospital data
 * @param {Function} props.onClose - Callback to close the detail view
 * @param {Function} props.onCall - Callback to initiate a call
 * @param {string} props.mode - Current app mode (emergency/booking)
 */
const HospitalDetailView = ({ hospital, onClose, onCall, mode }) => {
	const { isDarkMode } = useTheme();
	if (!hospital) return null;

	// Dynamic colors
	const textColor = isDarkMode ? "#FFFFFF" : "#1F2937";
	const subTextColor = isDarkMode ? "#9CA3AF" : "#6B7280";
	// Mock data for travel time (would be real-time in production)
	const travelTime = useMemo(() => Math.floor(Math.random() * 15) + 5, []); // 5-20 mins
	
	// Distance formatting
	const formattedDistance = useMemo(() => {
		if (hospital.distance == null) return "--";
		if (typeof hospital.distance === 'number') {
			return `${hospital.distance.toFixed(1)} km`;
		}
		return hospital.distance;
	}, [hospital.distance]);

	const handleClose = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onClose();
	};

	return (
		<View style={styles.container}>
			<View style={styles.headerRow}>
				<View style={styles.titleWrapper}>
					<View style={styles.iconBadge}>
						<MaterialCommunityIcons
							name="hospital-building"
							size={24}
							color="#FFFFFF"
						/>
					</View>
					<View style={styles.titleTextContainer}>
						<Text
							style={[styles.hospitalName, { color: "#FFFFFF" }]}
							numberOfLines={1}
						>
							{hospital?.name ?? "Hospital"}
						</Text>
						<Text style={[styles.metricsText, { color: "rgba(255,255,255,0.85)" }]}>
							{formattedDistance} • {travelTime} min
						</Text>
					</View>
				</View>
				
				<Pressable 
					onPress={handleClose}
					style={({ pressed }) => [
						styles.closeButton,
						{ 
							backgroundColor: "rgba(255,255,255,0.18)",
							opacity: pressed ? 0.7 : 1 
						}
					]}
					hitSlop={12}
				>
					<Ionicons name="close" size={22} color="#FFFFFF" />
				</Pressable>
			</View>

			<HospitalCard
				hospital={{
					...hospital,
					distance: formattedDistance,
					eta: hospital?.eta ?? `${travelTime} mins`,
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
		paddingHorizontal: 0,
		paddingTop: 0,
		paddingBottom: 0,
	},
	headerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 12,
		backgroundColor: COLORS.brandPrimary,
		borderRadius: 16,
		paddingHorizontal: 14,
		paddingVertical: 12,
	},
	titleWrapper: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		paddingRight: 12,
	},
	iconBadge: {
		width: 48,
		height: 48,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
		backgroundColor: "rgba(255,255,255,0.18)",
	},
	titleTextContainer: {
		flex: 1,
		justifyContent: "center",
	},
	hospitalName: {
		fontSize: 20,
		fontWeight: "500",
		letterSpacing: -0.5,
		marginBottom: 4,
	},
	metricsText: {
		fontSize: 14,
		fontWeight: "500",
	},
	closeButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
});

export default HospitalDetailView;

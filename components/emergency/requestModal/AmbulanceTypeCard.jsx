import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";

export default function AmbulanceTypeCard({ type, selected, onPress, textColor, mutedColor, cardColor }) {
	const { isDarkMode } = useTheme();

	// Uber-style selection: 
	// - Selected: Brand border/bg highlight is okay but keep it subtle or use a checkmark
	// - Unselected: Clean background
	// - Layout: [Image/Icon] [Title + Time] [Price]
	
	const backgroundColor = selected ? (isDarkMode ? "#1A2333" : "#F0F9FF") : cardColor;
	
	// Mock vehicle image based on type (using icons for now but styled as graphic)
	const VehicleIcon = () => (
		<View style={[styles.iconContainer, { backgroundColor: isDarkMode ? "#252D3B" : "#F1F5F9" }]}>
			<Ionicons name={type.icon} size={32} color={COLORS.brandPrimary} />
		</View>
	);

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.container,
				{ 
					backgroundColor,
					borderColor: selected ? COLORS.brandPrimary : "transparent",
					borderWidth: selected ? 2 : 0, // Uber often uses a thick border for selection
					opacity: pressed ? 0.9 : 1,
				}
			]}
		>
			{/* Left: Vehicle Image */}
			<VehicleIcon />

			{/* Middle: Info */}
			<View style={styles.infoContainer}>
				<View style={styles.titleRow}>
					<Text style={[styles.name, { color: textColor }]}>{type.name}</Text>
					<View style={styles.personRow}>
						<Ionicons name="person" size={12} color={mutedColor} />
						<Text style={[styles.capacity, { color: mutedColor }]}> 1-2</Text>
					</View>
				</View>
				<Text style={[styles.eta, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
					{type.eta} away
				</Text>
				<Text style={[styles.description, { color: mutedColor }]} numberOfLines={1}>
					{type.description}
				</Text>
			</View>

			{/* Right: Price */}
			<View style={styles.priceContainer}>
				<Text style={[styles.price, { color: textColor }]}>{type.price}</Text>
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		padding: 12,
		borderRadius: 12,
		marginBottom: 8,
		// Shadow only for separation if needed, or flat
	},
	iconContainer: {
		width: 60,
		height: 60,
		borderRadius: 30,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	infoContainer: {
		flex: 1,
		justifyContent: "center",
	},
	titleRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 2,
	},
	name: {
		fontSize: 16,
		fontWeight: "700",
		marginRight: 6,
	},
	personRow: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(0,0,0,0.05)",
		paddingHorizontal: 4,
		paddingVertical: 1,
		borderRadius: 4,
	},
	capacity: {
		fontSize: 10,
		fontWeight: "600",
	},
	eta: {
		fontSize: 13,
		fontWeight: "500",
		marginBottom: 2,
	},
	description: {
		fontSize: 12,
	},
	priceContainer: {
		alignItems: "flex-end",
		justifyContent: "center",
		marginLeft: 8,
	},
	price: {
		fontSize: 16,
		fontWeight: "700",
	},
});


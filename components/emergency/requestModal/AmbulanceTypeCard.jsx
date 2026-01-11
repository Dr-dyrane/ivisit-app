import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";

export default function AmbulanceTypeCard({ type, selected, onPress, textColor, mutedColor, cardColor }) {
	const { isDarkMode } = useTheme();

	// Enhanced selection with room type background pattern
	const backgroundColor = selected 
		? (isDarkMode 
			? COLORS.brandPrimary + '25' 
			: COLORS.brandPrimary + '15') 
		: cardColor;
	
	// Mock vehicle image based on type (using icons for now but styled as graphic)
	const VehicleIcon = () => (
		<View style={[styles.iconContainer, { 
			backgroundColor: selected 
				? (isDarkMode 
					? COLORS.brandPrimary + '20'
					: COLORS.brandPrimary + '15')
				: (isDarkMode
					? 'rgba(255,255,255,0.05)'
					: 'rgba(0,0,0,0.03)'),
		}]}>
			<Ionicons 
				name={type.icon} 
				size={32} 
				color={selected ? COLORS.brandPrimary : (isDarkMode ? "#94A3B8" : "#64748B")} 
			/>
			{selected && (
				<View style={styles.selectedBadge}>
					<Ionicons name="checkmark" size={12} color="#FFFFFF" />
				</View>
			)}
		</View>
	);

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.container,
				{ 
					backgroundColor,
					opacity: pressed ? 0.9 : 1,
					transform: [{ scale: pressed ? 0.98 : 1 }]
				}
			]}
		>
			{/* Left: Vehicle Image */}
			<VehicleIcon />

			{/* Middle: Info */}
			<View style={styles.infoContainer}>
				<View style={styles.titleRow}>
					<Text style={[styles.name, { color: textColor, fontWeight: selected ? "800" : "700" }]}>
						{type.name || type.title}
					</Text>
				</View>
				<View style={styles.detailsRow}>
					<View style={styles.personRow}>
						<Ionicons name="person" size={12} color={mutedColor} />
						<Text style={[styles.capacity, { color: mutedColor }]}> 1-2</Text>
					</View>
					<Text style={[styles.eta, { color: selected ? COLORS.brandPrimary : (isDarkMode ? "#94A3B8" : "#64748B") }]}>
						<Ionicons name="time" size={12} color={selected ? COLORS.brandPrimary : (isDarkMode ? "#94A3B8" : "#64748B")} />
						{" "}{type.eta}
					</Text>
				</View>
				<Text style={[styles.description, { color: mutedColor }]} numberOfLines={2}>
					{type.description || type.subtitle}
				</Text>
			</View>

			{/* Right: Price */}
			<View style={styles.priceContainer}>
				<Text style={[styles.price, { color: selected ? COLORS.brandPrimary : textColor, fontWeight: selected ? "800" : "700" }]}>
					{type.price}
				</Text>
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		padding: 16,
		borderRadius: 20,
		marginBottom: 12,
		backgroundColor: '#FFFFFF',
	},
	iconContainer: {
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 16,
		position: "relative",
	},
	selectedBadge: {
		position: "absolute",
		top: -2,
		right: -2,
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: COLORS.brandPrimary,
		alignItems: "center",
		justifyContent: "center",
	},
	infoContainer: {
		flex: 1,
		justifyContent: "center",
	},
	titleRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 4,
	},
	name: {
		fontSize: 17,
		fontWeight: "700",
		flex: 1,
		letterSpacing: -0.3,
	},
	detailsRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 4,
	},
	personRow: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(0,0,0,0.04)",
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 12,
	},
	capacity: {
		fontSize: 10,
		fontWeight: "600",
	},
	eta: {
		fontSize: 12,
		fontWeight: "500",
	},
	description: {
		fontSize: 12,
		lineHeight: 16,
	},
	priceContainer: {
		alignItems: "flex-end",
		justifyContent: "center",
		marginLeft: 12,
		minWidth: 60,
	},
	price: {
		fontSize: 17,
		fontWeight: "800",
		letterSpacing: -0.5,
	},
});


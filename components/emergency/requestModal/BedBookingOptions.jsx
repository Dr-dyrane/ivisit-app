import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";

export default function BedBookingOptions({
	bedType,
	onBedTypeChange,
	bedCount,
	onBedCountChange,
	textColor,
	mutedColor,
	cardColor,
}) {
	const { isDarkMode } = useTheme();

	const BED_OPTIONS = [
		{
			id: "standard",
			name: "Standard Bed",
			description: "General Ward • Shared",
			icon: "bed",
			price: "$150",
		},
		{
			id: "private",
			name: "Private Room",
			description: "Single Room • En-suite",
			icon: "home",
			price: "$350",
		},
	];

	return (
		<View style={styles.container}>
			<View style={styles.sectionHeader}>
				<Text style={[styles.sectionTitle, { color: mutedColor }]}>CHOOSE ROOM TYPE</Text>
			</View>
			
			{BED_OPTIONS.map((option) => {
				const isSelected = bedType === option.id;
				const backgroundColor = isSelected 
					? (isDarkMode ? "#1A2333" : "#F0F9FF") 
					: cardColor;

				return (
					<Pressable
						key={option.id}
						onPress={() => onBedTypeChange(option.id)}
						style={({ pressed }) => [
							styles.optionCard,
							{
								backgroundColor,
								borderColor: isSelected ? COLORS.brandPrimary : "transparent",
								borderWidth: isSelected ? 2 : 0,
								opacity: pressed ? 0.9 : 1,
							}
						]}
					>
						{/* Icon */}
						<View style={[styles.iconContainer, { backgroundColor: isDarkMode ? "#252D3B" : "#F1F5F9" }]}>
							<Ionicons name={option.icon} size={28} color={COLORS.brandPrimary} />
						</View>

						{/* Info */}
						<View style={styles.infoContainer}>
							<Text style={[styles.optionName, { color: textColor }]}>{option.name}</Text>
							<Text style={[styles.optionDesc, { color: mutedColor }]}>{option.description}</Text>
						</View>

						{/* Price/Selection */}
						<View style={styles.priceContainer}>
							<Text style={[styles.price, { color: textColor }]}>{option.price}</Text>
							{isSelected && (
								<Ionicons name="checkmark-circle" size={20} color={COLORS.brandPrimary} style={{ marginTop: 4 }} />
							)}
						</View>
					</Pressable>
				);
			})}

			<View style={[styles.countRow, { backgroundColor: cardColor, marginTop: 16 }]}>
				<View>
					<Text style={[styles.countLabel, { color: textColor }]}>Number of Beds</Text>
					<Text style={[styles.countSub, { color: mutedColor }]}>For multiple patients</Text>
				</View>
				
				<View style={styles.counterControls}>
					<Pressable
						onPress={() => onBedCountChange(Math.max(1, bedCount - 1))}
						style={({ pressed }) => [
							styles.counterBtn, 
							{ 
								backgroundColor: isDarkMode ? "#252D3B" : "#F1F5F9",
								opacity: pressed ? 0.7 : 1,
								opacity: bedCount <= 1 ? 0.3 : 1
							}
						]}
						disabled={bedCount <= 1}
					>
						<Ionicons name="remove" size={20} color={textColor} />
					</Pressable>
					
					<Text style={[styles.countValue, { color: textColor }]}>{bedCount}</Text>
					
					<Pressable
						onPress={() => onBedCountChange(Math.min(5, bedCount + 1))}
						style={({ pressed }) => [
							styles.counterBtn, 
							{ 
								backgroundColor: isDarkMode ? "#252D3B" : "#F1F5F9",
								opacity: pressed ? 0.7 : 1 
							}
						]}
					>
						<Ionicons name="add" size={20} color={textColor} />
					</Pressable>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		width: "100%",
	},
	sectionHeader: {
		marginBottom: 8,
		marginTop: 4,
	},
	sectionTitle: {
		fontSize: 11,
		fontWeight: "800",
		letterSpacing: 1,
	},
	optionCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: 12,
		borderRadius: 16,
		marginBottom: 8,
	},
	iconContainer: {
		width: 50,
		height: 50,
		borderRadius: 25,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	infoContainer: {
		flex: 1,
		justifyContent: "center",
	},
	optionName: {
		fontSize: 15,
		fontWeight: "700",
		marginBottom: 2,
	},
	optionDesc: {
		fontSize: 12,
		fontWeight: "500",
	},
	priceContainer: {
		alignItems: "flex-end",
		justifyContent: "center",
	},
	price: {
		fontSize: 14,
		fontWeight: "700",
	},
	countRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 16,
		borderRadius: 16,
	},
	countLabel: {
		fontSize: 15,
		fontWeight: "700",
	},
	countSub: {
		fontSize: 12,
		marginTop: 2,
	},
	counterControls: {
		flexDirection: "row",
		alignItems: "center",
		gap: 16,
	},
	counterBtn: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	countValue: {
		fontSize: 18,
		fontWeight: "700",
		minWidth: 20,
		textAlign: "center",
	},
});

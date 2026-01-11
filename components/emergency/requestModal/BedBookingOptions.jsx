import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
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

	const handleBedTypeSelect = (typeId) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onBedTypeChange(typeId);
	};

	const BED_OPTIONS = [
		{
			id: "standard",
			name: "Standard Bed",
			description: "General Ward • Shared",
			icon: "bed-outline",
			price: "$150",
		},
		{
			id: "private",
			name: "Private Room",
			description: "Single Room • En-suite",
			icon: "home-outline",
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
					? (isDarkMode 
						? COLORS.brandPrimary + '25' 
						: COLORS.brandPrimary + '15') 
					: cardColor;

				return (
					<Pressable
						key={option.id}
						onPress={() => handleBedTypeSelect(option.id)}
						style={({ pressed }) => [
							styles.optionCard,
							{
								backgroundColor,
								opacity: pressed ? 0.9 : 1,
							}
						]}
					>
						{/* Icon */}
						<View style={[
							styles.iconContainer,
							{
								backgroundColor: isSelected
									? (isDarkMode 
										? COLORS.brandPrimary + '20'
										: COLORS.brandPrimary + '15')
									: (isDarkMode
										? 'rgba(255,255,255,0.05)'
										: 'rgba(0,0,0,0.03)'),
							}
						]}>
							<Ionicons 
								name={option.icon} 
								size={24} 
								color={isSelected 
									? COLORS.brandPrimary 
									: (isDarkMode 
										? COLORS.textMutedDark 
										: mutedColor)} 
							/>
							{isSelected && (
								<View style={styles.selectedBadge}>
									<Ionicons name="checkmark" size={12} color="#FFFFFF" />
								</View>
							)}
						</View>

						{/* Info */}
						<View style={styles.infoContainer}>
							<Text style={[styles.optionName, { color: textColor }]}>{option.name}</Text>
							<Text style={[styles.optionDesc, { color: mutedColor }]}>{option.description}</Text>
						</View>

						{/* Price */}
						<View style={styles.priceContainer}>
							<Text style={[styles.price, { color: COLORS.brandPrimary }]}>{option.price}</Text>
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
		marginBottom: 12,
		marginTop: 8,
	},
	sectionTitle: {
		fontSize: 11,
		fontWeight: "800",
		letterSpacing: 1,
	},
	optionCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: 16,
		borderRadius: 20,
		marginBottom: 12,
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
	optionName: {
		fontSize: 16,
		fontWeight: "700",
		marginBottom: 4,
	},
	optionDesc: {
		fontSize: 12,
		fontWeight: "500",
	},
	priceContainer: {
		alignItems: "flex-end",
		justifyContent: "center",
		marginLeft: 12,
	},
	price: {
		fontSize: 16,
		fontWeight: "800",
	},
	countRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 16,
		borderRadius: 20,
		marginTop: 12,
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

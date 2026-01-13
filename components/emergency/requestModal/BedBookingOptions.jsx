import React from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import { Ionicons, Fontisto } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";

const { width } = Dimensions.get("window");

export default function BedBookingOptions({
	bedType,
	onBedTypeChange,
	bedCount,
	onBedCountChange,
	textColor,
	mutedColor,
}) {
	const { isDarkMode } = useTheme();

	const handleBedTypeSelect = (typeId) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		onBedTypeChange(typeId);
	};

	const BED_OPTIONS = [
		{
			id: "standard",
			name: "Standard Bed",
			description: "General Ward • Professional Care • Shared Space",
			icon: "bed-patient",
			price: "$150",
		},
		{
			id: "private",
			name: "Private Room",
			description: "Premium Suite • Personal Bathroom • 24/7 Concierge",
			icon: "home",
			price: "$350",
		},
	];

	return (
		<View style={styles.container}>
			<View style={styles.sectionHeader}>
				<Text style={[styles.sectionTitle, { color: mutedColor }]}>
					CHOOSE ACCOMMODATION
				</Text>
			</View>

			<View style={styles.optionsGrid}>
				{BED_OPTIONS.map((option) => {
					const isSelected = bedType === option.id;

					// Dynamic Styles based on your logic
					const activeBG = isSelected
						? isDarkMode
							? COLORS.brandPrimary + "20"
							: COLORS.brandPrimary + "15"
						: isDarkMode
						? "rgba(255,255,255,0.05)"
						: "rgba(0,0,0,0.03)";

					return (
						<Pressable
							key={option.id}
							onPress={() => handleBedTypeSelect(option.id)}
							style={({ pressed }) => [
								styles.optionCard,
								{
									backgroundColor: activeBG,
									transform: [{ scale: pressed ? 0.98 : 1 }],
									shadowOpacity: isDarkMode ? 0.3 : 0.08,
								},
							]}
						>
							{/* Top Row: Icon & Price */}
							<View style={styles.cardHeader}>
								<View
									style={[
										styles.iconBox,
										{
											backgroundColor: isSelected
												? COLORS.brandPrimary
												: isDarkMode
												? "#2D3748"
												: "#F1F5F9",
										},
									]}
								>
									<Fontisto
										name={option.icon}
										size={22}
										color={
											isSelected
												? "#FFFFFF"
												: isDarkMode
												? "#94A3B8"
												: "#64748B"
										}
									/>
								</View>
								<Text
									style={[
										styles.price,
										{ color: isSelected ? COLORS.brandPrimary : textColor },
									]}
								>
									{option.price}
									<Text style={styles.perNight}>/day</Text>
								</Text>
							</View>

							{/* Content */}
							<View style={styles.cardBody}>
								<Text style={[styles.optionName, { color: textColor }]}>
									{option.name}
								</Text>
								<Text
									style={[styles.optionDesc, { color: mutedColor }]}
									numberOfLines={2}
								>
									{option.description}
								</Text>
							</View>

							{/* Bottom Right Checkmark */}
							{isSelected && (
								<View style={styles.checkmarkWrapper}>
									<Ionicons
										name="checkmark-circle"
										size={30}
										color={COLORS.brandPrimary}
									/>
								</View>
							)}
						</Pressable>
					);
				})}
			</View>

			{/* Counter Section */}
			<View
				style={[
					styles.counterCard,
					{ backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF" },
				]}
			>
				<View>
					<Text style={[styles.countLabel, { color: textColor }]}>
						Number of Beds
					</Text>
					<Text style={[styles.countSub, { color: mutedColor }]}>
						Maximum of 5 patients
					</Text>
				</View>

				<View style={styles.counterControls}>
					<Pressable
						onPress={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
							onBedCountChange(Math.max(1, bedCount - 1));
						}}
						style={({ pressed }) => [
							styles.counterBtn,
							{
								backgroundColor: isDarkMode ? "#2D3748" : "#F1F5F9",
								opacity: pressed || bedCount <= 1 ? 0.6 : 1,
							},
						]}
						disabled={bedCount <= 1}
					>
						<Ionicons name="remove" size={20} color={textColor} />
					</Pressable>

					<Text style={[styles.countValue, { color: textColor }]}>
						{bedCount}
					</Text>

					<Pressable
						onPress={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
							onBedCountChange(Math.min(5, bedCount + 1));
						}}
						style={({ pressed }) => [
							styles.counterBtn,
							{
								backgroundColor: isDarkMode ? "#0F172A" : "#F1F5F9",
								opacity: pressed ? 0.7 : 1,
							},
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
		paddingVertical: 10,
	},
	sectionHeader: {
		marginBottom: 16,
		paddingHorizontal: 4,
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: "800",
		letterSpacing: 1.2,
		textTransform: "uppercase",
	},
	optionsGrid: {
		gap: 16,
	},
	optionCard: {
		padding: 24,
		borderRadius: 36, // Ultra rounded
		minHeight: 170, // Vertical space
		justifyContent: "space-between",
		position: "relative",
		// Depth instead of borders
		elevation: 4,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowRadius: 12,
	},
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	iconBox: {
		width: 50,
		height: 50,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	price: {
		fontSize: 22,
		fontWeight: "900",
		letterSpacing: -0.5,
	},
	perNight: {
		fontSize: 12,
		fontWeight: "600",
		opacity: 0.6,
	},
	cardBody: {
		marginTop: 8,
	},
	optionName: {
		fontSize: 20,
		fontWeight: "800",
		marginBottom: 6,
	},
	optionDesc: {
		fontSize: 13,
		lineHeight: 18,
		maxWidth: "80%",
	},
	checkmarkWrapper: {
		position: "absolute",
		right: 12,
		bottom: 12,
	},
	counterCard: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 24,
		borderRadius: 32,
		marginTop: 20,
		elevation: 2,
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowOffset: { width: 0, height: 4 },
		shadowRadius: 10,
	},
	countLabel: {
		fontSize: 16,
		fontWeight: "800",
	},
	countSub: {
		fontSize: 12,
		marginTop: 2,
		opacity: 0.7,
	},
	counterControls: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(0,0,0,0.03)",
		padding: 6,
		borderRadius: 20,
		gap: 12,
	},
	counterBtn: {
		width: 40,
		height: 40,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	countValue: {
		fontSize: 20,
		fontWeight: "800",
		minWidth: 24,
		textAlign: "center",
	},
});

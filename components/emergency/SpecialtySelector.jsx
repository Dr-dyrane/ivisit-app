import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from "react-native";
import { Fontisto, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";

// Icon mapping for specialties
const SPECIALTY_ICONS = {
	"General Care": { icon: "stethoscope", family: "FontAwesome5" },
	"Emergency": { icon: "ambulance", family: "FontAwesome5" },
	"Cardiology": { icon: "heart-pulse", family: "MaterialCommunityIcons" },
	"Neurology": { icon: "brain", family: "MaterialCommunityIcons" },
	"Oncology": { icon: "ribbon", family: "Ionicons" },
	"Pediatrics": { icon: "baby-face-outline", family: "MaterialCommunityIcons" },
	"Orthopedics": { icon: "bone", family: "MaterialCommunityIcons" },
	"ICU": { icon: "bed-patient", family: "Fontisto" },
	"Trauma": { icon: "bandage", family: "MaterialCommunityIcons" },
	"Urgent Care": { icon: "medical-bag", family: "MaterialCommunityIcons" },
};

const SpecialtyIcon = ({ specialty, size = 20, color }) => {
	const iconConfig = SPECIALTY_ICONS[specialty] || { icon: "medical-bag", family: "MaterialCommunityIcons" };
	
	switch (iconConfig.family) {
		case "Fontisto":
			return <Fontisto name={iconConfig.icon} size={size} color={color} />;
		case "Ionicons":
			return <Ionicons name={iconConfig.icon} size={size} color={color} />;
		case "MaterialCommunityIcons":
		default:
			return <MaterialCommunityIcons name={iconConfig.icon} size={size} color={color} />;
	}
};

export default function SpecialtySelector({
	specialties,
	selectedSpecialty,
	onSelect,
	style,
	counts = {},
}) {
	const { isDarkMode } = useTheme();

	const handleSelect = (specialty) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		// Toggle off if already selected (acts as "All" filter)
		if (selectedSpecialty === specialty) {
			onSelect(null);
		} else {
			onSelect(specialty);
		}
	};

	// Solid card colors matching app design system (no borders)
	const getCardBg = (isSelected) => isSelected
		? isDarkMode ? `${COLORS.brandPrimary}18` : `${COLORS.brandPrimary}10`
		: isDarkMode ? "#0B0F1A" : "#F3E7E7";

	const textColor = isDarkMode ? "#FFFFFF" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";

	return (
		<View style={[styles.container, style]}>
			<Text style={[styles.title, { color: mutedColor }]}>
				SELECT SPECIALTY
			</Text>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
			>
				{specialties.map((specialty) => {
					const isSelected = selectedSpecialty === specialty;
					const cardBg = getCardBg(isSelected);

					return (
						<Pressable
							key={specialty}
							onPress={() => handleSelect(specialty)}
							style={({ pressed }) => [
								styles.specialtyButton,
								{
									backgroundColor: cardBg,
									transform: [{ scale: pressed ? 0.97 : 1 }],
									...Platform.select({
										ios: {
											shadowColor: isSelected ? COLORS.brandPrimary : "#000",
											shadowOffset: { width: 0, height: isSelected ? 2 : 1 },
											shadowOpacity: isSelected ? 0.1 : 0.02,
											shadowRadius: isSelected ? 4 : 2,
										},
										android: { elevation: isSelected ? 2 : 1 },
									}),
								},
							]}
						>
							<View style={styles.iconContainer}>
								<SpecialtyIcon
									specialty={specialty}
									size={16}
									color={isSelected ? COLORS.brandPrimary : mutedColor}
								/>
							</View>
							<View style={styles.textContainer}>
								<Text
									style={[
										styles.specialtyText,
										{
											color: isSelected ? COLORS.brandPrimary : textColor,
											fontWeight: isSelected ? "700" : "500",
										},
									]}
									numberOfLines={1}
								>
									{specialty}
								</Text>
								<Text
									style={[
										styles.countText,
										{ color: mutedColor },
									]}
									numberOfLines={1}
								>
									{counts[specialty] ?? 0}
								</Text>
							</View>
						</Pressable>
					);
				})}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		// No bottom margin - parent controls spacing
	},
	title: {
		fontSize: 11,
		fontWeight: "500",
		marginBottom: 10,
		letterSpacing: 1.5,
	},
	scrollContent: {
		gap: 8,
	},
	specialtyButton: {
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderRadius: 20, // More rounded, no border
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	iconContainer: {
		width: 20,
		height: 20,
		justifyContent: "center",
		alignItems: "center",
	},
	textContainer: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	specialtyText: {
		fontSize: 12,
		flex: 1,
	},
	countText: {
		fontSize: 10,
		fontWeight:'400',
	},
});


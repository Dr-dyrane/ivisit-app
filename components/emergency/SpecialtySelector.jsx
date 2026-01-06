import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
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
}) {
	const { isDarkMode } = useTheme();

	const colors = {
		background: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt,
		backgroundSelected: COLORS.brandPrimary + "15",
		border: isDarkMode ? "#2a2a2a" : "#e5e7eb",
		borderSelected: COLORS.brandPrimary + "40",
		text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
		textMuted: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted,
		accent: COLORS.brandPrimary,
	};

	const handleSelect = (specialty) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onSelect(specialty);
	};

	return (
		<View style={[styles.container, style]}>
			<Text style={[styles.title, { color: colors.text }]}>
				Select Specialty
			</Text>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
			>
				{specialties.map((specialty) => {
					const isSelected = selectedSpecialty === specialty;
					return (
						<Pressable
							key={specialty}
							onPress={() => handleSelect(specialty)}
							style={({ pressed }) => [
								styles.specialtyButton,
								{
									backgroundColor: isSelected
										? colors.backgroundSelected
										: colors.background,
									borderColor: isSelected
										? colors.borderSelected
										: colors.border,
									opacity: pressed ? 0.8 : 1,
									transform: [{ scale: pressed ? 0.97 : 1 }],
								},
							]}
						>
							<View style={styles.iconContainer}>
								<SpecialtyIcon
									specialty={specialty}
									size={20}
									color={isSelected ? colors.accent : colors.textMuted}
								/>
							</View>
							<Text
								style={[
									styles.specialtyText,
									{
										color: isSelected ? colors.accent : colors.text,
										fontWeight: isSelected ? "600" : "500",
									},
								]}
								numberOfLines={1}
							>
								{specialty}
							</Text>
						</Pressable>
					);
				})}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
	},
	title: {
		fontSize: 14,
		fontWeight: "600",
		marginBottom: 12,
		paddingHorizontal: 4,
		textTransform: "uppercase",
		letterSpacing: 1,
	},
	scrollContent: {
		paddingHorizontal: 4,
		gap: 10,
	},
	specialtyButton: {
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 16,
		borderWidth: 1.5,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		minWidth: 120,
	},
	iconContainer: {
		width: 24,
		height: 24,
		justifyContent: "center",
		alignItems: "center",
	},
	specialtyText: {
		fontSize: 13,
	},
});


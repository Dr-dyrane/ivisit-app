import React, { useRef } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from "react-native";
import { Fontisto, MaterialCommunityIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";

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

const SpecialtyIcon = ({ specialty, size = 18, color }) => {
	const iconConfig = SPECIALTY_ICONS[specialty] || { icon: "medical-bag", family: "MaterialCommunityIcons" };
	switch (iconConfig.family) {
		case "Fontisto": return <Fontisto name={iconConfig.icon} size={size} color={color} />;
		case "Ionicons": return <Ionicons name={iconConfig.icon} size={size} color={color} />;
		case "FontAwesome5": return <FontAwesome5 name={iconConfig.icon} size={size} color={color} />;
		default: return <MaterialCommunityIcons name={iconConfig.icon} size={size} color={color} />;
	}
};

export default function SpecialtySelector({ specialties, selectedSpecialty, onSelect, style, counts = {} }) {
	const { isDarkMode } = useTheme();
	const isAndroid = Platform.OS === "android";
	const lastCallTime = useRef(0);
	const DEBOUNCE_MS = 300;
	const safeCounts = counts || {};

	const handleSelect = (specialty) => {
		const now = Date.now();
		if (now - lastCallTime.current < DEBOUNCE_MS) return;
		lastCallTime.current = now;
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onSelect(selectedSpecialty === specialty ? null : specialty);
	};

	const textColor = isDarkMode ? "#FFFFFF" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";

	return (
		<View style={[styles.container, style]}>
			<View style={styles.header}>
				<Text style={[styles.title, { color: mutedColor }]}>SPECIALTIES</Text>
				<Text style={[styles.countLabel, { color: COLORS.brandPrimary }]}>{specialties.length}</Text>
			</View>

			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
				decelerationRate="fast"
			>
				{specialties.map((specialty) => {
					const isSelected = selectedSpecialty === specialty;
					
					// Your Finalized Background Logic
					const activeBG = isSelected
						? (isAndroid
							? (isDarkMode ? "rgba(134, 16, 14, 0.24)" : "rgba(134, 16, 14, 0.12)")
							: (isDarkMode ? COLORS.brandPrimary + "20" : COLORS.brandPrimary + "15"))
						: (isAndroid
							? (isDarkMode ? "rgba(18, 24, 38, 0.74)" : "rgba(255, 255, 255, 0.78)")
							: (isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"));
					const shadowLayerColor = isSelected
						? (isDarkMode ? "rgba(134, 16, 14, 0.20)" : "rgba(134, 16, 14, 0.12)")
						: (isDarkMode ? "rgba(0, 0, 0, 0.22)" : "rgba(15, 23, 42, 0.10)");

					return (
						<Pressable
							key={specialty}
							onPress={() => handleSelect(specialty)}
							style={({ pressed }) => [
								styles.card,
								{
									backgroundColor: activeBG,
									transform: [{ scale: pressed ? 0.96 : 1 }],
									shadowColor: isSelected ? COLORS.brandPrimary : "#000",
									shadowOpacity: isAndroid ? 0 : (isDarkMode ? 0.2 : 0.05),
									elevation: isAndroid ? 0 : 3,
								},
							]}
						>
							{isAndroid && (
								<View
									pointerEvents="none"
									style={[styles.androidShadowLayer, { backgroundColor: shadowLayerColor }]}
								/>
							)}

							<View style={styles.innerContent}>
								{/* Nested Squircle Icon */}
								<View style={[styles.iconBox, { 
									backgroundColor: isSelected ? COLORS.brandPrimary : (isDarkMode ? "#1E293B" : "#FFFFFF") 
								}]}>
									<SpecialtyIcon
										specialty={specialty}
										color={isSelected ? "#FFFFFF" : (isDarkMode ? "#94A3B8" : "#64748B")}
									/>
								</View>

								<View style={styles.textStack}>
									<Text style={[styles.specialtyName, { color: textColor }]}>
										{specialty}
									</Text>
									<Text style={[styles.countText, { color: mutedColor }]}>
										{safeCounts[specialty] ?? 0} Hospitals
									</Text>
								</View>
							</View>

							{/* Signature Corner Seal */}
							{isSelected && (
								<View style={styles.checkmarkWrapper}>
									<Ionicons name="checkmark-circle" size={18} color={COLORS.brandPrimary} />
								</View>
							)}
						</Pressable>
					);
				})}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginTop: 8,
		marginBottom: 0,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 14,
		paddingHorizontal: 4,
		gap: 8,
	},
	title: {
		fontSize: 11,
		fontWeight: "800",
		letterSpacing: 1.5,
		textTransform: "uppercase",
	},
	countLabel: {
		fontSize: 10,
		fontWeight: '900',
		backgroundColor: 'rgba(37, 99, 235, 0.1)',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
	},
	scrollContent: {
		paddingLeft: 4,
		paddingRight: 20,
		paddingBottom: 8, // Room for shadows
		gap: 12,
	},
	card: {
		minWidth: 140,
		padding: 12,
		borderRadius: 24, // Consistent rounding
		position: "relative",
		...Platform.select({
			ios: {
				shadowOffset: { width: 0, height: 4 },
				shadowRadius: 8,
			},
			android: { elevation: 0 },
		}),
	},
	androidShadowLayer: {
		position: "absolute",
		top: 2,
		left: 0,
		right: 0,
		bottom: -2,
		borderRadius: 24,
	},
	innerContent: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	iconBox: {
		width: 40,
		height: 40,
		borderRadius: 14, // Nested squircle
		justifyContent: "center",
		alignItems: "center",
		// Subtle shadow for the white icon box in light mode
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowOffset: { width: 0, height: 2 },
		shadowRadius: 4,
	},
	textStack: {
		flex: 1,
		justifyContent: 'center',
	},
	specialtyName: {
		fontSize: 13,
		fontWeight: "800",
		letterSpacing: -0.3,
	},
	countText: {
		fontSize: 10,
		fontWeight: '600',
		marginTop: 1,
		opacity: 0.6,
	},
	checkmarkWrapper: {
		position: "absolute",
		right: -4,
		bottom: -4,
		backgroundColor: 'transparent',
	},
});

import React, { useRef } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Fontisto, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";

export default function ServiceTypeSelector({ selectedType, onSelect, counts }) {
	const { isDarkMode } = useTheme();
	const lastCallTime = useRef(0);
	const DEBOUNCE_MS = 300;

	const safeCounts = counts || {};
	const safeSelectedType = selectedType || null;

	const serviceTypes = [
		{
			type: "Premium",
			icon: "ambulance",
			iconType: "fontisto",
			title: "Premium",
			gradientColors: [COLORS.brandPrimary, COLORS.brandSecondary],
			recommended: true,
		},
		{
			type: "Standard",
			icon: "medical",
			iconType: "ionicons",
			title: "Standard",
			gradientColors: [COLORS.brandSecondary, "#991B1B"],
			recommended: false,
		},
	];

	const handleSelect = (type) => {
		if (!type || !onSelect) return;
		const now = Date.now();
		if (now - lastCallTime.current < DEBOUNCE_MS) return;
		lastCallTime.current = now;

		const normalizedType = type.toLowerCase();
		if (normalizedType === (safeSelectedType?.toLowerCase())) return;

		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		onSelect(type);
	};

	const textColor = isDarkMode ? "#FFFFFF" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";

	return (
		<View style={styles.container}>
			{serviceTypes.map((service) => {
				const normalizedServiceType = service.type.toLowerCase();
				const isSelected = safeSelectedType?.toLowerCase() === normalizedServiceType;

				// Finalized Premium Background Logic
				const activeBG = isSelected
					? (isDarkMode ? COLORS.brandPrimary + "20" : COLORS.brandPrimary + "15")
					: (isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)");

				return (
					<Pressable
						key={service.type}
						onPress={() => handleSelect(normalizedServiceType)}
						style={({ pressed }) => [
							styles.card,
							{
								backgroundColor: activeBG,
								transform: [{ scale: pressed ? 0.98 : 1 }],
								shadowColor: isSelected ? COLORS.brandPrimary : "#000",
								shadowOpacity: isDarkMode ? 0.2 : 0.04,
							},
						]}
					>
						{/* Compact Icon Box */}
						<LinearGradient
							colors={service.gradientColors}
							style={styles.iconContainer}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
						>
							{service.iconType === "fontisto" ? (
								<Fontisto name={service.icon} size={16} color="#FFFFFF" />
							) : (
								<Ionicons name={service.icon} size={18} color="#FFFFFF" />
							)}
						</LinearGradient>

						{/* Content Row */}
						<View style={styles.content}>
							<Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
								{service.title}
							</Text>
							<Text style={[styles.subtitle, { color: mutedColor }]} numberOfLines={1}>
								{safeCounts[normalizedServiceType] ?? 0}
							</Text>
						</View>

						{/* Star Overlay on Icon (Compact Recommendation) */}
						{service.recommended && (
							<View style={styles.recommendedBadge}>
								<Ionicons name="star" size={8} color="#FFFFFF" />
							</View>
						)}

						{/* The "Corner Seal" Checkmark */}
						{isSelected && (
							<View style={styles.checkmarkWrapper}>
								<Ionicons name="checkmark-circle" size={20} color={COLORS.brandPrimary} />
							</View>
						)}
					</Pressable>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		gap: 10,
		paddingVertical: 4,
	},
	card: {
		flex: 1,
		flexDirection: "row", // Maintaining the Row layout for height constraint
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 12,
		borderRadius: 28, // High rounding but adjusted for compact height
		position: "relative",
		// Depth logic
		...Platform.select({
			ios: {
				shadowOffset: { width: 0, height: 4 },
				shadowRadius: 8,
			},
			android: { elevation: 2 },
		}),
	},
	iconContainer: {
		width: 42,
		height: 42,
		borderRadius: 15,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 10,
	},
	content: {
		flex: 1,
		justifyContent: 'center',
	},
	title: {
		fontSize: 13,
		fontWeight: "800", // Bold premium weight
		letterSpacing: -0.4,
	},
	subtitle: {
		fontSize: 10,
		fontWeight: "600",
		marginTop: 1,
		opacity: 0.7,
	},
	recommendedBadge: {
		position: "absolute",
		top: 8,
		left: 38, // Positioned relative to the icon container
		width: 14,
		height: 14,
		borderRadius: 7,
		backgroundColor: COLORS.brandPrimary,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1.5,
		borderColor: '#FFF', // Standardizes the badge look
	},
	checkmarkWrapper: {
		position: "absolute",
		right: -2,
		bottom: -2,
		shadowColor: COLORS.brandPrimary,
		shadowOpacity: 0.2,
		shadowRadius: 4,
	},
});
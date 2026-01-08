import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Fontisto, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";

/**
 * ServiceTypeSelector - Horizontal grid layout
 *
 * Compact side-by-side cards with:
 * - Solid card backgrounds matching app design
 * - Brand-consistent icon colors
 * - Selection indicator
 * - Hospital count per service type
 */
export default function ServiceTypeSelector({ selectedType, onSelect, counts }) {
	const { isDarkMode } = useTheme();
	
	const safeCounts = counts || {};
	const safeSelectedType = selectedType || null;

	const serviceTypes = [
		{
			type: "Premium",
			icon: "ambulance",
			iconType: "fontisto",
			title: "Premium",
			subtitle: "Priority",
			gradientColors: [COLORS.brandPrimary, COLORS.brandSecondary],
			recommended: true,
		},
		{
			type: "Standard",
			icon: "medical",
			iconType: "ionicons",
			title: "Standard",
			subtitle: "Basic",
			gradientColors: [COLORS.brandSecondary, "#991B1B"], // Dark red gradient - matches brand
			recommended: false,
		},
	];

	const handleSelect = (type) => {
		if (!type || !onSelect) return;
		try {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
			onSelect(type);
		} catch (error) {
			console.error("[ServiceTypeSelector] Error selecting type:", error);
		}
	};

	// Solid card colors matching app design system (no borders)
	const getCardBg = (isSelected) => isSelected
		? isDarkMode ? `${COLORS.brandPrimary}18` : `${COLORS.brandPrimary}10`
		: isDarkMode ? "#0B0F1A" : "#F3E7E7";

	const textColor = isDarkMode ? "#FFFFFF" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";

	const normalizedSelectedType = safeSelectedType ? safeSelectedType.toLowerCase() : "";

	return (
		<View style={styles.container}>
			{serviceTypes.map((service) => {
				const normalizedServiceType = service.type ? service.type.toLowerCase() : "";
				const isSelected = normalizedSelectedType === normalizedServiceType;
				const cardBg = getCardBg(isSelected);

				return (
					<Pressable
						key={service.type}
						onPress={() => handleSelect(normalizedServiceType)}
						style={({ pressed }) => [
							styles.card,
							{
								backgroundColor: cardBg,
								transform: [{ scale: pressed ? 0.97 : 1 }],
								...Platform.select({
									ios: {
										shadowColor: isSelected ? COLORS.brandPrimary : "#000",
										shadowOffset: { width: 0, height: isSelected ? 3 : 2 },
										shadowOpacity: isSelected ? 0.12 : 0.03,
										shadowRadius: isSelected ? 6 : 4,
									},
									android: { elevation: isSelected ? 3 : 1 },
								}),
							},
						]}
					>
						{/* Icon Container with Gradient */}
						<LinearGradient
							colors={service.gradientColors}
							style={styles.iconContainer}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
						>
							{service.iconType === "fontisto" ? (
								<Fontisto name={service.icon} size={18} color="#FFFFFF" />
							) : (
								<Ionicons name={service.icon} size={20} color="#FFFFFF" />
							)}
						</LinearGradient>

						{/* Content - Stacked vertically for grid layout */}
						<View style={styles.content}>
							<Text
								style={[
									styles.title,
									{ color: isSelected ? COLORS.brandPrimary : textColor },
								]}
								numberOfLines={1}
							>
								{service.title}
							</Text>
							<Text style={[styles.subtitle, { color: mutedColor }]} numberOfLines={1}>
								{safeCounts[service.type.toLowerCase()] ?? 0} available
							</Text>
						</View>

						{/* Selection Indicator - Top right */}
						{isSelected && (
							<View style={styles.checkIndicator}>
								<Ionicons name="checkmark-circle" size={18} color={COLORS.brandPrimary} />
							</View>
						)}

						{/* Recommended Badge - Only on Premium */}
						{service.recommended && (
							<View style={styles.recommendedBadge}>
								<Ionicons name="star" size={10} color="#FFFFFF" />
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
		flexDirection: "row", // Horizontal grid layout
		gap: 10,
	},
	card: {
		flex: 1, // Equal width cards
		flexDirection: "row",
		alignItems: "center",
		padding: 14,
		borderRadius: 24, // More rounded, no border
		position: "relative",
	},
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 10,
	},
	content: {
		flex: 1,
	},
	title: {
		fontSize: 14,
		fontWeight: "700",
		letterSpacing: -0.2,
	},
	subtitle: {
		fontSize: 11,
		marginTop: 2,
	},
	checkIndicator: {
		position: "absolute",
		top: 8,
		right: 8,
	},
	recommendedBadge: {
		position: "absolute",
		top: -4,
		right: -4,
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: COLORS.brandPrimary,
		alignItems: "center",
		justifyContent: "center",
	},
});

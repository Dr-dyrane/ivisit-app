import React from "react";
import { View, Text, Pressable, StyleSheet, Platform, Linking } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Ionicons, Fontisto } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";

/**
 * Call911Card - Emergency fallback when no services available
 *
 * Beautiful glass card with fade-in animation and urgent styling
 */
export default function Call911Card({ message = "No services available in your area" }) {
	const { isDarkMode } = useTheme();

	const handleCall911 = () => {
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
		Linking.openURL("tel:911");
	};

	// Solid card colors matching app design system (no borders)
	const cardBackground = isDarkMode ? "#0B0F1A" : "#F3E7E7";

	const textColor = isDarkMode ? "#FFFFFF" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";

	return (
		<Animated.View
			entering={FadeIn.duration(400).springify()}
			style={[
				styles.container,
				{
					backgroundColor: cardBackground,
					...Platform.select({
						ios: {
							shadowColor: "#000",
							shadowOffset: { width: 0, height: 4 },
							shadowOpacity: isDarkMode ? 0.08 : 0.04,
							shadowRadius: 8,
						},
						android: { elevation: 2 },
					}),
				},
			]}
		>
			{/* Icon */}
			<View style={styles.iconWrapper}>
				<LinearGradient
					colors={[COLORS.brandPrimary, "#991B1B"]}
					style={styles.iconContainer}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
				>
					<Fontisto name="ambulance" size={28} color="#FFFFFF" />
				</LinearGradient>
			</View>

			{/* Message */}
			<Text style={[styles.title, { color: textColor }]}>
				Emergency Services Needed?
			</Text>
			<Text style={[styles.message, { color: mutedColor }]}>
				{message}
			</Text>

			{/* Call 911 Button */}
			<Pressable
				onPress={handleCall911}
				style={({ pressed }) => [
					styles.callButton,
					{
						backgroundColor: COLORS.brandPrimary,
						transform: [{ scale: pressed ? 0.97 : 1 }],
						...Platform.select({
							ios: {
								shadowColor: COLORS.brandPrimary,
								shadowOffset: { width: 0, height: 8 },
								shadowOpacity: 0.4,
								shadowRadius: 12,
							},
							android: { elevation: 8 },
						}),
					},
				]}
			>
				<Ionicons name="call" size={22} color="#FFFFFF" />
				<Text style={styles.callButtonText}>Call 911</Text>
			</Pressable>

			{/* Disclaimer */}
			<Text style={[styles.disclaimer, { color: mutedColor }]}>
				For life-threatening emergencies, call 911 immediately
			</Text>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		borderRadius: 30, // More rounded, no border
		padding: 28,
		alignItems: "center",
	},
	iconWrapper: {
		marginBottom: 20,
	},
	iconContainer: {
		width: 72,
		height: 72,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
	},
	title: {
		fontSize: 20,
		fontWeight: "800",
		letterSpacing: -0.3,
		marginBottom: 8,
		textAlign: "center",
	},
	message: {
		fontSize: 14,
		textAlign: "center",
		marginBottom: 24,
		lineHeight: 20,
	},
	callButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 16,
		paddingHorizontal: 40,
		borderRadius: 16,
		gap: 10,
		width: "100%",
	},
	callButtonText: {
		color: "#FFFFFF",
		fontSize: 18,
		fontWeight: "800",
		letterSpacing: 0.5,
	},
	disclaimer: {
		fontSize: 11,
		textAlign: "center",
		marginTop: 16,
	},
});


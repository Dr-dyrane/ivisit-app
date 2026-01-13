import React from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";
import * as Haptics from "expo-haptics";

export default function ServiceSelection({ onSelect }) {
	const { isDarkMode } = useTheme();

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		cardBg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
	};

	const handlePress = (type) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onSelect(type);
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={[styles.title, { color: colors.text }]}>
					How would you like to be seen?
				</Text>
				<Text style={[styles.subtitle, { color: colors.textMuted }]}>
					Choose the type of care that suits you best.
				</Text>
			</View>

			<View style={styles.optionsContainer}>
				<Pressable 
					onPress={() => handlePress("clinic")}
					style={({ pressed }) => [
						styles.card,
						{ 
							backgroundColor: colors.cardBg,
							transform: [{ scale: pressed ? 0.98 : 1 }]
						}
					]}
				>
					<View style={styles.cardContent}>
						<View style={styles.identityWidget}>
							<View
								style={[
									styles.iconCircle,
									{ backgroundColor: COLORS.brandPrimary + "15" },
								]}
							>
								<Ionicons
									name="business"
									size={28}
									color={COLORS.brandPrimary}
								/>
							</View>
							<View style={styles.textContainer}>
								<Text style={[styles.cardTitle, { color: colors.text }]}>
									In-Clinic
								</Text>
								<Text style={[styles.cardDesc, { color: colors.textMuted }]}>
									Visit a doctor at a hospital or clinic nearby.
								</Text>
							</View>
						</View>
						<Ionicons
							name="chevron-forward"
							size={20}
							color={colors.textMuted}
						/>
					</View>
				</Pressable>

				<Pressable 
					onPress={() => handlePress("telehealth")}
					style={({ pressed }) => [
						styles.card,
						{ 
							backgroundColor: colors.cardBg,
							transform: [{ scale: pressed ? 0.98 : 1 }]
						}
					]}
				>
					<View style={styles.cardContent}>
						<View style={styles.identityWidget}>
							<View
								style={[styles.iconCircle, { backgroundColor: "#10B98115" }]}
							>
								<Ionicons name="videocam" size={28} color="#10B981" />
							</View>
							<View style={styles.textContainer}>
								<Text style={[styles.cardTitle, { color: colors.text }]}>
									Telehealth
								</Text>
								<Text style={[styles.cardDesc, { color: colors.textMuted }]}>
									Video consultation from the comfort of home.
								</Text>
							</View>
						</View>
						<Ionicons
							name="chevron-forward"
							size={20}
							color={colors.textMuted}
						/>
					</View>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 20,
	},
	header: {
		paddingVertical: 24,
	},
	title: {
		fontSize: 28,
		fontWeight: "900",
		marginBottom: 8,
		letterSpacing: -1,
		lineHeight: 34,
	},
	subtitle: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: "500",
	},
	optionsContainer: {
		gap: 12,
	},
	card: {
		borderRadius: 32,
		padding: 24,
	},
	cardContent: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	identityWidget: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
		gap: 16,
	},
	iconCircle: {
		width: 60,
		height: 60,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
	},
	textContainer: {
		flex: 1,
	},
	cardTitle: {
		fontSize: 19,
		fontWeight: "800",
		letterSpacing: -0.5,
		marginBottom: 2,
	},
	cardDesc: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "500",
	},
});

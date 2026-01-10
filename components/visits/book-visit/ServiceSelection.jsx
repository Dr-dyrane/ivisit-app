import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";

export default function ServiceSelection({ onSelect }) {
	const { isDarkMode } = useTheme();

	const cardStyle = {
		backgroundColor: isDarkMode ? "#0B0F1A" : "#FFFFFF",
		borderRadius: 24,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: isDarkMode ? 0 : 0.05,
		shadowRadius: 12,
		elevation: 4,
	};
		const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		searchBg: isDarkMode ? "#0B0F1A" : "#F3E7E7", // Match EmergencySearchBar
		cardBg: isDarkMode ? "#0B0F1A" : "#FFFFFF",
	};

	return (
		<View style={styles.container}>
			<Text style={[styles.title, { color: colors.text }]}>
				How would you like to be seen?
			</Text>
			<Text style={[styles.subtitle, { color: colors.textMuted }]}>
				Choose the type of care that suits you best.
			</Text>

			<View style={styles.optionsContainer}>
				<Pressable onPress={() => onSelect("clinic")}>
					<View style={[styles.card, cardStyle]}>
						<View style={styles.cardContent}>
							<View
								style={[
									styles.iconCircle,
									{ backgroundColor: COLORS.brandPrimary + "15" },
								]}
							>
								<Ionicons
									name="business"
									size={32}
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
							<Ionicons
								name="chevron-forward"
								size={24}
								color={colors.textMuted}
							/>
						</View>
					</View>
				</Pressable>

				<Pressable onPress={() => onSelect("telehealth")}>
					<View style={[styles.card, cardStyle]}>
						<View style={styles.cardContent}>
							<View
								style={[styles.iconCircle, { backgroundColor: "#10B98115" }]}
							>
								<Ionicons name="videocam" size={32} color="#10B981" />
							</View>
							<View style={styles.textContainer}>
								<Text style={[styles.cardTitle, { color: colors.text }]}>
									Telehealth
								</Text>
								<Text style={[styles.cardDesc, { color: colors.textMuted }]}>
									Video consultation from the comfort of home.
								</Text>
							</View>
							<Ionicons
								name="chevron-forward"
								size={24}
								color={colors.textMuted}
							/>
						</View>
					</View>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: "900",
		marginBottom: 8,
		letterSpacing: -0.5,
	},
	subtitle: {
		fontSize: 16,
		marginBottom: 24,
		lineHeight: 22,
	},
	optionsContainer: {
		gap: 16,
	},
	card: {
		padding: 20,
	},
	cardContent: {
		flexDirection: "row",
		alignItems: "center",
		gap: 16,
	},
	iconCircle: {
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: "center",
		justifyContent: "center",
	},
	textContainer: {
		flex: 1,
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: "800",
		marginBottom: 4,
	},
	cardDesc: {
		fontSize: 13,
		lineHeight: 18,
	},
});

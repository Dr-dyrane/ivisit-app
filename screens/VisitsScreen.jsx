"use client";

import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { COLORS } from "../constants/colors";

const VisitsScreen = () => {
	const { isDarkMode } = useTheme();

	const backgroundColor = isDarkMode ? COLORS.bgDark : COLORS.bgLight;
	const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
	const cardBg = isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt;

	return (
		<ScrollView
			style={[styles.container, { backgroundColor }]}
			contentContainerStyle={styles.content}
		>
			<View style={[styles.emptyState, { backgroundColor: cardBg }]}>
				<Ionicons
					name="calendar-outline"
					size={64}
					color={COLORS.brandPrimary}
				/>
				<Text style={[styles.emptyTitle, { color: textColor }]}>
					No Visits Yet
				</Text>
				<Text
					style={[
						styles.emptyText,
						{ color: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted },
					]}
				>
					Your upcoming and past medical visits will appear here
				</Text>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		flexGrow: 1,
		padding: 20,
	},
	emptyState: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 40,
		borderRadius: 16,
		marginTop: 60,
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: "bold",
		marginTop: 16,
		marginBottom: 8,
	},
	emptyText: {
		fontSize: 14,
		textAlign: "center",
		lineHeight: 20,
	},
});

export default VisitsScreen;

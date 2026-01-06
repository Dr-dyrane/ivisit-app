import { View, Text, ScrollView, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { COLORS } from "../constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const VisitsScreen = () => {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();

	const backgroundColor = isDarkMode ? COLORS.bgDark : COLORS.bgLight;
	const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
	const cardBg = isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt;

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;

	return (
		<ScrollView
			style={[styles.container, { backgroundColor }]}
			contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
			showsVerticalScrollIndicator={false}
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

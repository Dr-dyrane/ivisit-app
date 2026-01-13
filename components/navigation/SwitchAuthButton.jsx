import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

export default function SwitchAuthButton({ target }) {
	const router = useRouter();
	const { isDarkMode } = useTheme();

	const isLogin = target === "login";
	const label = isLogin ? "Login" : "Sign Up";
	const question = isLogin ? "Have an account?" : "Need care?";

	return (
		<Pressable
			onPress={() => router.push(target)}
			style={({ pressed }) => [
				styles.container,
				{
					backgroundColor: isDarkMode
						? "rgba(255, 255, 255, 0.05)"
						: "rgba(0, 0, 0, 0.03)",
					opacity: pressed ? 0.7 : 1,
				},
			]}
		>
			<View style={styles.content}>
				<Text style={[styles.questionText, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
					{question}
				</Text>
				<Text style={[styles.labelText, { color: COLORS.brandPrimary }]}>
					{label}
				</Text>
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
	},
	content: {
		alignItems: "center",
	},
	questionText: {
		fontSize: 10,
		fontWeight: "600",
		letterSpacing: 0.2,
	},
	labelText: {
		fontSize: 12,
		fontWeight: "800",
		textTransform: "uppercase",
		marginTop: -1,
	},
});

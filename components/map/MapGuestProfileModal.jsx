import React from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import MapModalShell from "./MapModalShell";

export default function MapGuestProfileModal({
	visible,
	onClose,
	emailValue,
	onEmailChange,
	onContinue,
}) {
	const { isDarkMode } = useTheme();
	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const inputSurface = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)";
	const avatarSurface = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)";

	return (
		<MapModalShell
			visible={visible}
			onClose={onClose}
			title={null}
			minHeightRatio={0.78}
			contentContainerStyle={styles.content}
		>
			<View style={[styles.avatarOrb, { backgroundColor: avatarSurface }]}>
				<Ionicons name="person" size={52} color={mutedColor} />
			</View>

			<Text style={[styles.title, { color: titleColor }]}>What&apos;s your email?</Text>

			<View style={[styles.inputShell, { backgroundColor: inputSurface }]}>
				<Ionicons name="mail-outline" size={18} color={mutedColor} />
				<TextInput
					value={emailValue}
					onChangeText={onEmailChange}
					placeholder="Email"
					placeholderTextColor={mutedColor}
					style={[styles.input, { color: titleColor }]}
					keyboardType="email-address"
					autoCapitalize="none"
					autoCorrect={false}
					autoComplete="email"
				/>
			</View>

			{Platform.OS === "web" && typeof onContinue === "function" ? (
				<Pressable onPress={onContinue} style={styles.continueButton}>
					<Text style={styles.continueButtonText}>Continue</Text>
				</Pressable>
			) : null}
		</MapModalShell>
	);
}

const styles = StyleSheet.create({
	content: {
		paddingTop: 10,
		paddingBottom: 12,
		alignItems: "center",
	},
	avatarOrb: {
		width: 112,
		height: 112,
		borderRadius: 56,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 22,
		shadowColor: "#000000",
		shadowOpacity: 0.12,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: 10 },
	},
	title: {
		fontSize: 28,
		lineHeight: 32,
		fontWeight: "900",
		letterSpacing: -0.9,
		textAlign: "center",
	},
	inputShell: {
		marginTop: 18,
		width: "100%",
		minHeight: 58,
		borderRadius: 24,
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	input: {
		flex: 1,
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "400",
	},
	continueButton: {
		marginTop: 16,
		minWidth: 160,
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderRadius: 999,
		backgroundColor: "#86100E",
		alignItems: "center",
		justifyContent: "center",
	},
	continueButtonText: {
		color: "#FFFFFF",
		fontSize: 15,
		lineHeight: 18,
		fontWeight: "800",
	},
});

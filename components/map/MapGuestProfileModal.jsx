import React from "react";
import {
	Modal,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";

export default function MapGuestProfileModal({
	visible,
	onClose,
	onContinueWithEmail,
}) {
	const { isDarkMode } = useTheme();

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			statusBarTranslucent
			onRequestClose={onClose}
		>
			<View style={styles.modalRoot}>
				<Pressable style={styles.backdrop} onPress={onClose} />
				<View style={styles.cardHost}>
					<BlurView
						intensity={isDarkMode ? 48 : 56}
						tint={isDarkMode ? "dark" : "light"}
						style={styles.cardBlur}
					>
						<View
							style={[
								styles.cardSurface,
								{
									backgroundColor: isDarkMode
										? "rgba(8, 15, 27, 0.82)"
										: "rgba(255, 255, 255, 0.84)",
								},
							]}
						>
							<View
								style={[
									styles.iconWrap,
									{
										backgroundColor: isDarkMode
											? "rgba(255, 255, 255, 0.08)"
											: "rgba(15, 23, 42, 0.06)",
									},
								]}
							>
								<Ionicons
									name="person-circle-outline"
									size={32}
									color={isDarkMode ? "#F8FAFC" : "#86100E"}
								/>
							</View>

							<Text
								style={[
									styles.title,
									{ color: isDarkMode ? "#F8FAFC" : "#0F172A" },
								]}
							>
								Restore your profile
							</Text>
							<Text
								style={[
									styles.body,
									{ color: isDarkMode ? "#CBD5E1" : "#475569" },
								]}
							>
								Sign in to load your medical profile, saved details, and history on this
								device. You can keep exploring as a guest until you commit.
							</Text>

							<Pressable onPress={onContinueWithEmail} style={styles.primaryButton}>
								<Text style={styles.primaryButtonText}>Continue with email</Text>
							</Pressable>
							<Pressable onPress={onClose} style={styles.secondaryButton}>
								<Text
									style={[
										styles.secondaryButtonText,
										{ color: isDarkMode ? "#CBD5E1" : "#475569" },
									]}
								>
									Not now
								</Text>
							</Pressable>
						</View>
					</BlurView>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	modalRoot: {
		flex: 1,
		justifyContent: "center",
		paddingHorizontal: 20,
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0, 0, 0, 0.44)",
	},
	cardHost: {
		borderRadius: 34,
		overflow: "hidden",
	},
	cardBlur: {
		borderRadius: 34,
	},
	cardSurface: {
		borderRadius: 34,
		paddingHorizontal: 22,
		paddingVertical: 24,
	},
	iconWrap: {
		width: 64,
		height: 64,
		borderRadius: 32,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 16,
	},
	title: {
		fontSize: 26,
		lineHeight: 30,
		fontWeight: "900",
		letterSpacing: -0.8,
	},
	body: {
		marginTop: 10,
		fontSize: 15,
		lineHeight: 22,
		fontWeight: "500",
	},
	primaryButton: {
		marginTop: 24,
		minHeight: 56,
		borderRadius: 24,
		backgroundColor: "#86100E",
		alignItems: "center",
		justifyContent: "center",
	},
	primaryButtonText: {
		color: "#FFFFFF",
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "800",
	},
	secondaryButton: {
		marginTop: 10,
		minHeight: 48,
		alignItems: "center",
		justifyContent: "center",
	},
	secondaryButtonText: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: "700",
	},
});

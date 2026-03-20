import React from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

const AddPaymentMethodModal = ({ onClose, loading = false }) => {
	const { isDarkMode } = useTheme();

	return (
		<Modal visible transparent animationType="fade" onRequestClose={onClose}>
			<View
				style={[
					styles.overlay,
					{
						backgroundColor: isDarkMode
							? "rgba(2, 6, 23, 0.82)"
							: "rgba(15, 23, 42, 0.18)",
					},
				]}
			>
				<View
					style={[
						styles.card,
						{
							backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF",
							borderColor: isDarkMode
								? "rgba(148, 163, 184, 0.18)"
								: "rgba(15, 23, 42, 0.08)",
						},
					]}
				>
					<View style={styles.iconWrap}>
						<Ionicons name="card-outline" size={24} color={COLORS.brandPrimary} />
					</View>
					<Text
						style={[
							styles.title,
							{ color: isDarkMode ? "#F8FAFC" : "#0F172A" },
						]}
					>
						Card setup is only available in the mobile app
					</Text>
					<Text
						style={[
							styles.body,
							{ color: isDarkMode ? "#94A3B8" : "#475569" },
						]}
					>
						Use iVisit on iOS or Android to link a debit or credit card securely.
					</Text>
					<TouchableOpacity
						style={[
							styles.button,
							loading && styles.buttonDisabled,
						]}
						onPress={onClose}
						disabled={loading}
					>
						<Text style={styles.buttonText}>Close</Text>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 24,
	},
	card: {
		width: "100%",
		maxWidth: 420,
		borderRadius: 28,
		padding: 24,
		borderWidth: 1,
		alignItems: "center",
	},
	iconWrap: {
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(14, 165, 233, 0.12)",
		marginBottom: 16,
	},
	title: {
		fontSize: 20,
		fontWeight: "700",
		textAlign: "center",
		marginBottom: 10,
	},
	body: {
		fontSize: 15,
		lineHeight: 22,
		textAlign: "center",
		marginBottom: 24,
	},
	button: {
		minWidth: 140,
		height: 48,
		borderRadius: 16,
		backgroundColor: COLORS.brandPrimary,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 20,
	},
	buttonDisabled: {
		opacity: 0.6,
	},
	buttonText: {
		color: "#FFFFFF",
		fontSize: 15,
		fontWeight: "700",
	},
});

export default AddPaymentMethodModal;

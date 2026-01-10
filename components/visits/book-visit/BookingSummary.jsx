import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useTheme } from "../../../contexts/ThemeContext";
import { COLORS } from "../../../constants/colors";

export default function BookingSummary({
	bookingData,
	isSubmitting,
	onConfirm
}) {
	const { isDarkMode } = useTheme();

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		cardBg: isDarkMode ? "#0B0F1A" : "#FFFFFF",
	};

	const cardStyle = {
		backgroundColor: colors.cardBg,
		borderRadius: 24,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: isDarkMode ? 0 : 0.05,
		shadowRadius: 12,
		elevation: 4,
	};

	return (
		<ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
			<Text style={[styles.title, { color: colors.text }]}>Confirm Booking</Text>
			<Text style={[styles.subtitle, { color: colors.textMuted }]}>Please review your appointment details.</Text>

			<View style={[styles.summaryCard, cardStyle]}>
				<View style={styles.summaryHeader}>
					<View style={[styles.summaryIcon, { backgroundColor: COLORS.brandPrimary + '20' }]}>
						<Ionicons name={bookingData.type === 'telehealth' ? "videocam" : "medical"} size={24} color={COLORS.brandPrimary} />
					</View>
					<View>
						<Text style={[styles.summaryType, { color: colors.text }]}>
							{bookingData.type === 'telehealth' ? "Telehealth Visit" : "In-Clinic Appointment"}
						</Text>
						<Text style={[styles.summarySpecialty, { color: colors.textMuted }]}>{bookingData.specialty}</Text>
					</View>
				</View>

				<View style={styles.divider} />

				<View style={styles.summaryRow}>
					<Ionicons name="person-outline" size={18} color={colors.textMuted} />
					<Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Provider</Text>
					<Text style={[styles.summaryValue, { color: colors.text }]}>{bookingData.doctor?.name}</Text>
				</View>
				<View style={styles.summaryRow}>
					<Ionicons name="location-outline" size={18} color={colors.textMuted} />
					<Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Location</Text>
					<Text style={[styles.summaryValue, { color: colors.text }]} numberOfLines={1}>{bookingData.hospital?.name}</Text>
				</View>
				<View style={styles.summaryRow}>
					<Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
					<Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Date</Text>
					<Text style={[styles.summaryValue, { color: colors.text }]}>
						{bookingData.date ? format(bookingData.date, 'MMMM do, yyyy') : '-'}
					</Text>
				</View>
				<View style={styles.summaryRow}>
					<Ionicons name="time-outline" size={18} color={colors.textMuted} />
					<Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Time</Text>
					<Text style={[styles.summaryValue, { color: colors.text }]}>{bookingData.time}</Text>
				</View>
			</View>

			<View style={styles.policyContainer}>
				<Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
				<Text style={[styles.policyText, { color: colors.textMuted }]}>
					Cancellation is available up to 2 hours before the appointment.
				</Text>
			</View>

			<Pressable 
				onPress={onConfirm}
				style={({ pressed }) => [
					styles.primaryButton, 
					{ backgroundColor: COLORS.brandPrimary, marginTop: 24, opacity: isSubmitting ? 0.7 : (pressed ? 0.9 : 1) }
				]}
				disabled={isSubmitting}
			>
				<Text style={styles.primaryButtonText}>{isSubmitting ? "Booking..." : "Confirm Booking"}</Text>
			</Pressable>
		</ScrollView>
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
	summaryCard: {
		padding: 20,
	},
	summaryHeader: {
		flexDirection: "row",
		gap: 16,
		alignItems: "center",
		marginBottom: 20,
	},
	summaryIcon: {
		width: 48,
		height: 48,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	summaryType: {
		fontSize: 18,
		fontWeight: "800",
	},
	summarySpecialty: {
		fontSize: 14,
	},
	divider: {
		height: 1,
		backgroundColor: "rgba(150,150,150,0.2)",
		marginBottom: 20,
	},
	summaryRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		marginBottom: 16,
	},
	summaryLabel: {
		width: 80,
		fontSize: 14,
		fontWeight: "500",
	},
	summaryValue: {
		flex: 1,
		fontSize: 14,
		fontWeight: "700",
	},
	policyContainer: {
		flexDirection: "row",
		gap: 10,
		marginTop: 24,
		paddingHorizontal: 10,
	},
	policyText: {
		flex: 1,
		fontSize: 12,
		lineHeight: 18,
	},
	primaryButton: {
		height: 56,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 4,
	},
	primaryButtonText: {
		color: "#FFFFFF",
		fontSize: 16,
		fontWeight: "800",
	},
});

import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useTheme } from "../../../contexts/ThemeContext";
import { COLORS } from "../../../constants/colors";
import * as Haptics from "expo-haptics";

export default function BookingSummary({
	bookingData,
	isSubmitting,
	onConfirm
}) {
	const { isDarkMode } = useTheme();

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		cardBg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
	};

	const handleConfirmPress = () => {
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		onConfirm();
	};

	return (
		<ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
			<View style={styles.header}>
				<Text style={[styles.title, { color: colors.text }]}>Confirm Booking</Text>
				<Text style={[styles.subtitle, { color: colors.textMuted }]}>Please review your appointment details.</Text>
			</View>

			<View style={[styles.summaryCard, { backgroundColor: colors.cardBg }]}>
				<View style={styles.summaryHeader}>
					<View style={[styles.summaryIcon, { backgroundColor: COLORS.brandPrimary + '15' }]}>
						<Ionicons name={bookingData.type === 'telehealth' ? "videocam" : "medical"} size={26} color={COLORS.brandPrimary} />
					</View>
					<View style={{ flex: 1 }}>
						<Text style={[styles.summaryType, { color: colors.text }]}>
							{bookingData.type === 'telehealth' ? "Telehealth Visit" : "In-Clinic Appointment"}
						</Text>
						<Text style={[styles.summarySpecialty, { color: colors.textMuted }]}>{bookingData.specialty}</Text>
					</View>
				</View>

				<View style={[styles.divider, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]} />

				<View style={styles.detailsList}>
					<View style={styles.summaryRow}>
						<View style={styles.iconBox}>
							<Ionicons name="person" size={16} color={COLORS.brandPrimary} />
						</View>
						<View>
							<Text style={[styles.summaryLabel, { color: colors.textMuted }]}>PROVIDER</Text>
							<Text style={[styles.summaryValue, { color: colors.text }]}>{bookingData.doctor?.name}</Text>
						</View>
					</View>
					<View style={styles.summaryRow}>
						<View style={styles.iconBox}>
							<Ionicons name="location" size={16} color={COLORS.brandPrimary} />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={[styles.summaryLabel, { color: colors.textMuted }]}>LOCATION</Text>
							<Text style={[styles.summaryValue, { color: colors.text }]} numberOfLines={1}>{bookingData.hospital?.name}</Text>
						</View>
					</View>
					<View style={styles.summaryRow}>
						<View style={styles.iconBox}>
							<Ionicons name="calendar" size={16} color={COLORS.brandPrimary} />
						</View>
						<View>
							<Text style={[styles.summaryLabel, { color: colors.textMuted }]}>DATE</Text>
							<Text style={[styles.summaryValue, { color: colors.text }]}>
								{bookingData.date ? format(bookingData.date, 'MMMM do, yyyy') : '-'}
							</Text>
						</View>
					</View>
					<View style={styles.summaryRow}>
						<View style={styles.iconBox}>
							<Ionicons name="time" size={16} color={COLORS.brandPrimary} />
						</View>
						<View>
							<Text style={[styles.summaryLabel, { color: colors.textMuted }]}>TIME SLOT</Text>
							<Text style={[styles.summaryValue, { color: colors.text }]}>{bookingData.time}</Text>
						</View>
					</View>
				</View>
			</View>

			<View style={styles.policyContainer}>
				<Ionicons name="information-circle" size={18} color={COLORS.brandPrimary} />
				<Text style={[styles.policyText, { color: colors.textMuted }]}>
					Cancellation is available up to 2 hours before the appointment.
				</Text>
			</View>

			<Pressable 
				onPress={handleConfirmPress}
				style={({ pressed }) => [
					styles.primaryButton, 
					{ 
						backgroundColor: COLORS.brandPrimary, 
						opacity: isSubmitting ? 0.7 : (pressed ? 0.9 : 1),
						transform: [{ scale: pressed ? 0.98 : 1 }]
					}
				]}
				disabled={isSubmitting}
			>
				<Text style={styles.primaryButtonText}>{isSubmitting ? "BOOKING..." : "CONFIRM BOOKING"}</Text>
				{!isSubmitting && <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />}
			</Pressable>
		</ScrollView>
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
		letterSpacing: -1,
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: "500",
	},
	summaryCard: {
		borderRadius: 36,
		padding: 24,
	},
	summaryHeader: {
		flexDirection: "row",
		gap: 16,
		alignItems: "center",
		marginBottom: 24,
	},
	summaryIcon: {
		width: 56,
		height: 56,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	summaryType: {
		fontSize: 19,
		fontWeight: "800",
		letterSpacing: -0.5,
	},
	summarySpecialty: {
		fontSize: 14,
		fontWeight: "500",
		marginTop: 2,
	},
	divider: {
		height: 1,
		marginBottom: 24,
	},
	detailsList: {
		gap: 20,
	},
	summaryRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 16,
	},
	iconBox: {
		width: 36,
		height: 36,
		borderRadius: 12,
		backgroundColor: 'rgba(134, 16, 14, 0.08)',
		alignItems: "center",
		justifyContent: "center",
	},
	summaryLabel: {
		fontSize: 10,
		fontWeight: "800",
		letterSpacing: 1,
		marginBottom: 2,
	},
	summaryValue: {
		fontSize: 16,
		fontWeight: "700",
		letterSpacing: -0.3,
	},
	policyContainer: {
		flexDirection: "row",
		gap: 12,
		marginTop: 32,
		paddingHorizontal: 8,
		alignItems: "center",
	},
	policyText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "500",
	},
	primaryButton: {
		height: 64,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: 12,
		marginTop: 32,
		shadowColor: COLORS.brandPrimary,
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.25,
		shadowRadius: 15,
		elevation: 8,
	},
	primaryButtonText: {
		color: "#FFFFFF",
		fontSize: 16,
		fontWeight: "900",
		letterSpacing: 1,
	},
});

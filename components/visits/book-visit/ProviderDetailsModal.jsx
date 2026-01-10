import React from "react";
import { View, Text, Modal, ScrollView, Pressable, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext";
import { COLORS } from "../../../constants/colors";

export default function ProviderDetailsModal({
	visible,
	onClose,
	provider,
	specialty,
	onConfirm
}) {
	const { isDarkMode } = useTheme();

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		border: "rgba(150,150,150,0.1)",
		modalBg: isDarkMode ? "#121826" : "#FFFFFF",
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent={true}
			onRequestClose={onClose}
		>
			<View style={styles.modalOverlay}>
				<View style={[styles.providerModalContent, { backgroundColor: colors.modalBg }]}>
					<ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
						<View style={styles.providerHeader}>
							<View style={[styles.largeProviderImage, { backgroundColor: COLORS.brandPrimary }]}>
								{provider?.image && (
									<Image source={{ uri: provider.image }} style={styles.largeProviderImage} />
								)}
							</View>
							<Text style={[styles.providerNameLarge, { color: colors.text }]}>{provider?.doctorName}</Text>
							<Text style={[styles.providerSpecialty, { color: colors.textMuted }]}>{specialty}</Text>
							<View style={styles.ratingBadge}>
								<Ionicons name="star" size={16} color="#F59E0B" />
								<Text style={[styles.ratingTextLarge, { color: colors.text }]}>
									{provider?.rating} ({provider?.reviews} reviews)
								</Text>
							</View>
						</View>

						<View style={[styles.divider, { backgroundColor: colors.border }]} />

						<View style={[styles.infoSection, { borderBottomColor: colors.border }]}>
							<Text style={[styles.sectionHeader, { color: colors.textMuted }]}>About</Text>
							<Text style={[styles.bioText, { color: colors.text }]}>{provider?.bio}</Text>
						</View>

						<View style={[styles.infoSection, { borderBottomColor: colors.border }]}>
							<Text style={[styles.sectionHeader, { color: colors.textMuted }]}>Location</Text>
							<View style={styles.locationRow}>
								<Ionicons name="location" size={20} color={COLORS.brandPrimary} />
								<View>
									<Text style={[styles.locationName, { color: colors.text }]}>{provider?.name}</Text>
									<Text style={[styles.locationAddress, { color: colors.textMuted }]}>{provider?.address}</Text>
								</View>
							</View>
						</View>

						<View style={[styles.infoSection, { borderBottomColor: colors.border }]}>
							<Text style={[styles.sectionHeader, { color: colors.textMuted }]}>Next Available</Text>
							<View style={styles.availabilityBadge}>
								<Ionicons name="time" size={16} color="#10B981" />
								<Text style={[styles.availabilityText, { color: "#10B981" }]}>{provider?.nextAvailable}</Text>
							</View>
						</View>
					</ScrollView>

					<View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
						<Pressable onPress={onClose} style={styles.secondaryButton}>
							<Text style={[styles.secondaryButtonText, { color: colors.text }]}>Close</Text>
						</Pressable>
						<Pressable onPress={onConfirm} style={[styles.primaryButton, { flex: 1, marginTop: 0 }]}>
							<Text style={styles.primaryButtonText}>Select Provider</Text>
						</Pressable>
					</View>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "flex-end",
	},
	providerModalContent: {
		maxHeight: "85%",
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 0,
	},
	providerHeader: {
		alignItems: "center",
		padding: 24,
		paddingBottom: 16,
	},
	largeProviderImage: {
		width: 80,
		height: 80,
		borderRadius: 40,
		marginBottom: 16,
	},
	providerNameLarge: {
		fontSize: 22,
		fontWeight: "800",
		textAlign: "center",
		marginBottom: 4,
	},
	providerSpecialty: {
		fontSize: 16,
		marginBottom: 12,
	},
	ratingBadge: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(245, 158, 11, 0.1)",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12,
	},
	ratingTextLarge: {
		fontSize: 14,
		fontWeight: "700",
		marginLeft: 6,
	},
	divider: {
		height: 1,
		width: "100%",
	},
	infoSection: {
		padding: 24,
		borderBottomWidth: 1,
	},
	sectionHeader: {
		fontSize: 14,
		fontWeight: "800",
		textTransform: "uppercase",
		letterSpacing: 1,
		marginBottom: 12,
	},
	bioText: {
		fontSize: 15,
		lineHeight: 22,
	},
	locationRow: {
		flexDirection: "row",
		gap: 12,
		marginTop: 8,
	},
	locationName: {
		fontSize: 16,
		fontWeight: "700",
		marginBottom: 4,
	},
	locationAddress: {
		fontSize: 14,
	},
	availabilityBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginTop: 8,
	},
	availabilityText: {
		fontSize: 14,
		fontWeight: "700",
	},
	modalFooter: {
		padding: 24,
		flexDirection: "row",
		gap: 16,
		borderTopWidth: 1,
	},
	secondaryButton: {
		paddingHorizontal: 24,
		height: 56,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "rgba(150,150,150,0.1)",
	},
	secondaryButtonText: {
		fontSize: 16,
		fontWeight: "700",
	},
	primaryButton: {
		height: 56,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: COLORS.brandPrimary,
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

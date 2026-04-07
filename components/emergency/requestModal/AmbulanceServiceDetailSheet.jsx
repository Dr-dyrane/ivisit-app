import React from "react";
import {
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";
import AmbulanceTierProductGraphic from "./AmbulanceTierProductGraphic";
import { getAmbulanceVisualProfile } from "./ambulanceTierVisuals";

export default function AmbulanceServiceDetailSheet({
	visible,
	service,
	onClose,
	onConfirm,
	isSelected = false,
	requestColors,
	pickupLine,
	hospitalName,
	costLine,
	etaText,
}) {
	const { isDarkMode } = useTheme();

	if (!service) {
		return null;
	}

	const visualProfile = getAmbulanceVisualProfile(service);
	const featureList = Array.isArray(visualProfile.features) ? visualProfile.features : [];
	const serviceTitle = service.title || service.name || visualProfile.label;
	const summaryCopy = visualProfile.marketingLine || service.subtitle || service.description || "A calm, fast ride to the hospital.";
	const sheetBg = isDarkMode ? "#0F172A" : "#FFFFFF";
	const softSurface = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)";
	const textColor = requestColors?.text || (isDarkMode ? COLORS.textLight : COLORS.textPrimary);
	const mutedColor = requestColors?.textMuted || (isDarkMode ? "#94A3B8" : "#64748B");

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<View style={styles.overlay}>
				<Pressable style={styles.backdrop} onPress={onClose} />
				<View style={[styles.sheet, { backgroundColor: sheetBg }]}> 
					<View style={styles.handle} />
					<ScrollView
						style={styles.scroll}
						contentContainerStyle={styles.scrollContent}
						showsVerticalScrollIndicator={false}
					>
						<View style={styles.headerRow}>
							<View style={{ flex: 1 }}>
								<Text style={[styles.eyebrow, { color: visualProfile.accent }]}>
									Recommended for this trip
								</Text>
								<Text style={[styles.title, { color: textColor }]}>
									{serviceTitle}
								</Text>
								<Text style={[styles.subtitle, { color: mutedColor }]}>
									{summaryCopy}
								</Text>
							</View>
							<Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: softSurface }]}> 
								<Ionicons name="close" size={18} color={textColor} />
							</Pressable>
						</View>

						<View style={[styles.heroGraphicWrap, { backgroundColor: softSurface }]}> 
							<AmbulanceTierProductGraphic type={service} width={220} height={132} />
						</View>

						<View style={styles.metricRow}>
							<View style={[styles.metricPill, { backgroundColor: softSurface }]}> 
								<Ionicons name="time-outline" size={15} color={visualProfile.accent} />
								<Text style={[styles.metricText, { color: textColor }]}>{etaText || service.eta || "Arriving soon"}</Text>
							</View>
							<View style={[styles.metricPill, { backgroundColor: softSurface }]}> 
								<Ionicons name="people-outline" size={15} color={visualProfile.accent} />
								<Text style={[styles.metricText, { color: textColor }]}>{service.crew || "2 paramedics"}</Text>
							</View>
							<View style={[styles.metricPill, { backgroundColor: softSurface }]}> 
								<Ionicons name="cash-outline" size={15} color={visualProfile.accent} />
								<Text style={[styles.metricText, { color: textColor }]}>{costLine || service.price || "Price shown before you send"}</Text>
							</View>
						</View>

						<View style={styles.sectionBlock}>
							<Text style={[styles.sectionLabel, { color: mutedColor }]}>Trip details</Text>
							<View style={styles.infoGrid}>
								<View style={[styles.infoCard, { backgroundColor: softSurface }]}> 
									<Text style={[styles.infoLabel, { color: mutedColor }]}>Pickup point</Text>
									<Text style={[styles.infoValue, { color: textColor }]}>{pickupLine || "Location confirmed"}</Text>
								</View>
								<View style={[styles.infoCard, { backgroundColor: softSurface }]}> 
									<Text style={[styles.infoLabel, { color: mutedColor }]}>Destination</Text>
									<Text style={[styles.infoValue, { color: textColor }]}>{hospitalName || "Medical center"}</Text>
								</View>
							</View>
						</View>

						<View style={styles.sectionBlock}>
							<Text style={[styles.sectionLabel, { color: mutedColor }]}>What to expect</Text>
							<View style={styles.featureList}>
								{featureList.map((feature) => (
									<View key={feature} style={styles.featureRow}>
										<View style={[styles.featureDot, { backgroundColor: visualProfile.accent }]} />
										<Text style={[styles.featureText, { color: textColor }]}>{feature}</Text>
									</View>
								))}
							</View>
						</View>
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(15,23,42,0.38)",
		justifyContent: "flex-end",
		alignItems: "center",
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
	},
	sheet: {
		width: "100%",
		maxWidth: 580,
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		paddingTop: 10,
		paddingHorizontal: 16,
		paddingBottom: 18,
		maxHeight: "88%",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -8 },
		shadowOpacity: 0.18,
		shadowRadius: 20,
		elevation: 16,
	},
	handle: {
		width: 44,
		height: 5,
		borderRadius: 999,
		backgroundColor: "rgba(148,163,184,0.55)",
		alignSelf: "center",
		marginBottom: 10,
	},
	scroll: {
		flexGrow: 0,
	},
	scrollContent: {
		paddingBottom: 12,
		gap: 14,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 12,
	},
	eyebrow: {
		fontSize: 11,
		fontWeight: "800",
		letterSpacing: 0.5,
		textTransform: "uppercase",
		marginBottom: 6,
	},
	title: {
		fontSize: 24,
		fontWeight: "900",
		letterSpacing: -0.8,
	},
	subtitle: {
		fontSize: 14,
		lineHeight: 20,
		marginTop: 6,
		maxWidth: 440,
	},
	closeButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	heroGraphicWrap: {
		borderRadius: 22,
		paddingVertical: 10,
		paddingHorizontal: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	sectionBlock: {
		gap: 10,
	},
	sectionLabel: {
		fontSize: 11,
		fontWeight: "800",
		textTransform: "uppercase",
		letterSpacing: 0.45,
	},
	metricRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	metricPill: {
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 999,
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	metricText: {
		fontSize: 13,
		fontWeight: "700",
	},
	infoGrid: {
		gap: 10,
		flexDirection: "row",
		flexWrap: "wrap",
	},
	infoCard: {
		borderRadius: 18,
		paddingHorizontal: 14,
		paddingVertical: 12,
		gap: 4,
		flexGrow: 1,
		minWidth: 180,
	},
	infoLabel: {
		fontSize: 11,
		fontWeight: "800",
		textTransform: "uppercase",
		letterSpacing: 0.45,
	},
	infoValue: {
		fontSize: 14,
		fontWeight: "700",
		lineHeight: 20,
	},
	featureList: {
		gap: 10,
	},
	featureRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	featureDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	featureText: {
		fontSize: 14,
		fontWeight: "600",
		lineHeight: 20,
		flex: 1,
	},
	actionRow: {
		flexDirection: "row",
		gap: 10,
		marginTop: 8,
	},
	secondaryButton: {
		flex: 1,
		borderRadius: 16,
		paddingVertical: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	secondaryButtonFull: {
		flex: 1,
	},
	secondaryButtonText: {
		fontSize: 14,
		fontWeight: "700",
	},
	primaryButton: {
		flex: 1.2,
		borderRadius: 16,
		paddingVertical: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	primaryButtonText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "800",
	},
});

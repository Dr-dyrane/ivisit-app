import React, { useMemo } from "react";
import {
	Pressable,
	StyleSheet,
	Text,
	View,
	Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../../../../constants/colors";
import { useTheme } from "../../../../contexts/ThemeContext";
import MapModalShell from "../MapModalShell";
import { getHospitalDetailServiceImageSource } from "./mapHospitalDetail.content";

export function buildServiceCopy(item, type) {
	if (type === "ambulance") {
		const title = item?.title || "Transport";
		if (/everyday/i.test(title)) {
			return {
				summary: "Fast standard transport for stable trips and everyday urgent support.",
				features: [
					"Good fit for most common dispatch needs",
					"Clear hospital handoff on arrival",
					"Prepared for routine monitoring during transfer",
				],
			};
		}
		if (/extra support/i.test(title)) {
			return {
				summary: "A higher-support crew for patients who may need closer attention en route.",
				features: [
					"Extra support during the trip",
					"Designed for more active monitoring",
					"Smooth handoff into emergency intake",
				],
			};
		}
		return {
			summary: "A higher-acuity transport option for complex or hospital-transfer needs.",
			features: [
				"Best for higher-support transfers",
				"Built for more complex clinical handoff",
				"Aligned to critical movement between care sites",
			],
		};
	}

	const title = item?.title || "Room option";
	if (/general/i.test(title)) {
		return {
			summary: "Shared hospital capacity for standard monitoring and admission needs.",
			features: [
				"Good fit for standard inpatient stays",
				"Usually the fastest bed path when available",
				"Supports routine monitoring and observation",
			],
		};
	}
	if (/private/i.test(title)) {
		return {
			summary: "A more private room option for patients who need quieter recovery space.",
			features: [
				"More private stay experience",
				"Useful when calmer recovery matters",
				"Availability varies by hospital load",
			],
		};
	}
	if (/high-support|icu/i.test(title)) {
		return {
			summary: "Higher-support bed capacity for patients who may require more intensive care.",
			features: [
				"Intended for higher-support monitoring",
				"Closest fit for critical-admission needs",
				"Availability is usually more limited",
			],
		};
	}
	return {
		summary: "Current room availability at this hospital for the selected stay type.",
		features: [
			"Availability updates with hospital capacity",
			"Selection helps clarify the care path",
			"Hospital staff finalize exact placement on arrival",
		],
	};
}

export default function MapHospitalServiceDetailSheet({
	visible = false,
	service = null,
	type = "ambulance",
	hospitalName = "Hospital",
	hospitalAddress = "",
	onClose,
	onConfirm,
	isSelected = false,
}) {
	const { isDarkMode } = useTheme();

	const visualCopy = useMemo(
		() => buildServiceCopy(service, type),
		[service, type],
	);

	if (!service) return null;

	const imageSource = getHospitalDetailServiceImageSource(service, type);
	const sheetBg = isDarkMode ? "#0F172A" : "#FFFFFF";
	const textColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const softSurface = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)";
	const accent = type === "ambulance" ? COLORS.brandPrimary : "#64748B";
	const title = service?.title || (type === "ambulance" ? "Transport" : "Room option");
	const statusLabel =
		service?.metaText || (type === "ambulance" ? "Ready" : "Available");
	const priceLabel = service?.priceText || "Price shown before booking";
	const eyebrow = type === "ambulance" ? "Transport details" : "Room option details";
	const confirmLabel = isSelected
		? type === "ambulance"
			? "Transport selected"
			: "Room selected"
		: type === "ambulance"
			? "Select transport"
			: "Select room";

	return (
		<MapModalShell
			visible={visible}
			onClose={onClose}
			title={title}
			minHeightRatio={0.72}
			maxHeightRatio={0.88}
			contentContainerStyle={styles.scrollContent}
			footerSlot={
				<View style={styles.actionRow}>
					<Pressable
						onPress={onClose}
						style={[styles.secondaryButton, { backgroundColor: softSurface }]}
					>
						<Text style={[styles.secondaryButtonText, { color: textColor }]}>Close</Text>
					</Pressable>
					<Pressable
						onPress={onConfirm}
						style={[
							styles.primaryButton,
							{ backgroundColor: isSelected ? "rgba(134,16,14,0.72)" : COLORS.brandPrimary },
						]}
					>
						<Text style={styles.primaryButtonText}>{confirmLabel}</Text>
					</Pressable>
				</View>
			}
		>
			<View style={styles.headerRow}>
				<View style={styles.headerCopy}>
					<Text style={[styles.eyebrow, { color: accent }]}>{eyebrow}</Text>
					<Text style={[styles.subtitle, { color: mutedColor }]}>
						{visualCopy.summary}
					</Text>
				</View>
				<View style={[styles.inlineStatusPill, { backgroundColor: softSurface }]}>
					<Ionicons name="checkmark-circle-outline" size={14} color={accent} />
					<Text style={[styles.inlineStatusText, { color: textColor }]}>{statusLabel}</Text>
				</View>
			</View>

			<View style={[styles.heroGraphicWrap, { backgroundColor: softSurface }]}>
				<Image
					source={imageSource}
					resizeMode="contain"
					fadeDuration={0}
					style={styles.heroGraphic}
				/>
				<LinearGradient
					pointerEvents="none"
					colors={["rgba(255,255,255,0.02)", "rgba(15,23,42,0.14)"]}
					style={StyleSheet.absoluteFillObject}
				/>
			</View>

			<View style={styles.metricRow}>
				<View style={[styles.metricPill, { backgroundColor: softSurface }]}>
					<Ionicons name="cash-outline" size={15} color={accent} />
					<Text style={[styles.metricText, { color: textColor }]}>{priceLabel}</Text>
				</View>
			</View>

			<View style={styles.sectionBlock}>
				<Text style={[styles.sectionLabel, { color: mutedColor }]}>At this hospital</Text>
				<View style={[styles.infoCard, { backgroundColor: softSurface }]}>
					<Text style={[styles.infoValue, { color: textColor }]}>{hospitalName}</Text>
					{hospitalAddress ? (
						<Text style={[styles.infoSubvalue, { color: mutedColor }]}>{hospitalAddress}</Text>
					) : null}
				</View>
			</View>

			<View style={styles.sectionBlock}>
				<Text style={[styles.sectionLabel, { color: mutedColor }]}>What to expect</Text>
				<View style={styles.featureList}>
					{visualCopy.features.map((feature) => (
						<View key={feature} style={styles.featureRow}>
							<View style={[styles.featureDot, { backgroundColor: accent }]} />
							<Text style={[styles.featureText, { color: textColor }]}>{feature}</Text>
						</View>
					))}
				</View>
			</View>
		</MapModalShell>
	);
}

const styles = StyleSheet.create({
	scrollContent: {
		paddingTop: 0,
		paddingBottom: 4,
		gap: 14,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: 12,
	},
	headerCopy: {
		flex: 1,
	},
	inlineStatusPill: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderRadius: 999,
	},
	inlineStatusText: {
		fontSize: 12,
		fontWeight: "700",
	},
	eyebrow: {
		fontSize: 12,
		fontWeight: "700",
		marginBottom: 6,
	},
	subtitle: {
		fontSize: 14,
		lineHeight: 20,
		maxWidth: 440,
	},
	heroGraphicWrap: {
		height: 170,
		borderRadius: 22,
		paddingVertical: 12,
		paddingHorizontal: 10,
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	},
	heroGraphic: {
		width: "100%",
		height: "100%",
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
	sectionBlock: {
		gap: 10,
	},
	sectionLabel: {
		fontSize: 12,
		fontWeight: "600",
	},
	infoCard: {
		borderRadius: 18,
		paddingHorizontal: 14,
		paddingVertical: 12,
		gap: 4,
	},
	infoValue: {
		fontSize: 15,
		fontWeight: "700",
		lineHeight: 20,
	},
	infoSubvalue: {
		fontSize: 13,
		lineHeight: 18,
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
		fontWeight: "500",
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

import React from "react";
import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import MapModalShell from "./MapModalShell";

const FEATURED_HOSPITAL_IMAGE = require("../../assets/features/emergency.png");

function buildHospitalSubtitle(hospital) {
	const locality = [hospital?.city, hospital?.region].filter(Boolean).join(", ").trim();
	if (locality) return locality;

	const address = [hospital?.streetNumber, hospital?.street].filter(Boolean).join(" ").trim();
	if (address) return address;

	return hospital?.address || hospital?.formattedAddress || "Available nearby";
}

function buildMeta(hospital) {
	const values = [];
	const distance = typeof hospital?.distance === "string" ? hospital.distance.trim() : "";
	const eta = typeof hospital?.eta === "string" ? hospital.eta.trim() : "";
	const beds = Number(hospital?.availableBeds);

	if (distance) values.push({ icon: "navigate", label: distance, iconType: "ion" });
	if (eta) values.push({ icon: "time-outline", label: eta, iconType: "ion" });
	if (Number.isFinite(beds) && beds > 0) {
		values.push({ icon: "bed", label: `${beds} beds`, iconType: "material" });
	}

	return values;
}

export default function MapHospitalDetailsModal({
	visible,
	onClose,
	hospital,
	onOpenHospitals,
}) {
	const { isDarkMode } = useTheme();
	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const bodyColor = isDarkMode ? "#CBD5E1" : "#475569";
	const chipBg = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)";
	const cardSurface = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)";
	const meta = buildMeta(hospital);

	return (
		<MapModalShell
			visible={visible}
			onClose={onClose}
			title="Hospital"
			minHeightRatio={0.78}
			contentContainerStyle={styles.content}
		>
			<ImageBackground
				source={FEATURED_HOSPITAL_IMAGE}
				resizeMode="cover"
				style={styles.hero}
				imageStyle={styles.heroImage}
			>
				<LinearGradient
					colors={["rgba(8,15,27,0.04)", "rgba(8,15,27,0.24)", "rgba(8,15,27,0.78)"]}
					style={StyleSheet.absoluteFill}
				/>
				<View style={styles.heroCopy}>
					<Text style={styles.heroTitle}>{hospital?.name || "Hospital"}</Text>
				</View>
			</ImageBackground>

			<View style={[styles.summaryCard, { backgroundColor: cardSurface }]}>
				<Text style={[styles.summaryTitle, { color: titleColor }]}>
					{hospital?.name || "Hospital"}
				</Text>
				<Text style={[styles.summarySubtitle, { color: bodyColor }]}>
					{buildHospitalSubtitle(hospital)}
				</Text>

				{meta.length > 0 ? (
					<View style={styles.metaRow}>
						{meta.map((item, index) => (
							<View key={`${item.label}-${index}`} style={[styles.metaChip, { backgroundColor: chipBg }]}>
								{item.iconType === "material" ? (
									<MaterialCommunityIcons name={item.icon} size={13} color="#86100E" />
								) : (
									<Ionicons name={item.icon} size={13} color="#86100E" />
								)}
								<Text style={[styles.metaText, { color: bodyColor }]}>{item.label}</Text>
							</View>
						))}
					</View>
				) : null}
			</View>

			{typeof onOpenHospitals === "function" ? (
				<Pressable
					onPress={() => {
						onClose?.();
						onOpenHospitals();
					}}
					style={[styles.secondaryAction, { backgroundColor: cardSurface }]}
				>
					<Text style={[styles.secondaryActionText, { color: titleColor }]}>See hospitals</Text>
					<Ionicons name="chevron-forward" size={16} color={titleColor} />
				</Pressable>
			) : null}
		</MapModalShell>
	);
}

const styles = StyleSheet.create({
	content: {
		paddingTop: 0,
		paddingBottom: 12,
		gap: 16,
	},
	hero: {
		height: 260,
		borderRadius: 32,
		overflow: "hidden",
		justifyContent: "flex-end",
	},
	heroImage: {
		borderRadius: 32,
	},
	heroCopy: {
		paddingHorizontal: 18,
		paddingVertical: 18,
	},
	heroTitle: {
		fontSize: 24,
		lineHeight: 28,
		fontWeight: "800",
		color: "#F8FAFC",
	},
	summaryCard: {
		borderRadius: 30,
		paddingHorizontal: 16,
		paddingVertical: 16,
	},
	summaryTitle: {
		fontSize: 19,
		lineHeight: 23,
		fontWeight: "800",
	},
	summarySubtitle: {
		marginTop: 6,
		fontSize: 14,
		lineHeight: 19,
		fontWeight: "400",
	},
	metaRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
		marginTop: 14,
	},
	metaChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		borderRadius: 999,
		paddingHorizontal: 11,
		paddingVertical: 8,
	},
	metaText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "400",
	},
	secondaryAction: {
		borderRadius: 24,
		paddingHorizontal: 16,
		paddingVertical: 14,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	secondaryActionText: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "700",
	},
});

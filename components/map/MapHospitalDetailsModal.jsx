import React, { useMemo } from "react";
import { ImageBackground, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../contexts/ThemeContext";
import EmergencyHospitalRoutePreview from "../emergency/intake/EmergencyHospitalRoutePreview";
import MapModalShell from "./MapModalShell";

const FEATURED_HOSPITAL_IMAGE = require("../../assets/features/emergency.png");

const ROOM_LABELS = {
	standard: "Standard bed",
	private: "Private room",
	icu: "ICU bed",
	maternity: "Maternity bed",
	pediatric: "Pediatric bed",
	isolation: "Isolation bed",
	general: "General bed",
};

function toDisplayText(value) {
	return String(value || "")
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function toStringList(value) {
	return Array.isArray(value)
		? value
				.filter((item) => typeof item === "string" && item.trim().length > 0)
				.map((item) => item.trim())
		: [];
}

function buildHospitalSubtitle(hospital) {
	const locality = [hospital?.city, hospital?.region].filter(Boolean).join(", ").trim();
	if (locality) return locality;

	const address = [hospital?.streetNumber, hospital?.street].filter(Boolean).join(" ").trim();
	if (address) return address;

	return hospital?.address || hospital?.formattedAddress || "Available nearby";
}

function getHeroSource(hospital) {
	const candidates = [
		hospital?.image,
		hospital?.imageUri,
		...toStringList(hospital?.googlePhotos),
		...toStringList(hospital?.google_photos),
	];
	const uri = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
	return uri ? { uri: uri.trim() } : FEATURED_HOSPITAL_IMAGE;
}

function formatRating(hospital) {
	const rating = Number(hospital?.rating);
	if (!Number.isFinite(rating) || rating <= 0) return null;
	return rating.toFixed(1);
}

function formatPriceLabel(hospital) {
	const direct = [hospital?.priceRange, hospital?.priceLabel, hospital?.price]
		.find((value) => typeof value === "string" && value.trim().length > 0);
	if (direct) return direct.trim();

	const basePrice = Number(hospital?.basePrice ?? hospital?.base_price);
	if (Number.isFinite(basePrice) && basePrice > 0) {
		return `From ${Math.round(basePrice).toLocaleString()}`;
	}

	return "Pricing on request";
}

function buildHeroBadges(hospital) {
	const items = [];
	if (hospital?.verified) {
		items.push({ label: "Verified", icon: "shield-checkmark", iconType: "ion", tone: "verified" });
	}

	const emergencyLevel = toDisplayText(hospital?.emergencyLevel || hospital?.emergency_level);
	if (emergencyLevel) {
		items.push({ label: emergencyLevel, icon: "flash", iconType: "ion", tone: "alert" });
	}

	const serviceType = toStringList(hospital?.serviceTypes || hospital?.service_types)[0];
	if (serviceType) {
		items.push({ label: toDisplayText(serviceType), icon: "layers-outline", iconType: "ion", tone: "neutral" });
	}

	return items.slice(0, 3);
}

function buildStatusChips(hospital) {
	const items = [];
	const distance = typeof hospital?.distance === "string" ? hospital.distance.trim() : "";
	const eta = typeof hospital?.eta === "string" ? hospital.eta.trim() : "";
	const waitTime = typeof hospital?.waitTime === "string"
		? hospital.waitTime.trim()
		: Number.isFinite(Number(hospital?.emergencyWaitTimeMinutes ?? hospital?.emergency_wait_time_minutes))
			? `${Number(hospital?.emergencyWaitTimeMinutes ?? hospital?.emergency_wait_time_minutes)} min`
			: "";
	const beds = Number(hospital?.availableBeds ?? hospital?.available_beds);
	const ambulances = Number(hospital?.ambulances ?? hospital?.ambulancesCount ?? hospital?.ambulances_count);

	if (distance) items.push({ icon: "navigate", label: distance, iconType: "ion" });
	if (eta) items.push({ icon: "time-outline", label: eta, iconType: "ion" });
	if (waitTime) items.push({ icon: "pulse-outline", label: `Wait ${waitTime}`, iconType: "ion" });
	if (Number.isFinite(beds) && beds > 0) {
		items.push({ icon: "bed", label: `${beds} beds`, iconType: "material" });
	}
	if (Number.isFinite(ambulances) && ambulances > 0) {
		items.push({ icon: "ambulance", label: `${ambulances} ambulances`, iconType: "material" });
	}

	return items.slice(0, 5);
}

function buildQuickFacts(hospital) {
	const emergencyValue = toDisplayText(hospital?.emergencyLevel || hospital?.emergency_level || hospital?.type || "General care");
	const priceValue = formatPriceLabel(hospital);
	const phoneValue = hospital?.phone ? "Call line ready" : "Use in app";
	const listingValue = hospital?.verified ? "Trusted listing" : "Live listing";

	return [
		{ label: "Emergency", value: emergencyValue },
		{ label: "Pricing", value: priceValue },
		{ label: "Support", value: phoneValue },
		{ label: "Status", value: listingValue },
	];
}

function readCount(entry) {
	if (Number.isFinite(Number(entry))) return Number(entry);
	if (!entry || typeof entry !== "object") return 0;
	const keys = ["available", "available_units", "count", "beds", "value"];
	for (const key of keys) {
		const candidate = Number(entry?.[key]);
		if (Number.isFinite(candidate)) return candidate;
	}
	return 0;
}

function readTotal(entry) {
	if (!entry || typeof entry !== "object") return null;
	const keys = ["total", "total_units", "capacity"];
	for (const key of keys) {
		const candidate = Number(entry?.[key]);
		if (Number.isFinite(candidate) && candidate > 0) return candidate;
	}
	return null;
}

function readPrice(entry) {
	if (!entry || typeof entry !== "object") return null;
	const keys = ["base_price", "price", "price_per_night"];
	for (const key of keys) {
		const candidate = Number(entry?.[key]);
		if (Number.isFinite(candidate) && candidate > 0) return candidate;
	}
	return null;
}

function buildRoomRows(hospital) {
	const snapshot = hospital?.bedAvailability && typeof hospital.bedAvailability === "object"
		? hospital.bedAvailability
		: hospital?.bed_availability && typeof hospital.bed_availability === "object"
			? hospital.bed_availability
			: {};
	const rows = [];

	const addRow = (type, fallbackAvailable = null) => {
		const entry = snapshot?.[type];
		const available = Math.max(readCount(entry), Number(fallbackAvailable) || 0);
		if (!Number.isFinite(available) || available <= 0) return;
		rows.push({
			id: type,
			label: ROOM_LABELS[type] || toDisplayText(type),
			available,
			total: readTotal(entry),
			price: readPrice(entry),
		});
	};

	addRow("standard", hospital?.availableBeds ?? hospital?.available_beds);
	addRow("private");
	addRow("icu", hospital?.icuBedsAvailable ?? hospital?.icu_beds_available);
	addRow("maternity");
	addRow("pediatric");
	addRow("isolation");

	if (rows.length === 0) {
		const availableBeds = Number(hospital?.availableBeds ?? hospital?.available_beds);
		if (Number.isFinite(availableBeds) && availableBeds > 0) {
			rows.push({
				id: "general",
				label: ROOM_LABELS.general,
				available: availableBeds,
				total: Number(hospital?.totalBeds ?? hospital?.total_beds) || null,
				price: Number(hospital?.basePrice ?? hospital?.base_price) || null,
			});
		}
	}

	return rows.slice(0, 4);
}

function buildFeatureList(hospital) {
	const serviceTypes = toStringList(hospital?.serviceTypes || hospital?.service_types);
	const features = toStringList(hospital?.features);
	return [...new Set([...serviceTypes, ...features])]
		.filter((item) => !/demo|owner:|seed/i.test(item))
		.map((item) => toDisplayText(item))
		.slice(0, 8);
}

export default function MapHospitalDetailsModal({
	visible,
	onClose,
	hospital,
	onOpenHospitals,
	origin = null,
	onUseHospital,
}) {
	const { isDarkMode } = useTheme();
	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const bodyColor = isDarkMode ? "#CBD5E1" : "#475569";
	const subtleColor = isDarkMode ? "#94A3B8" : "#64748B";
	const cardSurface = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)";
	const chipBg = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)";
	const softSurface = isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.72)";
	const borderColor = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

	const ratingLabel = useMemo(() => formatRating(hospital), [hospital]);
	const priceLabel = useMemo(() => formatPriceLabel(hospital), [hospital]);
	const heroBadges = useMemo(() => buildHeroBadges(hospital), [hospital]);
	const statusChips = useMemo(() => buildStatusChips(hospital), [hospital]);
	const quickFacts = useMemo(() => buildQuickFacts(hospital), [hospital]);
	const specialties = useMemo(
		() => toStringList(hospital?.specialties).map((item) => toDisplayText(item)).slice(0, 6),
		[hospital],
	);
	const roomRows = useMemo(() => buildRoomRows(hospital), [hospital]);
	const featureList = useMemo(() => buildFeatureList(hospital), [hospital]);
	const canCallHospital = typeof hospital?.phone === "string" && hospital.phone.trim().length > 0;
	const canRenderRoutePreview = Boolean(
		origin?.latitude &&
		origin?.longitude &&
		(
			(Number.isFinite(Number(hospital?.latitude)) && Number.isFinite(Number(hospital?.longitude))) ||
			hospital?.coordinates
		),
	);

	const handleUseHospital = () => {
		onUseHospital?.(hospital);
		onClose?.();
	};

	const handleCallHospital = async () => {
		if (!canCallHospital) return;
		const cleanPhone = hospital.phone.replace(/[^\d+]/g, "");
		if (!cleanPhone) return;
		await Linking.openURL(`tel:${cleanPhone}`);
	};

	return (
		<MapModalShell
			visible={visible}
			onClose={onClose}
			title={null}
			minHeightRatio={0.84}
			maxHeightRatio={0.95}
			contentContainerStyle={styles.content}
		>
			<ImageBackground
				source={getHeroSource(hospital)}
				resizeMode="cover"
				style={styles.hero}
				imageStyle={styles.heroImage}
			>
				<LinearGradient
					colors={["rgba(8,15,27,0.10)", "rgba(8,15,27,0.34)", "rgba(8,15,27,0.84)"]}
					style={StyleSheet.absoluteFillObject}
				/>

				{heroBadges.length > 0 ? (
					<View style={styles.heroBadgeRow}>
						{heroBadges.map((item) => {
							const badgeBg = item.tone === "verified"
								? "rgba(16,185,129,0.20)"
								: item.tone === "alert"
									? "rgba(225,29,72,0.20)"
									: "rgba(255,255,255,0.12)";
							return (
								<View key={item.label} style={[styles.heroBadge, { backgroundColor: badgeBg }]}>
									{item.iconType === "material" ? (
										<MaterialCommunityIcons name={item.icon} size={12} color="#F8FAFC" />
									) : (
										<Ionicons name={item.icon} size={12} color="#F8FAFC" />
									)}
									<Text style={styles.heroBadgeText}>{item.label}</Text>
								</View>
							);
						})}
					</View>
				) : null}

				<View style={styles.heroCopy}>
					<Text style={styles.heroEyebrow}>iVisit hospital</Text>
					<Text style={styles.heroTitle}>{hospital?.name || "Hospital"}</Text>
					<Text style={styles.heroSubtitle}>{buildHospitalSubtitle(hospital)}</Text>

					<View style={styles.heroMetaRow}>
						{ratingLabel ? (
							<View style={styles.heroMetaPill}>
								<Ionicons name="star" size={13} color="#FBBF24" />
								<Text style={styles.heroMetaText}>{ratingLabel} / 5</Text>
							</View>
						) : null}
						<View style={styles.heroMetaPill}>
							<Ionicons name="cash-outline" size={13} color="#F8FAFC" />
							<Text style={styles.heroMetaText}>{priceLabel}</Text>
						</View>
					</View>
				</View>
			</ImageBackground>

			{statusChips.length > 0 ? (
				<View style={[styles.sectionCard, { backgroundColor: cardSurface }]}> 
					<Text style={[styles.sectionTitle, { color: titleColor }]}>Live status</Text>
					<View style={styles.statusRow}>
						{statusChips.map((item, index) => (
							<View key={`${item.label}-${index}`} style={[styles.statusChip, { backgroundColor: chipBg }]}> 
								{item.iconType === "material" ? (
									<MaterialCommunityIcons name={item.icon} size={13} color={COLORS.brandPrimary} />
								) : (
									<Ionicons name={item.icon} size={13} color={COLORS.brandPrimary} />
								)}
								<Text style={[styles.statusChipText, { color: bodyColor }]}>{item.label}</Text>
							</View>
						))}
					</View>
				</View>
			) : null}

			<View style={[styles.sectionCard, { backgroundColor: cardSurface }]}> 
				<Text style={[styles.sectionTitle, { color: titleColor }]}>Why this hospital stands out</Text>
				<View style={styles.factGrid}>
					{quickFacts.map((item) => (
						<View key={item.label} style={[styles.factCard, { backgroundColor: softSurface, borderColor }]}> 
							<Text style={[styles.factLabel, { color: subtleColor }]}>{item.label}</Text>
							<Text style={[styles.factValue, { color: titleColor }]} numberOfLines={2}>{item.value}</Text>
						</View>
					))}
				</View>

				{specialties.length > 0 ? (
					<>
						<Text style={[styles.sectionLabel, { color: subtleColor }]}>Specialties</Text>
						<View style={styles.tagRow}>
							{specialties.map((item) => (
								<View key={item} style={[styles.tagChip, { backgroundColor: chipBg }]}>
									<Text style={[styles.tagText, { color: titleColor }]}>{item}</Text>
								</View>
							))}
						</View>
					</>
				) : null}
			</View>

			{canRenderRoutePreview ? (
				<View style={[styles.sectionCard, { backgroundColor: cardSurface }]}> 
					<View style={styles.sectionHeader}>
						<Text style={[styles.sectionTitle, { color: titleColor }]}>Route preview</Text>
						<Text style={[styles.sectionHint, { color: subtleColor }]}>{hospital?.eta || "Live route"}</Text>
					</View>
					<View style={styles.routeShell}>
						<EmergencyHospitalRoutePreview
							origin={origin}
							hospital={hospital}
							bottomPadding={16}
							visible={visible}
							showLoadingBadge={false}
						/>
					</View>
				</View>
			) : null}

			{roomRows.length > 0 ? (
				<View style={[styles.sectionCard, { backgroundColor: cardSurface }]}> 
					<View style={styles.sectionHeader}>
						<Text style={[styles.sectionTitle, { color: titleColor }]}>Bed availability</Text>
						<Text style={[styles.sectionHint, { color: subtleColor }]}>Live capacity</Text>
					</View>
					<View style={styles.roomStack}>
						{roomRows.map((room) => (
							<View key={room.id} style={[styles.roomRow, { backgroundColor: softSurface, borderColor }]}> 
								<View style={styles.roomCopy}>
									<Text style={[styles.roomLabel, { color: titleColor }]}>{room.label}</Text>
									<Text style={[styles.roomMeta, { color: subtleColor }]}>
										{room.total ? `${room.available} of ${room.total} available` : `${room.available} ready now`}
									</Text>
								</View>
								<Text style={[styles.roomPrice, { color: titleColor }]}>
									{room.price ? `From ${Math.round(room.price).toLocaleString()}` : "Open now"}
								</Text>
							</View>
						))}
					</View>
				</View>
			) : null}

			{featureList.length > 0 ? (
				<View style={[styles.sectionCard, { backgroundColor: cardSurface }]}> 
					<Text style={[styles.sectionTitle, { color: titleColor }]}>Services & amenities</Text>
					<View style={styles.tagRow}>
						{featureList.map((item) => (
							<View key={item} style={[styles.tagChip, { backgroundColor: chipBg }]}> 
								<Text style={[styles.tagText, { color: titleColor }]}>{item}</Text>
							</View>
						))}
					</View>
				</View>
			) : null}

			<View style={styles.actionStack}>
				<Pressable onPress={handleUseHospital} style={styles.primaryAction}>
					{({ pressed }) => (
						<LinearGradient
							colors={["#A11412", COLORS.brandPrimary]}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
							style={[styles.primaryActionFill, pressed ? { opacity: 0.92 } : null]}
						>
							<View style={styles.primaryActionCopy}>
								<MaterialCommunityIcons name="hospital-building" size={18} color="#FFFFFF" />
								<Text style={styles.primaryActionText}>Use this hospital</Text>
							</View>
							<Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
						</LinearGradient>
					)}
				</Pressable>

				<View style={styles.secondaryRow}>
					{canCallHospital ? (
						<Pressable onPress={handleCallHospital} style={[styles.secondaryAction, { backgroundColor: cardSurface, borderColor }]}> 
							<Ionicons name="call-outline" size={16} color={titleColor} />
							<Text style={[styles.secondaryActionText, { color: titleColor }]}>Call hospital</Text>
						</Pressable>
					) : null}

					{typeof onOpenHospitals === "function" ? (
						<Pressable
							onPress={() => {
								onClose?.();
								onOpenHospitals();
							}}
							style={[styles.secondaryAction, { backgroundColor: cardSurface, borderColor }]}
						>
							<Ionicons name="list-outline" size={16} color={titleColor} />
							<Text style={[styles.secondaryActionText, { color: titleColor }]}>See all hospitals</Text>
						</Pressable>
					) : null}
				</View>
			</View>
		</MapModalShell>
	);
}

const styles = StyleSheet.create({
	content: {
		paddingTop: 0,
		paddingBottom: 14,
		gap: 14,
	},
	hero: {
		height: 268,
		borderRadius: 30,
		overflow: "hidden",
		justifyContent: "space-between",
	},
	heroImage: {
		borderRadius: 30,
	},
	heroBadgeRow: {
		paddingTop: 14,
		paddingHorizontal: 14,
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	heroBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
	},
	heroBadgeText: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "700",
		color: "#F8FAFC",
	},
	heroCopy: {
		paddingHorizontal: 18,
		paddingVertical: 18,
	},
	heroEyebrow: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "700",
		letterSpacing: 0.6,
		textTransform: "uppercase",
		color: "rgba(248,250,252,0.82)",
	},
	heroTitle: {
		marginTop: 6,
		fontSize: 24,
		lineHeight: 28,
		fontWeight: "800",
		color: "#F8FAFC",
	},
	heroSubtitle: {
		marginTop: 6,
		fontSize: 14,
		lineHeight: 19,
		fontWeight: "500",
		color: "rgba(248,250,252,0.82)",
	},
	heroMetaRow: {
		marginTop: 12,
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	heroMetaPill: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 7,
		borderRadius: 999,
		backgroundColor: "rgba(255,255,255,0.12)",
	},
	heroMetaText: {
		fontSize: 12,
		lineHeight: 15,
		fontWeight: "600",
		color: "#F8FAFC",
	},
	sectionCard: {
		borderRadius: 26,
		paddingHorizontal: 16,
		paddingVertical: 16,
		gap: 12,
	},
	sectionHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 10,
	},
	sectionTitle: {
		fontSize: 18,
		lineHeight: 22,
		fontWeight: "800",
	},
	sectionHint: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "500",
	},
	sectionLabel: {
		marginTop: 4,
		fontSize: 12,
		lineHeight: 15,
		fontWeight: "700",
		letterSpacing: 0.5,
		textTransform: "uppercase",
	},
	statusRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	statusChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderRadius: 999,
	},
	statusChipText: {
		fontSize: 12,
		lineHeight: 15,
		fontWeight: "500",
	},
	factGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 10,
	},
	factCard: {
		width: "48%",
		minWidth: 138,
		borderRadius: 18,
		paddingHorizontal: 12,
		paddingVertical: 12,
		borderWidth: StyleSheet.hairlineWidth,
	},
	factLabel: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "700",
		letterSpacing: 0.3,
		textTransform: "uppercase",
	},
	factValue: {
		marginTop: 6,
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "700",
	},
	tagRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	tagChip: {
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 7,
	},
	tagText: {
		fontSize: 12,
		lineHeight: 15,
		fontWeight: "600",
	},
	routeShell: {
		height: 180,
		borderRadius: 22,
		overflow: "hidden",
	},
	roomStack: {
		gap: 10,
	},
	roomRow: {
		borderRadius: 18,
		paddingHorizontal: 12,
		paddingVertical: 12,
		borderWidth: StyleSheet.hairlineWidth,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 10,
	},
	roomCopy: {
		flex: 1,
	},
	roomLabel: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "700",
	},
	roomMeta: {
		marginTop: 4,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "500",
	},
	roomPrice: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "700",
	},
	actionStack: {
		gap: 10,
		paddingTop: 2,
	},
	primaryAction: {
		borderRadius: 24,
		overflow: "hidden",
		shadowColor: COLORS.brandPrimary,
		shadowOpacity: 0.16,
		shadowRadius: 16,
		shadowOffset: { width: 0, height: 8 },
	},
	primaryActionFill: {
		minHeight: 56,
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	primaryActionCopy: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	primaryActionText: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "800",
		color: "#FFFFFF",
	},
	secondaryRow: {
		flexDirection: "row",
		gap: 10,
	},
	secondaryAction: {
		flex: 1,
		minHeight: 48,
		borderRadius: 18,
		borderWidth: StyleSheet.hairlineWidth,
		paddingHorizontal: 12,
		paddingVertical: 12,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
	},
	secondaryActionText: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "700",
	},
});

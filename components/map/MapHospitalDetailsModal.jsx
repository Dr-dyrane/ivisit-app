import React, { useEffect, useMemo, useState } from "react";
import {
	ImageBackground,
	Linking,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../contexts/ThemeContext";
import { useMapRoute } from "../../hooks/emergency/useMapRoute";
import EmergencyHospitalRoutePreview from "../emergency/intake/EmergencyHospitalRoutePreview";
import MapModalShell from "./MapModalShell";

const FEATURED_HOSPITAL_IMAGE = require("../../assets/features/emergency.png");
const STORY_SECTIONS = ["Overview", "Route", "Care"];

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

function formatDurationSeconds(seconds) {
	if (!Number.isFinite(Number(seconds)) || Number(seconds) <= 0) return null;
	return `${Math.max(1, Math.round(Number(seconds) / 60))} min`;
}

function formatDistanceMeters(meters) {
	if (!Number.isFinite(Number(meters)) || Number(meters) <= 0) return null;
	const km = Number(meters) / 1000;
	return km >= 10 ? `${km.toFixed(0)} km` : `${km.toFixed(1)} km`;
}

function getDestinationCoordinate(hospital) {
	const latitude = Number(
		hospital?.latitude ?? hospital?.lat ?? hospital?.coords?.latitude ?? hospital?.location?.latitude,
	);
	const longitude = Number(
		hospital?.longitude ?? hospital?.lng ?? hospital?.lon ?? hospital?.coords?.longitude ?? hospital?.location?.longitude,
	);

	if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
		return { latitude, longitude };
	}

	return null;
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

	const seen = new Set();
	return items.filter((item) => {
		const key = item.label.toLowerCase();
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	}).slice(0, 3);
}

function buildStatusItems(hospital, routeInfo) {
	const distance =
		(typeof hospital?.distance === "string" && hospital.distance.trim()) ||
		formatDistanceMeters(routeInfo?.distanceMeters);
	const eta =
		(typeof hospital?.eta === "string" && hospital.eta.trim()) ||
		formatDurationSeconds(routeInfo?.durationSec);
	const waitTime =
		(typeof hospital?.waitTime === "string" && hospital.waitTime.trim()) ||
		(Number.isFinite(Number(hospital?.emergencyWaitTimeMinutes ?? hospital?.emergency_wait_time_minutes))
			? `${Number(hospital?.emergencyWaitTimeMinutes ?? hospital?.emergency_wait_time_minutes)} min`
			: null);
	const beds = Number(hospital?.availableBeds ?? hospital?.available_beds);
	const ambulances = Number(hospital?.ambulances ?? hospital?.ambulancesCount ?? hospital?.ambulances_count);

	return [
		distance ? { label: "Distance", value: distance, icon: "navigate", iconType: "ion" } : null,
		eta ? { label: "Arrival", value: eta, icon: "time-outline", iconType: "ion" } : null,
		waitTime ? { label: "Wait", value: waitTime, icon: "pulse-outline", iconType: "ion" } : null,
		Number.isFinite(beds) && beds > 0
			? { label: "Beds", value: `${beds} open`, icon: "bed", iconType: "material" }
			: null,
		Number.isFinite(ambulances) && ambulances > 0
			? { label: "Ambulance", value: `${ambulances} ready`, icon: "ambulance", iconType: "material" }
			: null,
	].filter(Boolean).slice(0, 4);
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
		: hospital?.bed_availability && typeof hospital?.bed_availability === "object"
			? hospital.bed_availability
			: {};
	const rows = [];
	const seen = new Set();

	const addRow = (type, fallbackAvailable = null) => {
		const normalizedType = String(type || "").toLowerCase();
		if (!normalizedType || seen.has(normalizedType)) return;
		const entry = snapshot?.[normalizedType];
		const available = Math.max(readCount(entry), Number(fallbackAvailable) || 0);
		if (!Number.isFinite(available) || available <= 0) return;
		seen.add(normalizedType);
		rows.push({
			id: normalizedType,
			label: ROOM_LABELS[normalizedType] || toDisplayText(normalizedType),
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

	return rows.slice(0, 3);
}

function buildFeatureList(hospital) {
	const raw = [
		...toStringList(hospital?.serviceTypes || hospital?.service_types),
		...toStringList(hospital?.features),
		...toStringList(hospital?.specialties),
	];
	const seen = new Set();
	const items = [];

	for (const value of raw) {
		if (!value || /demo|owner:|seed/i.test(value)) continue;
		const display = toDisplayText(value);
		const key = display.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		items.push(display);
	}

	return items.slice(0, 6);
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
	const [activeCard, setActiveCard] = useState(0);
	const { routeCoordinates, routeInfo, isCalculatingRoute, calculateRoute, clearRoute } = useMapRoute();

	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const bodyColor = isDarkMode ? "#CBD5E1" : "#475569";
	const subtleColor = isDarkMode ? "#94A3B8" : "#64748B";
	const cardSurface = isDarkMode ? "#111827" : "#FFFFFF";
	const rowSurface = isDarkMode ? "rgba(255,255,255,0.06)" : "#F4F6F8";
	const panelSurface = isDarkMode ? "rgba(30,41,59,0.72)" : "#F8FAFC";
	const badgeSurface = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)";
	const activeTabBg = isDarkMode ? "rgba(161,20,18,0.28)" : "rgba(161,20,18,0.12)";
	const activeTabText = isDarkMode ? "#FFE4E6" : COLORS.brandPrimary;

	const destination = useMemo(() => getDestinationCoordinate(hospital), [hospital]);
	const heroBadges = useMemo(() => buildHeroBadges(hospital), [hospital]);
	const statusItems = useMemo(() => buildStatusItems(hospital, routeInfo), [hospital, routeInfo]);
	const roomRows = useMemo(() => buildRoomRows(hospital), [hospital]);
	const featureList = useMemo(() => buildFeatureList(hospital), [hospital]);
	const ratingLabel = useMemo(() => formatRating(hospital), [hospital]);
	const priceLabel = useMemo(() => formatPriceLabel(hospital), [hospital]);
	const canCallHospital = typeof hospital?.phone === "string" && hospital.phone.trim().length > 0;
	const routeEtaLabel =
		(typeof hospital?.eta === "string" && hospital.eta.trim()) ||
		formatDurationSeconds(routeInfo?.durationSec) ||
		"Live route";
	const routeDistanceLabel =
		(typeof hospital?.distance === "string" && hospital.distance.trim()) ||
		formatDistanceMeters(routeInfo?.distanceMeters) ||
		null;

	const heroStatItems = [
		ratingLabel ? { key: "rating", icon: "star", iconColor: "#FBBF24", label: `${ratingLabel} / 5` } : null,
		routeDistanceLabel ? { key: "distance", icon: "navigate", iconColor: "#F8FAFC", label: routeDistanceLabel } : null,
		priceLabel ? { key: "price", icon: "cash-outline", iconColor: "#F8FAFC", label: priceLabel } : null,
	].filter(Boolean);

	const overviewRows = useMemo(() => {
		const rows = [];
		if (routeDistanceLabel) {
			rows.push({ key: "distance", label: "Distance", value: routeDistanceLabel, icon: "navigate", iconType: "ion" });
		}
		if (routeEtaLabel && routeEtaLabel !== "Live route") {
			rows.push({ key: "arrival", label: "Arrival", value: routeEtaLabel, icon: "time-outline", iconType: "ion" });
		}
		const waitItem = statusItems.find((item) => item.label === "Wait");
		if (waitItem) rows.push({ ...waitItem, key: "wait" });
		const bedsItem = statusItems.find((item) => item.label === "Beds");
		if (bedsItem) rows.push({ ...bedsItem, key: "beds" });
		if (rows.length < 4 && priceLabel) {
			rows.push({ key: "pricing", label: "Pricing", value: priceLabel, icon: "cash-outline", iconType: "ion" });
		}
		if (rows.length < 4 && hospital?.verified) {
			rows.push({ key: "verified", label: "Status", value: "Verified", icon: "shield-checkmark", iconType: "ion" });
		}
		return rows.slice(0, 4);
	}, [hospital?.verified, priceLabel, routeDistanceLabel, routeEtaLabel, statusItems]);

	useEffect(() => {
		if (!visible || !origin?.latitude || !origin?.longitude || !destination) {
			clearRoute();
			return undefined;
		}

		calculateRoute(origin, destination);
		return undefined;
	}, [
		calculateRoute,
		clearRoute,
		destination,
		origin?.latitude,
		origin?.longitude,
		visible,
	]);

	useEffect(() => {
		if (!visible) {
			setActiveCard(0);
		}
	}, [visible]);

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

	const renderRowIcon = (item, color = COLORS.brandPrimary) => {
		if (item.iconType === "material") {
			return <MaterialCommunityIcons name={item.icon} size={14} color={color} />;
		}
		return <Ionicons name={item.icon} size={14} color={color} />;
	};

	return (
		<MapModalShell
			visible={visible}
			onClose={onClose}
			title={null}
			minHeightRatio={0.84}
			maxHeightRatio={0.84}
			contentContainerStyle={styles.content}
		>
			<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
				<ImageBackground
					source={getHeroSource(hospital)}
					resizeMode="cover"
					style={styles.hero}
					imageStyle={styles.heroImage}
				>
					<LinearGradient
						colors={
							isDarkMode
								? ["rgba(2,6,23,0.08)", "rgba(2,6,23,0.26)", "rgba(2,6,23,0.88)"]
								: ["rgba(15,23,42,0.02)", "rgba(15,23,42,0.14)", "rgba(15,23,42,0.74)"]
						}
						style={StyleSheet.absoluteFillObject}
					/>

					{heroBadges.length > 0 ? (
						<View style={styles.heroBadgeRow}>
							{heroBadges.map((item, index) => {
								const badgeBg = item.tone === "verified"
									? "rgba(16,185,129,0.20)"
									: item.tone === "alert"
										? "rgba(225,29,72,0.20)"
										: "rgba(255,255,255,0.12)";
								return (
									<View key={`${item.label}-${index}`} style={[styles.heroBadge, { backgroundColor: badgeBg }]}> 
										{renderRowIcon(item, "#F8FAFC")}
										<Text style={styles.heroBadgeText}>{item.label}</Text>
									</View>
								);
							})}
						</View>
					) : null}

					<View style={styles.heroFooter}>
						<View style={styles.heroTitleBlock}>
							<Text style={styles.heroTitle}>{hospital?.name || "Hospital"}</Text>
							<Text style={styles.heroSubtitle}>{buildHospitalSubtitle(hospital)}</Text>
						</View>
						<View style={styles.heroPillRow}>
							{heroStatItems.map((item) => (
								<View key={item.key} style={styles.heroPill}>
									<Ionicons name={item.icon} size={12} color={item.iconColor} />
									<Text style={styles.heroPillText}>{item.label}</Text>
								</View>
							))}
						</View>
					</View>
				</ImageBackground>

				<View style={[styles.segmentWrap, { backgroundColor: badgeSurface }]}> 
					{STORY_SECTIONS.map((label, index) => (
						<Pressable
							key={`${label}-${index}`}
							onPress={() => setActiveCard(index)}
							style={({ pressed }) => [
								styles.segmentButton,
								activeCard === index ? { backgroundColor: activeTabBg } : null,
								pressed ? { opacity: 0.86 } : null,
							]}
						>
							<Text
								style={[
									styles.segmentButtonText,
									{ color: activeCard === index ? activeTabText : subtleColor },
								]}
							>
								{label}
							</Text>
						</Pressable>
					))}
				</View>

				{activeCard === 0 ? (
					<View style={[styles.panel, { backgroundColor: panelSurface }]}> 
						{overviewRows.map((item, index) => (
							<View
								key={item.key || `${item.label}-${index}`}
								style={[styles.detailRow, { backgroundColor: rowSurface }]}
							>
								<View style={styles.detailRowLeft}>
									<View style={[styles.detailIconWrap, { backgroundColor: badgeSurface }]}> 
										{renderRowIcon(item)}
									</View>
									<Text style={[styles.detailLabel, { color: subtleColor }]}>{item.label}</Text>
								</View>
								<Text style={[styles.detailValue, { color: titleColor }]}>{item.value}</Text>
							</View>
						))}
					</View>
				) : null}

				{activeCard === 1 ? (
					<View style={[styles.panel, { backgroundColor: panelSurface }]}> 
						<View style={styles.routeShell}>
							<EmergencyHospitalRoutePreview
								origin={origin}
								hospital={destination ? { ...hospital, ...destination } : hospital}
								bottomPadding={18}
								routeCoordinates={routeCoordinates}
								routeInfo={routeInfo}
								isCalculatingRoute={isCalculatingRoute}
								visible={visible}
								showLoadingBadge={true}
							/>
						</View>
						<View style={styles.routePillRow}>
							{routeDistanceLabel ? (
								<View style={[styles.routePill, { backgroundColor: badgeSurface }]}> 
									<Ionicons name="navigate" size={12} color={COLORS.brandPrimary} />
									<Text style={[styles.routePillText, { color: titleColor }]}>{routeDistanceLabel}</Text>
								</View>
							) : null}
							<View style={[styles.routePill, { backgroundColor: badgeSurface }]}> 
								<Ionicons name="time-outline" size={12} color={COLORS.brandPrimary} />
								<Text style={[styles.routePillText, { color: titleColor }]}>{routeEtaLabel}</Text>
							</View>
						</View>
						<Text numberOfLines={2} style={[styles.routeAddress, { color: bodyColor }]}> 
							{hospital?.address || hospital?.formattedAddress || "Route from your current location."}
						</Text>
					</View>
				) : null}

				{activeCard === 2 ? (
					<View style={[styles.panel, { backgroundColor: panelSurface }]}> 
						{featureList.length > 0 ? (
							<View style={styles.tagRow}>
								{featureList.map((item, index) => (
									<View key={`${item}-${index}`} style={[styles.tagChip, { backgroundColor: rowSurface }]}> 
										<Text style={[styles.tagText, { color: titleColor }]}>{item}</Text>
									</View>
								))}
							</View>
						) : null}

						{roomRows.length > 0 ? (
							<View style={styles.roomList}>
								{roomRows.map((room, index) => (
									<View
										key={`${room.id}-${index}`}
										style={[styles.roomRow, { backgroundColor: rowSurface }]}
									>
										<View style={styles.roomCopy}>
											<Text style={[styles.roomLabel, { color: titleColor }]}>{room.label}</Text>
											<Text style={[styles.roomMeta, { color: subtleColor }]}> 
												{room.total ? `${room.available} of ${room.total} open` : `${room.available} ready now`}
											</Text>
										</View>
										<Text style={[styles.roomPrice, { color: titleColor }]}> 
											{room.price ? `From ${Math.round(room.price).toLocaleString()}` : "Open"}
										</Text>
									</View>
								))}
							</View>
						) : null}

						{featureList.length === 0 && roomRows.length === 0 ? (
							<View style={[styles.emptyState, { backgroundColor: rowSurface }]}> 
								<Text style={[styles.emptyText, { color: bodyColor }]}>Details available on request</Text>
							</View>
						) : null}
					</View>
				) : null}
			</ScrollView>

			<View style={styles.actionStack}>
				<Pressable onPress={handleUseHospital} style={styles.primaryAction}>
					{({ pressed }) => (
						<LinearGradient
							colors={["#A11412", COLORS.brandPrimary]}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
							style={[styles.primaryActionFill, pressed ? styles.primaryActionFillPressed : null]}
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
						<Pressable onPress={handleCallHospital}>
							{({ pressed }) => (
								<View
									style={[
										styles.secondaryAction,
										{ backgroundColor: rowSurface, opacity: pressed ? 0.88 : 1 },
									]}
								>
									<View style={[styles.secondaryIconWrap, { backgroundColor: badgeSurface }]}> 
										<Ionicons name="call-outline" size={16} color={titleColor} />
									</View>
									<Text style={[styles.secondaryActionText, { color: titleColor }]}>Call</Text>
								</View>
							)}
						</Pressable>
					) : null}

					{typeof onOpenHospitals === "function" ? (
						<Pressable
							onPress={() => {
								onClose?.();
								onOpenHospitals();
							}}
						>
							{({ pressed }) => (
								<View
									style={[
										styles.secondaryAction,
										{ backgroundColor: rowSurface, opacity: pressed ? 0.88 : 1 },
									]}
								>
									<View style={[styles.secondaryIconWrap, { backgroundColor: badgeSurface }]}> 
										<Ionicons name="list-outline" size={16} color={titleColor} />
									</View>
									<Text style={[styles.secondaryActionText, { color: titleColor }]}>All hospitals</Text>
								</View>
							)}
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
		paddingBottom: 8,
		gap: 10,
		paddingHorizontal: 0,
	},
	scrollContent: {
		paddingHorizontal: 6,
		paddingBottom: 4,
		gap: 10,
	},
	hero: {
		height: 236,
		borderRadius: 24,
		overflow: "hidden",
		justifyContent: "space-between",
	},
	heroImage: {
		borderRadius: 24,
	},
	heroBadgeRow: {
		paddingTop: 10,
		paddingHorizontal: 10,
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 6,
	},
	heroBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		paddingHorizontal: 8,
		paddingVertical: 5,
		borderRadius: 999,
	},
	heroBadgeText: {
		fontSize: 10,
		lineHeight: 13,
		fontWeight: "700",
		color: "#F8FAFC",
	},
	heroFooter: {
		paddingHorizontal: 12,
		paddingVertical: 12,
		gap: 8,
	},
	heroTitleBlock: {
		gap: 4,
	},
	heroTitle: {
		fontSize: 24,
		lineHeight: 28,
		fontWeight: "800",
		color: "#F8FAFC",
	},
	heroSubtitle: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "500",
		color: "rgba(248,250,252,0.86)",
	},
	heroPillRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	heroPill: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 7,
		backgroundColor: "rgba(255,255,255,0.12)",
	},
	heroPillText: {
		fontSize: 12,
		lineHeight: 15,
		fontWeight: "600",
		color: "#F8FAFC",
	},
	segmentWrap: {
		flexDirection: "row",
		gap: 6,
		padding: 4,
		borderRadius: 16,
	},
	segmentButton: {
		flex: 1,
		minHeight: 36,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 10,
	},
	segmentButtonText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "700",
	},
	panel: {
		borderRadius: 20,
		paddingHorizontal: 10,
		paddingVertical: 10,
		gap: 8,
	},
	detailRow: {
		minHeight: 52,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 10,
		borderRadius: 14,
		paddingHorizontal: 10,
		paddingVertical: 10,
	},
	detailRowLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		flex: 1,
	},
	detailIconWrap: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	detailLabel: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "600",
	},
	detailValue: {
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "800",
		textAlign: "right",
		maxWidth: "48%",
	},
	routeShell: {
		height: 208,
		borderRadius: 18,
		overflow: "hidden",
	},
	routePillRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	routePill: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 7,
	},
	routePillText: {
		fontSize: 12,
		lineHeight: 15,
		fontWeight: "600",
	},
	routeAddress: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "500",
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
	roomList: {
		gap: 8,
	},
	roomRow: {
		borderRadius: 16,
		paddingHorizontal: 11,
		paddingVertical: 10,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
	},
	roomCopy: {
		flex: 1,
	},
	roomLabel: {
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "700",
	},
	roomMeta: {
		marginTop: 3,
		fontSize: 11,
		lineHeight: 15,
		fontWeight: "500",
	},
	roomPrice: {
		fontSize: 11,
		lineHeight: 15,
		fontWeight: "700",
	},
	emptyState: {
		minHeight: 56,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 12,
	},
	emptyText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "600",
	},
	actionStack: {
		gap: 8,
		paddingHorizontal: 6,
		paddingTop: 2,
	},
	primaryAction: {
		borderRadius: 20,
		overflow: "hidden",
		shadowColor: COLORS.brandPrimary,
		shadowOpacity: 0.16,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 8 },
	},
	primaryActionFill: {
		minHeight: 54,
		paddingHorizontal: 14,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	primaryActionFillPressed: {
		opacity: 0.92,
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
		gap: 8,
	},
	secondaryAction: {
		flex: 1,
		minHeight: 46,
		borderRadius: 16,
		paddingHorizontal: 12,
		paddingVertical: 10,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
	},
	secondaryIconWrap: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	secondaryActionText: {
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "700",
	},
});

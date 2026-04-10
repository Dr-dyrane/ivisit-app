import React, { useEffect, useMemo } from "react";
import {
	ImageBackground,
	Linking,
	Platform,
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
import { getHospitalHeroSource } from "./mapHospitalImage";

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

function formatRating(hospital) {
	const rating = Number(hospital?.rating);
	if (!Number.isFinite(rating) || rating <= 0) return null;
	return rating.toFixed(1);
}

function formatPriceLabel(hospital) {
	const direct = [hospital?.priceRange, hospital?.priceLabel, hospital?.price].find(
		(value) => typeof value === "string" && value.trim().length > 0,
	);
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
	return items
		.filter((item) => {
			const key = item.label.toLowerCase();
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		})
		.slice(0, 3);
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
		Number.isFinite(beds) && beds > 0 ? { label: "Beds", value: `${beds} open`, icon: "bed", iconType: "material" } : null,
		Number.isFinite(ambulances) && ambulances > 0
			? { label: "Ambulance", value: `${ambulances} ready`, icon: "ambulance", iconType: "material" }
			: null,
	]
		.filter(Boolean)
		.slice(0, 4);
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
	const snapshot =
		hospital?.bedAvailability && typeof hospital.bedAvailability === "object"
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

function buildDirectionsUrl(destination, hospital) {
	if (!destination?.latitude || !destination?.longitude) return null;

	const encodedCoords = `${destination.latitude},${destination.longitude}`;
	const encodedLabel = encodeURIComponent(hospital?.name || "Hospital");

	if (Platform.OS === "ios") {
		return `http://maps.apple.com/?daddr=${encodedCoords}&dirflg=d&q=${encodedLabel}`;
	}

	return `https://www.google.com/maps/dir/?api=1&destination=${encodedCoords}&travelmode=driving`;
}

export default function MapHospitalDetailsModal(props) {
	const { visible, onClose, hospital, onOpenHospitals, origin = null, onUseHospital } = props;
	const { isDarkMode } = useTheme();
	const { routeCoordinates, routeInfo, isCalculatingRoute, calculateRoute, clearRoute } = useMapRoute();

	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const subtleColor = isDarkMode ? "#94A3B8" : "#64748B";
	const cardSurface = isDarkMode ? "rgba(16,24,38,0.94)" : "rgba(255,255,255,0.96)";
	const rowSurface = isDarkMode ? "rgba(255,255,255,0.07)" : "#EEF2F7";
	const badgeSurface = isDarkMode ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.05)";

	const destination = useMemo(() => getDestinationCoordinate(hospital), [hospital]);
	const heroBadges = useMemo(() => buildHeroBadges(hospital), [hospital]);
	const statusItems = useMemo(() => buildStatusItems(hospital, routeInfo), [hospital, routeInfo]);
	const roomRows = useMemo(() => buildRoomRows(hospital), [hospital]);
	const featureList = useMemo(() => buildFeatureList(hospital), [hospital]);
	const canCallHospital = typeof hospital?.phone === "string" && hospital.phone.trim().length > 0;
	const canUseHospital = typeof onUseHospital === "function";
	const routeEtaLabel =
		(typeof hospital?.eta === "string" && hospital.eta.trim()) ||
		formatDurationSeconds(routeInfo?.durationSec) ||
		"Live route";
	const routeDistanceLabel =
		(typeof hospital?.distance === "string" && hospital.distance.trim()) ||
		formatDistanceMeters(routeInfo?.distanceMeters) ||
		null;
	const quickFacts = useMemo(
		() => statusItems.filter((item) => item.label !== "Distance").slice(0, 3),
		[statusItems],
	);

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

	const handleOpenDirections = async () => {
		const url = buildDirectionsUrl(destination, hospital);
		if (!url) return;
		await Linking.openURL(url);
	};

	const handleBrowseHospitals = () => {
		onClose?.();
		onOpenHospitals?.();
	};

	const hasCareSnapshot = featureList.length > 0 || roomRows.length > 0;
	const routeSummaryBits = [
		routeDistanceLabel,
		routeEtaLabel && routeEtaLabel !== "Live route" ? routeEtaLabel : null,
	].filter(Boolean);
	const dockAction = canUseHospital
		? { label: "Use hospital", onPress: handleUseHospital }
		: typeof onOpenHospitals === "function"
			? { label: "See all hospitals", onPress: handleBrowseHospitals }
			: destination
				? { label: "Open in Maps", onPress: handleOpenDirections }
				: { label: "Done", onPress: onClose };

	const renderIcon = (item, color = COLORS.brandPrimary, size = 14) => {
		if (item.iconType === "material") {
			return <MaterialCommunityIcons name={item.icon} size={size} color={color} />;
		}
		return <Ionicons name={item.icon} size={size} color={color} />;
	};

	const renderSheetIcon = (item, options = {}) => {
		const { tone = "muted", size = 14 } = options;
		const gradientColors =
			tone === "strong"
				? isDarkMode
					? ["rgba(255,255,255,0.16)", "rgba(255,255,255,0.06)"]
					: ["#FFFFFF", "#E8EEF7"]
				: isDarkMode
					? ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.04)"]
					: ["rgba(255,255,255,0.98)", "#F1F5F9"];
		const iconColor = tone === "strong" ? titleColor : COLORS.brandPrimary;

		return (
			<View style={[styles.sheetIconShell, tone === "strong" ? styles.sheetIconShellStrong : null]}>
				<LinearGradient
					colors={gradientColors}
					start={{ x: 0.08, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.sheetIconFill}
				>
					<View pointerEvents="none" style={styles.sheetIconHighlight} />
					{renderIcon(item, iconColor, size)}
				</LinearGradient>
			</View>
		);
	};

	const addressLine = hospital?.address || hospital?.formattedAddress || buildHospitalSubtitle(hospital);

	const renderPanel = () => {
		if (activeSection === "overview") {
			return (
				<View style={[styles.panel, { backgroundColor: panelSurface }]}>
					<View style={styles.sectionHeading}>
						<Text style={[styles.sectionEyebrow, { color: subtleColor }]}>Overview</Text>
						<Text style={[styles.sectionTitle, { color: titleColor }]}>What matters before you leave</Text>
					</View>

					{overviewRows.map((item, index) => (
						<View key={item.key || `${item.label}-${index}`} style={[styles.detailRow, { backgroundColor: rowSurface }]}>
							<View style={styles.detailRowLeft}>
								<View style={[styles.detailIconWrap, { backgroundColor: badgeSurface }]}>
									{renderIcon(item)}
								</View>
								<Text style={[styles.detailLabel, { color: subtleColor }]}>{item.label}</Text>
							</View>
							<Text style={[styles.detailValue, { color: titleColor }]}>{item.value}</Text>
						</View>
					))}

					<View style={[styles.addressCard, { backgroundColor: rowSurface }]}>
						<View style={[styles.detailIconWrap, { backgroundColor: badgeSurface }]}>
							<Ionicons name="location-outline" size={14} color={COLORS.brandPrimary} />
						</View>
						<View style={styles.addressCopy}>
							<Text style={[styles.detailLabel, { color: subtleColor }]}>Address</Text>
							<Text style={[styles.addressText, { color: titleColor }]}>{addressLine}</Text>
						</View>
					</View>
				</View>
			);
		}

		if (activeSection === "route") {
			return (
				<View style={[styles.panel, { backgroundColor: panelSurface }]}>
					<View style={styles.sectionHeading}>
						<Text style={[styles.sectionEyebrow, { color: subtleColor }]}>Route</Text>
						<Text style={[styles.sectionTitle, { color: titleColor }]}>Preview the fastest path</Text>
						<Text style={[styles.sectionBody, { color: bodyColor }]}>
							Open the route in Maps when you want turn-by-turn guidance.
						</Text>
					</View>

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
							<View style={[styles.routePill, { backgroundColor: rowSurface }]}>
								<Ionicons name="navigate" size={12} color={COLORS.brandPrimary} />
								<Text style={[styles.routePillText, { color: titleColor }]}>{routeDistanceLabel}</Text>
							</View>
						) : null}
						<View style={[styles.routePill, { backgroundColor: rowSurface }]}>
							<Ionicons name="time-outline" size={12} color={COLORS.brandPrimary} />
							<Text style={[styles.routePillText, { color: titleColor }]}>{routeEtaLabel}</Text>
						</View>
					</View>

					<View style={[styles.addressCard, { backgroundColor: rowSurface }]}>
						<View style={[styles.detailIconWrap, { backgroundColor: badgeSurface }]}>
							<Ionicons name="pin-outline" size={14} color={COLORS.brandPrimary} />
						</View>
						<View style={styles.addressCopy}>
							<Text style={[styles.detailLabel, { color: subtleColor }]}>Destination</Text>
							<Text style={[styles.addressText, { color: titleColor }]}>{addressLine}</Text>
						</View>
					</View>
				</View>
			);
		}

		return (
			<View style={[styles.panel, { backgroundColor: panelSurface }]}>
				<View style={styles.sectionHeading}>
					<Text style={[styles.sectionEyebrow, { color: subtleColor }]}>Capacity</Text>
					<Text style={[styles.sectionTitle, { color: titleColor }]}>Services and live availability</Text>
					<Text style={[styles.sectionBody, { color: bodyColor }]}>
						Availability changes quickly, so call ahead if you need confirmation.
					</Text>
				</View>

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
							<View key={`${room.id}-${index}`} style={[styles.roomRow, { backgroundColor: rowSurface }]}>
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
						<Text style={[styles.emptyText, { color: bodyColor }]}>
							More care details are available on request.
						</Text>
					</View>
				) : null}
			</View>
		);
	};

	return (
		<MapModalShell
			visible={visible}
			onClose={onClose}
			title={null}
			minHeightRatio={0.88}
			maxHeightRatio={0.88}
			contentContainerStyle={styles.content}
			scrollEnabled={false}
			showHandle={true}
		>
			<View style={styles.modalBody}>
				<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
					<ImageBackground
						source={getHospitalHeroSource(hospital)}
						resizeMode="cover"
						style={styles.hero}
						imageStyle={styles.heroImage}
					>
						<LinearGradient
							colors={
								isDarkMode
									? ["rgba(2,6,23,0.06)", "rgba(2,6,23,0.22)", "rgba(2,6,23,0.88)"]
									: ["rgba(15,23,42,0.01)", "rgba(15,23,42,0.12)", "rgba(15,23,42,0.76)"]
							}
							style={StyleSheet.absoluteFillObject}
						/>

						{heroBadges.length > 0 ? (
							<View style={styles.heroBadgeRow}>
								{heroBadges.map((item, index) => {
									const badgeBg =
										item.tone === "verified"
											? "rgba(16,185,129,0.18)"
											: item.tone === "alert"
												? "rgba(225,29,72,0.18)"
												: "rgba(255,255,255,0.12)";
									return (
										<View key={`${item.label}-${index}`} style={[styles.heroBadge, { backgroundColor: badgeBg }]}>
											{renderIcon(item, "#F8FAFC")}
											<Text style={styles.heroBadgeText}>{item.label}</Text>
										</View>
									);
								})}
							</View>
						) : null}

						<View style={styles.heroFooter}>
							<Text numberOfLines={2} style={styles.heroTitle}>
								{hospital?.name || "Hospital"}
							</Text>
						</View>
					</ImageBackground>

					{quickFacts.length > 0 ? (
						<View style={styles.quickFactRow}>
							{quickFacts.map((item) => (
								<View key={item.label} style={[styles.quickFactPill, { backgroundColor: rowSurface }]}>
									{renderSheetIcon(item)}
									<View style={styles.quickFactCopy}>
										<Text numberOfLines={1} style={[styles.quickFactLabel, { color: subtleColor }]}>
											{item.label}
										</Text>
										<Text numberOfLines={1} style={[styles.quickFactText, { color: titleColor }]}>
											{item.value}
										</Text>
									</View>
								</View>
							))}
						</View>
					) : null}

					{destination || routeCoordinates.length > 1 || addressLine ? (
						<Pressable
							onPress={destination ? handleOpenDirections : undefined}
							disabled={!destination}
							style={styles.routePressable}
						>
							{({ pressed }) => (
								<View style={[styles.routeShell, pressed && destination ? styles.routeShellPressed : null]}>
									<EmergencyHospitalRoutePreview
										origin={origin}
										hospital={destination ? { ...hospital, ...destination } : hospital}
										bottomPadding={18}
										routeCoordinates={routeCoordinates}
										routeInfo={routeInfo}
										isCalculatingRoute={isCalculatingRoute}
										visible={visible}
										showLoadingBadge={false}
									/>
									<LinearGradient
										pointerEvents="none"
										colors={["rgba(15,23,42,0.48)", "rgba(15,23,42,0.08)", "rgba(15,23,42,0)"]}
										style={StyleSheet.absoluteFillObject}
									/>
									<View pointerEvents="none" style={styles.routeCanvasHeader}>
										<View
											style={[
												styles.routeSummaryPill,
												{ backgroundColor: isDarkMode ? "rgba(8,15,27,0.56)" : "rgba(15,23,42,0.42)" },
											]}
										>
											<Text style={styles.routeSummaryText}>
												{routeSummaryBits.length > 0 ? routeSummaryBits.join(" • ") : "Route preview"}
											</Text>
											{addressLine ? (
												<Text numberOfLines={1} style={styles.routeAddressText}>
													{addressLine}
												</Text>
											) : null}
										</View>
										{destination ? (
											<View
												style={[
													styles.routeMapsPill,
													{ backgroundColor: isDarkMode ? "rgba(8,15,27,0.48)" : "rgba(15,23,42,0.38)" },
												]}
											>
												{renderSheetIcon({ icon: "navigate-outline", iconType: "ion" }, { tone: "strong", size: 13 })}
												<Text style={styles.routeMapsText}>Maps</Text>
											</View>
										) : null}
									</View>
								</View>
							)}
						</Pressable>
					) : null}

					{hasCareSnapshot ? (
						<View style={[styles.minimalCard, { backgroundColor: cardSurface }]}> 
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
										<View key={`${room.id}-${index}`} style={[styles.roomRow, { backgroundColor: rowSurface }]}> 
											<View style={styles.roomCopy}>
												<Text style={[styles.roomLabel, { color: titleColor }]}>{room.label}</Text>
												<Text style={[styles.roomMeta, { color: subtleColor }]}> 
													{room.total ? `${room.available} of ${room.total} open` : `${room.available} open`}
												</Text>
											</View>
											{room.price ? (
												<Text style={[styles.roomPrice, { color: titleColor }]}>From {Math.round(room.price).toLocaleString()}</Text>
											) : null}
										</View>
									))}
								</View>
							) : null}
						</View>
					) : null}
				</ScrollView>

				<View style={styles.actionDock}>
					<View style={styles.compactActionRow}>
						{canCallHospital ? (
							<Pressable onPress={handleCallHospital} style={styles.callActionPressable}>
								{({ pressed }) => (
									<View style={[styles.callActionButton, { backgroundColor: rowSurface, opacity: pressed ? 0.86 : 1 }]}>
										<Ionicons name="call" size={20} color={titleColor} style={styles.callActionIcon} />
									</View>
								)}
							</Pressable>
						) : null}

						<Pressable onPress={dockAction.onPress} style={styles.inlinePrimaryPressable}>
							{({ pressed }) => (
								<View style={[styles.inlinePrimaryAction, pressed ? styles.inlinePrimaryActionPressed : null]}>
									<Text style={styles.inlinePrimaryText}>{dockAction.label}</Text>
									<Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
								</View>
							)}
						</Pressable>
					</View>
				</View>
			</View>
		</MapModalShell>
	);
}

const styles = StyleSheet.create({
	content: {
		flex: 1,
		paddingTop: 0,
		paddingBottom: 0,
		paddingHorizontal: 0,
	},
	modalBody: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: 0,
		paddingBottom: 10,
		gap: 10,
	},
	hero: {
		height: 216,
		borderRadius: 30,
		overflow: "hidden",
		justifyContent: "space-between",
		shadowColor: "#0F172A",
		shadowOpacity: 0.16,
		shadowRadius: 22,
		shadowOffset: { width: 0, height: 12 },
	},
	heroImage: {
		borderRadius: 30,
	},
	heroBadgeRow: {
		paddingTop: 12,
		paddingHorizontal: 12,
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 6,
	},
	heroBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		paddingHorizontal: 9,
		paddingVertical: 6,
		borderRadius: 999,
	},
	heroBadgeText: {
		fontSize: 10,
		lineHeight: 13,
		fontWeight: "700",
		color: "#F8FAFC",
	},
	heroFooter: {
		paddingHorizontal: 14,
		paddingVertical: 12,
		justifyContent: "flex-end",
	},
	heroTitleBlock: {
		gap: 5,
	},
	heroEyebrow: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "700",
		letterSpacing: 0.3,
		color: "rgba(248,250,252,0.86)",
		textTransform: "uppercase",
	},
	heroTitle: {
		fontSize: 24,
		lineHeight: 28,
		fontWeight: "800",
		color: "#F8FAFC",
	},
	heroSubtitle: {
		fontSize: 12,
		lineHeight: 16,
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
	quickFactRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	quickFactPill: {
		minHeight: 50,
		borderRadius: 18,
		paddingHorizontal: 10,
		paddingVertical: 8,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		flexGrow: 1,
		minWidth: 102,
	},
	quickFactCopy: {
		flex: 1,
		gap: 1,
	},
	quickFactLabel: {
		fontSize: 10,
		lineHeight: 13,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.3,
	},
	quickFactText: {
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "800",
	},
	minimalCard: {
		borderRadius: 22,
		paddingHorizontal: 12,
		paddingVertical: 12,
		gap: 10,
		shadowColor: "#0F172A",
		shadowOpacity: 0.05,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
	},
	minimalCardHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 10,
	},
	minimalHeaderCopy: {
		flex: 1,
		gap: 4,
	},
	minimalTitle: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "800",
	},
	minimalMeta: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "500",
	},
	mapsShortcut: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 7,
	},
	mapsShortcutText: {
		fontSize: 12,
		lineHeight: 15,
		fontWeight: "700",
	},
	summaryCard: {
		borderRadius: 24,
		paddingHorizontal: 14,
		paddingVertical: 14,
		borderWidth: 1,
		gap: 12,
		shadowColor: "#0F172A",
		shadowOpacity: 0.06,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 8 },
	},
	summaryHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
	},
	summaryEyebrow: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.4,
	},
	summaryStatusPill: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		borderRadius: 999,
		paddingHorizontal: 9,
		paddingVertical: 6,
	},
	summaryStatusText: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "700",
	},
	summaryTitle: {
		fontSize: 22,
		lineHeight: 26,
		fontWeight: "800",
	},
	summaryMessage: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: "500",
	},
	glanceGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	glanceTile: {
		width: "48%",
		minHeight: 88,
		borderRadius: 18,
		paddingHorizontal: 12,
		paddingVertical: 12,
		gap: 8,
	},
	glanceIconWrap: {
		width: 30,
		height: 30,
		borderRadius: 15,
		alignItems: "center",
		justifyContent: "center",
	},
	glanceLabel: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.3,
	},
	glanceValue: {
		fontSize: 15,
		lineHeight: 19,
		fontWeight: "800",
	},
	segmentWrap: {
		flexDirection: "row",
		gap: 6,
		padding: 5,
		borderRadius: 18,
	},
	segmentButton: {
		minWidth: 92,
		minHeight: 40,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 12,
	},
	segmentButtonPressed: {
		opacity: 0.88,
		transform: [{ scale: 0.98 }],
	},
	segmentButtonText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "700",
	},
	panel: {
		borderRadius: 22,
		paddingHorizontal: 12,
		paddingVertical: 12,
		gap: 10,
		shadowColor: "#0F172A",
		shadowOpacity: 0.06,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 6 },
	},
	sectionHeading: {
		gap: 4,
	},
	sectionEyebrow: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.4,
	},
	sectionTitle: {
		fontSize: 18,
		lineHeight: 22,
		fontWeight: "800",
	},
	sectionBody: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "500",
	},
	detailRow: {
		minHeight: 54,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 10,
		borderRadius: 16,
		paddingHorizontal: 11,
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
		fontWeight: "700",
	},
	detailValue: {
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "800",
		textAlign: "right",
		maxWidth: "48%",
	},
	addressCard: {
		borderRadius: 18,
		paddingHorizontal: 11,
		paddingVertical: 12,
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 10,
	},
	addressCopy: {
		flex: 1,
		gap: 4,
	},
	addressText: {
		fontSize: 14,
		lineHeight: 19,
		fontWeight: "600",
	},
	routePressable: {
		marginTop: -2,
	},
	routeShell: {
		height: 222,
		borderRadius: 26,
		overflow: "hidden",
		backgroundColor: "rgba(255,255,255,0.04)",
	},
	routeShellPressed: {
		opacity: 0.96,
		transform: [{ scale: 0.997 }],
	},
	routeCanvasHeader: {
		position: "absolute",
		top: 12,
		left: 12,
		right: 12,
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: 8,
	},
	routeSummaryPill: {
		flex: 1,
		borderRadius: 18,
		paddingHorizontal: 12,
		paddingVertical: 10,
		gap: 2,
	},
	routeSummaryText: {
		fontSize: 13,
		lineHeight: 16,
		fontWeight: "800",
		color: "#F8FAFC",
	},
	routeAddressText: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "500",
		color: "rgba(248,250,252,0.82)",
	},
	routeMapsPill: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		borderRadius: 999,
		paddingLeft: 6,
		paddingRight: 10,
		paddingVertical: 6,
	},
	routeMapsText: {
		fontSize: 12,
		lineHeight: 14,
		fontWeight: "700",
		color: "#F8FAFC",
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
		minHeight: 60,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 12,
	},
	emptyText: {
		fontSize: 12,
		lineHeight: 17,
		fontWeight: "600",
		textAlign: "center",
	},
	actionDock: {
		paddingTop: 10,
		paddingHorizontal: 0,
		gap: 8,
	},
	compactActionRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	callActionPressable: {
		width: 56,
	},
	callActionButton: {
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#0F172A",
		shadowOpacity: 0.08,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 5 },
	},
	callActionIcon: {
		textShadowColor: "rgba(255,255,255,0.18)",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 1,
	},
	sheetIconShell: {
		width: 28,
		height: 28,
		borderRadius: 14,
		padding: 1,
		shadowColor: "#0F172A",
		shadowOpacity: 0.05,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 3 },
	},
	sheetIconShellStrong: {
		shadowOpacity: 0.09,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
	},
	sheetIconFill: {
		flex: 1,
		borderRadius: 13,
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	},
	sheetIconHighlight: {
		position: "absolute",
		left: 1,
		right: 1,
		top: 1,
		height: "44%",
		borderRadius: 12,
		backgroundColor: "rgba(255,255,255,0.22)",
	},
	inlinePrimaryPressable: {
		flex: 1,
	},
	inlinePrimaryAction: {
		minHeight: 56,
		borderRadius: 20,
		paddingHorizontal: 16,
		backgroundColor: COLORS.brandPrimary,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	inlinePrimaryActionPressed: {
		opacity: 0.94,
		transform: [{ scale: 0.99 }],
	},
	inlinePrimaryText: {
		fontSize: 15,
		lineHeight: 19,
		fontWeight: "800",
		color: "#FFFFFF",
	},
	primaryAction: {
		borderRadius: 20,
		overflow: "hidden",
		shadowColor: COLORS.brandPrimary,
		shadowOpacity: 0.22,
		shadowRadius: 16,
		shadowOffset: { width: 0, height: 10 },
	},
	primaryActionFill: {
		minHeight: 56,
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	primaryActionFillPressed: {
		opacity: 0.92,
		transform: [{ scale: 0.99 }],
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
	secondaryPressable: {
		flex: 1,
	},
	secondaryAction: {
		flex: 1,
		minHeight: 48,
		borderRadius: 16,
		paddingHorizontal: 12,
		paddingVertical: 10,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		shadowColor: "#0F172A",
		shadowOpacity: 0.04,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 3 },
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

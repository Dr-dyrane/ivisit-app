import { Platform } from "react-native";
import { buildHospitalSubtitle } from "./mapHospitalList.helpers";

const ROOM_LABELS = {
	standard: "Standard bed",
	private: "Private room",
	icu: "ICU bed",
	maternity: "Maternity bed",
	pediatric: "Pediatric bed",
	isolation: "Isolation bed",
	general: "General bed",
};

const ROOM_SERVICE_TYPES = [
	{ id: "standard", label: "General ward", aliases: ["standard", "general", "ward"] },
	{ id: "private", label: "Private room", aliases: ["private", "vip", "suite"] },
	{ id: "icu", label: "High-support care", aliases: ["icu", "critical", "intensive"] },
	{ id: "maternity", label: "Maternity room", aliases: ["maternity"] },
	{ id: "pediatric", label: "Children's care", aliases: ["pediatric", "peds"] },
];

const AMBULANCE_SERVICE_TYPES = [
	{
		id: "basic",
		label: "Everyday care",
		serviceType: "ambulance_basic",
		aliases: ["basic", "standard", "bls"],
	},
	{
		id: "advanced",
		label: "Extra support",
		serviceType: "ambulance_advanced",
		aliases: ["advanced", "als", "cardiac"],
	},
	{
		id: "critical",
		label: "Hospital transfer",
		serviceType: "ambulance_critical",
		aliases: ["critical", "icu", "intensive"],
	},
];

export function toDisplayText(value) {
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

function dedupeStrings(values) {
	const seen = new Set();
	const items = [];
	for (const value of values) {
		const item = typeof value === "string" ? value.trim() : "";
		if (!item) continue;
		const key = item.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		items.push(item);
	}
	return items;
}

export function formatDurationSeconds(seconds) {
	if (!Number.isFinite(Number(seconds)) || Number(seconds) <= 0) return null;
	return `${Math.max(1, Math.round(Number(seconds) / 60))} min`;
}

export function formatDistanceMeters(meters) {
	if (!Number.isFinite(Number(meters)) || Number(meters) <= 0) return null;
	const km = Number(meters) / 1000;
	return km >= 10 ? `${km.toFixed(0)} km` : `${km.toFixed(1)} km`;
}

export function normalizeTimeLabel(value) {
	const text = String(value || "").trim();
	if (!text || text === "Live route") return null;
	return text
		.replace(/\bminutes\b/gi, "min")
		.replace(/\bmins\b/gi, "min")
		.replace(/\s+/g, " ");
}

function formatRatingCount(value) {
	const count = Number(value);
	if (!Number.isFinite(count) || count <= 0) return null;
	if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
	return String(Math.round(count));
}

function formatPrice(value, fallback = "At request") {
	if (typeof value === "string" && value.trim()) {
		const trimmed = value.trim();
		return trimmed.startsWith("$") ? trimmed : `$${trimmed}`;
	}
	const numeric = Number(value);
	if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
	return `$${Math.round(numeric).toLocaleString()}`;
}

function matchesAliases(value, aliases = []) {
	const raw = String(value || "").toLowerCase();
	return aliases.some((alias) => raw.includes(alias));
}

export function getDestinationCoordinate(hospital) {
	const latitude = Number(
		hospital?.latitude ??
			hospital?.lat ??
			hospital?.coords?.latitude ??
			hospital?.location?.latitude,
	);
	const longitude = Number(
		hospital?.longitude ??
			hospital?.lng ??
			hospital?.lon ??
			hospital?.coords?.longitude ??
			hospital?.location?.longitude,
	);

	if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
		return { latitude, longitude };
	}

	return null;
}

export function buildHeroBadges(hospital) {
	const items = [];
	if (hospital?.verified) {
		items.push({
			label: "Verified",
			icon: "shield-checkmark",
			iconType: "ion",
			tone: "verified",
		});
	}

	const emergencyLevel = toDisplayText(
		hospital?.emergencyLevel || hospital?.emergency_level,
	);
	if (emergencyLevel) {
		items.push({ label: emergencyLevel, icon: "flash", iconType: "ion", tone: "alert" });
	}

	const serviceType = toStringList(
		hospital?.serviceTypes || hospital?.service_types,
	)[0];
	if (serviceType) {
		items.push({
			label: toDisplayText(serviceType),
			icon: "layers-outline",
			iconType: "ion",
			tone: "neutral",
		});
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

export function buildPlaceStats(hospital, routeInfo) {
	const waitTime =
		normalizeTimeLabel(hospital?.waitTime) ||
		(Number.isFinite(
			Number(
				hospital?.emergencyWaitTimeMinutes ??
					hospital?.emergency_wait_time_minutes,
			),
		)
			? `${Number(hospital?.emergencyWaitTimeMinutes ?? hospital?.emergency_wait_time_minutes)} min`
			: null);
	const rating = Number(hospital?.rating ?? hospital?.google_rating);
	const ratingCount = formatRatingCount(
		hospital?.googleRatingCount ??
			hospital?.google_rating_count ??
			hospital?.reviewsCount ??
			hospital?.reviews_count ??
			hospital?.userRatingsTotal ??
			hospital?.user_ratings_total,
	);
	const distance =
		(typeof hospital?.distance === "string" && hospital.distance.trim()) ||
		formatDistanceMeters(routeInfo?.distanceMeters);
	const ratingSource = hospital?.importedFromMapbox || hospital?.isMapboxOnly ? "Mapbox" : "Google";

	return [
		Number.isFinite(rating) && rating > 0
			? {
					label: ratingSource,
					value: ratingCount ? `${rating.toFixed(1)} (${ratingCount})` : rating.toFixed(1),
					icon: "star",
					iconType: "ion",
					tone: "rating",
				}
			: null,
		waitTime
			? { label: "Wait", value: waitTime, icon: "time-outline", iconType: "ion" }
			: null,
		distance
			? { label: "Distance", value: distance, icon: "navigate", iconType: "ion" }
			: null,
	].filter(Boolean);
}

export function buildPhotoGallery(hospital) {
	return dedupeStrings([
		...toStringList(hospital?.googlePhotos),
		...toStringList(hospital?.google_photos),
		...toStringList(hospital?.photos),
		hospital?.image,
		hospital?.imageUri,
	]).slice(0, 8);
}

export function buildAmbulanceServiceCards(hospital, pricingRows = [], isLoading = false) {
	const rows = Array.isArray(pricingRows)
		? pricingRows.filter((row) =>
				String(row?.service_type || "").toLowerCase().startsWith("ambulance"),
			)
		: [];
	const hasAmbulances = Number(hospital?.ambulances ?? hospital?.ambulances_count ?? 0) > 0;

	const cards = AMBULANCE_SERVICE_TYPES.map((tier) => {
		const row = rows.find((item) =>
			matchesAliases(
				[
					item?.service_type,
					item?.service_name,
					item?.description,
				]
					.filter(Boolean)
					.join(" "),
				tier.aliases,
			),
		);
		const enabled = Boolean(row) || (tier.id === "basic" && hasAmbulances);
		const title = tier.label;
		const priceText = row
			? formatPrice(row.base_price, null)
			: enabled
				? formatPrice(hospital?.basePrice ?? hospital?.base_price, null)
				: null;
		return {
			id: row?.id || tier.id,
			tierKey: tier.id,
			title,
			service_name: row?.service_name || title,
			service_type: row?.service_type || tier.serviceType,
			description: row?.description || null,
			metaText: enabled ? "Ready to request" : null,
			priceText,
			showMetaSkeleton: !enabled,
			showPriceSkeleton: !priceText,
			enabled,
			source: row ? "db" : "fallback",
		};
	});

	cards.push({ id: "ambulance-skeleton-a", isSkeleton: true });
	cards.push({ id: "ambulance-skeleton-b", isSkeleton: true });

	return cards;
}

export function buildRoomServiceCards(hospital, roomRows = [], isLoading = false) {
	const rows = Array.isArray(roomRows) ? roomRows : [];
	const cards = ROOM_SERVICE_TYPES.map((type) => {
		const row = rows.find((item) =>
			matchesAliases(
				[
					item?.room_type,
					item?.room_label,
					item?.room_name,
					item?.label,
					item?.id,
				]
					.filter(Boolean)
					.join(" "),
				type.aliases,
			),
		);
		const available = Number(
			row?.available_units ??
				row?.available ??
				row?.count ??
				(type.id === "standard" ? hospital?.availableBeds ?? hospital?.available_beds : 0),
		);
		const enabled = Boolean(row) || (type.id === "standard" && Number.isFinite(available) && available > 0);
		const title = type.label;
		const priceText = row
			? formatPrice(row.base_price ?? row.price_per_night ?? row.price, null)
			: enabled
				? formatPrice(hospital?.basePrice ?? hospital?.base_price, null)
				: null;

		return {
			id: row?.id || type.id,
			title,
			room_type: row?.room_type || type.id,
			metaText: Number.isFinite(available) && available > 0 ? `${available} open` : null,
			priceText,
			available: Number.isFinite(available) && available > 0 ? available : null,
			showMetaSkeleton: !(Number.isFinite(available) && available > 0),
			showPriceSkeleton: !priceText,
			enabled,
			source: row ? "db" : "fallback",
		};
	});

	cards.push({ id: "room-skeleton-a", isSkeleton: true });
	cards.push({ id: "room-skeleton-b", isSkeleton: true });

	return cards;
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

export function buildRoomRows(hospital) {
	const snapshot =
		hospital?.bedAvailability && typeof hospital.bedAvailability === "object"
			? hospital.bedAvailability
			: hospital?.bed_availability &&
				  typeof hospital?.bed_availability === "object"
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

export function buildFeatureList(hospital) {
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

export function buildDirectionsUrl(destination, hospital) {
	if (!destination?.latitude || !destination?.longitude) return null;

	const encodedCoords = `${destination.latitude},${destination.longitude}`;
	const encodedLabel = encodeURIComponent(hospital?.name || "Hospital");

	if (Platform.OS === "ios") {
		return `http://maps.apple.com/?daddr=${encodedCoords}&dirflg=d&q=${encodedLabel}`;
	}

	return `https://www.google.com/maps/dir/?api=1&destination=${encodedCoords}&travelmode=driving`;
}

export function buildHospitalDetailSummary(hospital, routeInfo) {
	const addressLine =
		hospital?.address || hospital?.formattedAddress || buildHospitalSubtitle(hospital);
	const distanceLabel =
		(typeof hospital?.distance === "string" && hospital.distance.trim()) ||
		formatDistanceMeters(routeInfo?.distanceMeters) ||
		"Nearby";
	return {
		title: hospital?.name || "Hospital",
		subtitle: distanceLabel,
		addressLine,
	};
}

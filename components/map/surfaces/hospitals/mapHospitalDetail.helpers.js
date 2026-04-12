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

export function formatDurationSeconds(seconds) {
	if (!Number.isFinite(Number(seconds)) || Number(seconds) <= 0) return null;
	return `${Math.max(1, Math.round(Number(seconds) / 60))} min`;
}

export function formatDistanceMeters(meters) {
	if (!Number.isFinite(Number(meters)) || Number(meters) <= 0) return null;
	const km = Number(meters) / 1000;
	return km >= 10 ? `${km.toFixed(0)} km` : `${km.toFixed(1)} km`;
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

export function buildStatusItems(hospital, routeInfo) {
	const distance =
		(typeof hospital?.distance === "string" && hospital.distance.trim()) ||
		formatDistanceMeters(routeInfo?.distanceMeters);
	const eta =
		(typeof hospital?.eta === "string" && hospital.eta.trim()) ||
		formatDurationSeconds(routeInfo?.durationSec);
	const waitTime =
		(typeof hospital?.waitTime === "string" && hospital.waitTime.trim()) ||
		(Number.isFinite(
			Number(
				hospital?.emergencyWaitTimeMinutes ??
					hospital?.emergency_wait_time_minutes,
			),
		)
			? `${Number(hospital?.emergencyWaitTimeMinutes ?? hospital?.emergency_wait_time_minutes)} min`
			: null);
	const beds = Number(hospital?.availableBeds ?? hospital?.available_beds);
	const ambulances = Number(
		hospital?.ambulances ??
			hospital?.ambulancesCount ??
			hospital?.ambulances_count,
	);

	return [
		distance
			? { label: "Distance", value: distance, icon: "navigate", iconType: "ion" }
			: null,
		eta
			? { label: "Arrival", value: eta, icon: "time-outline", iconType: "ion" }
			: null,
		waitTime
			? { label: "Wait", value: waitTime, icon: "pulse-outline", iconType: "ion" }
			: null,
		Number.isFinite(beds) && beds > 0
			? { label: "Beds", value: `${beds} open`, icon: "bed", iconType: "material" }
			: null,
		Number.isFinite(ambulances) && ambulances > 0
			? {
					label: "Ambulance",
					value: `${ambulances} ready`,
					icon: "ambulance",
					iconType: "material",
				}
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

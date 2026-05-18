// components/map/surfaces/providerDetail/useMapProviderDetailModel.js
//
// Model hook for PROVIDER_DETAIL sheet phase.
//
// Architecture:
//   - Mirrors hospital_detail's chassis (summary, heroBadges, placeActions, placeStats).
//   - Adds infoSections[] consumable directly by the shared TrackingDetailsCard primitive
//     (components/map/views/tracking/parts/MapTrackingParts.jsx). One card per section,
//     stacked. Every section that *should* exist for the provider type is rendered, with
//     calm "X not listed" / "X not available" rows when data is missing — never blank.
//   - Provider tint is exposed but used by the body only as small accents (primary CTA,
//     hero badge tone, place mark icon). Section surfaces stay neutral.
//
// Data sources (from services/hospitalsService._mapHospital):
//   name, address, phone, rating, reviewsCount, status, verified, verificationStatus,
//   distance, distanceKm, eta, waitTime, googleWebsite, image, googlePhotos[],
//   specialties[], serviceTypes[], features[], emergencyLevel,
//   availableBeds, ambulances, bedAvailability, ambulanceAvailability,
//   emergencyWaitTimeMinutes, lastAvailabilityUpdate, realTimeSync,
//   providerType, emergencyEligible, dispatchEligible, providerSource, categoryConfidence,
//   providerServices (JSONB), providerSpecialties (JSONB),
//   insuranceAccepted (text[]), structuredHours (JSONB),
//   appointmentRequired, reportTurnaround, ageRange, crisisLine.

import { useCallback, useMemo } from "react";
import { Linking } from "react-native";
import { useTheme } from "../../../../contexts/ThemeContext";
import {
	EXPLORE_CATEGORY_META,
	PROVIDER_TYPES,
} from "../../../../constants/providerTypes";
import { openRideToProvider } from "../../../../utils/bookRideUtils";

// ─── Theme tokens (neutral surfaces; tint is accent only) ────────────────────

function getProviderDetailTheme(isDarkMode) {
	return {
		// Mirrors buildTrackingThemeTokens() values for cross-sheet consistency.
		titleColor:         isDarkMode ? "#F8FAFC" : "#0F172A",
		subtleColor:        isDarkMode ? "#94A3B8" : "#64748B",
		mutedColor:         isDarkMode ? "rgba(226,232,240,0.78)" : "#64748B",
		cardSurface:        isDarkMode ? "rgba(15,23,42,0.74)" : "rgba(255,255,255,0.88)",
		rowSurface:         isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)",
		requestSurfaceColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.88)",
		detailGradientColors: isDarkMode
			? ["rgba(255,255,255,0.03)", "rgba(255,255,255,0.01)"]
			: ["rgba(248,250,252,0.92)", "rgba(255,255,255,0.82)"],
		detailCardRadius:   26,
	};
}

function getActionSurface(tintColor, isDarkMode) {
	return isDarkMode ? `${tintColor}28` : `${tintColor}14`;
}

function getActionTint(tintColor, isDarkMode) {
	return isDarkMode ? `${tintColor}D0` : tintColor;
}

// ─── Provider-type copy helpers ──────────────────────────────────────────────

function getPrimaryActionLabel(_providerType) {
	// Compact action row — single-word CTA across all provider types.
	// Provider-type context is already conveyed by the hero badge + place mark icon.
	return "Call";
}

function buildDistanceLabel(distanceKm) {
	if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;
	const rounded = Math.round(distanceKm * 10) / 10;
	return `${rounded} km away`;
}

// ─── Hours formatting (structuredHours JSONB) ────────────────────────────────
//
// Expected JSONB shape (best-effort — falls back gracefully if absent):
//   { weekday_text: ["Monday: 09:00 – 17:00", ...] }
//   or { mon: { open: "09:00", close: "17:00" }, ... }
//   or { open_now: true, periods: [...] }

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WEEKDAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function todayWeekdayKey() {
	// JS getDay: 0=Sun..6=Sat. Our array: 0=Mon..6=Sun.
	const d = new Date().getDay();
	return WEEKDAY_KEYS[d === 0 ? 6 : d - 1];
}

function formatHoursToday(structuredHours) {
	if (!structuredHours || typeof structuredHours !== "object") return null;
	const todayKey = todayWeekdayKey();
	const todayLabel = WEEKDAY_FULL[WEEKDAY_KEYS.indexOf(todayKey)];

	// Shape A: { mon: { open, close } | "Closed" | null }
	const todaySlot = structuredHours[todayKey];
	if (todaySlot) {
		if (typeof todaySlot === "string") return `${todayLabel} · ${todaySlot}`;
		if (todaySlot.closed === true)     return `${todayLabel} · Closed`;
		if (todaySlot.open && todaySlot.close) return `${todayLabel} · ${todaySlot.open} – ${todaySlot.close}`;
		if (todaySlot.open && !todaySlot.close) return `${todayLabel} · From ${todaySlot.open}`;
	}

	// Shape B: { weekday_text: [...] }
	if (Array.isArray(structuredHours.weekday_text) && structuredHours.weekday_text.length > 0) {
		// Google Places returns Mon..Sun starting Monday.
		const idx = WEEKDAY_KEYS.indexOf(todayKey);
		const line = structuredHours.weekday_text[idx];
		if (typeof line === "string") return line;
	}

	// Shape C: { open_now: bool }
	if (typeof structuredHours.open_now === "boolean") {
		return structuredHours.open_now ? "Open now" : "Closed now";
	}

	return null;
}

// PULLBACK NOTE: Provider Details perfection pass — separate open/closed status row
// OLD: only "Today · 09:00 – 17:00" row when data present
// NEW: when `open_now` is available, prepend a clear status row so the user gets
//      the most important answer ("can this place help me now?") at a glance.
function buildHoursRows(structuredHours) {
	const rows = [];
	const hasOpenNow =
		structuredHours && typeof structuredHours === "object" &&
		typeof structuredHours.open_now === "boolean";
	if (hasOpenNow) {
		rows.push({
			label: "Status",
			value: structuredHours.open_now ? "Open now" : "Closed now",
			icon: structuredHours.open_now ? "radio-button-on-outline" : "radio-button-off-outline",
		});
	}
	const todayLine = formatHoursToday(
		hasOpenNow
			? { ...structuredHours, open_now: undefined }
			: structuredHours,
	);
	if (todayLine) {
		rows.push({ label: "Today", value: todayLine, icon: "time-outline" });
	} else if (!hasOpenNow) {
		rows.push({
			label: "Today",
			value: "Hours not available",
			icon: "time-outline",
			muted: true,
		});
	}
	return rows;
}

// ─── Section row builders ────────────────────────────────────────────────────

// PULLBACK NOTE: Provider Details perfection pass — drop redundant Address row
// OLD: Contact section always led with Address (already shown as place-header subtitle)
// NEW: Phone + Website only; Address shows once in the header. Empty state =
//      a single calm muted row, not a blank card.
function buildContactRows(provider) {
	const rows = [];
	const phone = typeof provider?.phone === "string" ? provider.phone.trim() : "";
	const website = provider?.googleWebsite ?? provider?.website ?? null;
	if (phone) {
		rows.push({
			label: "Phone",
			value: phone,
			icon: "call-outline",
		});
	} else {
		rows.push({
			label: "Phone",
			value: "Phone not listed",
			icon: "call-outline",
			muted: true,
		});
	}
	if (website) {
		rows.push({
			label: "Website",
			value: website,
			icon: "globe-outline",
			valueNumberOfLines: 1,
		});
	} else {
		rows.push({
			label: "Website",
			value: "Website not listed",
			icon: "globe-outline",
			muted: true,
		});
	}
	if (!provider?.address) {
		rows.push({
			label: "Address",
			value: "Address not listed",
			icon: "location-outline",
			muted: true,
			valueNumberOfLines: 2,
		});
	}
	return rows;
}

function buildCapacityRows(provider) {
	const isHospital = provider?.providerType === PROVIDER_TYPES.HOSPITAL;
	if (!isHospital) return null;

	const rows = [];
	const beds = provider?.availableBeds;
	rows.push({
		label: "Available beds",
		value: Number.isFinite(beds) && beds > 0
			? `${beds} bed${beds === 1 ? "" : "s"}`
			: (Number.isFinite(beds) ? "None right now" : "Availability not confirmed"),
		icon: "bed-outline",
		muted: !Number.isFinite(beds),
	});
	const ambs = provider?.ambulances;
	rows.push({
		label: "Ambulances",
		value: Number.isFinite(ambs) && ambs > 0
			? `${ambs} on standby`
			: (Number.isFinite(ambs) ? "None on standby" : "Availability not confirmed"),
		icon: "car-outline",
		muted: !Number.isFinite(ambs),
	});
	const wait = provider?.waitTime;
	rows.push({
		label: "ER wait time",
		value: wait || "Wait time not reported",
		icon: "hourglass-outline",
		muted: !wait,
	});
	const level = provider?.emergencyLevel;
	if (level) {
		rows.push({
			label: "Emergency level",
			value: humanizeKey(String(level)),
			icon: "medkit-outline",
		});
	}
	// PULLBACK NOTE: Provider Details perfection pass — surface availability freshness
	// OLD: lastAvailabilityUpdate field never rendered
	// NEW: calm timestamp row so trust signal is visible (or muted fallback)
	const lastUpdate = provider?.lastAvailabilityUpdate;
	const formattedUpdate = formatRelativeUpdate(lastUpdate);
	rows.push({
		label: "Last updated",
		value: formattedUpdate || "Not reported",
		icon: "refresh-outline",
		muted: !formattedUpdate,
	});
	return rows;
}

function formatRelativeUpdate(input) {
	if (!input) return null;
	const date = input instanceof Date ? input : new Date(input);
	const ts = date.getTime();
	if (!Number.isFinite(ts)) return null;
	const diffMs = Date.now() - ts;
	if (diffMs < 0) return "Just now";
	const min = Math.round(diffMs / 60000);
	if (min < 1) return "Just now";
	if (min < 60) return `${min} min ago`;
	const hr = Math.round(min / 60);
	if (hr < 24) return `${hr} hr ago`;
	const day = Math.round(hr / 24);
	if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
	try {
		return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
	} catch {
		return null;
	}
}

function buildServicesRows(provider) {
	const rows = [];

	// providerServices is a JSONB object (free-form keys). Render top-level keys with truthy values.
	const services = provider?.providerServices;
	if (services && typeof services === "object" && !Array.isArray(services)) {
		const labels = objectValueLabels(services);
		if (labels.length > 0) {
			rows.push({
				label: "Offered",
				value: labels.join(" · "),
				icon: "construct-outline",
				valueNumberOfLines: 3,
			});
		}
	}

	const types = Array.isArray(provider?.serviceTypes) ? provider.serviceTypes.filter(Boolean) : [];
	if (types.length > 0) {
		rows.push({
			label: "Service types",
			value: types.map(humanizeKey).join(" · "),
			icon: "list-outline",
			valueNumberOfLines: 3,
		});
	}

	if (provider?.appointmentRequired === true) {
		rows.push({ label: "Appointments", value: "Booking required", icon: "calendar-outline" });
	}

	const features = Array.isArray(provider?.features)
		? provider.features.filter((item) =>
			typeof item === "string" &&
			item.trim() &&
			!item.toLowerCase().startsWith("demo_owner:")
		)
		: [];
	if (features.length > 0) {
		rows.push({
			label: "Signals",
			value: features.map(humanizeKey).join(" · "),
			icon: "sparkles-outline",
			valueNumberOfLines: 3,
		});
	}

	if (rows.length === 0) {
		rows.push({
			label: "Available care",
			value: "Not listed yet",
			icon: "construct-outline",
			muted: true,
		});
	}
	return rows;
}

// PULLBACK NOTE: Provider Details perfection pass — type-sensitive Specialties
// OLD: Specialties section always rendered (muted fallback) for every type,
//      so pharmacies/labs/radiology centres showed an irrelevant empty card
// NEW: returns null for those provider types when no data exists → section is
//      suppressed upstream instead of producing a blank-feeling card.
const SPECIALTIES_IRRELEVANT_TYPES = new Set([
	PROVIDER_TYPES.PHARMACY,
	PROVIDER_TYPES.LAB,
	PROVIDER_TYPES.RADIOLOGY,
]);

function buildSpecialtiesRows(provider) {
	const rows = [];

	const structured = provider?.providerSpecialties;
	if (structured && typeof structured === "object" && !Array.isArray(structured)) {
		const keys = Object.keys(structured).filter((k) => structured[k]);
		if (keys.length > 0) {
			rows.push({
				label: "Focus areas",
				value: keys.map(humanizeKey).join(" · "),
				icon: "ribbon-outline",
				valueNumberOfLines: 3,
			});
		}
	}

	const flat = Array.isArray(provider?.specialties) ? provider.specialties.filter(Boolean) : [];
	if (flat.length > 0) {
		rows.push({
			label: "Specialties",
			value: flat.map(humanizeKey).join(" · "),
			icon: "medical-outline",
			valueNumberOfLines: 3,
		});
	}

	if (rows.length === 0) {
		if (SPECIALTIES_IRRELEVANT_TYPES.has(provider?.providerType)) return null;
		rows.push({
			label: "Focus areas",
			value: "Not listed yet",
			icon: "ribbon-outline",
			muted: true,
		});
	}
	return rows;
}

function buildProviderInfoRows(provider) {
	const rows = [];
	const pt = provider?.providerType;

	if (pt === PROVIDER_TYPES.LAB) {
		rows.push({
			label: "Report turnaround",
			value: provider?.reportTurnaround || "Turnaround not listed",
			icon: "document-text-outline",
			muted: !provider?.reportTurnaround,
		});
	}
	if (pt === PROVIDER_TYPES.PEDIATRICS) {
		rows.push({
			label: "Age range",
			value: provider?.ageRange || "Age range not listed",
			icon: "people-outline",
			muted: !provider?.ageRange,
		});
	}
	if (pt === PROVIDER_TYPES.MENTAL_HEALTH) {
		rows.push({
			label: "Crisis line",
			value: provider?.crisisLine || "Crisis line not listed",
			icon: "alert-circle-outline",
			muted: !provider?.crisisLine,
		});
	}

	return rows;
}

// PULLBACK NOTE: Provider Details perfection pass — Insurance always honest
// OLD: empty insurance → section suppressed entirely (felt like a data hole)
// NEW: always renders a calm muted fallback so users know it's unconfirmed,
//      never a silent gap. Languages folded in when present.
function buildInsuranceRows(provider) {
	const rows = [];
	const list = Array.isArray(provider?.insuranceAccepted)
		? provider.insuranceAccepted.filter(Boolean)
		: [];
	if (list.length > 0) {
		rows.push({
			label: "Accepted",
			value: list.join(" · "),
			icon: "shield-checkmark-outline",
			valueNumberOfLines: 3,
		});
	} else {
		rows.push({
			label: "Accepted",
			value: "Insurance information unavailable",
			icon: "shield-outline",
			muted: true,
			valueNumberOfLines: 2,
		});
	}
	const languages = Array.isArray(provider?.languages)
		? provider.languages.filter(Boolean)
		: [];
	if (languages.length > 0) {
		rows.push({
			label: "Languages",
			value: languages.map(humanizeKey).join(" · "),
			icon: "language-outline",
			valueNumberOfLines: 2,
		});
	}
	return rows;
}

// PULLBACK NOTE: Provider Details perfection pass — trust always visible
// OLD: Verification + Availability only rendered when affirmatively true
//      → pending/unconfirmed providers showed no trust info at all
// NEW: both rows always present; calm pending/unconfirmed copy when missing.
function buildAboutRows(provider) {
	const rows = [];

	if (typeof provider?.description === "string" && provider.description.trim()) {
		rows.push({
			label: "Overview",
			value: provider.description.trim(),
			icon: "information-circle-outline",
			valueNumberOfLines: 4,
		});
	}

	if (provider?.verified === true) {
		rows.push({
			label: "Verification",
			value: "Verified provider",
			icon: "checkmark-circle-outline",
		});
	} else {
		rows.push({
			label: "Verification",
			value: "Verification pending",
			icon: "checkmark-circle-outline",
			muted: true,
		});
	}

	if (provider?.realTimeSync === true) {
		rows.push({
			label: "Availability",
			value: "Live updates available",
			icon: "pulse-outline",
		});
	} else {
		rows.push({
			label: "Availability",
			value: "Live availability not confirmed",
			icon: "pulse-outline",
			muted: true,
		});
	}

	return rows;
}

// ─── Small text helpers ──────────────────────────────────────────────────────

function humanizeKey(key) {
	if (typeof key !== "string") return String(key ?? "");
	return key
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

function objectValueLabels(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return [];
	return Object.entries(value)
		.filter(([, entryValue]) => {
			if (Array.isArray(entryValue)) return entryValue.length > 0;
			if (entryValue && typeof entryValue === "object") {
				return Object.keys(entryValue).length > 0;
			}
			return Boolean(entryValue);
		})
		.map(([key, entryValue]) => {
			const label = humanizeKey(key);
			if (entryValue === true) return label;
			if (Array.isArray(entryValue)) {
				return `${label}: ${entryValue.map(humanizeKey).join(", ")}`;
			}
			if (typeof entryValue === "string" || typeof entryValue === "number") {
				return `${label}: ${humanizeKey(String(entryValue))}`;
			}
			return label;
		});
}

// ─── Place stats (chip row under the place header — same shape as hospital) ──

function buildPlaceStats(provider) {
	const stats = [];
	const distLabel = buildDistanceLabel(provider?.distanceKm);
	if (distLabel) {
		stats.push({ label: "Distance", value: distLabel.replace(" away", ""), icon: "navigate", iconType: "ionicon", tone: "neutral" });
	}
	const rating = provider?.rating > 0 ? Number(provider.rating).toFixed(1) : null;
	if (rating) {
		stats.push({ label: "Rating", value: rating, icon: "star", iconType: "ionicon", tone: "rating" });
	}
	if (provider?.eta) {
		stats.push({ label: "ETA", value: provider.eta, icon: "time-outline", iconType: "ionicon", tone: "neutral" });
	}
	return stats;
}

function buildVisitSignals(provider) {
	const signals = [];
	const isVerified = provider?.verified === true;
	const hasPhone = typeof provider?.phone === "string" && provider.phone.trim().length > 0;
	const hasCoords = Number.isFinite(provider?.coordinates?.latitude) &&
		Number.isFinite(provider?.coordinates?.longitude);
	const features = Array.isArray(provider?.features) ? provider.features : [];
	const acceptsWalkIns = features.some((item) => String(item).toLowerCase() === "walkins_accepted");

	signals.push({
		key: "access",
		label: "Access",
		value: hasPhone ? "Call ahead" : (provider?.googleWebsite || provider?.website ? "Website" : "Contact not listed"),
		icon: hasPhone ? "call-outline" : "globe-outline",
		tone: hasPhone ? "ready" : "neutral",
	});

	signals.push({
		key: "visit",
		label: "Visit",
		value: provider?.appointmentRequired === true
			? "Booking required"
			: acceptsWalkIns
				? "Walk-ins accepted"
				: "Call to confirm",
		icon: provider?.appointmentRequired === true ? "calendar-outline" : "walk-outline",
		tone: provider?.appointmentRequired === true ? "attention" : acceptsWalkIns ? "ready" : "neutral",
	});

	signals.push({
		key: "coverage",
		label: provider?.isWideProviderFallback ? "Area" : "Nearby",
		value: provider?.isWideProviderFallback ? "Wider area" : (hasCoords ? "Mapped" : "Location pending"),
		icon: provider?.isWideProviderFallback ? "map-outline" : "navigate-outline",
		tone: provider?.isWideProviderFallback ? "attention" : "neutral",
	});

	if (isVerified) {
		signals.push({
			key: "verified",
			label: "Verified",
			value: "Provider",
			icon: "checkmark-circle-outline",
			tone: "ready",
		});
	}

	return signals;
}

function buildHeroBadges(provider, meta) {
	const badges = [];
	if (meta?.label) {
		badges.push({ label: meta.label, icon: meta.iconName ?? "medical-bag", iconType: "material", tone: "neutral" });
	}
	if (provider?.verified === true) {
		badges.push({ label: "Verified", icon: "checkmark-circle", iconType: "ionicon", tone: "verified" });
	}
	if (provider?.status === "available") {
		badges.push({ label: "Open", icon: "ellipse", iconType: "ionicon", tone: "verified" });
	}
	return badges;
}

function buildSummary(provider, meta) {
	const name         = provider?.name ?? "Provider";
	const address      = provider?.address ?? null;
	const categoryLine = meta?.label ?? "Healthcare provider";
	const distLabel    = buildDistanceLabel(provider?.distanceKm);
	const contextLine  = distLabel ?? address ?? categoryLine;
	return { title: name, subtitle: categoryLine, addressLine: address, contextLine };
}

function buildCollapsedAction(provider, meta, onDirections) {
	const hasCoords = Number.isFinite(provider?.coordinates?.latitude);
	return {
		icon: hasCoords ? "directions" : (meta?.iconName ?? "medical-bag"),
		iconType: "material",
		label: hasCoords ? "Directions" : (meta?.label ?? "View"),
		primary: false,
		accessibilityLabel: hasCoords ? "Get directions to provider" : "View provider",
		onPress: hasCoords ? onDirections : undefined,
	};
}

// ─── Model hook ──────────────────────────────────────────────────────────────

export default function useMapProviderDetailModel({
	provider,
	userLocation,
	onClose, // eslint-disable-line no-unused-vars
	detailStatus = null,
}) {
	const { isDarkMode } = useTheme();

	const providerType = provider?.providerType ?? PROVIDER_TYPES.CLINIC;
	const meta         = EXPLORE_CATEGORY_META[providerType] ?? EXPLORE_CATEGORY_META[PROVIDER_TYPES.CLINIC];
	const tintColor    = meta?.markerTint ?? "#64748B";

	const theme = useMemo(() => getProviderDetailTheme(isDarkMode), [isDarkMode]);
	const actionSurface = useMemo(() => getActionSurface(tintColor, isDarkMode), [tintColor, isDarkMode]);
	const actionTint    = useMemo(() => getActionTint(tintColor, isDarkMode), [tintColor, isDarkMode]);

	const phone     = provider?.phone ?? null;
	const website   = provider?.googleWebsite ?? provider?.website ?? null;
	const address   = provider?.address ?? null;
	const hasCoords = Number.isFinite(provider?.coordinates?.latitude) &&
	                  Number.isFinite(provider?.coordinates?.longitude);

	// ─ Action handlers ────────────────────────────────────────────────────────
	const handleCall = useCallback(() => {
		if (!phone) return;
		Linking.openURL(`tel:${phone.replace(/\s+/g, "")}`).catch(() => {});
	}, [phone]);

	const handleDirections = useCallback(() => {
		if (!hasCoords) return;
		const { latitude, longitude } = provider.coordinates;
		Linking.openURL(`https://maps.apple.com/?daddr=${latitude},${longitude}`).catch(() => {
			Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`).catch(() => {});
		});
	}, [hasCoords, provider?.coordinates]);

	const handleWebsite = useCallback(() => {
		if (!website) return;
		const url = website.startsWith("http") ? website : `https://${website}`;
		Linking.openURL(url).catch(() => {});
	}, [website]);

	const handleBookRide = useCallback(() => {
		openRideToProvider(provider, userLocation);
	}, [provider, userLocation]);

	// ─ Action row (4 slots: Call · Ride · Directions · Website) ──────────────
	const placeActions = useMemo(() => {
		const list = [];
		list.push({
			key: "call",
			icon: "phone",
			iconType: "material",
			label: getPrimaryActionLabel(providerType),
			onPress: phone ? handleCall : undefined,
			disabled: !phone,
			primary: !!phone,
			accessibilityLabel: phone ? "Call provider" : "Phone not listed",
		});
		// PULLBACK NOTE: Provider Details — explicit Uber identity for ride CTA
		// OLD: generic `car` (MaterialCommunityIcons) — felt like a stock taxi
		// NEW: FontAwesome5 brand `uber` — matches the actual deep-link target
		//      wired in utils/bookRideUtils.js (Uber universal/native URLs).
		list.push({
			key: "ride",
			icon: "uber",
			iconType: "fa5brand",
			label: "Book ride",
			onPress: hasCoords ? handleBookRide : undefined,
			disabled: !hasCoords,
			primary: !phone && hasCoords,
			accessibilityLabel: hasCoords ? "Book an Uber to this provider" : "Location unavailable",
		});
		list.push({
			key: "directions",
			icon: "directions",
			iconType: "material",
			label: "Directions",
			onPress: hasCoords ? handleDirections : undefined,
			disabled: !hasCoords,
			primary: false,
			accessibilityLabel: hasCoords ? "Get directions" : "Location unavailable",
		});
		list.push({
			key: "website",
			icon: "web",
			iconType: "material",
			label: "Website",
			onPress: website ? handleWebsite : undefined,
			disabled: !website,
			primary: false,
			accessibilityLabel: website ? "Open website" : "Website not listed",
		});
		return list;
	}, [phone, hasCoords, website, providerType, handleCall, handleBookRide, handleDirections, handleWebsite]);

	// ─ Hero / header / stats / collapsed slot ─────────────────────────────────
	const summary    = useMemo(() => buildSummary(provider, meta), [provider, meta]);
	const heroBadges = useMemo(() => buildHeroBadges(provider, meta), [provider, meta]);
	const placeStats = useMemo(() => buildPlaceStats(provider), [provider]);
	const visitSignals = useMemo(() => buildVisitSignals(provider), [provider]);
	const collapsedAction = useMemo(
		() => buildCollapsedAction(provider, meta, handleDirections),
		[provider, meta, handleDirections],
	);
	const collapsedDistanceLabel = useMemo(
		() => buildDistanceLabel(provider?.distanceKm) ?? (address ?? meta?.label ?? "Nearby"),
		[provider?.distanceKm, address, meta],
	);

	// ─ Info sections (each maps directly to a TrackingDetailsCard) ───────────
	// PULLBACK NOTE: Provider Details perfection pass — reorder + suppress
	// OLD: Contact → Hours → Capacity → Services → Specialties → Care → Insurance → About
	// NEW: Hours → Capacity → Services → Specialties → Care → Insurance → About → Contact
	//      (matches spec hierarchy: time-sensitive first, contact last; address
	//       lives in the place-header subtitle so Contact is reference, not lead).
	//      Specialties suppressed for pharmacy/lab/radiology when truly empty.
	const infoSections = useMemo(() => {
		const sections = [];

		sections.push({
			key: "hours",
			headerLabel: "Hours",
			rows: buildHoursRows(provider?.structuredHours),
			collapsible: false,
		});

		const capacityRows = buildCapacityRows(provider);
		if (capacityRows) {
			sections.push({
				key: "capacity",
				headerLabel: "Capacity",
				rows: capacityRows,
				collapsible: false,
			});
		}

		sections.push({
			key: "services",
			headerLabel: "Services",
			rows: buildServicesRows(provider),
			collapsible: false,
		});

		const specialtiesRows = buildSpecialtiesRows(provider);
		if (specialtiesRows) {
			sections.push({
				key: "specialties",
				headerLabel: "Specialties",
				rows: specialtiesRows,
				collapsible: false,
			});
		}

		const providerInfoRows = buildProviderInfoRows(provider);
		if (providerInfoRows.length > 0) {
			sections.push({
				key: "providerInfo",
				headerLabel: "Care details",
				rows: providerInfoRows,
				collapsible: false,
				defaultCollapsed: false,
			});
		}

		sections.push({
			key: "insurance",
			headerLabel: "Insurance & languages",
			rows: buildInsuranceRows(provider),
			collapsible: true,
			defaultCollapsed: true,
		});

		sections.push({
			key: "about",
			headerLabel: "About",
			rows: buildAboutRows(provider),
			collapsible: true,
			defaultCollapsed: true,
		});

		sections.push({
			key: "contact",
			headerLabel: "Contact",
			rows: buildContactRows(provider),
			collapsible: true,
			defaultCollapsed: true,
		});

		return sections;
	}, [provider]);

	return {
		// identity
		provider,
		providerType,
		meta,
		tintColor,
		// theme tokens (neutral)
		isDarkMode,
		titleColor:           theme.titleColor,
		subtleColor:          theme.subtleColor,
		mutedColor:           theme.mutedColor,
		cardSurface:          theme.cardSurface,
		rowSurface:           theme.rowSurface,
		requestSurfaceColor:  theme.requestSurfaceColor,
		detailGradientColors: theme.detailGradientColors,
		detailCardRadius:     theme.detailCardRadius,
		actionSurface,
		actionTint,
		// hospital chassis
		summary,
		heroBadges,
		placeActions,
		placeStats,
		visitSignals,
		// no-blank-state info sections (consumed by TrackingDetailsCard)
		infoSections,
		// collapsed slot
		collapsedAction,
		collapsedDistanceLabel,
		// flags / convenience
		hasCoords,
		phone,
		address,
		website,
		detailStatus,
	};
}

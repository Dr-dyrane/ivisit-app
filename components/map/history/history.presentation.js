// history.presentation.js
// Formatters + resolvers for /map history surfaces.
//
// Rule: presentation formatters live here. *.jsx files only compose structure.
// Mirrors components/map/views/tracking/mapTracking.presentation.js.

import {
	HISTORY_DETAILS_COPY,
	HISTORY_FILTER_KEYS,
	HISTORY_REQUEST_TYPES,
} from "./history.content";

const VISIT_ICON = Object.freeze({ library: "ion", name: "calendar" });
const AMBULANCE_ICON = Object.freeze({ library: "material", name: "ambulance" });
const BED_ICON = Object.freeze({ library: "material", name: "bed" });
const GENERIC_HISTORY_LABELS = new Set([
	"",
	"emergency",
	"ambulance",
	"transport",
	"request",
	"ride",
	"bed",
	"room",
	"reservation",
	"booking",
	"visit",
	"appointment",
]);

const toText = (value) => (typeof value === "string" ? value.trim() : "");

const toTitleCase = (value) =>
	toText(value)
		.toLowerCase()
		.replace(/[_-]+/g, " ")
		.replace(/\b\w/g, (match) => match.toUpperCase());

const readLabelValue = (value) => {
	if (typeof value === "string") return value.trim();
	if (value && typeof value === "object") {
		return (
			toText(value.title) ||
			toText(value.label) ||
			toText(value.name) ||
			toText(value.service_name) ||
			toText(value.room_type) ||
			""
		);
	}
	return "";
};

/**
 * Resolve the icon descriptor (library + name) for a history request type.
 * Callers render with MaterialCommunityIcons or Ionicons based on `library`.
 */
export function resolveHistoryRequestIcon(requestType) {
	switch (requestType) {
		case HISTORY_REQUEST_TYPES.AMBULANCE:
			return AMBULANCE_ICON;
		case HISTORY_REQUEST_TYPES.BED:
			return BED_ICON;
		default:
			return VISIT_ICON;
	}
}

/**
 * Resolve the details-modal title for a given request type.
 * Transport request → "Transport details". Bed reservation → "Reservation details".
 * Clinic / telehealth visit → "Visit details". Unknown → generic "Care details".
 */
export function resolveHistoryDetailsTitle(requestType) {
	return (
		HISTORY_DETAILS_COPY.titleByType[requestType] ||
		HISTORY_DETAILS_COPY.fallbackTitle
	);
}

/**
 * Resolve the clinician-label for the detail row ("Doctor" vs "Care team").
 * Mirrors the legacy behavior but centralizes the rule.
 */
export function resolveClinicianLabel(historyItem) {
	if (!historyItem) return HISTORY_DETAILS_COPY.detailLabels.fallbackClinician;
	if (historyItem.doctorName) {
		return historyItem.actorRole || HISTORY_DETAILS_COPY.detailLabels.clinician;
	}
	return historyItem.actorRole || HISTORY_DETAILS_COPY.detailLabels.fallbackClinician;
}

/**
 * Format a rating value for display ("4.5 / 5") — null-safe.
 */
export function resolveRatingLabel(rating) {
	const numeric = Number(rating);
	if (!Number.isFinite(numeric)) return null;
	return `${numeric.toFixed(1)} ${HISTORY_DETAILS_COPY.ratingSuffix}`;
}

/**
 * Format the "When" detail row by combining date + time labels with a separator.
 */
export function resolveWhenValue(historyItem) {
	if (!historyItem) return null;
	return (
		[historyItem.dateLabel, historyItem.timeLabel]
			.filter((part) => typeof part === "string" && part.trim())
			.join(" / ") || null
	);
}

/**
 * Resolve the preferred "type" label — the display name of the visit/request kind.
 * Null when no suitable label is available.
 */
export function resolveTypeValue(historyItem) {
	if (!historyItem) return null;
	return historyItem.visitTypeLabel || historyItem.requestTypeLabel || null;
}

export function resolveHistoryServiceLabel({
	requestType,
	value,
	fallbackLabel = null,
}) {
	const raw = readLabelValue(value);
	const normalized = raw.toLowerCase();

	if (requestType === HISTORY_REQUEST_TYPES.AMBULANCE) {
		if (!normalized) return fallbackLabel || null;
		if (normalized.includes("bls") || normalized.includes("basic")) return "Everyday care";
		if (normalized.includes("als") || normalized.includes("advanced")) return "Extra support";
		if (
			normalized.includes("icu") ||
			normalized.includes("critical") ||
			normalized.includes("transfer")
		) {
			return "Hospital transfer";
		}
		if (GENERIC_HISTORY_LABELS.has(normalized)) {
			return fallbackLabel || null;
		}
		return toTitleCase(raw);
	}

	if (requestType === HISTORY_REQUEST_TYPES.BED) {
		if (!normalized) return fallbackLabel || null;
		if (
			normalized === "standard" ||
			normalized.includes("general") ||
			normalized.includes("ward")
		) {
			return "General ward";
		}
		if (normalized.includes("private")) return "Private room";
		if (
			normalized.includes("icu") ||
			normalized.includes("critical") ||
			normalized.includes("high-support") ||
			normalized.includes("high support")
		) {
			return "High-support care";
		}
		if (GENERIC_HISTORY_LABELS.has(normalized)) {
			return fallbackLabel || null;
		}
		return toTitleCase(raw);
	}

	if (!normalized) return fallbackLabel || null;
	if (GENERIC_HISTORY_LABELS.has(normalized)) {
		return fallbackLabel || null;
	}
	return toTitleCase(raw);
}

/**
 * Resolve the primary action ({ label, onPress }) for a details surface.
 * Rule:
 *  1. If the request can be rated and onRateVisit is provided, offer Rate.
 *  2. If the primary action is a resume variant, offer Resume with the right label.
 *  3. Otherwise null (no primary CTA).
 */
export function resolveDetailsPrimaryAction({ historyItem, onRateVisit, onResume }) {
	if (!historyItem) return null;
	if (historyItem.canRate && typeof onRateVisit === "function") {
		return { label: HISTORY_DETAILS_COPY.actionLabels.rateVisit, onPress: onRateVisit };
	}
	const primary = historyItem.primaryAction;
	if (primary === "resume_tracking" && typeof onResume === "function") {
		return {
			label: HISTORY_DETAILS_COPY.actionLabels.resumeTracking,
			onPress: onResume,
		};
	}
	if (primary === "resume_request" && typeof onResume === "function") {
		return {
			label: HISTORY_DETAILS_COPY.actionLabels.resumeRequest,
			onPress: onResume,
		};
	}
	return null;
}

/**
 * Resolve the facility / location line (facilityAddress or secondary address).
 */
export function resolveFacilityLine(historyItem) {
	if (!historyItem) return null;
	return (
		historyItem.facilityAddress ||
		historyItem.hospitalAddress ||
		null
	);
}

// ---------- Filter helpers (legacy VisitsScreen parity) ----------

/**
 * Filter a flat list of history items by a UI filter key.
 * Keys are defined in HISTORY_FILTER_KEYS. Unknown keys fall back to `all`.
 *
 * Status mapping (per VISITS_REQUEST_HISTORY_PLAN §7):
 *   - active     → "active" | "rating_pending"
 *   - upcoming   → "confirmed" | "pending"
 *   - completed  → "completed"
 *   - cancelled  → "cancelled" | "failed" | "expired"
 *   - all        → everything
 */
export function filterHistoryItemsByKey(items, filterKey) {
	if (!Array.isArray(items) || items.length === 0) return [];
	switch (filterKey) {
		case HISTORY_FILTER_KEYS.ACTIVE:
			return items.filter(
				(item) => item?.status === "active" || item?.status === "rating_pending",
			);
		case HISTORY_FILTER_KEYS.UPCOMING:
			return items.filter(
				(item) => item?.status === "confirmed" || item?.status === "pending",
			);
		case HISTORY_FILTER_KEYS.COMPLETED:
			return items.filter((item) => item?.status === "completed");
		case HISTORY_FILTER_KEYS.CANCELLED:
			return items.filter((item) =>
				item?.status === "cancelled" ||
				item?.status === "failed" ||
				item?.status === "expired",
			);
		case HISTORY_FILTER_KEYS.ALL:
		default:
			return items;
	}
}

/**
 * Build filter counts for badge display on FilterChips.
 * Returns `{ all, active, upcoming, completed, cancelled }`.
 */
export function buildHistoryFilterCounts(items) {
	return {
		[HISTORY_FILTER_KEYS.ALL]: Array.isArray(items) ? items.length : 0,
		[HISTORY_FILTER_KEYS.ACTIVE]: filterHistoryItemsByKey(items, HISTORY_FILTER_KEYS.ACTIVE).length,
		[HISTORY_FILTER_KEYS.UPCOMING]: filterHistoryItemsByKey(items, HISTORY_FILTER_KEYS.UPCOMING).length,
		[HISTORY_FILTER_KEYS.COMPLETED]: filterHistoryItemsByKey(items, HISTORY_FILTER_KEYS.COMPLETED).length,
		[HISTORY_FILTER_KEYS.CANCELLED]: filterHistoryItemsByKey(items, HISTORY_FILTER_KEYS.CANCELLED).length,
	};
}

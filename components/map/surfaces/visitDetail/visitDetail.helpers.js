// components/map/surfaces/visitDetail/visitDetail.helpers.js
//
// PULLBACK NOTE: VD-D (VD-8) — extracted from useMapVisitDetailModel.js.
// Pure formatting utilities with no React dependencies.

export const REQUEST_TYPES = Object.freeze({
	AMBULANCE: "ambulance",
	BED: "bed",
	VISIT: "visit",
});

export const toText = (value) => (typeof value === "string" ? value.trim() : "");

export const toFiniteNumber = (value) => {
	if (typeof value === "string") {
		const normalized = value.replace(/[^0-9.-]/g, "");
		if (!normalized) return null;
		const numeric = Number(normalized);
		return Number.isFinite(numeric) ? numeric : null;
	}
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
};

export const normalizeRatingValue = (value) => {
	const numeric = toFiniteNumber(value);
	if (numeric == null) return 0;
	return Math.max(0, Math.min(5, numeric));
};

export const formatRatingDisplay = (value) => normalizeRatingValue(value).toFixed(1);

export const pickText = (...values) => {
	for (const value of values) {
		const text = toText(value);
		if (text) return text;
	}
	return null;
};

export const uniqueTextList = (values) => {
	const seen = new Set();
	return (Array.isArray(values) ? values : []).filter((value) => {
		const text = toText(value);
		if (!text) return false;
		const key = text.toLowerCase();
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
};

export const joinParts = (parts, separator = " / ") => {
	const resolved = (Array.isArray(parts) ? parts : [])
		.map((part) => toText(part))
		.filter(Boolean);
	return resolved.length ? resolved.join(separator) : null;
};

export const withoutDuplicates = (...values) => uniqueTextList(values);

export const toTitleCase = (value) => {
	const normalized = toText(value).replace(/[_-]+/g, " ");
	if (!normalized) return null;
	return normalized.replace(/\b\w/g, (match) => match.toUpperCase());
};

export const toCurrencyLabel = (value) => {
	const numeric = toFiniteNumber(value);
	if (numeric != null) return `$${numeric.toFixed(2)}`;
	const text = toText(value);
	return text || null;
};

// PULLBACK NOTE: Add URL validation to prevent network errors
// OLD: Return { uri: text } for any non-empty string
// NEW: Only return { uri: ... } for valid URLs
export const isValidUrl = (string) => {
	if (typeof string !== "string" || string.trim().length === 0) return false;
	try {
		const url = new URL(string.trim());
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
};

export const resolveMediaSource = (...values) => {
	for (const value of values) {
		if (typeof value === "number") return value;
		if (value && typeof value === "object" && value.uri) return value;
		const text = toText(value);
		if (text && isValidUrl(text)) return { uri: text };
	}
	return null;
};

export const readRawField = (raw, ...keys) => {
	for (const key of keys) {
		if (raw && raw[key] != null) return raw[key];
	}
	return null;
};

// Render a timestamp as a friendly, glanceable label for the mid-snap stats
// row. Same-day buckets read as "Today / Yesterday / Tomorrow, 10:30 AM";
// near-term days collapse to "in 3 days" / "3 days ago"; everything else
// drops back to a short locale date with time.
export const formatHumanWhen = (ms) => {
	const numeric = Number(ms);
	if (!Number.isFinite(numeric)) return null;
	const date = new Date(numeric);
	if (Number.isNaN(date.getTime())) return null;
	const now = new Date();
	const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
	const dayMs = 24 * 60 * 60 * 1000;
	const todayStart = startOf(now);
	const targetStart = startOf(date);
	const dayDiff = Math.round((targetStart - todayStart) / dayMs);
	let timePart = null;
	try {
		timePart = new Intl.DateTimeFormat(undefined, {
			hour: "numeric",
			minute: "2-digit",
		}).format(date);
	} catch (_error) {
		timePart = null;
	}
	if (dayDiff === 0) return timePart ? `Today, ${timePart}` : "Today";
	if (dayDiff === -1) return timePart ? `Yesterday, ${timePart}` : "Yesterday";
	if (dayDiff === 1) return timePart ? `Tomorrow, ${timePart}` : "Tomorrow";
	if (dayDiff < 0 && dayDiff >= -6) return `${Math.abs(dayDiff)} days ago`;
	if (dayDiff > 0 && dayDiff <= 6) return `In ${dayDiff} days`;
	try {
		const sameYear = date.getFullYear() === now.getFullYear();
		const datePart = new Intl.DateTimeFormat(undefined, {
			weekday: "short",
			day: "numeric",
			month: "short",
			...(sameYear ? {} : { year: "numeric" }),
		}).format(date);
		return timePart ? `${datePart}, ${timePart}` : datePart;
	} catch (_error) {
		return date.toLocaleString();
	}
};

export const resolveJourneyProgress = (status) => {
	switch (String(status || "").toLowerCase()) {
		case "completed":
		case "rating_pending":
			return 1;
		case "active":
			return 0.72;
		case "confirmed":
			return 0.38;
		case "pending":
			return 0.2;
		default:
			return 0.56;
	}
};

export const filterMeaningfulRows = (rows) =>
	rows.filter((row) => {
		if (!row) return false;
		if (row.kind === "rating") {
			return true;
		}
		return row.value != null && String(row.value).trim();
	});

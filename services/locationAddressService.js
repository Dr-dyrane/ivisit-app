import { calculateAddressQuality } from "../utils/addressQualityValidator";
import { normalizeLocationCoordinates } from "../utils/locationHelpers";

export const SAVED_ADDRESS_CATEGORIES = Object.freeze({
	HOME: "home",
	WORK: "work",
	FAMILY: "family",
	SCHOOL: "school",
	PHARMACY: "pharmacy",
	CARE: "care",
	OTHER: "other",
	RECENT: "recent",
	CUSTOM: "custom",
});

const CATEGORY_META = Object.freeze({
	home: { label: "Home", iconName: "home-outline", colorKey: "home" },
	work: { label: "Work", iconName: "briefcase-outline", colorKey: "work" },
	family: { label: "Family", iconName: "people-outline", colorKey: "family" },
	school: { label: "School", iconName: "school-outline", colorKey: "school" },
	pharmacy: { label: "Pharmacy", iconName: "medkit-outline", colorKey: "pharmacy" },
	care: { label: "Care", iconName: "medical-outline", colorKey: "care" },
	other: { label: "Saved place", iconName: "bookmark-outline", colorKey: "other" },
	recent: { label: "Recent pickup", iconName: "time-outline", colorKey: "recent" },
	custom: { label: "Saved place", iconName: "location-outline", colorKey: "other" },
});

const PLACE_CONTEXT_SOURCES = new Set(["search", "manual", "saved", "recent", "visit", "pin"]);

export function normalizeCountryCode(value) {
	if (typeof value !== "string") return null;
	const normalized = value.trim().toUpperCase();
	return normalized || null;
}

export function normalizeAddressCategory(value, fallback = SAVED_ADDRESS_CATEGORIES.OTHER) {
	const normalized = String(value || "").trim().toLowerCase();
	if (normalized === "home") return SAVED_ADDRESS_CATEGORIES.HOME;
	if (normalized === "work") return SAVED_ADDRESS_CATEGORIES.WORK;
	if (normalized === "family") return SAVED_ADDRESS_CATEGORIES.FAMILY;
	if (normalized === "school") return SAVED_ADDRESS_CATEGORIES.SCHOOL;
	if (normalized === "pharmacy") return SAVED_ADDRESS_CATEGORIES.PHARMACY;
	if (normalized === "care") return SAVED_ADDRESS_CATEGORIES.CARE;
	if (normalized === "recent") return SAVED_ADDRESS_CATEGORIES.RECENT;
	if (normalized === "custom") return SAVED_ADDRESS_CATEGORIES.CUSTOM;
	if (normalized === "other") return SAVED_ADDRESS_CATEGORIES.OTHER;
	return fallback;
}

export function getSavedAddressCategoryMeta(category) {
	return CATEGORY_META[normalizeAddressCategory(category)] || CATEGORY_META.other;
}

export function getSavedAddressDisplayLabel(location = {}, fallback = "Saved place") {
	const category = normalizeAddressCategory(location.category || location.label, null);
	const rawLabel = String(location.label || "").trim();
	const isSystemLabel = ["home", "work", "recent", "custom", "other"].includes(
		rawLabel.toLowerCase(),
	);
	if (rawLabel && !isSystemLabel) return rawLabel;
	if (category) return getSavedAddressCategoryMeta(category).label;
	return fallback;
}

export function normalizeAddressQuality(address, { source, context } = {}) {
	const quality = calculateAddressQuality(address);
	const normalizedSource = String(source || "").trim().toLowerCase();
	const normalizedContext = String(context || "").trim().toLowerCase();
	const isFlexiblePlace =
		PLACE_CONTEXT_SOURCES.has(normalizedSource) ||
		["manual", "candidate", "saved"].includes(normalizedContext);

	if (quality.isValid || !isFlexiblePlace) {
		return quality;
	}

	const text = String(address || "").trim();
	const wordCount = text.split(/\s+/).filter(Boolean).length;
	const hasUsStreetOnlyIssues = quality.issues.every((issue) =>
		["Missing street type (St, Ave, Rd, etc.)", "Missing street number"].includes(issue),
	);

	if (text.length >= 5 && wordCount >= 1 && hasUsStreetOnlyIssues) {
		return {
			...quality,
			score: Math.max(quality.score, 65),
			isValid: true,
			issues: quality.issues.map((issue) => `${issue} (optional for place/landmark)`),
		};
	}

	return quality;
}

export function normalizeAddressCandidate(payload = {}, options = {}) {
	const coords =
		normalizeLocationCoordinates(payload.coords) ||
		normalizeLocationCoordinates(payload.location) ||
		normalizeLocationCoordinates({
			latitude: payload.latitude,
			longitude: payload.longitude,
		});
	if (!coords) return null;

	const label = String(
		payload.label ||
			payload.primaryText ||
			payload.name ||
			options.fallbackLabel ||
			"Selected location",
	).trim();
	const address = String(
		payload.address ||
			payload.formattedAddress ||
			payload.secondaryText ||
			payload.description ||
			label,
	).trim();

	return {
		id: payload.id || null,
		source: payload.source || options.source || "search",
		label: label || "Selected location",
		address,
		coords,
		countryCode: normalizeCountryCode(payload.countryCode),
		category: payload.category || null,
		confidence: payload.confidence || options.confidence || "medium",
		unit: payload.unit || null,
		responderNote: payload.responderNote || null,
		placeId: payload.placeId || payload.place_id || null,
		provider: payload.provider || payload.sourceProvider || null,
		pendingSaveCategory: payload.pendingSaveCategory || null,
		pendingPlaceLabel: payload.pendingSaveCategory || payload.pendingPlaceLabel || null,
	};
}

export function normalizeSavedAddress(input = {}, options = {}) {
	const candidate = normalizeAddressCandidate(input, {
		source: input.source || "saved",
		fallbackLabel: input.label || input.category || "Saved place",
		confidence: input.confidence || "high",
	});
	if (!candidate) return null;

	const now = Date.now();
	const category = normalizeAddressCategory(
		input.category || input.pendingSaveCategory || input.label,
		SAVED_ADDRESS_CATEGORIES.OTHER,
	);
	const meta = getSavedAddressCategoryMeta(category);
	const createdAt = Number(input.createdAt || input.created_at || now);
	const updatedAt = Number(input.updatedAt || input.updated_at || createdAt || now);
	const label = String(input.label || "").trim() || meta.label;
	const quality =
		input.quality && typeof input.quality === "object"
			? input.quality
			: normalizeAddressQuality(candidate.address, {
					source: candidate.source,
					context: "saved",
				});

	return {
		...input,
		id:
			input.id ||
			`loc_${now}_${Math.random().toString(36).slice(2, 11)}`,
		ownerUserId: input.ownerUserId || input.userId || options.ownerUserId || "guest",
		category,
		label,
		address: candidate.address,
		coords: candidate.coords,
		latitude: candidate.coords.latitude,
		longitude: candidate.coords.longitude,
		countryCode: candidate.countryCode,
		unit: candidate.unit,
		responderNote: candidate.responderNote,
		colorKey: input.colorKey || meta.colorKey,
		iconName: input.iconName || meta.iconName,
		provider: candidate.provider || input.provider || null,
		placeId: candidate.placeId,
		quality,
		usage: {
			lastUsedAt: input.usage?.lastUsedAt || input.lastUsedAt || null,
			useCount: Number(input.usage?.useCount || input.useCount || 0),
		},
		sync: {
			status: input.sync?.status || input.syncStatus || "local",
			error: input.sync?.error || null,
			remoteId: input.sync?.remoteId || input.remoteId || null,
		},
		createdAt: Number.isFinite(createdAt) ? createdAt : now,
		updatedAt: Number.isFinite(updatedAt) ? updatedAt : now,
	};
}

export function mapCandidateToPickupPayload(candidate) {
	const normalized = normalizeAddressCandidate(candidate);
	if (!normalized) return null;

	return {
		primaryText: normalized.label,
		secondaryText: normalized.address,
		formattedAddress: normalized.address,
		location: normalized.coords,
		countryCode: normalized.countryCode,
		source: normalized.source,
		confidence: normalized.confidence,
		unit: normalized.unit,
		responderNote: normalized.responderNote,
		savedAddressId: normalized.id || null,
	};
}

export function mapCandidateToSavedAddressPayload(candidate, options = {}) {
	const normalized = normalizeAddressCandidate(candidate, {
		source: candidate?.source || "saved",
	});
	if (!normalized) return null;

	return normalizeSavedAddress(
		{
			...normalized,
			label: options.label || normalized.label,
			category: options.category || normalized.pendingSaveCategory || normalized.label,
			source: normalized.source,
		},
		options,
	);
}

export function getSavedAddressKey(location = {}) {
	const category = normalizeAddressCategory(location.category || location.label, null);
	return category === SAVED_ADDRESS_CATEGORIES.HOME || category === SAVED_ADDRESS_CATEGORIES.WORK
		? category
		: null;
}

export function isSameSavedAddress(left = {}, right = {}) {
	const leftAddress = String(left.address || "").trim().toLowerCase();
	const rightAddress = String(right.address || "").trim().toLowerCase();
	if (leftAddress && rightAddress && leftAddress === rightAddress) return true;

	const leftCoords = normalizeLocationCoordinates(left.coords) || normalizeLocationCoordinates(left);
	const rightCoords = normalizeLocationCoordinates(right.coords) || normalizeLocationCoordinates(right);
	if (!leftCoords || !rightCoords) return false;

	return (
		Math.abs(leftCoords.latitude - rightCoords.latitude) < 0.00001 &&
		Math.abs(leftCoords.longitude - rightCoords.longitude) < 0.00001
	);
}

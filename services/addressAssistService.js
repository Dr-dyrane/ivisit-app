import mapboxService from "./mapboxService";

// PULLBACK NOTE: [LS-3]
// OLD: mapboxService.suggestAddresses() called directly from MapLocationIntentStageBase
//      inside a useEffect + manual timer ref (defect class 2.18).
// NEW: All provider API calls for location assistance go through this service.
//      Components call addressAssistService methods only. Provider swap stays here.

const DEBOUNCE_MS = 320;
const MIN_QUERY_LENGTH = 2;

function buildContextualQuery(query, { districtArea = "", city = "", adminArea = "", country = "" } = {}) {
	const context = [districtArea, city, adminArea, country].filter(Boolean).join(" ");
	return context ? `${query.trim()} ${context}` : query.trim();
}

export async function suggestRegions({ query, countryCode, proximity, context = {} } = {}) {
	if (!query || query.trim().length < MIN_QUERY_LENGTH) return [];
	try {
		const results = await mapboxService.suggestAddresses({
			query: buildContextualQuery(query, context),
			proximity: proximity || null,
			countryCode: countryCode || undefined,
			types: ["region", "district"],
		});
		return Array.isArray(results) ? results : [];
	} catch {
		return [];
	}
}

export async function suggestCities({ query, countryCode, proximity, context = {} } = {}) {
	if (!query || query.trim().length < MIN_QUERY_LENGTH) return [];
	try {
		const results = await mapboxService.suggestAddresses({
			query: buildContextualQuery(query, context),
			proximity: proximity || null,
			countryCode: countryCode || undefined,
			types: ["place", "region"],
		});
		return Array.isArray(results) ? results : [];
	} catch {
		return [];
	}
}

export async function suggestStreetsOrPlaces({ query, countryCode, proximity, context = {} } = {}) {
	if (!query || query.trim().length < MIN_QUERY_LENGTH) return [];
	try {
		const results = await mapboxService.suggestAddresses({
			query: buildContextualQuery(query, context),
			proximity: proximity || null,
			countryCode: countryCode || undefined,
			types: ["address", "poi"],
		});
		return Array.isArray(results) ? results : [];
	} catch {
		return [];
	}
}

// Generic suggest for a manual step's mapboxTypes field.
export async function suggestForStep({ query, mapboxTypes, countryCode, proximity, context = {} } = {}) {
	if (!query || query.trim().length < MIN_QUERY_LENGTH) return [];
	try {
		const results = await mapboxService.suggestAddresses({
			query: buildContextualQuery(query, context),
			proximity: proximity || null,
			countryCode: countryCode || undefined,
			types: mapboxTypes || undefined,
		});
		return Array.isArray(results) ? results : [];
	} catch {
		return [];
	}
}

export async function resolveManualDraft(address, { proximity, countryCode } = {}) {
	if (!address || !address.trim()) return null;
	try {
		// PULLBACK NOTE: [LS-9] Gap fix — pass proximity for better regional bias;
		// surface relevance score so callers can distinguish strong vs weak geocode results.
		const geocoded = await mapboxService.geocodeAddress(address, {
			proximity: proximity || null,
			countryCode: countryCode || null,
		});
		const latitude = Number(geocoded?.latitude);
		const longitude = Number(geocoded?.longitude);
		if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
		// relevance: 0.0–1.0 from Mapbox. <0.4 = weak match (no exact street found).
		// Nominatim results carry no relevance score — treat as 0.5 (medium confidence).
		const relevance = typeof geocoded?.relevance === "number"
			? geocoded.relevance
			: geocoded?.source === "openstreetmap" ? 0.5 : 1.0;
		return {
			latitude,
			longitude,
			formattedAddress: geocoded?.formatted_address || address,
			countryCode: geocoded?.countryCode || countryCode || null,
			relevance,
			source: geocoded?.source || "mapbox",
		};
	} catch {
		return null;
	}
}

export { DEBOUNCE_MS, MIN_QUERY_LENGTH };

const addressAssistService = {
	suggestRegions,
	suggestCities,
	suggestStreetsOrPlaces,
	suggestForStep,
	resolveManualDraft,
};

export default addressAssistService;

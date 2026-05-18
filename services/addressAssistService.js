import googleLocationService from "./googleLocationService";

// PULLBACK NOTE: [LS-3]
// OLD: provider suggest calls lived in UI components.
//      inside a useEffect + manual timer ref (defect class 2.18).
// NEW: All provider API calls for location assistance go through this service.
//      The map API service layer chooses Google, Mapbox, or OpenStreetMap.

const DEBOUNCE_MS = 320;
const MIN_QUERY_LENGTH = 2;

function buildContextualQuery(query, { districtArea = "", city = "", adminArea = "", country = "" } = {}) {
	const baseQuery = String(query || "").trim();
	const normalizedBase = baseQuery.toLowerCase();
	const context = [districtArea, city, adminArea, country]
		.map((part) => String(part || "").trim())
		.filter((part) => part && part.toLowerCase() !== normalizedBase);
	return [baseQuery, ...context].filter(Boolean).join(", ");
}

export async function suggestRegions({ query, countryCode, proximity, context = {} } = {}) {
	if (!query || query.trim().length < MIN_QUERY_LENGTH) return [];
	try {
		const results = await googleLocationService.suggestAddresses({
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
		const results = await googleLocationService.suggestAddresses({
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
		const results = await googleLocationService.suggestAddresses({
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

// Generic suggest for a manual step's provider-type hint.
export async function suggestForStep({ query, mapboxTypes, countryCode, proximity, context = {} } = {}) {
	if (!query || query.trim().length < MIN_QUERY_LENGTH) return [];
	try {
		const results = await googleLocationService.suggestAddresses({
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
		// PULLBACK NOTE: [LS-9] Gap fix - pass proximity for better regional bias;
		// surface relevance score so callers can distinguish strong vs weak geocode results.
		const geocoded = await googleLocationService.geocodeAddress(address, {
			proximity: proximity || null,
			countryCode: countryCode || null,
		});
		const latitude = Number(geocoded?.latitude);
		const longitude = Number(geocoded?.longitude);
		if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
		// relevance: 0.0-1.0 from provider. <0.4 = weak match (no exact street found).
		// Fallback providers may carry no relevance score - treat as 0.5 (medium confidence).
		const relevance = typeof geocoded?.relevance === "number"
			? geocoded.relevance
			: ["openstreetmap", "mapbox"].includes(geocoded?.source) ? 0.5 : 1.0;
		return {
			latitude,
			longitude,
			formattedAddress: geocoded?.formatted_address || address,
			countryCode: geocoded?.countryCode || countryCode || null,
			relevance,
			source: geocoded?.source || "google",
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

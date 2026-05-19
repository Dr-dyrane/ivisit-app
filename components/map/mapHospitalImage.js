const DEFAULT_HOSPITAL_HERO_IMAGE = require("../../assets/features/emergency.png");
const remoteImageSourceCache = new Map();
const prefetchedRemoteImageUris = new Set();
const MAX_REMOTE_IMAGE_SOURCE_CACHE_SIZE = 120;
const HOSPITAL_HERO_IMAGE_SOURCES = new Set([
	"hospital_upload",
	"provider_photo",
	"provider_image",
	"official_website_image",
	"seed_image",
	"deterministic_fallback",
]);

// PULLBACK NOTE: Add URL validation utility to prevent network errors
// OLD: No validation, malformed URLs passed through to Image component
// NEW: Validate protocol, format, and structure before caching
export function isStableRemoteImageUrl(string) {
	if (typeof string !== "string" || string.trim().length === 0) return false;
	try {
		const url = new URL(string.trim());
		if (url.protocol !== "http:" && url.protocol !== "https:") return false;
		return url.hostname.toLowerCase() !== "logo.clearbit.com";
	} catch {
		return false;
	}
}

function toStringList(value) {
	return Array.isArray(value)
		? value
				.filter((item) => typeof item === "string" && item.trim().length > 0)
				.map((item) => item.trim())
		: [];
}

export function getHospitalHeroSource(hospital) {
	const source = hospital?.imageSource || hospital?.image_source || "";
	const confidence = Number(hospital?.imageConfidence ?? hospital?.image_confidence ?? 0);
	const hasSourceGate =
		typeof source === "string" && source.trim().length > 0
			? HOSPITAL_HERO_IMAGE_SOURCES.has(source.trim()) &&
				(source.trim() === "deterministic_fallback" || confidence >= 0.35)
			: true;
	const candidates = [
		hospital?.image,
		hospital?.imageUri,
		...toStringList(hospital?.googlePhotos),
		...toStringList(hospital?.google_photos),
	];
	const uri = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
	// PULLBACK NOTE: Validate URI before caching to prevent network errors
	// OLD: Pass any non-empty string to getCachedRemoteImageSource
	// NEW: Only pass valid URLs, fallback to default image
	if (hasSourceGate && uri && isStableRemoteImageUrl(uri)) {
		return getCachedRemoteImageSource(uri);
	}
	return DEFAULT_HOSPITAL_HERO_IMAGE;
}

export function getCachedRemoteImageSource(uri) {
	const normalizedUri = typeof uri === "string" ? uri.trim() : "";
	if (!normalizedUri) return null;

	const cached = remoteImageSourceCache.get(normalizedUri);
	if (cached) return cached;

	const source = { uri: normalizedUri };
	remoteImageSourceCache.set(normalizedUri, source);

	if (remoteImageSourceCache.size > MAX_REMOTE_IMAGE_SOURCE_CACHE_SIZE) {
		const oldestKey = remoteImageSourceCache.keys().next().value;
		if (oldestKey) remoteImageSourceCache.delete(oldestKey);
	}

	return source;
}

export function prefetchCachedRemoteImage(uri, ImageModule) {
	const normalizedUri = typeof uri === "string" ? uri.trim() : "";
	if (!normalizedUri || prefetchedRemoteImageUris.has(normalizedUri)) return;
	if (!ImageModule || typeof ImageModule.prefetch !== "function") return;

	prefetchedRemoteImageUris.add(normalizedUri);
	ImageModule.prefetch(normalizedUri).catch(() => {
		prefetchedRemoteImageUris.delete(normalizedUri);
	});
}

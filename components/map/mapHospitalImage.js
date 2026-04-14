const DEFAULT_HOSPITAL_HERO_IMAGE = require("../../assets/features/emergency.png");
const remoteImageSourceCache = new Map();
const prefetchedRemoteImageUris = new Set();
const MAX_REMOTE_IMAGE_SOURCE_CACHE_SIZE = 120;

function toStringList(value) {
	return Array.isArray(value)
		? value
				.filter((item) => typeof item === "string" && item.trim().length > 0)
				.map((item) => item.trim())
		: [];
}

export function getHospitalHeroSource(hospital) {
	const candidates = [
		hospital?.image,
		hospital?.imageUri,
		...toStringList(hospital?.googlePhotos),
		...toStringList(hospital?.google_photos),
	];
	const uri = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
	return getCachedRemoteImageSource(uri) || DEFAULT_HOSPITAL_HERO_IMAGE;
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

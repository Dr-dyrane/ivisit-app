#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_API_KEY =
	process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
	process.env.GOOGLE_MAPS_ANDROID_API_KEY ||
	"";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
	throw new Error("Missing Supabase environment");
}

const DEFAULT_HOSPITAL_IMAGES = [
	"https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1632833239869-a37e3a5806d2?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1551190822-a9333d879b1f?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1200&q=80",
];

const DOMAIN_BLOCKLIST = [
	"facebook.com",
	"instagram.com",
	"linkedin.com",
	"twitter.com",
	"x.com",
	"youtube.com",
	"tiktok.com",
	"wa.me",
	"whatsapp.com",
	"goo.gl",
	"maps.google.com",
	"google.com",
];

const NAME_STOPWORDS = new Set([
	"the",
	"and",
	"of",
	"for",
	"medical",
	"center",
	"centre",
	"hospital",
	"clinic",
	"health",
	"care",
	"general",
	"community",
]);

const IMAGE_SOURCE_RANK = {
	hospital_upload: 100,
	official_website_image: 90,
	provider_photo: 82,
	seed_image: 78,
	domain_logo: 60,
	deterministic_fallback: 20,
};

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
	auth: { persistSession: false, autoRefreshToken: false },
});

const toText = (value, fallback = "") =>
	typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
const toNumber = (value) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
};
const isUrl = (value) => /^https?:\/\//i.test(String(value || ""));
const nowIso = () => new Date().toISOString();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeText = (value = "") =>
	String(value || "")
		.toLowerCase()
		.replace(/[.,]/g, " ")
		.replace(/\s+/g, " ")
		.trim();

const parseArgs = () => {
	const args = new Set(process.argv.slice(2));
	return {
		apply: args.has("--apply"),
		limit: (() => {
			const match = process.argv.find((arg) => arg.startsWith("--limit="));
			if (!match) return 200;
			const parsed = Number(match.split("=")[1]);
			return Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : 200;
		})(),
	};
};

const hashString = (seed) => {
	const input = String(seed || "hospital");
	let hash = 0;
	for (let i = 0; i < input.length; i += 1) {
		hash = (hash << 5) - hash + input.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
};

const pickFallbackHospitalImage = (seed) =>
	DEFAULT_HOSPITAL_IMAGES[hashString(seed) % DEFAULT_HOSPITAL_IMAGES.length];

const buildHospitalMediaUrl = (hospitalId) =>
	`${SUPABASE_URL}/functions/v1/hospital-media?hospital_id=${encodeURIComponent(hospitalId)}`;

const parseDomain = (value) => {
	const urlValue = toText(value, "");
	if (!urlValue) return "";
	try {
		return new URL(urlValue).hostname.toLowerCase().replace(/^www\./, "");
	} catch {
		return "";
	}
};

const isBlockedDomain = (domain) =>
	DOMAIN_BLOCKLIST.some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`));

const tokenize = (value) =>
	String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.split(" ")
		.filter((token) => token.length >= 2 && !NAME_STOPWORDS.has(token));

const scoreNameDomainAffinity = (name, domain) => {
	const domainRoot = domain.split(".")[0] ?? domain;
	const nameTokens = tokenize(name);
	const domainTokens = tokenize(domainRoot);

	if (nameTokens.length === 0 || domainTokens.length === 0) return 0;

	const nameSet = new Set(nameTokens);
	const domainSet = new Set(domainTokens);
	const overlap = [...nameSet].filter((token) => domainSet.has(token)).length;
	const tokenScore = overlap / Math.max(nameSet.size, domainSet.size);

	const compactName = nameTokens.join("");
	const compactDomain = domainRoot.replace(/[^a-z0-9]/gi, "").toLowerCase();
	const compactScore =
		compactName.length >= 6 &&
		compactDomain.length >= 6 &&
		(compactDomain.includes(compactName.slice(0, Math.min(12, compactName.length))) ||
			compactName.includes(compactDomain))
			? 0.65
			: 0;

	return Math.max(tokenScore, compactScore);
};

const looksLikeUnsplashFallback = (url) => String(url || "").includes("images.unsplash.com");
const looksLikeClearbitLogo = (url) => String(url || "").includes("logo.clearbit.com");

const buildExistingCandidate = (hospital) => {
	const image = toText(hospital?.image, "");
	if (!image || image.includes("/functions/v1/hospital-media")) return null;
	const existingSource = toText(hospital?.image_source, "");
	if (existingSource) {
		return {
			source_type: existingSource,
			remote_url: image,
			confidence: toNumber(hospital?.image_confidence) ?? 0.8,
			attribution_text: toText(hospital?.image_attribution_text, ""),
			metadata: {},
		};
	}
	if (looksLikeUnsplashFallback(image)) {
		return {
			source_type: "deterministic_fallback",
			remote_url: image,
			confidence: 0.35,
			attribution_text: "",
			metadata: {},
		};
	}
	if (looksLikeClearbitLogo(image)) {
		return {
			source_type: "domain_logo",
			remote_url: image,
			confidence: 0.6,
			attribution_text: "",
			metadata: {},
		};
	}
	return {
		source_type: "seed_image",
		remote_url: image,
		confidence: 0.9,
		attribution_text: "",
		metadata: {},
	};
};

const candidateScore = (candidate) =>
	(IMAGE_SOURCE_RANK[candidate?.source_type] ?? 0) * 10 + (toNumber(candidate?.confidence) ?? 0);

const pickBestCandidate = (candidates) =>
	candidates
		.filter(Boolean)
		.sort((left, right) => candidateScore(right) - candidateScore(left))[0] || null;

const resolveAbsoluteUrl = (baseUrl, maybeRelative) => {
	const raw = toText(maybeRelative, "");
	if (!raw) return "";
	try {
		return new URL(raw, baseUrl).toString();
	} catch {
		return "";
	}
};

const fetchHtml = async (url) => {
	const response = await fetch(url, {
		redirect: "follow",
		headers: {
			"user-agent":
				"Mozilla/5.0 (compatible; iVisitHospitalMedia/1.0; +https://app.ivisit.ng)",
		},
		signal: AbortSignal.timeout(10000),
	});
	if (!response.ok) return "";
	const contentType = response.headers.get("content-type") || "";
	if (!contentType.includes("text/html")) return "";
	return await response.text();
};

const extractMetaContent = (html, key) => {
	const patterns = [
		new RegExp(
			`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
			"i",
		),
		new RegExp(
			`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["'][^>]*>`,
			"i",
		),
	];
	for (const pattern of patterns) {
		const match = html.match(pattern);
		if (match?.[1]) return match[1].trim();
	}
	return "";
};

const resolveOfficialWebsiteCandidate = async (websiteUrl) => {
	const safeUrl = toText(websiteUrl, "");
	if (!isUrl(safeUrl)) return null;
	try {
		const html = await fetchHtml(safeUrl);
		if (!html) return null;
		const metaUrl =
			extractMetaContent(html, "og:image") ||
			extractMetaContent(html, "og:image:url") ||
			extractMetaContent(html, "twitter:image");
		const absolute = resolveAbsoluteUrl(safeUrl, metaUrl);
		if (!absolute || !isUrl(absolute)) return null;
		return {
			source_type: "official_website_image",
			remote_url: absolute,
			confidence: 0.93,
			attribution_text: "",
			metadata: {
				website_url: safeUrl,
			},
		};
	} catch {
		return null;
	}
};

const resolveDomainLogoCandidate = (name, websiteUrl) => {
	const domain = parseDomain(websiteUrl);
	if (!domain || isBlockedDomain(domain)) return null;
	const affinity = scoreNameDomainAffinity(name, domain);
	if (affinity < 0.45) return null;
	return {
		source_type: "domain_logo",
		remote_url: `https://logo.clearbit.com/${domain}?size=512`,
		confidence: Math.min(0.95, Number((0.55 + affinity * 0.4).toFixed(2))),
		attribution_text: "",
		metadata: {
			website_url: toText(websiteUrl, ""),
			domain,
		},
	};
};

const buildFallbackCandidate = (hospital) => ({
	source_type: "deterministic_fallback",
	remote_url: pickFallbackHospitalImage(
		toText(hospital?.place_id, toText(hospital?.id, toText(hospital?.name, "hospital"))),
	),
	confidence: 0.35,
	attribution_text: "",
	metadata: {},
});

const scoreGoogleMatch = (hospital, result) => {
	const hospitalName = normalizeText(hospital?.name);
	const hospitalAddress = normalizeText(hospital?.address);
	const resultName = normalizeText(result?.displayName?.text || result?.name);
	const resultAddress = normalizeText(result?.formattedAddress || result?.formatted_address || result?.vicinity);
	const nameTokens = tokenize(hospitalName);
	const addressTokens = tokenize(hospitalAddress);
	const resultNameTokens = new Set(tokenize(resultName));
	const resultAddressTokens = new Set(tokenize(resultAddress));

	let score = 0;
	nameTokens.forEach((token) => {
		if (resultNameTokens.has(token)) score += 12;
	});
	addressTokens.forEach((token) => {
		if (resultAddressTokens.has(token)) score += 4;
	});

	const latA = toNumber(hospital?.latitude);
	const lngA = toNumber(hospital?.longitude);
	const latB = toNumber(result?.location?.latitude ?? result?.geometry?.location?.lat);
	const lngB = toNumber(result?.location?.longitude ?? result?.geometry?.location?.lng);
	if (latA !== null && lngA !== null && latB !== null && lngB !== null) {
		const distancePenalty = Math.abs(latA - latB) + Math.abs(lngA - lngB);
		score -= distancePenalty * 250;
	}

	return score;
};

const searchGooglePlace = async (hospital) => {
	if (!GOOGLE_API_KEY) return null;
	const query = `${toText(hospital?.name)} ${toText(hospital?.address)}`.trim();
	if (!query) return null;
	const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Goog-Api-Key": GOOGLE_API_KEY,
			"X-Goog-FieldMask":
				"places.id,places.displayName,places.formattedAddress,places.location",
		},
		body: JSON.stringify({
			textQuery: query,
			includedType: "hospital",
			pageSize: 5,
			locationBias:
				toNumber(hospital?.latitude) !== null && toNumber(hospital?.longitude) !== null
					? {
							circle: {
								center: {
									latitude: Number(hospital.latitude),
									longitude: Number(hospital.longitude),
								},
								radius: 15000,
							},
					  }
					: undefined,
		}),
		signal: AbortSignal.timeout(10000),
	});
	if (!response.ok) return null;
	const data = await response.json();
	const results = Array.isArray(data?.places) ? data.places : [];
	if (results.length === 0) return null;
	return results.sort((left, right) => scoreGoogleMatch(hospital, right) - scoreGoogleMatch(hospital, left))[0];
};

const getGooglePlaceDetails = async (placeId) => {
	if (!GOOGLE_API_KEY || !placeId) return null;
	const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
	const response = await fetch(url, {
		headers: {
			"X-Goog-Api-Key": GOOGLE_API_KEY,
			"X-Goog-FieldMask":
				"id,displayName,formattedAddress,websiteUri,photos",
		},
		signal: AbortSignal.timeout(10000),
	});
	if (!response.ok) return null;
	const data = await response.json();
	return data || null;
};

const resolveGoogleDetails = async (hospital) => {
	let details = null;
	const existingPlaceId = toText(hospital?.place_id, "");
	if (existingPlaceId && !existingPlaceId.startsWith("demo:")) {
		details = await getGooglePlaceDetails(existingPlaceId);
	}
	if (!details) {
		const match = await searchGooglePlace(hospital);
		const matchedPlaceId = toText(match?.id, "");
		if (matchedPlaceId) {
			details = await getGooglePlaceDetails(matchedPlaceId);
		}
	}
	return details;
};

const buildProviderPhotoCandidate = (details) => {
	const photoName = toText(details?.photos?.[0]?.name, "");
	if (!photoName) return null;
	return {
		source_type: "provider_photo",
		remote_url: null,
		confidence: 0.78,
		attribution_text: "Google Places photo",
		metadata: {
			google_photo_name: photoName,
			google_place_id: toText(details?.id, ""),
			website_url: toText(details?.websiteUri, ""),
		},
	};
};

const fetchHospitals = async (limit) => {
	const { data, error } = await supabase
		.from("hospitals")
		.select("id,name,address,image,image_source,image_confidence,image_attribution_text,place_id,latitude,longitude,status,verified,verification_status")
		.in("status", ["available", "full"])
		.limit(limit);
	if (error) throw error;
	return Array.isArray(data) ? data : [];
};

const shouldRefreshHospital = (hospital) => {
	const source = toText(hospital?.image_source, "");
	const image = toText(hospital?.image, "");
	if (!image) return true;
	if (image.includes("/functions/v1/hospital-media")) return false;
	if (!source) return true;
	return source === "deterministic_fallback" || source === "domain_logo";
};

const upsertPrimaryMedia = async (hospital, candidate, apply) => {
	const hospitalId = toText(hospital?.id, "");
	if (!hospitalId || !candidate) return { action: "skip" };

	const metadata = candidate?.metadata || {};
	const proxyUrl = buildHospitalMediaUrl(hospitalId);
	const row = {
		hospital_id: hospitalId,
		media_role: "hero",
		source_type: candidate.source_type,
		source_provider:
			candidate.source_type === "provider_photo"
				? "google"
				: candidate.source_type === "official_website_image"
					? "official"
					: candidate.source_type === "domain_logo"
						? "clearbit"
						: "ivisit",
		remote_url: candidate.remote_url,
		website_url: toText(metadata.website_url, ""),
		provider_photo_ref: toText(metadata.google_photo_name || metadata.google_photo_ref, ""),
		attribution_text: toText(candidate.attribution_text, ""),
		attribution_required: candidate.source_type === "provider_photo",
		confidence: toNumber(candidate.confidence) ?? 0,
		is_primary: true,
		status: "active",
		metadata,
		updated_at: nowIso(),
	};

	if (!apply) {
		return {
			action: "would_update",
			hospital_id: hospitalId,
			source_type: row.source_type,
			confidence: row.confidence,
		};
	}

	const { error: archiveError } = await supabase
		.from("hospital_media")
		.update({ is_primary: false, status: "archived", updated_at: nowIso() })
		.eq("hospital_id", hospitalId)
		.eq("media_role", "hero")
		.eq("is_primary", true)
		.eq("status", "active");
	if (archiveError) throw archiveError;

	const { error: insertError } = await supabase.from("hospital_media").insert(row);
	if (insertError) throw insertError;

	const { error: hospitalError } = await supabase
		.from("hospitals")
		.update({
			image: proxyUrl,
			image_source: row.source_type,
			image_confidence: row.confidence,
			image_attribution_text: row.attribution_text || null,
			image_synced_at: nowIso(),
		})
		.eq("id", hospitalId);
	if (hospitalError) throw hospitalError;

	return {
		action: "updated",
		hospital_id: hospitalId,
		source_type: row.source_type,
		confidence: row.confidence,
	};
};

const main = async () => {
	const args = parseArgs();
	const hospitals = await fetchHospitals(args.limit);
	const candidates = [];

	for (const hospital of hospitals) {
		if (!shouldRefreshHospital(hospital)) continue;

		const existingCandidate = buildExistingCandidate(hospital);
		let details = null;
		try {
			details = await resolveGoogleDetails(hospital);
		} catch (error) {
			console.warn("[backfill_hospital_media] google resolve failed", hospital.name, error.message);
		}

		const websiteUrl = toText(details?.websiteUri, "");
		const officialWebsiteCandidate = websiteUrl
			? await resolveOfficialWebsiteCandidate(websiteUrl)
			: null;
		const providerPhotoCandidate = buildProviderPhotoCandidate(details);
		const domainLogoCandidate = websiteUrl
			? resolveDomainLogoCandidate(hospital.name, websiteUrl)
			: null;
		const fallbackCandidate = buildFallbackCandidate(hospital);

		const bestCandidate = pickBestCandidate([
			existingCandidate,
			officialWebsiteCandidate,
			providerPhotoCandidate,
			domainLogoCandidate,
			fallbackCandidate,
		]);

		const result = await upsertPrimaryMedia(hospital, bestCandidate, args.apply);
		candidates.push({
			hospital: hospital.name,
			id: hospital.id,
			source_type: bestCandidate?.source_type || null,
			confidence: bestCandidate?.confidence || null,
			action: result.action,
		});

		await sleep(200);
	}

	console.log(
		JSON.stringify(
			{
				apply: args.apply,
				total_scanned: hospitals.length,
				total_touched: candidates.length,
				results: candidates,
			},
			null,
			2,
		),
	);
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});

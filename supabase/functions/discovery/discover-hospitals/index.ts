import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getBooleanEnv, getEnv } from "../../_shared/env/env.ts";
import { clampLimit, toFiniteNumber, toNonNegativeInt } from "../../_shared/domain/numbers.ts";
import { calculateDistanceKm } from "../../_shared/domain/providers/distance.ts";
import { normalizeGooglePlace, normalizeMapboxPlace } from "../../_shared/domain/providers/normalizeExternal.ts";
import { jsonResponse, optionsResponse } from "../../_shared/http/cors.ts";
import { createServiceClient } from "../../_shared/supabase/clients.ts";
import {
  CATEGORY_RESULT_KEYWORD_GUARDS,
  CATEGORY_TO_GOOGLE_TYPES,
  CATEGORY_TO_MAPBOX_CATEGORY,
  EXPLORE_CATEGORY_META_KEYWORDS,
  GOOGLE_TEXT_SEARCH_FIRST_CATEGORIES,
  GOOGLE_TYPE_TO_PROVIDER,
  NON_DENTAL_PROVIDER_NOISE_GUARD,
  PROVIDER_TYPES,
  classifyProviderByName,
  deriveEmergencyEligible,
  getGoogleQueriesForCategory,
  normaliseEmergencyLevel,
} from "../../_shared/domain/providers/taxonomy.ts";
import type { ProviderType } from "../../_shared/domain/providers/taxonomy.ts";

// PULLBACK NOTE: EXPLORE-CARE-DATA-1 — Expanded fallback image library
// OLD: 4 hospital-specific images used for all provider types
// NEW: 12 hospital images + category-specific fallback arrays for richer UI
const DEFAULT_HOSPITAL_IMAGES = [
  "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1632833239869-a37e3a5806d2?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1551190822-a9333d879b1f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1504419604952-10c1209773c4?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",
];

// Category-specific fallback images for provider types
const FALLBACK_IMAGES_BY_CATEGORY: Record<string, string[]> = {
  hospital: DEFAULT_HOSPITAL_IMAGES,
  pharmacy: [
    "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1585435557343-3b6480329a73?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1584672073229-aca03c56ff42?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1200&q=80",
  ],
  lab: [
    "https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1583947215259-7e5e029c1e3d?auto=format&fit=crop&w=1200&q=80",
  ],
  radiology: [
    "https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1583947215259-7e5e029c1e3d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1200&q=80",
  ],
  urgent_care: [
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1504419604952-10c1209773c4?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=80",
  ],
  clinic: [
    "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1504419604952-10c1209773c4?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80",
  ],
  mental_health: [
    "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1493863641943-9b68992a8d07?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1476900543704-4312b78632f8?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1200&q=80",
  ],
  womens_care: [
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1504419604952-10c1209773c4?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1200&q=80",
  ],
  pediatrics: [
    "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1504419604952-10c1209773c4?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=80",
  ],
};

const DOMAIN_BLOCKLIST = [
  "google.com",
  "maps.google.com",
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "yelp.com",
  "tripadvisor.com",
  "linkedin.com",
  "wikipedia.org",
  "tiktok.com",
];

const NAME_STOPWORDS = new Set([
  "the",
  "and",
  "of",
  "medical",
  "hospital",
  "center",
  "centre",
  "health",
  "care",
  "clinic",
  "group",
  "inc",
  "llc",
]);

const toSafeString = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") return fallback;
  const clean = value.trim();
  return clean.length > 0 ? clean : fallback;
};

const toSafeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const normalizeFacilityText = (value: unknown): string =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const MAP_NEARBY_COMFORT_THRESHOLD = 5;
const MAP_LOCAL_NEARBY_RADIUS_KM = 5;
const MAP_LOCAL_NEARBY_COMFORT_THRESHOLD = 3;
const REGION_LOCAL_FIRST_COUNTRY_CODES = new Set(["NG"]);
const LOCALITY_SCOPE_LOCAL = "local";
const LOCALITY_SCOPE_WIDE_FALLBACK = "wide_fallback";
const GOOGLE_PROVIDER_LIST_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.primaryType",
  "places.types",
].join(",");
const GOOGLE_PROVIDER_DETAIL_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "photos",
  "primaryType",
  "types",
].join(",");

const normalizeCountryCode = (value: unknown): string => {
  const clean = toSafeString(value).toUpperCase();
  return /^[A-Z]{2}$/.test(clean) ? clean : "";
};

const shouldUseRegionLocalFirst = (countryCode: string, providerCategory: string): boolean =>
  providerCategory !== PROVIDER_TYPES.HOSPITAL &&
  REGION_LOCAL_FIRST_COUNTRY_CODES.has(countryCode);

// PULLBACK NOTE: FIX-PHARMACY-DUPLICATES — Increase coordinate precision for deduplication.
// OLD: precision=3 (~111m) blurred nearby providers together.
// NEW: precision=5 (~1m) preserves pharmacy/provider-level accuracy.
const coordinateKey = (value: unknown, precision = 5): string | null => {
  const n = toFiniteNumber(value);
  if (!Number.isFinite(n)) return null;
  return Number(n).toFixed(precision);
};

const isDemoDatabaseRow = (row: any): boolean => {
  const placeId = toSafeString(row?.place_id, "").toLowerCase();
  const verificationStatus = toSafeString(
    row?.verification_status ?? row?.import_status,
    ""
  ).toLowerCase();
  const features = toSafeStringArray(row?.features).map((feature) =>
    feature.toLowerCase()
  );

  return (
    placeId.startsWith("demo:") ||
    verificationStatus.startsWith("demo") ||
    features.some((feature) => feature.includes("demo"))
  );
};

const isDispatchableDatabaseRow = (row: any): boolean => {
  const status = toSafeString(row?.status, "available").toLowerCase();
  const verificationStatus = toSafeString(
    row?.verification_status ?? row?.import_status,
    ""
  ).toLowerCase();

  // EXP-4 gate: if provider_type is present, only hospitals are dispatchable
  const providerType = toSafeString(row?.provider_type, PROVIDER_TYPES.HOSPITAL).toLowerCase();
  if (providerType !== PROVIDER_TYPES.HOSPITAL) return false;

  return (
    status === "available" &&
    (row?.verified === true ||
      isDemoDatabaseRow(row) ||
      verificationStatus === "verified" ||
      verificationStatus === "not_certified")
  );
};

const parseDistanceKm = (row: any): number | null => {
  const numericDistance = toFiniteNumber(
    row?.distance_km ?? row?.distanceKm ?? row?.distance
  );
  if (Number.isFinite(numericDistance)) {
    return numericDistance;
  }

  const distanceLabel = toSafeString(row?.distance, "");
  if (!distanceLabel) return null;

  const match = distanceLabel.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

const compareByDistance = (left: any, right: any): number => {
  const leftDistance = parseDistanceKm(left);
  const rightDistance = parseDistanceKm(right);
  const leftHasDistance = Number.isFinite(leftDistance);
  const rightHasDistance = Number.isFinite(rightDistance);

  if (leftHasDistance && rightHasDistance && leftDistance !== rightDistance) {
    return leftDistance - rightDistance;
  }
  if (leftHasDistance !== rightHasDistance) {
    return leftHasDistance ? -1 : 1;
  }

  return String(left?.name || "").localeCompare(String(right?.name || ""), undefined, {
    sensitivity: "base",
  });
};

const isWithinDistanceKm = (row: any, radiusKm: number): boolean => {
  const distanceKm = parseDistanceKm(row);
  return Number.isFinite(distanceKm) && Number(distanceKm) <= radiusKm;
};

const prioritizeDatabaseRows = (rows: any[]): any[] =>
  [...rows].sort((left, right) => {
    const leftDispatchable = isDispatchableDatabaseRow(left);
    const rightDispatchable = isDispatchableDatabaseRow(right);
    if (leftDispatchable !== rightDispatchable) {
      return leftDispatchable ? -1 : 1;
    }

    return compareByDistance(left, right);
  });

const hashString = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

// PULLBACK NOTE: EXPLORE-CARE-DATA-1 — Updated fallback image picker to support category-specific images
// OLD: Always used DEFAULT_HOSPITAL_IMAGES for all provider types
// NEW: Accepts providerCategory parameter, uses category-specific fallback arrays
const pickFallbackHospitalImage = (seed: string, providerCategory?: string): string => {
  const key = seed || "hospital";
  const category = providerCategory || "hospital";
  const categoryImages = FALLBACK_IMAGES_BY_CATEGORY[category] || DEFAULT_HOSPITAL_IMAGES;
  const idx = hashString(key) % categoryImages.length;
  return categoryImages[idx];
};

const isUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const parseDomain = (value: unknown): string | null => {
  const raw = toSafeString(value);
  if (!raw) return null;

  const withProtocol = isUrl(raw) ? raw : `https://${raw}`;
  try {
    const hostname = new URL(withProtocol).hostname.toLowerCase().replace(/^www\./, "");
    if (!hostname || hostname.includes(" ")) return null;
    return hostname;
  } catch {
    return null;
  }
};

const isBlockedDomain = (domain: string): boolean =>
  DOMAIN_BLOCKLIST.some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`));

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length >= 2 && !NAME_STOPWORDS.has(token));

const scoreNameDomainAffinity = (name: string, domain: string): number => {
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

const buildHospitalMediaProxyUrl = (placeId: string): string => {
  const supabaseUrl = toSafeString(
    getEnv("SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_URL"),
    "",
  ).replace(/\/$/, "");
  if (!supabaseUrl || !placeId) return "";
  return `${supabaseUrl}/functions/v1/hospital-media?place_id=${encodeURIComponent(placeId)}`;
};

// PULLBACK NOTE: EXPLORE-CARE-DATA-1 — Updated to pass provider category for category-specific fallback images
// OLD: pickFallbackHospitalImage called without category (always used hospital images)
// NEW: Pass provider_type for category-specific fallback selection
const resolveHospitalImage = (row: any) => {
  const explicitImage = toSafeString(row?.image);
  const explicitSource = toSafeString(row?.image_source);
  if (
    explicitImage &&
    isUrl(explicitImage) &&
    (explicitSource === "provider_photo" || toSafeString(row?.google_photo_name))
  ) {
    return {
      image: explicitImage,
      image_source: "provider_photo",
      image_confidence: toFiniteNumber(row?.image_confidence) ?? 0.78,
      image_attribution_text: toSafeString(
        row?.image_attribution_text,
        "Google Places photo"
      ),
    };
  }
  if (explicitImage && isUrl(explicitImage)) {
    return {
      image: explicitImage,
      image_source: "provider_image",
      image_confidence: 0.98,
    };
  }

  const domain = parseDomain(row?.website);
  const name = toSafeString(row?.name, "Hospital");
  if (domain && !isBlockedDomain(domain)) {
    const affinity = scoreNameDomainAffinity(name, domain);
    // Guardrail: only use inferred domain logos when name-domain affinity is strong.
    if (affinity >= 0.45) {
      const confidence = Math.min(0.95, Number((0.55 + affinity * 0.4).toFixed(2)));
      return {
        image: `https://logo.clearbit.com/${domain}?size=512`,
        image_source: "domain_logo",
        image_confidence: confidence,
      };
    }
  }

  const providerCategory = toSafeString(row?.provider_type, PROVIDER_TYPES.HOSPITAL);
  return {
    image: pickFallbackHospitalImage(String(row?.place_id || row?.name || "hospital"), providerCategory),
    image_source: "deterministic_fallback",
    image_confidence: 0.35,
  };
};

const IMAGE_SOURCE_RANK: Record<string, number> = {
  hospital_upload: 100,
  official_website_image: 90,
  provider_photo: 86,
  provider_image: 82,
  seed_image: 78,
  domain_logo: 60,
  deterministic_fallback: 20,
};

const choosePreferredImage = (existing: any, candidate: any) => {
  const existingUrl = toSafeString(existing?.image, "");
  const candidateUrl = toSafeString(candidate?.image, "");
  const existingSource = toSafeString(existing?.image_source, "");
  const candidateSource = toSafeString(candidate?.image_source, "");
  const existingConfidence = toFiniteNumber(existing?.image_confidence) ?? 0;
  const candidateConfidence = toFiniteNumber(candidate?.image_confidence) ?? 0;
  const existingRank = IMAGE_SOURCE_RANK[existingSource] ?? 0;
  const candidateRank = IMAGE_SOURCE_RANK[candidateSource] ?? 0;

  if (!existingUrl && candidateUrl) return candidate;
  if (existingUrl && !candidateUrl) return existing;
  if (!existingUrl && !candidateUrl) return existingRank >= candidateRank ? existing : candidate;
  if (candidateRank > existingRank) return candidate;
  if (existingRank > candidateRank) return existing;
  if (candidateConfidence > existingConfidence) return candidate;
  return existing;
};

const withProviderDefaults = (row: any, providerSource: string, requestedCategory = "hospital") => {
  // EXP-2: Classify provider type using Places API category + name heuristic
  const googleType = toSafeString(row?.google_type);
  const categoryFromType = googleType ? GOOGLE_TYPE_TO_PROVIDER[googleType] : undefined;
  const nameClassification = classifyProviderByName(toSafeString(row?.name));
  const requestedProviderType = (CATEGORY_TO_GOOGLE_TYPES[requestedCategory]
    ? requestedCategory
    : PROVIDER_TYPES.HOSPITAL) as ProviderType;
  const categoryGuard = CATEGORY_RESULT_KEYWORD_GUARDS[requestedCategory];
  const requestedCategoryGuardMatches = !!categoryGuard &&
    shouldKeepProviderForRequestedCategory(row, requestedCategory);
  const categoryMatchesRequest = categoryFromType === requestedProviderType;
  const canTrustGoogleType =
    !!categoryFromType &&
    (requestedProviderType === PROVIDER_TYPES.HOSPITAL ||
      categoryMatchesRequest ||
      googleType === "pharmacy" ||
      googleType === "drugstore" ||
      googleType === "medical_lab");

  // Source confidence: verified Google type > name heuristic > requested category fallback
  let providerType: ProviderType;
  let categoryConfidence: number;
  if (requestedCategoryGuardMatches) {
    providerType = requestedProviderType;
    categoryConfidence = Math.max(0.50, nameClassification.confidence);
  } else if (canTrustGoogleType) {
    providerType = categoryFromType;
    categoryConfidence = 0.75;
  } else if (nameClassification.confidence >= 0.50) {
    providerType = nameClassification.providerType;
    categoryConfidence = nameClassification.confidence;
  } else {
    // Fall back to the category the caller requested (e.g. "pharmacy" explore mode)
    providerType = requestedProviderType;
    categoryConfidence = 0.30;
  }

  const rawEmergencyLevel = toSafeString(row?.emergency_level, "");
  const emergency_level = normaliseEmergencyLevel(rawEmergencyLevel);
  const emergency_eligible = deriveEmergencyEligible(providerType, emergency_level);

  const normalized = {
    place_id: toSafeString(row?.place_id),
    name: toSafeString(row?.name, "Unnamed Provider"),
    address: toSafeString(row?.address, "Address unavailable"),
    phone: toSafeString(row?.phone),
    website: toSafeString(row?.website),
    latitude: toFiniteNumber(row?.latitude),
    longitude: toFiniteNumber(row?.longitude),
    rating: toFiniteNumber(row?.rating) ?? 0,
    type: toSafeString(row?.type, "standard"),
    specialties: toSafeStringArray(row?.specialties),
    service_types: toSafeStringArray(row?.service_types),
    features: toSafeStringArray(row?.features),
    emergency_level,
    available_beds: toNonNegativeInt(row?.available_beds, 0),
    ambulances_count: toNonNegativeInt(row?.ambulances_count, 0),
    wait_time: toSafeString(row?.wait_time, "15 min"),
    price_range: toSafeString(row?.price_range, "$$$"),
    verified: false,
    status: "available",
    import_status: "pending",
    imported_from_google: providerSource === "google",
    mapbox_only: providerSource === "mapbox",
    google_only: providerSource === "google",
    google_type: toSafeString(row?.google_type),
    google_types: toSafeStringArray(row?.google_types),
    image: toSafeString(row?.image),
    image_source: toSafeString(row?.image_source),
    image_confidence: toFiniteNumber(row?.image_confidence),
    image_attribution_text: toSafeString(row?.image_attribution_text),
    google_photo_name: toSafeString(row?.google_photo_name),
    // EXP-2: Provider taxonomy fields
    provider_type: providerType,
    emergency_eligible,
    category_confidence: categoryConfidence,
    provider_source: providerSource === "google" ? "google_places" : providerSource === "mapbox" ? "mapbox_places" : "manual_seed",
    provider_locality_scope: toSafeString(row?.provider_locality_scope, LOCALITY_SCOPE_LOCAL),
    is_wide_provider_fallback: row?.is_wide_provider_fallback === true,
  };

  const imageMeta = resolveHospitalImage(normalized);
  return {
    ...normalized,
    ...imageMeta,
  };
};

const toMergeKey = (row: any): string => {
  const name = normalizeFacilityText(row?.name);
  const address = normalizeFacilityText(row?.address);
  const latitude = coordinateKey(row?.latitude);
  const longitude = coordinateKey(row?.longitude);

  // PULLBACK NOTE: FIX-DUPLICATE-LOCATIONS — Prioritize address/coordinates over name.
  // Provider APIs can return the same facility with slightly different names.
  if (address && latitude && longitude) {
    return `location:${address}|${latitude}|${longitude}`;
  }
  if (latitude && longitude) {
    return `coords:${latitude}|${longitude}`;
  }
  if (address) {
    return `address:${address}`;
  }

  const placeId =
    typeof row?.place_id === "string" ? row.place_id.trim().toLowerCase() : "";
  if (placeId) return `place:${placeId}`;
  if (name) return `name:${name}`;

  const id = typeof row?.id === "string" ? row.id : "unknown";
  return `id:${id}`;
};

const buildGoogleTextSearchQuery = (
  providerCategory: string,
  query: string,
  countryCode = "",
): string => {
  const explicitQuery = toSafeString(query);
  if (explicitQuery) return explicitQuery;
  const categoryQueries = getGoogleQueriesForCategory(providerCategory, countryCode);
  return categoryQueries.slice(0, 4).join(" ");
};

const shouldKeepProviderForRequestedCategory = (row: any, requestedCategory: string): boolean => {
  const haystack = [
    row?.name,
    row?.address,
    row?.google_type,
    ...(Array.isArray(row?.google_types) ? row.google_types : []),
    ...(Array.isArray(row?.specialties) ? row.specialties : []),
    ...(Array.isArray(row?.service_types) ? row.service_types : []),
  ]
    .filter(Boolean)
    .join(" ");
  if (
    requestedCategory !== PROVIDER_TYPES.HOSPITAL &&
    NON_DENTAL_PROVIDER_NOISE_GUARD.test(haystack)
  ) {
    return false;
  }
  const googleType = toSafeString(row?.google_type).toLowerCase();
  const googleTypes = Array.isArray(row?.google_types)
    ? row.google_types.map((entry: unknown) => toSafeString(entry).toLowerCase())
    : [];
  const broadMedicalTypes = new Set([googleType, ...googleTypes]);
  if (
    (requestedCategory === PROVIDER_TYPES.URGENT_CARE ||
      requestedCategory === PROVIDER_TYPES.RADIOLOGY) &&
    (
      broadMedicalTypes.has("doctor") ||
      broadMedicalTypes.has("hospital") ||
      broadMedicalTypes.has("medical_center") ||
      broadMedicalTypes.has("medical_clinic") ||
      broadMedicalTypes.has("health") ||
      broadMedicalTypes.has("service")
    )
  ) {
    return true;
  }
  const guard = CATEGORY_RESULT_KEYWORD_GUARDS[requestedCategory];
  if (!guard) return true;
  return guard.test(haystack);
};

const withDistanceFromOrigin = (row: any, originLat: number, originLng: number) => {
  const distanceKm =
    parseDistanceKm(row) ?? calculateDistanceKm(originLat, originLng, row?.latitude, row?.longitude);
  const localityScope = toSafeString(row?.provider_locality_scope, LOCALITY_SCOPE_LOCAL);
  const isWideFallback =
    localityScope === LOCALITY_SCOPE_WIDE_FALLBACK &&
    Number.isFinite(distanceKm) &&
    Number(distanceKm) > MAP_LOCAL_NEARBY_RADIUS_KM;

  return {
    ...row,
    distance_km: Number.isFinite(distanceKm) ? distanceKm : row?.distance_km,
    provider_locality_scope: isWideFallback ? LOCALITY_SCOPE_WIDE_FALLBACK : LOCALITY_SCOPE_LOCAL,
    is_wide_provider_fallback: isWideFallback,
  };
};

const toGeometryPoint = (latitude: unknown, longitude: unknown): string | null => {
  const lat = toFiniteNumber(latitude);
  const lng = toFiniteNumber(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `SRID=4326;POINT(${lng} ${lat})`;
};

const fetchGoogleProviderPlaces = async ({
  apiKey,
  latitude,
  longitude,
  radius,
  mode,
  query,
  limit,
  providerCategory,
  countryCode,
}: {
  apiKey: string;
  latitude: number;
  longitude: number;
  radius: number;
  mode: "nearby" | "text_search";
  query: string;
  limit: number;
  // PULLBACK NOTE: FIX-A — BUG-1/2: thread providerCategory so Google fetch returns correct type
  // OLD: no providerCategory param — always fetched "hospital" type
  // NEW: derive includedTypes from CATEGORY_TO_GOOGLE_TYPES[providerCategory]
  providerCategory: string;
  countryCode?: string;
}) => {
  const textSearchQuery =
    mode === "text_search" || GOOGLE_TEXT_SEARCH_FIRST_CATEGORIES.has(providerCategory)
      ? buildGoogleTextSearchQuery(providerCategory, query, countryCode)
      : "";
  const useTextSearch = !!textSearchQuery;
  const endpoint = useTextSearch
    ? "https://places.googleapis.com/v1/places:searchText"
    : "https://places.googleapis.com/v1/places:searchNearby";
  // Keep list discovery on the leanest useful field set. Richer details
  // (phone, website, rating, photos) should be fetched only from an explicit
  // provider-detail enrichment path so list browsing cannot fan out costs.
  const fieldMask = GOOGLE_PROVIDER_LIST_FIELD_MASK;
  // PULLBACK NOTE: FIX-A — derive includedTypes from category mapping, fallback to hospital
  // OLD: hardcoded ["hospital"] / "hospital" regardless of caller
  // NEW: CATEGORY_TO_GOOGLE_TYPES[providerCategory] ?? ["hospital"]
  const googleTypes = CATEGORY_TO_GOOGLE_TYPES[providerCategory] ?? ["hospital"];
  const primaryGoogleType = googleTypes[0] ?? "hospital";
  const body =
    useTextSearch
      ? {
          textQuery: textSearchQuery,
          pageSize: limit,
          locationBias: {
            circle: {
              center: { latitude, longitude },
              radius: Math.max(1, Math.round(radius)),
            },
          },
        }
      : {
          includedTypes: googleTypes,
          maxResultCount: limit,
          rankPreference: "DISTANCE",
          locationRestriction: {
            circle: {
              center: { latitude, longitude },
              radius: Math.max(1, Math.round(radius)),
            },
          },
        };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`google places fetch failed: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data?.places) ? data.places : [];
};

const fetchGoogleProviderDetails = async ({
  apiKey,
  placeId,
}: {
  apiKey: string;
  placeId: string;
}) => {
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": GOOGLE_PROVIDER_DETAIL_FIELD_MASK,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`google place details fetch failed: ${response.status} ${text}`);
  }

  return await response.json();
};

// Keep persistence schema-safe: only write columns that exist on public.hospitals.
// EXP-3 columns (provider_type, emergency_eligible, category_confidence) are written
// only when the schema patch migration has run (columns will be silently ignored if absent).
// PULLBACK NOTE: EXPLORE-CARE-DATA-1 — Updated to pass provider category for category-specific fallback images
// OLD: pickFallbackHospitalImage called without category (always used hospital images)
// NEW: Pass provider_type for category-specific fallback selection
const toHospitalUpsertRow = (row: any) => {
  const providerCategory = toSafeString(row?.provider_type, PROVIDER_TYPES.HOSPITAL);
  const latitude = toFiniteNumber(row?.latitude);
  const longitude = toFiniteNumber(row?.longitude);
  return {
    place_id: row?.place_id,
    name: row?.name || "Unnamed Hospital",
    address: row?.address || "Address unavailable",
    phone: typeof row?.phone === "string" && row.phone.trim() ? row.phone.trim() : null,
    latitude,
    longitude,
    coordinates: toGeometryPoint(latitude, longitude),
    rating: toFiniteNumber(row?.rating) ?? 0,
    image:
      toSafeString(row?.image) ||
      pickFallbackHospitalImage(String(row?.place_id || row?.name || "hospital"), providerCategory),
    image_source: toSafeString(row?.image_source, "deterministic_fallback"),
    image_confidence:
      toFiniteNumber(row?.image_confidence) ??
      (toSafeString(row?.image).length > 0 ? 0.95 : 0.35),
    image_attribution_text: toSafeString(row?.image_attribution_text),
    image_synced_at: new Date().toISOString(),
    specialties: toSafeStringArray(row?.specialties),
    service_types: toSafeStringArray(row?.service_types),
    features: toSafeStringArray(row?.features),
    emergency_level: toSafeString(row?.emergency_level, "Standard"),
    available_beds: toNonNegativeInt(row?.available_beds, 0),
    ambulances_count: toNonNegativeInt(row?.ambulances_count, 0),
    wait_time: toSafeString(row?.wait_time, "15 min"),
    price_range: toSafeString(row?.price_range, "$$$"),
    verified: false,
    status: "available",
    type: "standard",
    // EXP-3: provider taxonomy discriminators (schema patch required — safe to include pre-migration)
    provider_type: toSafeString(row?.provider_type, PROVIDER_TYPES.HOSPITAL),
    emergency_eligible: row?.emergency_eligible === true,
    category_confidence: toFiniteNumber(row?.category_confidence) ?? 0.30,
    provider_source: toSafeString(row?.provider_source, "mapbox_places"),
  };
};

// Provider-specific field enrichment by type
// PULLBACK NOTE: EXPLORE-CARE-PERMANENT-FIX — Phase 2: Provider data enrichment
// OLD: No provider-specific data enrichment (specialties/service_types/features arrays empty for Mapbox/Google)
// NEW: Enrich provider-specific fields based on provider_type for richer provider detail views
const enrichProviderData = (providerType: string, existingFeatures: string[] = []) => {
  const features = new Set(existingFeatures);
  const services: string[] = [];
  const specialties: string[] = [];
  const insurance: string[] = [];
  const hours: Record<string, any> = {};
  let appointmentRequired = false;
  let reportTurnaround: string | undefined;
  let ageRange: string | undefined;
  let crisisLine: string | undefined;

  switch (providerType) {
    case "pharmacy":
      services.push("prescription_filling", "vaccinations");
      specialties.push("prescription_services", "vaccination_services");
      if (features.has("24_hour")) hours["24_hour"] = true;
      break;

    case "lab":
      services.push("blood_draw", "urine_collection", "genetic_testing");
      specialties.push("blood_work", "urine_tests", "genetic_testing");
      appointmentRequired = true;
      reportTurnaround = "2-3 days";
      break;

    case "radiology":
      services.push("x_ray", "ct", "mri", "ultrasound");
      specialties.push("x_ray", "ct_scan", "mri", "ultrasound");
      appointmentRequired = true;
      reportTurnaround = "1-2 days";
      break;

    case "urgent_care":
      services.push("minor_injuries", "illnesses", "x_ray", "lab");
      specialties.push("urgent_care");
      break;

    case "clinic":
      services.push("checkups", "vaccinations", "minor_procedures");
      specialties.push("primary_care", "dermatology", "cardiology");
      appointmentRequired = true;
      break;

    case "mental_health":
      services.push("therapy", "counseling", "crisis_intervention");
      specialties.push("individual_therapy", "group_therapy", "cbt");
      if (features.has("telehealth")) hours["telehealth"] = true;
      crisisLine = "555-0123"; // Placeholder - would be enriched from real data
      break;

    case "womens_care":
      services.push("ob_gyn", "prenatal", "mammograms");
      specialties.push("ob_gyn", "prenatal_care", "mammograms");
      appointmentRequired = true;
      if (features.has("midwife_services")) specialties.push("midwife_services");
      break;

    case "pediatrics":
      services.push("vaccinations", "well_child", "specialized_care");
      specialties.push("well_child_visits", "specialized_care");
      ageRange = "0-18";
      if (features.has("pediatric_specialists")) specialties.push("pediatric_specialists");
      break;

    case "hospital":
    default:
      // Hospitals already have comprehensive data in hospitals table
      break;
  }

  return {
    provider_services: { services },
    provider_specialties: { specialties },
    insurance_accepted: insurance.length > 0 ? insurance : null,
    structured_hours: Object.keys(hours).length > 0 ? hours : null,
    appointment_required: appointmentRequired,
    report_turnaround: reportTurnaround,
    age_range: ageRange,
    crisis_line: crisisLine,
  };
};

// Map provider row to providers table upsert format
// PULLBACK NOTE: EXPLORE-CARE-PERMANENT-FIX — Phase 2: toProviderUpsertRow function
// OLD: No separate providers table, all data mixed in hospitals table
// NEW: Separate providers table with provider-specific fields
const toProviderUpsertRow = (hospitalId: string, row: any) => {
  const providerType = toSafeString(row?.provider_type, PROVIDER_TYPES.HOSPITAL);

  // Skip provider row for hospitals (they already have comprehensive data in hospitals table)
  if (providerType === "hospital") {
    return null;
  }

  const enrichedData = enrichProviderData(providerType, toSafeStringArray(row?.features));

  return {
    hospital_id: hospitalId,
    provider_type: providerType,
    provider_services: enrichedData.provider_services,
    provider_specialties: enrichedData.provider_specialties,
    insurance_accepted: enrichedData.insurance_accepted,
    structured_hours: enrichedData.structured_hours,
    appointment_required: enrichedData.appointment_required,
    report_turnaround: enrichedData.report_turnaround,
    age_range: enrichedData.age_range,
    crisis_line: enrichedData.crisis_line,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return optionsResponse();
  }

  try {
    console.log("[discover-hospitals] request start", req.method);

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const authClient = createClient(
          getEnv("SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_URL"),
          getEnv("SUPABASE_ANON_KEY", "EXPO_PUBLIC_SUPABASE_ANON_KEY"),
          { global: { headers: { Authorization: authHeader } } }
        );
        const {
          data: { user },
          error: authError,
        } = await authClient.auth.getUser();
        console.log("[discover-hospitals] auth header present", {
          valid: !authError && !!user,
        });
      } catch (authCheckError) {
        console.log(
          "[discover-hospitals] auth check failed, continuing anonymously",
          authCheckError
        );
      }
    }

    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action.trim() : "discover";
    if (action === "enrich_provider") {
      const placeId = toSafeString(body?.placeId ?? body?.place_id);
      if (!placeId) {
        throw new Error("placeId is required");
      }

      const providerCategory: string =
        typeof body?.providerCategory === "string" && CATEGORY_TO_GOOGLE_TYPES[body.providerCategory]
          ? body.providerCategory
          : "hospital";
      const googlePlacesEnabled = getBooleanEnv(false, "ENABLE_GOOGLE_PLACES", "EXPO_PUBLIC_ENABLE_GOOGLE_PLACES");
      const googleApiKey = getEnv(
        "GOOGLE_MAPS_API_KEY",
        "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY",
        "GOOGLE_MAPS_ANDROID_API_KEY",
      );

      if (!googlePlacesEnabled || !googleApiKey) {
        return jsonResponse(
          {
            data: null,
            meta: {
              action,
              provider_category: providerCategory,
              google_enabled: false,
              skip_reason: !googlePlacesEnabled ? "google_places_disabled" : "missing_google_api_key",
            },
          },
        );
      }

      const supabaseClient = createServiceClient();
      const details = await fetchGoogleProviderDetails({ apiKey: googleApiKey, placeId });
      const normalized = withProviderDefaults(
        normalizeGooglePlace(details, 0, 0, 0, buildHospitalMediaProxyUrl),
        "google",
        providerCategory,
      );
      const upsertRow = toHospitalUpsertRow(normalized);
      let persistedRow: any = null;
      let providerPersistenceError: string | null = null;

      if (
        upsertRow?.place_id &&
        upsertRow?.name &&
        upsertRow?.address &&
        Number.isFinite(upsertRow?.latitude) &&
        Number.isFinite(upsertRow?.longitude)
      ) {
        const { data: hospitalRow, error: upsertError } = await supabaseClient
          .from("hospitals")
          .upsert(upsertRow, {
            onConflict: "place_id",
            ignoreDuplicates: false,
          })
          .select("*")
          .maybeSingle();

        if (upsertError) {
          providerPersistenceError = upsertError.message || "provider_upsert_failed";
          console.error("[discover-hospitals] provider detail upsert failed", upsertError);
        } else {
          persistedRow = hospitalRow;
        }
      }

      if (persistedRow?.id) {
        const providerUpsertRow = toProviderUpsertRow(persistedRow.id, {
          ...normalized,
          provider_type: providerCategory,
        });
        if (providerUpsertRow) {
          const { error: providerError } = await supabaseClient
            .from("providers")
            .upsert(providerUpsertRow, {
              onConflict: "hospital_id,provider_type",
              ignoreDuplicates: false,
            });
          if (providerError) {
            providerPersistenceError = providerError.message || providerPersistenceError;
            console.error("[discover-hospitals] provider detail provider-row upsert failed", providerError);
          }
        }
      }

      const enrichedRow = {
        ...(persistedRow || {}),
        ...normalized,
        id: persistedRow?.id ?? normalized.place_id,
        google_phone: normalized.phone,
        google_website: normalized.website,
        google_rating: normalized.rating,
        google_rating_count: (normalized as any).reviews_count,
      };

      return jsonResponse(
        {
          data: enrichedRow,
          meta: {
            action,
            provider_category: providerCategory,
            provider_source: "google",
            google_enabled: true,
            persisted: Boolean(persistedRow?.id),
            provider_persistence_error: providerPersistenceError,
          },
        },
      );
    }

    const latitude = toFiniteNumber(body?.latitude);
    const longitude = toFiniteNumber(body?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("latitude and longitude are required");
    }

    const radius = toFiniteNumber(body?.radius) ?? 15000;
    const mode = body?.mode === "text_search" ? "text_search" : "nearby";
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    const limit = clampLimit(body?.limit);
    const includeProviderDiscovery = body?.includeProviderDiscovery !== false;
    const includeMapboxPlaces = body?.includeMapboxPlaces !== false;
    const googlePlacesEnabled = getBooleanEnv(false, "ENABLE_GOOGLE_PLACES", "EXPO_PUBLIC_ENABLE_GOOGLE_PLACES");
    const includeGooglePlaces = body?.includeGooglePlaces === true && googlePlacesEnabled;
    const mergeWithDatabase = body?.mergeWithDatabase !== false;
    const countryCode = normalizeCountryCode(
      body?.countryCode ?? body?.country_code ?? body?.regionCountryCode
    );
    // EXP-2: Provider category for explore mode. Defaults to "hospital" (emergency flow).
    // Callers in explore mode pass e.g. "pharmacy", "lab", "clinic".
    const providerCategory: string = typeof body?.providerCategory === "string" && CATEGORY_TO_GOOGLE_TYPES[body.providerCategory]
      ? body.providerCategory
      : "hospital";
    const isEmergencyMode = providerCategory === "hospital";
    const regionLocalFirstEnabled = shouldUseRegionLocalFirst(countryCode, providerCategory);

    const mapboxToken = getEnv("MAPBOX_ACCESS_TOKEN", "EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN");
    const googleApiKey = getEnv(
      "GOOGLE_MAPS_API_KEY",
      "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY",
      "GOOGLE_MAPS_ANDROID_API_KEY",
    );

    const supabaseClient = createServiceClient();

    let providerData: any[] = [];
    let providerSource = "database";
    let normalizedProviderHospitals: any[] = [];
    let providerDiscoverySkipped = false;
    let providerDiscoverySkipReason = "";
    let providerPersistenceCount = 0;
    let providerPersistenceErrorCount = 0;
    let localProviderFetchCount = 0;
    let wideProviderFallbackCount = 0;
    let wideProviderFallbackUsed = false;

    const radiusKm = Math.max(1, Math.round(radius / 1000));

    // PULLBACK NOTE: EXPLORE-CARE-PERMANENT-FIX — Gap: Wrong RPC for non-hospital categories
    // OLD: always called nearby_hospitals (filters provider_type='hospital' + emergency_eligible)
    //      → labs, pharmacies, clinics in DB were never returned in explore mode
    // NEW: isEmergencyMode → nearby_hospitals; explore mode → nearby_providers with category filter
    let dbResults: any[] = [];
    if (isEmergencyMode) {
      const { data: nearbyHospitals, error: rpcError } = await supabaseClient.rpc(
        "nearby_hospitals",
        {
          user_lat: latitude,
          user_lng: longitude,
          radius_km: radiusKm,
        }
      );
      if (rpcError) {
        console.error("[discover-hospitals] nearby_hospitals rpc failed", rpcError);
        throw rpcError;
      }
      dbResults = Array.isArray(nearbyHospitals) ? nearbyHospitals : [];
    } else {
      const { data: nearbyProviders, error: rpcError } = await supabaseClient.rpc(
        "nearby_providers",
        {
          user_lat: latitude,
          user_lng: longitude,
          provider_type_filter: providerCategory,
          radius_km: radiusKm,
          result_limit: limit,
        }
      );
      if (rpcError) {
        console.error("[discover-hospitals] nearby_providers rpc failed", rpcError);
        // Non-fatal: continue with empty dbResults, let Mapbox/Google fill the gap
      } else {
        dbResults = Array.isArray(nearbyProviders) ? nearbyProviders : [];
      }
    }
    const dispatchableDbResults = dbResults.filter((row: any) =>
      isDispatchableDatabaseRow(row)
    );
    const localDispatchableDbResults = dispatchableDbResults.filter((row: any) =>
      isWithinDistanceKm(row, MAP_LOCAL_NEARBY_RADIUS_KM)
    );
    // PULLBACK NOTE: EXPLORE-CARE-PERMANENT-FIX — hasEnoughDbResults for explore mode
    // OLD: always used dispatchableDbResults (isDispatchable=false for all non-hospitals)
    //      → explore mode ALWAYS triggered external discovery even when DB had results
    // NEW: explore mode uses category-guarded DB count; emergency mode keeps dispatchable count
    const categoryFilteredDbResults = isEmergencyMode
      ? dbResults
      : dbResults.filter((row: any) => {
          const rowType = toSafeString(row?.provider_type, "hospital").toLowerCase();
          return rowType === providerCategory &&
            shouldKeepProviderForRequestedCategory(row, providerCategory);
        });
    const relevantDbResults = isEmergencyMode ? dispatchableDbResults : categoryFilteredDbResults;
    const localRelevantDbResults = isEmergencyMode
      ? localDispatchableDbResults
      : categoryFilteredDbResults.filter((row: any) => isWithinDistanceKm(row, MAP_LOCAL_NEARBY_RADIUS_KM));
    const databaseComfortTarget =
      mode === "nearby" ? Math.min(limit, MAP_NEARBY_COMFORT_THRESHOLD) : limit;
    const localComfortTarget =
      mode === "nearby"
        ? Math.min(limit, MAP_LOCAL_NEARBY_COMFORT_THRESHOLD)
        : limit;
    const hasEnoughDbResults =
      mergeWithDatabase &&
      relevantDbResults.length >= databaseComfortTarget &&
      localRelevantDbResults.length >= localComfortTarget;
    if (hasEnoughDbResults) {
      providerDiscoverySkipped = true;
      providerDiscoverySkipReason = "database_sufficient";
      console.log("[discover-hospitals] provider discovery skipped", {
        reason: providerDiscoverySkipReason,
        dbCount: dbResults.length,
        dispatchableDbCount: dispatchableDbResults.length,
        localDispatchableDbCount: localDispatchableDbResults.length,
        comfortTarget: databaseComfortTarget,
        localComfortTarget,
        localRadiusKm: MAP_LOCAL_NEARBY_RADIUS_KM,
      });
    }

    if (includeProviderDiscovery && !hasEnoughDbResults) {
      try {
        // Google Places is the primary Explore Care provider source when the
        // server flag is enabled. Mapbox remains a fallback for outage/quota
        // resilience and for local development without Google billing.
        const fetchGooglePlacesForRadius = async (searchRadius: number) => {
          if (!googleApiKey || !includeGooglePlaces) return [];
          console.log("[discover-hospitals] google fetch", {
            providerCategory,
            radius: searchRadius,
            regionLocalFirstEnabled,
            countryCode: countryCode || null,
          });
          return fetchGoogleProviderPlaces({
            apiKey: googleApiKey,
            latitude,
            longitude,
            radius: searchRadius,
            mode,
            query,
            limit,
            providerCategory,
            countryCode,
          });
        };

        const decorateScope = (places: any[], scope: string) =>
          places.map((place: any) => ({ ...place, provider_locality_scope: scope }));

        if (regionLocalFirstEnabled && mode === "nearby") {
          const localRadius = Math.min(radius, MAP_LOCAL_NEARBY_RADIUS_KM * 1000);
          const localGooglePlaces = await fetchGooglePlacesForRadius(localRadius);
          if (localGooglePlaces.length > 0) {
            providerData = decorateScope(localGooglePlaces, LOCALITY_SCOPE_LOCAL);
            providerSource = "google";
          }
          localProviderFetchCount = providerData.length;

          if (providerData.length < localComfortTarget) {
            const wideGooglePlaces = await fetchGooglePlacesForRadius(radius);
            if (wideGooglePlaces.length > 0) {
              providerData = [
                ...providerData,
                ...decorateScope(wideGooglePlaces, LOCALITY_SCOPE_WIDE_FALLBACK),
              ];
              providerSource = "google";
              wideProviderFallbackUsed = true;
              wideProviderFallbackCount = wideGooglePlaces.length;
            }
          }
        } else {
          const googlePlaces = await fetchGooglePlacesForRadius(radius);
          if (googlePlaces.length > 0) {
            providerData = decorateScope(googlePlaces, LOCALITY_SCOPE_LOCAL);
            providerSource = "google";
          }
        }

        // Fallback to Mapbox if Google returns no results or is disabled
        if (providerData.length === 0 && mapboxToken && includeMapboxPlaces) {
          // PULLBACK NOTE: FIX-MAPBOX — category-aware Mapbox fetch strategy
          const specificMapboxCategory = CATEGORY_TO_MAPBOX_CATEGORY[providerCategory] ?? null;
          const keywordForCategory = EXPLORE_CATEGORY_META_KEYWORDS[providerCategory] || providerCategory;

          let mapboxUrl: string;
          if (mode === "text_search" && query) {
            mapboxUrl = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(query)}&proximity=${longitude},${latitude}&types=poi&limit=${limit}&access_token=${mapboxToken}`;
          } else if (specificMapboxCategory) {
            mapboxUrl = `https://api.mapbox.com/search/searchbox/v1/category/${specificMapboxCategory}?proximity=${longitude},${latitude}&limit=${limit}&access_token=${mapboxToken}`;
          } else {
            mapboxUrl = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(keywordForCategory)}&proximity=${longitude},${latitude}&types=poi&limit=${limit}&access_token=${mapboxToken}`;
          }

          console.log("[discover-hospitals] mapbox fallback fetch", { providerCategory, specificMapboxCategory, keywordForCategory });
          const mapboxRes = await fetch(mapboxUrl);
          const mapboxData = await mapboxRes.json();

          providerData = Array.isArray(mapboxData?.features)
            ? mapboxData.features
            : Array.isArray(mapboxData?.suggestions)
            ? mapboxData.suggestions
            : [];
          providerSource = "mapbox";
          providerData = decorateScope(
            providerData,
            regionLocalFirstEnabled ? LOCALITY_SCOPE_WIDE_FALLBACK : LOCALITY_SCOPE_LOCAL
          );
          if (regionLocalFirstEnabled && providerData.length > 0) {
            wideProviderFallbackUsed = true;
            wideProviderFallbackCount = providerData.length;
          }

          if (providerData.length === 0 && specificMapboxCategory && mode !== "text_search") {
            const fallbackQueryUrl = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(keywordForCategory)}&proximity=${longitude},${latitude}&types=poi&limit=${limit}&access_token=${mapboxToken}`;
            console.log("[discover-hospitals] mapbox keyword fallback", { keywordForCategory });
            const fallbackRes = await fetch(fallbackQueryUrl);
            const fallbackData = await fallbackRes.json();

            providerData = Array.isArray(fallbackData?.features)
              ? fallbackData.features
              : Array.isArray(fallbackData?.suggestions)
              ? fallbackData.suggestions
              : [];
            providerData = decorateScope(
              providerData,
              regionLocalFirstEnabled ? LOCALITY_SCOPE_WIDE_FALLBACK : LOCALITY_SCOPE_LOCAL
            );
            if (regionLocalFirstEnabled && providerData.length > 0) {
              wideProviderFallbackUsed = true;
              wideProviderFallbackCount = providerData.length;
            }
          }
        }
      } catch (providerError) {
        console.error("[discover-hospitals] provider fetch failed", providerError);
      }

      normalizedProviderHospitals = providerData
        .map((place: any, index: number) =>
          providerSource === "mapbox"
            ? normalizeMapboxPlace(place, latitude, longitude, index)
            : normalizeGooglePlace(place, latitude, longitude, index, buildHospitalMediaProxyUrl)
        )
        .map((place: any) => withProviderDefaults(place, providerSource, providerCategory))
        .map((place: any) => withDistanceFromOrigin(place, latitude, longitude))
        .filter(
          (place: any) =>
            !!place?.place_id &&
            Number.isFinite(place?.latitude) &&
            Number.isFinite(place?.longitude) &&
            Number.isFinite(place?.distance_km) &&
            place.distance_km <= radius / 1000 &&
            shouldKeepProviderForRequestedCategory(place, providerCategory)
        );

      if (mergeWithDatabase && normalizedProviderHospitals.length > 0) {
        const existingFacilityKeys = new Set(dbResults.map((row: any) => toMergeKey(row)));
        const providerOnlyRows = [];
        const providerSeen = new Set<string>();

        normalizedProviderHospitals.forEach((row: any) => {
          const key = toMergeKey(row);
          if (existingFacilityKeys.has(key)) return;
          if (providerSeen.has(key)) return;
          providerSeen.add(key);
          providerOnlyRows.push(row);
        });

        const providerPlaceIds = providerOnlyRows
          .map((row: any) => toSafeString(row?.place_id))
          .filter((value: string) => value.length > 0);
        const existingByPlaceId = new Map<string, any>();

        if (providerPlaceIds.length > 0) {
          const { data: existingRows, error: existingError } = await supabaseClient
            .from("hospitals")
            .select("place_id,image,image_source,image_confidence,image_attribution_text")
            .in("place_id", providerPlaceIds);

          if (existingError) {
            console.error("[discover-hospitals] existing image lookup failed", existingError);
          } else {
            (Array.isArray(existingRows) ? existingRows : []).forEach((row: any) => {
              const key = toSafeString(row?.place_id);
              if (!key) return;
              existingByPlaceId.set(key, row);
            });
          }
        }

        const upsertRows = providerOnlyRows
          .map((row: any) => {
            const existing = existingByPlaceId.get(toSafeString(row?.place_id));
            const preferredImage = choosePreferredImage(existing, row);
            return toHospitalUpsertRow({
              ...row,
              image: toSafeString(preferredImage?.image, toSafeString(row?.image)),
              image_source: toSafeString(
                preferredImage?.image_source,
                toSafeString(row?.image_source, "deterministic_fallback")
              ),
              image_confidence:
                toFiniteNumber(preferredImage?.image_confidence) ??
                toFiniteNumber(row?.image_confidence) ??
                0.35,
              image_attribution_text: toSafeString(
                preferredImage?.image_attribution_text,
                toSafeString(row?.image_attribution_text)
              ),
            });
          })
          .filter(
            (row: any) =>
              !!row?.place_id &&
              !!row?.name &&
              !!row?.address &&
              Number.isFinite(row?.latitude) &&
              Number.isFinite(row?.longitude)
          );

        if (upsertRows.length > 0) {
          const { error: upsertError } = await supabaseClient
            .from("hospitals")
            .upsert(upsertRows, {
              onConflict: "place_id",
              ignoreDuplicates: false,
            });

          if (upsertError) {
            console.error("[discover-hospitals] provider upsert failed", upsertError);
            const persistedPlaceIds: string[] = [];
            for (const row of upsertRows) {
              const { error: rowUpsertError } = await supabaseClient
                .from("hospitals")
                .upsert(row, {
                  onConflict: "place_id",
                  ignoreDuplicates: false,
                });

              if (!rowUpsertError) {
                persistedPlaceIds.push(toSafeString(row?.place_id));
                continue;
              }

              if (rowUpsertError?.code === "23505") {
                const { data: coordinateMatches, error: coordinateLookupError } = await supabaseClient
                  .from("hospitals")
                  .select("id, provider_type")
                  .eq("latitude", row.latitude)
                  .eq("longitude", row.longitude)
                  .limit(1);
                const coordinateMatch = Array.isArray(coordinateMatches) ? coordinateMatches[0] : null;

                if (!coordinateLookupError && coordinateMatch?.id && coordinateMatch?.provider_type === row.provider_type) {
                  const { error: coordinateUpdateError } = await supabaseClient
                    .from("hospitals")
                    .update(row)
                    .eq("id", coordinateMatch.id);

                  if (!coordinateUpdateError) {
                    persistedPlaceIds.push(toSafeString(row?.place_id));
                    continue;
                  }
                }
              }

              providerPersistenceErrorCount += 1;
              console.error("[discover-hospitals] provider row upsert failed", {
                code: rowUpsertError?.code,
                message: rowUpsertError?.message,
                providerType: row?.provider_type,
              });
            }
            providerPersistenceCount += persistedPlaceIds.filter(Boolean).length;
            providerPlaceIds.splice(0, providerPlaceIds.length, ...persistedPlaceIds.filter(Boolean));
          } else {
            providerPersistenceCount += upsertRows.length;
            // PULLBACK NOTE: EXPLORE-CARE-PERMANENT-FIX — Phase 2: Upsert to providers table
            // OLD: Only upsert to hospitals table (provider-specific data missing)
            // NEW: Also upsert to providers table for provider-specific data enrichment
            const { data: upsertedHospitals, error: hospitalsQueryError } = await supabaseClient
              .from("hospitals")
              .select("id, place_id, provider_type")
              .in("place_id", providerPlaceIds);

            if (hospitalsQueryError) {
              console.error("[discover-hospitals] hospitals query after upsert failed", hospitalsQueryError);
            } else {
              const hospitalsById = new Map<string, any>();
              (Array.isArray(upsertedHospitals) ? upsertedHospitals : []).forEach((row: any) => {
                const key = toSafeString(row?.place_id);
                if (!key) return;
                hospitalsById.set(key, row);
              });

              const providerUpsertRows: any[] = [];
              providerOnlyRows.forEach((row: any) => {
                const placeId = toSafeString(row?.place_id);
                const hospital = hospitalsById.get(placeId);
                if (!hospital) return;

                const providerRow = toProviderUpsertRow(hospital.id, row);
                if (providerRow) {
                  providerUpsertRows.push(providerRow);
                }
              });

              if (providerUpsertRows.length > 0) {
                const { error: providerUpsertError } = await supabaseClient
                  .from("providers")
                  .upsert(providerUpsertRows, {
                    onConflict: "hospital_id,provider_type",
                    ignoreDuplicates: false,
                  });

                if (providerUpsertError) {
                  console.error("[discover-hospitals] providers table upsert failed", providerUpsertError);
                } else {
                  console.log("[discover-hospitals] providers table upsert succeeded", {
                    count: providerUpsertRows.length,
                  });
                }
              }
            }

            // Re-read canonical DB rows so clients receive persisted ids/display_ids.
            // PULLBACK NOTE: EXPLORE-CARE-PERMANENT-FIX — refresh must use same RPC as initial fetch
            // OLD: always refreshed via nearby_hospitals → non-hospital rows lost after upsert
            // NEW: isEmergencyMode → nearby_hospitals; explore → nearby_providers with category filter
            if (isEmergencyMode) {
              const { data: refreshedHospitals, error: refreshError } = await supabaseClient.rpc(
                "nearby_hospitals",
                {
                  user_lat: latitude,
                  user_lng: longitude,
                  radius_km: radiusKm,
                }
              );
              if (refreshError) {
                console.error("[discover-hospitals] nearby_hospitals refresh failed after upsert", refreshError);
              } else {
                dbResults = Array.isArray(refreshedHospitals) ? refreshedHospitals : dbResults;
              }
            } else {
              const { data: refreshedProviders, error: refreshError } = await supabaseClient.rpc(
                "nearby_providers",
                {
                  user_lat: latitude,
                  user_lng: longitude,
                  provider_type_filter: providerCategory,
                  radius_km: radiusKm,
                  result_limit: limit,
                }
              );
              if (refreshError) {
                console.error("[discover-hospitals] nearby_providers refresh failed after upsert", refreshError);
              } else {
                dbResults = Array.isArray(refreshedProviders) ? refreshedProviders : dbResults;
              }
            }
          }
        } else {
          // Re-read canonical DB rows so clients receive persisted ids/display_ids.
          dbResults = Array.isArray(dbResults) ? dbResults : [];
        }
      }
    }
    const providerResults = normalizedProviderHospitals.map(
      (place: any, index: number) => ({
        id: `provider_${providerSource}_${index}`,
        ...place,
        google_phone: toSafeString(place?.phone),
      })
    );
    const providerLocalityByPlaceId = new Map<string, any>();
    providerResults.forEach((row: any) => {
      const placeId = toSafeString(row?.place_id);
      if (!placeId) return;
      providerLocalityByPlaceId.set(placeId, {
        distance_km: parseDistanceKm(row) ?? row?.distance_km,
        provider_locality_scope: toSafeString(row?.provider_locality_scope, LOCALITY_SCOPE_LOCAL),
        is_wide_provider_fallback: row?.is_wide_provider_fallback === true,
      });
    });

    // Merge strategy: keep canonical DB rows first, then append provider-only rows.
    // This prevents empty-state in uncovered regions while preserving verified/canonical data priority.
    const merged: any[] = [];
    const seen = new Set<string>();

    // EXP-6B: Filter DB rows by category before merging.
    // PULLBACK NOTE: EXPLORE-CARE-PERMANENT-FIX — comment updated post RPC fix
    // isEmergencyMode → nearby_hospitals (all dispatchable hospitals, no category filter needed)
    // explore mode → nearby_providers already filtered by provider_type, but secondary guard
    // ensures no cross-category leakage if RPC returns unexpected rows.
    const prioritizedDbResults = prioritizeDatabaseRows(
      isEmergencyMode
        ? dbResults
        : categoryFilteredDbResults
    );

    for (const row of prioritizedDbResults) {
      const locality = providerLocalityByPlaceId.get(toSafeString(row?.place_id));
      const dbRow = withDistanceFromOrigin(locality ? { ...row, ...locality } : row, latitude, longitude);
      const key = toMergeKey(dbRow);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(dbRow);
    }

    for (const row of providerResults) {
      const key = toMergeKey(row);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(row);
    }

    const finalResults = merged;

    const limitedResults = finalResults.slice(0, limit);
    console.log("[discover-hospitals] response", {
      total: limitedResults.length,
      providerSource,
      providerCount: providerData.length,
      dbCount: dbResults.length,
      providerDiscoverySkipped,
      providerDiscoverySkipReason,
      countryCode: countryCode || null,
      regionLocalFirstEnabled,
      localProviderFetchCount,
      wideProviderFallbackCount,
    });

    return jsonResponse(
      {
        data: limitedResults,
        meta: {
          provider_count: providerData.length,
          provider_source: providerSource,
          provider_category: providerCategory,
          is_emergency_mode: isEmergencyMode,
          database_count: dbResults.length,
          dispatchable_database_count: prioritizedDbResults.filter((row: any) =>
            isDispatchableDatabaseRow(row)
          ).length,
          local_dispatchable_database_count: prioritizedDbResults.filter((row: any) =>
            isDispatchableDatabaseRow(row) &&
            isWithinDistanceKm(row, MAP_LOCAL_NEARBY_RADIUS_KM)
          ).length,
          merged_count: limitedResults.length,
          provider_discovery_enabled: includeProviderDiscovery,
          provider_discovery_skipped: providerDiscoverySkipped,
          provider_discovery_skip_reason: providerDiscoverySkipReason || null,
          provider_persistence_count: providerPersistenceCount,
          provider_persistence_error_count: providerPersistenceErrorCount,
          database_comfort_target: databaseComfortTarget,
          local_database_comfort_target: localComfortTarget,
          local_nearby_radius_km: MAP_LOCAL_NEARBY_RADIUS_KM,
          country_code: countryCode || null,
          region_local_first_enabled: regionLocalFirstEnabled,
          region_local_first_country_codes: [...REGION_LOCAL_FIRST_COUNTRY_CODES],
          local_provider_fetch_count: localProviderFetchCount,
          wide_provider_fallback_used: wideProviderFallbackUsed,
          wide_provider_fallback_count: wideProviderFallbackCount,
          mapbox_enabled: includeMapboxPlaces,
          google_enabled: includeGooglePlaces,
          google_places_config_enabled: googlePlacesEnabled,
          mode,
          radius_km: radiusKm,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[discover-hospitals] error", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return jsonResponse(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack || "" : "",
      },
      { status: 500 },
    );
  }
});

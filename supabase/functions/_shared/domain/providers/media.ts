import { toFiniteNumber } from "../numbers.ts";
import { pickFallbackProviderImage } from "./fallbackImages.ts";
import { PROVIDER_TYPES } from "./taxonomy.ts";

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

const IMAGE_SOURCE_RANK: Record<string, number> = {
  hospital_upload: 100,
  official_website_image: 90,
  provider_photo: 86,
  provider_image: 82,
  seed_image: 78,
  domain_logo: 60,
  deterministic_fallback: 20,
};

const toSafeString = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") return fallback;
  const clean = value.trim();
  return clean.length > 0 ? clean : fallback;
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

export const resolveProviderImage = (row: any) => {
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
    image: pickFallbackProviderImage(String(row?.place_id || row?.name || "hospital"), providerCategory),
    image_source: "deterministic_fallback",
    image_confidence: 0.35,
  };
};

export const choosePreferredProviderImage = (existing: any, candidate: any) => {
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

export const buildProviderMediaProxyUrl = (supabaseUrl: string, placeId: string): string => {
  const baseUrl = toSafeString(supabaseUrl).replace(/\/$/, "");
  if (!baseUrl || !placeId) return "";
  return `${baseUrl}/functions/v1/hospital-media?place_id=${encodeURIComponent(placeId)}`;
};

import { getEnv } from "../../env/env.ts";
import {
  isUrl,
  toFiniteNumber,
  toSafeString,
} from "./utils.ts";

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

const IMAGE_SOURCE_RANK: Record<string, number> = {
  hospital_upload: 100,
  official_website_image: 90,
  provider_photo: 86,
  provider_image: 82,
  seed_image: 78,
  domain_logo: 60,
  deterministic_fallback: 20,
};

const parseDomain = (value: unknown) => {
  const urlValue = toSafeString(value, "");
  if (!urlValue) return "";
  try {
    return new URL(urlValue).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};

const isBlockedDomain = (domain: string) =>
  DOMAIN_BLOCKLIST.some(
    (blocked) => domain === blocked || domain.endsWith(`.${blocked}`),
  );

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length >= 2 && !NAME_STOPWORDS.has(token));

const scoreNameDomainAffinity = (name: string, domain: string) => {
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
    (compactDomain.includes(
      compactName.slice(0, Math.min(12, compactName.length)),
    ) ||
      compactName.includes(compactDomain))
      ? 0.65
      : 0;

  return Math.max(tokenScore, compactScore);
};

const buildHospitalMediaProxyUrl = (placeId: string) => {
  const supabaseUrl = toSafeString(
    getEnv("SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_URL"),
    "",
  ).replace(
    /\/$/,
    "",
  );
  if (!supabaseUrl || !placeId) return "";
  return `${supabaseUrl}/functions/v1/hospital-media?place_id=${encodeURIComponent(placeId)}`;
};

export const resolveSeedImage = (row: any) => {
  const sourcePlaceId = toSafeString(row?.source_place_id, "");
  const googlePhotoName = toSafeString(row?.google_photo_name, "");
  if (sourcePlaceId && googlePhotoName) {
    return {
      image: buildHospitalMediaProxyUrl(sourcePlaceId),
      image_source: "provider_photo",
      image_confidence: 0.78,
      image_attribution_text: "Google Places photo",
    };
  }

  const explicitImage = toSafeString(row?.image, "");
  if (explicitImage && isUrl(explicitImage)) {
    return {
      image: explicitImage,
      image_source: "seed_image",
      image_confidence: 0.92,
      image_attribution_text: "",
    };
  }

  const domain = parseDomain(row?.website);
  const name = toSafeString(row?.name, "Hospital");
  if (domain && !isBlockedDomain(domain)) {
    const affinity = scoreNameDomainAffinity(name, domain);
    if (affinity >= 0.45) {
      const confidence = Math.min(
        0.95,
        Number((0.55 + affinity * 0.4).toFixed(2)),
      );
      return {
        image: `https://logo.clearbit.com/${domain}?size=512`,
        image_source: "domain_logo",
        image_confidence: confidence,
        image_attribution_text: "",
      };
    }
  }

  return {
    image: "",
    image_source: "",
    image_confidence: 0,
    image_attribution_text: "",
  };
};

export const choosePreferredImage = (existing: any, candidate: any) => {
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
  if (!existingUrl && !candidateUrl)
    return existingRank >= candidateRank ? existing : candidate;
  if (candidateRank > existingRank) return candidate;
  if (existingRank > candidateRank) return existing;
  if (candidateConfidence > existingConfidence) return candidate;
  return existing;
};

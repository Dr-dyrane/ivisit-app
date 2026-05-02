import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEMO_HOSPITAL_OFFSETS = [
  { lat: 0.0064, lng: 0.0048 },
  { lat: -0.0051, lng: 0.0062 },
  { lat: 0.0042, lng: -0.0068 },
  { lat: -0.0068, lng: -0.0046 },
  { lat: 0.0081, lng: -0.0027 },
  { lat: -0.0029, lng: 0.0084 },
];

const LAGOS_REFERENCE_POINT = {
  latitude: 6.5244,
  longitude: 3.3792,
};

const LAGOS_DEMO_HOSPITAL_TEMPLATES = [
  {
    name: "Lagos Island General Hospital",
    address: "1-3 Broad St, Lagos Island, Lagos",
    latitude: 6.4548,
    longitude: 3.3928,
    phone: "+234 1 234 5678",
    rating: 4.5,
    type: "standard",
    image: "",
    specialties: ["Emergency Medicine", "Internal Medicine", "Cardiology"],
    service_types: ["standard", "premium"],
    features: ["lagos_demo", "island_coverage", "district:lagos_island"],
    emergency_level: "Level 1",
    wait_time: "9 min",
    price_range: "Flexible",
  },
  {
    name: "St. Nicholas Hospital",
    address: "57 Campbell St, Lagos Island, Lagos",
    latitude: 6.4516,
    longitude: 3.3936,
    phone: "+234 1 227 2953",
    rating: 4.4,
    type: "premium",
    image: "",
    specialties: ["Emergency Medicine", "Cardiology", "Critical Care"],
    service_types: ["premium", "standard"],
    features: ["lagos_demo", "island_coverage", "district:lagos_island"],
    emergency_level: "Level 1",
    wait_time: "10 min",
    price_range: "Premium",
  },
  {
    name: "Victoria Island Emergency Centre",
    address: "Ozumba Mbadiwe Ave, Victoria Island, Lagos",
    latitude: 6.4281,
    longitude: 3.4219,
    phone: "+234 1 700 4400",
    rating: 4.4,
    type: "premium",
    image: "",
    specialties: ["Emergency Medicine", "Trauma Care", "Orthopedics"],
    service_types: ["premium", "standard"],
    features: ["lagos_demo", "island_coverage", "district:victoria_island"],
    emergency_level: "Level 1",
    wait_time: "11 min",
    price_range: "Premium",
  },
  {
    name: "First Consultant Medical Centre",
    address: "1 Road 16, Ikoyi, Lagos",
    latitude: 6.4465,
    longitude: 3.4342,
    phone: "+234 1 271 0272",
    rating: 4.3,
    type: "premium",
    image: "",
    specialties: ["Emergency Medicine", "Internal Medicine", "Diagnostics"],
    service_types: ["premium", "standard"],
    features: ["lagos_demo", "island_coverage", "district:ikoyi"],
    emergency_level: "Level 1",
    wait_time: "11 min",
    price_range: "Premium",
  },
  {
    name: "Yaba Community Hospital",
    address: "Herbert Macaulay Way, Yaba, Lagos",
    latitude: 6.5095,
    longitude: 3.3711,
    phone: "+234 1 515 2121",
    rating: 4.3,
    type: "standard",
    image: "",
    specialties: ["Emergency Medicine", "Pediatrics", "Family Medicine"],
    service_types: ["standard", "premium"],
    features: ["lagos_demo", "mainland_coverage", "district:yaba"],
    emergency_level: "Level 2",
    wait_time: "12 min",
    price_range: "Accessible",
  },
  {
    name: "Federal Medical Centre Ebute Metta",
    address: "Point Rd, Ebute Metta, Lagos",
    latitude: 6.4815,
    longitude: 3.3809,
    phone: "+234 1 774 6512",
    rating: 4.2,
    type: "standard",
    image: "",
    specialties: ["Emergency Medicine", "Surgery", "Family Medicine"],
    service_types: ["standard", "premium"],
    features: ["lagos_demo", "mainland_coverage", "district:ebute_metta"],
    emergency_level: "Level 2",
    wait_time: "13 min",
    price_range: "Accessible",
  },
  {
    name: "Surulere Emergency Hospital",
    address: "Bode Thomas St, Surulere, Lagos",
    latitude: 6.5012,
    longitude: 3.3537,
    phone: "+234 1 734 2000",
    rating: 4.2,
    type: "standard",
    image: "",
    specialties: ["Emergency Medicine", "Family Medicine", "Orthopedics"],
    service_types: ["standard", "premium"],
    features: ["lagos_demo", "mainland_coverage", "district:surulere"],
    emergency_level: "Level 2",
    wait_time: "13 min",
    price_range: "Accessible",
  },
  {
    name: "Lagos University Teaching Hospital",
    address: "Idi-Araba, Mushin, Lagos",
    latitude: 6.5178,
    longitude: 3.3559,
    phone: "+234 1 774 4087",
    rating: 4.5,
    type: "standard",
    image: "",
    specialties: ["Emergency Medicine", "Trauma Care", "Critical Care"],
    service_types: ["standard", "premium"],
    features: ["lagos_demo", "mainland_coverage", "district:mushin"],
    emergency_level: "Level 1",
    wait_time: "12 min",
    price_range: "Flexible",
  },
  {
    name: "Gbagada General Hospital",
    address: "1 Hospital Rd, Gbagada, Lagos",
    latitude: 6.5566,
    longitude: 3.3915,
    phone: "+234 1 271 5522",
    rating: 4.2,
    type: "standard",
    image: "",
    specialties: ["Emergency Medicine", "Pediatrics", "Orthopedics"],
    service_types: ["standard", "premium"],
    features: ["lagos_demo", "mainland_coverage", "district:gbagada"],
    emergency_level: "Level 2",
    wait_time: "14 min",
    price_range: "Accessible",
  },
  {
    name: "General Hospital Ikeja",
    address: "1 Oba Akinjobi Way, Ikeja, Lagos",
    latitude: 6.6018,
    longitude: 3.3515,
    phone: "+234 1 493 3380",
    rating: 4.1,
    type: "standard",
    image: "",
    specialties: ["Emergency Medicine", "Internal Medicine", "Surgery"],
    service_types: ["standard", "premium"],
    features: ["lagos_demo", "mainland_coverage", "district:ikeja"],
    emergency_level: "Level 2",
    wait_time: "15 min",
    price_range: "Accessible",
  },
  {
    name: "Lagos State University Teaching Hospital",
    address: "1-5 Oba Akinjobi Way, Ikeja, Lagos",
    latitude: 6.593,
    longitude: 3.3401,
    phone: "+234 1 497 7700",
    rating: 4.3,
    type: "standard",
    image: "",
    specialties: ["Emergency Medicine", "Trauma Care", "Internal Medicine"],
    service_types: ["standard", "premium"],
    features: ["lagos_demo", "mainland_coverage", "district:ikeja"],
    emergency_level: "Level 1",
    wait_time: "14 min",
    price_range: "Flexible",
  },
  {
    name: "Lekki Coast Medical Centre",
    address: "Admiralty Way, Lekki Phase 1, Lagos",
    latitude: 6.4474,
    longitude: 3.4722,
    phone: "+234 1 820 1100",
    rating: 4.4,
    type: "premium",
    image: "",
    specialties: ["Emergency Medicine", "Trauma Care", "Cardiology"],
    service_types: ["premium", "standard"],
    features: ["lagos_demo", "coastal_coverage", "district:lekki"],
    emergency_level: "Level 1",
    wait_time: "10 min",
    price_range: "Premium",
  },
  {
    name: "Reddington Hospital",
    address: "12 Idowu Martins St, Victoria Island, Lagos",
    latitude: 6.4314,
    longitude: 3.4212,
    phone: "+234 1 448 0088",
    rating: 4.4,
    type: "premium",
    image: "",
    specialties: ["Emergency Medicine", "Critical Care", "Cardiology"],
    service_types: ["premium", "standard"],
    features: ["lagos_demo", "island_coverage", "district:victoria_island"],
    emergency_level: "Level 1",
    wait_time: "10 min",
    price_range: "Premium",
  },
];

const CITY_DEMO_FALLBACK_CATALOGS = [
  {
    key: "lagos",
    radiusKm: 120,
    referencePoint: LAGOS_REFERENCE_POINT,
    hospitals: LAGOS_DEMO_HOSPITAL_TEMPLATES,
  },
];

const DEMO_FEATURE_FLAGS = [
  "demo_seed",
  "demo_verified",
  "demo_complete",
  "ivisit_demo",
];
const DEMO_SHARED_FLAG = "demo_shared";

const MAPBOX_PROVIDER_LIMIT = 8;
const GOOGLE_PROVIDER_LIMIT = 8;

const SERVICE_PRICING_BASELINES = [
  {
    service_type: "ambulance",
    service_name: "Basic Life Support",
    base_price: 160,
    description: "Standard ambulance dispatch for urgent but stable transport.",
  },
  {
    service_type: "ambulance_advanced",
    service_name: "Advanced Life Support",
    base_price: 245,
    description:
      "Higher-acuity transport with advanced monitoring and intervention support.",
  },
  {
    service_type: "ambulance_critical",
    service_name: "Critical Care Transport",
    base_price: 360,
    description:
      "ICU-style transport for the highest-risk cases requiring continuous escalation capacity.",
  },
  {
    service_type: "bed",
    service_name: "Bed Reservation",
    base_price: 120,
    description: "Baseline for bed reservation",
  },
];

const ROOM_PRICING_BASELINES = [
  {
    room_type: "general",
    room_name: "General Ward",
    price_per_night: 140,
    description: "Baseline room pricing",
  },
  {
    room_type: "private",
    room_name: "Private Room",
    price_per_night: 260,
    description: "Private room baseline",
  },
];

const DEMO_MIN_HOSPITALS = 5;
const DEMO_MAX_HOSPITALS = 6;
const DEMO_ORG_WALLET_TARGET_BALANCE = 25000;
const DEMO_PLATFORM_WALLET_MIN_BALANCE = 100000;

type DemoContext = {
  userId: string;
  userSlug: string;
  coverageKey: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
};

type DemoFallbackHospital = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  rating?: number;
  type?: string;
  image?: string;
  specialties?: string[];
  service_types?: string[];
  features?: string[];
  emergency_level?: string;
  wait_time?: string;
  price_range?: string;
};

type DemoFallbackCatalog = {
  key: string;
  radiusKm: number;
  referencePoint: {
    latitude: number;
    longitude: number;
  };
  hospitals: DemoFallbackHospital[];
};

const toFiniteNumber = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const toSafeString = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const toSafeUserSlug = (value: string) => {
  const normalized = value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  return normalized.length > 0 ? normalized.toLowerCase() : "guestdemo";
};

const toSafeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const toNonNegativeInt = (value: unknown, fallback = 0): number => {
  const n = toFiniteNumber(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
};

const uniqueStrings = (values: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  values.forEach((value) => {
    const normalized = value.trim();
    if (!normalized) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  });
  return out;
};

const stripDemoSuffixes = (value: string) =>
  value
    .replace(/\s*(?:\((?:demo)\))+$/i, "")
    .replace(/\s*\(demo\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

const normalizeHospitalName = (value: unknown, fallback = "Nearby Hospital") =>
  toSafeString(stripDemoSuffixes(toSafeString(value, fallback)), fallback);
const normalizeFacilityText = (value: unknown) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
const isUrl = (value: string) => /^https?:\/\//i.test(value);
const coordinateKey = (value: unknown, precision = 3) => {
  const n = toFiniteNumber(value);
  return Number.isFinite(n) ? Number(n).toFixed(precision) : "0.000";
};

const toCoverageAxisKey = (value: number) =>
  `${value >= 0 ? "p" : "n"}${Math.round(Math.abs(value) * 100)
    .toString()
    .padStart(4, "0")}`;

const toCoverageKey = (latitude: number, longitude: number) =>
  `${toCoverageAxisKey(latitude)}_${toCoverageAxisKey(longitude)}`;

const toStableIdFragment = (value: string, fallback: string) => {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 32);
  return normalized || fallback;
};

const isBootstrapDemoFeature = (feature: string) => {
  const normalized = String(feature || "")
    .trim()
    .toLowerCase();
  return (
    normalized === DEMO_SHARED_FLAG ||
    normalized === "demo_seed" ||
    normalized === "demo_complete" ||
    normalized === "demo_verified" ||
    normalized === "ivisit_demo" ||
    normalized.startsWith("demo_owner:") ||
    normalized.startsWith("demo_scope:")
  );
};

const isDemoSeedRow = (row: any) => {
  const placeId = toSafeString(row?.place_id, "").toLowerCase();
  const verificationStatus = toSafeString(
    row?.verification_status,
    "",
  ).toLowerCase();
  const featureList = toSafeStringArray(row?.features).map((feature) =>
    feature.toLowerCase(),
  );
  const name = toSafeString(row?.name, "").toLowerCase();
  const address = toSafeString(row?.address, "").toLowerCase();

  return (
    placeId.startsWith("demo:") ||
    verificationStatus.startsWith("demo") ||
    featureList.some((feature) => feature.includes("demo")) ||
    /\(demo\)/i.test(name) ||
    /^emergency care center\s+\d+$/i.test(name) ||
    /^coverage(?:\s+[a-z0-9_:-]+)?\s+zone\s+\d+$/i.test(address)
  );
};

const parseHospitalCoordinates = (
  row: any,
): { latitude: number | null; longitude: number | null } => {
  const lat = toFiniteNumber(row?.latitude);
  const lng = toFiniteNumber(row?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { latitude: lat, longitude: lng };
  }

  const geoLat = toFiniteNumber(row?.coordinates?.coordinates?.[1]);
  const geoLng = toFiniteNumber(row?.coordinates?.coordinates?.[0]);
  if (Number.isFinite(geoLat) && Number.isFinite(geoLng)) {
    return { latitude: geoLat, longitude: geoLng };
  }

  return { latitude: null, longitude: null };
};

const toDemoPlaceId = (
  ctx: DemoContext,
  seed: any,
  slotIndex: number,
): string => {
  const seedScopeKey = resolveDemoSeedScopeKey(ctx);
  const sourcePlaceId = toSafeString(
    seed?.source_place_id || seed?.place_id,
    "",
  );
  if (sourcePlaceId) {
    return `demo:${seedScopeKey}:src:${toStableIdFragment(sourcePlaceId, `slot${slotIndex + 1}`)}`;
  }
  return `demo:${seedScopeKey}:slot:${slotIndex + 1}`;
};

const toAuthEmail = (
  ctx: DemoContext,
  kind: string,
  slotIndex?: number,
): string => {
  const slotSuffix = Number.isFinite(slotIndex)
    ? `-${Number(slotIndex) + 1}`
    : "";
  return `demo-${kind}${slotSuffix}+${resolveDemoSeedScopeKey(ctx)}@ivisit-demo.local`;
};

const toDisplayName = (kind: string, slotIndex?: number): string => {
  const index = Number.isFinite(slotIndex) ? ` ${Number(slotIndex) + 1}` : "";
  if (kind === "admin") return "iVisit Demo Admin";
  if (kind === "doctor") return `Dr Demo Physician${index}`;
  if (kind === "driver") return `Demo Driver${index}`;
  return `Demo User${index}`;
};

const toGeometryPoint = (latitude: number, longitude: number): string =>
  `SRID=4326;POINT(${longitude} ${latitude})`;

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
  const supabaseUrl = toSafeString(Deno.env.get("SUPABASE_URL"), "").replace(
    /\/$/,
    "",
  );
  if (!supabaseUrl || !placeId) return "";
  return `${supabaseUrl}/functions/v1/hospital-media?place_id=${encodeURIComponent(placeId)}`;
};

const resolveSeedImage = (row: any) => {
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
  if (!existingUrl && !candidateUrl)
    return existingRank >= candidateRank ? existing : candidate;
  if (candidateRank > existingRank) return candidate;
  if (existingRank > candidateRank) return existing;
  if (candidateConfidence > existingConfidence) return candidate;
  return existing;
};

const nowIso = () => new Date().toISOString();

const toRadians = (value: number) => (value * Math.PI) / 180;

const haversineDistanceKm = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) => {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(b.latitude - a.latitude);
  const lngDelta = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinLat = Math.sin(latDelta / 2);
  const sinLng = Math.sin(lngDelta / 2);
  const haversine =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(haversine)));
};

const findCityDemoFallbackCatalog = (
  ctx: DemoContext,
): DemoFallbackCatalog | null => {
  const match = CITY_DEMO_FALLBACK_CATALOGS.find((catalog) => {
    const distanceKm = haversineDistanceKm(
      { latitude: ctx.latitude, longitude: ctx.longitude },
      catalog.referencePoint,
    );
    return distanceKm <= catalog.radiusKm;
  });

  return (match as DemoFallbackCatalog | undefined) ?? null;
};

const resolveDemoSeedScopeKey = (ctx: DemoContext) => {
  const catalog = findCityDemoFallbackCatalog(ctx);
  return catalog ? `city_${catalog.key}` : ctx.coverageKey;
};

const getCatalogSeedHospitals = (ctx: DemoContext) => {
  const catalog = findCityDemoFallbackCatalog(ctx);
  if (!catalog) return [];

  return catalog.hospitals
    .map((hospital, index) => ({
      ...hospital,
      source_place_id: `catalog:${catalog.key}:${toStableIdFragment(
        hospital.name,
        `slot${index + 1}`,
      )}`,
      identity_source: "catalog",
      distance_km: haversineDistanceKm(
        { latitude: ctx.latitude, longitude: ctx.longitude },
        { latitude: hospital.latitude, longitude: hospital.longitude },
      ),
      features: uniqueStrings([
        ...toSafeStringArray(hospital.features),
        `catalog:${catalog.key}`,
      ]),
    }))
    .sort((a, b) => a.distance_km - b.distance_km);
};

const getNearbySeedHospitals = async (admin: any, ctx: DemoContext) => {
  const { data, error } = await admin.rpc("nearby_hospitals", {
    user_lat: ctx.latitude,
    user_lng: ctx.longitude,
    radius_km: ctx.radiusKm,
  });

  if (error) {
    throw new Error(`nearby_hospitals rpc failed: ${error.message}`);
  }

  const rows = Array.isArray(data) ? data : [];
  const ids = rows
    .map((row) => toSafeString(row?.id, ""))
    .filter((id) => id.length > 0);
  const metadataById = new Map<string, any>();

  if (ids.length > 0) {
    const { data: metadataRows, error: metadataError } = await admin
      .from("hospitals")
      .select(
        "id,place_id,verification_status,features,image,image_source,image_confidence,image_attribution_text",
      )
      .in("id", ids);

    if (metadataError) {
      throw new Error(
        `hospital seed metadata lookup failed: ${metadataError.message}`,
      );
    }

    (Array.isArray(metadataRows) ? metadataRows : []).forEach((row) => {
      const key = toSafeString(row?.id, "");
      if (!key) return;
      metadataById.set(key, row);
    });
  }

  return rows
    .map((row) => ({
      ...row,
      ...(metadataById.get(toSafeString(row?.id, "")) || {}),
    }))
    .filter((row) => !isDemoSeedRow(row))
    .map((row) => {
      const coords = parseHospitalCoordinates(row);
      return {
        source_place_id: toSafeString(row?.place_id, ""),
        identity_source: "database",
        name: normalizeHospitalName(row?.name, "Nearby Hospital"),
        address: toSafeString(row?.address, "Address unavailable"),
        phone: toSafeString(row?.phone),
        rating: toFiniteNumber(row?.rating) ?? 4.2,
        type: toSafeString(row?.type, "standard"),
        image: toSafeString(row?.image),
        image_source: toSafeString(row?.image_source),
        image_confidence: toFiniteNumber(row?.image_confidence) ?? 0,
        image_attribution_text: toSafeString(row?.image_attribution_text),
        specialties: toSafeStringArray(row?.specialties),
        service_types: toSafeStringArray(row?.service_types),
        features: toSafeStringArray(row?.features),
        emergency_level: toSafeString(row?.emergency_level, "Level 2"),
        wait_time: toSafeString(row?.wait_time, "12 min"),
        price_range: toSafeString(row?.price_range, "Flexible"),
        distance_km: toFiniteNumber(row?.distance_km) ?? 9999,
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
    })
    .sort((a, b) => a.distance_km - b.distance_km);
};

const getMapboxSeedHospitals = async (ctx: DemoContext) => {
  const mapboxToken = Deno.env.get("MAPBOX_ACCESS_TOKEN");
  if (!mapboxToken) return [];

  const categoryUrl = `https://api.mapbox.com/search/searchbox/v1/category/hospital?proximity=${ctx.longitude},${ctx.latitude}&limit=${MAPBOX_PROVIDER_LIMIT}&access_token=${mapboxToken}`;
  const response = await fetch(categoryUrl);

  if (!response.ok) {
    throw new Error(`mapbox hospital discovery failed: ${response.status}`);
  }

  const data = await response.json();
  let rows = Array.isArray(data?.features)
    ? data.features
    : Array.isArray(data?.suggestions)
      ? data.suggestions
      : [];

  if (rows.length === 0) {
    const fallbackQueryUrl = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(
      "hospital",
    )}&proximity=${ctx.longitude},${ctx.latitude}&types=poi&limit=${MAPBOX_PROVIDER_LIMIT}&access_token=${mapboxToken}`;
    const fallbackResponse = await fetch(fallbackQueryUrl);
    if (!fallbackResponse.ok) {
      throw new Error(
        `mapbox hospital text fallback failed: ${fallbackResponse.status}`,
      );
    }
    const fallbackData = await fallbackResponse.json();
    rows = Array.isArray(fallbackData?.features)
      ? fallbackData.features
      : Array.isArray(fallbackData?.suggestions)
        ? fallbackData.suggestions
        : [];
  }

  return rows
    .map((row: any, index: number) => {
      const properties = row?.properties ?? {};
      const geometryCoordinates = Array.isArray(row?.geometry?.coordinates)
        ? row.geometry.coordinates
        : null;
      const centerCoordinates = Array.isArray(row?.center) ? row.center : null;
      const coordinates = geometryCoordinates ?? centerCoordinates;
      const latitude = toFiniteNumber(coordinates?.[1]) ?? ctx.latitude;
      const longitude = toFiniteNumber(coordinates?.[0]) ?? ctx.longitude;
      const website = toSafeString(
        properties?.website,
        toSafeString(
          properties?.metadata?.website,
          toSafeString(properties?.contact?.website, ""),
        ),
      );
      const imageMeta = resolveSeedImage({
        name: properties?.name || row?.name || "Nearby Hospital",
        website,
        image: "",
      });

      return {
        place_id:
          toSafeString(row?.id) ||
          toSafeString(properties?.mapbox_id) ||
          `mapbox_demo_${index}_${Math.abs(Math.round(latitude * 10000))}_${Math.abs(
            Math.round(longitude * 10000),
          )}`,
        source_place_id:
          toSafeString(row?.id) || toSafeString(properties?.mapbox_id, ""),
        identity_source: "provider",
        name: normalizeHospitalName(
          properties?.name,
          normalizeHospitalName(row?.name, "Nearby Hospital"),
        ),
        address: toSafeString(
          properties?.full_address,
          toSafeString(
            properties?.address,
            toSafeString(
              row?.full_address,
              toSafeString(row?.place_formatted, "Address unavailable"),
            ),
          ),
        ),
        phone: toSafeString(
          properties?.phone,
          toSafeString(properties?.metadata?.phone, ""),
        ),
        website,
        rating: 4.2,
        type: "standard",
        image: imageMeta.image,
        image_source: imageMeta.image_source,
        image_confidence: imageMeta.image_confidence,
        specialties: ["Emergency Medicine", "Internal Medicine"],
        service_types: ["standard", "premium"],
        features: ["mapbox_seed", "provider_discovered"],
        emergency_level: "Level 2",
        wait_time: "12 min",
        price_range: "Flexible",
        distance_km: haversineDistanceKm(
          { latitude: ctx.latitude, longitude: ctx.longitude },
          { latitude, longitude },
        ),
        latitude,
        longitude,
      };
    })
    .sort((a: any, b: any) => a.distance_km - b.distance_km);
};

const fetchGoogleNearbyPlaces = async (
  ctx: DemoContext,
  googleApiKey: string,
) => {
  const radiusMeters = Math.max(1000, Math.round(ctx.radiusKm * 1000));
  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchNearby",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googleApiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.photos",
      },
      body: JSON.stringify({
        includedTypes: ["hospital"],
        maxResultCount: GOOGLE_PROVIDER_LIMIT,
        rankPreference: "DISTANCE",
        locationRestriction: {
          circle: {
            center: {
              latitude: ctx.latitude,
              longitude: ctx.longitude,
            },
            radius: radiusMeters,
          },
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`google hospital discovery failed: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data?.places) ? data.places : [];
};

const getGoogleSeedHospitals = async (ctx: DemoContext) => {
  const googleApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!googleApiKey) return [];

  const rows = await fetchGoogleNearbyPlaces(ctx, googleApiKey);

  const mappedRows = await Promise.all(
    rows.map(async (row: any, index: number) => {
      const latitude = toFiniteNumber(row?.location?.latitude) ?? ctx.latitude;
      const longitude =
        toFiniteNumber(row?.location?.longitude) ?? ctx.longitude;
      const sourcePlaceId = toSafeString(row?.id, "");
      const website = toSafeString(row?.websiteUri, "");
      const googlePhotoName = toSafeString(row?.photos?.[0]?.name, "");
      const imageMeta = resolveSeedImage({
        name:
          (typeof row?.displayName === "object"
            ? toSafeString(row?.displayName?.text)
            : toSafeString(row?.displayName)) || row?.name,
        website,
        image: "",
        source_place_id: sourcePlaceId,
        google_photo_name: googlePhotoName,
      });

      return {
        place_id:
          sourcePlaceId ||
          `google_demo_${index}_${Math.abs(Math.round(latitude * 10000))}_${Math.abs(
            Math.round(longitude * 10000),
          )}`,
        source_place_id: sourcePlaceId,
        identity_source: "provider",
        name: normalizeHospitalName(
          typeof row?.displayName === "object"
            ? row?.displayName?.text
            : row?.displayName,
          "Nearby Hospital",
        ),
        address: toSafeString(row?.formattedAddress, "Address unavailable"),
        phone: toSafeString(
          row?.internationalPhoneNumber,
          toSafeString(row?.nationalPhoneNumber, ""),
        ),
        website,
        rating: toFiniteNumber(row?.rating) ?? 4.2,
        type: "standard",
        image: imageMeta.image,
        image_source: imageMeta.image_source,
        image_confidence: imageMeta.image_confidence,
        image_attribution_text: toSafeString(
          imageMeta.image_attribution_text,
          "",
        ),
        google_photo_name: googlePhotoName,
        specialties: ["Emergency Medicine", "Internal Medicine"],
        service_types: ["standard", "premium"],
        features: ["google_seed", "provider_discovered"],
        emergency_level: "Level 2",
        wait_time: "12 min",
        price_range: "Flexible",
        distance_km: haversineDistanceKm(
          { latitude: ctx.latitude, longitude: ctx.longitude },
          { latitude, longitude },
        ),
        latitude,
        longitude,
      };
    }),
  );

  return mappedRows.sort((a: any, b: any) => a.distance_km - b.distance_km);
};

const getProviderSeedHospitals = async (ctx: DemoContext) => {
  const providers: any[] = [];

  try {
    providers.push(...(await getMapboxSeedHospitals(ctx)));
  } catch (error) {
    console.error(
      "[bootstrap-demo-ecosystem] mapbox seed discovery failed",
      error,
    );
  }

  if (providers.length >= DEMO_MIN_HOSPITALS) {
    return dedupeSeedHospitals(providers);
  }

  try {
    providers.push(...(await getGoogleSeedHospitals(ctx)));
  } catch (error) {
    console.error(
      "[bootstrap-demo-ecosystem] google seed discovery failed",
      error,
    );
  }

  return dedupeSeedHospitals(providers);
};

const dedupeSeedHospitals = (rows: any[]) => {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = [
      normalizeHospitalName(row?.name).toLowerCase(),
      toSafeString(row?.address).toLowerCase(),
      coordinateKey(row?.latitude),
      coordinateKey(row?.longitude),
    ].join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildFallbackHospital = (ctx: DemoContext, slotIndex: number) => {
  const offset =
    DEMO_HOSPITAL_OFFSETS[slotIndex % DEMO_HOSPITAL_OFFSETS.length];
  const latitude = ctx.latitude + offset.lat;
  const longitude = ctx.longitude + offset.lng;

  return {
    source_place_id: "",
    name: `Emergency Care Center ${slotIndex + 1}`,
    address: `Coverage ${resolveDemoSeedScopeKey(ctx).toUpperCase()} Zone ${slotIndex + 1}`,
    phone: "",
    rating: 4.3,
    type: "standard",
    image: "",
    specialties: ["Emergency Medicine", "Internal Medicine"],
    service_types: ["standard", "premium"],
    features: [],
    emergency_level: "Level 2",
    wait_time: "10 min",
    price_range: "Flexible",
    latitude,
    longitude,
  };
};

const ensureDemoOrganization = async (admin: any, ctx: DemoContext) => {
  const scopeKey = resolveDemoSeedScopeKey(ctx);
  const contactEmail = `demo+coverage-${scopeKey}@ivisit-demo.local`;

  const { data: existing, error: existingError } = await admin
    .from("organizations")
    .select("id,name,contact_email")
    .eq("contact_email", contactEmail)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(`organization lookup failed: ${existingError.message}`);
  }

  if (existing?.id) {
    return { organization: existing, created: false };
  }

  const payload = {
    name: `iVisit Coverage Network ${scopeKey.toUpperCase()}`,
    contact_email: contactEmail,
    fee_tier: "standard",
    ivisit_fee_percentage: 2.5,
    is_active: true,
    updated_at: nowIso(),
  };

  const { data: created, error: createError } = await admin
    .from("organizations")
    .insert(payload)
    .select("id,name,contact_email")
    .single();

  if (createError) {
    throw new Error(`organization create failed: ${createError.message}`);
  }

  return { organization: created, created: true };
};

const ensureDemoFinancialReadiness = async (
  admin: any,
  organizationId: string,
) => {
  const { error: orgUpdateError } = await admin
    .from("organizations")
    .update({
      ivisit_fee_percentage: 2.5,
      is_active: true,
      updated_at: nowIso(),
    })
    .eq("id", organizationId);

  if (orgUpdateError) {
    throw new Error(
      `organization finance sync failed: ${orgUpdateError.message}`,
    );
  }

  const { data: orgWallet, error: orgWalletError } = await admin
    .from("organization_wallets")
    .upsert(
      {
        organization_id: organizationId,
        balance: DEMO_ORG_WALLET_TARGET_BALANCE,
        currency: "USD",
        updated_at: nowIso(),
      },
      { onConflict: "organization_id", ignoreDuplicates: false },
    )
    .select("id,balance,currency")
    .single();

  if (orgWalletError) {
    throw new Error(
      `organization wallet sync failed: ${orgWalletError.message}`,
    );
  }

  const { data: platformWallet, error: platformLookupError } = await admin
    .from("ivisit_main_wallet")
    .select("id,balance,currency")
    .order("last_updated", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (platformLookupError) {
    throw new Error(
      `platform wallet lookup failed: ${platformLookupError.message}`,
    );
  }

  let resolvedPlatformWallet = platformWallet;
  if (!resolvedPlatformWallet?.id) {
    const { data: createdPlatformWallet, error: createPlatformWalletError } =
      await admin
        .from("ivisit_main_wallet")
        .insert({
          balance: DEMO_PLATFORM_WALLET_MIN_BALANCE,
          currency: "USD",
          last_updated: nowIso(),
        })
        .select("id,balance,currency")
        .single();

    if (createPlatformWalletError) {
      throw new Error(
        `platform wallet create failed: ${createPlatformWalletError.message}`,
      );
    }

    resolvedPlatformWallet = createdPlatformWallet;
  } else {
    const currentPlatformBalance = Number(resolvedPlatformWallet.balance || 0);
    if (currentPlatformBalance < DEMO_PLATFORM_WALLET_MIN_BALANCE) {
      const { data: updatedPlatformWallet, error: updatePlatformWalletError } =
        await admin
          .from("ivisit_main_wallet")
          .update({
            balance: DEMO_PLATFORM_WALLET_MIN_BALANCE,
            last_updated: nowIso(),
          })
          .eq("id", resolvedPlatformWallet.id)
          .select("id,balance,currency")
          .single();

      if (updatePlatformWalletError) {
        throw new Error(
          `platform wallet top-up failed: ${updatePlatformWalletError.message}`,
        );
      }

      resolvedPlatformWallet = updatedPlatformWallet;
    }
  }

  return {
    organization_wallet_balance: Number(orgWallet?.balance || 0),
    platform_wallet_balance: Number(resolvedPlatformWallet?.balance || 0),
    fee_percentage: 2.5,
    financial_ready: true,
  };
};

const listDemoHospitals = async (
  admin: any,
  ctx: DemoContext,
  organizationId: string,
) => {
  const { data, error } = await admin
    .from("hospitals")
    .select(
      "id,name,place_id,organization_id,latitude,longitude,features,verified,verification_status,status",
    )
    .eq("organization_id", organizationId)
    .like("place_id", "demo:%")
    .eq("status", "available")
    .order("place_id", { ascending: true });

  if (error) {
    throw new Error(`demo hospital lookup failed: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
};

const ensureDemoHospitals = async (
  admin: any,
  ctx: DemoContext,
  organizationId: string,
  orgAdminId: string | null,
) => {
  const catalog = findCityDemoFallbackCatalog(ctx);
  const nearbySeeds = await getNearbySeedHospitals(admin, ctx);
  const providerSeeds =
    nearbySeeds.length >= DEMO_MIN_HOSPITALS
      ? []
      : await getProviderSeedHospitals(ctx);
  const catalogSeeds =
    nearbySeeds.length + providerSeeds.length >= DEMO_MIN_HOSPITALS
      ? []
      : getCatalogSeedHospitals(ctx);
  const seeds = dedupeSeedHospitals([
    ...nearbySeeds,
    ...providerSeeds,
    ...catalogSeeds,
  ]);
  const targetCount = Math.max(
    DEMO_MIN_HOSPITALS,
    Math.min(
      DEMO_MAX_HOSPITALS,
      seeds.length > 0 ? seeds.length : DEMO_MIN_HOSPITALS,
    ),
  );

  const baseRows = new Array(targetCount).fill(null).map((_, slotIndex) => {
    const seed = seeds[slotIndex] ?? buildFallbackHospital(ctx, slotIndex);
    const fallback = buildFallbackHospital(ctx, slotIndex);
    const latitude = Number.isFinite(seed.latitude)
      ? Number(seed.latitude)
      : fallback.latitude;
    const longitude = Number.isFinite(seed.longitude)
      ? Number(seed.longitude)
      : fallback.longitude;
    const features = uniqueStrings([
      ...DEMO_FEATURE_FLAGS,
      DEMO_SHARED_FLAG,
      `demo_scope:${ctx.coverageKey}`,
      ...toSafeStringArray(seed.features).filter(
        (feature) => !isBootstrapDemoFeature(feature),
      ),
    ]);

    const specialties = uniqueStrings(
      toSafeStringArray(seed.specialties).length > 0
        ? toSafeStringArray(seed.specialties)
        : ["Emergency Medicine", "Internal Medicine"],
    );

    const serviceTypes = uniqueStrings(
      toSafeStringArray(seed.service_types).length > 0
        ? toSafeStringArray(seed.service_types)
        : ["standard", "premium"],
    );

    const seedImageMeta = resolveSeedImage(seed);

    return {
      place_id: toDemoPlaceId(ctx, seed, slotIndex),
      name: normalizeHospitalName(seed.name, fallback.name),
      address: toSafeString(seed.address, fallback.address),
      phone: toSafeString(seed.phone, ""),
      rating: toFiniteNumber(seed.rating) ?? 4.2,
      type: toSafeString(seed.type, "standard"),
      image: toSafeString(seedImageMeta.image, ""),
      image_source: toSafeString(seedImageMeta.image_source, ""),
      image_confidence: toFiniteNumber(seedImageMeta.image_confidence) ?? 0,
      image_attribution_text: toSafeString(
        seedImageMeta.image_attribution_text,
        "",
      ),
      specialties,
      service_types: serviceTypes,
      features,
      emergency_level: toSafeString(seed.emergency_level, "Level 2"),
      available_beds: Math.max(
        6,
        toNonNegativeInt((seed as any).available_beds, 12),
      ),
      ambulances_count: 1,
      wait_time: toSafeString(seed.wait_time, "12 min"),
      price_range: toSafeString(seed.price_range, "Flexible"),
      latitude,
      longitude,
      coordinates: toGeometryPoint(latitude, longitude),
      // Demo hospitals must behave like fully dispatchable coverage providers in-app.
      // We preserve demo provenance via place_id/features while surfacing them as verified.
      verified: true,
      verification_status: "verified",
      status: "available",
      organization_id: organizationId,
      org_admin_id: orgAdminId,
      updated_at: nowIso(),
    };
  });

  const placeIds = baseRows
    .map((row) => toSafeString(row?.place_id, ""))
    .filter((value) => value.length > 0);
  const existingByPlaceId = new Map<string, any>();
  if (placeIds.length > 0) {
    const { data: existingRows, error: existingError } = await admin
      .from("hospitals")
      .select(
        "place_id,image,image_source,image_confidence,image_attribution_text",
      )
      .in("place_id", placeIds);

    if (existingError) {
      throw new Error(
        `demo hospital image lookup failed: ${existingError.message}`,
      );
    }

    (Array.isArray(existingRows) ? existingRows : []).forEach((row) => {
      const key = toSafeString(row?.place_id, "");
      if (!key) return;
      existingByPlaceId.set(key, row);
    });
  }

  const rows = baseRows.map((row) => {
    const existing = existingByPlaceId.get(toSafeString(row?.place_id, ""));
    const preferredImage = choosePreferredImage(existing, row);
    return {
      ...row,
      image: toSafeString(preferredImage?.image, ""),
      image_source: toSafeString(preferredImage?.image_source, ""),
      image_confidence: toFiniteNumber(preferredImage?.image_confidence) ?? 0,
      image_attribution_text: toSafeString(
        preferredImage?.image_attribution_text,
        toSafeString(row?.image_attribution_text, ""),
      ),
      image_synced_at:
        toSafeString(preferredImage?.image, "").length > 0 ? nowIso() : null,
    };
  });

  const { error: upsertError } = await admin
    .from("hospitals")
    .upsert(rows, { onConflict: "place_id", ignoreDuplicates: false });

  if (upsertError) {
    throw new Error(`demo hospital upsert failed: ${upsertError.message}`);
  }

  if (catalog) {
    const slotPrefix = `demo:${resolveDemoSeedScopeKey(ctx)}:slot:`;
    const { error: cleanupError } = await admin
      .from("hospitals")
      .delete()
      .eq("organization_id", organizationId)
      .like("place_id", `${slotPrefix}%`);

    if (cleanupError) {
      throw new Error(`catalog slot cleanup failed: ${cleanupError.message}`);
    }

    const catalogNames = catalog.hospitals.map((hospital) => hospital.name);
    const { error: retireError } = await admin
      .from("hospitals")
      .update({
        status: "full",
        updated_at: nowIso(),
      })
      .neq("organization_id", organizationId)
      .like("place_id", "demo:%")
      .in("name", catalogNames);

    if (retireError) {
      throw new Error(
        `catalog legacy retirement failed: ${retireError.message}`,
      );
    }
  }

  const activePlaceIds = rows
    .map((row) => toSafeString(row?.place_id, ""))
    .filter((value) => value.length > 0);

  const { data: existingOrgDemoRows, error: existingOrgDemoRowsError } =
    await admin
      .from("hospitals")
      .select("id,place_id")
      .eq("organization_id", organizationId)
      .like("place_id", "demo:%");

  if (existingOrgDemoRowsError) {
    throw new Error(
      `org demo hospital sweep failed: ${existingOrgDemoRowsError.message}`,
    );
  }

  const staleOrgDemoIds = (
    Array.isArray(existingOrgDemoRows) ? existingOrgDemoRows : []
  )
    .filter((row) => !activePlaceIds.includes(toSafeString(row?.place_id, "")))
    .map((row) => row.id)
    .filter(Boolean);

  if (staleOrgDemoIds.length > 0) {
    const { error: retireStaleOrgRowsError } = await admin
      .from("hospitals")
      .update({
        status: "full",
        updated_at: nowIso(),
      })
      .in("id", staleOrgDemoIds);

    if (retireStaleOrgRowsError) {
      throw new Error(
        `org demo hospital retirement failed: ${retireStaleOrgRowsError.message}`,
      );
    }
  }

  const { data: activeHospitals, error: activeHospitalsError } = await admin
    .from("hospitals")
    .select(
      "id,name,place_id,organization_id,latitude,longitude,features,verified,verification_status,status",
    )
    .eq("organization_id", organizationId)
    .in("place_id", activePlaceIds)
    .order("place_id", { ascending: true });

  if (activeHospitalsError) {
    throw new Error(
      `active demo hospital lookup failed: ${activeHospitalsError.message}`,
    );
  }

  return Array.isArray(activeHospitals) ? activeHospitals : [];
};

const findAuthUserByEmail = async (admin: any, email: string) => {
  const target = email.toLowerCase();
  let page = 1;
  const perPage = 200;

  while (page <= 25) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`auth listUsers failed: ${error.message}`);
    }

    const users = data?.users || [];
    const found = users.find(
      (user: any) => String(user?.email || "").toLowerCase() === target,
    );
    if (found) return found;
    if (users.length < perPage) break;
    page += 1;
  }

  return null;
};

const ensureAuthUser = async (
  admin: any,
  email: string,
  fullName: string,
  role: string,
) => {
  const password = `DemoPass!${email.slice(0, 6)}#2026`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
      source: "demo_bootstrap",
    },
  });

  if (!error && data?.user) {
    return { user: data.user, created: true };
  }

  const message = String(error?.message || "");
  const isDuplicate =
    message.toLowerCase().includes("already") ||
    message.toLowerCase().includes("exists");

  if (!isDuplicate) {
    throw new Error(`auth createUser failed: ${message || "unknown error"}`);
  }

  const existing = await findAuthUserByEmail(admin, email);
  if (!existing) {
    throw new Error(`duplicate user reported but lookup failed for ${email}`);
  }

  return { user: existing, created: false };
};

const syncProfileRole = async (
  admin: any,
  userId: string,
  patch: Record<string, unknown>,
) => {
  const { error } = await admin
    .from("profiles")
    .update({
      ...patch,
      updated_at: nowIso(),
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`profile sync failed (${userId}): ${error.message}`);
  }
};

const ensureDemoStaff = async (
  admin: any,
  ctx: DemoContext,
  organizationId: string,
  hospitals: any[],
) => {
  const adminAccount = await ensureAuthUser(
    admin,
    toAuthEmail(ctx, "admin"),
    toDisplayName("admin"),
    "org_admin",
  );

  await syncProfileRole(admin, adminAccount.user.id, {
    role: "org_admin",
    organization_id: organizationId,
    full_name: toDisplayName("admin"),
  });

  const staffSummary: any[] = [];

  for (let i = 0; i < hospitals.length; i += 1) {
    const hospital = hospitals[i];
    const doctorAccount = await ensureAuthUser(
      admin,
      toAuthEmail(ctx, "doctor", i),
      toDisplayName("doctor", i),
      "provider",
    );
    const driverAccount = await ensureAuthUser(
      admin,
      toAuthEmail(ctx, "driver", i),
      toDisplayName("driver", i),
      "provider",
    );

    await syncProfileRole(admin, doctorAccount.user.id, {
      role: "provider",
      provider_type: "doctor",
      organization_id: organizationId,
      full_name: toDisplayName("doctor", i),
    });

    await syncProfileRole(admin, driverAccount.user.id, {
      role: "provider",
      provider_type: "driver",
      organization_id: organizationId,
      full_name: toDisplayName("driver", i),
    });

    const { error: doctorError } = await admin.from("doctors").upsert(
      {
        profile_id: doctorAccount.user.id,
        hospital_id: hospital.id,
        name: toDisplayName("doctor", i),
        specialization: "Emergency Medicine",
        status: "available",
        is_available: true,
        max_patients: 8,
        current_patients: 0,
        email: toAuthEmail(ctx, "doctor", i),
      },
      { onConflict: "profile_id", ignoreDuplicates: false },
    );

    if (doctorError) {
      throw new Error(`doctor upsert failed: ${doctorError.message}`);
    }

    const callSign = `D-AMB-${i + 1}`;
    const { data: ambulance, error: ambulanceError } = await admin
      .from("ambulances")
      .upsert(
        {
          hospital_id: hospital.id,
          organization_id: organizationId,
          profile_id: driverAccount.user.id,
          type: "BLS",
          call_sign: callSign,
          status: "available",
          vehicle_number: `COV-${resolveDemoSeedScopeKey(ctx).toUpperCase().slice(0, 8)}-${i + 1}`,
          license_plate: `COV-${resolveDemoSeedScopeKey(ctx).toUpperCase().slice(0, 4)}-${i + 1}`,
          base_price: 0,
          crew: {
            mode: "demo",
            label: "Demo Crew",
          },
          location: toGeometryPoint(
            toFiniteNumber(hospital?.latitude) ?? ctx.latitude,
            toFiniteNumber(hospital?.longitude) ?? ctx.longitude,
          ),
          updated_at: nowIso(),
        },
        { onConflict: "profile_id", ignoreDuplicates: false },
      )
      .select("id")
      .single();

    if (ambulanceError) {
      throw new Error(`ambulance upsert failed: ${ambulanceError.message}`);
    }

    await syncProfileRole(admin, driverAccount.user.id, {
      assigned_ambulance_id: ambulance?.id ?? null,
    });

    const { error: hospitalPatchError } = await admin
      .from("hospitals")
      .update({
        org_admin_id: adminAccount.user.id,
        ambulances_count: 1,
        updated_at: nowIso(),
      })
      .eq("id", hospital.id);

    if (hospitalPatchError) {
      throw new Error(`hospital patch failed: ${hospitalPatchError.message}`);
    }

    staffSummary.push({
      hospital_id: hospital.id,
      doctor_profile_id: doctorAccount.user.id,
      driver_profile_id: driverAccount.user.id,
      ambulance_id: ambulance?.id ?? null,
      created_flags: {
        doctor_user_created: doctorAccount.created,
        driver_user_created: driverAccount.created,
      },
    });
  }

  return {
    org_admin_profile_id: adminAccount.user.id,
    org_admin_created: adminAccount.created,
    hospitals_staffed: staffSummary.length,
    staff: staffSummary,
  };
};

const ensureDemoPricing = async (admin: any, hospitals: any[]) => {
  for (const hospital of hospitals) {
    for (const baseline of SERVICE_PRICING_BASELINES) {
      const { error } = await admin.rpc("upsert_service_pricing", {
        payload: {
          hospital_id: hospital.id,
          service_type: baseline.service_type,
          service_name: baseline.service_name,
          base_price: baseline.base_price,
          description: baseline.description,
        },
      });
      if (error) {
        throw new Error(`service pricing upsert failed: ${error.message}`);
      }
    }

    for (const baseline of ROOM_PRICING_BASELINES) {
      const { error } = await admin.rpc("upsert_room_pricing", {
        payload: {
          hospital_id: hospital.id,
          room_type: baseline.room_type,
          room_name: baseline.room_name,
          price_per_night: baseline.price_per_night,
          description: baseline.description,
        },
      });
      if (error) {
        throw new Error(`room pricing upsert failed: ${error.message}`);
      }
    }
  }

  return {
    hospitals_priced: hospitals.length,
    service_pricing_rows_expected:
      hospitals.length * SERVICE_PRICING_BASELINES.length,
    room_pricing_rows_expected:
      hospitals.length * ROOM_PRICING_BASELINES.length,
  };
};

const getDemoSummary = async (
  admin: any,
  ctx: DemoContext,
  organizationId: string,
) => {
  const hospitals = await listDemoHospitals(admin, ctx, organizationId);
  const hospitalIds = hospitals.map((h) => h.id).filter(Boolean);

  let doctorsCount = 0;
  let ambulancesCount = 0;
  let servicePricingCount = 0;
  let roomPricingCount = 0;
  let orgWalletBalance = 0;
  let platformWalletBalance = 0;
  let orgFeePercentage = 0;

  if (hospitalIds.length > 0) {
    const { count: doctors, error: doctorsError } = await admin
      .from("doctors")
      .select("id", { count: "exact", head: true })
      .in("hospital_id", hospitalIds);
    if (doctorsError) {
      throw new Error(`summary doctors count failed: ${doctorsError.message}`);
    }
    doctorsCount = Number(doctors || 0);

    const { count: ambulances, error: ambulancesError } = await admin
      .from("ambulances")
      .select("id", { count: "exact", head: true })
      .in("hospital_id", hospitalIds);
    if (ambulancesError) {
      throw new Error(
        `summary ambulances count failed: ${ambulancesError.message}`,
      );
    }
    ambulancesCount = Number(ambulances || 0);

    const { count: servicePricing, error: servicePricingError } = await admin
      .from("service_pricing")
      .select("id", { count: "exact", head: true })
      .in("hospital_id", hospitalIds);
    if (servicePricingError) {
      throw new Error(
        `summary service pricing count failed: ${servicePricingError.message}`,
      );
    }
    servicePricingCount = Number(servicePricing || 0);

    const { count: roomPricing, error: roomPricingError } = await admin
      .from("room_pricing")
      .select("id", { count: "exact", head: true })
      .in("hospital_id", hospitalIds);
    if (roomPricingError) {
      throw new Error(
        `summary room pricing count failed: ${roomPricingError.message}`,
      );
    }
    roomPricingCount = Number(roomPricing || 0);
  }

  const { data: orgWallet } = await admin
    .from("organization_wallets")
    .select("balance")
    .eq("organization_id", organizationId)
    .maybeSingle();
  orgWalletBalance = Number(orgWallet?.balance || 0);

  const { data: platformWallet } = await admin
    .from("ivisit_main_wallet")
    .select("balance")
    .order("last_updated", { ascending: false })
    .limit(1)
    .maybeSingle();
  platformWalletBalance = Number(platformWallet?.balance || 0);

  const { data: organizationRow } = await admin
    .from("organizations")
    .select("ivisit_fee_percentage")
    .eq("id", organizationId)
    .maybeSingle();
  orgFeePercentage = Number(organizationRow?.ivisit_fee_percentage || 0);

  const hospitalsReady = hospitals.length >= DEMO_MIN_HOSPITALS;
  const staffingReady =
    hospitalsReady &&
    doctorsCount >= hospitals.length &&
    ambulancesCount >= hospitals.length;
  const pricingReady =
    hospitalsReady &&
    servicePricingCount >=
      hospitals.length * SERVICE_PRICING_BASELINES.length &&
    roomPricingCount >= hospitals.length * ROOM_PRICING_BASELINES.length;
  const financialReady =
    orgWalletBalance >= DEMO_ORG_WALLET_TARGET_BALANCE &&
    platformWalletBalance >= DEMO_PLATFORM_WALLET_MIN_BALANCE &&
    orgFeePercentage > 0;
  const dispatchReady = hospitalsReady && staffingReady && financialReady;
  const cleanCycleReady = dispatchReady && pricingReady;

  return {
    organization_id: organizationId,
    hospitals_count: hospitals.length,
    doctors_count: doctorsCount,
    ambulances_count: ambulancesCount,
    service_pricing_count: servicePricingCount,
    room_pricing_count: roomPricingCount,
    organization_wallet_balance: orgWalletBalance,
    platform_wallet_balance: platformWalletBalance,
    ivisit_fee_percentage: orgFeePercentage,
    coverage_ready: hospitalsReady,
    staffing_ready: staffingReady,
    pricing_ready: pricingReady,
    financial_ready: financialReady,
    dispatch_ready: dispatchReady,
    clean_cycle_ready: cleanCycleReady,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Supabase environment is not configured");
    }

    const body = await req.json();
    const phase = toSafeString(body?.phase, "full");
    const requestedUserId = toSafeString(body?.userId, "");
    const latitude = toFiniteNumber(body?.latitude);
    const longitude = toFiniteNumber(body?.longitude);
    const radiusKm = Math.max(
      1,
      Math.min(100, Math.round(toFiniteNumber(body?.radiusKm) ?? 50)),
    );

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("latitude and longitude are required");
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: authHeader
        ? { headers: { Authorization: authHeader } }
        : undefined,
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    const effectiveUserId =
      !userError && user?.id
        ? String(user.id)
        : toSafeString(requestedUserId, "");

    if (!effectiveUserId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx: DemoContext = {
      userId: effectiveUserId,
      userSlug: toSafeUserSlug(effectiveUserId),
      coverageKey: toCoverageKey(Number(latitude), Number(longitude)),
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusKm,
    };

    const timeline: any[] = [];
    const runStep = async (step: string, action: () => Promise<any>) => {
      const startedAt = Date.now();
      const data = await action();
      timeline.push({
        step,
        duration_ms: Date.now() - startedAt,
        data,
      });
      return data;
    };

    const organizationResult = await runStep("ensure_org", () =>
      ensureDemoOrganization(adminClient, ctx),
    );

    const organizationId = organizationResult.organization.id;
    let hospitals: any[] = [];

    if (phase === "prepare") {
      const nearbySeeds = await runStep("preview_nearby_sources", () =>
        getNearbySeedHospitals(adminClient, ctx),
      );

      return new Response(
        JSON.stringify({
          ok: true,
          phase,
          organization_id: organizationId,
          preview: {
            nearby_candidates: nearbySeeds.slice(0, 5).map((seed: any) => ({
              name: seed.name,
              address: seed.address,
              distance_km: seed.distance_km,
            })),
            candidate_count: nearbySeeds.length,
          },
          timeline,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (
      phase === "hospitals" ||
      phase === "staff" ||
      phase === "pricing" ||
      phase === "full"
    ) {
      hospitals = await runStep("ensure_demo_hospitals", () =>
        ensureDemoHospitals(adminClient, ctx, organizationId, null),
      );
    }

    if (phase === "staff" || phase === "pricing" || phase === "full") {
      const staffing = await runStep("ensure_demo_staff", () =>
        ensureDemoStaff(adminClient, ctx, organizationId, hospitals),
      );

      hospitals = await runStep("refresh_demo_hospitals_after_staff", () =>
        ensureDemoHospitals(
          adminClient,
          ctx,
          organizationId,
          staffing.org_admin_profile_id ?? null,
        ),
      );
    }

    if (phase === "pricing" || phase === "full") {
      await runStep("ensure_demo_finance", () =>
        ensureDemoFinancialReadiness(adminClient, organizationId),
      );
      await runStep("ensure_demo_pricing", () =>
        ensureDemoPricing(adminClient, hospitals),
      );
    }

    const summary = await runStep("summary", () =>
      getDemoSummary(adminClient, ctx, organizationId),
    );

    return new Response(
      JSON.stringify({
        ok: true,
        phase,
        organization_id: organizationId,
        hospitals: hospitals.map((hospital: any) => ({
          id: hospital.id,
          name: hospital.name,
          place_id: hospital.place_id,
        })),
        summary,
        timeline,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        ok: false,
        error: message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const toFiniteNumber = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const clampLimit = (value: unknown): number => {
  const n = toFiniteNumber(value);
  if (!Number.isFinite(n)) return 10;
  return Math.max(1, Math.min(25, Math.round(n)));
};

const DEFAULT_HOSPITAL_IMAGES = [
  "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1632833239869-a37e3a5806d2?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1551190822-a9333d879b1f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1200&q=80",
];

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

const toNonNegativeInt = (value: unknown, fallback = 0): number => {
  const n = toFiniteNumber(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
};

const normalizeFacilityText = (value: unknown): string =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const MAP_NEARBY_COMFORT_THRESHOLD = 5;

const coordinateKey = (value: unknown, precision = 3): string | null => {
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

  return (
    status === "available" &&
    (row?.verified === true ||
      isDemoDatabaseRow(row) ||
      verificationStatus === "verified" ||
      verificationStatus === "not_certified")
  );
};

const parseDistanceKm = (row: any): number | null => {
  const numericDistance = toFiniteNumber(row?.distance_km ?? row?.distanceKm);
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

const pickFallbackHospitalImage = (seed: string): string => {
  const key = seed || "hospital";
  const idx = hashString(key) % DEFAULT_HOSPITAL_IMAGES.length;
  return DEFAULT_HOSPITAL_IMAGES[idx];
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
  const supabaseUrl = toSafeString(Deno.env.get("SUPABASE_URL"), "").replace(/\/$/, "");
  if (!supabaseUrl || !placeId) return "";
  return `${supabaseUrl}/functions/v1/hospital-media?place_id=${encodeURIComponent(placeId)}`;
};

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

  return {
    image: pickFallbackHospitalImage(String(row?.place_id || row?.name || "hospital")),
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

const withProviderDefaults = (row: any, providerSource: string) => {
  const normalized = {
    place_id: toSafeString(row?.place_id),
    name: toSafeString(row?.name, "Unnamed Hospital"),
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
    emergency_level: toSafeString(row?.emergency_level, "Standard"),
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
    image: toSafeString(row?.image),
    image_source: toSafeString(row?.image_source),
    image_confidence: toFiniteNumber(row?.image_confidence),
    image_attribution_text: toSafeString(row?.image_attribution_text),
    google_photo_name: toSafeString(row?.google_photo_name),
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

  if (name && address && latitude && longitude) {
    return `facility:${name}|${address}|${latitude}|${longitude}`;
  }
  if (name && address) {
    return `facility:${name}|${address}`;
  }
  if (name && latitude && longitude) {
    return `facility:${name}|${latitude}|${longitude}`;
  }

  const placeId =
    typeof row?.place_id === "string" ? row.place_id.trim().toLowerCase() : "";
  if (placeId) return `place:${placeId}`;
  if (name) return `name:${name}`;

  const id = typeof row?.id === "string" ? row.id : "unknown";
  return `id:${id}`;
};

const normalizeMapboxPlace = (
  place: any,
  fallbackLat: number,
  fallbackLng: number,
  index: number
) => {
  const properties = place?.properties ?? {};
  const geometryCoordinates = Array.isArray(place?.geometry?.coordinates)
    ? place.geometry.coordinates
    : null;
  const centerCoordinates = Array.isArray(place?.center) ? place.center : null;
  const coordinates = geometryCoordinates ?? centerCoordinates;

  const latitude = toFiniteNumber(coordinates?.[1]) ?? fallbackLat;
  const longitude = toFiniteNumber(coordinates?.[0]) ?? fallbackLng;
  const placeId =
    place?.id ??
    properties?.mapbox_id ??
    place?.mapbox_id ??
    `mapbox_${index}_${Math.abs(Math.round(latitude * 10000))}_${Math.abs(
      Math.round(longitude * 10000)
    )}`;
  const phone =
    properties?.phone ?? properties?.tel ?? properties?.metadata?.phone ?? "";
  const website =
    properties?.website ??
    properties?.metadata?.website ??
    properties?.contact?.website ??
    "";

  return {
    place_id: String(placeId),
    name: properties?.name || place?.name || "Unnamed Hospital",
    address:
      properties?.full_address ||
      properties?.address ||
      place?.full_address ||
      place?.place_formatted ||
      "Address unavailable",
    latitude,
    longitude,
    phone,
    website,
    verified: false,
    status: "available",
  };
};

const normalizeGooglePlace = (
  place: any,
  fallbackLat: number,
  fallbackLng: number,
  index: number
) => {
  const latitude =
    toFiniteNumber(place?.location?.latitude ?? place?.geometry?.location?.lat) ??
    fallbackLat;
  const longitude =
    toFiniteNumber(place?.location?.longitude ?? place?.geometry?.location?.lng) ??
    fallbackLng;
  const placeId =
    place?.id ??
    place?.place_id ??
    `google_${index}_${Math.abs(Math.round(latitude * 10000))}_${Math.abs(
      Math.round(longitude * 10000)
    )}`;
  const googlePhotoName = toSafeString(place?.photos?.[0]?.name);
  const proxyImage =
    googlePhotoName && toSafeString(placeId)
      ? buildHospitalMediaProxyUrl(String(placeId))
      : "";
  const displayName =
    typeof place?.displayName === "object"
      ? toSafeString(place?.displayName?.text)
      : toSafeString(place?.displayName);

  return {
    place_id: String(placeId),
    name: displayName || place?.name || "Unnamed Hospital",
    address:
      place?.formattedAddress || place?.vicinity || place?.formatted_address || "Address unavailable",
    latitude,
    longitude,
    phone:
      place?.internationalPhoneNumber ??
      place?.nationalPhoneNumber ??
      place?.formatted_phone_number ??
      "",
    website: place?.websiteUri ?? place?.website ?? "",
    rating: toFiniteNumber(place?.rating) ?? 0,
    image: proxyImage,
    image_source: googlePhotoName ? "provider_photo" : "",
    image_confidence: googlePhotoName ? 0.78 : 0,
    image_attribution_text: googlePhotoName ? "Google Places photo" : "",
    google_photo_name: googlePhotoName,
    verified: false,
    status: "available",
  };
};

const fetchGoogleProviderPlaces = async ({
  apiKey,
  latitude,
  longitude,
  radius,
  mode,
  query,
  limit,
}: {
  apiKey: string;
  latitude: number;
  longitude: number;
  radius: number;
  mode: "nearby" | "text_search";
  query: string;
  limit: number;
}) => {
  const endpoint =
    mode === "text_search" && query
      ? "https://places.googleapis.com/v1/places:searchText"
      : "https://places.googleapis.com/v1/places:searchNearby";
  const fieldMask =
    "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.photos";
  const body =
    mode === "text_search" && query
      ? {
          textQuery: query,
          includedType: "hospital",
          pageSize: limit,
          locationBias: {
            circle: {
              center: { latitude, longitude },
              radius: Math.max(1, Math.round(radius)),
            },
          },
        }
      : {
          includedTypes: ["hospital"],
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

// Keep persistence schema-safe: only write columns that exist on public.hospitals.
const toHospitalUpsertRow = (row: any) => ({
  place_id: row?.place_id,
  name: row?.name || "Unnamed Hospital",
  address: row?.address || "Address unavailable",
  phone: typeof row?.phone === "string" && row.phone.trim() ? row.phone.trim() : null,
  latitude: toFiniteNumber(row?.latitude),
  longitude: toFiniteNumber(row?.longitude),
  rating: toFiniteNumber(row?.rating) ?? 0,
  image:
    toSafeString(row?.image) ||
    pickFallbackHospitalImage(String(row?.place_id || row?.name || "hospital")),
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
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[discover-hospitals] request start", req.method);

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const authClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
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
    const includeGooglePlaces = body?.includeGooglePlaces === true;
    const mergeWithDatabase = body?.mergeWithDatabase !== false;

    const mapboxToken = Deno.env.get("MAPBOX_ACCESS_TOKEN");
    const googleApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let providerData: any[] = [];
    let providerSource = "database";
    let normalizedProviderHospitals: any[] = [];
    let providerDiscoverySkipped = false;
    let providerDiscoverySkipReason = "";

    const radiusKm = Math.max(1, Math.round(radius / 1000));
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

    let dbResults = Array.isArray(nearbyHospitals) ? nearbyHospitals : [];
    const dispatchableDbResults = dbResults.filter((row: any) =>
      isDispatchableDatabaseRow(row)
    );
    const databaseComfortTarget =
      mode === "nearby" ? Math.min(limit, MAP_NEARBY_COMFORT_THRESHOLD) : limit;
    const hasEnoughDbResults =
      mergeWithDatabase &&
      dispatchableDbResults.length >= databaseComfortTarget;
    if (hasEnoughDbResults) {
      providerDiscoverySkipped = true;
      providerDiscoverySkipReason = "database_sufficient";
      console.log("[discover-hospitals] provider discovery skipped", {
        reason: providerDiscoverySkipReason,
        dbCount: dbResults.length,
        dispatchableDbCount: dispatchableDbResults.length,
        comfortTarget: databaseComfortTarget,
      });
    }

    if (includeProviderDiscovery && !hasEnoughDbResults) {
      try {
        if (mapboxToken && includeMapboxPlaces) {
          const mapboxUrl =
            mode === "text_search" && query
              ? `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(
                  query
                )}&proximity=${longitude},${latitude}&types=poi&limit=${limit}&access_token=${mapboxToken}`
              : `https://api.mapbox.com/search/searchbox/v1/category/hospital?proximity=${longitude},${latitude}&limit=${limit}&access_token=${mapboxToken}`;

          console.log("[discover-hospitals] mapbox fetch");
          const mapboxRes = await fetch(mapboxUrl);
          const mapboxData = await mapboxRes.json();

          providerData = Array.isArray(mapboxData?.features)
            ? mapboxData.features
            : Array.isArray(mapboxData?.suggestions)
            ? mapboxData.suggestions
            : [];
          providerSource = "mapbox";

          if (providerData.length === 0 && mode !== "text_search") {
            const fallbackQueryUrl = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(
              "hospital"
            )}&proximity=${longitude},${latitude}&types=poi&limit=${limit}&access_token=${mapboxToken}`;
            console.log("[discover-hospitals] mapbox fallback text fetch");
            const fallbackRes = await fetch(fallbackQueryUrl);
            const fallbackData = await fallbackRes.json();

            providerData = Array.isArray(fallbackData?.features)
              ? fallbackData.features
              : Array.isArray(fallbackData?.suggestions)
              ? fallbackData.suggestions
              : [];
          }
        }

        if (providerData.length === 0 && googleApiKey && includeGooglePlaces) {
          console.log("[discover-hospitals] google fetch");
          providerData = await fetchGoogleProviderPlaces({
            apiKey: googleApiKey,
            latitude,
            longitude,
            radius,
            mode,
            query,
            limit,
          });
          providerSource = "google";
        }
      } catch (providerError) {
        console.error("[discover-hospitals] provider fetch failed", providerError);
      }

      normalizedProviderHospitals = providerData
        .map((place: any, index: number) =>
          providerSource === "mapbox"
            ? normalizeMapboxPlace(place, latitude, longitude, index)
            : normalizeGooglePlace(place, latitude, longitude, index)
        )
        .map((place: any) => withProviderDefaults(place, providerSource))
        .filter(
          (place: any) =>
            !!place?.place_id &&
            Number.isFinite(place?.latitude) &&
            Number.isFinite(place?.longitude)
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
          } else {
            // Re-read canonical DB rows so clients receive persisted ids/display_ids.
            const { data: refreshedHospitals, error: refreshError } = await supabaseClient.rpc(
              "nearby_hospitals",
              {
                user_lat: latitude,
                user_lng: longitude,
                radius_km: radiusKm,
              }
            );

            if (refreshError) {
              console.error(
                "[discover-hospitals] nearby_hospitals refresh failed after upsert",
                refreshError
              );
            } else {
              dbResults = Array.isArray(refreshedHospitals) ? refreshedHospitals : dbResults;
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

    // Merge strategy: keep canonical DB rows first, then append provider-only rows.
    // This prevents empty-state in uncovered regions while preserving verified/canonical data priority.
    const merged: any[] = [];
    const seen = new Set<string>();

    const prioritizedDbResults = prioritizeDatabaseRows(dbResults);

    for (const row of prioritizedDbResults) {
      const key = toMergeKey(row);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(row);
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
    });

    return new Response(
      JSON.stringify({
        data: limitedResults,
        meta: {
          provider_count: providerData.length,
          provider_source: providerSource,
          database_count: dbResults.length,
          dispatchable_database_count: prioritizedDbResults.filter((row: any) =>
            isDispatchableDatabaseRow(row)
          ).length,
          merged_count: limitedResults.length,
          provider_discovery_enabled: includeProviderDiscovery,
          provider_discovery_skipped: providerDiscoverySkipped,
          provider_discovery_skip_reason: providerDiscoverySkipReason || null,
          database_comfort_target: databaseComfortTarget,
          mapbox_enabled: includeMapboxPlaces,
          google_enabled: includeGooglePlaces,
          mode,
          radius_km: radiusKm,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[discover-hospitals] error", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error instanceof Error ? error.stack || "" : "",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

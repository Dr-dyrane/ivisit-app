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

const coordinateKey = (value: unknown, precision = 3): string | null => {
  const n = toFiniteNumber(value);
  if (!Number.isFinite(n)) return null;
  return Number(n).toFixed(precision);
};

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

const resolveHospitalImage = (row: any) => {
  const explicitImage = toSafeString(row?.image);
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
  const latitude = toFiniteNumber(place?.geometry?.location?.lat) ?? fallbackLat;
  const longitude = toFiniteNumber(place?.geometry?.location?.lng) ?? fallbackLng;
  const placeId =
    place?.place_id ??
    `google_${index}_${Math.abs(Math.round(latitude * 10000))}_${Math.abs(
      Math.round(longitude * 10000)
    )}`;

  return {
    place_id: String(placeId),
    name: place?.name || "Unnamed Hospital",
    address: place?.vicinity || place?.formatted_address || "Address unavailable",
    latitude,
    longitude,
    phone: place?.formatted_phone_number ?? "",
    website: place?.website ?? "",
    rating: toFiniteNumber(place?.rating) ?? 0,
    verified: false,
    status: "available",
  };
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
    const hasEnoughDbResults = mergeWithDatabase && dbResults.length >= limit;
    if (hasEnoughDbResults) {
      providerDiscoverySkipped = true;
      providerDiscoverySkipReason = "database_sufficient";
      console.log("[discover-hospitals] provider discovery skipped", {
        reason: providerDiscoverySkipReason,
        dbCount: dbResults.length,
        limit,
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
        }

        if (providerData.length === 0 && googleApiKey && includeGooglePlaces) {
          const googleUrl =
            mode === "text_search" && query
              ? `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
                  query
                )}&key=${googleApiKey}&fields=place_id,name,formatted_address,geometry,rating,photos,opening_hours,formatted_phone_number,website`
              : `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=hospital&key=${googleApiKey}&fields=place_id,name,formatted_address,geometry,rating,photos,opening_hours,formatted_phone_number,website`;

          console.log("[discover-hospitals] google fetch");
          const googleRes = await fetch(googleUrl);
          const googleData = await googleRes.json();

          if (googleData.status === "OK" || googleData.status === "ZERO_RESULTS") {
            providerData = googleData.results || [];
            providerSource = "google";
          }
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

        const upsertRows = providerOnlyRows
          .map(toHospitalUpsertRow)
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

    for (const row of dbResults) {
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
          merged_count: limitedResults.length,
          provider_discovery_enabled: includeProviderDiscovery,
          provider_discovery_skipped: providerDiscoverySkipped,
          provider_discovery_skip_reason: providerDiscoverySkipReason || null,
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

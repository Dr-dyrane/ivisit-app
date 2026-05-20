import { getBooleanEnv, getEnv } from "../../env/env.ts";
import type { DemoContext } from "./context.ts";
import { resolveSeedImage } from "./media.ts";
import {
  coordinateKey,
  haversineDistanceKm,
  normalizeHospitalName,
  toFiniteNumber,
  toSafeString,
} from "./utils.ts";

const MAPBOX_PROVIDER_LIMIT = 8;
const GOOGLE_PROVIDER_LIMIT = 8;
const DEMO_MIN_HOSPITALS = 5;
const NON_HOSPITAL_SEED_PATTERN =
  /\b(blood bank|blood center|blood centre|blood donation|plasma|donor center|donation center|laboratory|lab\b|pharmacy|veterinary|animal hospital|dental|dentist|optical|optometry)\b/i;

const isLikelyHospitalSeed = (row: any) => {
  const text = [
    row?.name,
    row?.displayName?.text,
    row?.address,
    row?.formattedAddress,
    row?.place_formatted,
  ]
    .map((value) => toSafeString(value, ""))
    .filter(Boolean)
    .join(" ");
  return !NON_HOSPITAL_SEED_PATTERN.test(text);
};

const getMapboxSeedHospitals = async (ctx: DemoContext) => {
  const mapboxToken = getEnv("MAPBOX_ACCESS_TOKEN", "EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN");
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
    .filter(isLikelyHospitalSeed)
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
  const googlePlacesEnabled = getBooleanEnv(false, "ENABLE_GOOGLE_PLACES", "EXPO_PUBLIC_ENABLE_GOOGLE_PLACES");
  if (!googlePlacesEnabled) return [];

  const googleApiKey = getEnv(
    "GOOGLE_MAPS_API_KEY",
    "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY",
    "GOOGLE_MAPS_ANDROID_API_KEY",
  );
  if (!googleApiKey) return [];

  const rows = await fetchGoogleNearbyPlaces(ctx, googleApiKey);

  const mappedRows = await Promise.all(
    rows.filter(isLikelyHospitalSeed).map(async (row: any, index: number) => {
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

export const dedupeSeedHospitals = (rows: any[]) => {
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

export const getProviderSeedHospitals = async (ctx: DemoContext) => {
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

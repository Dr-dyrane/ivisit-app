import { clampLimit, toFiniteNumber } from "../numbers.ts";
import {
  normalizeCountryCode,
  shouldUseRegionLocalFirst,
} from "./locality.ts";
import { CATEGORY_TO_GOOGLE_TYPES } from "./taxonomy.ts";

const toSafeString = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") return fallback;
  const clean = value.trim();
  return clean.length > 0 ? clean : fallback;
};

export type ProviderDiscoveryMode = "nearby" | "text_search";

export const parseProviderCategory = (value: unknown): string =>
  typeof value === "string" && CATEGORY_TO_GOOGLE_TYPES[value]
    ? value
    : "hospital";

export const parseProviderEnrichmentRequest = (body: any) => {
  const providerCategory = parseProviderCategory(body?.providerCategory);
  return {
    placeId: toSafeString(body?.placeId ?? body?.place_id),
    providerCategory,
  };
};

export const parseProviderDiscoveryRequest = (
  body: any,
  { googlePlacesEnabled }: { googlePlacesEnabled: boolean },
) => {
  const latitude = toFiniteNumber(body?.latitude);
  const longitude = toFiniteNumber(body?.longitude);
  const radius = toFiniteNumber(body?.radius) ?? 15000;
  const mode: ProviderDiscoveryMode =
    body?.mode === "text_search" ? "text_search" : "nearby";
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  const limit = clampLimit(body?.limit);
  const includeProviderDiscovery = body?.includeProviderDiscovery !== false;
  const includeMapboxPlaces = body?.includeMapboxPlaces !== false;
  const includeGooglePlaces = body?.includeGooglePlaces === true && googlePlacesEnabled;
  const mergeWithDatabase = body?.mergeWithDatabase !== false;
  const countryCode = normalizeCountryCode(
    body?.countryCode ?? body?.country_code ?? body?.regionCountryCode,
  );
  const providerCategory = parseProviderCategory(body?.providerCategory);
  const requestedEmergencyMode = body?.emergencyMode ?? body?.emergency_mode;
  // Hospital discovery remains emergency-safe for older callers. Explore Care
  // opts out explicitly without granting provider rows commitment authority.
  const isEmergencyMode =
    providerCategory === "hospital" && requestedEmergencyMode !== false;
  const regionLocalFirstEnabled = shouldUseRegionLocalFirst(countryCode, providerCategory);

  return {
    latitude,
    longitude,
    radius,
    mode,
    query,
    limit,
    includeProviderDiscovery,
    includeMapboxPlaces,
    includeGooglePlaces,
    mergeWithDatabase,
    countryCode,
    providerCategory,
    isEmergencyMode,
    regionLocalFirstEnabled,
  };
};

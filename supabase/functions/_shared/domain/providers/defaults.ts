import { toFiniteNumber, toNonNegativeInt } from "../numbers.ts";
import {
  hasProviderCategoryKeywordGuard,
  shouldKeepProviderForRequestedCategory,
} from "./guards.ts";
import { LOCALITY_SCOPE_LOCAL } from "./locality.ts";
import { resolveProviderImage } from "./media.ts";
import {
  CATEGORY_TO_GOOGLE_TYPES,
  GOOGLE_TYPE_TO_PROVIDER,
  PROVIDER_TYPES,
  classifyProviderByName,
  deriveEmergencyEligible,
  normaliseEmergencyLevel,
} from "./taxonomy.ts";
import type { ProviderType } from "./taxonomy.ts";

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

export const withProviderDefaults = (row: any, providerSource: string, requestedCategory = "hospital") => {
  const googleType = toSafeString(row?.google_type);
  const categoryFromType = googleType ? GOOGLE_TYPE_TO_PROVIDER[googleType] : undefined;
  const nameClassification = classifyProviderByName(toSafeString(row?.name));
  const requestedProviderType = (CATEGORY_TO_GOOGLE_TYPES[requestedCategory]
    ? requestedCategory
    : PROVIDER_TYPES.HOSPITAL) as ProviderType;
  const requestedCategoryGuardMatches = hasProviderCategoryKeywordGuard(requestedCategory) &&
    shouldKeepProviderForRequestedCategory(row, requestedCategory);
  const categoryMatchesRequest = categoryFromType === requestedProviderType;
  const canTrustGoogleType =
    !!categoryFromType &&
    (requestedProviderType === PROVIDER_TYPES.HOSPITAL ||
      categoryMatchesRequest ||
      googleType === "pharmacy" ||
      googleType === "drugstore" ||
      googleType === "medical_lab");

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
    provider_type: providerType,
    emergency_eligible,
    category_confidence: categoryConfidence,
    provider_source: providerSource === "google" ? "google_places" : providerSource === "mapbox" ? "mapbox_places" : "manual_seed",
    provider_locality_scope: toSafeString(row?.provider_locality_scope, LOCALITY_SCOPE_LOCAL),
    is_wide_provider_fallback: row?.is_wide_provider_fallback === true,
  };

  return {
    ...normalized,
    ...resolveProviderImage(normalized),
  };
};

import { PROVIDER_TYPES } from "./taxonomy.ts";

export const MAP_LOCAL_NEARBY_RADIUS_KM = 5;
export const MAP_LOCAL_NEARBY_COMFORT_THRESHOLD = 3;
export const REGION_LOCAL_FIRST_COUNTRY_CODES = new Set(["NG"]);
export const LOCALITY_SCOPE_LOCAL = "local";
export const LOCALITY_SCOPE_WIDE_FALLBACK = "wide_fallback";

const toSafeString = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") return fallback;
  const clean = value.trim();
  return clean.length > 0 ? clean : fallback;
};

export const normalizeCountryCode = (value: unknown): string => {
  const clean = toSafeString(value).toUpperCase();
  return /^[A-Z]{2}$/.test(clean) ? clean : "";
};

export const shouldUseRegionLocalFirst = (countryCode: string, providerCategory: string): boolean =>
  providerCategory !== PROVIDER_TYPES.HOSPITAL &&
  REGION_LOCAL_FIRST_COUNTRY_CODES.has(countryCode);

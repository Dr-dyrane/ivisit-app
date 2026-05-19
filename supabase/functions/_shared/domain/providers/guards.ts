import {
  CATEGORY_RESULT_KEYWORD_GUARDS,
  NON_DENTAL_PROVIDER_NOISE_GUARD,
  PROVIDER_TYPES,
} from "./taxonomy.ts";

const toSafeString = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") return fallback;
  const clean = value.trim();
  return clean.length > 0 ? clean : fallback;
};

export const hasProviderCategoryKeywordGuard = (
  requestedCategory: string,
): boolean => !!CATEGORY_RESULT_KEYWORD_GUARDS[requestedCategory];

export const shouldKeepProviderForRequestedCategory = (
  row: any,
  requestedCategory: string,
): boolean => {
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

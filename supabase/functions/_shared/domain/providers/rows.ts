import { toFiniteNumber } from "../numbers.ts";
import { calculateDistanceKm } from "./distance.ts";
import {
  LOCALITY_SCOPE_LOCAL,
  LOCALITY_SCOPE_WIDE_FALLBACK,
  MAP_LOCAL_NEARBY_RADIUS_KM,
} from "./locality.ts";
import { PROVIDER_TYPES } from "./taxonomy.ts";

const normalizeFacilityText = (value: unknown): string =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const coordinateKey = (value: unknown, precision = 5): string | null => {
  const n = toFiniteNumber(value);
  if (!Number.isFinite(n)) return null;
  return Number(n).toFixed(precision);
};

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

export const isDemoDatabaseRow = (row: any): boolean => {
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

export const isDispatchableDatabaseRow = (row: any): boolean => {
  const status = toSafeString(row?.status, "available").toLowerCase();
  const verificationStatus = toSafeString(
    row?.verification_status ?? row?.import_status,
    ""
  ).toLowerCase();

  const providerType = toSafeString(row?.provider_type, PROVIDER_TYPES.HOSPITAL).toLowerCase();
  if (providerType !== PROVIDER_TYPES.HOSPITAL) return false;

  return (
    status === "available" &&
    (row?.verified === true ||
      isDemoDatabaseRow(row) ||
      verificationStatus === "verified" ||
      verificationStatus === "not_certified")
  );
};

export const parseDistanceKm = (row: any): number | null => {
  const numericDistance = toFiniteNumber(
    row?.distance_km ?? row?.distanceKm ?? row?.distance,
  );
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

export const compareByDistance = (left: any, right: any): number => {
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

export const isWithinDistanceKm = (row: any, radiusKm: number): boolean => {
  const distanceKm = parseDistanceKm(row);
  return Number.isFinite(distanceKm) && Number(distanceKm) <= radiusKm;
};

export const withDistanceFromOrigin = (row: any, originLat: number, originLng: number) => {
  const distanceKm =
    parseDistanceKm(row) ?? calculateDistanceKm(originLat, originLng, row?.latitude, row?.longitude);
  const localityScope = toSafeString(row?.provider_locality_scope, LOCALITY_SCOPE_LOCAL);
  const isWideFallback =
    localityScope === LOCALITY_SCOPE_WIDE_FALLBACK &&
    Number.isFinite(distanceKm) &&
    Number(distanceKm) > MAP_LOCAL_NEARBY_RADIUS_KM;

  return {
    ...row,
    distance_km: Number.isFinite(distanceKm) ? distanceKm : row?.distance_km,
    provider_locality_scope: isWideFallback ? LOCALITY_SCOPE_WIDE_FALLBACK : LOCALITY_SCOPE_LOCAL,
    is_wide_provider_fallback: isWideFallback,
  };
};

export const prioritizeProviderRows = (
  rows: any[],
  isPreferredRow: (row: any) => boolean,
): any[] =>
  [...rows].sort((left, right) => {
    const leftPreferred = isPreferredRow(left);
    const rightPreferred = isPreferredRow(right);
    if (leftPreferred !== rightPreferred) {
      return leftPreferred ? -1 : 1;
    }

    return compareByDistance(left, right);
  });

export const toMergeKey = (row: any): string => {
  const name = normalizeFacilityText(row?.name);
  const address = normalizeFacilityText(row?.address);
  const latitude = coordinateKey(row?.latitude);
  const longitude = coordinateKey(row?.longitude);

  if (address && latitude && longitude) {
    return `location:${address}|${latitude}|${longitude}`;
  }
  if (latitude && longitude) {
    return `coords:${latitude}|${longitude}`;
  }
  if (address) {
    return `address:${address}`;
  }

  const placeId =
    typeof row?.place_id === "string" ? row.place_id.trim().toLowerCase() : "";
  if (placeId) return `place:${placeId}`;
  if (name) return `name:${name}`;

  const id = typeof row?.id === "string" ? row.id : "unknown";
  return `id:${id}`;
};

export const mergeCanonicalAndProviderRows = ({
  dbRows,
  providerRows,
  originLat,
  originLng,
  isPreferredRow,
}: {
  dbRows: any[];
  providerRows: any[];
  originLat: number;
  originLng: number;
  isPreferredRow: (row: any) => boolean;
}): { merged: any[]; prioritizedDbRows: any[] } => {
  const providerLocalityByPlaceId = new Map<string, any>();
  providerRows.forEach((row: any) => {
    const placeId = toSafeString(row?.place_id);
    if (!placeId) return;
    providerLocalityByPlaceId.set(placeId, {
      distance_km: parseDistanceKm(row) ?? row?.distance_km,
      provider_locality_scope: toSafeString(row?.provider_locality_scope, LOCALITY_SCOPE_LOCAL),
      is_wide_provider_fallback: row?.is_wide_provider_fallback === true,
    });
  });

  const prioritizedDbRows = prioritizeProviderRows(dbRows, isPreferredRow);
  const merged: any[] = [];
  const seen = new Set<string>();

  for (const row of prioritizedDbRows) {
    const locality = providerLocalityByPlaceId.get(toSafeString(row?.place_id));
    const dbRow = withDistanceFromOrigin(locality ? { ...row, ...locality } : row, originLat, originLng);
    const key = toMergeKey(dbRow);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(dbRow);
  }

  for (const row of providerRows) {
    const key = toMergeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }

  return { merged, prioritizedDbRows };
};

import { toFiniteNumber } from "../numbers.ts";

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

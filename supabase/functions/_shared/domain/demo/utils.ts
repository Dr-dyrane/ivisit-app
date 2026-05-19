export const toFiniteNumber = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export const toSafeString = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

export const toSafeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

export const toNonNegativeInt = (value: unknown, fallback = 0): number => {
  const n = toFiniteNumber(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
};

export const uniqueStrings = (values: string[]): string[] => {
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

export const stripDemoSuffixes = (value: string) =>
  value
    .replace(/\s*(?:\((?:demo)\))+$/i, "")
    .replace(/\s*\(demo\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

export const normalizeHospitalName = (
  value: unknown,
  fallback = "Nearby Hospital",
) => toSafeString(stripDemoSuffixes(toSafeString(value, fallback)), fallback);

export const normalizeFacilityText = (value: unknown) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export const isUrl = (value: string) => /^https?:\/\//i.test(value);

export const coordinateKey = (value: unknown, precision = 3) => {
  const n = toFiniteNumber(value);
  return Number.isFinite(n) ? Number(n).toFixed(precision) : "0.000";
};

export const exactLocationKey = (latitude: unknown, longitude: unknown) => {
  const lat = toFiniteNumber(latitude);
  const lng = toFiniteNumber(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  return `${lat}|${lng}`;
};

export const toStableIdFragment = (value: string, fallback: string) => {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 32);
  return normalized || fallback;
};

export const nowIso = () => new Date().toISOString();

const toRadians = (value: number) => (value * Math.PI) / 180;

export const haversineDistanceKm = (
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

export const toGeometryPoint = (latitude: number, longitude: number): string =>
  `SRID=4326;POINT(${longitude} ${latitude})`;

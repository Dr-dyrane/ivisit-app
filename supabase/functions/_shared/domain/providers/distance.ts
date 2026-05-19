import { toFiniteNumber } from "../numbers.ts";

export const calculateDistanceKm = (
  fromLat: number,
  fromLng: number,
  toLat: unknown,
  toLng: unknown,
): number | null => {
  const lat2 = toFiniteNumber(toLat);
  const lng2 = toFiniteNumber(toLng);
  if (
    !Number.isFinite(fromLat) ||
    !Number.isFinite(fromLng) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lng2)
  ) {
    return null;
  }

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(Number(lat2) - fromLat);
  const dLng = toRadians(Number(lng2) - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(Number(lat2))) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = earthRadiusKm * c;
  return Number.isFinite(km) ? Number(km.toFixed(3)) : null;
};

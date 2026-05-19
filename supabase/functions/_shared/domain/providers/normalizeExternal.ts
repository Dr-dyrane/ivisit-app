import { toFiniteNumber, toNonNegativeInt } from "../numbers.ts";

const LOCALITY_SCOPE_LOCAL = "local";

const toSafeString = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") return fallback;
  const clean = value.trim();
  return clean.length > 0 ? clean : fallback;
};

export type ProviderMediaProxyBuilder = (placeId: string) => string;

export const normalizeMapboxPlace = (
  place: any,
  fallbackLat: number,
  fallbackLng: number,
  index: number,
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
      Math.round(longitude * 10000),
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
    provider_locality_scope: toSafeString(place?.provider_locality_scope, LOCALITY_SCOPE_LOCAL),
    verified: false,
    status: "available",
  };
};

export const normalizeGooglePlace = (
  place: any,
  fallbackLat: number,
  fallbackLng: number,
  index: number,
  buildMediaProxyUrl?: ProviderMediaProxyBuilder,
) => {
  const latitude =
    toFiniteNumber(place?.location?.latitude ?? place?.geometry?.location?.lat) ??
    fallbackLat;
  const longitude =
    toFiniteNumber(place?.location?.longitude ?? place?.geometry?.location?.lng) ??
    fallbackLng;
  const placeId =
    place?.id ??
    place?.place_id ??
    `google_${index}_${Math.abs(Math.round(latitude * 10000))}_${Math.abs(
      Math.round(longitude * 10000),
    )}`;
  const googlePhotoName = toSafeString(place?.photos?.[0]?.name);
  const googleTypes = Array.isArray(place?.types)
    ? place.types.map((type: unknown) => toSafeString(type)).filter(Boolean)
    : [];
  const primaryType = toSafeString(place?.primaryType, googleTypes[0] || "");
  const proxyImage =
    googlePhotoName && toSafeString(placeId) && buildMediaProxyUrl
      ? buildMediaProxyUrl(String(placeId))
      : "";
  const displayName =
    typeof place?.displayName === "object"
      ? toSafeString(place?.displayName?.text)
      : toSafeString(place?.displayName);

  return {
    place_id: String(placeId),
    name: displayName || place?.name || "Unnamed Hospital",
    address:
      place?.formattedAddress || place?.vicinity || place?.formatted_address || "Address unavailable",
    latitude,
    longitude,
    phone:
      place?.internationalPhoneNumber ??
      place?.nationalPhoneNumber ??
      place?.formatted_phone_number ??
      "",
    website: place?.websiteUri ?? place?.website ?? "",
    rating: toFiniteNumber(place?.rating) ?? 0,
    reviews_count: toNonNegativeInt(place?.userRatingCount ?? place?.user_ratings_total, 0),
    google_type: primaryType,
    google_types: googleTypes,
    image: proxyImage,
    image_source: googlePhotoName ? "provider_photo" : "",
    image_confidence: googlePhotoName ? 0.78 : 0,
    image_attribution_text: googlePhotoName ? "Google Places photo" : "",
    google_photo_name: googlePhotoName,
    provider_locality_scope: toSafeString(place?.provider_locality_scope, LOCALITY_SCOPE_LOCAL),
    verified: false,
    status: "available",
  };
};

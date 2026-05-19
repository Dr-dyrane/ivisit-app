import {
  CATEGORY_TO_GOOGLE_TYPES,
  GOOGLE_TEXT_SEARCH_FIRST_CATEGORIES,
  getGoogleQueriesForCategory,
} from "./taxonomy.ts";

const GOOGLE_PROVIDER_LIST_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.primaryType",
  "places.types",
].join(",");

const GOOGLE_PROVIDER_DETAIL_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "photos",
  "primaryType",
  "types",
].join(",");

const toSafeString = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") return fallback;
  const clean = value.trim();
  return clean.length > 0 ? clean : fallback;
};

const buildGoogleTextSearchQuery = (
  providerCategory: string,
  query: string,
  countryCode = "",
): string => {
  const explicitQuery = toSafeString(query);
  if (explicitQuery) return explicitQuery;
  const categoryQueries = getGoogleQueriesForCategory(providerCategory, countryCode);
  return categoryQueries.slice(0, 4).join(" ");
};

export const fetchGoogleProviderPlaces = async ({
  apiKey,
  latitude,
  longitude,
  radius,
  mode,
  query,
  limit,
  providerCategory,
  countryCode,
}: {
  apiKey: string;
  latitude: number;
  longitude: number;
  radius: number;
  mode: "nearby" | "text_search";
  query: string;
  limit: number;
  providerCategory: string;
  countryCode?: string;
}) => {
  const textSearchQuery =
    mode === "text_search" || GOOGLE_TEXT_SEARCH_FIRST_CATEGORIES.has(providerCategory)
      ? buildGoogleTextSearchQuery(providerCategory, query, countryCode)
      : "";
  const useTextSearch = !!textSearchQuery;
  const endpoint = useTextSearch
    ? "https://places.googleapis.com/v1/places:searchText"
    : "https://places.googleapis.com/v1/places:searchNearby";
  // Keep list discovery on the leanest useful field set. Rich details stay in
  // explicit provider-detail enrichment so list browsing cannot fan out costs.
  const fieldMask = GOOGLE_PROVIDER_LIST_FIELD_MASK;
  const googleTypes = CATEGORY_TO_GOOGLE_TYPES[providerCategory] ?? ["hospital"];
  const body =
    useTextSearch
      ? {
          textQuery: textSearchQuery,
          pageSize: limit,
          locationBias: {
            circle: {
              center: { latitude, longitude },
              radius: Math.max(1, Math.round(radius)),
            },
          },
        }
      : {
          includedTypes: googleTypes,
          maxResultCount: limit,
          rankPreference: "DISTANCE",
          locationRestriction: {
            circle: {
              center: { latitude, longitude },
              radius: Math.max(1, Math.round(radius)),
            },
          },
        };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`google places fetch failed: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data?.places) ? data.places : [];
};

export const fetchGoogleProviderDetails = async ({
  apiKey,
  placeId,
}: {
  apiKey: string;
  placeId: string;
}) => {
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": GOOGLE_PROVIDER_DETAIL_FIELD_MASK,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`google place details fetch failed: ${response.status} ${text}`);
  }

  return await response.json();
};

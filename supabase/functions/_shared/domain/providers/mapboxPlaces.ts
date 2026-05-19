import {
  CATEGORY_TO_MAPBOX_CATEGORY,
  EXPLORE_CATEGORY_META_KEYWORDS,
} from "./taxonomy.ts";

const extractMapboxPlaces = (data: any): any[] => {
  if (Array.isArray(data?.features)) return data.features;
  if (Array.isArray(data?.suggestions)) return data.suggestions;
  return [];
};

const fetchMapboxJson = async (url: string): Promise<any> => {
  const response = await fetch(url);
  return await response.json();
};

export const fetchMapboxProviderPlaces = async ({
  accessToken,
  latitude,
  longitude,
  mode,
  query,
  limit,
  providerCategory,
}: {
  accessToken: string;
  latitude: number;
  longitude: number;
  mode: "nearby" | "text_search";
  query: string;
  limit: number;
  providerCategory: string;
}): Promise<any[]> => {
  const specificMapboxCategory = CATEGORY_TO_MAPBOX_CATEGORY[providerCategory] ?? null;
  const keywordForCategory = EXPLORE_CATEGORY_META_KEYWORDS[providerCategory] || providerCategory;

  let mapboxUrl: string;
  if (mode === "text_search" && query) {
    mapboxUrl = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(query)}&proximity=${longitude},${latitude}&types=poi&limit=${limit}&access_token=${accessToken}`;
  } else if (specificMapboxCategory) {
    mapboxUrl = `https://api.mapbox.com/search/searchbox/v1/category/${specificMapboxCategory}?proximity=${longitude},${latitude}&limit=${limit}&access_token=${accessToken}`;
  } else {
    mapboxUrl = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(keywordForCategory)}&proximity=${longitude},${latitude}&types=poi&limit=${limit}&access_token=${accessToken}`;
  }

  console.log("[discover-hospitals] mapbox fallback fetch", {
    providerCategory,
    specificMapboxCategory,
    keywordForCategory,
  });

  const mapboxData = await fetchMapboxJson(mapboxUrl);
  const providerData = extractMapboxPlaces(mapboxData);
  if (providerData.length > 0 || !specificMapboxCategory || mode === "text_search") {
    return providerData;
  }

  const fallbackQueryUrl = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(keywordForCategory)}&proximity=${longitude},${latitude}&types=poi&limit=${limit}&access_token=${accessToken}`;
  console.log("[discover-hospitals] mapbox keyword fallback", { keywordForCategory });
  const fallbackData = await fetchMapboxJson(fallbackQueryUrl);
  return extractMapboxPlaces(fallbackData);
};

import { fetchGoogleProviderPlaces } from "./googlePlaces.ts";
import {
  LOCALITY_SCOPE_LOCAL,
  LOCALITY_SCOPE_WIDE_FALLBACK,
  MAP_LOCAL_NEARBY_RADIUS_KM,
} from "./locality.ts";
import { fetchMapboxProviderPlaces } from "./mapboxPlaces.ts";
import type { ProviderDiscoveryMode } from "./request.ts";

export type ProviderSource = "database" | "google" | "mapbox";

export const fetchExternalProviderData = async ({
  googleApiKey,
  mapboxToken,
  includeGooglePlaces,
  includeMapboxPlaces,
  latitude,
  longitude,
  radius,
  mode,
  query,
  limit,
  providerCategory,
  countryCode,
  regionLocalFirstEnabled,
  localComfortTarget,
}: {
  googleApiKey: string;
  mapboxToken: string;
  includeGooglePlaces: boolean;
  includeMapboxPlaces: boolean;
  latitude: number;
  longitude: number;
  radius: number;
  mode: ProviderDiscoveryMode;
  query: string;
  limit: number;
  providerCategory: string;
  countryCode: string;
  regionLocalFirstEnabled: boolean;
  localComfortTarget: number;
}): Promise<{
  providerData: any[];
  providerSource: ProviderSource;
  localProviderFetchCount: number;
  wideProviderFallbackCount: number;
  wideProviderFallbackUsed: boolean;
}> => {
  let providerData: any[] = [];
  let providerSource: ProviderSource = "database";
  let localProviderFetchCount = 0;
  let wideProviderFallbackCount = 0;
  let wideProviderFallbackUsed = false;

  const decorateScope = (places: any[], scope: string) =>
    places.map((place: any) => ({ ...place, provider_locality_scope: scope }));

  const fetchGooglePlacesForRadius = async (searchRadius: number) => {
    if (!googleApiKey || !includeGooglePlaces) return [];
    console.log("[discover-hospitals] google fetch", {
      providerCategory,
      radius: searchRadius,
      regionLocalFirstEnabled,
      countryCode: countryCode || null,
    });
    return fetchGoogleProviderPlaces({
      apiKey: googleApiKey,
      latitude,
      longitude,
      radius: searchRadius,
      mode,
      query,
      limit,
      providerCategory,
      countryCode,
    });
  };

  if (regionLocalFirstEnabled && mode === "nearby") {
    const localRadius = Math.min(radius, MAP_LOCAL_NEARBY_RADIUS_KM * 1000);
    const localGooglePlaces = await fetchGooglePlacesForRadius(localRadius);
    if (localGooglePlaces.length > 0) {
      providerData = decorateScope(localGooglePlaces, LOCALITY_SCOPE_LOCAL);
      providerSource = "google";
    }
    localProviderFetchCount = providerData.length;

    if (providerData.length < localComfortTarget) {
      const wideGooglePlaces = await fetchGooglePlacesForRadius(radius);
      if (wideGooglePlaces.length > 0) {
        providerData = [
          ...providerData,
          ...decorateScope(wideGooglePlaces, LOCALITY_SCOPE_WIDE_FALLBACK),
        ];
        providerSource = "google";
        wideProviderFallbackUsed = true;
        wideProviderFallbackCount = wideGooglePlaces.length;
      }
    }
  } else {
    const googlePlaces = await fetchGooglePlacesForRadius(radius);
    if (googlePlaces.length > 0) {
      providerData = decorateScope(googlePlaces, LOCALITY_SCOPE_LOCAL);
      providerSource = "google";
    }
  }

  if (providerData.length === 0 && mapboxToken && includeMapboxPlaces) {
    providerData = await fetchMapboxProviderPlaces({
      accessToken: mapboxToken,
      latitude,
      longitude,
      mode,
      query,
      limit,
      providerCategory,
    });
    providerSource = "mapbox";
    providerData = decorateScope(
      providerData,
      regionLocalFirstEnabled ? LOCALITY_SCOPE_WIDE_FALLBACK : LOCALITY_SCOPE_LOCAL,
    );
    if (regionLocalFirstEnabled && providerData.length > 0) {
      wideProviderFallbackUsed = true;
      wideProviderFallbackCount = providerData.length;
    }
  }

  return {
    providerData,
    providerSource,
    localProviderFetchCount,
    wideProviderFallbackCount,
    wideProviderFallbackUsed,
  };
};

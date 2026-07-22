import { withProviderDefaults } from "./defaults.ts";
import type { ProviderSource } from "./discoveryFlow.ts";
import { shouldKeepProviderForRequestedCategory } from "./guards.ts";
import {
  normalizeGooglePlace,
  normalizeMapboxPlace,
  type ProviderMediaProxyBuilder,
} from "./normalizeExternal.ts";
import { withDistanceFromOrigin } from "./rows.ts";

export const normalizeExternalProviderRows = ({
  providerData,
  providerSource,
  latitude,
  longitude,
  radiusMeters,
  providerCategory,
  buildMediaProxyUrl,
}: {
  providerData: any[];
  providerSource: ProviderSource;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  providerCategory: string;
  buildMediaProxyUrl: ProviderMediaProxyBuilder;
}): any[] =>
  providerData
    .map((place: any, index: number) =>
      providerSource === "mapbox"
        ? normalizeMapboxPlace(place, latitude, longitude, index)
        : normalizeGooglePlace(place, latitude, longitude, index, buildMediaProxyUrl)
    )
    .map((place: any) => withProviderDefaults(place, providerSource, providerCategory))
    .map((place: any) => withDistanceFromOrigin(place, latitude, longitude))
    .filter(
      (place: any) =>
        !!place?.place_id &&
        Number.isFinite(place?.latitude) &&
        Number.isFinite(place?.longitude) &&
        Number.isFinite(place?.distance_km) &&
        place.distance_km <= radiusMeters / 1000 &&
        shouldKeepProviderForRequestedCategory(place, providerCategory)
    );

export const normalizeGoogleDirectoryRows = ({
  providerData,
  providerCategory,
  buildMediaProxyUrl,
}: {
  providerData: any[];
  providerCategory: string;
  buildMediaProxyUrl: ProviderMediaProxyBuilder;
}): any[] =>
  providerData
    .map((place: any, index: number) =>
      normalizeGooglePlace(place, Number.NaN, Number.NaN, index, buildMediaProxyUrl)
    )
    .map((place: any) => withProviderDefaults(place, "google", providerCategory))
    .filter(
      (place: any) =>
        !!place?.place_id &&
        Number.isFinite(place?.latitude) &&
        Number.isFinite(place?.longitude) &&
        shouldKeepProviderForRequestedCategory(place, providerCategory)
    );

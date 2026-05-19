import { getBooleanEnv, getEnv } from "../../env/env.ts";
import { buildProviderMediaProxyUrl } from "./media.ts";

export const getProviderGooglePlacesConfig = (): {
  enabled: boolean;
  apiKey: string;
} => ({
  enabled: getBooleanEnv(false, "ENABLE_GOOGLE_PLACES", "EXPO_PUBLIC_ENABLE_GOOGLE_PLACES"),
  apiKey: getEnv(
    "GOOGLE_MAPS_API_KEY",
    "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY",
    "GOOGLE_MAPS_ANDROID_API_KEY",
  ),
});

export const getProviderMapboxToken = (): string =>
  getEnv("MAPBOX_ACCESS_TOKEN", "EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN");

export const buildConfiguredProviderMediaProxyUrl = (placeId: string): string =>
  buildProviderMediaProxyUrl(
    getEnv("SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_URL"),
    placeId,
  );

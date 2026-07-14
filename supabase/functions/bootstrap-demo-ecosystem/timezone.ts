import { toFiniteNumber, toSafeString } from "../_shared/domain/demo/utils.ts";
import { getEnv } from "../_shared/env/env.ts";

const GOOGLE_TIME_ZONE_API_URL =
  "https://maps.googleapis.com/maps/api/timezone/json";
const TIME_API_COORDINATE_URL = "https://timeapi.io/api/timezone/coordinate";
const TIME_ZONE_LOOKUP_TIMEOUT_MS = 5_000;
const GOOGLE_TIME_ZONE_COORDINATE_PRECISION = 6;

type FacilityTimezoneResolution =
  | { ok: true; timezone: string; source: "google" | "timeapi" }
  | { ok: false; reason: string };

export type FacilityTimezoneResolver = (
  latitude: unknown,
  longitude: unknown,
) => Promise<FacilityTimezoneResolution>;

export const normalizeIanaTimezone = (value: unknown) => {
  const candidate = toSafeString(value, "");
  if (!candidate || candidate.length > 255) return null;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(
      new Date(0),
    );
    return candidate;
  } catch {
    return null;
  }
};

const normalizeFacilityCoordinates = (
  latitude: unknown,
  longitude: unknown,
) => {
  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined
  ) {
    return null;
  }

  const latitudeNumber = toFiniteNumber(latitude);
  const longitudeNumber = toFiniteNumber(longitude);
  if (
    latitudeNumber === null ||
    longitudeNumber === null ||
    latitudeNumber < -90 ||
    latitudeNumber > 90 ||
    longitudeNumber < -180 ||
    longitudeNumber > 180
  ) {
    return null;
  }

  const latitudeKey = latitudeNumber.toFixed(
    GOOGLE_TIME_ZONE_COORDINATE_PRECISION,
  );
  const longitudeKey = longitudeNumber.toFixed(
    GOOGLE_TIME_ZONE_COORDINATE_PRECISION,
  );
  return {
    key: `${latitudeKey},${longitudeKey}`,
    location: `${latitudeKey},${longitudeKey}`,
    latitude: latitudeKey,
    longitude: longitudeKey,
  };
};

const fetchTimezonePayload = async (url: URL) => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    TIME_ZONE_LOOKUP_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return { ok: false as const, reason: `http_${response.status}` };
    }

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return { ok: false as const, reason: "invalid_response" };
    }

    return {
      ok: true as const,
      payload: payload as Record<string, unknown>,
    };
  } catch (error) {
    const errorName = error instanceof DOMException || error instanceof Error
      ? error.name
      : "";
    return {
      ok: false as const,
      reason: errorName === "AbortError" ? "timeout" : "network_error",
    };
  } finally {
    clearTimeout(timeout);
  }
};

const resolveGoogleTimezone = async (
  coordinates: NonNullable<ReturnType<typeof normalizeFacilityCoordinates>>,
  timestampSeconds: number,
  googleApiKey: string,
): Promise<FacilityTimezoneResolution> => {
  if (!googleApiKey) {
    return { ok: false, reason: "missing_google_maps_api_key" };
  }

  const url = new URL(GOOGLE_TIME_ZONE_API_URL);
  url.searchParams.set("location", coordinates.location);
  url.searchParams.set("timestamp", String(timestampSeconds));
  url.searchParams.set("key", googleApiKey);

  const result = await fetchTimezonePayload(url);
  if (!result.ok) {
    return { ok: false, reason: `google_${result.reason}` };
  }

  const status = toSafeString(result.payload.status, "UNKNOWN");
  if (status !== "OK") {
    const safeStatus = status
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 40);
    return {
      ok: false,
      reason: `google_${safeStatus || "error"}`,
    };
  }

  const timezone = normalizeIanaTimezone(result.payload.timeZoneId);
  return timezone
    ? { ok: true, timezone, source: "google" }
    : { ok: false, reason: "google_invalid_timezone" };
};

const resolveTimeApiTimezone = async (
  coordinates: NonNullable<ReturnType<typeof normalizeFacilityCoordinates>>,
): Promise<FacilityTimezoneResolution> => {
  const url = new URL(TIME_API_COORDINATE_URL);
  url.searchParams.set("latitude", coordinates.latitude);
  url.searchParams.set("longitude", coordinates.longitude);

  const result = await fetchTimezonePayload(url);
  if (!result.ok) {
    return { ok: false, reason: `timeapi_${result.reason}` };
  }

  const timezone = normalizeIanaTimezone(result.payload.timeZone);
  return timezone
    ? { ok: true, timezone, source: "timeapi" }
    : { ok: false, reason: "timeapi_invalid_timezone" };
};

// PULLBACK NOTE: Scheduled demo facility timezone hardening.
// OLD: Missing or invalid timezone truth silently became UTC.
// NEW: Bounded, validated coordinate resolution is required before provisioning.
export const createFacilityTimezoneResolver = (
  now: Date,
): FacilityTimezoneResolver => {
  const googleApiKey = getEnv("GOOGLE_MAPS_API_KEY");
  const timestampSeconds = Math.floor(now.getTime() / 1000);
  const lookupsByCoordinate = new Map<
    string,
    Promise<FacilityTimezoneResolution>
  >();

  return (latitude, longitude) => {
    const coordinates = normalizeFacilityCoordinates(latitude, longitude);
    if (!coordinates) {
      return Promise.resolve({ ok: false, reason: "invalid_coordinates" });
    }

    const cachedLookup = lookupsByCoordinate.get(coordinates.key);
    if (cachedLookup) return cachedLookup;

    const lookup = (async (): Promise<FacilityTimezoneResolution> => {
      const googleResult = await resolveGoogleTimezone(
        coordinates,
        timestampSeconds,
        googleApiKey,
      );
      if ("timezone" in googleResult) return googleResult;
      const primaryReason = googleResult.reason;

      const fallbackResult = await resolveTimeApiTimezone(coordinates);
      if ("timezone" in fallbackResult) {
        console.warn(
          "[bootstrap-demo-ecosystem] timezone provider fallback used",
          {
            primary_reason: primaryReason,
            source: fallbackResult.source,
          },
        );
        return fallbackResult;
      }

      return {
        ok: false,
        reason: `${primaryReason};${fallbackResult.reason}`,
      };
    })();

    lookupsByCoordinate.set(coordinates.key, lookup);
    return lookup;
  };
};

import { Platform } from "react-native";
import { ROUTE_CONFIG } from "../constants/mapConfig";
import { calculateDistance } from "../utils/mapUtils";
import mapboxService from "./mapboxService";

export const MAP_ROUTE_PROFILE = "driving";
export const ROUTE_CACHE_TTL_MS = 2 * 60 * 1000;
export const ROUTE_FALLBACK_CACHE_TTL_MS = 15 * 1000;
export const ROUTE_CACHE_GC_MS = 10 * 60 * 1000;

export function buildRouteKey(origin, destination) {
  if (!origin || !destination) return null;

  const originLat = Number(origin.latitude);
  const originLng = Number(origin.longitude);
  const destinationLat = Number(destination.latitude);
  const destinationLng = Number(destination.longitude);

  if (
    !Number.isFinite(originLat) ||
    !Number.isFinite(originLng) ||
    !Number.isFinite(destinationLat) ||
    !Number.isFinite(destinationLng)
  ) {
    return null;
  }

  return [
    originLat.toFixed(6),
    originLng.toFixed(6),
    destinationLat.toFixed(6),
    destinationLng.toFixed(6),
  ].join(":");
}

export function getRouteCacheTtlMs(result) {
  return result?.isFallback ? ROUTE_FALLBACK_CACHE_TTL_MS : ROUTE_CACHE_TTL_MS;
}

export function isRouteResultFresh(result, now = Date.now()) {
  if (
    !result ||
    !Array.isArray(result.coordinates) ||
    result.coordinates.length < 2
  ) {
    return false;
  }

  const fetchedAtMs = Number(result.fetchedAtMs);
  if (!Number.isFinite(fetchedAtMs)) {
    return false;
  }

  return now - fetchedAtMs < getRouteCacheTtlMs(result);
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller =
    typeof AbortController === "function" ? new AbortController() : null;
  const timeoutId = setTimeout(() => {
    controller?.abort?.();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller?.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response?.ok) {
      throw new Error(`HTTP ${response?.status || "unknown"}`);
    }

    return await response.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Timeout");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function buildFallbackRoute({
  origin,
  destination,
  reason = "unavailable",
  debug = false,
}) {
  const originLat = Number(origin?.latitude);
  const originLng = Number(origin?.longitude);
  const destinationLat = Number(destination?.latitude);
  const destinationLng = Number(destination?.longitude);

  if (
    !Number.isFinite(originLat) ||
    !Number.isFinite(originLng) ||
    !Number.isFinite(destinationLat) ||
    !Number.isFinite(destinationLng)
  ) {
    return null;
  }

  const straightLineKm = calculateDistance(origin, destination);
  const estimatedRoadDistanceMeters = Math.max(
    250,
    Math.round(straightLineKm * 1000 * 1.2),
  );
  const assumedUrbanSpeedKmh = Platform.OS === "web" ? 30 : 34;
  const estimatedDurationSec = Math.max(
    60,
    Math.round(
      (estimatedRoadDistanceMeters / 1000 / assumedUrbanSpeedKmh) * 3600,
    ),
  );

  if (debug) {
    console.warn(`[routeService] Using direct fallback route (${reason})`);
  }

  return {
    coordinates: [
      { latitude: originLat, longitude: originLng },
      { latitude: destinationLat, longitude: destinationLng },
    ],
    durationSec: estimatedDurationSec,
    distanceMeters: estimatedRoadDistanceMeters,
    isFallback: true,
    source: "fallback",
  };
}

async function getMapboxRoute({ origin, destination, timeoutMs }) {
  const accessToken = mapboxService.accessToken;
  if (!accessToken) {
    console.warn("[routeService] Mapbox access token not available");
    return null;
  }

  try {
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/${MAP_ROUTE_PROFILE}/` +
      `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
      `?geometries=geojson&overview=full&access_token=${accessToken}`;

    const json = await fetchJsonWithTimeout(url, timeoutMs);
    const route = json?.routes?.[0];
    const geometry = route?.geometry;

    if (
      geometry?.type === "LineString" &&
      Array.isArray(geometry.coordinates)
    ) {
      const coordinates = geometry.coordinates.map(([longitude, latitude]) => ({
        latitude,
        longitude,
      }));

      if (coordinates.length >= 2) {
        return {
          coordinates,
          durationSec: route?.duration ?? null,
          distanceMeters: route?.distance ?? null,
          isFallback: false,
          source: "mapbox",
        };
      }
    }
  } catch (error) {
    if (error?.message === "Timeout") {
      console.warn("[routeService] Mapbox route timed out, falling back");
    } else {
      console.error("[routeService] Mapbox route failed:", error);
    }
  }

  return null;
}

async function getOSRMRoute({
  origin,
  destination,
  timeoutMs,
  isBrowserRuntime,
  debug = false,
}) {
  if (isBrowserRuntime) {
    if (debug) {
      console.warn(
        "[routeService] Skipping direct OSRM fetch in browser runtime; using cached or fallback preview.",
      );
    }
    return null;
  }

  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
      `?overview=full&geometries=geojson&alternatives=false&steps=false`;

    const json = await fetchJsonWithTimeout(url, timeoutMs);
    const route = json?.routes?.[0];
    const coordinatesRaw = route?.geometry?.coordinates;

    if (Array.isArray(coordinatesRaw) && coordinatesRaw.length >= 2) {
      return {
        coordinates: coordinatesRaw.map(([longitude, latitude]) => ({
          latitude,
          longitude,
        })),
        durationSec: Number.isFinite(route?.duration) ? route.duration : null,
        distanceMeters: Number.isFinite(route?.distance)
          ? route.distance
          : null,
        isFallback: false,
        source: "osrm",
      };
    }
  } catch (error) {
    if (error?.message === "Timeout") {
      console.warn("[routeService] OSRM route timed out, falling back.");
    } else {
      console.error("[routeService] OSRM route failed:", error);
    }
  }

  return null;
}

export async function fetchRouteSnapshot({
  origin,
  destination,
  debug = false,
  isBrowserRuntime = typeof window !== "undefined" &&
    typeof document !== "undefined",
}) {
  const routeKey = buildRouteKey(origin, destination);
  if (!routeKey) {
    return null;
  }

  const timeoutMs =
    Platform.OS === "web"
      ? Math.min(ROUTE_CONFIG.ROUTE_FETCH_TIMEOUT, 4500)
      : ROUTE_CONFIG.ROUTE_FETCH_TIMEOUT;

  let result = await getMapboxRoute({ origin, destination, timeoutMs });
  if (!result) {
    result = await getOSRMRoute({
      origin,
      destination,
      timeoutMs,
      isBrowserRuntime,
      debug,
    });
  }
  if (!result) {
    result = buildFallbackRoute({
      origin,
      destination,
      reason: "route_api_unavailable",
      debug,
    });
  }
  if (!result) {
    return null;
  }

  return {
    ...result,
    routeKey,
    profile: MAP_ROUTE_PROFILE,
    origin: {
      latitude: Number(origin.latitude),
      longitude: Number(origin.longitude),
    },
    destination: {
      latitude: Number(destination.latitude),
      longitude: Number(destination.longitude),
    },
    fetchedAtMs: Date.now(),
  };
}

/**
 * useEmergencyLocationSync.js
 *
 * Owns: userLocation state + sync from GlobalLocationContext.
 * Also exposes parseEtaToSeconds (pure util used by server sync + actions).
 */

import { useEffect, useRef, useCallback } from "react";
import { useGlobalLocation } from "../../contexts/GlobalLocationContext";
import { DEFAULT_APP_REGION } from "../../constants/locationDefaults";
import { useLocationStore } from "../../stores/locationStore";

// GPS noise below this threshold should not churn persisted pickup fallback or
// trigger location-scoped discovery work. A new device observation beyond it
// remains meaningful enough to replace a stale device-owned snapshot.
export const DEVICE_LOCATION_SYNC_MIN_DISTANCE_METERS = 25;

function isFiniteCoordinateValue(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

export function hasFiniteLocationCoordinates(location) {
  if (
    !isFiniteCoordinateValue(location?.latitude) ||
    !isFiniteCoordinateValue(location?.longitude)
  ) {
    return false;
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function distanceBetweenLocationsMeters(first, second) {
  const firstLatitude = Number(first?.latitude);
  const firstLongitude = Number(first?.longitude);
  const secondLatitude = Number(second?.latitude);
  const secondLongitude = Number(second?.longitude);
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(secondLatitude - firstLatitude);
  const longitudeDelta = toRadians(secondLongitude - firstLongitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(firstLatitude)) *
      Math.cos(toRadians(secondLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Decides whether a live device observation may replace the persisted fallback.
 * Manual pickup is deliberate user intent and is never a GPS-sync target.
 */
export function resolveDeviceLocationStoreUpdate({
  globalLocation,
  globalLocationSource,
  currentLocation,
  currentLocationSource,
  minDistanceMeters = DEVICE_LOCATION_SYNC_MIN_DISTANCE_METERS,
} = {}) {
  if (
    globalLocationSource !== "device" ||
    !hasFiniteLocationCoordinates(globalLocation) ||
    currentLocationSource === "manual"
  ) {
    return null;
  }

  const latitude = Number(globalLocation.latitude);
  const longitude = Number(globalLocation.longitude);
  const currentIsValid = hasFiniteLocationCoordinates(currentLocation);
  const currentIsDeviceOwned =
    currentLocationSource === "device" || currentLocationSource === "persisted";

  if (
    currentIsValid &&
    currentIsDeviceOwned &&
    distanceBetweenLocationsMeters(currentLocation, globalLocation) <
      minDistanceMeters
  ) {
    // A fresh observation can still promote a legacy persisted fallback to
    // device-owned truth, but identical/noisy device snapshots are idempotent.
    return currentLocationSource === "persisted"
      ? {
          latitude,
          longitude,
          latitudeDelta:
            Number(currentLocation?.latitudeDelta) ||
            DEFAULT_APP_REGION.latitudeDelta,
          longitudeDelta:
            Number(currentLocation?.longitudeDelta) ||
            DEFAULT_APP_REGION.longitudeDelta,
        }
      : null;
  }

  return {
    latitude,
    longitude,
    latitudeDelta:
      Number(currentLocation?.latitudeDelta) || DEFAULT_APP_REGION.latitudeDelta,
    longitudeDelta:
      Number(currentLocation?.longitudeDelta) || DEFAULT_APP_REGION.longitudeDelta,
  };
}

export function useEmergencyLocationSync() {
  const {
    userLocation: globalUserLocation,
    locationSource: globalLocationSource,
    lastUpdated: globalLocationUpdatedAt,
  } = useGlobalLocation();
  const userLocation = useLocationStore((s) => s.userLocation);
  const userLocationSource = useLocationStore((s) => s.userLocationSource);
  const setUserLocation = useLocationStore((s) => s.setUserLocation);
  const userLocationRef = useRef(userLocation);
  const lastDeviceObservationAtRef = useRef(null);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  // PULLBACK NOTE: device fallback freshness repair.
  // OLD: a populated persisted coordinate blocked every fresh device fix.
  // NEW: device-owned snapshots advance on meaningful GPS movement; manual stays protected.
  useEffect(() => {
    const observationAt = Number(globalLocationUpdatedAt);
    if (
      Number.isFinite(observationAt) &&
      Number.isFinite(lastDeviceObservationAtRef.current) &&
      observationAt <= lastDeviceObservationAtRef.current
    ) {
      return;
    }

    const current = useLocationStore.getState().userLocation;
    const currentSource = useLocationStore.getState().userLocationSource;
    const nextDeviceLocation = resolveDeviceLocationStoreUpdate({
      globalLocation: globalUserLocation,
      globalLocationSource,
      currentLocation: current,
      currentLocationSource: currentSource,
    });
    if (Number.isFinite(observationAt)) {
      lastDeviceObservationAtRef.current = observationAt;
    }
    if (!nextDeviceLocation) return;

    setUserLocation(nextDeviceLocation, "device");
  }, [
    globalLocationSource,
    globalLocationUpdatedAt,
    globalUserLocation?.latitude,
    globalUserLocation?.longitude,
    setUserLocation,
  ]);

  const parseEtaToSeconds = useCallback((eta) => {
    if (eta === null || eta === undefined) return null;
    if (typeof eta === "number") return eta;
    if (typeof eta !== "string") return null;
    const lower = eta.toLowerCase();
    if (lower === "unknown" || lower === "8-12 mins") return 600;
    const minutesMatch = lower.match(/(\d+)\s*(min|mins|minute|minutes)/);
    if (minutesMatch) return Number(minutesMatch[1]) * 60;
    const secondsMatch = lower.match(/(\d+)\s*(sec|secs|second|seconds)/);
    if (secondsMatch) return Number(secondsMatch[1]);
    if (/^\d+$/.test(eta)) return Number(eta);
    return 600;
  }, []);

  return {
    userLocation,
    userLocationSource,
    setUserLocation,
    userLocationRef,
    parseEtaToSeconds,
  };
}

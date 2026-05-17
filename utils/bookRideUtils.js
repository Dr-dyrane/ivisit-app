// utils/bookRideUtils.js
//
// EXPLORE-CARE-01 — EXP-9: Book Ride CTA — Uber deep-link
//
// Utility to open Uber (or fallback providers) with a pre-filled destination
// when a user wants to ride to an Explore Care provider (pharmacy, lab, clinic, etc.)
//
// This is intentionally explore-mode only.
// Emergency transport is handled by the ambulance dispatch flow.

import { Linking } from "react-native";

const UBER_CLIENT_ID = ""; // TODO: register in Uber developer portal and set env

/**
 * Build Uber deep-link URL to a provider destination.
 * Uber Universal Links: https://developer.uber.com/docs/riders/ride-requests/tutorials/deep-links
 *
 * @param {Object} params
 * @param {number} params.destLat       - Destination latitude
 * @param {number} params.destLng       - Destination longitude
 * @param {string} params.destNickname  - Human-readable destination name
 * @param {number} [params.pickupLat]   - Pickup latitude (optional — Uber uses device location if absent)
 * @param {number} [params.pickupLng]   - Pickup longitude (optional)
 * @param {string} [params.pickupNickname] - Pickup nickname (optional)
 */
export function buildUberDeepLink({ destLat, destLng, destNickname, pickupLat, pickupLng, pickupNickname }) {
  if (!Number.isFinite(destLat) || !Number.isFinite(destLng)) return null;

  const params = new URLSearchParams({
    action: "setPickup",
    // Destination
    "dropoff[latitude]": String(destLat),
    "dropoff[longitude]": String(destLng),
    "dropoff[nickname]": encodeURIComponent(destNickname ?? "Healthcare Provider"),
  });

  if (Number.isFinite(pickupLat) && Number.isFinite(pickupLng)) {
    params.set("pickup[latitude]", String(pickupLat));
    params.set("pickup[longitude]", String(pickupLng));
    if (pickupNickname) {
      params.set("pickup[nickname]", encodeURIComponent(pickupNickname));
    }
  } else {
    params.set("pickup", "my_location");
  }

  if (UBER_CLIENT_ID) {
    params.set("client_id", UBER_CLIENT_ID);
  }

  return `uber://?${params.toString()}`;
}

/**
 * Build Google Maps / Apple Maps fallback URL for directions by car.
 */
function buildMapsDirectionsUrl(destLat, destLng, destName) {
  const encodedName = encodeURIComponent(destName ?? "");
  const appleMaps = `maps://maps.apple.com/?daddr=${destLat},${destLng}&q=${encodedName}&dirflg=d`;
  const googleMaps = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
  return { appleMaps, googleMaps };
}

/**
 * openRideToProvider
 *
 * Attempts to open Uber with a pre-filled destination.
 * Falls back to Apple Maps then Google Maps if Uber is not installed.
 *
 * @param {Object} provider  - Provider domain object from hospitalsService._mapHospital()
 * @param {Object} [userLocation] - { latitude, longitude } for pickup (optional)
 */
export async function openRideToProvider(provider, userLocation = null) {
  const destLat = provider?.coordinates?.latitude;
  const destLng = provider?.coordinates?.longitude;
  const destName = provider?.name ?? "Healthcare Provider";

  if (!Number.isFinite(destLat) || !Number.isFinite(destLng)) {
    console.warn("[bookRideUtils] Provider has no valid coordinates — cannot open ride CTA");
    return;
  }

  const pickupLat = userLocation?.latitude;
  const pickupLng = userLocation?.longitude;

  const uberUrl = buildUberDeepLink({
    destLat,
    destLng,
    destNickname: destName,
    pickupLat,
    pickupLng,
  });

  if (uberUrl) {
    const canOpenUber = await Linking.canOpenURL(uberUrl).catch(() => false);
    if (canOpenUber) {
      await Linking.openURL(uberUrl).catch(() => {});
      return;
    }
  }

  // Uber not installed — fall back to maps directions
  const { appleMaps, googleMaps } = buildMapsDirectionsUrl(destLat, destLng, destName);
  const canOpenApple = await Linking.canOpenURL(appleMaps).catch(() => false);
  if (canOpenApple) {
    await Linking.openURL(appleMaps).catch(() => {});
    return;
  }
  await Linking.openURL(googleMaps).catch(() => {});
}

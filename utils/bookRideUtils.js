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

const UBER_CLIENT_ID = process.env.EXPO_PUBLIC_UBER_CLIENT_ID ?? "";

/**
 * Build Uber deep-link URLs to a provider destination.
 *
 * Returns BOTH the native scheme (`uber://`) and the universal link
 * (`https://m.uber.com/ul/`). The universal link is the preferred entry point
 * because it works without `LSApplicationQueriesSchemes` registration on iOS
 * and without Android 11+ `<queries>` declarations — the OS auto-launches the
 * Uber app when installed and falls through to the mobile web flow otherwise.
 *
 * Docs: https://developer.uber.com/docs/riders/ride-requests/tutorials/deep-links
 *
 * Two notable issues with the original implementation, fixed here:
 *   - `URLSearchParams` double-encoded nicknames (encodeURIComponent then
 *     URLSearchParams re-encoded the result). We build the query manually.
 *   - `URLSearchParams` also percent-encodes `[` / `]`, which Uber's parser
 *     accepts inconsistently.
 */
export function buildUberDeepLink({ destLat, destLng, destNickname, pickupLat, pickupLng, pickupNickname }) {
  if (!Number.isFinite(destLat) || !Number.isFinite(destLng)) return null;

  const enc = encodeURIComponent;
  const safeName = (destNickname && destNickname.trim()) || "Healthcare Provider";

  const parts = [
    `action=setPickup`,
    `dropoff[latitude]=${destLat}`,
    `dropoff[longitude]=${destLng}`,
    `dropoff[nickname]=${enc(safeName)}`,
  ];

  if (Number.isFinite(pickupLat) && Number.isFinite(pickupLng)) {
    parts.push(`pickup[latitude]=${pickupLat}`);
    parts.push(`pickup[longitude]=${pickupLng}`);
    if (pickupNickname) parts.push(`pickup[nickname]=${enc(pickupNickname)}`);
  } else {
    parts.push(`pickup=my_location`);
  }

  if (UBER_CLIENT_ID) parts.push(`client_id=${enc(UBER_CLIENT_ID)}`);

  const query = parts.join("&");
  return {
    universal: `https://m.uber.com/ul/?${query}`,
    native:    `uber://?${query}`,
  };
}

/**
 * Build Google Maps / Apple Maps fallback URLs for directions by car.
 * Apple Maps native scheme is `maps://?daddr=...` (no host). The previous
 * `maps://maps.apple.com/...` form is not a recognized iOS scheme.
 */
function buildMapsDirectionsUrl(destLat, destLng, destName) {
  const encodedName = encodeURIComponent(destName ?? "");
  const appleMaps = `maps://?daddr=${destLat},${destLng}&q=${encodedName}&dirflg=d`;
  const appleMapsWeb = `https://maps.apple.com/?daddr=${destLat},${destLng}&q=${encodedName}&dirflg=d`;
  const googleMaps = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
  return { appleMaps, appleMapsWeb, googleMaps };
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

  const uberLinks = buildUberDeepLink({
    destLat,
    destLng,
    destNickname: destName,
    pickupLat,
    pickupLng,
  });

  // Strategy:
  //   1. Try the Uber universal link — OS launches the app if installed, falls
  //      through to mobile web otherwise. Works without LSApplicationQueriesSchemes.
  //   2. If that fails entirely (rare — device with no browser at all),
  //      try the native `uber://` scheme.
  //   3. Last resort: Apple Maps (native then web) → Google Maps.
  if (uberLinks?.universal) {
    try {
      await Linking.openURL(uberLinks.universal);
      return;
    } catch (err) {
      console.warn("[bookRideUtils] Uber universal link failed:", err?.message);
    }
  }

  if (uberLinks?.native) {
    try {
      await Linking.openURL(uberLinks.native);
      return;
    } catch (_) {
      // fall through to maps
    }
  }

  const { appleMaps, appleMapsWeb, googleMaps } = buildMapsDirectionsUrl(destLat, destLng, destName);
  for (const url of [appleMaps, appleMapsWeb, googleMaps]) {
    try {
      await Linking.openURL(url);
      return;
    } catch (_) {
      // try next
    }
  }
  console.warn("[bookRideUtils] All ride/maps fallbacks failed");
}

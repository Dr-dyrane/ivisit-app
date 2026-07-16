// components/map/ProviderMarkers.jsx
//
// EXPLORE-CARE-01 — EXP-7: Category Markers — pre-colored static PNGs per provider type
//
// Renders non-emergency provider markers on the map.
// Each provider type has its own pre-colored PNG (normal + selected) generated from
// hospital.png / selected_hospital.png via scripts/generate-provider-markers.mjs.
//
// Using static image= assets (same as HospitalMarkers) avoids all iOS marker instability:
// - no tintColor (broken on iOS with image= prop)
// - no custom children (causes tracksViewChanges render loop and blank markers on iOS)
//
// Emergency hospital markers are handled by HospitalMarkers.jsx (unchanged).
// This component ONLY renders non-hospital explore providers.

import React, { memo } from "react";
import { Platform } from "react-native";
import { Marker } from "./MapComponents";
import { PROVIDER_TYPES } from "../../constants/providerTypes";

// Pre-colored static PNGs per provider type — generated from hospital.png base
// Each pair: normal (54x91) and selected (68x114), matching hospital marker dimensions
// ANDROID MARKER LAW (2026-07-15, marker-defect audit): Android installed builds
// require the density-variant set under assets/map/android/ (@3x = byte-copy of
// the proven bitmaps) because fromResource density-scales mdpi resources -> giant
// pins. iOS/web keep the originals (shared variants regressed iOS tiny in May).
const PROVIDER_MARKER_IMAGES = Platform.OS === "android" ? {
  [PROVIDER_TYPES.PHARMACY]:     { normal: require("../../assets/map/android/provider-markers/pharmacy.png"),      selected: require("../../assets/map/android/provider-markers/selected_pharmacy.png") },
  [PROVIDER_TYPES.LAB]:          { normal: require("../../assets/map/android/provider-markers/lab.png"),           selected: require("../../assets/map/android/provider-markers/selected_lab.png") },
  [PROVIDER_TYPES.RADIOLOGY]:    { normal: require("../../assets/map/android/provider-markers/radiology.png"),     selected: require("../../assets/map/android/provider-markers/selected_radiology.png") },
  [PROVIDER_TYPES.URGENT_CARE]:  { normal: require("../../assets/map/android/provider-markers/urgent_care.png"),   selected: require("../../assets/map/android/provider-markers/selected_urgent_care.png") },
  [PROVIDER_TYPES.CLINIC]:       { normal: require("../../assets/map/android/provider-markers/clinic.png"),        selected: require("../../assets/map/android/provider-markers/selected_clinic.png") },
  [PROVIDER_TYPES.MENTAL_HEALTH]:{ normal: require("../../assets/map/android/provider-markers/mental_health.png"), selected: require("../../assets/map/android/provider-markers/selected_mental_health.png") },
  [PROVIDER_TYPES.WOMENS_CARE]:  { normal: require("../../assets/map/android/provider-markers/womens_care.png"),   selected: require("../../assets/map/android/provider-markers/selected_womens_care.png") },
  [PROVIDER_TYPES.PEDIATRICS]:   { normal: require("../../assets/map/android/provider-markers/pediatrics.png"),    selected: require("../../assets/map/android/provider-markers/selected_pediatrics.png") },
} : {
  [PROVIDER_TYPES.PHARMACY]:     { normal: require("../../assets/map/provider-markers/pharmacy.png"),      selected: require("../../assets/map/provider-markers/selected_pharmacy.png") },
  [PROVIDER_TYPES.LAB]:          { normal: require("../../assets/map/provider-markers/lab.png"),           selected: require("../../assets/map/provider-markers/selected_lab.png") },
  [PROVIDER_TYPES.RADIOLOGY]:    { normal: require("../../assets/map/provider-markers/radiology.png"),     selected: require("../../assets/map/provider-markers/selected_radiology.png") },
  [PROVIDER_TYPES.URGENT_CARE]:  { normal: require("../../assets/map/provider-markers/urgent_care.png"),   selected: require("../../assets/map/provider-markers/selected_urgent_care.png") },
  [PROVIDER_TYPES.CLINIC]:       { normal: require("../../assets/map/provider-markers/clinic.png"),        selected: require("../../assets/map/provider-markers/selected_clinic.png") },
  [PROVIDER_TYPES.MENTAL_HEALTH]:{ normal: require("../../assets/map/provider-markers/mental_health.png"), selected: require("../../assets/map/provider-markers/selected_mental_health.png") },
  [PROVIDER_TYPES.WOMENS_CARE]:  { normal: require("../../assets/map/provider-markers/womens_care.png"),   selected: require("../../assets/map/provider-markers/selected_womens_care.png") },
  [PROVIDER_TYPES.PEDIATRICS]:   { normal: require("../../assets/map/provider-markers/pediatrics.png"),    selected: require("../../assets/map/provider-markers/selected_pediatrics.png") },
};

// Match hospital marker dimensions exactly (from EmergencyLocationPreviewMap checkpoint)
// native: normal 54x91, selected 68x114 | web: normal 28x48, selected 38x64
const MARKER_DIMENSIONS = {
  native: {
    normal:   { width: 54, height: 91 },
    selected: { width: 68, height: 114 },
  },
  web: {
    normal:   { width: 28, height: 48 },
    selected: { width: 38, height: 64 },
  },
};

const isWeb = Platform.OS === "web";

function getMarkerDimensions(isSelected) {
  const platform = isWeb ? MARKER_DIMENSIONS.web : MARKER_DIMENSIONS.native;
  return isSelected ? platform.selected : platform.normal;
}

// Anchor offset: pin bottom-tip sits on coordinate (mirrors HospitalMarkers)
const getBottomPinnedCenterOffset = (isSelected) => ({
  x: 0,
  y: -getMarkerDimensions(isSelected).height / 6,
});

const getProviderMarkerId = (provider) =>
  provider?.id ?? provider?.placeId ?? provider?.name ?? null;

/**
 * Single provider pin — static pre-colored asset, no tintColor, no custom children.
 * Mirrors HospitalMarkers pattern exactly for maximum iOS stability.
 */
function ProviderPin({ provider, isSelected, onPress }) {
  const providerType = provider?.providerType ?? PROVIDER_TYPES.CLINIC;
  const images = PROVIDER_MARKER_IMAGES[providerType] ?? PROVIDER_MARKER_IMAGES[PROVIDER_TYPES.CLINIC];

  const dims = getMarkerDimensions(isSelected);
  const centerOffset = getBottomPinnedCenterOffset(isSelected);
  const providerName =
    typeof provider?.name === "string" && provider.name.trim().length > 0
      ? provider.name.trim()
      : "Provider";

  return (
    <Marker
      coordinate={provider.coordinates}
      onPress={() => onPress?.(provider)}
      anchor={{ x: 0.5, y: 0.5 }}
      centerOffset={centerOffset}
      tracksViewChanges={false}
      zIndex={isSelected ? 90 : 2}
      image={isSelected ? images.selected : images.normal}
      imageSize={dims}
      title={providerName}
    />
  );
}

/**
 * ProviderMarkers
 *
 * Renders explore-mode provider markers (non-hospital categories only).
 * Pass all explore providers — hospital-type providers are filtered out
 * so they don't duplicate the existing HospitalMarkers layer.
 *
 * @param {Array}    providers           - Array of provider domain objects
 * @param {string}   selectedProviderId  - Currently selected provider id
 * @param {Function} onProviderPress     - Called with provider on tap
 */
const ProviderMarkers = ({ providers, selectedProviderId, onProviderPress }) => {
  if (!providers || providers.length === 0) return null;

  // PULLBACK NOTE: EXP-7 fix — show all same-category providers when one is selected.
  // OLD: selectedProviderId → hide all siblings → only selected pin shown (hides other pharmacies etc.)
  // NEW: always show all passed-in providers; selected pin gets elevated zIndex only.
  // Other category markers (hospitals etc.) are suppressed at the map level via suppressHospitalMarkers.
  const displayProviders = providers;

  return displayProviders
    .filter(
      (p) =>
        // Only non-hospital providers here — hospital layer is HospitalMarkers
        p?.providerType !== PROVIDER_TYPES.HOSPITAL &&
        Number.isFinite(p?.coordinates?.latitude) &&
        Number.isFinite(p?.coordinates?.longitude) &&
        getProviderMarkerId(p)
    )
    .map((provider) => (
      <ProviderPin
        key={`${getProviderMarkerId(provider)}:${provider.coordinates.latitude},${provider.coordinates.longitude}`}
        provider={provider}
        isSelected={selectedProviderId === getProviderMarkerId(provider)}
        onPress={onProviderPress}
      />
    ));
};

export default memo(ProviderMarkers);

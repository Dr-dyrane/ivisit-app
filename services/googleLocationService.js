import Constants from "expo-constants";
import mapboxService from "./mapboxService";

const GOOGLE_MAPS_SCRIPT_ID = "ivisit-google-maps-js";
const GOOGLE_MAPS_LOADER_ATTR = 'script[data-google-maps-loader="ivisit"]';

const clean = (value) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const getGoogleMapsApiKey = () =>
  clean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) ||
  clean(process.env.GOOGLE_MAPS_API_KEY) ||
  clean(Constants?.expoConfig?.extra?.googleMapsApiKey);

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getLatLngLiteral = (value) => {
  if (!value) return null;
  const latitude =
    typeof value.lat === "function" ? value.lat() : toNumber(value.lat ?? value.latitude);
  const longitude =
    typeof value.lng === "function" ? value.lng() : toNumber(value.lng ?? value.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude }
    : null;
};

const getCountryCode = (components = []) => {
  const country = components.find((item) => item?.types?.includes("country"));
  return clean(country?.short_name)?.toUpperCase() || null;
};

const getComponentText = (components = [], types = []) => {
  const match = components.find((item) =>
    types.some((type) => item?.types?.includes(type)),
  );
  return clean(match?.long_name) || clean(match?.short_name) || null;
};

const makeLocationBias = (location) => {
  const latitude = toNumber(location?.latitude ?? location?.coords?.latitude);
  const longitude = toNumber(location?.longitude ?? location?.coords?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;

  return {
    center: { lat: latitude, lng: longitude },
    radius: 50000,
  };
};

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      json?.error?.message ||
      json?.error_message ||
      `Google request failed with ${response.status}`;
    throw new Error(message);
  }
  return json;
}

let loadPromise = null;

async function ensureGoogleMapsLoaded() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Google Maps JavaScript is only available in the browser");
  }
  if (window.google?.maps?.importLibrary) return window.google.maps;
  if (loadPromise) return loadPromise;

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) throw new Error("Google Maps key is missing");

  loadPromise = new Promise((resolve, reject) => {
    let settled = false;
    let pollId = null;
    let timeoutId = null;

    const cleanup = () => {
      if (pollId) window.clearInterval(pollId);
      if (timeoutId) window.clearTimeout(timeoutId);
      delete window.ivisitGoogleMapsLocationReady;
    };

    const finish = () => {
      if (settled || !window.google?.maps?.importLibrary) return;
      settled = true;
      cleanup();
      resolve(window.google.maps);
    };

    const fail = (message) => {
      if (settled) return;
      settled = true;
      cleanup();
      loadPromise = null;
      reject(new Error(message));
    };

    window.ivisitGoogleMapsLocationReady = finish;
    const existingScript =
      document.getElementById(GOOGLE_MAPS_SCRIPT_ID) ||
      document.querySelector(GOOGLE_MAPS_LOADER_ATTR);

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = GOOGLE_MAPS_SCRIPT_ID;
      script.dataset.googleMapsLoader = "ivisit";
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=ivisitGoogleMapsLocationReady&loading=async`;
      script.addEventListener("error", () => fail("Failed to load Google Maps"));
      document.head.appendChild(script);
    }

    pollId = window.setInterval(finish, 120);
    timeoutId = window.setTimeout(() => {
      if (window.google?.maps?.importLibrary) {
        finish();
        return;
      }
      fail("Timed out loading Google Maps");
    }, 12000);
  });

  return loadPromise;
}

async function importGoogleLibrary(name) {
  const maps = await ensureGoogleMapsLoaded();
  return maps.importLibrary(name);
}

function normalizeGeocodeResult(result, fallbackLabel = "Selected location") {
  const components = Array.isArray(result?.address_components)
    ? result.address_components
    : [];
  const location = getLatLngLiteral(result?.geometry?.location);
  if (!location) return null;

  const streetNumber = getComponentText(components, ["street_number"]);
  const route = getComponentText(components, ["route"]);
  const locality = getComponentText(components, [
    "locality",
    "sublocality",
    "administrative_area_level_2",
  ]);
  const region = getComponentText(components, ["administrative_area_level_1"]);
  const primaryText =
    [streetNumber, route].filter(Boolean).join(" ").trim() ||
    getComponentText(components, ["point_of_interest", "establishment"]) ||
    clean(result?.name) ||
    clean(result?.formatted_address) ||
    fallbackLabel;
  const secondaryText =
    [locality, region].filter(Boolean).join(", ").trim() ||
    clean(result?.formatted_address) ||
    "";

  return {
    placeId: clean(result?.place_id) || clean(result?.placeId) || null,
    primaryText,
    secondaryText,
    formattedAddress: clean(result?.formatted_address) || secondaryText || primaryText,
    location,
    countryCode: getCountryCode(components),
    source: "google",
    requiresDetails: false,
    city: locality,
    state: region,
  };
}

async function geocodeAddress(address, { proximity = null, countryCode = null } = {}) {
  const trimmed = clean(address);
  if (!trimmed) throw new Error("Address is required");

  if (typeof window === "undefined" || typeof document === "undefined") {
    return geocodeAddressRest(trimmed, { proximity, countryCode });
  }

  const { Geocoder } = await importGoogleLibrary("geocoding");
  const geocoder = new Geocoder();
  const request = {
    address: trimmed,
  };
  if (countryCode) {
    request.componentRestrictions = { country: String(countryCode).toLowerCase() };
  }
  const bias = makeLocationBias(proximity);
  if (bias?.center) {
    request.location = bias.center;
  }

  const response = await geocoder.geocode(request);
  const result = Array.isArray(response?.results) ? response.results[0] : null;
  const normalized = normalizeGeocodeResult(result, trimmed);
  if (!normalized) throw new Error("No coordinates found for this address");

  return {
    latitude: normalized.location.latitude,
    longitude: normalized.location.longitude,
    formatted_address: normalized.formattedAddress,
    relevance: 1,
    countryCode: normalized.countryCode || countryCode || null,
    feature: result,
    source: "google",
  };
}

async function geocodeAddressRest(address, { proximity = null, countryCode = null } = {}) {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) throw new Error("Google Maps key is missing");

  const params = new URLSearchParams({
    address,
    key: apiKey,
  });
  if (countryCode) {
    params.set("components", `country:${String(countryCode).toLowerCase()}`);
  }
  const bias = makeLocationBias(proximity);
  if (bias?.center) {
    params.set("location", `${bias.center.lat},${bias.center.lng}`);
  }

  const json = await fetchJson(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
  );
  if (json.status !== "OK") {
    throw new Error(json.error_message || `Google geocode failed: ${json.status}`);
  }
  const result = Array.isArray(json.results) ? json.results[0] : null;
  const normalized = normalizeGeocodeResult(result, address);
  if (!normalized) throw new Error("No coordinates found for this address");

  return {
    latitude: normalized.location.latitude,
    longitude: normalized.location.longitude,
    formatted_address: normalized.formattedAddress,
    relevance: 1,
    countryCode: normalized.countryCode || countryCode || null,
    feature: result,
    source: "google",
  };
}

async function suggestWithNewPlaces({ query, proximity, countryCode }) {
  const { AutocompleteSessionToken, AutocompleteSuggestion } =
    await importGoogleLibrary("places");
  if (!AutocompleteSuggestion?.fetchAutocompleteSuggestions) return null;

  const sessionToken = new AutocompleteSessionToken();
  const request = {
    input: query,
    sessionToken,
    locationBias: makeLocationBias(proximity),
    includedRegionCodes: countryCode ? [String(countryCode).toLowerCase()] : undefined,
  };
  const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
  const suggestions = Array.isArray(response?.suggestions) ? response.suggestions : [];

  return Promise.all(
    suggestions.slice(0, 5).map(async (suggestion) => {
      const prediction = suggestion.placePrediction;
      if (!prediction) return null;
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ["id", "displayName", "formattedAddress", "location", "addressComponents"],
      });
      const location = getLatLngLiteral(place.location);
      if (!location) return null;
      const components = Array.isArray(place.addressComponents)
        ? place.addressComponents.map((component) => ({
            long_name: component.longText,
            short_name: component.shortText,
            types: component.types,
          }))
        : [];
      const primaryText =
        clean(place.displayName) ||
        clean(prediction.text?.text) ||
        clean(place.formattedAddress) ||
        "Selected location";
      const secondaryText = clean(place.formattedAddress) || clean(prediction.text?.text) || "";

      return {
        placeId: place.id || prediction.placeId || primaryText,
        primaryText,
        secondaryText,
        formattedAddress: clean(place.formattedAddress) || secondaryText || primaryText,
        location,
        countryCode: getCountryCode(components) || countryCode || null,
        source: "google",
        requiresDetails: false,
      };
    }),
  ).then((items) => items.filter(Boolean));
}

async function suggestWithLegacyPlaces({ query, proximity, countryCode }) {
  const { AutocompleteService } = await importGoogleLibrary("places");
  if (typeof AutocompleteService !== "function") return null;

  const service = new AutocompleteService();
  const request = {
    input: query,
    componentRestrictions: countryCode
      ? { country: String(countryCode).toLowerCase() }
      : undefined,
    locationBias: makeLocationBias(proximity),
  };

  const predictions = await new Promise((resolve, reject) => {
    service.getPlacePredictions(request, (items, status) => {
      const okStatus = window.google?.maps?.places?.PlacesServiceStatus?.OK;
      const zeroStatus = window.google?.maps?.places?.PlacesServiceStatus?.ZERO_RESULTS;
      if (status === okStatus) {
        resolve(Array.isArray(items) ? items : []);
        return;
      }
      if (status === zeroStatus) {
        resolve([]);
        return;
      }
      reject(new Error(`Google Places autocomplete failed: ${status}`));
    });
  });

  const geocoded = await Promise.all(
    predictions.slice(0, 5).map(async (prediction) => {
      try {
        const result = await geocodeAddress(prediction.description, {
          proximity,
          countryCode,
        });
        return {
          placeId: prediction.place_id,
          primaryText:
            prediction.structured_formatting?.main_text ||
            prediction.description ||
            "Selected location",
          secondaryText:
            prediction.structured_formatting?.secondary_text ||
            result.formatted_address ||
            "",
          formattedAddress: result.formatted_address || prediction.description || "",
          location: {
            latitude: result.latitude,
            longitude: result.longitude,
          },
          countryCode: result.countryCode || countryCode || null,
          source: "google",
          requiresDetails: false,
        };
      } catch {
        return null;
      }
    }),
  );

  return geocoded.filter(Boolean);
}

async function suggestAddresses(query, proximity = null) {
  const request = query && typeof query === "object" ? query : { query, proximity };
  const trimmed = clean(request.query);
  if (!trimmed) return [];

  try {
    const googleRequest = {
      query: trimmed,
      proximity: request.proximity || request.locationBias || request.location || proximity,
      countryCode: request.countryCode || null,
    };
    const places =
      typeof window === "undefined" || typeof document === "undefined"
        ? await suggestWithRestPlaces(googleRequest)
        : (await suggestWithNewPlaces(googleRequest)) ||
          (await suggestWithLegacyPlaces(googleRequest)) ||
          [];
    if (places.length > 0) return places;
  } catch (error) {
    if (
      typeof window !== "undefined" &&
      process.env.EXPO_PUBLIC_DEBUG_MODE === "true"
    ) {
      console.warn("[googleLocationService] Falling back after Google suggestion failure", error);
    }
  }

  return mapboxService.suggestAddresses(request, proximity);
}

async function suggestWithRestPlaces({ query, proximity, countryCode }) {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) throw new Error("Google Maps key is missing");

  const requestBody = {
    input: query,
    locationBias: makeLocationBias(proximity)
      ? {
          circle: {
            center: {
              latitude: makeLocationBias(proximity).center.lat,
              longitude: makeLocationBias(proximity).center.lng,
            },
            radius: makeLocationBias(proximity).radius,
          },
        }
      : undefined,
    includedRegionCodes: countryCode ? [String(countryCode).toLowerCase()] : undefined,
  };

  const json = await fetchJson("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  const suggestions = Array.isArray(json?.suggestions) ? json.suggestions : [];
  const items = await Promise.all(
    suggestions.slice(0, 5).map(async (suggestion) => {
      const prediction = suggestion.placePrediction;
      const placeId = clean(prediction?.placeId);
      const label = clean(prediction?.text?.text);
      if (!placeId && !label) return null;

      try {
        const details = placeId ? await fetchPlaceDetailsRest(placeId) : null;
        if (details?.location) {
          return {
            placeId: placeId || label,
            primaryText:
              clean(details.displayName?.text) ||
              clean(prediction?.structuredFormat?.mainText?.text) ||
              label ||
              "Selected location",
            secondaryText:
              clean(details.formattedAddress) ||
              clean(prediction?.structuredFormat?.secondaryText?.text) ||
              label ||
              "",
            formattedAddress: clean(details.formattedAddress) || label || "",
            location: {
              latitude: details.location.latitude,
              longitude: details.location.longitude,
            },
            countryCode: countryCode || null,
            source: "google",
            requiresDetails: false,
          };
        }
      } catch {
        // Fall through to geocoding by label.
      }

      try {
        const geocoded = await geocodeAddressRest(label, { proximity, countryCode });
        return {
          placeId: placeId || label,
          primaryText: clean(prediction?.structuredFormat?.mainText?.text) || label,
          secondaryText:
            clean(prediction?.structuredFormat?.secondaryText?.text) ||
            geocoded.formatted_address ||
            "",
          formattedAddress: geocoded.formatted_address || label || "",
          location: {
            latitude: geocoded.latitude,
            longitude: geocoded.longitude,
          },
          countryCode: geocoded.countryCode || countryCode || null,
          source: "google",
          requiresDetails: false,
        };
      } catch {
        return null;
      }
    }),
  );

  return items.filter(Boolean);
}

async function fetchPlaceDetailsRest(placeId) {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) throw new Error("Google Maps key is missing");

  return fetchJson(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location",
    },
  });
}

async function reverseGeocode(lat, lng) {
  try {
    const latitude = typeof lat === "object" ? lat?.latitude : lat;
    const longitude = typeof lat === "object" ? lat?.longitude : lng;
    const { Geocoder } = await importGoogleLibrary("geocoding");
    const geocoder = new Geocoder();
    const response = await geocoder.geocode({
      location: { lat: Number(latitude), lng: Number(longitude) },
    });
    const result = Array.isArray(response?.results) ? response.results[0] : null;
    return result?.formatted_address || "Unknown Address";
  } catch {
    return mapboxService.reverseGeocode(lat, lng);
  }
}

const googleLocationService = {
  geocodeAddress,
  suggestAddresses,
  reverseGeocode,
};

export { geocodeAddress, suggestAddresses, reverseGeocode };
export default googleLocationService;

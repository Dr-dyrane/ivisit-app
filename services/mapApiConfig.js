import Constants from "expo-constants";

const clean = (value) =>
	typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readConfig = (key) =>
	clean(process.env?.[key]) || clean(Constants?.expoConfig?.extra?.[key]);

const parseBooleanFlag = (value, fallback = false) => {
	const normalized = clean(value)?.toLowerCase();
	if (!normalized) return fallback;
	return ["1", "true", "yes", "on", "enabled"].includes(normalized);
};

export const isGooglePlacesEnabled = () =>
	parseBooleanFlag(readConfig("EXPO_PUBLIC_ENABLE_GOOGLE_PLACES"), false);

export const isGoogleGeocodingEnabled = () =>
	parseBooleanFlag(readConfig("EXPO_PUBLIC_ENABLE_GOOGLE_GEOCODING"), false);

export const getMapboxAccessToken = () =>
	readConfig("EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN") ||
	readConfig("MAPBOX_ACCESS_TOKEN") ||
	"";

export const mapApiConfig = {
	isGooglePlacesEnabled,
	isGoogleGeocodingEnabled,
	getMapboxAccessToken,
};

export default mapApiConfig;

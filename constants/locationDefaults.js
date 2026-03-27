const toFiniteNumber = (value, fallback) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

export const LAGOS_COORDINATES = Object.freeze({
	latitude: 6.5244,
	longitude: 3.3792,
});

export const DEFAULT_APP_COORDINATES = Object.freeze({
	latitude: toFiniteNumber(
		process.env.EXPO_PUBLIC_DEFAULT_LATITUDE,
		LAGOS_COORDINATES.latitude
	),
	longitude: toFiniteNumber(
		process.env.EXPO_PUBLIC_DEFAULT_LONGITUDE,
		LAGOS_COORDINATES.longitude
	),
});

export const DEFAULT_APP_REGION = Object.freeze({
	...DEFAULT_APP_COORDINATES,
	latitudeDelta: 0.04,
	longitudeDelta: 0.04,
});

export const DEFAULT_DEMO_CITY_LABEL =
	typeof process.env.EXPO_PUBLIC_DEMO_CITY_LABEL === "string" &&
	process.env.EXPO_PUBLIC_DEMO_CITY_LABEL.trim().length > 0
		? process.env.EXPO_PUBLIC_DEMO_CITY_LABEL.trim()
		: "Lagos";

export const toPointWkt = ({ latitude, longitude }) =>
	`POINT(${Number(longitude)} ${Number(latitude)})`;

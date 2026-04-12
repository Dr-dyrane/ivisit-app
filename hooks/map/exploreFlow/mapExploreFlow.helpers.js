import { MAP_LOCATION_CHANGE_EPSILON } from "./mapExploreFlow.constants";

export function buildDemoBootstrapKey(
	location,
	userId,
	coverageStatus,
	allNearbyCount,
	demoNearbyCount,
	verifiedNearbyCount,
	shouldForceBootstrap,
) {
	return [
		Number(location?.latitude).toFixed(3),
		Number(location?.longitude).toFixed(3),
		userId || "guest",
		coverageStatus || "unknown",
		`nearby:${Number(allNearbyCount || 0)}`,
		`demo:${Number(demoNearbyCount || 0)}`,
		`verified:${Number(verifiedNearbyCount || 0)}`,
		shouldForceBootstrap ? "force" : "auto",
	].join(":");
}

export function toCoordinatePair(location) {
	if (!location || typeof location !== "object") {
		return null;
	}

	const latitude = Number(
		location?.location?.latitude ??
			location?.coords?.latitude ??
			location?.latitude ??
			location?.lat,
	);
	const longitude = Number(
		location?.location?.longitude ??
			location?.coords?.longitude ??
			location?.longitude ??
			location?.lng,
	);

	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return null;
	}

	return { latitude, longitude };
}

export function hasMeaningfulLocationChange(currentLocation, nextLocation) {
	const currentCoordinate = toCoordinatePair(currentLocation);
	const nextCoordinate = toCoordinatePair(nextLocation);

	if (!currentCoordinate || !nextCoordinate) {
		return Boolean(currentCoordinate || nextCoordinate);
	}

	return (
		Math.abs(currentCoordinate.latitude - nextCoordinate.latitude) >
			MAP_LOCATION_CHANGE_EPSILON ||
		Math.abs(currentCoordinate.longitude - nextCoordinate.longitude) >
			MAP_LOCATION_CHANGE_EPSILON
	);
}

export default {
	buildDemoBootstrapKey,
	toCoordinatePair,
	hasMeaningfulLocationChange,
};

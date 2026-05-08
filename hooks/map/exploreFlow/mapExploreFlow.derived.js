import { formatHospitalDistance } from "../../../utils/map/mapLocationPresentation";
import { normalizeCoordinate } from "../../../utils/emergencyContextHelpers";
import { calculateDistance } from "../../../utils/mapUtils";

export const LOCAL_NEARBY_RADIUS_KM = 5;

function extractDistanceKmFromText(distanceText) {
	if (typeof distanceText !== "string") return null;
	const kmMatch = distanceText.match(/(\d+(?:\.\d+)?)\s*km/i);
	if (kmMatch?.[1]) {
		const parsedKm = Number(kmMatch[1]);
		return Number.isFinite(parsedKm) ? parsedKm : null;
	}
	const meterMatch = distanceText.match(/(\d+(?:\.\d+)?)\s*m/i);
	if (meterMatch?.[1]) {
		const parsedMeters = Number(meterMatch[1]);
		return Number.isFinite(parsedMeters) ? parsedMeters / 1000 : null;
	}
	return null;
}

function getHospitalDistanceKm(hospital, activeLocation = null) {
	const directDistanceKm = Number(hospital?.distanceKm ?? hospital?.distance_km);
	if (Number.isFinite(directDistanceKm) && directDistanceKm >= 0) {
		return directDistanceKm;
	}

	const parsedTextDistanceKm = extractDistanceKmFromText(hospital?.distance);
	if (Number.isFinite(parsedTextDistanceKm) && parsedTextDistanceKm >= 0) {
		return parsedTextDistanceKm;
	}

	const hospitalCoordinate = normalizeCoordinate(hospital);
	if (hospitalCoordinate && activeLocation) {
		return calculateDistance(activeLocation, hospitalCoordinate);
	}

	return Number.MAX_SAFE_INTEGER;
}

function sortHospitalsByDistance(hospitals, activeLocation = null) {
	return (Array.isArray(hospitals) ? hospitals : [])
		.filter(Boolean)
		.slice()
		.sort((left, right) => {
			const leftDistanceKm = getHospitalDistanceKm(left, activeLocation);
			const rightDistanceKm = getHospitalDistanceKm(right, activeLocation);
			if (leftDistanceKm === rightDistanceKm) {
				return Number(right?.relevanceScore || 0) - Number(left?.relevanceScore || 0);
			}
			return leftDistanceKm - rightDistanceKm;
		});
}

export function getDiscoveredHospitals(allHospitals, hospitals) {
	if (Array.isArray(hospitals) && hospitals.length > 0) {
		return hospitals.filter(Boolean);
	}

	if (Array.isArray(allHospitals) && allHospitals.length > 0) {
		return allHospitals.filter(Boolean);
	}

	return Array.isArray(hospitals) ? hospitals : [];
}

export function getLocalNearbyHospitals(discoveredHospitals, activeLocation) {
	const sortedHospitals = sortHospitalsByDistance(discoveredHospitals, activeLocation);
	if (sortedHospitals.length === 0) {
		return [];
	}

	return sortedHospitals.filter(
		(hospital) => getHospitalDistanceKm(hospital, activeLocation) <= LOCAL_NEARBY_RADIUS_KM,
	);
}

export function getNearestHospital(
	selectedHospital,
	localNearbyHospitals,
	discoveredHospitals,
	activeLocation,
) {
	if (selectedHospital?.id) {
		return selectedHospital;
	}

	if (Array.isArray(localNearbyHospitals) && localNearbyHospitals.length > 0) {
		return localNearbyHospitals[0] || null;
	}

	return sortHospitalsByDistance(discoveredHospitals, activeLocation)[0] || null;
}

export function getNearestHospitalMeta(nearestHospital) {
	const nearestHospitalMeta = [formatHospitalDistance(nearestHospital)].filter(Boolean);

	if (
		Number.isFinite(Number(nearestHospital?.availableBeds)) &&
		Number(nearestHospital.availableBeds) > 0
	) {
		nearestHospitalMeta.push(`${nearestHospital.availableBeds} beds`);
	}

	return nearestHospitalMeta;
}

export function getNearbyHospitalCount(localNearbyHospitals) {
	return Array.isArray(localNearbyHospitals)
		? localNearbyHospitals.filter(Boolean).length
		: 0;
}

export function getTotalAvailableBeds(localNearbyHospitals) {
	return (Array.isArray(localNearbyHospitals) ? localNearbyHospitals : []).reduce(
		(sum, hospital) => {
			const availableBeds = Number(hospital?.availableBeds);
			return Number.isFinite(availableBeds) && availableBeds > 0 ? sum + availableBeds : sum;
		},
		0,
	);
}

export function getNearbyBedHospitals(localNearbyHospitals) {
	return (Array.isArray(localNearbyHospitals) ? localNearbyHospitals : []).filter((hospital) => {
		const availableBeds = Number(hospital?.availableBeds);
		return Number.isFinite(availableBeds) && availableBeds > 0;
	}).length;
}

export function getRecentVisits(visits) {
	return Array.isArray(visits) ? visits.slice(0, 3) : [];
}

export function getFeaturedHospitals(discoveredHospitals) {
	return Array.isArray(discoveredHospitals) ? discoveredHospitals.filter(Boolean) : [];
}

export default {
	getDiscoveredHospitals,
	getNearestHospital,
	getNearestHospitalMeta,
	getNearbyHospitalCount,
	getTotalAvailableBeds,
	getNearbyBedHospitals,
	getRecentVisits,
	getFeaturedHospitals,
};

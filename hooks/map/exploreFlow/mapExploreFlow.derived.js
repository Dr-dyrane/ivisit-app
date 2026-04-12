import { formatHospitalDistance } from "../../../utils/map/mapLocationPresentation";

export function getDiscoveredHospitals(allHospitals, hospitals) {
	if (Array.isArray(allHospitals) && allHospitals.length > 0) {
		return allHospitals;
	}

	return Array.isArray(hospitals) ? hospitals : [];
}

export function getNearestHospital(selectedHospital, discoveredHospitals) {
	if (selectedHospital?.id) {
		return selectedHospital;
	}

	return discoveredHospitals?.[0] || null;
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

export function getNearbyHospitalCount(discoveredHospitals) {
	return Array.isArray(discoveredHospitals) ? discoveredHospitals.filter(Boolean).length : 0;
}

export function getTotalAvailableBeds(discoveredHospitals) {
	return (Array.isArray(discoveredHospitals) ? discoveredHospitals : []).reduce(
		(sum, hospital) => {
			const availableBeds = Number(hospital?.availableBeds);
			return Number.isFinite(availableBeds) && availableBeds > 0 ? sum + availableBeds : sum;
		},
		0,
	);
}

export function getNearbyBedHospitals(discoveredHospitals) {
	return (Array.isArray(discoveredHospitals) ? discoveredHospitals : []).filter((hospital) => {
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

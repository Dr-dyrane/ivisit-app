import { MAP_EXPLORE_INTENT_COPY } from "./mapExploreIntent.content";

export function getBedSpaceSubtext(totalAvailableBeds, nearbyBedHospitals) {
	if (totalAvailableBeds > 0) return `${totalAvailableBeds} available`;
	if (nearbyBedHospitals > 0) return `${nearbyBedHospitals} nearby`;
	return MAP_EXPLORE_INTENT_COPY.NEARBY_BEDS;
}

export function getSelectedCareLabel(selectedCare) {
	if (selectedCare === "ambulance") return MAP_EXPLORE_INTENT_COPY.AMBULANCE;
	if (selectedCare === "bed") return MAP_EXPLORE_INTENT_COPY.BED_SPACE;
	return MAP_EXPLORE_INTENT_COPY.NOW;
}

export function buildFeaturedHospitalFeatures(hospital) {
	const features = [];
	const distance = typeof hospital?.distance === "string" ? hospital.distance.trim() : "";
	const eta = typeof hospital?.eta === "string" ? hospital.eta.trim() : "";
	const beds = Number(hospital?.availableBeds);

	if (distance) features.push(distance);
	if (eta) features.push(eta);
	if (Number.isFinite(beds) && beds > 0) {
		features.push(`${beds} beds`);
	}

	return features.slice(0, 2);
}

export function buildVisibleHospitalSlots(featuredHospitals) {
	return Array.isArray(featuredHospitals)
		? featuredHospitals
				.filter(Boolean)
				.map((hospital) => ({ type: "hospital", hospital }))
		: [];
}

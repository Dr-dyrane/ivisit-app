const DEFAULT_HOSPITAL_HERO_IMAGE = require("../../assets/features/emergency.png");

function toStringList(value) {
	return Array.isArray(value)
		? value
				.filter((item) => typeof item === "string" && item.trim().length > 0)
				.map((item) => item.trim())
		: [];
}

export function getHospitalHeroSource(hospital) {
	const candidates = [
		hospital?.image,
		hospital?.imageUri,
		...toStringList(hospital?.googlePhotos),
		...toStringList(hospital?.google_photos),
	];
	const uri = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
	return uri ? { uri: uri.trim() } : DEFAULT_HOSPITAL_HERO_IMAGE;
}

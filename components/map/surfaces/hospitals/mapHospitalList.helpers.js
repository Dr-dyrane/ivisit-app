import { SPECIALTIES } from "../../../../constants/hospitals";

const normalizeSpecialty = (value) =>
	typeof value === "string" && value.trim().length > 0
		? value.trim().toLowerCase()
		: "";

export const HOSPITAL_SPECIALTY_ICONS = {
	"General Care": { family: "FontAwesome5", icon: "stethoscope" },
	Emergency: { family: "FontAwesome5", icon: "ambulance" },
	Cardiology: { family: "MaterialCommunityIcons", icon: "heart-pulse" },
	Neurology: { family: "MaterialCommunityIcons", icon: "brain" },
	Oncology: { family: "Ionicons", icon: "ribbon" },
	Pediatrics: { family: "MaterialCommunityIcons", icon: "baby-face-outline" },
	Orthopedics: { family: "MaterialCommunityIcons", icon: "bone" },
	ICU: { family: "Fontisto", icon: "bed-patient" },
	Trauma: { family: "MaterialCommunityIcons", icon: "bandage" },
	"Urgent Care": { family: "MaterialCommunityIcons", icon: "medical-bag" },
	Psychiatry: { family: "MaterialCommunityIcons", icon: "head-heart" },
	Obstetrics: { family: "MaterialCommunityIcons", icon: "mother-nurse" },
	Gynecology: { family: "MaterialCommunityIcons", icon: "human-female" },
	Pulmonology: { family: "MaterialCommunityIcons", icon: "lungs" },
	Gastroenterology: { family: "MaterialCommunityIcons", icon: "stomach" },
	Dermatology: { family: "MaterialCommunityIcons", icon: "hand-back-right" },
	Ophthalmology: { family: "MaterialCommunityIcons", icon: "eye-outline" },
	ENT: { family: "MaterialCommunityIcons", icon: "ear-hearing" },
	Urology: { family: "MaterialCommunityIcons", icon: "kidney" },
	Nephrology: { family: "MaterialCommunityIcons", icon: "kidney-outline" },
	Rheumatology: { family: "MaterialCommunityIcons", icon: "arm-flex" },
	Endocrinology: { family: "MaterialCommunityIcons", icon: "molecule" },
	"Infectious Disease": { family: "MaterialCommunityIcons", icon: "virus-outline" },
	"Palliative Care": { family: "MaterialCommunityIcons", icon: "heart-plus-outline" },
	Rehabilitation: { family: "MaterialCommunityIcons", icon: "run-fast" },
	"Sports Medicine": { family: "MaterialCommunityIcons", icon: "basketball" },
	Geriatrics: { family: "MaterialCommunityIcons", icon: "human-cane" },
	Neonatology: { family: "MaterialCommunityIcons", icon: "baby-bottle-outline" },
	"Burn Care": { family: "MaterialCommunityIcons", icon: "fire" },
	Transplant: { family: "MaterialCommunityIcons", icon: "heart-plus" },
};

export function hospitalMatchesSpecialty(hospital, specialty) {
	const normalizedTarget = normalizeSpecialty(specialty);
	if (!normalizedTarget) return true;

	return Array.isArray(hospital?.specialties)
		? hospital.specialties.some(
				(item) => normalizeSpecialty(item) === normalizedTarget,
			)
		: false;
}

export function buildHospitalSpecialtyFilters(hospitals = []) {
	const derived = new Set();

	hospitals.forEach((hospital) => {
		if (!Array.isArray(hospital?.specialties)) return;
		hospital.specialties.forEach((specialty) => {
			if (typeof specialty === "string" && specialty.trim()) {
				derived.add(specialty.trim());
			}
		});
	});

	const sourceList = derived.size > 0 ? Array.from(derived).sort() : SPECIALTIES;

	const items = sourceList
		.map((label) => {
			const normalized = normalizeSpecialty(label);
			const count = hospitals.filter((hospital) =>
				Array.isArray(hospital?.specialties)
					? hospital.specialties.some(
							(item) => normalizeSpecialty(item) === normalized,
						)
					: false,
			).length;

			return {
				id: normalized,
				label,
				count,
				iconConfig: HOSPITAL_SPECIALTY_ICONS[label] || {
					family: "MaterialCommunityIcons",
					icon: "medical-bag",
				},
			};
		})
		.filter((item) => item.count > 0);

	return {
		items,
		totalCount: hospitals.length,
	};
}

export function buildHospitalSubtitle(hospital) {
	const locality = [hospital?.city, hospital?.region].filter(Boolean).join(", ").trim();
	if (locality) return locality;

	const address = [hospital?.streetNumber, hospital?.street].filter(Boolean).join(" ").trim();
	if (address) return address;

	return hospital?.address || hospital?.formattedAddress || "Available nearby";
}

export function buildHospitalDistance(hospital) {
	return typeof hospital?.distance === "string" && hospital.distance.trim().length > 0
		? hospital.distance.trim()
		: null;
}

export function buildHospitalRating(hospital) {
	const rating = Number(hospital?.rating);
	if (!Number.isFinite(rating) || rating <= 0) return null;
	return rating.toFixed(1);
}

export function buildHospitalPrice(hospital) {
	const candidates = [hospital?.price, hospital?.priceRange, hospital?.priceLabel];
	const direct = candidates.find(
		(value) => typeof value === "string" && value.trim().length > 0,
	);
	if (direct) return direct.trim();

	const numeric = Number(hospital?.price);
	if (Number.isFinite(numeric) && numeric > 0) {
		return `$${Math.round(numeric)}`;
	}

	return null;
}

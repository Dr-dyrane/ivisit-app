import { COLORS } from "../../../constants/colors";

const AMBULANCE_TIER_IMAGES = {
	basic: require("../../../assets/emergency/transport/ambulance-bls.png"),
	advanced: require("../../../assets/emergency/transport/ambulance-als.png"),
	critical: require("../../../assets/emergency/transport/ambulance-icu.png"),
};

const AMBULANCE_TIER_META = {
	basic: {
		label: "Basic Life Support",
		shortLabel: "BLS",
		accent: COLORS.brandPrimary,
		secondaryAccent: "#0EA5E9",
		marketingLine: "Best for urgent trips when the patient is stable.",
		features: [
			"Fast pickup and hospital transfer",
			"Oxygen and routine monitoring on the way",
			"A care team stays with the patient throughout the ride",
		],
	},
	advanced: {
		label: "Advanced Life Support",
		shortLabel: "ALS",
		accent: "#C2410C",
		secondaryAccent: "#F59E0B",
		marketingLine: "More support on the way for symptoms that need closer attention.",
		features: [
			"Closer watching during the ride",
			"Extra equipment for more urgent symptoms",
			"Helpful when the patient may need added support on the way",
		],
	},
	critical: {
		label: "Critical Care Transport",
		shortLabel: "ICU",
		accent: "#B91C1C",
		secondaryAccent: "#F97316",
		marketingLine: "Highest level of support for serious transfers.",
		features: [
			"Continuous watching during transport",
			"Specialized team support throughout the ride",
			"Built for patients who need the closest care on the way",
		],
	},
};

export function getAmbulanceTierKey(type = {}) {
	const raw = [
		type?.id,
		type?.title,
		type?.name,
		type?.service_name,
		type?.service_type,
		type?.subtitle,
		type?.description,
		type?.crew,
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();

	if (/critical|icu|intensive|critical care|cct|specialist/.test(raw)) {
		return "critical";
	}

	if (/advanced|als|cardiac|life support/.test(raw)) {
		return "advanced";
	}

	return "basic";
}

export function getAmbulanceVisualProfile(type = {}) {
	const key = getAmbulanceTierKey(type);
	const meta = AMBULANCE_TIER_META[key] || AMBULANCE_TIER_META.basic;

	return {
		key,
		source: AMBULANCE_TIER_IMAGES[key] || null,
		...meta,
	};
}

export default getAmbulanceVisualProfile;

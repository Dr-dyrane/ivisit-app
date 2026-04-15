const AMBULANCE_TIER_IMAGES = {
	basic: require("../../../assets/emergency/transport/ambulance-bls.png"),
	advanced: require("../../../assets/emergency/transport/ambulance-als.png"),
	critical: require("../../../assets/emergency/transport/ambulance-icu.png"),
};

const AMBULANCE_TIER_META = {
	basic: {
		label: "Standard ambulance",
		shortLabel: "Standard",
		accent: "#94A3B8",
		secondaryAccent: "#E2E8F0",
		marketingLine: "Fast help for urgent trips when the patient is stable.",
		features: [
			"Quick pickup and hospital transfer",
			"Oxygen and routine checks during the ride",
			"A medical crew stays with the patient throughout the trip",
		],
	},
	advanced: {
		label: "Ambulance with extra support",
		shortLabel: "Extra support",
		accent: "#C2410C",
		secondaryAccent: "#F59E0B",
		marketingLine: "More medical support on the way for symptoms that need closer attention.",
		features: [
			"Closer watching during the ride",
			"Extra equipment for more urgent symptoms",
			"Helpful when the patient may need more support on the way",
		],
	},
	critical: {
		label: "Critical care ambulance",
		shortLabel: "Critical care",
		accent: "#B91C1C",
		secondaryAccent: "#F97316",
		marketingLine: "Highest level of support for very serious transfers.",
		features: [
			"Continuous monitoring during transport",
			"Specialized critical care crew support",
			"Built for patients who need the closest care on the way",
		],
	},
};

export function getAmbulanceTierKey(type = {}) {
	const explicitTierKey = String(type?.tierKey || type?.key || "")
		.trim()
		.toLowerCase();
	if (["basic", "advanced", "critical"].includes(explicitTierKey)) {
		return explicitTierKey;
	}

	const explicitServiceType = String(type?.service_type || "")
		.trim()
		.toLowerCase();
	if (explicitServiceType === "ambulance_basic") return "basic";
	if (explicitServiceType === "ambulance_advanced") return "advanced";
	if (explicitServiceType === "ambulance_critical") return "critical";

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

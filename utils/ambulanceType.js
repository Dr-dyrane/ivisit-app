const DISPATCH_TYPE_BY_TIER = Object.freeze({
	basic: "BLS",
	advanced: "ALS",
	critical: "CCT",
});

function asAmbulanceTypeRecord(value) {
	if (typeof value === "string") {
		return { service_type: value };
	}
	return value && typeof value === "object" ? value : {};
}

export function getAmbulanceTierKey(value = {}) {
	const type = asAmbulanceTypeRecord(value);
	const explicitTierKey = String(type?.tierKey || type?.key || "")
		.trim()
		.toLowerCase();
	if (["basic", "advanced", "critical"].includes(explicitTierKey)) {
		return explicitTierKey;
	}

	const explicitServiceType = String(
		type?.service_type || type?.serviceType || type?.ambulance_type || "",
	)
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
		type?.serviceType,
		type?.ambulance_type,
		type?.ambulanceType,
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

	if (/advanced|als|cardiac/.test(raw)) {
		return "advanced";
	}

	return "basic";
}

export function resolveAmbulanceDispatchType(value = {}) {
	return DISPATCH_TYPE_BY_TIER[getAmbulanceTierKey(value)] || DISPATCH_TYPE_BY_TIER.basic;
}

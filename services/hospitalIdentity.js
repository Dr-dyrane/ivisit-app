const ADDRESS_TOKEN_REPLACEMENTS = [
	[/\bunited states\b/g, ""],
	[/\busa\b/g, ""],
	[/\bcanada\b/g, ""],
	[/\bnigeria\b/g, ""],
	[/\bcalifornia\b/g, "ca"],
	[/\bavenue\b/g, "ave"],
	[/\bstreet\b/g, "st"],
	[/\bdrive\b/g, "dr"],
	[/\broad\b/g, "rd"],
	[/\bboulevard\b/g, "blvd"],
	[/\blane\b/g, "ln"],
	[/\bcourt\b/g, "ct"],
	[/\bcircle\b/g, "cir"],
	[/\bparkway\b/g, "pkwy"],
	[/\bsuite\b/g, "ste"],
	[/\bunit\b/g, "ste"],
];

export const normalizeFacilityText = (value) =>
	String(value || "")
		.toLowerCase()
		.replace(/[.,]/g, " ")
		.replace(/\s+/g, " ")
		.trim();

export const canonicalizeAddress = (value) => {
	let normalized = normalizeFacilityText(value);
	if (!normalized) return "";

	ADDRESS_TOKEN_REPLACEMENTS.forEach(([pattern, replacement]) => {
		normalized = normalized.replace(pattern, replacement);
	});

	return normalized.replace(/\s+/g, " ").trim();
};

export const coordinateClusterKey = (value, precision = 3) => {
	const n = Number(value);
	return Number.isFinite(n) ? Number(n).toFixed(precision) : null;
};

export const getHospitalPlaceId = (hospital) =>
	String(hospital?.place_id ?? hospital?.placeId ?? "")
		.trim();

export const normalizePlaceIdentityFragment = (value) =>
	String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "")
		.trim();

export const extractDemoSourceFragment = (placeId) => {
	const normalizedPlaceId = String(placeId || "").trim().toLowerCase();
	const match = normalizedPlaceId.match(/^demo:[^:]+:src:([a-z0-9]+)$/i);
	return match?.[1] || "";
};

export const getHospitalIdentitySourceKey = (hospital) => {
	const placeId = getHospitalPlaceId(hospital);
	if (!placeId) return null;

	const demoSourceFragment = extractDemoSourceFragment(placeId);
	if (demoSourceFragment) {
		return `source:${demoSourceFragment}`;
	}

	const normalizedPlaceId = normalizePlaceIdentityFragment(placeId);
	return normalizedPlaceId ? `source:${normalizedPlaceId}` : null;
};

export const getHospitalFacilityKey = (hospital) => {
	const name = normalizeFacilityText(hospital?.name);
	const address = canonicalizeAddress(hospital?.address ?? hospital?.google_address);
	if (name && address) {
		return `facility:${name}|${address}`;
	}

	const sourceKey = getHospitalIdentitySourceKey(hospital);
	if (sourceKey) return sourceKey;

	const latitude =
		hospital?.latitude ??
		hospital?.coordinates?.latitude ??
		hospital?.coordinates?.coordinates?.[1];
	const longitude =
		hospital?.longitude ??
		hospital?.coordinates?.longitude ??
		hospital?.coordinates?.coordinates?.[0];
	const latKey = coordinateClusterKey(latitude);
	const lngKey = coordinateClusterKey(longitude);
	if (name && latKey && lngKey) {
		return `facility:${name}|${latKey}|${lngKey}`;
	}

	const placeId = normalizePlaceIdentityFragment(getHospitalPlaceId(hospital));
	if (placeId) return `place:${placeId}`;
	if (name) return `name:${name}`;

	const id = String(hospital?.id || "").trim();
	return id ? `id:${id}` : null;
};

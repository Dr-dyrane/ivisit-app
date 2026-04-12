#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
	throw new Error("Missing Supabase service-role environment");
}

const DEFAULT_PROBES = [
	{ label: "Hemet", latitude: 33.7476, longitude: -117.0067 },
	{ label: "Toronto", latitude: 43.6532, longitude: -79.3832 },
	{ label: "Lagos", latitude: 6.5244, longitude: 3.3792 },
];

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
	auth: { persistSession: false, autoRefreshToken: false },
});
const publicClient = createClient(
	SUPABASE_URL,
	process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
	{
		auth: { persistSession: false, autoRefreshToken: false },
	},
);

const toText = (value, fallback = "") =>
	typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
const toNumber = (value) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
};
const toTextArray = (value) =>
	Array.isArray(value)
		? value
				.filter((item) => typeof item === "string")
				.map((item) => item.trim())
				.filter(Boolean)
		: [];

const normalizeText = (value = "") =>
	String(value || "")
		.toLowerCase()
		.replace(/[.,]/g, " ")
		.replace(/\s+/g, " ")
		.trim();

const canonicalizeAddress = (value = "") =>
	normalizeText(value)
		.replace(/\bunited states\b/g, "")
		.replace(/\busa\b/g, "")
		.replace(/\bcanada\b/g, "")
		.replace(/\bnigeria\b/g, "")
		.replace(/\bcalifornia\b/g, "ca")
		.replace(/\s+/g, " ")
		.trim();

const coordinateKey = (value, precision = 5) => {
	const number = Number(value);
	return Number.isFinite(number) ? number.toFixed(precision) : null;
};

const facilityKey = (hospital) => {
	const name = normalizeText(hospital?.name);
	const address = canonicalizeAddress(hospital?.address);
	if (name && address) return `${name}|${address}`;
	const lat = coordinateKey(hospital?.latitude);
	const lng = coordinateKey(hospital?.longitude);
	return [name || "unknown", lat || "0", lng || "0"].join("|");
};

const isDemoHospital = (hospital) => {
	const placeId = toText(hospital?.place_id || hospital?.placeId, "").toLowerCase();
	const verificationStatus = toText(
		hospital?.verification_status || hospital?.verificationStatus || hospital?.import_status || hospital?.importStatus,
		"",
	).toLowerCase();
	const features = toTextArray(hospital?.features).map((feature) => feature.toLowerCase());

	return (
		placeId.startsWith("demo:") ||
		verificationStatus.startsWith("demo") ||
		features.some((feature) => feature.includes("demo"))
	);
};

const isDispatchableHospital = (hospital) => {
	const status = toText(hospital?.status, "available").toLowerCase();
	const verificationStatus = toText(
		hospital?.verification_status || hospital?.verificationStatus || hospital?.import_status || hospital?.importStatus,
		"",
	).toLowerCase();
	return (
		status === "available" &&
		(hospital?.verified === true ||
			isDemoHospital(hospital) ||
			verificationStatus === "verified" ||
			verificationStatus === "not_certified")
	);
};

const parseDistanceKm = (hospital) => {
	const direct = toNumber(hospital?.distance_km ?? hospital?.distanceKm);
	if (Number.isFinite(direct)) return direct;
	const label = toText(hospital?.distance, "");
	const match = label.match(/(\d+(?:\.\d+)?)/);
	if (!match) return null;
	const parsed = Number(match[1]);
	return Number.isFinite(parsed) ? parsed : null;
};

const dedupeHospitals = (rows = []) => {
	const buckets = new Map();
	rows.forEach((row) => {
		const key = facilityKey(row);
		if (!buckets.has(key)) {
			buckets.set(key, row);
		}
	});
	return Array.from(buckets.values());
};

const fetchNearbyRpc = async ({ latitude, longitude, radiusKm }) => {
	const { data, error } = await adminClient.rpc("nearby_hospitals", {
		user_lat: latitude,
		user_lng: longitude,
		radius_km: radiusKm,
	});
	if (error) throw new Error(`nearby_hospitals(${radiusKm}km) failed: ${error.message}`);
	return Array.isArray(data) ? data : [];
};

const fetchDiscoverEdge = async ({
	latitude,
	longitude,
	radiusMeters = 50000,
	limit = 15,
	mergeWithDatabase = true,
}) => {
	const { data, error } = await publicClient.functions.invoke("discover-hospitals", {
		body: {
			latitude,
			longitude,
			radius: radiusMeters,
			mode: "nearby",
			limit,
			includeProviderDiscovery: true,
			includeMapboxPlaces: true,
			includeGooglePlaces: true,
			mergeWithDatabase,
		},
	});
	if (error) throw new Error(`discover-hospitals failed: ${error.message}`);
	return {
		rows: Array.isArray(data?.data) ? data.data : [],
		meta: data?.meta || {},
	};
};

const summarizeRows = (rows = []) => {
	const uniqueRows = dedupeHospitals(rows);
	const dispatchableRows = uniqueRows.filter(isDispatchableHospital);
	const demoRows = dispatchableRows.filter(isDemoHospital);
	const verifiedRows = dispatchableRows.filter(
		(row) =>
			row?.verified === true ||
			toText(row?.verification_status || row?.verificationStatus, "").toLowerCase() === "verified",
	);
	const shadowRows = uniqueRows.filter((row) => !isDispatchableHospital(row));

	return {
		raw: rows.length,
		unique: uniqueRows.length,
		dispatchable: dispatchableRows.length,
		demo: demoRows.length,
		verified: verifiedRows.length,
		shadow: shadowRows.length,
		dispatchableNames: dispatchableRows
			.map((row) => ({
				name: toText(row?.name, "Unnamed Hospital"),
				distanceKm: parseDistanceKm(row),
				demo: isDemoHospital(row),
				verified:
					row?.verified === true ||
					toText(row?.verification_status || row?.verificationStatus, "").toLowerCase() === "verified",
			}))
			.sort((left, right) => {
				const leftDistance = Number.isFinite(left.distanceKm) ? left.distanceKm : Number.MAX_SAFE_INTEGER;
				const rightDistance = Number.isFinite(right.distanceKm) ? right.distanceKm : Number.MAX_SAFE_INTEGER;
				return leftDistance - rightDistance;
			}),
		shadowNames: shadowRows.map((row) => toText(row?.name, "Unnamed Hospital")),
	};
};

const formatSummary = (label, summary) => ({
	label,
	raw: summary.raw,
	unique: summary.unique,
	dispatchable: summary.dispatchable,
	demo: summary.demo,
	verified: summary.verified,
	shadow: summary.shadow,
	dispatchableNames: summary.dispatchableNames,
	shadowNames: summary.shadowNames,
});

const runProbe = async (probe) => {
	const rpc15 = await fetchNearbyRpc({ ...probe, radiusKm: 15 });
	const rpc50 = await fetchNearbyRpc({ ...probe, radiusKm: 50 });
	const edge = await fetchDiscoverEdge(probe);

	const rpc15Summary = summarizeRows(rpc15);
	const rpc50Summary = summarizeRows(rpc50);
	const edgeSummary = summarizeRows(edge.rows);

	return {
		location: probe,
		rpc15: formatSummary("rpc15", rpc15Summary),
		rpc50: formatSummary("rpc50", rpc50Summary),
		edge15: formatSummary("edge15", edgeSummary),
		edgeMeta: edge.meta,
		warnings: [
			edgeSummary.dispatchable < Math.min(5, rpc50Summary.dispatchable)
				? "edge-visible dispatchable count is below DB dispatchable count"
				: null,
			rpc15Summary.dispatchable < 5 ? "nearby 15km coverage is below comfort threshold" : null,
			rpc50Summary.dispatchable >= 5 && edgeSummary.dispatchable < 5
				? "edge response is still thin despite DB comfort coverage"
				: null,
		].filter(Boolean),
	};
};

const parseArgs = () => {
	if (process.argv.length < 4) {
		return DEFAULT_PROBES;
	}

	const latitude = Number(process.argv[2]);
	const longitude = Number(process.argv[3]);
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		throw new Error("Usage: node supabase/scripts/audit_demo_coverage.js [latitude longitude]");
	}

	return [
		{
			label: process.argv[4] || "custom",
			latitude,
			longitude,
		},
	];
};

const main = async () => {
	const probes = parseArgs();
	const results = [];

	for (const probe of probes) {
		results.push(await runProbe(probe));
	}

	console.log(JSON.stringify({ generated_at: new Date().toISOString(), results }, null, 2));
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});

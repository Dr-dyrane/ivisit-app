import { supabase } from "./supabase";

export const DEMO_BOOTSTRAP_PHASES = [
	{
		key: "prepare",
		label: "Preparing demo context",
		description: "Scanning nearby hospital candidates around your location",
	},
	{
		key: "hospitals",
		label: "Creating demo hospitals",
		description: "Building verified demo hospitals from nearby coverage",
	},
	{
		key: "staff",
		label: "Assigning teams",
		description: "Provisioning demo doctors, drivers, and ambulances",
	},
	{
		key: "pricing",
		label: "Configuring pricing",
		description: "Applying service and room pricing baselines",
	},
	{
		key: "summary",
		label: "Final checks",
		description: "Validating demo ecosystem readiness",
	},
];

const normalizeCoordinates = ({ latitude, longitude }) => {
	const lat = Number(latitude);
	const lng = Number(longitude);
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
		throw new Error("Valid latitude and longitude are required for demo provisioning");
	}
	return { latitude: lat, longitude: lng };
};

const invokePhase = async ({ phase, latitude, longitude, radiusKm }) => {
	const { data, error } = await supabase.functions.invoke("bootstrap-demo-ecosystem", {
		body: {
			phase,
			latitude,
			longitude,
			radiusKm,
		},
	});

	if (error) {
		throw new Error(error.message || `Demo provisioning failed at phase: ${phase}`);
	}

	if (!data?.ok) {
		throw new Error(data?.error || `Demo provisioning failed at phase: ${phase}`);
	}

	return data;
};

const getPhaseMeta = (phaseKey) =>
	DEMO_BOOTSTRAP_PHASES.find((phase) => phase.key === phaseKey) ||
	{ key: phaseKey, label: phaseKey, description: "" };

export const demoEcosystemService = {
	isDemoHospital(hospital) {
		if (!hospital || typeof hospital !== "object") return false;

		const placeId = String(hospital.placeId || hospital.place_id || "");
		const verificationStatus = String(
			hospital.verificationStatus || hospital.verification_status || ""
		).toLowerCase();
		const features = Array.isArray(hospital.features)
			? hospital.features.map((feature) => String(feature).toLowerCase())
			: [];

		return (
			placeId.startsWith("demo:") ||
			verificationStatus.startsWith("demo") ||
			features.includes("demo_seed") ||
			features.includes("demo_verified") ||
			features.includes("ivisit_demo")
		);
	},

	async bootstrapDemoEcosystem({ latitude, longitude, radiusKm = 50, onProgress }) {
		const coords = normalizeCoordinates({ latitude, longitude });
		const summary = {
			organizationId: null,
			hospitals: [],
			phaseResults: {},
		};

		for (let index = 0; index < DEMO_BOOTSTRAP_PHASES.length; index += 1) {
			const phase = DEMO_BOOTSTRAP_PHASES[index];
			onProgress?.({
				...phase,
				index,
				total: DEMO_BOOTSTRAP_PHASES.length,
				status: "running",
			});

			const result = await invokePhase({
				phase: phase.key,
				latitude: coords.latitude,
				longitude: coords.longitude,
				radiusKm,
			});

			summary.phaseResults[phase.key] = result;
			summary.organizationId = result.organization_id || summary.organizationId;
			if (Array.isArray(result.hospitals)) {
				summary.hospitals = result.hospitals;
			}

			onProgress?.({
				...phase,
				index,
				total: DEMO_BOOTSTRAP_PHASES.length,
				status: "completed",
				result,
			});
		}

		return summary;
	},

	getPhaseMeta,
};


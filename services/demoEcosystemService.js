import AsyncStorage from "@react-native-async-storage/async-storage";
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

const DEMO_BOOTSTRAP_STATE_KEY = "@ivisit/demo-bootstrap-state:v1";
const DEMO_RESEED_DISTANCE_KM = 3;
const DEMO_RESEED_MAX_AGE_MS = 12 * 60 * 60 * 1000;

const normalizeCoordinates = ({ latitude, longitude }) => {
	const lat = Number(latitude);
	const lng = Number(longitude);
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
		throw new Error("Valid latitude and longitude are required for demo provisioning");
	}
	return { latitude: lat, longitude: lng };
};

const normalizeUserKey = (userId) => String(userId || "").trim();

const readBootstrapState = async () => {
	try {
		const raw = await AsyncStorage.getItem(DEMO_BOOTSTRAP_STATE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch (error) {
		console.warn("[demoEcosystemService] Failed to read bootstrap state", error);
		return {};
	}
};

const writeBootstrapState = async (state) => {
	try {
		await AsyncStorage.setItem(DEMO_BOOTSTRAP_STATE_KEY, JSON.stringify(state));
	} catch (error) {
		console.warn("[demoEcosystemService] Failed to persist bootstrap state", error);
	}
};

const calculateDistanceKm = (origin, destination) => {
	const start = normalizeCoordinates(origin);
	const end = normalizeCoordinates(destination);
	const toRadians = (value) => (value * Math.PI) / 180;
	const earthRadiusKm = 6371;
	const dLat = toRadians(end.latitude - start.latitude);
	const dLng = toRadians(end.longitude - start.longitude);
	const lat1 = toRadians(start.latitude);
	const lat2 = toRadians(end.latitude);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return earthRadiusKm * c;
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

	isDemoFlowActive({ hospital, demoModeEnabled = true } = {}) {
		return Boolean(demoModeEnabled) && this.isDemoHospital(hospital);
	},

	async getBootstrapState(userId) {
		const userKey = normalizeUserKey(userId);
		if (!userKey) return null;

		const state = await readBootstrapState();
		return state[userKey] && typeof state[userKey] === "object" ? state[userKey] : null;
	},

	async recordBootstrapState({ userId, latitude, longitude, radiusKm = 50, bootstrappedAt = Date.now() }) {
		const userKey = normalizeUserKey(userId);
		if (!userKey) return null;

		const coords = normalizeCoordinates({ latitude, longitude });
		const state = await readBootstrapState();
		const nextState = {
			...state,
			[userKey]: {
				latitude: coords.latitude,
				longitude: coords.longitude,
				radiusKm,
				bootstrappedAt,
			},
		};

		await writeBootstrapState(nextState);
		return nextState[userKey];
	},

	shouldRebootstrapForLocation({
		currentLocation,
		lastBootstrapState,
		thresholdKm = DEMO_RESEED_DISTANCE_KM,
		maxAgeMs = DEMO_RESEED_MAX_AGE_MS,
	} = {}) {
		const current = normalizeCoordinates(currentLocation || {});
		if (!lastBootstrapState) {
			return { needed: true, reason: "missing_state", distanceKm: null, ageMs: null };
		}

		try {
			const distanceKm = calculateDistanceKm(current, lastBootstrapState);
			const ageMs =
				Number.isFinite(lastBootstrapState?.bootstrappedAt)
					? Date.now() - Number(lastBootstrapState.bootstrappedAt)
					: null;

			if (distanceKm >= thresholdKm) {
				return { needed: true, reason: "moved", distanceKm, ageMs };
			}

			if (Number.isFinite(ageMs) && ageMs >= maxAgeMs) {
				return { needed: true, reason: "stale", distanceKm, ageMs };
			}

			return { needed: false, reason: "fresh", distanceKm, ageMs };
		} catch (_error) {
			return { needed: true, reason: "invalid_state", distanceKm: null, ageMs: null };
		}
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

	async ensureDemoEcosystemForLocation({
		userId,
		latitude,
		longitude,
		radiusKm = 50,
		thresholdKm = DEMO_RESEED_DISTANCE_KM,
		maxAgeMs = DEMO_RESEED_MAX_AGE_MS,
		force = false,
		onProgress,
	}) {
		const coords = normalizeCoordinates({ latitude, longitude });
		const lastBootstrapState = await this.getBootstrapState(userId);
		const decision = force
			? { needed: true, reason: "forced", distanceKm: null, ageMs: null }
			: this.shouldRebootstrapForLocation({
					currentLocation: coords,
					lastBootstrapState,
					thresholdKm,
					maxAgeMs,
			  });

		if (!decision.needed) {
			return {
				bootstrapped: false,
				location: coords,
				lastBootstrapState,
				...decision,
			};
		}

		const summary = await this.bootstrapDemoEcosystem({
			latitude: coords.latitude,
			longitude: coords.longitude,
			radiusKm,
			onProgress,
		});

		await this.recordBootstrapState({
			userId,
			latitude: coords.latitude,
			longitude: coords.longitude,
			radiusKm,
		});

		return {
			...summary,
			bootstrapped: true,
			location: coords,
			lastBootstrapState,
			...decision,
		};
	},

	getPhaseMeta,
};

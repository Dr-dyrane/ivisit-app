import { supabase } from "./supabase";
import { getHospitalFacilityKey } from "./hospitalIdentity";
import { database } from "../database";

export const DEMO_BOOTSTRAP_PHASES = [
	{
		key: "prepare",
		label: "Preparing demo context",
		description: "Scanning nearby hospital candidates around your location",
	},
	{
		key: "hospitals",
		label: "Creating demo hospitals",
		description: "Building complete nearby hospitals for demo coverage",
	},
	{
		key: "staff",
		label: "Assigning teams",
		description: "Provisioning demo doctors, drivers, and ambulances",
	},
	{
		key: "pricing",
		label: "Configuring dispatch",
		description: "Applying ambulance pricing and cash-approval readiness",
	},
	{
		key: "summary",
		label: "Final checks",
		description: "Validating demo ecosystem readiness",
	},
];

const DEMO_BOOTSTRAP_STATE_KEY = "@ivisit/demo-bootstrap-state:v2";
const DEMO_BOOTSTRAP_GUEST_ID_KEY = "@ivisit/demo-bootstrap-guest-id:v1";
const DEMO_RESEED_DISTANCE_KM = 3;
const DEMO_RESEED_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const DEMO_PERSISTED_COVERAGE_THRESHOLD = 5;
const DEMO_PERSISTED_COVERAGE_RADIUS_KM = 15;
const DEMO_LOCAL_COVERAGE_RADIUS_KM = 8;

const normalizeCoordinates = ({ latitude, longitude }) => {
	const lat = Number(latitude);
	const lng = Number(longitude);
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
		throw new Error("Valid latitude and longitude are required for demo provisioning");
	}
	return { latitude: lat, longitude: lng };
};

const normalizeUserKey = (userId) => String(userId || "").trim();
const toCoverageAxisKey = (value) =>
	`${value >= 0 ? "p" : "n"}${Math.round(Math.abs(value) * 100)
		.toString()
		.padStart(4, "0")}`;
const toCoverageKey = ({ latitude, longitude }) =>
	`${toCoverageAxisKey(latitude)}_${toCoverageAxisKey(longitude)}`;

const readBootstrapState = async () => {
	try {
		const parsed = await database.readRaw(DEMO_BOOTSTRAP_STATE_KEY, {});
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch (error) {
		console.warn("[demoEcosystemService] Failed to read bootstrap state", error);
		return {};
	}
};

const writeBootstrapState = async (state) => {
	try {
		await database.writeRaw(DEMO_BOOTSTRAP_STATE_KEY, state);
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

const createGuestProvisioningId = () =>
	`guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const toProvisioningOwnerSlug = (value) => {
	const normalized = String(value || "")
		.replace(/[^a-zA-Z0-9]/g, "")
		.slice(0, 12)
		.toLowerCase();
	return normalized || "guestdemo";
};

const resolveProvisioningUserId = async (userId) => {
	const normalizedUserId = normalizeUserKey(userId);
	if (normalizedUserId && normalizedUserId.toLowerCase() !== "guest") {
		return normalizedUserId;
	}

	try {
		const existingGuestId = await database.readRaw(DEMO_BOOTSTRAP_GUEST_ID_KEY);
		if (existingGuestId && existingGuestId.trim().length > 0) {
			return existingGuestId.trim();
		}

		const nextGuestId = createGuestProvisioningId();
		await database.writeRaw(DEMO_BOOTSTRAP_GUEST_ID_KEY, nextGuestId);
		return nextGuestId;
	} catch (_error) {
		return normalizedUserId || "guest";
	}
};

const invokePhase = async ({ phase, latitude, longitude, radiusKm, userId }) => {
	const { data, error } = await supabase.functions.invoke("bootstrap-demo-ecosystem", {
		body: {
			phase,
			userId,
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
	toProvisioningOwnerSlug,

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
			features.includes("demo_complete") ||
			features.includes("ivisit_demo")
		);
	},

	isLegacySyntheticDemoHospital(hospital) {
		if (!hospital || this.isDemoHospital(hospital) !== true) return false;

		const name = String(hospital?.name || "").trim();
		const address = String(hospital?.address || "").trim();

		return (
			/^Emergency Care Center\s+\d+$/i.test(name) ||
			/^Coverage(?:\s+[A-Za-z0-9_:-]+)?\s+Zone\s+\d+$/i.test(address)
		);
	},

	countsAsDemoCoverage(hospital) {
		return this.isDemoHospital(hospital) && !this.isLegacySyntheticDemoHospital(hospital);
	},

	isDemoFlowActive({ hospital, demoModeEnabled = true } = {}) {
		return Boolean(demoModeEnabled) && this.isDemoHospital(hospital);
	},

	shouldSimulatePayments({ hospital, demoModeEnabled = true } = {}) {
		return this.isDemoFlowActive({ hospital, demoModeEnabled });
	},

	async getProvisioningUserId(userId) {
		return resolveProvisioningUserId(userId);
	},

	async getProvisioningOwnerSlug(userId) {
		const provisioningUserId = await resolveProvisioningUserId(userId);
		return toProvisioningOwnerSlug(provisioningUserId);
	},

	matchesDemoOwner(hospital, ownerSlug) {
		if (this.isDemoHospital(hospital) !== true) return true;
		const featureList = Array.isArray(hospital?.features)
			? hospital.features.map((feature) => String(feature).trim().toLowerCase())
			: [];
		if (
			featureList.includes("demo_shared") ||
			featureList.some((feature) => feature.startsWith("demo_scope:"))
		) {
			return true;
		}
		const normalizedOwnerSlug = String(ownerSlug || "").trim().toLowerCase();
		if (!normalizedOwnerSlug) return false;
		const hospitalOwner = String(hospital?.demoOwner || "").trim().toLowerCase();
		return hospitalOwner.length > 0 && hospitalOwner === normalizedOwnerSlug;
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

	async getPersistedDemoCoverageForLocation({
		latitude,
		longitude,
		minimumHospitals = DEMO_PERSISTED_COVERAGE_THRESHOLD,
	} = {}) {
		const coords = normalizeCoordinates({ latitude, longitude });
		const coverageKey = toCoverageKey(coords);
		const latDelta = DEMO_PERSISTED_COVERAGE_RADIUS_KM / 111;
		const lngDelta =
			DEMO_PERSISTED_COVERAGE_RADIUS_KM /
			(111 * Math.max(0.1, Math.cos((coords.latitude * Math.PI) / 180)));
		const { data, error } = await supabase
			.from("hospitals")
			.select("id,name,address,place_id,latitude,longitude,verified,verification_status,features,status")
			.like("place_id", "demo:%")
			.eq("status", "available")
			.gte("latitude", coords.latitude - latDelta)
			.lte("latitude", coords.latitude + latDelta)
			.gte("longitude", coords.longitude - lngDelta)
			.lte("longitude", coords.longitude + lngDelta);

		if (error) {
			console.warn("[demoEcosystemService] Failed to inspect persisted demo coverage", error);
			return {
				coverageKey,
				hospitals: [],
				count: 0,
				sufficient: false,
			};
		}

		const buckets = new Map();
		(data || [])
			.filter((row) => {
				const lat = Number(row?.latitude);
				const lng = Number(row?.longitude);
				if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
				return (
					calculateDistanceKm(coords, { latitude: lat, longitude: lng }) <=
					DEMO_PERSISTED_COVERAGE_RADIUS_KM
				);
			})
			.filter((row) => this.countsAsDemoCoverage(row))
			.forEach((row) => {
				const key = getHospitalFacilityKey(row) || String(row?.id || "");
				if (!key || buckets.has(key)) return;
				buckets.set(key, row);
			});

		const hospitals = Array.from(buckets.values());
		const localHospitals = hospitals.filter((row) => {
			const lat = Number(row?.latitude);
			const lng = Number(row?.longitude);
			if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
			return (
				calculateDistanceKm(coords, { latitude: lat, longitude: lng }) <=
				DEMO_LOCAL_COVERAGE_RADIUS_KM
			);
		});
		return {
			coverageKey,
			hospitals,
			count: hospitals.length,
			localHospitals,
			localCount: localHospitals.length,
			sufficient:
				hospitals.length >= minimumHospitals &&
				localHospitals.length >= minimumHospitals,
		};
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

	async bootstrapDemoEcosystem({ userId, latitude, longitude, radiusKm = 50, onProgress }) {
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
				userId,
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

		const finalSummary = summary.phaseResults?.summary?.summary;
		if (finalSummary && finalSummary.clean_cycle_ready === false) {
			const blockers = [];
			if (finalSummary.coverage_ready !== true) blockers.push("coverage");
			if (finalSummary.staffing_ready !== true) blockers.push("staffing");
			if (finalSummary.pricing_ready !== true) blockers.push("pricing");
			throw new Error(
				`Demo provisioning incomplete${blockers.length ? `: ${blockers.join(", ")} not ready` : ""}`
			);
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
		const provisioningUserId = await resolveProvisioningUserId(userId);
		const lastBootstrapState = await this.getBootstrapState(provisioningUserId);
		const persistedCoverage = force
			? null
			: await this.getPersistedDemoCoverageForLocation({
					latitude: coords.latitude,
					longitude: coords.longitude,
			  });

		if (!force && persistedCoverage?.sufficient) {
			await this.recordBootstrapState({
				userId: provisioningUserId,
				latitude: coords.latitude,
				longitude: coords.longitude,
				radiusKm,
			});

			return {
				bootstrapped: false,
				userId: provisioningUserId,
				location: coords,
				lastBootstrapState,
				reason: "persisted_coverage",
				distanceKm: 0,
				ageMs: null,
				persistedCoverage,
			};
		}
		const freshnessDecision = this.shouldRebootstrapForLocation({
			currentLocation: coords,
			lastBootstrapState,
			thresholdKm,
			maxAgeMs,
		});
		const decision = force
			? { needed: true, reason: "forced", distanceKm: null, ageMs: null }
			: persistedCoverage && persistedCoverage.sufficient !== true
				? {
					...freshnessDecision,
					needed: true,
					reason:
						Number(persistedCoverage.localCount || 0) < DEMO_PERSISTED_COVERAGE_THRESHOLD
							? "insufficient_local_coverage"
							: "insufficient_coverage",
				  }
				: freshnessDecision;

		if (!decision.needed) {
			return {
				bootstrapped: false,
				userId: provisioningUserId,
				location: coords,
				lastBootstrapState,
				...decision,
			};
		}

		const summary = await this.bootstrapDemoEcosystem({
			userId: provisioningUserId,
			latitude: coords.latitude,
			longitude: coords.longitude,
			radiusKm,
			onProgress,
		});

		await this.recordBootstrapState({
			userId: provisioningUserId,
			latitude: coords.latitude,
			longitude: coords.longitude,
			radiusKm,
		});

		return {
			...summary,
			userId: provisioningUserId,
			bootstrapped: true,
			location: coords,
			lastBootstrapState,
			...decision,
		};
	},

	getPhaseMeta,
};

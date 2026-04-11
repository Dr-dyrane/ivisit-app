import AsyncStorage from "@react-native-async-storage/async-storage";
import { demoEcosystemService } from "./demoEcosystemService";

export const COVERAGE_MODES = {
	LIVE_ONLY: "live_only",
	HYBRID: "hybrid",
	DEMO_ONLY: "demo_only",
};

export const COVERAGE_STATUS = {
	NONE: "none",
	POOR: "poor",
	GOOD: "good",
};

export const COVERAGE_IMMEDIATE_RADIUS_KM = 5;
export const COVERAGE_NEARBY_RADIUS_KM = 15;
export const COVERAGE_DISCOVERY_RADIUS_KM = 50;
export const COVERAGE_POOR_THRESHOLD = 3;
export const NEARBY_UI_COMFORT_THRESHOLD = 5;
export const DEMO_NEARBY_SUFFICIENCY_THRESHOLD = 5;

const COVERAGE_MODE_STORAGE_KEY_PREFIX = "@ivisit/coverage-mode:v1:";

const normalizeUserKey = (userId) => String(userId || "").trim();

const normalizeCoverageMode = (value) => {
	switch (String(value || "").trim().toLowerCase()) {
		case COVERAGE_MODES.LIVE_ONLY:
			return COVERAGE_MODES.LIVE_ONLY;
		case COVERAGE_MODES.DEMO_ONLY:
			return COVERAGE_MODES.DEMO_ONLY;
		case COVERAGE_MODES.HYBRID:
		default:
			return COVERAGE_MODES.HYBRID;
	}
};

const makeStorageKey = (userId) => {
	const userKey = normalizeUserKey(userId);
	return userKey ? `${COVERAGE_MODE_STORAGE_KEY_PREFIX}${userKey}` : null;
};

const hasValidCoordinates = (hospital) => {
	const latitude = hospital?.coordinates?.latitude ?? hospital?.latitude;
	const longitude = hospital?.coordinates?.longitude ?? hospital?.longitude;
	return Number.isFinite(latitude) && Number.isFinite(longitude);
};

const makeCoverageDedupKey = (hospital) => {
	const latitude = hospital?.coordinates?.latitude ?? hospital?.latitude;
	const longitude = hospital?.coordinates?.longitude ?? hospital?.longitude;
	return (
		hospital?.id ??
		`${hospital?.name || "hospital"}:${Number(latitude).toFixed(4)}:${Number(longitude).toFixed(4)}`
	);
};

const isVerifiedHospitalForCoverage = (hospital) => {
	if (!hospital || typeof hospital !== "object") return false;

	const verified = hospital?.verified === true;
	const importStatus = String(
		hospital?.importStatus ?? hospital?.import_status ?? ""
	).toLowerCase();

	return verified || importStatus === "verified";
};

const isDemoHospital = (hospital) =>
	hospital?.isDemo === true || demoEcosystemService.isDemoHospital(hospital);
const countsAsDemoCoverage = (hospital) =>
	demoEcosystemService.countsAsDemoCoverage(hospital);
const parseHospitalDistanceKm = (hospital) => {
	const directDistance = Number(hospital?.distanceKm);
	if (Number.isFinite(directDistance)) {
		return directDistance;
	}

	const explicitDistance = Number(hospital?.distance);
	if (Number.isFinite(explicitDistance)) {
		return explicitDistance;
	}

	const distanceLabel = String(hospital?.distance || "").trim();
	if (!distanceLabel) return null;

	const match = distanceLabel.match(/(\d+(?:\.\d+)?)/);
	if (!match) return null;

	const parsed = Number(match[1]);
	return Number.isFinite(parsed) ? parsed : null;
};
const COVERAGE_DISTANCE_BANDS = {
	immediate: 0,
	nearby: 1,
	extended: 2,
	outside: 3,
	unknown: 4,
};
const getCoverageDistanceBand = (hospital) => {
	const distanceKm = parseHospitalDistanceKm(hospital);
	if (!Number.isFinite(distanceKm)) return "unknown";
	if (distanceKm <= COVERAGE_IMMEDIATE_RADIUS_KM) return "immediate";
	if (distanceKm <= COVERAGE_NEARBY_RADIUS_KM) return "nearby";
	if (distanceKm <= COVERAGE_DISCOVERY_RADIUS_KM) return "extended";
	return "outside";
};
const getHospitalTrustRank = (hospital) => {
	const isDemo = isDemoHospital(hospital);
	const isVerified = isVerifiedHospitalForCoverage(hospital);
	if (isVerified && !isDemo) return 0;
	if (isVerified && isDemo) return 1;
	if (!isDemo) return 2;
	return 3;
};
const buildEmptyCoverageCounts = () => ({
	allImmediate: 0,
	liveImmediate: 0,
	verifiedImmediate: 0,
	demoImmediate: 0,
	allNearby: 0,
	liveNearby: 0,
	verifiedNearby: 0,
	demoNearby: 0,
	allExtended: 0,
	liveExtended: 0,
	verifiedExtended: 0,
	demoExtended: 0,
});
const incrementCoverageCounts = (counts, prefix, { isDemo, isVerified }) => {
	counts[`all${prefix}`] += 1;
	if (isDemo) {
		counts[`demo${prefix}`] += 1;
		return;
	}

	counts[`live${prefix}`] += 1;
	if (isVerified) {
		counts[`verified${prefix}`] += 1;
	}
};
const compareHospitalNames = (left, right) =>
	String(left?.name || "").localeCompare(String(right?.name || ""), undefined, {
		sensitivity: "base",
	});

export const coverageModeService = {
	normalizeMode(value) {
		return normalizeCoverageMode(value);
	},

	modeFromDemoPreference(demoModeEnabled) {
		return demoModeEnabled === false
			? COVERAGE_MODES.LIVE_ONLY
			: COVERAGE_MODES.HYBRID;
	},

	allowsDemo(mode) {
		return normalizeCoverageMode(mode) !== COVERAGE_MODES.LIVE_ONLY;
	},

	needsDemoSupport(coverageStatus) {
		return coverageStatus !== COVERAGE_STATUS.GOOD;
	},

	hasAnyDemoCoverage(counts = {}) {
		return Number(counts?.demoNearby || 0) > 0;
	},

	hasComfortableNearbyCoverage(counts = {}) {
		return Number(counts?.allNearby || 0) >= NEARBY_UI_COMFORT_THRESHOLD;
	},

	hasSufficientDemoCoverage(counts = {}) {
		return Number(counts?.demoNearby || 0) >= DEMO_NEARBY_SUFFICIENCY_THRESHOLD;
	},

	shouldBootstrapDemo({
		coverageStatus,
		nearbyCoverageCounts = null,
		targetMode = null,
		hasDemoHospitalsNearby = false,
		force = false,
	} = {}) {
		if (force) return true;

		const normalizedTargetMode = targetMode
			? normalizeCoverageMode(targetMode)
			: null;
		const hasSufficientDemoCoverage =
			nearbyCoverageCounts && typeof nearbyCoverageCounts === "object"
				? this.hasSufficientDemoCoverage(nearbyCoverageCounts)
				: Boolean(hasDemoHospitalsNearby);

		if (normalizedTargetMode === COVERAGE_MODES.DEMO_ONLY) {
			return !hasSufficientDemoCoverage;
		}

		if (!this.needsDemoSupport(coverageStatus)) {
			return false;
		}

		if (nearbyCoverageCounts && typeof nearbyCoverageCounts === "object") {
			return !this.hasComfortableNearbyCoverage(nearbyCoverageCounts);
		}

		return !hasSufficientDemoCoverage;
	},

	isLiveOnlyAvailable(coverageStatus) {
		return coverageStatus === COVERAGE_STATUS.GOOD;
	},

	resolveEffectiveMode({ preferredMode, coverageStatus, demoModeEnabled } = {}) {
		const fallbackMode = this.modeFromDemoPreference(demoModeEnabled);
		const normalizedPreferred = preferredMode
			? normalizeCoverageMode(preferredMode)
			: fallbackMode;

		if (
			normalizedPreferred === COVERAGE_MODES.LIVE_ONLY &&
			coverageStatus !== COVERAGE_STATUS.GOOD
		) {
			return COVERAGE_MODES.HYBRID;
		}

		return normalizedPreferred;
	},

	deriveNearbyCoverageCounts(hospitals = []) {
		if (!Array.isArray(hospitals) || hospitals.length === 0) {
			return buildEmptyCoverageCounts();
		}

		const seen = new Set();
		return hospitals.reduce(
			(acc, hospital) => {
				if (!hospital || !hasValidCoordinates(hospital)) return acc;

				const key = makeCoverageDedupKey(hospital);
				if (seen.has(key)) return acc;
				seen.add(key);

				const distanceBand = getCoverageDistanceBand(hospital);
				if (distanceBand === "outside" || distanceBand === "unknown") {
					return acc;
				}

				const isDemo = countsAsDemoCoverage(hospital);
				const isVerified = isVerifiedHospitalForCoverage(hospital);

				if (distanceBand === "immediate") {
					incrementCoverageCounts(acc, "Immediate", { isDemo, isVerified });
					incrementCoverageCounts(acc, "Nearby", { isDemo, isVerified });
					return acc;
				}

				if (distanceBand === "nearby") {
					incrementCoverageCounts(acc, "Nearby", { isDemo, isVerified });
					return acc;
				}

				incrementCoverageCounts(acc, "Extended", { isDemo, isVerified });
				return acc;
			},
			buildEmptyCoverageCounts()
		);
	},

	deriveCoverageStatus(counts = {}, threshold = COVERAGE_POOR_THRESHOLD) {
		const verifiedNearby = Number(counts?.verifiedNearby || 0);
		if (verifiedNearby <= 0) return COVERAGE_STATUS.NONE;
		if (verifiedNearby < threshold) return COVERAGE_STATUS.POOR;
		return COVERAGE_STATUS.GOOD;
	},

	sortHospitalsForMapExperience(hospitals = []) {
		if (!Array.isArray(hospitals) || hospitals.length === 0) {
			return [];
		}

		return [...hospitals].filter(Boolean).sort((left, right) => {
			const leftBand = COVERAGE_DISTANCE_BANDS[getCoverageDistanceBand(left)];
			const rightBand = COVERAGE_DISTANCE_BANDS[getCoverageDistanceBand(right)];
			if (leftBand !== rightBand) {
				return leftBand - rightBand;
			}

			const leftDistance = parseHospitalDistanceKm(left);
			const rightDistance = parseHospitalDistanceKm(right);
			const leftHasDistance = Number.isFinite(leftDistance);
			const rightHasDistance = Number.isFinite(rightDistance);
			if (leftHasDistance && rightHasDistance && leftDistance !== rightDistance) {
				return leftDistance - rightDistance;
			}
			if (leftHasDistance !== rightHasDistance) {
				return leftHasDistance ? -1 : 1;
			}

			const leftTrustRank = getHospitalTrustRank(left);
			const rightTrustRank = getHospitalTrustRank(right);
			if (leftTrustRank !== rightTrustRank) {
				return leftTrustRank - rightTrustRank;
			}

			const leftIsDemo = isDemoHospital(left);
			const rightIsDemo = isDemoHospital(right);
			if (leftIsDemo !== rightIsDemo) {
				return leftIsDemo ? 1 : -1;
			}

			return compareHospitalNames(left, right);
		});
	},

	async getStoredMode(userId) {
		const storageKey = makeStorageKey(userId);
		if (!storageKey) return null;

		try {
			const raw = await AsyncStorage.getItem(storageKey);
			return raw ? normalizeCoverageMode(raw) : null;
		} catch (error) {
			console.warn("[coverageModeService] Failed to read stored mode", error);
			return null;
		}
	},

	async setStoredMode(userId, mode) {
		const storageKey = makeStorageKey(userId);
		if (!storageKey) return null;

		const normalizedMode = normalizeCoverageMode(mode);
		try {
			await AsyncStorage.setItem(storageKey, normalizedMode);
			return normalizedMode;
		} catch (error) {
			console.warn("[coverageModeService] Failed to store coverage mode", error);
			return normalizedMode;
		}
	},

	async clearStoredMode(userId) {
		const storageKey = makeStorageKey(userId);
		if (!storageKey) return;

		try {
			await AsyncStorage.removeItem(storageKey);
		} catch (error) {
			console.warn("[coverageModeService] Failed to clear stored mode", error);
		}
	},
};

export const isHospitalVerifiedForCoverage = (hospital) =>
	isVerifiedHospitalForCoverage(hospital);

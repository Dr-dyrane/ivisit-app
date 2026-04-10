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

export const COVERAGE_POOR_THRESHOLD = 3;

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

	shouldBootstrapDemo({ coverageStatus, hasDemoHospitalsNearby = false, force = false } = {}) {
		if (force) return true;
		return this.needsDemoSupport(coverageStatus) && !hasDemoHospitalsNearby;
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
			return {
				allNearby: 0,
				liveNearby: 0,
				verifiedNearby: 0,
				demoNearby: 0,
			};
		}

		const seen = new Set();
		return hospitals.reduce(
			(acc, hospital) => {
				if (!hospital || !hasValidCoordinates(hospital)) return acc;

				const key = makeCoverageDedupKey(hospital);
				if (seen.has(key)) return acc;
				seen.add(key);

				if (isDemoHospital(hospital)) {
					acc.demoNearby += 1;
					acc.allNearby += 1;
					return acc;
				}

				acc.liveNearby += 1;
				acc.allNearby += 1;
				if (isVerifiedHospitalForCoverage(hospital)) {
					acc.verifiedNearby += 1;
				}
				return acc;
			},
			{
				allNearby: 0,
				liveNearby: 0,
				verifiedNearby: 0,
				demoNearby: 0,
			}
		);
	},

	deriveCoverageStatus(counts = {}, threshold = COVERAGE_POOR_THRESHOLD) {
		const verifiedNearby = Number(counts?.verifiedNearby || 0);
		if (verifiedNearby <= 0) return COVERAGE_STATUS.NONE;
		if (verifiedNearby < threshold) return COVERAGE_STATUS.POOR;
		return COVERAGE_STATUS.GOOD;
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

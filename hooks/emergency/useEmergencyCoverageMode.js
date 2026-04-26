/**
 * useEmergencyCoverageMode.js
 *
 * Owns: coverage mode preference (load + persist), coverage status derived
 * from nearby hospitals, demo slug, and the setCoverageMode action.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { usePreferences } from "../../contexts/PreferencesContext";
import {
	coverageModeService,
	COVERAGE_MODES,
	COVERAGE_STATUS,
	COVERAGE_POOR_THRESHOLD,
} from "../../services/coverageModeService";
import { demoEcosystemService } from "../../services/demoEcosystemService";
import { DEFAULT_APP_REGION } from "../../constants/locationDefaults";

export function useEmergencyCoverageMode({ hospitals: hospitalsProp, userLocation }) {
	const { user } = useAuth();
	const { preferences, updatePreferences } = usePreferences();

	const legacyDemoModeEnabled = preferences?.demoModeEnabled !== false;
	const legacyCoverageMode = coverageModeService.modeFromDemoPreference(legacyDemoModeEnabled);

	const [demoOwnerSlug, setDemoOwnerSlug] = useState("");
	const [coverageModePreference, setCoverageModePreference] = useState(null);
	const [coverageModePreferenceLoaded, setCoverageModePreferenceLoaded] = useState(false);
	const [coverageModeOperation, setCoverageModeOperation] = useState({ isPending: false, targetMode: null });
	const [forceDemoFetch, setForceDemoFetch] = useState(false);

	const preferredCoverageMode = coverageModePreference || legacyCoverageMode;
	const allowsPreferredDemo = coverageModeService.allowsDemo(preferredCoverageMode);

	// Load stored coverage mode preference
	useEffect(() => {
		let isMounted = true;
		const load = async () => {
			setCoverageModePreferenceLoaded(false);
			setForceDemoFetch(false);
			const storedMode = await coverageModeService.getStoredMode(user?.id);
			if (!isMounted) return;
			setCoverageModePreference(storedMode);
			setCoverageModePreferenceLoaded(true);
		};
		load();
		return () => { isMounted = false; };
	}, [user?.id]);

	// Resolve demo owner slug
	useEffect(() => {
		let isMounted = true;
		const resolve = async () => {
			try {
				const nextSlug = await demoEcosystemService.getProvisioningOwnerSlug(user?.id);
				if (isMounted) setDemoOwnerSlug(nextSlug);
			} catch (_error) {
				if (isMounted) setDemoOwnerSlug("");
			}
		};
		void resolve();
		return () => { isMounted = false; };
	}, [user?.id]);

	// refetchHospitals wired in by provider after hospital sync initializes
	const refetchHospitalsRef = useRef(null);
	const setRefetchHospitals = useCallback((fn) => { refetchHospitalsRef.current = fn; }, []);

	// hospitals fed in from provider (starts null/[] until hospital sync fills in)
	const hospitals = hospitalsProp || [];

	// Derived coverage counts and status
	const nearbyCoverageCounts = useMemo(() => {
		if (!Array.isArray(hospitals) || hospitals.length === 0) {
			return coverageModeService.deriveNearbyCoverageCounts([]);
		}
		const coverageSource = hospitals.filter((h) => demoEcosystemService.matchesDemoOwner(h, demoOwnerSlug));
		return coverageModeService.deriveNearbyCoverageCounts(coverageSource);
	}, [demoOwnerSlug, hospitals]);

	const coverageStatus = useMemo(
		() => coverageModeService.deriveCoverageStatus(nearbyCoverageCounts, COVERAGE_POOR_THRESHOLD),
		[nearbyCoverageCounts]
	);

	const effectiveCoverageMode = useMemo(
		() => coverageModeService.resolveEffectiveMode({
			preferredMode: preferredCoverageMode,
			coverageStatus,
			demoModeEnabled: legacyDemoModeEnabled,
		}),
		[coverageStatus, legacyDemoModeEnabled, preferredCoverageMode]
	);

	const effectiveDemoModeEnabled = coverageModeService.allowsDemo(effectiveCoverageMode);
	const isLiveOnlyAvailable = coverageModeService.isLiveOnlyAvailable(coverageStatus);
	const hasDemoHospitalsNearby = useMemo(
		() => coverageModeService.hasAnyDemoCoverage(nearbyCoverageCounts),
		[nearbyCoverageCounts]
	);
	const hasComfortableDemoCoverage = useMemo(
		() => coverageModeService.hasSufficientDemoCoverage(nearbyCoverageCounts),
		[nearbyCoverageCounts]
	);
	const hasComfortableNearbyCoverage = useMemo(
		() => coverageModeService.hasComfortableNearbyCoverage(nearbyCoverageCounts),
		[nearbyCoverageCounts]
	);

	// Keep forceDemoFetch in sync with coverage status
	useEffect(() => {
		if (coverageModeService.needsDemoSupport(coverageStatus)) {
			setForceDemoFetch(true);
			return;
		}
		setForceDemoFetch(allowsPreferredDemo);
	}, [allowsPreferredDemo, coverageStatus]);

	const resolveCoverageCoordinates = useCallback(() => {
		const latitude = Number(userLocation?.latitude ?? DEFAULT_APP_REGION.latitude);
		const longitude = Number(userLocation?.longitude ?? DEFAULT_APP_REGION.longitude);
		if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
			throw new Error("Unable to resolve location for coverage mode");
		}
		return { latitude, longitude };
	}, [userLocation?.latitude, userLocation?.longitude]);

	const setCoverageMode = useCallback(
		async (mode, options = {}) => {
			const requestedMode = coverageModeService.normalizeMode(mode);
			const nextMode =
				requestedMode === COVERAGE_MODES.LIVE_ONLY && coverageStatus !== COVERAGE_STATUS.GOOD
					? COVERAGE_MODES.HYBRID
					: requestedMode;
			const shouldFetchDemo =
				coverageModeService.allowsDemo(nextMode) || coverageStatus !== COVERAGE_STATUS.GOOD;
			const shouldBootstrapDemo =
				shouldFetchDemo &&
				user?.id &&
				coverageModeService.shouldBootstrapDemo({
					coverageStatus,
					nearbyCoverageCounts,
					targetMode: nextMode,
					force: options.forceBootstrap === true,
				});

			setCoverageModeOperation({ isPending: true, targetMode: nextMode });
			setCoverageModePreference(nextMode);
			setForceDemoFetch(shouldFetchDemo);

			try {
				if (shouldBootstrapDemo) {
					const coords = resolveCoverageCoordinates();
					await demoEcosystemService.ensureDemoEcosystemForLocation({
						userId: user.id,
						latitude: coords.latitude,
						longitude: coords.longitude,
						radiusKm: 50,
						force: options.forceBootstrap === true,
						onProgress: options.onProgress,
					});
				}

				await coverageModeService.setStoredMode(user?.id, nextMode);

				try {
					await updatePreferences?.({ demoModeEnabled: nextMode !== COVERAGE_MODES.LIVE_ONLY });
				} catch (error) {
					console.warn("[useEmergencyCoverageMode] Failed to sync demo mode preference", error);
				}

				const refetchFn = refetchHospitalsRef.current;
				if (typeof refetchFn === "function") {
					await new Promise((resolve) => setTimeout(resolve, 0));
					await refetchFn();
				}

				return nextMode;
			} catch (error) {
				setCoverageModePreference((prev) => prev === nextMode ? preferredCoverageMode : prev);
				setForceDemoFetch(coverageModeService.allowsDemo(preferredCoverageMode));
				throw error;
			} finally {
				setCoverageModeOperation({ isPending: false, targetMode: null });
			}
		},
		[
			coverageStatus,
			nearbyCoverageCounts,
			preferredCoverageMode,
			resolveCoverageCoordinates,
			updatePreferences,
			user?.id,
		]
	);

	return {
		demoOwnerSlug,
		forceDemoFetch,
		coverageModePreference,
		coverageModePreferenceLoaded,
		coverageModeOperation,
		effectiveCoverageMode,
		effectiveDemoModeEnabled,
		isLiveOnlyAvailable,
		coverageStatus,
		nearbyCoverageCounts,
		hasDemoHospitalsNearby,
		hasComfortableDemoCoverage,
		hasComfortableNearbyCoverage,
		allowsPreferredDemo,
		setCoverageMode,
		setRefetchHospitals,
	};
}

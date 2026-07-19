import { useEffect, useRef, useState } from "react";
import { demoEcosystemService } from "../../../services/demoEcosystemService";

// PULLBACK NOTE: sparse discovery bootstrap refresh race (2026-07-19)
// OLD: any dependency cleanup cancelled a successful same-pickup bootstrap
// before it could refresh the mounted hospital query.
// NEW: bootstrap ownership is location-scoped, not render-scoped. Coverage
// counts and callback identities may change while the canonical sparse-region
// task is still running, but they must not create or cancel a second task.
export function buildDemoBootstrapIdentity(location, userId) {
	const rawLatitude = location?.latitude;
	const rawLongitude = location?.longitude;
	if (
		rawLatitude === null ||
		rawLatitude === undefined ||
		rawLatitude === "" ||
		rawLongitude === null ||
		rawLongitude === undefined ||
		rawLongitude === ""
	) {
		return null;
	}

	const latitude = Number(rawLatitude);
	const longitude = Number(rawLongitude);
	if (
		!Number.isFinite(latitude) ||
		!Number.isFinite(longitude) ||
		latitude < -90 ||
		latitude > 90 ||
		longitude < -180 ||
		longitude > 180
	) {
		return null;
	}

	return [latitude.toFixed(3), longitude.toFixed(3), userId || "guest"].join(":");
}

export function useMapExploreDemoBootstrap({
	activeLocation,
	coverageModePreferenceLoaded,
	effectiveDemoModeEnabled,
	hasComfortableNearbyCoverage,
	isLoadingHospitals,
	refreshHospitals,
	shouldBootstrapDemoCoverage,
	userId,
}) {
	const [isBootstrappingDemo, setIsBootstrappingDemo] = useState(false);
	const demoBootstrapIdentityRef = useRef(null);
	const activeBootstrapRef = useRef(null);
	const refreshHospitalsRef = useRef(refreshHospitals);
	const mountedRef = useRef(true);
	refreshHospitalsRef.current = refreshHospitals;

	useEffect(() => {
		mountedRef.current = true;

		return () => {
			mountedRef.current = false;
		};
	}, []);

	useEffect(() => {
		const bootstrapIdentity = buildDemoBootstrapIdentity(activeLocation, userId);
		const activeTask = activeBootstrapRef.current;
		const shouldInvalidateActiveTask =
			Boolean(activeTask) &&
			(!coverageModePreferenceLoaded ||
				!effectiveDemoModeEnabled ||
				!bootstrapIdentity ||
				activeTask.identity !== bootstrapIdentity);

		if (shouldInvalidateActiveTask) {
			activeTask.cancelled = true;
			activeBootstrapRef.current = null;
			setIsBootstrappingDemo(false);
		}

		if (!coverageModePreferenceLoaded || !effectiveDemoModeEnabled) {
			return undefined;
		}

		if (!bootstrapIdentity) {
			return undefined;
		}
		if (isLoadingHospitals) {
			return undefined;
		}
		if (!shouldBootstrapDemoCoverage) {
			return undefined;
		}

		const shouldForceDemoBootstrap = !hasComfortableNearbyCoverage;
		const currentActiveTask = activeBootstrapRef.current;
		if (currentActiveTask?.identity === bootstrapIdentity) {
			return undefined;
		}

		if (currentActiveTask) {
			currentActiveTask.cancelled = true;
			activeBootstrapRef.current = null;
		}

		if (demoBootstrapIdentityRef.current === bootstrapIdentity) {
			return undefined;
		}

		demoBootstrapIdentityRef.current = bootstrapIdentity;
		const bootstrapTask = {
			identity: bootstrapIdentity,
			cancelled: false,
			hasRefreshed: false,
		};
		activeBootstrapRef.current = bootstrapTask;
		setIsBootstrappingDemo(true);
		const isCurrentTask = () =>
			mountedRef.current &&
			!bootstrapTask.cancelled &&
			activeBootstrapRef.current === bootstrapTask;

		(async () => {
			try {
				const provisioningUserId = await demoEcosystemService.getProvisioningUserId(userId);
				if (!isCurrentTask()) return;
				const bootstrapResult = await demoEcosystemService.ensureDemoEcosystemForLocation({
					userId: provisioningUserId,
					latitude: activeLocation.latitude,
					longitude: activeLocation.longitude,
					radiusKm: 50,
					force: shouldForceDemoBootstrap,
				});
				if (!isCurrentTask()) return;

				if (!bootstrapTask.hasRefreshed) {
					bootstrapTask.hasRefreshed = true;
					await refreshHospitalsRef.current?.();
				}

				if (
					!bootstrapResult?.bootstrapped &&
					shouldForceDemoBootstrap &&
					demoBootstrapIdentityRef.current === bootstrapIdentity
				) {
					demoBootstrapIdentityRef.current = null;
				}
			} catch (error) {
				if (
					isCurrentTask() &&
					demoBootstrapIdentityRef.current === bootstrapIdentity
				) {
					demoBootstrapIdentityRef.current = null;
				}
				console.warn("[useMapExploreFlow] Demo bootstrap skipped for /map", error);
			} finally {
				if (activeBootstrapRef.current === bootstrapTask) {
					activeBootstrapRef.current = null;
					if (mountedRef.current) {
						setIsBootstrappingDemo(false);
					}
				}
			}
		})();

		return undefined;
	}, [
		coverageModePreferenceLoaded,
		effectiveDemoModeEnabled,
		hasComfortableNearbyCoverage,
		isLoadingHospitals,
		shouldBootstrapDemoCoverage,
		activeLocation?.latitude,
		activeLocation?.longitude,
		userId,
	]);

	return isBootstrappingDemo;
}

export default useMapExploreDemoBootstrap;

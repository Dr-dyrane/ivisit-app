import { useEffect, useRef, useState } from "react";
import { demoEcosystemService } from "../../../services/demoEcosystemService";
import { buildDemoBootstrapKey } from "./mapExploreFlow.helpers";

export function useMapExploreDemoBootstrap({
	activeLocation,
	coverageModePreferenceLoaded,
	coverageStatus,
	effectiveDemoModeEnabled,
	hasComfortableNearbyCoverage,
	isLoadingHospitals,
	nearbyCoverageCounts,
	refreshHospitals,
	shouldBootstrapDemoCoverage,
	userId,
}) {
	const [isBootstrappingDemo, setIsBootstrappingDemo] = useState(false);
	const demoBootstrapKeyRef = useRef(null);

	useEffect(() => {
		let cancelled = false;

		if (!coverageModePreferenceLoaded || !effectiveDemoModeEnabled) {
			return undefined;
		}
		if (!activeLocation?.latitude || !activeLocation?.longitude) {
			return undefined;
		}
		if (isLoadingHospitals || isBootstrappingDemo) {
			return undefined;
		}
		if (!shouldBootstrapDemoCoverage) {
			return undefined;
		}

		const shouldForceDemoBootstrap = !hasComfortableNearbyCoverage;
		const bootstrapKey = buildDemoBootstrapKey(
			activeLocation,
			userId,
			coverageStatus,
			nearbyCoverageCounts?.allNearby,
			nearbyCoverageCounts?.demoNearby,
			nearbyCoverageCounts?.verifiedNearby,
			shouldForceDemoBootstrap,
		);

		if (demoBootstrapKeyRef.current === bootstrapKey) {
			return undefined;
		}

		demoBootstrapKeyRef.current = bootstrapKey;
		setIsBootstrappingDemo(true);

		(async () => {
			try {
				const provisioningUserId = await demoEcosystemService.getProvisioningUserId(userId);
				const bootstrapResult = await demoEcosystemService.ensureDemoEcosystemForLocation({
					userId: provisioningUserId,
					latitude: activeLocation.latitude,
					longitude: activeLocation.longitude,
					radiusKm: 50,
					force: shouldForceDemoBootstrap,
				});
				await refreshHospitals?.();

				if (!bootstrapResult?.bootstrapped && shouldForceDemoBootstrap) {
					demoBootstrapKeyRef.current = null;
				}
			} catch (error) {
				demoBootstrapKeyRef.current = null;
				console.warn("[useMapExploreFlow] Demo bootstrap skipped for /map", error);
			} finally {
				if (!cancelled) {
					setIsBootstrappingDemo(false);
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [
		activeLocation,
		coverageModePreferenceLoaded,
		coverageStatus,
		effectiveDemoModeEnabled,
		hasComfortableNearbyCoverage,
		isBootstrappingDemo,
		isLoadingHospitals,
		nearbyCoverageCounts?.allNearby,
		nearbyCoverageCounts?.demoNearby,
		nearbyCoverageCounts?.verifiedNearby,
		refreshHospitals,
		shouldBootstrapDemoCoverage,
		userId,
	]);

	return isBootstrappingDemo;
}

export default useMapExploreDemoBootstrap;

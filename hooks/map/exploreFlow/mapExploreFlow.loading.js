export function buildMapLoadingState({
	coverageModePreferenceLoaded,
	expectsRoute,
	hasActiveLocation,
	hasResolvedProviders,
	isBackgroundCoverageLoading,
	isBackgroundRouteLoading,
	isBootstrappingDemo,
	isLoadingHospitals,
	isLoadingLocation,
	isResolvingPlaceName,
	mapReadiness,
	shouldShowMapLoadingOverlay,
}) {
	let title = "Preparing help";
	let message = "";

	if (!hasActiveLocation) {
		title = "Locating you";
		message = "Nearby help";
	} else if (isResolvingPlaceName) {
		title = "Naming area";
		message = "Current location";
	} else if (!coverageModePreferenceLoaded) {
		title = "Preparing coverage";
		message = "Nearby rules";
	} else if (isLoadingHospitals) {
		title = "Nearby care";
		message = "Checking options";
	} else if (isBootstrappingDemo) {
		title = "Expanding options";
		message = "Building fuller coverage";
	} else if (!mapReadiness.mapReady) {
		title = "Loading map";
		message = "Live surface";
	} else if (expectsRoute && mapReadiness.isCalculatingRoute) {
		title = "Routing";
		message = "Fastest path";
	} else if (expectsRoute && !mapReadiness.routeReady) {
		title = "Final touches";
		message = "Emergency view";
	} else if (!hasResolvedProviders) {
		title = "Finishing nearby help";
		message = "More options loading";
	}

	return {
		visible: shouldShowMapLoadingOverlay,
		title,
		message,
		steps: [
			{
				key: "location",
				label: "Location",
				status: hasActiveLocation ? "done" : isLoadingLocation ? "active" : "pending",
			},
			{
				key: "providers",
				label: "Nearby care",
				status:
					hasResolvedProviders && !isBackgroundCoverageLoading
						? "done"
						: isBackgroundCoverageLoading || !coverageModePreferenceLoaded
							? "active"
							: "pending",
			},
			{
				key: "map",
				label: "Map + route",
				status:
					mapReadiness.mapReady && !isBackgroundRouteLoading
						? "done"
						: mapReadiness.mapReady ||
							  mapReadiness.isCalculatingRoute ||
							  mapReadiness.routeReady
							? "active"
							: "pending",
			},
		],
	};
}

export default {
	buildMapLoadingState,
};

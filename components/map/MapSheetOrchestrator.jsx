import React, { useMemo } from "react";
import MapExploreIntentOrchestrator from "./views/exploreIntent/MapExploreIntentOrchestrator";
import {
	MAP_SHEET_MODES,
	MAP_SHEET_SNAP_STATES,
	getMapSheetHeight,
} from "./mapSheet.constants";

export { MAP_SHEET_MODES, MAP_SHEET_SNAP_STATES, getMapSheetHeight } from "./mapSheet.constants";

export default function MapSheetOrchestrator({
	mode = MAP_SHEET_MODES.EXPLORE_INTENT,
	snapState = MAP_SHEET_SNAP_STATES.HALF,
	screenHeight,
	nearestHospital,
	nearestHospitalMeta = [],
	selectedCare = null,
	onOpenSearch,
	onOpenHospitals,
	onChooseCare,
	onOpenProfile,
	onOpenCareHistory = () => {},
	onOpenFeaturedHospital = () => {},
	onSnapStateChange = () => {},
	profileImageSource,
	isSignedIn = false,
	nearbyHospitalCount = 0,
	totalAvailableBeds = 0,
	nearbyBedHospitals = 0,
	featuredHospitals = [],
	locationDetails = null,
}) {
	const sheetHeight = useMemo(
		() => getMapSheetHeight(screenHeight, snapState),
		[screenHeight, snapState],
	);

	switch (mode) {
		case MAP_SHEET_MODES.EXPLORE_INTENT:
		default:
			return (
				<MapExploreIntentOrchestrator
					sheetHeight={sheetHeight}
					snapState={snapState}
					nearestHospital={nearestHospital}
					nearestHospitalMeta={nearestHospitalMeta}
					selectedCare={selectedCare}
					onOpenSearch={onOpenSearch}
					onOpenHospitals={onOpenHospitals}
					onChooseCare={onChooseCare}
					onOpenProfile={onOpenProfile}
					onOpenCareHistory={onOpenCareHistory}
					onOpenFeaturedHospital={onOpenFeaturedHospital}
					onSnapStateChange={onSnapStateChange}
					profileImageSource={
						profileImageSource || require("../../assets/profile.jpg")
					}
					isSignedIn={isSignedIn}
					nearbyHospitalCount={nearbyHospitalCount}
					totalAvailableBeds={totalAvailableBeds}
					nearbyBedHospitals={nearbyBedHospitals}
					featuredHospitals={featuredHospitals}
					locationDetails={locationDetails}
				/>
			);
	}
}

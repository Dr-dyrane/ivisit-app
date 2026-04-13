import React, { useMemo } from "react";
import MapHospitalDetailOrchestrator from "../views/hospitalDetail/MapHospitalDetailOrchestrator";
import MapExploreIntentOrchestrator from "../views/exploreIntent/MapExploreIntentOrchestrator";
import MapHospitalListOrchestrator from "../views/hospitalList/MapHospitalListOrchestrator";
import MapSearchOrchestrator from "../views/search/MapSearchOrchestrator";
import { MAP_SEARCH_SHEET_MODES } from "../surfaces/search/mapSearchSheet.helpers";
import {
	MAP_SHEET_MODES,
	MAP_SHEET_PHASES,
	MAP_SHEET_SNAP_STATES,
	getMapSheetHeight,
} from "./mapSheet.constants";

export {
	MAP_SHEET_MODES,
	MAP_SHEET_PHASES,
	MAP_SHEET_SNAP_STATES,
	getMapSheetHeight,
} from "./mapSheet.constants";

export default function MapSheetOrchestrator({
	mode = MAP_SHEET_MODES.EXPLORE_INTENT,
	phase = mode,
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
	onCycleHospital = undefined,
	onSnapStateChange = () => {},
	onCloseSearch = () => {},
	onCloseHospitals = () => {},
	onCloseHospitalDetail = () => {},
	searchMode = MAP_SEARCH_SHEET_MODES.SEARCH,
	hospitals = [],
	selectedHospitalId = null,
	recommendedHospitalId = null,
	featuredHospital = null,
	currentLocation = null,
	onSelectHospital = () => {},
	onUseCurrentLocation = () => {},
	onSelectLocation = () => {},
	onChangeHospitalLocation = () => {},
	activeLocation = null,
	onUseHospital = undefined,
	profileImageSource,
	isSignedIn = false,
	nearbyHospitalCount = 0,
	totalAvailableBeds = 0,
	nearbyBedHospitals = 0,
	featuredHospitals = [],
}) {
	const sheetHeight = useMemo(
		() => getMapSheetHeight(screenHeight, snapState),
		[screenHeight, snapState],
	);

	switch (phase) {
		case MAP_SHEET_PHASES.SEARCH:
			return (
				<MapSearchOrchestrator
					sheetHeight={sheetHeight}
					snapState={snapState}
					mode={searchMode}
					hospitals={hospitals}
					selectedHospitalId={selectedHospitalId}
					currentLocation={currentLocation}
					onClose={onCloseSearch}
					onOpenHospital={onOpenFeaturedHospital}
					onBrowseHospitals={onOpenHospitals}
					onUseCurrentLocation={onUseCurrentLocation}
					onSelectLocation={onSelectLocation}
					onOpenProfile={onOpenProfile}
					onSnapStateChange={onSnapStateChange}
					profileImageSource={
						profileImageSource || require("../../../assets/profile.jpg")
					}
					isSignedIn={isSignedIn}
				/>
			);
		case MAP_SHEET_PHASES.HOSPITAL_LIST:
			return (
				<MapHospitalListOrchestrator
					sheetHeight={sheetHeight}
					snapState={snapState}
					hospitals={hospitals}
					selectedHospitalId={selectedHospitalId}
					recommendedHospitalId={recommendedHospitalId}
					onClose={onCloseHospitals}
					onSelectHospital={onSelectHospital}
					onChangeLocation={onChangeHospitalLocation}
					onSnapStateChange={onSnapStateChange}
				/>
			);
		case MAP_SHEET_PHASES.HOSPITAL_DETAIL:
			return (
				<MapHospitalDetailOrchestrator
					sheetHeight={sheetHeight}
					snapState={snapState}
					hospital={featuredHospital}
					origin={activeLocation}
					onClose={onCloseHospitalDetail}
					onOpenHospitals={onOpenHospitals}
					onUseHospital={onUseHospital}
					onCycleHospital={onCycleHospital}
					onSnapStateChange={onSnapStateChange}
				/>
			);
		case MAP_SHEET_PHASES.EXPLORE_INTENT:
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
						profileImageSource || require("../../../assets/profile.jpg")
					}
					isSignedIn={isSignedIn}
					nearbyHospitalCount={nearbyHospitalCount}
					totalAvailableBeds={totalAvailableBeds}
					nearbyBedHospitals={nearbyBedHospitals}
					featuredHospitals={featuredHospitals}
				/>
			);
	}
}

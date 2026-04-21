import React, { useMemo } from "react";
import MapAmbulanceDecisionOrchestrator from "../views/ambulanceDecision/MapAmbulanceDecisionOrchestrator";
import MapBedDecisionOrchestrator from "../views/bedDecision/MapBedDecisionOrchestrator";
import MapCommitDetailsOrchestrator from "../views/commitDetails/MapCommitDetailsOrchestrator";
import MapCommitTriageOrchestrator from "../views/commitTriage/MapCommitTriageOrchestrator";
import MapCommitPaymentOrchestrator from "../views/commitPayment/MapCommitPaymentOrchestrator";
import MapTrackingOrchestrator from "../views/tracking/MapTrackingOrchestrator";
import MapHospitalDetailOrchestrator from "../views/hospitalDetail/MapHospitalDetailOrchestrator";
import MapExploreIntentOrchestrator from "../views/exploreIntent/MapExploreIntentOrchestrator";
import MapHospitalListOrchestrator from "../views/hospitalList/MapHospitalListOrchestrator";
import MapSearchOrchestrator from "../views/search/MapSearchOrchestrator";
import MapServiceDetailOrchestrator from "../views/serviceDetail/MapServiceDetailOrchestrator";
import MapPhaseTransitionView from "../views/shared/MapPhaseTransitionView";
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
	onOpenAmbulanceHospitals = () => {},
	onOpenBedHospitals = () => {},
	onOpenFeaturedHospital = () => {},
	onCycleHospital = undefined,
	onSnapStateChange = () => {},
	onCloseSearch = () => {},
	onCloseHospitals = () => {},
	onCloseAmbulanceDecision = () => {},
	onCloseBedDecision = () => {},
	onCloseCommitDetails = () => {},
	onCloseCommitTriage = () => {},
	onCloseCommitPayment = () => {},
	onCloseTracking = () => {},
	onOpenCommitTriageFromTracking = () => {},
	onAddBedFromTracking = () => {},
	onCloseHospitalDetail = () => {},
	onConfirmAmbulanceDecision = () => {},
	onConfirmBedDecision = () => {},
	onConfirmCommitDetails = () => {},
	onConfirmCommitTriage = () => {},
	onConfirmCommitPayment = () => {},
	onOpenHospitalDetailFromPayment = () => {},
	onOpenTransportDetailFromPayment = () => {},
	onCenterMapOnUserFromPayment = () => {},
	onOpenServiceDetail = () => {},
	onCloseServiceDetail = () => {},
	onConfirmServiceDetail = () => {},
	onChangeServiceDetail = () => {},
	onSelectHospitalService = () => {},
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
	sheetPayload = null,
	trackingRouteInfo = null,
	trackingHeaderActionRequest = null,
	onConsumeTrackingHeaderActionRequest = () => {},
	serviceSelectionsByHospital = {},
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
		case MAP_SHEET_PHASES.AMBULANCE_DECISION: {
			const decisionHospital = featuredHospital || nearestHospital || null;
			const decisionHospitalId = decisionHospital?.id || "unknown";
			const careIntent = selectedCare === "both" ? "both" : "ambulance";
			const decisionOrigin =
				currentLocation || activeLocation
					? {
							...(activeLocation || {}),
							...(currentLocation || {}),
							...(currentLocation?.location || {}),
							formattedAddress:
								currentLocation?.formattedAddress ||
								[currentLocation?.primaryText, currentLocation?.secondaryText]
									.filter(Boolean)
									.join(", ") ||
								activeLocation?.formattedAddress ||
								null,
						}
					: null;
			return (
				<MapPhaseTransitionView phaseKey={`${phase}-${decisionHospitalId}`}>
					<MapAmbulanceDecisionOrchestrator
						sheetHeight={sheetHeight}
						snapState={snapState}
						hospital={decisionHospital}
						origin={decisionOrigin}
						careIntent={careIntent}
						hospitalCount={Array.isArray(hospitals) ? hospitals.length : 0}
						selectedServiceId={
							serviceSelectionsByHospital[decisionHospitalId]?.ambulanceServiceId ?? null
						}
						onClose={onCloseAmbulanceDecision}
						onConfirm={onConfirmAmbulanceDecision}
						onOpenHospitals={onOpenAmbulanceHospitals}
						onOpenServiceDetail={onOpenServiceDetail}
						onSelectService={onSelectHospitalService}
						onSnapStateChange={onSnapStateChange}
					/>
				</MapPhaseTransitionView>
			);
		}
		case MAP_SHEET_PHASES.BED_DECISION: {
			const decisionHospital = featuredHospital || nearestHospital || null;
			const decisionHospitalId = decisionHospital?.id || "unknown";
			const careIntent =
				sheetPayload?.careIntent === "both" ? "both" : "bed";
			const savedTransport =
				careIntent === "both" && sheetPayload?.savedTransport
					? sheetPayload.savedTransport
					: null;
			const decisionOrigin =
				currentLocation || activeLocation
					? {
							...(activeLocation || {}),
							...(currentLocation || {}),
							...(currentLocation?.location || {}),
							formattedAddress:
								currentLocation?.formattedAddress ||
								[currentLocation?.primaryText, currentLocation?.secondaryText]
									.filter(Boolean)
									.join(", ") ||
								activeLocation?.formattedAddress ||
								null,
						}
					: null;
			return (
				<MapPhaseTransitionView phaseKey={`${phase}-${decisionHospitalId}`}>
					<MapBedDecisionOrchestrator
						sheetHeight={sheetHeight}
						snapState={snapState}
						hospital={decisionHospital}
						origin={decisionOrigin}
						careIntent={careIntent}
						savedTransport={savedTransport}
						hospitalCount={Array.isArray(hospitals) ? hospitals.length : 0}
						selectedRoomServiceId={
							serviceSelectionsByHospital[decisionHospitalId]?.roomServiceId ?? null
						}
						onClose={onCloseBedDecision}
						onConfirm={onConfirmBedDecision}
						onOpenHospitals={onOpenBedHospitals}
						onOpenServiceDetail={onOpenServiceDetail}
						onSelectService={onSelectHospitalService}
						onSnapStateChange={onSnapStateChange}
					/>
				</MapPhaseTransitionView>
			);
		}
		case MAP_SHEET_PHASES.COMMIT_DETAILS: {
			const commitHospital = sheetPayload?.hospital || featuredHospital || nearestHospital || null;
			const commitSheetHeight = getMapSheetHeight(
				screenHeight,
				MAP_SHEET_SNAP_STATES.EXPANDED,
			);
			const commitOrigin =
				currentLocation || activeLocation
					? {
							...(activeLocation || {}),
							...(currentLocation || {}),
							...(currentLocation?.location || {}),
							formattedAddress:
								currentLocation?.formattedAddress ||
								[currentLocation?.primaryText, currentLocation?.secondaryText]
									.filter(Boolean)
									.join(", ") ||
								activeLocation?.formattedAddress ||
								null,
						}
					: null;
			return (
				<MapPhaseTransitionView phaseKey={`${phase}-${commitHospital?.id || "unknown"}`}>
					<MapCommitDetailsOrchestrator
						sheetHeight={commitSheetHeight}
						snapState={snapState}
						hospital={commitHospital}
						transport={sheetPayload?.transport || null}
						payload={sheetPayload}
						currentLocation={commitOrigin}
						onBack={onCloseCommitDetails}
						onClose={onCloseCommitDetails}
						onConfirm={onConfirmCommitDetails}
						onSnapStateChange={onSnapStateChange}
					/>
				</MapPhaseTransitionView>
			);
		}
		case MAP_SHEET_PHASES.COMMIT_TRIAGE: {
			const commitHospital = sheetPayload?.hospital || featuredHospital || nearestHospital || null;
			const commitSheetHeight = getMapSheetHeight(
				screenHeight,
				MAP_SHEET_SNAP_STATES.EXPANDED,
			);
			return (
				<MapPhaseTransitionView phaseKey={`${phase}-${commitHospital?.id || "unknown"}`}>
					<MapCommitTriageOrchestrator
						sheetHeight={commitSheetHeight}
						snapState={snapState}
						hospital={commitHospital}
						transport={sheetPayload?.transport || null}
						payload={sheetPayload}
						onBack={onCloseCommitTriage}
						onClose={onCloseCommitTriage}
						onConfirm={onConfirmCommitTriage}
						onSnapStateChange={onSnapStateChange}
					/>
				</MapPhaseTransitionView>
			);
		}
		case MAP_SHEET_PHASES.COMMIT_PAYMENT: {
			const commitHospital = sheetPayload?.hospital || featuredHospital || nearestHospital || null;
			const commitSheetHeight = getMapSheetHeight(screenHeight, snapState);
			const commitOrigin =
				currentLocation || activeLocation
					? {
							...(activeLocation || {}),
							...(currentLocation || {}),
							...(currentLocation?.location || {}),
							formattedAddress:
								currentLocation?.formattedAddress ||
								[currentLocation?.primaryText, currentLocation?.secondaryText]
									.filter(Boolean)
									.join(", ") ||
								activeLocation?.formattedAddress ||
								null,
						}
					: null;
			return (
				<MapPhaseTransitionView phaseKey={`${phase}-${commitHospital?.id || "unknown"}`}>
					<MapCommitPaymentOrchestrator
						sheetHeight={commitSheetHeight}
						snapState={snapState}
						hospital={commitHospital}
						transport={sheetPayload?.transport || null}
						payload={sheetPayload}
						currentLocation={commitOrigin}
						onBack={onCloseCommitPayment}
						onClose={onCloseCommitPayment}
						onConfirm={onConfirmCommitPayment}
						onSnapStateChange={onSnapStateChange}
						onOpenHospitalDetailFromPayment={onOpenHospitalDetailFromPayment}
						onOpenTransportDetailFromPayment={onOpenTransportDetailFromPayment}
						onCenterMapOnUserFromPayment={onCenterMapOnUserFromPayment}
					/>
				</MapPhaseTransitionView>
			);
		}
		case MAP_SHEET_PHASES.TRACKING: {
			const trackingHospital = sheetPayload?.hospital || featuredHospital || nearestHospital || null;
			const trackingSheetHeight = getMapSheetHeight(screenHeight, snapState);
			return (
				<MapPhaseTransitionView phaseKey={`${phase}-${trackingHospital?.id || "unknown"}`}>
					<MapTrackingOrchestrator
						sheetHeight={trackingSheetHeight}
						snapState={snapState}
						hospital={trackingHospital}
						payload={sheetPayload}
						currentLocation={currentLocation}
						routeInfo={trackingRouteInfo}
						headerActionRequest={trackingHeaderActionRequest}
						onConsumeHeaderActionRequest={onConsumeTrackingHeaderActionRequest}
						onOpenCommitTriageFromTracking={onOpenCommitTriageFromTracking}
						onAddBedFromTracking={onAddBedFromTracking}
						onClose={onCloseTracking}
						onSnapStateChange={onSnapStateChange}
					/>
				</MapPhaseTransitionView>
			);
		}
		case MAP_SHEET_PHASES.SEARCH:
			return (
				<MapPhaseTransitionView phaseKey={phase}>
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
				</MapPhaseTransitionView>
			);
		case MAP_SHEET_PHASES.HOSPITAL_LIST:
			return (
				<MapPhaseTransitionView phaseKey={phase}>
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
				</MapPhaseTransitionView>
			);
		case MAP_SHEET_PHASES.HOSPITAL_DETAIL:
			return (
				<MapPhaseTransitionView phaseKey={`${phase}-${featuredHospital?.id || "unknown"}`}>
					<MapHospitalDetailOrchestrator
						sheetHeight={sheetHeight}
						snapState={snapState}
						hospital={featuredHospital}
						origin={activeLocation}
						onClose={onCloseHospitalDetail}
						onOpenHospitals={onOpenHospitals}
						onUseHospital={onUseHospital}
						onCycleHospital={onCycleHospital}
						onOpenServiceDetail={onOpenServiceDetail}
						onSelectService={onSelectHospitalService}
						serviceSelections={serviceSelectionsByHospital[featuredHospital?.id || "unknown"] || null}
						onSnapStateChange={onSnapStateChange}
					/>
				</MapPhaseTransitionView>
			);
		case MAP_SHEET_PHASES.SERVICE_DETAIL:
			return (
				<MapPhaseTransitionView phaseKey={`${phase}-${sheetPayload?.service?.id || "unknown"}`}>
					<MapServiceDetailOrchestrator
						sheetHeight={sheetHeight}
						snapState={snapState}
						payload={sheetPayload}
						selectedServiceId={
							sheetPayload?.serviceType === "room"
								? serviceSelectionsByHospital[sheetPayload?.hospital?.id || "unknown"]?.roomServiceId ?? null
								: serviceSelectionsByHospital[sheetPayload?.hospital?.id || "unknown"]?.ambulanceServiceId ?? null
						}
						onClose={onCloseServiceDetail}
						onConfirm={onConfirmServiceDetail}
						onChangeService={onChangeServiceDetail}
						onSnapStateChange={onSnapStateChange}
					/>
				</MapPhaseTransitionView>
			);
		case MAP_SHEET_PHASES.EXPLORE_INTENT:
		default:
			return (
				<MapPhaseTransitionView phaseKey={phase}>
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
				</MapPhaseTransitionView>
			);
	}
}

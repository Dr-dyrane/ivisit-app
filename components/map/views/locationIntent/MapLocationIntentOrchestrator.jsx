import React from "react";
import { SearchBoundary } from "../../../../contexts/SearchContext";
import MapLocationIntentStageBase from "./MapLocationIntentStageBase";

export default function MapLocationIntentOrchestrator({
	sheetHeight,
	snapState,
	onClose,
	onOpenSearch,
	onOpenProfile,
	onUseCurrentLocation,
	onSelectLocation,
	onFindNearbyHospitals,
	onSnapStateChange,
	currentLocation,
	locationControl,
	sheetPayload,
}) {
	return (
		<SearchBoundary>
			<MapLocationIntentStageBase
				sheetHeight={sheetHeight}
				snapState={snapState}
				onClose={onClose}
				onOpenSearch={onOpenSearch}
				onOpenProfile={onOpenProfile}
				onUseCurrentLocation={onUseCurrentLocation}
				onSelectLocation={onSelectLocation}
				onFindNearbyHospitals={onFindNearbyHospitals}
				onSnapStateChange={onSnapStateChange}
				currentLocation={currentLocation}
				locationControl={locationControl}
				sheetPayload={sheetPayload}
			/>
		</SearchBoundary>
	);
}

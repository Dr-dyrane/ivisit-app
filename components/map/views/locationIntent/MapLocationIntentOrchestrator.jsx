import React from "react";
import MapLocationIntentStageBase from "./MapLocationIntentStageBase";

export default function MapLocationIntentOrchestrator({
	sheetHeight,
	snapState,
	onClose,
	onOpenSearch,
	onOpenProfile,
	onUseCurrentLocation,
	onSelectLocation,
	onSnapStateChange,
	currentLocation,
	locationControl,
	sheetPayload,
}) {
	return (
		<MapLocationIntentStageBase
			sheetHeight={sheetHeight}
			snapState={snapState}
			onClose={onClose}
			onOpenSearch={onOpenSearch}
			onOpenProfile={onOpenProfile}
			onUseCurrentLocation={onUseCurrentLocation}
			onSelectLocation={onSelectLocation}
			onSnapStateChange={onSnapStateChange}
			currentLocation={currentLocation}
			locationControl={locationControl}
			sheetPayload={sheetPayload}
		/>
	);
}

import React from "react";
import MapLocationIntentStageBase from "./MapLocationIntentStageBase";

export default function MapLocationIntentOrchestrator({
	sheetHeight,
	snapState,
	onClose,
	onOpenSearch,
	onOpenProfile,
	onUseCurrentLocation,
	onSnapStateChange,
	currentLocation,
	locationControl,
}) {
	return (
		<MapLocationIntentStageBase
			sheetHeight={sheetHeight}
			snapState={snapState}
			onClose={onClose}
			onOpenSearch={onOpenSearch}
			onOpenProfile={onOpenProfile}
			onUseCurrentLocation={onUseCurrentLocation}
			onSnapStateChange={onSnapStateChange}
			currentLocation={currentLocation}
			locationControl={locationControl}
		/>
	);
}

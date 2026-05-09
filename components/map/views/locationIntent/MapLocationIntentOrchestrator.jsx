import React from "react";
import MapLocationIntentStageBase from "./MapLocationIntentStageBase";

export default function MapLocationIntentOrchestrator({
	sheetHeight,
	snapState,
	onClose,
	onOpenSearch,
	onOpenProfile,
	currentLocation,
}) {
	return (
		<MapLocationIntentStageBase
			sheetHeight={sheetHeight}
			snapState={snapState}
			onClose={onClose}
			onOpenSearch={onOpenSearch}
			onOpenProfile={onOpenProfile}
			currentLocation={currentLocation}
		/>
	);
}

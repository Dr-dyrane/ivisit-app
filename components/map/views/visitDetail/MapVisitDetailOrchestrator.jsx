import React from "react";
import MapVisitDetailStageBase from "./MapVisitDetailStageBase";

/**
 * MapVisitDetailOrchestrator
 *
 * Thin wrapper matching the MapHospitalDetailOrchestrator pattern. Exists so
 * MapSheetOrchestrator can route `MAP_SHEET_PHASES.VISIT_DETAIL` to a single
 * entry point; future platform variants (web, sidebar) can branch here.
 */
export default function MapVisitDetailOrchestrator(props) {
	return <MapVisitDetailStageBase {...props} />;
}

import React, { memo } from "react";
import { Marker } from "./MapComponents";

const LOGO_MARKER_IMAGE = require("../../assets/map/hospital.png");
const LOGO_MARKER_IMAGE_SELECTED = require("../../assets/map/selected_hospital.png");
/*
HOSPITAL_MARKER_SIZE_CHECKPOINT={
  "baseCommit":"2afd31c793a315018aa76843190197d0bd50a7e8",
  "doc":"docs/audit/map/HOSPITAL_MARKER_SIZE_CHECKPOINT.json",
  "rollback":"git restore --source 2afd31c -- assets/map/hospital.png assets/map/selected_hospital.png components/emergency/intake/EmergencyLocationPreviewMap.jsx components/emergency/intake/EmergencyHospitalRoutePreview.jsx components/map/HospitalMarkers.jsx",
  "scope":"alternate hospital marker owner",
  "native":{"normal":"54x91","selected":"68x114"}
}
*/

// Design-provided image dimensions:
// hospital: 54 x 91
// selected_hospital: 68 x 114
// With anchor at center, pin bottom tip to coordinate by shifting up half height.
const MARKER_HEIGHT = {
	normal: 91,
	selected: 114,
};

const getBottomPinnedCenterOffset = (isSelected) => ({
	x: 0,
	y: -(isSelected ? MARKER_HEIGHT.selected : MARKER_HEIGHT.normal) / 6,
});

const HospitalMarkers = ({
	hospitals,
	selectedHospitalId,
	onHospitalPress,
	shouldShowHospitalLabels,
	isDarkMode,
}) => {
	if (!hospitals || hospitals.length === 0) return null;

	const displayHospitals = selectedHospitalId
		? hospitals.filter((h) => h.id === selectedHospitalId)
		: hospitals;

	return displayHospitals
		.filter(
			(h) =>
				Number.isFinite(h?.coordinates?.latitude) &&
				Number.isFinite(h?.coordinates?.longitude) &&
				h?.id
		)
		.map((hospital) => {
			const isSelected = selectedHospitalId === hospital.id;
			const centerOffset = getBottomPinnedCenterOffset(isSelected);
			const hospitalName =
				typeof hospital?.name === "string" && hospital.name.trim().length > 0
					? hospital.name.trim()
					: "Hospital";

			return (
				<Marker
					key={hospital.id}
					coordinate={hospital.coordinates}
					onPress={() => onHospitalPress(hospital)}
					anchor={{ x: 0.5, y: 0.5 }}
					centerOffset={centerOffset}
					tracksViewChanges={false}
					zIndex={isSelected ? 100 : 1}
					image={isSelected ? LOGO_MARKER_IMAGE_SELECTED : LOGO_MARKER_IMAGE}
					title={hospitalName}
				/>
			);
		});
};

export default memo(HospitalMarkers);

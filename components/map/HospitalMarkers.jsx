import React, { memo } from "react";
import { Marker } from "./MapComponents";

const LOGO_MARKER_IMAGE = require("../../assets/map/hospital.png");
const LOGO_MARKER_IMAGE_SELECTED = require("../../assets/map/selected_hospital.png");

// Design-provided image dimensions:
// hospital: 60.75 x 102.5
// selected_hospital: 81 x 137
// With anchor at center, pin bottom tip to coordinate by shifting up half height.
const MARKER_HEIGHT = {
	normal: 102.5,
	selected: 137,
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

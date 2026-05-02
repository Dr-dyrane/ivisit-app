import React, { memo, useMemo } from "react";
import { Marker } from "./MapComponents";
import useMarkerRenderPulse from "../../hooks/map/useMarkerRenderPulse";
import { normalizeCoordinate } from "../../utils/emergencyContextHelpers";

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
}) => {
  if (!hospitals || hospitals.length === 0) return null;

  const displayHospitals = selectedHospitalId
    ? hospitals.filter((h) => h.id === selectedHospitalId)
    : hospitals;

  const markerHospitals = useMemo(
    () =>
      displayHospitals
        .map((hospital) => ({
          hospital,
          coordinate: normalizeCoordinate(hospital),
        }))
        .filter(({ hospital, coordinate }) =>
          Boolean(hospital?.id && coordinate),
        ),
    [displayHospitals],
  );

  const markerRenderPulseKey = useMemo(
    () =>
      markerHospitals
        .map(({ hospital, coordinate }) =>
          [
            hospital.id,
            coordinate.latitude.toFixed(5),
            coordinate.longitude.toFixed(5),
            selectedHospitalId === hospital.id ? "selected" : "idle",
          ].join(":"),
        )
        .join("|"),
    [markerHospitals, selectedHospitalId],
  );
  const tracksMarkerViews = useMarkerRenderPulse(markerRenderPulseKey);

  return markerHospitals.map(({ hospital, coordinate }) => {
    const isSelected = selectedHospitalId === hospital.id;
    const centerOffset = getBottomPinnedCenterOffset(isSelected);
    const hospitalName =
      typeof hospital?.name === "string" && hospital.name.trim().length > 0
        ? hospital.name.trim()
        : "Hospital";

    return (
      <Marker
        key={hospital.id}
        coordinate={coordinate}
        onPress={onHospitalPress ? () => onHospitalPress(hospital) : undefined}
        anchor={{ x: 0.5, y: 0.5 }}
        centerOffset={centerOffset}
        tracksViewChanges={tracksMarkerViews}
        zIndex={isSelected ? 100 : 1}
        image={isSelected ? LOGO_MARKER_IMAGE_SELECTED : LOGO_MARKER_IMAGE}
        title={hospitalName}
      />
    );
  });
};

export default memo(HospitalMarkers);

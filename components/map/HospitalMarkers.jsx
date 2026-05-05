import React, { memo, useMemo } from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import { Marker } from "./MapComponents";
import useMarkerRenderPulse from "../../hooks/map/useMarkerRenderPulse";
import { normalizeCoordinate } from "../../utils/emergencyContextHelpers";

const LOGO_MARKER_IMAGE = require("../../assets/map/hospital.png");
const LOGO_MARKER_IMAGE_SELECTED = require("../../assets/map/selected_hospital.png");

const MARKER_SIZE = {
  normal: { width: 30, height: 50 },
  selected: { width: 38, height: 64 },
};

const isWeb = Platform.OS === "web";
const isAndroid = Platform.OS === "android";
const getMarkerStyle = (isSelected) => {
  const baseSize = isSelected ? MARKER_SIZE.selected : MARKER_SIZE.normal;
  // Android may need slightly different handling
  if (isAndroid) {
    return {
      width: baseSize.width,
      height: baseSize.height,
    };
  }
  return baseSize;
};

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
    const markerStyle = getMarkerStyle(isSelected);
    const hospitalName =
      typeof hospital?.name === "string" && hospital.name.trim().length > 0
        ? hospital.name.trim()
        : "Hospital";
    const markerImage = isSelected
      ? LOGO_MARKER_IMAGE_SELECTED
      : LOGO_MARKER_IMAGE;
    const markerProps = {
      image: markerImage,
      anchor: { x: 0.5, y: 1 },
      ...(isWeb ? { imageSize: markerStyle } : {}),
    };

    return (
      <Marker
        key={hospital.id}
        coordinate={coordinate}
        onPress={onHospitalPress ? () => onHospitalPress(hospital) : undefined}
        tracksViewChanges={tracksMarkerViews}
        zIndex={isSelected ? 100 : 1}
        title={hospitalName}
        {...markerProps}
      />
    );
  });
};

const styles = StyleSheet.create({});

export default memo(HospitalMarkers);

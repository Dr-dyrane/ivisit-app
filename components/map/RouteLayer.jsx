import React, { memo } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { Marker, Polyline } from './MapComponents';
import { COLORS } from "../../constants/colors";

const AMBULANCE_SPRITES = [
	require("../../assets/map/ambulance-sprites/ambulance_00.png"),
	require("../../assets/map/ambulance-sprites/ambulance_01.png"),
	require("../../assets/map/ambulance-sprites/ambulance_02.png"),
	require("../../assets/map/ambulance-sprites/ambulance_03.png"),
	require("../../assets/map/ambulance-sprites/ambulance_04.png"),
	require("../../assets/map/ambulance-sprites/ambulance_05.png"),
	require("../../assets/map/ambulance-sprites/ambulance_06.png"),
	require("../../assets/map/ambulance-sprites/ambulance_07.png"),
	require("../../assets/map/ambulance-sprites/ambulance_08.png"),
	require("../../assets/map/ambulance-sprites/ambulance_09.png"),
	require("../../assets/map/ambulance-sprites/ambulance_10.png"),
	require("../../assets/map/ambulance-sprites/ambulance_11.png"),
	require("../../assets/map/ambulance-sprites/ambulance_12.png"),
	require("../../assets/map/ambulance-sprites/ambulance_13.png"),
	require("../../assets/map/ambulance-sprites/ambulance_14.png"),
	require("../../assets/map/ambulance-sprites/ambulance_15.png"),
];
const HEADING_BUCKET_SIZE = 360 / AMBULANCE_SPRITES.length;

const normalizeHeading = (heading) => {
	if (!Number.isFinite(heading)) return 0;
	return ((heading % 360) + 360) % 360;
};

const AMBULANCE_MARKER_SIZE = { width: 36, height: 36 };
const isWeb = Platform.OS === 'web';

export const getAmbulanceSpriteForHeading = (heading) => {
	const normalized = normalizeHeading(heading);
	const bucket = Math.round(normalized / HEADING_BUCKET_SIZE) % AMBULANCE_SPRITES.length;
	return AMBULANCE_SPRITES[bucket];
};

const RouteLayer = ({
    routeCoordinates,
    ambulanceCoordinate,
    ambulanceHeading,
    animateAmbulance,
	telemetryHealth = null,
}) => {
    const ambulanceSprite = getAmbulanceSpriteForHeading(ambulanceHeading);
	const telemetryState = telemetryHealth?.state ?? "inactive";
	const routeStrokeColor =
		telemetryState === "lost"
			? "#B91C1C"
			: telemetryState === "stale"
				? "#B45309"
				: COLORS.brandPrimary;
	const routeDashPattern =
		telemetryState === "lost"
			? [6, 7]
			: telemetryState === "stale"
				? [10, 6]
				: undefined;
	const markerOpacity =
		telemetryState === "lost"
			? 0.62
			: telemetryState === "stale"
				? 0.85
				: 1;

    return (
        <>
            {routeCoordinates && routeCoordinates.length > 1 && (
                <Polyline
                    coordinates={routeCoordinates}
                    strokeColor={routeStrokeColor}
                    strokeWidth={telemetryState === "lost" ? 3 : 4}
					lineDashPattern={routeDashPattern}
                    lineCap="round"
                    lineJoin="round"
                />
            )}

            {ambulanceCoordinate && (
                <Marker
                    coordinate={ambulanceCoordinate}
                    anchor={{ x: 0.5, y: 0.5 }}
                    flat={true}
                    {...(isWeb
                        ? { image: ambulanceSprite, imageSize: AMBULANCE_MARKER_SIZE }
                        : { image: ambulanceSprite })}
                    // optimize for Android by only tracking changes during animation
                    tracksViewChanges={Platform.OS === "ios" || animateAmbulance}
					opacity={markerOpacity}
                    zIndex={200}
                />
            )}
        </>
    );
};

const styles = StyleSheet.create({});

export default memo(RouteLayer);

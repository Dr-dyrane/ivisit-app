import React, { memo } from 'react';
import { Platform } from 'react-native';
import { Marker, Polyline } from './MapComponents';
import { COLORS } from "../../constants/colors";

// PULLBACK NOTE: Add ambulance sprite dimension constants for platform-specific sizing
// Following hospital marker fix pattern from EmergencyLocationPreviewMap.jsx
// Hospital ratio: native ~1.9x web (54/28=1.93, 91/48=1.9). Applied to ambulance: 46*1.96≈90
// OLD: No dimension constants, no imageSize on Marker
// NEW: Added AMBULANCE_SPRITE_DIMENSIONS with web/native split using proportional sizing
const AMBULANCE_SPRITE_DIMENSIONS = {
  // Web: imageSize is respected, use design size
  web: { width: 46, height: 46 },
  // Native: PNG must be resized to ~90x90 to match hospital marker proportions
  // Current 128x128 PNGs need regeneration at 90x90 for correct native sizing
  native: { width: 90, height: 90 },
};

const getAmbulanceSpriteDimensions = () => {
  const isWeb = Platform.OS === 'web';
  return isWeb
    ? AMBULANCE_SPRITE_DIMENSIONS.web
    : AMBULANCE_SPRITE_DIMENSIONS.native;
};

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

export const getAmbulanceSpriteForHeading = (heading) => {
	const normalized = normalizeHeading(heading);

	// ambulance_00.png points North.
	// Map bearing 0° also means North.
	// Therefore no 180° flip is needed.
	const bucket =
		Math.round(normalized / HEADING_BUCKET_SIZE) %
		AMBULANCE_SPRITES.length;

	if (__DEV__) {
		console.log("[SPRITE]", {
			heading,
			normalized,
			bucket,
			sprite: `ambulance_${String(bucket).padStart(2, "0")}`,
		});
	}

	return AMBULANCE_SPRITES[bucket];
};

const RouteLayer = ({
    routeCoordinates,
    ambulanceCoordinate,
    ambulanceHeading,
    animateAmbulance
}) => {
    const ambulanceSprite = getAmbulanceSpriteForHeading(ambulanceHeading);

    return (
        <>
            {routeCoordinates && routeCoordinates.length > 1 && (
                <Polyline
                    coordinates={routeCoordinates}
                    strokeColor={COLORS.brandPrimary}
                    strokeWidth={4}
                    lineCap="round"
                    lineJoin="round"
                />
            )}

            {ambulanceCoordinate && (
                <Marker
                    coordinate={ambulanceCoordinate}
                    anchor={{ x: 0.5, y: 0.5 }}
                    flat={true}
                    image={ambulanceSprite}
                    // PULLBACK NOTE: Add platform-specific imageSize following hospital marker fix
                    // OLD: No imageSize prop - native rendered at PNG bitmap size (128x128) incorrectly
                    // NEW: Explicit imageSize - web 46x46, native 90x90 (matches hospital 1.96x ratio)
                    // TODO: Regenerate ambulance PNGs from 128x128 to 90x90 for native builds
                    imageSize={getAmbulanceSpriteDimensions()}
                    // optimize for Android by only tracking changes during animation
                    tracksViewChanges={Platform.OS === "ios" || animateAmbulance}
                    zIndex={200}
                />
            )}
        </>
    );
};

export default memo(RouteLayer);

import React, { memo, useMemo } from "react";
import { Platform } from "react-native";
import { Marker, Polyline } from "./MapComponents";
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

const getAmbulanceSpriteDimensions = () =>
	Platform.OS === "web"
		? AMBULANCE_SPRITE_DIMENSIONS.web
		: AMBULANCE_SPRITE_DIMENSIONS.native;

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

export const getAmbulanceSpriteBucketForHeading = (heading) => {
	const normalized = normalizeHeading(heading);
	return (
		Math.round(normalized / HEADING_BUCKET_SIZE) %
		AMBULANCE_SPRITES.length
	);
};

export const getAmbulanceSpriteForHeading = (heading) => {
	const bucket = getAmbulanceSpriteBucketForHeading(heading);
	return AMBULANCE_SPRITES[bucket];
};

const RouteLayer = ({
	routeCoordinates,
	ambulanceCoordinate,
	ambulanceHeading,
	animateAmbulance,
}) => {
	const ambulanceSpriteBucket = useMemo(
		() => getAmbulanceSpriteBucketForHeading(ambulanceHeading),
		[ambulanceHeading],
	);

	const ambulanceSprite = AMBULANCE_SPRITES[ambulanceSpriteBucket];

	if (__DEV__) {
		console.log("[ROUTE-LAYER-SPRITE]", {
			ambulanceHeading,
			ambulanceSpriteBucket,
			sprite: `ambulance_${String(ambulanceSpriteBucket).padStart(2, "0")}`,
			ambulanceCoordinate,
		});
	}

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
					key={`ambulance-${ambulanceSpriteBucket}`}
					coordinate={ambulanceCoordinate}
					anchor={{ x: 0.5, y: 0.5 }}
					flat
					image={ambulanceSprite}
					imageSize={getAmbulanceSpriteDimensions()}
					tracksViewChanges
					zIndex={200}
				/>
			)}
        </>
    );
};

export default memo(RouteLayer);

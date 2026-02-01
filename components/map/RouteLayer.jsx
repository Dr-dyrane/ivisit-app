import React, { memo } from 'react';
import { View, Platform } from 'react-native';
import { Marker, Polyline } from './MapComponents';
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";

const RouteLayer = ({
    routeCoordinates,
    ambulanceCoordinate,
    ambulanceHeading,
    animateAmbulance
}) => {
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
                    rotation={ambulanceHeading}
                    // optimize for Android by only tracking changes during animation
                    tracksViewChanges={Platform.OS === "ios" || animateAmbulance}
                    zIndex={200}
                >
                    <View
                        style={{
                            width: 44,
                            height: 44,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <View
                            style={{
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.3,
                                shadowRadius: 3,
                                zIndex: 2,
                            }}
                        >
                            <Ionicons
                                name="navigate-circle"
                                size={42}
                                color={COLORS.brandPrimary}
                            />
                        </View>
                        <View
                            style={{
                                position: "absolute",
                                width: 22,
                                height: 22,
                                borderRadius: 11,
                                backgroundColor: "#FFFFFF",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 1,
                            }}
                        />
                    </View>
                </Marker>
            )}
        </>
    );
};

export default memo(RouteLayer);

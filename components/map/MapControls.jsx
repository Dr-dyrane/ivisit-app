import React, { memo } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from "@expo/vector-icons";
import { getMapRenderTokens } from "./mapRenderTokens";

const MapControls = ({
    onRecenter,
    onExpand,
    isZoomedOut,
    isDarkMode,
    topOffset,
    bottomOffset,
    rightOffset = 14,
    secondaryIconName = "expand",
}) => {
    const positionStyle =
        typeof bottomOffset === "number"
            ? { bottom: bottomOffset, right: rightOffset }
            : { top: topOffset, right: rightOffset };
    const renderTokens = getMapRenderTokens({ isDarkMode });

    return (
        <View style={[styles.controlsContainer, positionStyle]}>
            <View style={[
                styles.controlsPill,
                {
                    shadowColor: renderTokens.controlShadow,
                    borderColor: renderTokens.controlBorder,
                }
            ]}>
                {Platform.OS === "ios" ? (
                    <BlurView
                        intensity={isDarkMode ? 40 : 60}
                        tint={isDarkMode ? "dark" : "light"}
                        style={StyleSheet.absoluteFill}
                    />
                ) : (
                    <View
                        style={[
                            StyleSheet.absoluteFill,
                            styles.androidSurface,
                            {
                                backgroundColor: renderTokens.controlSurface,
                            }
                        ]}
                    />
                )}

                <Pressable
                    onPress={onRecenter}
                    style={({ pressed }) => [
                        styles.controlButton,
                        { transform: [{ scale: pressed ? 0.95 : 1 }] }
                    ]}
                >
                    <Ionicons
                        name="locate"
                        size={20}
                        color={isDarkMode ? "#FFFFFF" : "#0F172A"}
                    />
                </Pressable>

                <Pressable
                    onPress={onExpand}
                    style={({ pressed }) => [
                        styles.controlButton,
                        {
                            transform: [{ scale: pressed ? 0.95 : 1 }],
                            opacity: isZoomedOut ? 1 : 0.8
                        }
                    ]}
                >
                    <Ionicons
                        name={secondaryIconName}
                        size={18}
                        color={isDarkMode ? "#FFFFFF" : "#0F172A"}
                    />
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    controlsContainer: {
        position: "absolute",
        zIndex: 10,
    },
    controlsPill: {
        width: 46,
        paddingVertical: 3,
        paddingHorizontal: 3,
        borderRadius: 23,
        overflow: "hidden",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 3,
        borderWidth: StyleSheet.hairlineWidth,
    },
    androidSurface: {
        borderRadius: 23,
    },
    controlButton: {
        width: 40,
        height: 40,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
    },
});

export default memo(MapControls);

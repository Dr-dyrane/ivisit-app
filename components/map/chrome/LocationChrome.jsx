import React, { memo } from 'react';
import { View, Pressable, StyleSheet, Platform, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from "@expo/vector-icons";
import { getMapRenderTokens } from "../tokens/mapRenderTokens";
import { triggerPress } from "../../../services/hapticService";

const squircle = (radius) => ({
    borderRadius: radius,
    borderCurve: "continuous",
});

// PULLBACK NOTE: Create LocationChrome in chrome folder following MapControls pattern
// OLD: Custom LocationChrome in exploreIntent folder
// NEW: Floating chrome component in chrome folder, positioned left opposite MapControls
// UPDATED: Icon-only (text removed for less distraction)

/**
 * LocationChrome - Floating chrome for location change affordance
 * 
 * Shows location icon, tap to open location sheet
 * Positioned on left side of map, opposite to MapControls (right side)
 * Icon-only design for minimal distraction
 * 
 * @param {Function} onPress - Callback when chrome is tapped
 * @param {boolean} isDarkMode - Dark mode flag
 * @param {number} topOffset - Top offset for positioning
 * @param {number} bottomOffset - Bottom offset for positioning (alternative to top)
 * @param {number} leftOffset - Left offset for positioning (default: 14)
 */
const LocationChrome = ({
    onPress,
    isDarkMode,
    topOffset,
    bottomOffset,
    leftOffset = 14,
}) => {
    const positionStyle =
        typeof bottomOffset === "number"
            ? { bottom: bottomOffset, left: leftOffset }
            : { top: topOffset, left: leftOffset };
    const renderTokens = getMapRenderTokens({ isDarkMode });

    return (
        <View style={[styles.chromeContainer, positionStyle]}>
            <View style={[
                styles.chromePill,
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
                    onPress={onPress}
                    onPressIn={() => triggerPress("light")}
                    style={({ pressed }) => [
                        styles.chromeButton,
                        { transform: [{ scale: pressed ? 0.95 : 1 }] }
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons
                        name="binoculars-sharp"
                        size={24}
                        color={isDarkMode ? "#FFFFFF" : "#0F172A"}
                    />
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    chromeContainer: {
        position: "absolute",
        zIndex: 10,
    },
    chromePill: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 3,
    },
    androidSurface: {
        borderRadius: 20,
    },
    chromeButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        ...squircle(16),
    },
});

export default memo(LocationChrome);

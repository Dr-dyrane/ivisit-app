import React, { memo } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";

const MapControls = ({
    onRecenter,
    onExpand,
    isZoomedOut,
    isDarkMode,
    topOffset,
    bottomOffset,
    secondaryIconName = "expand",
}) => {
    const positionStyle =
        typeof bottomOffset === "number"
            ? { bottom: bottomOffset }
            : { top: topOffset };

    return (
        <View style={[styles.controlsContainer, positionStyle]}>
            <Pressable
                onPress={onRecenter}
                style={({ pressed }) => [
                    styles.controlButton,
                    { transform: [{ scale: pressed ? 0.95 : 1 }] }
                ]}
            >
                {Platform.OS === "ios" ? (
                    <BlurView
                        intensity={isDarkMode ? 40 : 60}
                        tint={isDarkMode ? "dark" : "light"}
                        style={StyleSheet.absoluteFill}
                    />
                ) : (
                    // Android fallback: solid surface to avoid blur-smudge artifacts
                    <View
                        style={[
                            StyleSheet.absoluteFill,
                            {
                                backgroundColor: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLight,
                            }
                        ]}
                    />
                )}
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
                {Platform.OS === "ios" ? (
                    <BlurView
                        intensity={isDarkMode ? 40 : 60}
                        tint={isDarkMode ? "dark" : "light"}
                        style={StyleSheet.absoluteFill}
                    />
                ) : (
                    // Android fallback: solid surface to avoid blur-smudge artifacts
                    <View
                        style={[
                            StyleSheet.absoluteFill,
                            {
                                backgroundColor: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLight,
                            }
                        ]}
                    />
                )}
                <Ionicons
                    name={secondaryIconName}
                    size={18}
                    color={isDarkMode ? "#FFFFFF" : "#0F172A"}
                />
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    controlsContainer: {
        position: "absolute",
        right: 16,
        zIndex: 10,
        gap: 10,
    },
    controlButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
});

export default memo(MapControls);

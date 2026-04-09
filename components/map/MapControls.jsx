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
            <View style={styles.controlsPill}>
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
                                backgroundColor: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLight,
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
        right: 14,
        zIndex: 10,
    },
    controlsPill: {
        width: 52,
        paddingVertical: 2,
        borderRadius: 22,
        overflow: "hidden",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
    androidSurface: {
        borderRadius: 22,
    },
    controlButton: {
        width: 42,
        height: 42,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
    },
});

export default memo(MapControls);

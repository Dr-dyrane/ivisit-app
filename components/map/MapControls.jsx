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
    topOffset
}) => {
    return (
        <View style={[styles.controlsContainer, { top: topOffset }]}>
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
                    // Android fallback: semi-transparent background
                    <View
                        style={[
                            StyleSheet.absoluteFill,
                            {
                                backgroundColor: isDarkMode 
                                    ? 'rgba(0,0,0,0.4)'  // Dark semi-transparent
                                    : 'rgba(255,255,255,0.8)'  // Light semi-transparent
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
                    // Android fallback: semi-transparent background
                    <View
                        style={[
                            StyleSheet.absoluteFill,
                            {
                                backgroundColor: isDarkMode 
                                    ? 'rgba(0,0,0,0.4)'  // Dark semi-transparent
                                    : 'rgba(255,255,255,0.8)'  // Light semi-transparent
                            }
                        ]}
                    />
                )}
                <Ionicons
                    name="expand"
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
        width: 44,
        height: 44,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
});

export default memo(MapControls);

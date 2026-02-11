// components/emergency/MapStatusBar.jsx
import React from "react";
import { View, Platform, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";

export default function MapStatusBar({ isDarkMode, insets }) {
    if (Platform.OS === "ios") {
        return (
            <BlurView
                intensity={isDarkMode ? 60 : 40}
                tint={isDarkMode ? "dark" : "light"}
                style={[styles.statusBarBlur, { height: insets.top, opacity: 0.5 }]}
            />
        );
    }

    return (
        <View
            style={[
                styles.statusBarBlur,
                {
                    height: insets.top,
                    opacity: 0.5,
                    backgroundColor: isDarkMode
                        ? 'rgba(0,0,0,0.6)'
                        : 'rgba(255,255,255,0.6)'
                }
            ]}
        />
    );
}

const styles = StyleSheet.create({
    statusBarBlur: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
    },
});

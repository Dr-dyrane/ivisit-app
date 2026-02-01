import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "../../contexts/ThemeContext";

/**
 * GlassCard - Apple-style frosted glass card component
 * 
 * Features:
 * - Frosted glass blur effect
 * - Theme-sensitive styling
 * - Subtle border glow
 * - Premium bubble effect
 */
export default function GlassCard({
  children,
  style,
  intensity = "medium", // "light", "medium", "strong"
  selected = false,
  selectedColor = "#86100E",
  padding = 16,
  borderRadius = 36, // Primary Artifact Layer
}) {
  const { isDarkMode } = useTheme();

  // Blur intensity based on prop
  const blurIntensity = {
    light: Platform.OS === "ios" ? 20 : 40,
    medium: Platform.OS === "ios" ? 40 : 60,
    strong: Platform.OS === "ios" ? 70 : 90,
  }[intensity];

  // Background colors for the overlay - Manifesto opacity (95% to 98%)
  const overlayColor = isDarkMode
    ? selected
      ? `${selectedColor}25`
      : "rgba(18, 24, 38, 0.96)"
    : selected
      ? `${selectedColor}15`
      : "rgba(255, 255, 255, 0.98)";

  // Shadow for active glow effect
  const shadowStyle = Platform.select({
    ios: {
      shadowColor: selected ? selectedColor : "#000",
      shadowOffset: { width: 0, height: selected ? 12 : 6 },
      shadowOpacity: selected ? 0.4 : isDarkMode ? 0.4 : 0.08,
      shadowRadius: selected ? 24 : 16,
    },
    android: {
      elevation: selected ? 12 : 4,
    },
  });

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius,
          ...shadowStyle,
        },
        style,
      ]}
    >
      {Platform.OS === "ios" ? (
        <BlurView
          intensity={blurIntensity}
          tint={isDarkMode ? "dark" : "light"}
          style={[styles.blur, { borderRadius }]}
        >
          <View
            style={[
              styles.overlay,
              {
                backgroundColor: overlayColor,
                padding,
                borderRadius,
              },
            ]}
          >
            {children}
          </View>
        </BlurView>
      ) : (
        // Android fallback: semi-transparent background with elevated opacity
        <View
          style={[
            styles.blur,
            {
              borderRadius,
              backgroundColor: isDarkMode 
                ? selected
                  ? `${selectedColor}35`  // Dark selected with more opacity
                  : "rgba(18, 24, 38, 0.98)"  // Dark background
                : selected
                  ? `${selectedColor}25`  // Light selected with more opacity
                  : "rgba(255, 255, 255, 0.98)",  // Light background
            }
          ]}
        >
          <View
            style={[
              styles.overlay,
              {
                backgroundColor: overlayColor,
                padding,
                borderRadius,
              },
            ]}
          >
            {children}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  blur: {
    overflow: "hidden",
  },
  overlay: {
    // Inner content container
  },
});


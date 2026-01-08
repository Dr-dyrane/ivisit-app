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
  borderRadius = 20,
}) {
  const { isDarkMode } = useTheme();

  // Blur intensity based on prop
  const blurIntensity = {
    light: Platform.OS === "ios" ? 30 : 50,
    medium: Platform.OS === "ios" ? 50 : 70,
    strong: Platform.OS === "ios" ? 80 : 100,
  }[intensity];

  // Background colors for the overlay
  const overlayColor = isDarkMode
    ? selected
      ? `${selectedColor}20`
      : "rgba(255, 255, 255, 0.05)"
    : selected
      ? `${selectedColor}12`
      : "rgba(255, 255, 255, 0.6)";

  // Border colors
  const borderColor = selected
    ? `${selectedColor}60`
    : isDarkMode
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.06)";

  // Shadow for glass bubble effect
  const shadowStyle = Platform.select({
    ios: {
      shadowColor: selected ? selectedColor : "#000",
      shadowOffset: { width: 0, height: selected ? 8 : 4 },
      shadowOpacity: selected ? 0.2 : isDarkMode ? 0.3 : 0.08,
      shadowRadius: selected ? 16 : 12,
    },
    android: {
      elevation: selected ? 8 : 4,
    },
  });

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius,
          borderWidth: 1,
          borderColor,
          ...shadowStyle,
        },
        style,
      ]}
    >
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


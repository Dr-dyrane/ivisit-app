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
  const isAndroid = Platform.OS === "android";

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
      : isAndroid
        ? "#121826"
        : "rgba(18, 24, 38, 0.96)"
    : selected
      ? `${selectedColor}15`
      : isAndroid
        ? "#FFFFFF"
        : "rgba(255, 255, 255, 0.98)";
  const androidOverlayColor = isDarkMode
    ? selected
      ? "rgba(134, 16, 14, 0.24)"
      : "rgba(18, 24, 38, 0.74)"
    : selected
      ? "rgba(134, 16, 14, 0.12)"
      : "rgba(255, 255, 255, 0.80)";
  const androidShadowLayer = selected
    ? (isDarkMode ? "rgba(134, 16, 14, 0.20)" : "rgba(134, 16, 14, 0.12)")
    : (isDarkMode ? "rgba(0, 0, 0, 0.22)" : "rgba(15, 23, 42, 0.10)");

  // Shadow for active glow effect
  const shadowStyle = Platform.select({
    ios: {
      shadowColor: selected ? selectedColor : "#000",
      shadowOffset: { width: 0, height: selected ? 12 : 6 },
      shadowOpacity: selected ? 0.4 : isDarkMode ? 0.4 : 0.08,
      shadowRadius: selected ? 24 : 16,
    },
    android: { elevation: 0 },
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
      {isAndroid && (
        <View
          pointerEvents="none"
          style={[
            styles.androidShadowLayer,
            {
              top: 2,
              left: 0,
              right: 0,
              bottom: -2,
              borderRadius,
              backgroundColor: androidShadowLayer,
            },
          ]}
        />
      )}

      <View style={[styles.clip, { borderRadius }]}>
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
        // Android split-layer glass: translucent surface on aligned underlay
        <View
          style={[
            styles.blur,
            {
              borderRadius,
              backgroundColor: androidOverlayColor,
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "visible",
    position: "relative",
  },
  clip: {
    overflow: "hidden",
  },
  blur: {
    overflow: "hidden",
  },
  androidShadowLayer: {
    position: "absolute",
  },
  overlay: {
    // Inner content container
  },
});


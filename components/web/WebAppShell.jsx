import React from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { getWelcomeRootBackground } from "../../constants/welcomeTheme";

const AUTH_TABLET_MAX_WIDTH = 960;
const AUTH_DESKTOP_MAX_WIDTH = 1280;
const APP_MAX_WIDTH = 1440;

export default function WebAppShell({ children, variant = "app", surfaceMode = "surface" }) {
  const { isDarkMode } = useTheme();
  const { width } = useWindowDimensions();

  if (Platform.OS !== "web") {
    return children;
  }

  const isCompact = width < 768;
  const isDesktop = width >= 1200;
  const showSurface = surfaceMode !== "none";
  const maxWidth =
    !showSurface
      ? undefined
      : variant === "auth"
      ? isDesktop
        ? AUTH_DESKTOP_MAX_WIDTH
        : AUTH_TABLET_MAX_WIDTH
      : APP_MAX_WIDTH;
  const shellPadding = !showSurface ? 0 : isCompact ? 0 : isDesktop ? 40 : 24;
  const surfaceStyle =
    !showSurface
      ? null
      : variant === "auth" && !isCompact
      ? isDesktop
        ? styles.authDesktopSurface
        : styles.authTabletSurface
      : variant === "app" && !isCompact
        ? styles.appSurface
        : null;
  const surfaceBackground =
    !showSurface
      ? "transparent"
      : variant === "auth" && !isCompact
      ? "transparent"
      : isDarkMode
        ? "rgba(12, 18, 29, 0.88)"
        : "rgba(255, 255, 255, 0.92)";
  const viewportBackground =
    !showSurface ? getWelcomeRootBackground(isDarkMode) : isDarkMode ? "#060B16" : "#F5F7FB";

  return (
    <View
      style={[
        styles.viewport,
        { backgroundColor: viewportBackground },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          { opacity: showSurface ? (isDarkMode ? 0.28 : 0.42) : isDarkMode ? 0.18 : 0.24 },
          variant === "auth" ? styles.authGlow : styles.appGlow,
        ]}
      />
      <View
        style={[
          styles.shell,
          {
            maxWidth,
            paddingHorizontal: shellPadding,
            paddingVertical: isCompact ? 0 : showSurface ? (variant === "auth" ? (isDesktop ? 32 : 20) : 20) : 0,
          },
        ]}
      >
        <View
          style={[
            styles.surface,
            surfaceStyle,
            {
              backgroundColor: surfaceBackground,
            },
          ]}
        >
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    width: "100%",
  },
  glow: {
    position: "absolute",
    top: -140,
    left: "18%",
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "#86100E",
  },
  authGlow: {
    left: "50%",
    marginLeft: -210,
  },
  appGlow: {
    left: "10%",
  },
  shell: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
  },
  surface: {
    flex: 1,
    width: "100%",
  },
  authTabletSurface: {
    overflow: "hidden",
    borderRadius: 32,
  },
  authDesktopSurface: {
    overflow: "hidden",
    borderRadius: 36,
  },
  appSurface: {
    overflow: "hidden",
    borderRadius: 36,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
  },
});

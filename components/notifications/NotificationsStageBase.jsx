import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { STACK_TOP_PADDING } from "../../constants/layout";
import {
  getStackViewportSurfaceConfig,
  getStackViewportVariant,
  getStackViewportVariantGroup,
} from "../../utils/ui/stackViewportConfig";
import { getStackResponsiveMetrics } from "../../utils/ui/stackResponsiveMetrics";
import { computeNotificationsSidebarLayout } from "./notificationsSidebarLayout";
import { createNotificationsScreenTheme } from "./notificationsScreen.theme";

export default function NotificationsStageBase({
  isDarkMode,
  children,
  refreshControl = null,
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { handleScroll: handleTabBarScroll } = useTabBarVisibility();
  const { handleScroll: handleHeaderScroll } = useScrollAwareHeader();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const viewportVariant = useMemo(
    () => getStackViewportVariant({ platform: Platform.OS, width }),
    [width],
  );
  const surfaceConfig = useMemo(
    () => getStackViewportSurfaceConfig(viewportVariant),
    [viewportVariant],
  );
  const layout = useMemo(
    () => computeNotificationsSidebarLayout({ width, surfaceConfig }),
    [surfaceConfig, width],
  );
  const metrics = useMemo(
    () =>
      getStackResponsiveMetrics(getStackViewportVariantGroup(viewportVariant)),
    [viewportVariant],
  );
  const theme = useMemo(
    () => createNotificationsScreenTheme({ isDarkMode }),
    [isDarkMode],
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleScroll = useCallback(
    (event) => {
      handleTabBarScroll(event);
      handleHeaderScroll(event);
    },
    [handleHeaderScroll, handleTabBarScroll],
  );

  const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
  const bottomPadding = tabBarHeight + metrics.spacing.xl;

  if (layout.usesSidebarLayout) {
    return (
      <LinearGradient colors={theme.background} style={styles.sidebarOverlay}>
        <Animated.View
          style={[
            styles.sidebarLayoutRow,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {typeof children === "function"
            ? children({
                theme,
                metrics,
                surfaceConfig,
                bottomPadding,
                layout,
                viewportVariant,
              })
            : children}
        </Animated.View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <Animated.ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: STACK_TOP_PADDING,
            paddingBottom: bottomPadding,
            paddingHorizontal: surfaceConfig.contentHorizontalPadding,
            maxWidth: surfaceConfig.contentMaxWidth || undefined,
            alignSelf: "center",
            width: "100%",
            gap: metrics.spacing.lg,
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        refreshControl={refreshControl}
        renderToHardwareTextureAndroid={Platform.OS === "android"}
        needsOffscreenAlphaCompositing={Platform.OS === "android"}
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        {typeof children === "function"
          ? children({
              theme,
              metrics,
              surfaceConfig,
              bottomPadding,
              layout,
              viewportVariant,
            })
          : children}
      </Animated.ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  sidebarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
  },
  sidebarLayoutRow: {
    flex: 1,
    flexDirection: "row",
  },
});


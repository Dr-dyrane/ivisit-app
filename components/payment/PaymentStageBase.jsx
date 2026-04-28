import React, { useEffect, useCallback, useMemo } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollAwareHeader } from '../../contexts/ScrollAwareHeaderContext';
import { useTabBarVisibility } from '../../contexts/TabBarVisibilityContext';
import { STACK_TOP_PADDING } from '../../constants/layout';
import { LinearGradient } from 'expo-linear-gradient';
import { useWindowDimensions } from "react-native";
import {
  getStackViewportVariant,
  getStackViewportSurfaceConfig,
} from "../../utils/ui/stackViewportConfig";
import { createPaymentScreenTheme } from './paymentScreen.theme';
import { computePaymentSidebarLayout } from './paymentSidebarLayout';

// PULLBACK NOTE: Pass 7 — MD+ sidebar layout (mirrors map pattern exactly)
// OLD: Single-column ScrollView at all widths — columnCount: 2 in surface config was never consumed
// NEW: usesSidebarLayout = surfaceConfig.overlayLayout === "left-sidebar"
// Left panel anchored at sidebarLeft = sidebarOuterInset, width = sidebarWidth
// Right panel takes remaining flex space
// Header containerLeft = sidebarLeft + sidebarWidth (exactly where right panel begins)

export default function PaymentStageBase({ children, isDarkMode }) {
  const { handleScroll: handleTabBarScroll } = useTabBarVisibility();
  const { handleScroll: handleHeaderScroll } = useScrollAwareHeader();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Viewport config — resolve variant and surface config
  const viewportVariant = useMemo(
    () => getStackViewportVariant({ platform: Platform.OS, width }),
    [width],
  );
  const surfaceConfig = useMemo(
    () => getStackViewportSurfaceConfig(viewportVariant),
    [viewportVariant],
  );
  // PULLBACK NOTE: Pass 7 finalization — single source of truth via shared util
  const layout = useMemo(
    () => computePaymentSidebarLayout({ width, surfaceConfig }),
    [width, surfaceConfig],
  );
  const { usesSidebarLayout } = layout;

  // Motion - animations owned by StageBase
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  // Motion - initial animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  // Shell - layout constants owned by StageBase
  const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
  const bottomPadding = tabBarHeight + 20;

  // Shell - scroll handling owned by StageBase (compact only)
  const handleScroll = useCallback(
    (event) => {
      handleTabBarScroll(event);
      handleHeaderScroll(event);
    },
    [handleHeaderScroll, handleTabBarScroll]
  );

  const theme = createPaymentScreenTheme({ isDarkMode });

  // PULLBACK NOTE: Pass 7 (simplified) — sidebar-only at MD+ as full-viewport overlay
  // Sits at same hierarchy as global header (covers it). Touches viewport top/bottom/left edges.
  // position: absolute lifts it out of the (user)/_layout.js Stack-below-header hierarchy.
  if (usesSidebarLayout) {
    return (
      <LinearGradient colors={theme.background} style={styles.sidebarOverlay}>
        <Animated.View
          style={[
            styles.sidebarLayoutRow,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {typeof children === 'function'
            ? children({ layout, bottomPadding, surfaceConfig })
            : children}
        </Animated.View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <Animated.ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            gap: surfaceConfig.cardGap,
            maxWidth: surfaceConfig.contentMaxWidth,
            width: '100%',
            alignSelf: 'center',
            paddingTop: STACK_TOP_PADDING,
            paddingBottom: bottomPadding,
            paddingHorizontal: surfaceConfig.contentHorizontalPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        renderToHardwareTextureAndroid={Platform.OS === "android"}
        needsOffscreenAlphaCompositing={Platform.OS === "android"}
      >
        {typeof children === 'function'
          ? children({ layout, bottomPadding, surfaceConfig })
          : children}
      </Animated.ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    gap: 20,
  },
  // PULLBACK NOTE: Pass 7 (simplified) — full-viewport overlay covers header area
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
  },
  sidebarLayoutRow: {
    flex: 1,
    flexDirection: 'row',
  },
});

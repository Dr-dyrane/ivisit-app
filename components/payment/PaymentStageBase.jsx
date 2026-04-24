import React, { useEffect, useCallback, useMemo } from 'react';
import { Animated, Platform, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollAwareHeader } from '../../contexts/ScrollAwareHeaderContext';
import { useTabBarVisibility } from '../../contexts/TabBarVisibilityContext';
import { STACK_TOP_PADDING } from '../../constants/layout';
import { LinearGradient } from 'expo-linear-gradient';
import { useWindowDimensions } from "react-native";
import { getStackViewportVariant, getStackViewportSurfaceConfig } from "../../utils/ui/stackViewportConfig";
import { createPaymentScreenTheme } from './paymentScreen.theme';

// PULLBACK NOTE: Create PaymentStageBase following map sheets pattern
// OLD: Shell, snap, motion, slots mixed in orchestrator
// NEW: StageBase owns shell, snap, motion, slots
// REASON: Follow modular architecture pattern - StageBase owns shell/snap/motion/slots

export default function PaymentStageBase({ children, isDarkMode }) {
  const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
  const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();
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

  // Shell - scroll handling owned by StageBase
  const handleScroll = useCallback(
    (event) => {
      handleTabBarScroll(event);
      handleHeaderScroll(event);
    },
    [handleHeaderScroll, handleTabBarScroll]
  );

  // Theme
  const theme = createPaymentScreenTheme({ isDarkMode });

  // Scroll content style — centered with max-width from surface config
  const scrollContentStyle = useMemo(
    () => ({
      gap: surfaceConfig.cardGap,
      maxWidth: surfaceConfig.contentMaxWidth,
      width: '100%',
      alignSelf: 'center',
    }),
    [surfaceConfig.contentMaxWidth, surfaceConfig.cardGap],
  );

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <Animated.ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          scrollContentStyle,
          {
            paddingTop: STACK_TOP_PADDING,
            paddingBottom: bottomPadding,
            paddingHorizontal: surfaceConfig.contentHorizontalPadding,
          }
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        renderToHardwareTextureAndroid={Platform.OS === "android"}
        needsOffscreenAlphaCompositing={Platform.OS === "android"}
      >
        {children}
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
});

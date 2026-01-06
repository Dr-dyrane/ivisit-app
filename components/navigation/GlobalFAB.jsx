import React, { useRef, useEffect } from 'react';
import { Pressable, Animated, StyleSheet, Platform, Easing } from 'react-native';
import { Ionicons, Fontisto } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFAB } from '../../contexts/FABContext';
import { useTabBarVisibility } from '../../contexts/TabBarVisibilityContext';
import { COLORS } from '../../constants/colors';

/**
 * GlobalFAB - Apple-style context-aware FAB
 *
 * Rules (per Apple HIG):
 * - One circle, one icon, no labels
 * - No pulse, no theatrics
 * - Soft elevation only
 * - Opacity + translate for visibility
 * - Never unmount - always mounted
 * - Anchored 16px above tab bar
 */
const FAB_SIZE = 56;
const FAB_OFFSET = 16;

const GlobalFAB = () => {
  const { config } = useFAB();
  const { translateY, TAB_BAR_HEIGHT } = useTabBarVisibility();

  // Only 3 animated values - Apple simplicity
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const visibilityAnim = useRef(new Animated.Value(config.visible ? 1 : 0)).current;

  // Visibility: fade + slide (never unmount)
  useEffect(() => {
    Animated.timing(visibilityAnim, {
      toValue: config.visible ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [config.visible, visibilityAnim]);

  // Press handlers - match iVisit haptic patterns
  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(scaleAnim, {
      toValue: 0.96,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (config.onPress) {
      config.onPress();
    }
  };

  // Position: anchored above tab bar
  const tabBarHeight = Platform.OS === 'ios' ? 85 : 70;
  const bottomOffset = tabBarHeight + FAB_OFFSET;

  // FAB moves with tab bar
  const fabTranslateY = translateY.interpolate({
    inputRange: [0, TAB_BAR_HEIGHT],
    outputRange: [0, TAB_BAR_HEIGHT],
    extrapolate: 'clamp',
  });

  // Visibility slide (subtle 12px)
  const visibilitySlide = visibilityAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: bottomOffset,
          right: 20,
          opacity: visibilityAnim,
          transform: [
            { translateY: visibilitySlide },
            { translateY: fabTranslateY },
            { scale: scaleAnim },
          ],
        },
      ]}
      pointerEvents={config.visible ? 'auto' : 'none'}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.button}
      >
        {config.icon === 'bed-patient' ? (
          <Fontisto name="bed-patient" size={24} color="#FFFFFF" />
        ) : (
          <Ionicons name={config.icon} size={26} color="#FFFFFF" />
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
  },
  button: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: COLORS.brandPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    // Soft Apple-style elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
});

export default GlobalFAB;


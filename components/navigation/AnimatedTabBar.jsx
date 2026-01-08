import React from 'react';
import { View, Pressable, StyleSheet, Platform, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { useTabBarVisibility } from '../../contexts/TabBarVisibilityContext';
import { COLORS } from '../../constants/colors';

/**
 * Custom animated tab bar with:
 * - Glass blur effect (iOS-style)
 * - Hide on scroll down, show on scroll up
 * - Smooth animations
 */
const AnimatedTabBar = ({ state, descriptors, navigation }) => {
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { translateY, TAB_BAR_HEIGHT } = useTabBarVisibility();

  // Theme-aware blur settings per spec
  const blurIntensity = isDarkMode ? 65 : 45;
  const overlayColor = isDarkMode 
    ? 'rgba(10, 10, 15, 0.6)' 
    : 'rgba(255, 255, 255, 0.7)';
  const borderColor = isDarkMode ? COLORS.border : COLORS.borderLight;

  const height = Platform.OS === 'ios' ? 85 : 70;
  const paddingBottom = Platform.OS === 'ios' ? insets.bottom : 10;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: height,
          paddingBottom: paddingBottom,
          transform: [{ translateY }],
        },
      ]}
    >
      {/* Blur background */}
      <BlurView
        intensity={blurIntensity}
        tint={isDarkMode ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Semi-transparent overlay for better legibility */}
      <View style={[styles.overlay, { backgroundColor: overlayColor }]} />
      
      {/* Top border divider */}
      <View style={[styles.topBorder, { backgroundColor: borderColor }]} />
      
      {/* Tab buttons */}
      <View style={styles.tabContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            // Haptic feedback on tab press
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // Get the icon from options
          const color = isFocused 
            ? COLORS.brandPrimary 
            : (isDarkMode ? COLORS.textMutedDark : COLORS.textMuted);

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
            >
              {options.tabBarIcon?.({ focused: isFocused, color, size: 24 })}
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0.5,
    opacity: 0.3,
  },
  tabContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
});

export default AnimatedTabBar;


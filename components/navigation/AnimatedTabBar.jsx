import React from 'react';
import { View, Pressable, StyleSheet, Platform, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { useTabBarVisibility } from '../../contexts/TabBarVisibilityContext';
import { COLORS } from '../../constants/colors';

// Shared constants matching FAB
const TAB_SIZE = 56;
const TAB_RADIUS = TAB_SIZE / 2;
const PILL_PADDING = 8;
const PILL_GAP = 8; // Same as container padding
const PILL_WIDTH = (PILL_PADDING * 2) + (TAB_SIZE * 2) + PILL_GAP;

/**
 * Custom animated tab bar with:
 * - 56px circular tabs matching FAB size
 * - Sliding pebble indicator
 * - Glass blur effect (iOS-style)
 */
const AnimatedTabBar = ({ state, descriptors, navigation }) => {
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { translateY, TAB_BAR_HEIGHT } = useTabBarVisibility();

  const PILL_HEIGHT = TAB_SIZE + (PILL_PADDING * 2);
  const paddingBottom = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 20 : 12);
  const height = PILL_HEIGHT + paddingBottom;
  const isAndroid = Platform.OS === 'android';
  const androidPillSurface = isDarkMode
    ? 'rgba(18, 24, 38, 0.74)'
    : 'rgba(255, 255, 255, 0.78)';
  const androidPillShadow = isDarkMode
    ? 'rgba(0, 0, 0, 0.24)'
    : 'rgba(15, 23, 42, 0.12)';
  const androidIndicatorSurface = isDarkMode
    ? 'rgba(39, 52, 71, 0.72)'
    : 'rgba(230, 235, 243, 0.86)';

  // Single shared animated value for indicator position - using useState to avoid ref mutation
  const [indicatorAnim] = React.useState(() => new Animated.Value(state.index));

  // Animate indicator on tab change
  React.useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: state.index,
      friction: 7,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [state.index, indicatorAnim]);

  // Calculate indicator position
  const indicatorTranslateX = indicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [PILL_PADDING, PILL_PADDING + TAB_SIZE + PILL_GAP],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height,
          paddingBottom,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.pillContainer, { width: PILL_WIDTH, height: PILL_HEIGHT, borderRadius: PILL_HEIGHT / 2 }]} pointerEvents="box-none">
        {isAndroid && (
          <View
            pointerEvents="none"
            style={[
              styles.androidShadowLayer,
              {
                borderRadius: PILL_HEIGHT / 2,
                backgroundColor: androidPillShadow,
              },
            ]}
          />
        )}

        <View style={[styles.pillClip, { borderRadius: PILL_HEIGHT / 2 }]}>

          {/* Blur background */}
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={isDarkMode ? 30 : 20}
              tint={isDarkMode ? 'dark' : 'light'}
              style={[styles.pillBackground, { borderRadius: PILL_HEIGHT / 2 }]}
            />
          ) : (
            <View
              style={[
                styles.pillBackground,
                {
                  borderRadius: PILL_HEIGHT / 2,
                  backgroundColor: androidPillSurface,
                }
              ]}
            />
          )}

          {/* Overlay tint */}
          <View style={[
            styles.pillBackground,
            {
              backgroundColor:
                Platform.OS === 'android'
                  ? 'transparent'
                  : isDarkMode
                    ? 'rgba(20, 20, 30, 0.1)'
                    : 'rgba(255, 255, 255, 0.1)',
              borderRadius: PILL_HEIGHT / 2,
            }
          ]}
          />

          {/* Sliding Pebble Indicator */}
          <Animated.View
            style={[
              styles.indicator,
              {
                width: TAB_SIZE,
                height: TAB_SIZE,
                borderRadius: TAB_RADIUS,
                top: PILL_PADDING,
                backgroundColor:
                  Platform.OS === 'android'
                    ? androidIndicatorSurface
                    : (isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'),
                transform: [{ translateX: indicatorTranslateX }],
              },
            ]}
          />

          {/* Tab Buttons */}
          <View style={styles.tabContainer}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === index;

              const onPress = () => {
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
                navigation.emit({ type: 'tabLongPress', target: route.key });
              };

              // Static colors based on focus state (no animation needed for icons)
              const color = isFocused
                ? (isDarkMode ? COLORS.brandSecondary : COLORS.brandPrimary)
                : (isDarkMode ? COLORS.textMutedDark : COLORS.textSecondary);

              return (
                <View
                  key={route.key}
                  style={[
                    styles.tab,
                    {
                      width: TAB_SIZE,
                      height: TAB_SIZE,
                      borderRadius: TAB_RADIUS,
                    },
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={isFocused ? { selected: true } : {}}
                    accessibilityLabel={options.tabBarAccessibilityLabel}
                    testID={options.tabBarTestID}
                    onPress={onPress}
                    onLongPress={onLongPress}
                    style={styles.pressable}
                  >
                    <View style={{ transform: [{ scale: isFocused ? 1.1 : 1 }] }}>
                      {options.tabBarIcon?.({ focused: isFocused, color, size: 24 })}
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
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
    overflow: 'visible',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  pillContainer: {
    marginLeft: 20,
    overflow: 'visible',
    position: 'relative',
  },
  pillClip: {
    flex: 1,
    overflow: 'hidden',
  },
  androidShadowLayer: {
    position: 'absolute',
    top: 2,
    left: 0,
    right: 0,
    bottom: -2,
  },
  pillBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  indicator: {
    position: 'absolute',
    left: 0,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PILL_PADDING,
    paddingVertical: PILL_PADDING,
    gap: PILL_GAP,
    width: '100%',
    height: '100%',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
});

export default AnimatedTabBar;

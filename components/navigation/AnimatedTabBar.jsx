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
  const blurIntensity = isDarkMode ? 70 : 60;

  const height = Platform.OS === 'ios' ? 110 : 95;
  const paddingBottom = Platform.OS === 'ios' ? 20 : 10;

  // Create animated values for each tab
  const tabBackgrounds = React.useMemo(
    () => state.routes.map(() => new Animated.Value(0)),
    [state.routes.length]
  );

  // Animate background on focus change
  React.useEffect(() => {
    Animated.spring(tabBackgrounds[state.index], {
      toValue: 1,
      friction: 7,
      tension: 100,
      useNativeDriver: false,
    }).start();

    // Reset other tabs
    state.routes.forEach((_, i) => {
      if (i !== state.index) {
        Animated.timing(tabBackgrounds[i], {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }
    });
  }, [state.index, tabBackgrounds, state.routes.length]);

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
      pointerEvents="box-none"
    >
      {/* Pill-shaped tab container */}
      <View style={styles.pillContainer} pointerEvents="box-none">
        {/* Blur for pill background */}
        <BlurView
          intensity={blurIntensity}
          tint={isDarkMode ? 'dark' : 'light'}
          style={[
            styles.pillBackground,
            { borderRadius: 48 }
          ]}
        />
        
        <View style={[
          styles.pillBackground,
          { 
            backgroundColor: isDarkMode 
              ? 'rgba(20, 20, 30, 0.25)' 
              : 'rgba(255, 255, 255, 0.2)',
            borderRadius: 48,
          }
        ]} />
        
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
              ? (isDarkMode ? COLORS.brandSecondary : COLORS.brandPrimary)
              : (isDarkMode ? COLORS.textLight : COLORS.textSecondary);

            const bgColor = tabBackgrounds[index].interpolate({
              inputRange: [0, 1],
              outputRange: [
                'rgba(0, 0, 0, 0)',
                isDarkMode ? '#121826' : `${COLORS.brandPrimary}10`,
              ],
            });

            const shadowOpacity = tabBackgrounds[index].interpolate({
              inputRange: [0, 1],
              outputRange: [0, isDarkMode ? 0 : 0.12],
            });

            return (
              <Animated.View
                key={route.key}
                style={[
                  styles.tab,
                  {
                    backgroundColor: bgColor,
                    borderRadius: 32,
                    ...(Platform.OS === 'ios' && !isDarkMode && {
                      shadowColor: '#000',
                      shadowOpacity: shadowOpacity,
                      shadowOffset: { width: 0, height: 2 },
                      shadowRadius: 4,
                    }),
                    ...(Platform.OS === 'android' && !isDarkMode && {
                      elevation: isFocused ? 3 : 0,
                    }),
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
                  {options.tabBarIcon?.({ focused: isFocused, color, size: 24 })}
                  <View style={styles.labelWrapper}>
                    <Animated.Text 
                      style={[
                        styles.label,
                        { color }
                      ]}
                      numberOfLines={1}
                    >
                      {options.title}
                    </Animated.Text>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
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
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pillContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 300,
    overflow: 'hidden',
    borderRadius: 48,
  },
  pillBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 48,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrapper: {
    marginTop: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});

export default AnimatedTabBar;

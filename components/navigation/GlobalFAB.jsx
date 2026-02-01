// FAB VISIBILITY FIX: Added debug logging to track which FAB is being rendered
// This helps identify when the wrong FAB is showing (e.g., Home Tab vs EmergencyScreen)
// Also fixed platform-specific dimensions to use dynamic values from context instead of hardcoded

import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, Pressable, Animated, Easing } from 'react-native';
import { Ionicons, Fontisto } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFAB } from '../../contexts/FABContext';
import { useTabBarVisibility } from '../../contexts/TabBarVisibilityContext';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';

const GlobalFAB = () => {
  const { activeFAB, getFABStyle, dimensions } = useFAB();
  const { translateY, TAB_BAR_HEIGHT } = useTabBarVisibility();

  const { isDarkMode } = useTheme();

  // Use platform-specific dimensions from context
  const FAB_HEIGHT = dimensions.height;
  const FAB_OFFSET = dimensions.offset;

  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const visibilityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const hasLabel = !!activeFAB?.label;

  // Sync Visibility
  useEffect(() => {
    Animated.spring(visibilityAnim, {
      toValue: activeFAB?.visible ? 1 : 0,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [activeFAB?.visible]);

  // Pulse logic for Emergency - DISABLED for cleaner design
  useEffect(() => {
    // No pulsing for SOS - cleaner Apple-style design
    return;
  }, [activeFAB?.style, activeFAB?.visible]);

  if (!activeFAB) return null;

  const fabStyle = getFABStyle(activeFAB.style || 'primary');

  // Log FAB rendering details
  console.log('[GlobalFAB] Rendering FAB:', {
    id: activeFAB.id,
    visible: activeFAB.visible,
    style: activeFAB.style,
    icon: activeFAB.icon,
    priority: activeFAB.priority
  });

  // Animation Interpolations
  const opacity = visibilityAnim;
  const slideUp = visibilityAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  const handlePress = () => {
    if (activeFAB?.loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    activeFAB?.onPress?.();
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          bottom: FAB_OFFSET + 10,
          opacity,
          transform: [
            { translateY: slideUp },
            { scale: Animated.multiply(scaleAnim, pulseAnim) },
          ],
        },
      ]}
      pointerEvents={activeFAB?.visible ? 'auto' : 'none'}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
      >
        <Animated.View
          style={[
            styles.container,
            {
              height: FAB_HEIGHT, // Dynamic height from context
              borderRadius: FAB_HEIGHT / 2, // Dynamic border radius for perfect pill
              backgroundColor: fabStyle.backgroundColor,
              // Platform-aware width based on label presence
              width: hasLabel ? (Platform.OS === 'ios' ? 110 : 120) : (Platform.OS === 'ios' ? 56 : 64),
              // Glow Effect: Colored shadow for premium depth
              shadowColor: activeFAB.style === 'emergency' ? COLORS.emergency : (activeFAB.style === 'primary' ? COLORS.brandPrimary : "#000"),
              shadowOpacity: isDarkMode ? 0.4 : 0.2,
              transform: [
                { scale: scaleAnim },
              ],
            }
          ]}
        >
          <Animated.View style={[
              styles.contentLayout,
              {
                  paddingLeft: 16,
                  paddingRight: hasLabel ? 20 : 16,
              }
          ]}>
            {/* Icon Area */}
            <View style={styles.iconWrapper}>
              {activeFAB.loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                activeFAB.icon === 'bed-patient' 
                  ? <Fontisto name="bed-patient" size={22} color="#FFFFFF" />
                  : <Ionicons name={activeFAB.icon || 'add'} size={26} color="#FFFFFF" />
              )}
            </View>

            {/* Label Area (Morphs out) */}
            {hasLabel && (
              <View style={styles.labelWrapper}>
                <Text style={styles.labelText} numberOfLines={1}>
                  {activeFAB.label}
                </Text>
                {activeFAB.subText && (
                  <Text style={styles.subLabelText} numberOfLines={1}>
                    {activeFAB.subText}
                  </Text>
                )}
              </View>
            )}
          </Animated.View>

          {/* Badge Seal - signature bottom-right placement */}
          {activeFAB.badge && (
            <View style={styles.badgeSeal}>
              <Text style={styles.badgeText}>{activeFAB.badge}</Text>
            </View>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: 20,
    zIndex: 9999,
  },
  container: {
    height: 64, // Use fixed height since FAB_HEIGHT is not available at module level
    borderRadius: 32, // Perfect Pill
    justifyContent: 'center',
    alignItems: 'center',
    // Premium Shadow Specs
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 12,
    flexDirection: 'row',
    overflow: 'visible',
  },
  contentLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  iconWrapper: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelWrapper: {
    marginLeft: 10,
    justifyContent: 'center',
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800', // Bold premium feel
    letterSpacing: -0.4,
  },
  subLabelText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: -1,
  },
  badgeSeal: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.brandPrimary, // Anchors the badge visually
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  badgeText: {
    color: COLORS.brandPrimary,
    fontSize: 10,
    fontWeight: '900',
  },
});

export default GlobalFAB;
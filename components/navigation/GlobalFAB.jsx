import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, Pressable, Animated, Easing } from 'react-native';
import { Ionicons, Fontisto } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFAB } from '../../contexts/FABContext';
import { useTabBarVisibility } from '../../contexts/TabBarVisibilityContext';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';

const FAB_HEIGHT = 56;
const FAB_OFFSET = 16;

const GlobalFAB = () => {
  const { activeFAB, getFABStyle } = useFAB();
  const { translateY, TAB_BAR_HEIGHT } = useTabBarVisibility();

  const { isDarkMode } = useTheme();

  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const visibilityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const widthAnim = useRef(new Animated.Value(0)).current; // For morphing to pill

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

  // Sync Pill Morphing (Expand if label exists)
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: hasLabel ? 1 : 0,
      duration: 300,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false, // Width can't use native driver
    }).start();
  }, [hasLabel]);

  // Pulse logic for Emergency
  useEffect(() => {
    if (activeFAB?.style === 'emergency' && activeFAB?.visible) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [activeFAB?.style, activeFAB?.visible]);

  if (!activeFAB) return null;

  const fabStyle = getFABStyle(activeFAB.style || 'primary');

  // Animation Interpolations
  const opacity = visibilityAnim;
  const slideUp = visibilityAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  // Dynamic Position based on TabBar
  const fabTranslateY = translateY.interpolate({
    inputRange: [0, TAB_BAR_HEIGHT],
    outputRange: [0, TAB_BAR_HEIGHT],
    extrapolate: 'clamp',
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
          bottom: TAB_BAR_HEIGHT + FAB_OFFSET + 10,
          opacity,
          transform: [
            { translateY: slideUp },
            { translateY: fabTranslateY },
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
        style={({ pressed }) => [
          styles.container,
          {
            backgroundColor: fabStyle.backgroundColor,
            // Glow Effect: Colored shadow for premium depth
            shadowColor: activeFAB.style === 'emergency' ? COLORS.emergency : (activeFAB.style === 'primary' ? COLORS.brandPrimary : "#000"),
            shadowOpacity: isDarkMode ? 0.4 : 0.2,
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
    height: FAB_HEIGHT,
    borderRadius: FAB_HEIGHT / 2, // Perfect Pill
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
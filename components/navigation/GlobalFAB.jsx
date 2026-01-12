import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Pressable, Animated } from 'react-native';
import { Ionicons, Fontisto } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFAB } from '../../contexts/FABContext';
import { useTabBarVisibility } from '../../contexts/TabBarVisibilityContext';
import { COLORS } from '../../constants/colors';

/**
 * GlobalFAB - Enhanced Apple-style context-aware FAB
 *
 * Enhanced Features:
 * - Dynamic text labels and sub-text support
 * - Loading states with ActivityIndicator
 * - Style variants (primary, success, emergency, warning)
 * - Priority-based conflict resolution
 * - Enhanced animations (subtle, prominent, pulse, bounce)
 * - Complex icon switching (Ionicons + Fontisto)
 *
 * Rules (per Apple HIG):
 * - One circle, one icon, optional labels
 * - Soft elevation only
 * - Opacity + translate for visibility
 * - Never unmount - always mounted
 * - Anchored 16px above tab bar
 */
const FAB_SIZE = 56;
const FAB_OFFSET = 16;

// Animation configurations
const ANIMATION_CONFIGS = {
  subtle: {
    duration: 180,
    easing: require('react-native').Easing.out(require('react-native').Easing.quad),
  },
  prominent: {
    duration: 300,
    easing: require('react-native').Easing.bezier(0.25, 0.46, 0.45, 0.94),
  },
  pulse: {
    duration: 1000,
    easing: require('react-native').Easing.inOut(require('react-native').Easing.quad),
  },
  bounce: {
    duration: 600,
    easing: require('react-native').Easing.bezier(0.68, -0.55, 0.265, 1.55),
  },
};

const GlobalFAB = () => {
  const { activeFAB, getFABStyle } = useFAB();
  const { translateY, TAB_BAR_HEIGHT } = useTabBarVisibility();

  // Animation values - initialize safely
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const visibilityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const labelAnim = useRef(new Animated.Value(0)).current;

  // Initialize visibility after mount to avoid render-time writes
  useEffect(() => {
    visibilityAnim.setValue(activeFAB?.visible ? 1 : 0);
  }, [activeFAB?.visible, visibilityAnim]);

  // Get animation configuration
  const animationConfig = useMemo(() => {
    const animType = activeFAB?.animation || 'subtle';
    return ANIMATION_CONFIGS[animType] || ANIMATION_CONFIGS.subtle;
  }, [activeFAB?.animation]);

  // Get style configuration
  const fabStyle = useMemo(() => {
    const styleType = activeFAB?.style || 'primary';
    const style = getFABStyle(styleType);
    
    // Debug logging for colors
    if (__DEV__) {
      console.log('[GlobalFAB] FAB Style:', {
        styleType,
        backgroundColor: style.backgroundColor,
        shadowColor: style.shadowColor,
        icon: activeFAB?.icon,
      });
    }
    
    return style;
  }, [activeFAB?.style, getFABStyle]);

  // Visibility animation
  useEffect(() => {
    Animated.timing(visibilityAnim, {
      toValue: activeFAB?.visible ? 1 : 0,
      ...animationConfig,
      useNativeDriver: true,
    }).start();
  }, [activeFAB?.visible, animationConfig, visibilityAnim]);

  // Pulse animation for emergency style
  useEffect(() => {
    if (activeFAB?.animation === 'pulse' && activeFAB?.visible) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [activeFAB?.animation, activeFAB?.visible, pulseAnim]);

  // Label animation (slide in from right)
  useEffect(() => {
    if (activeFAB?.label && activeFAB?.visible) {
      Animated.timing(labelAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(labelAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [activeFAB?.label, activeFAB?.visible, labelAnim]);

  // Press handlers with haptic feedback
  const handlePressIn = () => {
    if (activeFAB?.disabled || activeFAB?.loading) return;
    
    // Light haptic on press in
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Scale down animation
    Animated.timing(scaleAnim, {
      toValue: 0.96,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (activeFAB?.disabled || activeFAB?.loading) return;
    
    // Scale back animation
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (activeFAB?.disabled || activeFAB?.loading) return;
    
    // Haptic feedback based on type
    if (activeFAB?.haptic) {
      const hapticMap = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
        success: Haptics.NotificationFeedbackType.Success,
        error: Haptics.NotificationFeedbackType.Error,
      };
      
      const hapticType = hapticMap[activeFAB.haptic];
      if (hapticType) {
        if (activeFAB.haptic === 'success' || activeFAB.haptic === 'error') {
          Haptics.notificationFeedbackAsync(hapticType);
        } else {
          Haptics.impactAsync(hapticType);
        }
      }
    }
    
    // Execute action
    activeFAB?.onPress?.();
  };

  // Icon rendering with support for both Ionicons and Fontisto
  const renderIcon = () => {
    if (activeFAB?.loading) {
      return <ActivityIndicator size="small" color="#FFFFFF" />;
    }

    const iconName = activeFAB?.icon;
    if (!iconName) return null;

    // Fontisto icons (bed-patient, etc.)
    if (iconName === 'bed-patient') {
      return <Fontisto name={iconName} size={24} color="#FFFFFF" />;
    }

    // Default to Ionicons
    return <Ionicons name={iconName} size={24} color="#FFFFFF" />;
  };

  // Position: anchored above tab bar with more elevation
  const tabBarHeight = Platform.OS === 'ios' ? 85 : 70;
  const bottomOffset = tabBarHeight + FAB_OFFSET + 8; // Added 8px more elevation

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

  if (!activeFAB) return null;

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
            { scale: Animated.multiply(scaleAnim, pulseAnim) },
          ],
        },
      ]}
      pointerEvents={activeFAB?.visible ? 'auto' : 'none'}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.button,
          {
            backgroundColor: fabStyle.backgroundColor,
            shadowColor: fabStyle.shadowColor,
          },
        ]}
        disabled={activeFAB?.disabled || activeFAB?.loading}
      >
        {renderIcon()}
      </Pressable>
      
      {/* Enhanced label support */}
      {activeFAB?.label && (
        <Animated.View
          style={[
            styles.labelContainer,
            {
              opacity: labelAnim,
              transform: [
                {
                  translateX: labelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.labelText}>
            {activeFAB.label}
          </Text>
          {activeFAB?.subText && (
            <Text style={styles.subLabelText}>
              {activeFAB.subText}
            </Text>
          )}
        </Animated.View>
      )}
      
      {/* Badge support */}
      {activeFAB?.badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {activeFAB.badge}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
    alignItems: 'flex-end',
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
  buttonDisabled: {
    opacity: 0.5,
  },
  labelContainer: {
    alignItems: 'flex-end',
    minWidth: 120,
    marginRight: 8,
    position: 'absolute',
    right: FAB_SIZE + 8,
    top: FAB_SIZE / 2 - 20,
  },
  labelText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.brandPrimary,
    textAlign: 'right',
    letterSpacing: -0.3,
  },
  subLabelText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748B',
    textAlign: 'right',
    marginTop: 3,
    letterSpacing: -0.2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.emergency,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default GlobalFAB;


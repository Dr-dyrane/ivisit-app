// FAB aligned with tab bar - 56x56 circle on tabs, expandable with label on stacks
import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, Pressable, Animated } from 'react-native';
import { Ionicons, Fontisto, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFAB } from '../../contexts/FABContext';
import { useTabBarVisibility } from '../../contexts/TabBarVisibilityContext';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOTAUpdates } from '../../hooks/useOTAUpdates';
import ServicePickerModal from '../modals/ServicePickerModal';

// Match AnimatedTabBar constants exactly
const TAB_SIZE = 56;
const PILL_PADDING = 8;
const LONG_PRESS_DELAY = 500; // ms

const GlobalFAB = () => {
  const { activeFAB, getFABStyle, isInStack } = useFAB();
  const { translateY } = useTabBarVisibility();
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { testSuccessModal } = useOTAUpdates();

  // Service picker modal state
  const [showServicePicker, setShowServicePicker] = useState(false);

  // Calculate bottom position to align FAB with tab pills
  const paddingBottom = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 20 : 12);
  const fabBottom = paddingBottom + PILL_PADDING;

  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const visibilityAnim = useRef(new Animated.Value(0)).current;

  // Has label = expandable on stack pages
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

  if (!activeFAB) return null;

  const fabStyle = getFABStyle(activeFAB.style || 'primary');

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

  const handleLongPress = () => {
    if (activeFAB?.loading) return;

    // Only show service picker for emergency/booking mode FABs (home tab)
    const isHomeFAB = activeFAB?.mode === 'emergency' || activeFAB?.mode === 'booking';
    if (!isHomeFAB) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowServicePicker(true);
  };

  const handleServiceSelect = (serviceId) => {
    // Map service ID to mode and trigger the appropriate action

    if (activeFAB?.onLongPress) {
      activeFAB.onLongPress(serviceId);
    } else if (activeFAB?.onPress) {
      // Fallback: if current mode differs, trigger press to toggle
      const currentMode = activeFAB.mode;
      if (currentMode !== serviceId) {
        activeFAB.onPress();
      }
    }
  };

  // Get current mode from FAB context
  const currentMode = activeFAB?.mode === 'emergency' ? 'emergency' : 'booking';

  return (
    <>
      <Animated.View
        style={[
          styles.wrapper,
          {
            bottom: fabBottom,
            opacity,
            transform: [
              { translateY: Animated.add(translateY, slideUp) },
              { scale: scaleAnim },
            ],
          },
        ]}
        pointerEvents={activeFAB?.visible ? 'auto' : 'none'}
      >
        <Pressable
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={LONG_PRESS_DELAY}
          onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
        >
          <View
            style={[
              styles.container,
              {
                backgroundColor: fabStyle.backgroundColor,
                // Dynamic sizing: circle on tabs, pill when label present
                width: hasLabel ? undefined : TAB_SIZE,
                minWidth: TAB_SIZE,
                height: TAB_SIZE,
                borderRadius: TAB_SIZE / 2,
                paddingHorizontal: hasLabel ? 20 : 0,
                // Glow Effect
                shadowColor: activeFAB.style === 'emergency' ? COLORS.emergency : (activeFAB.style === 'primary' ? COLORS.brandPrimary : "#000"),
                shadowOpacity: isDarkMode ? 0.4 : 0.25,
              }
            ]}
          >
            {/* Icon */}
            <View style={styles.iconWrapper}>
              {activeFAB.loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                ['alarm-light-outline', 'bed-outline'].includes(activeFAB.icon)
                  ? <MaterialCommunityIcons name={activeFAB.icon} size={24} color="#FFFFFF" />
                  : <Ionicons name={activeFAB.icon || 'add'} size={26} color="#FFFFFF" />
              )}
            </View>

            {/* Label (shows on stack pages) */}
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

            {/* Badge Seal */}
            {activeFAB.badge && (
              <View style={styles.badgeSeal}>
                <Text style={styles.badgeText}>{activeFAB.badge}</Text>
              </View>
            )}
          </View>
        </Pressable>
      </Animated.View>

      {/* Hidden Service Picker Modal */}
      <ServicePickerModal
        visible={showServicePicker}
        onClose={() => setShowServicePicker(false)}
        onSelectService={handleServiceSelect}
        currentMode={currentMode}
      />
    </>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: 20,
    zIndex: 9999,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    // Premium Shadow
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 10,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelWrapper: {
    marginLeft: 8,
    justifyContent: 'center',
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
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
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.brandPrimary,
  },
  badgeText: {
    color: COLORS.brandPrimary,
    fontSize: 10,
    fontWeight: '900',
  },
});

export default GlobalFAB;
import React, { useRef } from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS } from '../../constants/colors';

const IconButton = ({
  icon,
  size = 24,
  color,
  backgroundColor,
  onPress,
  style,
  hapticFeedback = 'light',
  disabled = false,
  variant = 'default', // 'default', 'filled', 'outlined', 'ghost'
  ...props
}) => {
  const { isDarkMode } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    
    const feedbackType = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    }[hapticFeedback];

    if (feedbackType) {
      Haptics.impactAsync(feedbackType);
    }

    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const getVariantStyles = () => {
    const baseSize = size + 16; // Add padding
    
    switch (variant) {
      case 'filled':
        return {
          backgroundColor: backgroundColor || COLORS.brandPrimary,
          width: baseSize,
          height: baseSize,
          borderRadius: baseSize / 2,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: backgroundColor || COLORS.brandPrimary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 4,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          width: baseSize,
          height: baseSize,
          borderRadius: baseSize / 2,
          borderWidth: 1.5,
          borderColor: color || (isDarkMode ? COLORS.textLight : COLORS.textPrimary),
          justifyContent: 'center',
          alignItems: 'center',
        };
      case 'ghost':
        return {
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          width: baseSize,
          height: baseSize,
          borderRadius: baseSize / 2,
          justifyContent: 'center',
          alignItems: 'center',
        };
      default:
        return {
          padding: 8,
          borderRadius: 8,
        };
    }
  };

  const getIconColor = () => {
    if (disabled) {
      return isDarkMode ? COLORS.textMutedDark : COLORS.textMuted;
    }
    
    if (color) return color;
    
    switch (variant) {
      case 'filled':
        return '#FFFFFF';
      default:
        return isDarkMode ? COLORS.textLight : COLORS.textPrimary;
    }
  };

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[
          getVariantStyles(),
          disabled && { opacity: 0.5 },
        ]}
        {...props}
      >
        <Ionicons
          name={icon}
          size={size}
          color={getIconColor()}
        />
      </Pressable>
    </Animated.View>
  );
};

export default IconButton;

import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS } from '../../constants/colors';

const StatusIndicator = ({
  status = 'available', // 'available', 'busy', 'offline', 'emergency'
  text,
  size = 'medium', // 'small', 'medium', 'large'
  showIcon = true,
  showPulse = false,
  style,
}) => {
  const { isDarkMode } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (showPulse) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [showPulse]);

  const getStatusConfig = () => {
    switch (status) {
      case 'available':
        return {
          color: '#10B981', // Green
          icon: 'checkmark-circle',
          bgColor: '#10B98120',
        };
      case 'busy':
        return {
          color: '#F59E0B', // Amber
          icon: 'time',
          bgColor: '#F59E0B20',
        };
      case 'offline':
        return {
          color: '#6B7280', // Gray
          icon: 'close-circle',
          bgColor: '#6B728020',
        };
      case 'emergency':
        return {
          color: '#EF4444', // Red
          icon: 'warning',
          bgColor: '#EF444420',
        };
      default:
        return {
          color: COLORS.brandPrimary,
          icon: 'information-circle',
          bgColor: `${COLORS.brandPrimary}20`,
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return {
          dotSize: 8,
          iconSize: 12,
          fontSize: 11,
          padding: 6,
          borderRadius: 12,
        };
      case 'large':
        return {
          dotSize: 12,
          iconSize: 20,
          fontSize: 16,
          padding: 12,
          borderRadius: 20,
        };
      default: // medium
        return {
          dotSize: 10,
          iconSize: 16,
          fontSize: 14,
          padding: 8,
          borderRadius: 16,
        };
    }
  };

  const statusConfig = getStatusConfig();
  const sizeConfig = getSizeConfig();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: statusConfig.bgColor,
          paddingHorizontal: sizeConfig.padding,
          paddingVertical: sizeConfig.padding / 2,
          borderRadius: sizeConfig.borderRadius,
        },
        style,
      ]}
    >
      {showIcon && (
        <Animated.View
          style={[
            styles.iconContainer,
            showPulse && { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Ionicons
            name={statusConfig.icon}
            size={sizeConfig.iconSize}
            color={statusConfig.color}
          />
        </Animated.View>
      )}
      
      {!showIcon && (
        <Animated.View
          style={[
            styles.dot,
            {
              width: sizeConfig.dotSize,
              height: sizeConfig.dotSize,
              borderRadius: sizeConfig.dotSize / 2,
              backgroundColor: statusConfig.color,
            },
            showPulse && { transform: [{ scale: pulseAnim }] },
          ]}
        />
      )}

      {text && (
        <Text
          style={[
            styles.text,
            {
              fontSize: sizeConfig.fontSize,
              color: statusConfig.color,
              marginLeft: showIcon || !showIcon ? 6 : 0,
            },
          ]}
        >
          {text}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default StatusIndicator;

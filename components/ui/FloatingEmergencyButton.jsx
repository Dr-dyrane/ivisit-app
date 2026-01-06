import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS } from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const FloatingEmergencyButton = ({ 
  onPress, 
  position = 'right',
  bottom = 100,
  size = 'large',
  style 
}) => {
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Continuous pulse animation
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
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

    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    );

    pulseAnimation.start();
    glowAnimation.start();

    return () => {
      pulseAnimation.stop();
      glowAnimation.stop();
    };
  }, []);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (onPress) {
      onPress();
    }
  };

  const buttonSize = size === 'large' ? 70 : size === 'medium' ? 60 : 50;
  const iconSize = size === 'large' ? 32 : size === 'medium' ? 28 : 24;

  const positionStyle = {
    position: 'absolute',
    bottom: bottom + insets.bottom,
    [position]: 20,
    zIndex: 1000,
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View style={[positionStyle, style]}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glowContainer,
          {
            width: buttonSize + 20,
            height: buttonSize + 20,
            borderRadius: (buttonSize + 20) / 2,
            opacity: glowOpacity,
          },
        ]}
      />
      
      {/* Pulse ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            width: buttonSize + 30,
            height: buttonSize + 30,
            borderRadius: (buttonSize + 30) / 2,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Main button */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.button,
            {
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
            },
          ]}
        >
          <Ionicons 
            name="medical" 
            size={iconSize} 
            color="#FFFFFF" 
          />
          <Text style={[styles.buttonText, { fontSize: size === 'large' ? 10 : 8 }]}>
            SOS
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  glowContainer: {
    position: 'absolute',
    backgroundColor: COLORS.brandPrimary,
    top: -10,
    left: -10,
    shadowColor: COLORS.brandPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  pulseRing: {
    position: 'absolute',
    top: -15,
    left: -15,
    borderWidth: 2,
    borderColor: COLORS.brandPrimary,
    opacity: 0.3,
  },
  buttonContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  button: {
    backgroundColor: COLORS.brandPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
});

export default FloatingEmergencyButton;

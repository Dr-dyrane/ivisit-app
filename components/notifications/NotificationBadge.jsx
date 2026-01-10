// components/notifications/NotificationBadge.jsx - Badge component for nav

import { View, Text, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { COLORS } from "../../constants/colors";

/**
 * NotificationBadge - Animated badge for notification count
 * 
 * Features:
 * - Ping animation for new notifications
 * - Scales up/down on count change
 * - Hides when count is 0
 */
export default function NotificationBadge({ 
  count = 0,
  showPing = true,
  size = "small", // "small" | "medium" | "large"
  style,
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pingAnim = useRef(new Animated.Value(1)).current;

  // Size configurations
  const sizes = {
    small: { width: 18, height: 18, fontSize: 10, borderWidth: 2 },
    medium: { width: 22, height: 22, fontSize: 12, borderWidth: 2 },
    large: { width: 28, height: 28, fontSize: 14, borderWidth: 3 },
  };

  const sizeConfig = sizes[size] || sizes.small;

  // Animate on count change
  useEffect(() => {
    if (count > 0) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [count]);

  // Ping animation
  useEffect(() => {
    if (count > 0 && showPing) {
      const pingLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pingAnim, {
            toValue: 1.8,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pingAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pingLoop.start();
      return () => pingLoop.stop();
    }
  }, [count, showPing]);

  if (count === 0) return null;

  const displayCount = count > 99 ? "99+" : String(count);

  return (
    <View style={[{ position: "relative" }, style]}>
      {/* Ping ring */}
      {showPing && (
        <Animated.View
          style={{
            position: "absolute",
            width: sizeConfig.width,
            height: sizeConfig.height,
            borderRadius: sizeConfig.width / 2,
            backgroundColor: `${COLORS.brandPrimary}40`,
            transform: [{ scale: pingAnim }],
            opacity: pingAnim.interpolate({
              inputRange: [1, 1.8],
              outputRange: [0.6, 0],
            }),
          }}
        />
      )}

      {/* Badge */}
      <Animated.View
        style={{
          width: sizeConfig.width,
          height: sizeConfig.height,
          borderRadius: sizeConfig.width / 2,
          backgroundColor: COLORS.brandPrimary,
          justifyContent: "center",
          alignItems: "center",
          borderWidth: sizeConfig.borderWidth,
          borderColor: "#FFFFFF",
          transform: [{ scale: scaleAnim }],
        }}
      >
        <Text
          style={{
            fontSize: sizeConfig.fontSize,
            fontWeight: "500",
            color: "#FFFFFF",
          }}
        >
          {displayCount}
        </Text>
      </Animated.View>
    </View>
  );
}


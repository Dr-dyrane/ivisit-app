import { View, Text, Animated, StyleSheet } from "react-native";
import { useEffect, useRef } from "react";
import { COLORS } from "../../constants/colors";

export default function NotificationBadge({ 
  count = 0,
  showPing = true,
  size = "small",
  style,
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pingAnim = useRef(new Animated.Value(1)).current;

  const sizes = {
    small: { width: 20, height: 20, fontSize: 10, radius: 8 },
    medium: { width: 24, height: 24, fontSize: 11, radius: 10 },
    large: { width: 30, height: 30, fontSize: 13, radius: 12 },
  };

  const config = sizes[size] || sizes.small;

  useEffect(() => {
    if (count > 0) {
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 200, useNativeDriver: true }).start();
    } else {
      Animated.timing(scaleAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    }
  }, [count]);

  useEffect(() => {
    if (count > 0 && showPing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pingAnim, { toValue: 1.6, duration: 1000, useNativeDriver: true }),
          Animated.timing(pingAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [count, showPing]);

  if (count === 0) return null;

  return (
    <View style={[styles.badgeWrapper, style]}>
      {showPing && (
        <Animated.View
          style={[styles.ping, {
            width: config.width,
            height: config.height,
            borderRadius: config.radius,
            transform: [{ scale: pingAnim }],
            opacity: pingAnim.interpolate({ inputRange: [1, 1.6], outputRange: [0.5, 0] }),
          }]}
        />
      )}
      <Animated.View
        style={[styles.badgeBase, {
          width: config.width,
          height: config.height,
          borderRadius: config.radius,
          transform: [{ scale: scaleAnim }],
        }]}
      >
        <Text style={[styles.badgeText, { fontSize: config.fontSize }]}>
          {count > 99 ? "99+" : count}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeWrapper: { position: "relative", alignItems: 'center', justifyContent: 'center' },
  ping: { position: "absolute", backgroundColor: COLORS.brandPrimary },
  badgeBase: {
    backgroundColor: COLORS.brandPrimary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: { color: "#FFFFFF", fontWeight: "900", letterSpacing: -0.5 },
});
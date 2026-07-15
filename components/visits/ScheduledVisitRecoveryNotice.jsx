import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../contexts/ThemeContext";

const IS_WEB = Platform.OS === "web";

export default function ScheduledVisitRecoveryNotice({
  message,
  busy = false,
  style,
}) {
  const { isDarkMode } = useTheme();
  const noticeRef = useRef(null);
  const announcedMessageRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!message) {
      announcedMessageRef.current = null;
      return undefined;
    }
    if (busy || announcedMessageRef.current === message) return undefined;

    if (!IS_WEB) {
      announcedMessageRef.current = message;
      AccessibilityInfo.announceForAccessibility?.(message);
      return undefined;
    }

    const timer = setTimeout(() => {
      announcedMessageRef.current = message;
      noticeRef.current?.focus?.();
    }, 0);
    return () => clearTimeout(timer);
  }, [busy, message]);

  if (!message) return null;

  const backgroundColor = isDarkMode
    ? "rgba(56,189,248,0.14)"
    : "#EAF6FF";
  const textColor = isDarkMode ? "#E0F2FE" : "#0C4A6E";
  const webFocusStyle =
    IS_WEB && isFocused
      ? {
          outlineColor: COLORS.brandPrimary,
          outlineOffset: 2,
          outlineStyle: "solid",
          outlineWidth: 2,
        }
      : null;

  return (
    <View
      ref={noticeRef}
      accessible
      accessibilityRole={IS_WEB ? "alert" : "text"}
      accessibilityLiveRegion={IS_WEB ? "assertive" : "none"}
      focusable={IS_WEB ? true : undefined}
      tabIndex={IS_WEB ? -1 : undefined}
      onFocus={IS_WEB ? () => setIsFocused(true) : undefined}
      onBlur={IS_WEB ? () => setIsFocused(false) : undefined}
      style={[styles.notice, { backgroundColor }, webFocusStyle, style]}
    >
      <Ionicons
        name="refresh-circle-outline"
        size={20}
        color={COLORS.brandPrimary}
      />
      <Text style={[styles.message, { color: textColor }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
  },
  message: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
});

import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { PROFILE_SCREEN_COPY } from "./profileScreen.content";

function MetricRow({ icon, label, value, theme, isDarkMode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDarkMode
            ? "rgba(255,255,255,0.06)"
            : "rgba(15,23,42,0.05)",
        }}
      >
        <Ionicons name={icon} size={14} color={COLORS.brandPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 12, fontWeight: "400", color: theme.textMuted }}
        >
          {label}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: "600", color: theme.text }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function ProfileContextPane({
  theme,
  metrics,
  isDarkMode,
  profileCompletionLabel,
  emergencyCountLabel,
  healthStatusLabel,
  onEditPersonalInfo,
}) {
  return (
    <View style={{ gap: metrics.spacing.md }}>
      <View style={{ gap: metrics.spacing.xs }}>
        <Text
          style={{
            fontSize: 18,
            lineHeight: 24,
            fontWeight: "700",
            color: theme.text,
            letterSpacing: -0.3,
          }}
        >
          {PROFILE_SCREEN_COPY.context.title}
        </Text>
        <Text
          style={{
            fontSize: metrics.typography.body.fontSize,
            lineHeight: metrics.typography.body.lineHeight,
            fontWeight: "400",
            color: theme.textMuted,
          }}
        >
          {PROFILE_SCREEN_COPY.context.body}
        </Text>
      </View>

      <View style={{ gap: metrics.spacing.sm }}>
        <MetricRow
          icon="person-circle-outline"
          label="Personal info"
          value={profileCompletionLabel}
          theme={theme}
          isDarkMode={isDarkMode}
        />
        <MetricRow
          icon="people-outline"
          label="Emergency contacts"
          value={emergencyCountLabel}
          theme={theme}
          isDarkMode={isDarkMode}
        />
        <MetricRow
          icon="medical-outline"
          label="Health profile"
          value={healthStatusLabel}
          theme={theme}
          isDarkMode={isDarkMode}
        />
      </View>

      <Pressable
        onPress={onEditPersonalInfo}
        style={({ pressed }) => ({
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 14,
          borderCurve: "continuous",
          backgroundColor: pressed
            ? isDarkMode
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.07)"
            : theme.cardMuted,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        })}
      >
        <Ionicons name="create-outline" size={15} color={COLORS.brandPrimary} />
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: COLORS.brandPrimary,
          }}
        >
          {PROFILE_SCREEN_COPY.context.primaryAction}
        </Text>
      </Pressable>

      <Text
        style={{
          fontSize: 11,
          lineHeight: 16,
          fontWeight: "400",
          color: theme.textMuted,
        }}
      >
        {PROFILE_SCREEN_COPY.context.footer}
      </Text>
    </View>
  );
}

import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { COLORS } from "../../constants/colors";
import { SETTINGS_SCREEN_COPY } from "./settingsScreen.content";

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
          style={{
            fontSize: 12,
            lineHeight: 16,
            fontWeight: "400",
            color: theme.textMuted,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: 13,
            lineHeight: 18,
            fontWeight: "600",
            color: theme.text,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function SkeletonMetricRow({ theme }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          borderCurve: "continuous",
          backgroundColor: theme.skeletonSoft,
        }}
      />
      <View style={{ flex: 1, gap: 6 }}>
        <View
          style={{
            width: "34%",
            height: 11,
            borderRadius: 999,
            backgroundColor: theme.skeletonSoft,
          }}
        />
        <View
          style={{
            width: "56%",
            height: 13,
            borderRadius: 999,
            backgroundColor: theme.skeletonBase,
          }}
        />
      </View>
    </View>
  );
}

export default function SettingsContextPane({
  theme,
  metrics,
  isDarkMode,
  signedInAs,
  themeSummary,
  notificationsSummary,
  privacySummary,
  loading = false,
}) {
  if (loading) {
    return (
      <View style={{ gap: metrics.spacing.md }}>
        <View style={{ gap: metrics.spacing.xs }}>
          <View
            style={{
              width: "52%",
              height: 22,
              borderRadius: 999,
              backgroundColor: theme.skeletonBase,
            }}
          />
          <View
            style={{
              width: "78%",
              height: 14,
              borderRadius: 999,
              backgroundColor: theme.skeletonSoft,
            }}
          />
        </View>

        <View
          style={{
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 14,
            borderCurve: "continuous",
            backgroundColor: theme.cardMuted,
          }}
        >
          <View
            style={{
              width: "28%",
              height: 11,
              borderRadius: 999,
              backgroundColor: theme.skeletonSoft,
            }}
          />
          <View
            style={{
              width: "64%",
              height: 14,
              borderRadius: 999,
              backgroundColor: theme.skeletonBase,
            }}
          />
        </View>

        <View style={{ gap: metrics.spacing.sm }}>
          <SkeletonMetricRow theme={theme} />
          <SkeletonMetricRow theme={theme} />
          <SkeletonMetricRow theme={theme} />
        </View>
      </View>
    );
  }

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
          {SETTINGS_SCREEN_COPY.context.title}
        </Text>
        <Text
          style={{
            fontSize: metrics.typography.body.fontSize,
            lineHeight: metrics.typography.body.lineHeight,
            fontWeight: "400",
            color: theme.textMuted,
          }}
        >
          {SETTINGS_SCREEN_COPY.context.body}
        </Text>
      </View>

      <View
        style={{
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 14,
          borderCurve: "continuous",
          backgroundColor: theme.cardMuted,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            lineHeight: 14,
            fontWeight: "600",
            color: theme.textMuted,
          }}
        >
          {SETTINGS_SCREEN_COPY.context.accountLabel}
        </Text>
        <Text
          style={{
            fontSize: 14,
            lineHeight: 19,
            fontWeight: "600",
            color: theme.text,
          }}
        >
          {signedInAs}
        </Text>
      </View>

      <View style={{ gap: metrics.spacing.sm }}>
        <MetricRow
          icon="contrast-outline"
          label={SETTINGS_SCREEN_COPY.context.themeLabel}
          value={themeSummary}
          theme={theme}
          isDarkMode={isDarkMode}
        />
        <MetricRow
          icon="notifications-outline"
          label={SETTINGS_SCREEN_COPY.context.notificationsLabel}
          value={notificationsSummary}
          theme={theme}
          isDarkMode={isDarkMode}
        />
        <MetricRow
          icon="shield-checkmark-outline"
          label={SETTINGS_SCREEN_COPY.context.privacyLabel}
          value={privacySummary}
          theme={theme}
          isDarkMode={isDarkMode}
        />
      </View>
    </View>
  );
}

import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../constants/colors";
import { INSURANCE_SCREEN_COPY } from "./insuranceScreen.content";

// PULLBACK NOTE: Context pane carries the one useful orientation block for the screen.
// It provides coverage status, last-updated truth, and the primary add action without repeating long explanatory copy.

export default function InsuranceContextPane({
  theme,
  metrics,
  coverageCountLabel,
  defaultPolicyLabel,
  lastUpdatedLabel,
  syncNotice,
  onAddCoverage,
  compact = false,
  loading = false,
}) {
  if (loading) {
    return (
      <View
        style={{
          backgroundColor: theme.card,
          borderRadius: metrics.radii.xl,
          borderCurve: "continuous",
          padding: metrics.spacing.lg,
          gap: metrics.spacing.md,
        }}
      >
        <View style={{ gap: metrics.spacing.xs }}>
          <View
            style={{
              width: compact ? 148 : 176,
              height: compact ? 22 : 28,
              borderRadius: 999,
              backgroundColor: theme.skeletonBase,
            }}
          />
          {!compact ? (
            <View
              style={{
                width: "72%",
                height: 14,
                borderRadius: 999,
                backgroundColor: theme.skeletonSoft,
              }}
            />
          ) : null}
        </View>

        <View
          style={{
            backgroundColor: theme.cardMuted,
            borderRadius: metrics.radii.lg,
            borderCurve: "continuous",
            padding: metrics.spacing.md,
            gap: metrics.spacing.sm,
          }}
        >
          <SkeletonStatusRow theme={theme} metrics={metrics} />
          <SkeletonStatusRow theme={theme} metrics={metrics} />
          <SkeletonStatusRow theme={theme} metrics={metrics} />
        </View>

        <View
          style={{
            minHeight: metrics.sizing.buttonHeight,
            borderRadius: metrics.radii.lg,
            borderCurve: "continuous",
            backgroundColor: theme.skeletonBase,
          }}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: metrics.radii.xl,
        borderCurve: "continuous",
        padding: metrics.spacing.lg,
        gap: metrics.spacing.md,
      }}
    >
      <View style={{ gap: metrics.spacing.xs }}>
        <Text
          style={{
            color: theme.text,
            fontSize: compact
              ? metrics.typography.title.fontSize
              : metrics.typography.title.fontSize + 1,
            lineHeight: compact
              ? metrics.typography.title.lineHeight
              : metrics.typography.title.lineHeight + 2,
            fontWeight: "600",
            letterSpacing: -0.25,
          }}
        >
          {INSURANCE_SCREEN_COPY.context.title}
        </Text>
        {!compact ? (
          <Text
            style={{
              color: theme.textMuted,
              fontSize: metrics.typography.body.fontSize,
              lineHeight: metrics.typography.body.lineHeight,
              fontWeight: "400",
            }}
          >
            {INSURANCE_SCREEN_COPY.context.body}
          </Text>
        ) : null}
      </View>

      <View
        style={{
          backgroundColor: theme.cardMuted,
          borderRadius: metrics.radii.lg,
          borderCurve: "continuous",
          padding: metrics.spacing.md,
          gap: metrics.spacing.sm,
        }}
      >
        <StatusRow
          label={INSURANCE_SCREEN_COPY.context.countLabel}
          value={coverageCountLabel}
          iconName="shield-checkmark"
          theme={theme}
          metrics={metrics}
        />
        <StatusRow
          label={INSURANCE_SCREEN_COPY.context.defaultLabel}
          value={defaultPolicyLabel}
          iconName="checkmark-circle"
          theme={theme}
          metrics={metrics}
        />
        <StatusRow
          label={INSURANCE_SCREEN_COPY.context.lastUpdatedLabel}
          value={lastUpdatedLabel}
          iconName="time"
          theme={theme}
          metrics={metrics}
        />
      </View>

      {syncNotice && compact ? (
        <Text
          style={{
            color: theme.textMuted,
            fontSize: metrics.typography.caption.fontSize,
            lineHeight: metrics.typography.caption.lineHeight,
            fontWeight: "400",
          }}
        >
          {syncNotice}
        </Text>
      ) : null}

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onAddCoverage?.();
        }}
        style={({ pressed }) => ({
          minHeight: metrics.sizing.buttonHeight,
          borderRadius: metrics.radii.lg,
          borderCurve: "continuous",
          backgroundColor: COLORS.brandPrimary,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: metrics.typography.body.fontSize,
            lineHeight: metrics.typography.body.lineHeight,
            fontWeight: "600",
            letterSpacing: 0.1,
          }}
        >
          {INSURANCE_SCREEN_COPY.context.primaryAction}
        </Text>
      </Pressable>
    </View>
  );
}

function StatusRow({ label, value, iconName, theme, metrics }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: metrics.spacing.md,
      }}
    >
      <Text
        style={{
          color: theme.textMuted,
          fontSize: metrics.typography.caption.fontSize,
          lineHeight: metrics.typography.caption.lineHeight,
          fontWeight: "400",
          flex: 1,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          flexShrink: 1,
        }}
      >
        <Ionicons name={iconName} size={14} color={COLORS.brandPrimary} />
        <Text
          style={{
            color: theme.text,
            fontSize: metrics.typography.caption.fontSize,
            lineHeight: metrics.typography.caption.lineHeight,
            fontWeight: "600",
            textAlign: "right",
            flexShrink: 1,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function SkeletonStatusRow({ theme, metrics }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: metrics.spacing.md,
      }}
    >
      <View
        style={{
          width: "34%",
          height: 12,
          borderRadius: 999,
          backgroundColor: theme.skeletonSoft,
        }}
      />
      <View
        style={{
          width: "28%",
          height: 12,
          borderRadius: 999,
          backgroundColor: theme.skeletonBase,
        }}
      />
    </View>
  );
}

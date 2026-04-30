import React from "react";
import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SEARCH_SCREEN_COPY } from "./searchScreen.content";

export default function SearchContextPane({
  theme,
  metrics,
  recentCountLabel,
  trendLabel,
  focusLabel,
  primaryActionLabel,
  onPrimaryAction,
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
        {!compact ? (
          <View style={{ gap: metrics.spacing.xs }}>
            <View
              style={{
                width: 188,
                height: 28,
                borderRadius: 999,
                backgroundColor: theme.skeletonBase,
              }}
            />
            <View
              style={{
                width: "72%",
                height: 14,
                borderRadius: 999,
                backgroundColor: theme.skeletonSoft,
              }}
            />
          </View>
        ) : null}

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
        gap: compact ? metrics.spacing.sm : metrics.spacing.md,
      }}
    >
      {!compact ? (
        <View style={{ gap: metrics.spacing.xs }}>
          <Text
            style={{
              color: theme.text,
              fontSize: metrics.typography.title.fontSize + 1,
              lineHeight: metrics.typography.title.lineHeight + 2,
              fontWeight: "600",
              letterSpacing: -0.25,
            }}
          >
            {SEARCH_SCREEN_COPY.context.title}
          </Text>
          <Text
            style={{
              color: theme.textMuted,
              fontSize: metrics.typography.body.fontSize,
              lineHeight: metrics.typography.body.lineHeight,
              fontWeight: "400",
            }}
          >
            {SEARCH_SCREEN_COPY.context.body}
          </Text>
        </View>
      ) : null}

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
          label={SEARCH_SCREEN_COPY.context.recentLabel}
          value={recentCountLabel}
          iconName="time"
          theme={theme}
          metrics={metrics}
        />
        <StatusRow
          label={SEARCH_SCREEN_COPY.context.trendLabel}
          value={trendLabel}
          iconName="trending-up"
          theme={theme}
          metrics={metrics}
        />
        <StatusRow
          label={SEARCH_SCREEN_COPY.context.focusLabel}
          value={focusLabel}
          iconName="medical"
          theme={theme}
          metrics={metrics}
        />
      </View>

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPrimaryAction?.();
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
          {primaryActionLabel}
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

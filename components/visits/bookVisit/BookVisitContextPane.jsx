import React from "react";
import { Text, View } from "react-native";
import { COLORS } from "../../../constants/colors";
import { BOOK_VISIT_SCREEN_COPY } from "./bookVisit.content";

function SelectionRow({ label, value, theme, metrics }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: metrics.spacing.md,
      }}
    >
      <Text
        style={{
          color: theme.textMuted,
          fontSize: metrics.typography.body.fontSize,
          lineHeight: metrics.typography.body.lineHeight,
          fontWeight: "400",
        }}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          flexShrink: 1,
          color: theme.text,
          fontSize: metrics.typography.body.fontSize,
          lineHeight: metrics.typography.body.lineHeight,
          fontWeight: "600",
          textAlign: "right",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export default function BookVisitContextPane({
  theme,
  metrics,
  stepMeta,
  selections,
  quoteLabel,
  progressValue,
  loading = false,
}) {
  if (loading) {
    return (
      <View style={{ gap: metrics.spacing.lg }}>
        <View
          style={{
            width: 160,
            height: 28,
            borderRadius: 14,
            backgroundColor: theme.skeletonBase,
          }}
        />
        <View
          style={{
            width: "100%",
            height: 92,
            borderRadius: metrics.radii.xl,
            backgroundColor: theme.skeletonSoft,
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: metrics.spacing.lg }}>
      <View style={{ gap: metrics.spacing.sm }}>
        <Text
          style={{
            color: theme.text,
            fontSize: Math.max(metrics.typography.title.fontSize + 2, 22),
            lineHeight: Math.max(metrics.typography.title.lineHeight + 4, 28),
            fontWeight: "700",
            letterSpacing: -0.35,
          }}
        >
          {BOOK_VISIT_SCREEN_COPY.context.title}
        </Text>
        <Text
          style={{
            color: theme.textMuted,
            fontSize: metrics.typography.body.fontSize,
            lineHeight: metrics.typography.body.lineHeight + 2,
            fontWeight: "400",
          }}
        >
          {BOOK_VISIT_SCREEN_COPY.context.body}
        </Text>
      </View>

      <View
        style={{
          height: 6,
          borderRadius: 999,
          backgroundColor: theme.cardMuted,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${Math.max(12, Math.round(progressValue * 100))}%`,
            height: "100%",
            borderRadius: 999,
            backgroundColor: COLORS.brandPrimary,
          }}
        />
      </View>

      <View
        style={{
          gap: metrics.spacing.md,
          padding: metrics.spacing.lg,
          borderRadius: metrics.radii.xl,
          backgroundColor: theme.cardMuted,
        }}
      >
        <Text
          style={{
            color: theme.text,
            fontSize: metrics.typography.heading.fontSize,
            lineHeight: metrics.typography.heading.lineHeight,
            fontWeight: "600",
          }}
        >
          {stepMeta.title}
        </Text>
        <Text
          style={{
            color: theme.textMuted,
            fontSize: metrics.typography.body.fontSize,
            lineHeight: metrics.typography.body.lineHeight,
            fontWeight: "400",
          }}
        >
          {stepMeta.body}
        </Text>
        <View style={{ gap: metrics.spacing.sm }}>
          {selections.map((selection) => (
            <SelectionRow
              key={selection.key}
              label={selection.label}
              value={selection.value}
              theme={theme}
              metrics={metrics}
            />
          ))}
        </View>
        <SelectionRow
          label={BOOK_VISIT_SCREEN_COPY.context.quoteLabel}
          value={quoteLabel}
          theme={theme}
          metrics={metrics}
        />
      </View>
    </View>
  );
}

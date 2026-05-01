import React from "react";
import { Text, View } from "react-native";
import { BOOK_VISIT_SCREEN_COPY } from "./bookVisit.content";

export default function BookVisitActionIsland({
  theme,
  metrics,
  currentStepLabel,
  nextStepLabel,
  selections,
  quoteLabel,
  loading = false,
}) {
  if (loading) {
    return (
      <View style={{ gap: metrics.spacing.lg }}>
        <View
          style={{
            width: 120,
            height: 24,
            borderRadius: 12,
            backgroundColor: theme.skeletonBase,
          }}
        />
        <View
          style={{
            width: "100%",
            height: 220,
            borderRadius: metrics.radii.xl,
            backgroundColor: theme.skeletonSoft,
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: metrics.spacing.lg }}>
      <Text
        style={{
          color: theme.text,
          fontSize: metrics.typography.title.fontSize,
          lineHeight: metrics.typography.title.lineHeight,
          fontWeight: "700",
          letterSpacing: -0.25,
        }}
      >
        {BOOK_VISIT_SCREEN_COPY.island.title}
      </Text>

      <View
        style={{
          gap: metrics.spacing.lg,
          padding: metrics.spacing.lg,
          borderRadius: metrics.radii.xl,
          backgroundColor: theme.card,
        }}
      >
        <View style={{ gap: metrics.spacing.xs }}>
          <Text
            style={{
              color: theme.textMuted,
              fontSize: metrics.typography.caption.fontSize,
              lineHeight: metrics.typography.caption.lineHeight,
              fontWeight: "400",
            }}
          >
            {BOOK_VISIT_SCREEN_COPY.island.stepLabel}
          </Text>
          <Text
            style={{
              color: theme.text,
              fontSize: metrics.typography.heading.fontSize,
              lineHeight: metrics.typography.heading.lineHeight,
              fontWeight: "600",
            }}
          >
            {currentStepLabel}
          </Text>
          <Text
            style={{
              color: theme.textMuted,
              fontSize: metrics.typography.body.fontSize,
              lineHeight: metrics.typography.body.lineHeight,
              fontWeight: "400",
            }}
          >
            Next: {nextStepLabel}
          </Text>
        </View>

        <View style={{ gap: metrics.spacing.sm }}>
          {selections.map((selection) => (
            <View key={selection.key} style={{ gap: 2 }}>
              <Text
                style={{
                  color: theme.textMuted,
                  fontSize: metrics.typography.caption.fontSize,
                  lineHeight: metrics.typography.caption.lineHeight,
                  fontWeight: "400",
                }}
              >
                {selection.label}
              </Text>
              <Text
                style={{
                  color: theme.text,
                  fontSize: metrics.typography.body.fontSize,
                  lineHeight: metrics.typography.body.lineHeight,
                  fontWeight: "600",
                }}
              >
                {selection.value}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ gap: 2 }}>
          <Text
            style={{
              color: theme.textMuted,
              fontSize: metrics.typography.caption.fontSize,
              lineHeight: metrics.typography.caption.lineHeight,
              fontWeight: "400",
            }}
          >
            {BOOK_VISIT_SCREEN_COPY.context.quoteLabel}
          </Text>
          <Text
            style={{
              color: theme.text,
              fontSize: metrics.typography.heading.fontSize,
              lineHeight: metrics.typography.heading.lineHeight,
              fontWeight: "600",
            }}
          >
            {quoteLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

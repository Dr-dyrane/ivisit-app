import React from "react";
import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../constants/colors";
import { MEDICAL_PROFILE_SCREEN_COPY } from "./medicalProfileScreen.content";

// PULLBACK NOTE: The action island fills XL dead space with compact status and one primary action.
// It mirrors the newer payment/emergency/profile wide-screen pattern instead of stretching the editor.

export default function MedicalProfileActionIsland({
  theme,
  metrics,
  completionLabel,
  criticalStatusLabel,
  historyStatusLabel,
  notesStatusLabel,
  syncNotice,
  onEditProfile,
  loading = false,
}) {
  if (loading) {
    return (
      <View
        style={{
          gap: metrics.spacing.md,
        }}
      >
        <View
          style={{
            width: 128,
            height: 16,
            borderRadius: 999,
            backgroundColor: theme.skeletonSoft,
          }}
        />

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: metrics.radii.xl,
            borderCurve: "continuous",
            padding: metrics.spacing.lg,
            gap: metrics.spacing.md,
          }}
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <View key={`health-status-skeleton-${index}`} style={{ gap: 6 }}>
              <View
                style={{
                  width: index % 2 === 0 ? "40%" : "34%",
                  height: 11,
                  borderRadius: 999,
                  backgroundColor: theme.skeletonSoft,
                }}
              />
              <View
                style={{
                  width: index % 2 === 0 ? "56%" : "62%",
                  height: 13,
                  borderRadius: 999,
                  backgroundColor: theme.skeletonBase,
                }}
              />
            </View>
          ))}

          <View
            style={{
              minHeight: metrics.sizing.buttonHeight,
              borderRadius: metrics.radii.lg,
              borderCurve: "continuous",
              backgroundColor: theme.skeletonBase,
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        gap: metrics.spacing.md,
      }}
    >
      <Text
        style={{
          color: theme.text,
          fontSize: metrics.typography.heading.fontSize,
          lineHeight: metrics.typography.heading.lineHeight,
          fontWeight: "600",
          letterSpacing: -0.2,
        }}
      >
        {MEDICAL_PROFILE_SCREEN_COPY.island.title}
      </Text>

      <View
        style={{
          backgroundColor: theme.card,
          borderRadius: metrics.radii.xl,
          borderCurve: "continuous",
          padding: metrics.spacing.lg,
          gap: metrics.spacing.md,
        }}
      >
        <IslandStatus
          label={MEDICAL_PROFILE_SCREEN_COPY.context.completionLabel}
          value={completionLabel}
          theme={theme}
          metrics={metrics}
        />
        <IslandStatus
          label={MEDICAL_PROFILE_SCREEN_COPY.island.criticalLabel}
          value={criticalStatusLabel}
          theme={theme}
          metrics={metrics}
        />
        <IslandStatus
          label={MEDICAL_PROFILE_SCREEN_COPY.island.historyLabel}
          value={historyStatusLabel}
          theme={theme}
          metrics={metrics}
        />
        <IslandStatus
          label={MEDICAL_PROFILE_SCREEN_COPY.island.notesLabel}
          value={notesStatusLabel}
          theme={theme}
          metrics={metrics}
        />

        {syncNotice ? (
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
            onEditProfile?.();
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
            }}
          >
            {MEDICAL_PROFILE_SCREEN_COPY.context.primaryAction}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function IslandStatus({ label, value, theme, metrics }) {
  return (
    <View style={{ gap: 4 }}>
      <Text
        style={{
          color: theme.textMuted,
          fontSize: metrics.typography.caption.fontSize,
          lineHeight: metrics.typography.caption.lineHeight,
          fontWeight: "400",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: theme.text,
          fontSize: metrics.typography.body.fontSize,
          lineHeight: metrics.typography.body.lineHeight,
          fontWeight: "600",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

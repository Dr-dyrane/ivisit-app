import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../constants/colors";
import { INSURANCE_SCREEN_COPY } from "./insuranceScreen.content";
import InsurancePolicyCard from "./InsurancePolicyCard";

function PolicyCardSkeleton({ theme, metrics }) {
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
      <View style={{ gap: 10 }}>
        <View
          style={{
            width: 88,
            height: 12,
            borderRadius: 999,
            backgroundColor: theme.skeletonSoft,
          }}
        />
        <View
          style={{
            width: "58%",
            height: 24,
            borderRadius: 999,
            backgroundColor: theme.skeletonBase,
          }}
        />
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
            width: "66%",
            height: 16,
            borderRadius: 999,
            backgroundColor: theme.skeletonBase,
          }}
        />
      </View>

      <View style={{ flexDirection: "row", gap: metrics.spacing.sm }}>
        <View
          style={{
            flex: 1,
            minHeight: metrics.sizing.buttonHeight,
            borderRadius: metrics.radii.lg,
            borderCurve: "continuous",
            backgroundColor: theme.skeletonSoft,
          }}
        />
        <View
          style={{
            flex: 1,
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

// PULLBACK NOTE: Insurance keeps a card list instead of the mini-profile blade list.
// The feature has richer per-row actions, but the shell, copy restraint, and loading posture now match the stack-screen family.

export default function InsurancePolicyList({
  policies,
  isDarkMode,
  theme,
  metrics,
  loading = false,
  onAddCoverage,
  onEditPolicy,
  onDeletePolicy,
  onSetDefaultPolicy,
  onLinkPayment,
  contentPaddingHorizontal = 12,
}) {
  if (loading) {
    return (
      <View
        style={{
          marginHorizontal: contentPaddingHorizontal,
          gap: metrics.spacing.md,
        }}
      >
        {Array.from({ length: 2 }).map((_, index) => (
          <PolicyCardSkeleton
            key={`insurance-policy-skeleton-${index}`}
            theme={theme}
            metrics={metrics}
          />
        ))}
      </View>
    );
  }

  if (!policies?.length) {
    return (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onAddCoverage?.();
        }}
        style={({ pressed }) => ({
          marginHorizontal: contentPaddingHorizontal,
          backgroundColor: theme.card,
          borderRadius: metrics.radii.xl,
          borderCurve: "continuous",
          padding: metrics.spacing.xl,
          gap: metrics.spacing.md,
          alignItems: "center",
          opacity: pressed ? 0.97 : 1,
        })}
      >
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: 24,
            borderCurve: "continuous",
            backgroundColor: `${COLORS.brandPrimary}16`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={36}
            color={COLORS.brandPrimary}
          />
        </View>

        <View style={{ gap: 8, alignItems: "center" }}>
          <Text
            style={{
              color: theme.text,
              fontSize: 24,
              lineHeight: 30,
              fontWeight: "700",
              letterSpacing: -0.35,
              textAlign: "center",
            }}
          >
            {INSURANCE_SCREEN_COPY.empty.title}
          </Text>
          <Text
            style={{
              color: theme.textMuted,
              fontSize: metrics.typography.body.fontSize,
              lineHeight: metrics.typography.body.lineHeight,
              fontWeight: "400",
              textAlign: "center",
            }}
          >
            {INSURANCE_SCREEN_COPY.empty.body}
          </Text>
        </View>

        <View
          style={{
            minHeight: metrics.sizing.buttonHeight,
            minWidth: 168,
            paddingHorizontal: 20,
            borderRadius: metrics.radii.lg,
            borderCurve: "continuous",
            backgroundColor: COLORS.brandPrimary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: metrics.typography.body.fontSize,
              lineHeight: metrics.typography.body.lineHeight,
              fontWeight: "600",
            }}
          >
            {INSURANCE_SCREEN_COPY.empty.primaryAction}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View
      style={{
        marginHorizontal: contentPaddingHorizontal,
        gap: metrics.spacing.md,
      }}
    >
      {policies.map((policy) => (
        <InsurancePolicyCard
          key={policy.id}
          policy={policy}
          isDarkMode={isDarkMode}
          theme={theme}
          metrics={metrics}
          onEdit={onEditPolicy}
          onDelete={onDeletePolicy}
          onSetDefault={onSetDefaultPolicy}
          onLinkPayment={onLinkPayment}
        />
      ))}
    </View>
  );
}

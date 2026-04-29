import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import { EMERGENCY_CONTACTS_COPY } from "./emergencyContacts.content";

// PULLBACK NOTE: EmergencyContacts wide-screen context island.
// Owns: sidebar guidance, counts, and product framing for MD+/desktop layouts.
// Does NOT own: canonical contact rendering or migration actions.

function ContextStat({ icon, label, value, metrics, theme, tone = "default" }) {
  const surfaceColor =
    tone === "warning"
      ? theme.warningSoft
      : tone === "success"
        ? theme.successSoft
        : theme.accentSoft;

  return (
    <View
      style={[
        styles.statRow,
        {
          paddingVertical: metrics.spacing.md,
          paddingHorizontal: metrics.spacing.md,
          borderRadius: metrics.radii.lg,
          backgroundColor: surfaceColor,
        },
      ]}
    >
      <View style={styles.statLeading}>
        <Ionicons name={icon} size={18} color={COLORS.brandPrimary} />
        <Text
          style={[
            styles.statLabel,
            {
              color: theme.muted,
              fontSize: Math.max(metrics.typography.caption.fontSize + 1, 13),
              lineHeight: Math.max(
                metrics.typography.caption.lineHeight + 1,
                17,
              ),
              fontWeight: "500",
            },
          ]}
        >
          {label}
        </Text>
      </View>
      <Text
        style={[
          styles.statValue,
          {
            color: theme.text,
            fontSize: Math.max(metrics.typography.title.fontSize + 2, 22),
            lineHeight: Math.max(metrics.typography.title.lineHeight + 2, 28),
            fontWeight: "700",
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export default function EmergencyContactsContextPane({
  theme,
  metrics,
  contactCount = 0,
  reachableCount = 0,
  reviewCount = 0,
}) {
  const copy = EMERGENCY_CONTACTS_COPY.context;
  const needsReview = reviewCount > 0;
  const footerText = needsReview ? copy.footerNeedsReview : null;

  return (
    <View style={{ gap: metrics.spacing.lg }}>
      <View style={{ gap: metrics.spacing.sm }}>
        <Text
          style={[
            styles.eyebrow,
            {
              color: COLORS.brandPrimary,
              fontSize: Math.max(metrics.typography.caption.fontSize - 1, 10),
              lineHeight: Math.max(
                metrics.typography.caption.lineHeight - 2,
                14,
              ),
              fontWeight: "600",
            },
          ]}
        >
          {copy.eyebrow}
        </Text>
        <Text
          style={[
            styles.title,
            {
              color: theme.text,
              fontSize: Math.max(metrics.typography.title.fontSize + 6, 26),
              lineHeight: Math.max(metrics.typography.title.lineHeight + 8, 34),
              fontWeight: "700",
            },
          ]}
        >
          {copy.title}
        </Text>
        <Text
          style={[
            styles.body,
            {
              color: theme.muted,
              fontSize: Math.max(metrics.typography.body.fontSize + 1, 15),
              lineHeight: Math.max(metrics.typography.body.lineHeight + 2, 22),
              fontWeight: "400",
            },
          ]}
        >
          {copy.body}
        </Text>
      </View>

      <View style={{ gap: metrics.spacing.sm }}>
        <ContextStat
          icon="people"
          label={copy.stats.saved}
          value={contactCount}
          metrics={metrics}
          theme={theme}
        />
        <ContextStat
          icon="call"
          label={copy.stats.reachable}
          value={reachableCount}
          metrics={metrics}
          theme={theme}
          tone="success"
        />
        <ContextStat
          icon={needsReview ? "alert-circle" : "checkmark-done"}
          label={copy.stats.review}
          value={reviewCount}
          metrics={metrics}
          theme={theme}
          tone={needsReview ? "warning" : "default"}
        />
      </View>

      {footerText ? (
        <View
          style={[
            styles.footerCard,
            {
              borderRadius: metrics.radii.lg,
              padding: metrics.spacing.md,
              backgroundColor: theme.accentSoft,
              borderColor: theme.border,
            },
          ]}
        >
          <Ionicons name="shield-half" size={18} color={COLORS.brandPrimary} />
          <Text
            style={[
              styles.footerText,
              {
                color: theme.text,
                fontSize: Math.max(metrics.typography.caption.fontSize + 1, 13),
                lineHeight: Math.max(
                  metrics.typography.caption.lineHeight + 3,
                  19,
                ),
                fontWeight: "400",
              },
            ]}
          >
            {footerText}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    letterSpacing: -0.8,
  },
  body: {},
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  statLeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  statLabel: {},
  statValue: {
    letterSpacing: -0.3,
  },
  footerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
  },
  footerText: {
    flex: 1,
  },
});

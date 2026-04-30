import React from "react";
import { Text, View } from "react-native";
import { NOTIFICATION_DETAILS_COPY } from "./notificationDetails.content";

export default function NotificationDetailsContextPane({
  theme,
  metrics,
  model,
}) {
  return (
    <View style={{ gap: metrics.spacing.lg }}>
      <View style={{ gap: 8 }}>
        <Text
          style={{
            color: theme.text,
            fontSize: 30,
            lineHeight: 34,
            fontWeight: "700",
            letterSpacing: -0.4,
          }}
        >
          {NOTIFICATION_DETAILS_COPY.context.title}
        </Text>
        <Text
          style={{
            color: theme.textMuted,
            fontSize: 15,
            lineHeight: 22,
            fontWeight: "400",
          }}
        >
          {NOTIFICATION_DETAILS_COPY.context.body}
        </Text>
      </View>

      <View
        style={{
          borderRadius: 22,
          padding: metrics.spacing.lg,
          gap: metrics.spacing.md,
          backgroundColor: theme.cardMuted,
        }}
      >
        <ContextRow
          label={NOTIFICATION_DETAILS_COPY.context.statusLabel}
          value={model.statusLabel}
          theme={theme}
        />
        <ContextRow
          label={NOTIFICATION_DETAILS_COPY.context.inboxLabel}
          value={model.headerSubtitle}
          theme={theme}
        />
        <ContextRow
          label={NOTIFICATION_DETAILS_COPY.context.visitLabel}
          value={model.linkedVisit?.title || "No linked visit"}
          theme={theme}
        />
      </View>
    </View>
  );
}

function ContextRow({ label, value, theme }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Text
        style={{
          color: theme.textMuted,
          fontSize: 14,
          fontWeight: "500",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: theme.text,
          fontSize: 15,
          fontWeight: "600",
          flex: 1,
          textAlign: "right",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

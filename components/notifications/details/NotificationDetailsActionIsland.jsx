import React from "react";
import { Pressable, Text, View } from "react-native";
import { NOTIFICATION_DETAILS_COPY } from "./notificationDetails.content";

function IslandButton({ label, onPress, theme, primary = false }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        borderRadius: 18,
        paddingHorizontal: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: primary ? "#86100E" : theme.cardMuted,
        opacity: pressed ? 0.88 : 1,
      })}
    >
      <Text
        style={{
          color: primary ? "#FFFFFF" : theme.text,
          fontSize: 15,
          fontWeight: "700",
          letterSpacing: -0.2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function NotificationDetailsActionIsland({
  theme,
  metrics,
  model,
}) {
  return (
    <View style={{ gap: metrics.spacing.lg }}>
      <Text
        style={{
          color: theme.text,
          fontSize: 18,
          fontWeight: "700",
          letterSpacing: -0.2,
        }}
      >
        {NOTIFICATION_DETAILS_COPY.island.title}
      </Text>

      <View
        style={{
          borderRadius: 24,
          padding: metrics.spacing.lg,
          gap: metrics.spacing.md,
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <IslandStat
          label={NOTIFICATION_DETAILS_COPY.island.inboxLabel}
          value={model.headerSubtitle}
          theme={theme}
        />
        <IslandStat
          label={NOTIFICATION_DETAILS_COPY.island.visitLabel}
          value={model.linkedVisit?.title || NOTIFICATION_DETAILS_COPY.island.fallbackLabel}
          theme={theme}
        />

        {model.primaryActionLabel ? (
          <IslandButton
            label={model.primaryActionLabel}
            onPress={model.onPrimaryAction}
            theme={theme}
            primary
          />
        ) : null}

        {model.linkedVisit ? (
          <IslandButton
            label={NOTIFICATION_DETAILS_COPY.rows.openVisit}
            onPress={model.openLinkedVisit}
            theme={theme}
          />
        ) : null}

        <IslandButton
          label={NOTIFICATION_DETAILS_COPY.rows.openInbox}
          onPress={model.openInbox}
          theme={theme}
        />
      </View>
    </View>
  );
}

function IslandStat({ label, value, theme }) {
  return (
    <View style={{ gap: 4 }}>
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
          fontSize: 16,
          fontWeight: "600",
          lineHeight: 22,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

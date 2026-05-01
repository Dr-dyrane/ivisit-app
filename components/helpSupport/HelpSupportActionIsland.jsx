import React from "react";
import { Pressable, Text, View } from "react-native";
import { COLORS } from "../../constants/colors";
import { HELP_SUPPORT_SCREEN_COPY } from "./helpSupport.content";

function IslandButton({ label, onPress, theme, primary = false }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 50,
        borderRadius: 18,
        paddingHorizontal: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: primary ? COLORS.brandPrimary : theme.cardMuted,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Text
        style={{
          color: primary ? "#FFFFFF" : theme.text,
          fontSize: 15,
          lineHeight: 20,
          fontWeight: "700",
          letterSpacing: -0.2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function IslandStat({ label, value, theme }) {
  return (
    <View style={{ gap: 4 }}>
      <Text
        style={{
          color: theme.textMuted,
          fontSize: 14,
          lineHeight: 18,
          fontWeight: "400",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: theme.text,
          fontSize: 16,
          lineHeight: 22,
          fontWeight: "600",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export default function HelpSupportActionIsland({
  theme,
  metrics,
  openCountLabel,
  latestTicketLabel,
  latestStatusLabel,
  faqCountLabel,
  hasError = false,
  onOpenComposer,
  onRefresh,
  onRetry,
}) {
  const copy = HELP_SUPPORT_SCREEN_COPY.island;

  return (
    <View style={{ gap: metrics.spacing.lg }}>
      <Text
        style={{
          color: theme.text,
          fontSize: 18,
          lineHeight: 24,
          fontWeight: "700",
          letterSpacing: -0.2,
        }}
      >
        {copy.title}
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
          label={copy.openLabel}
          value={openCountLabel}
          theme={theme}
        />
        <IslandStat
          label={copy.latestLabel}
          value={latestTicketLabel}
          theme={theme}
        />
        <IslandStat
          label={copy.statusLabel}
          value={latestStatusLabel}
          theme={theme}
        />
        <IslandStat
          label={copy.faqLabel}
          value={faqCountLabel}
          theme={theme}
        />

        <IslandButton
          label={copy.composeAction}
          onPress={onOpenComposer}
          theme={theme}
          primary
        />
        <IslandButton
          label={hasError ? copy.retryAction : copy.refreshAction}
          onPress={hasError ? onRetry : onRefresh}
          theme={theme}
        />
      </View>
    </View>
  );
}

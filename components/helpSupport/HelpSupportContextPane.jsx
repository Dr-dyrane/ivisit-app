import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { COLORS } from "../../constants/colors";
import { HELP_SUPPORT_SCREEN_COPY } from "./helpSupport.content";

function StatRow({ icon, label, value, theme }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: theme.cardMuted,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={14} color={COLORS.brandPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: theme.textMuted,
            fontSize: 12,
            lineHeight: 16,
            fontWeight: "400",
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: theme.text,
            fontSize: 13,
            lineHeight: 18,
            fontWeight: "600",
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function HelpSupportContextPane({
  theme,
  metrics,
  openCountLabel,
  answeredCountLabel,
  faqCountLabel,
  onOpenComposer,
}) {
  const copy = HELP_SUPPORT_SCREEN_COPY.context;

  return (
    <View
      style={{
        borderRadius: metrics.radii.xl,
        padding: metrics.spacing.lg,
        gap: metrics.spacing.lg,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <View style={{ gap: metrics.spacing.sm }}>
        <Text
          style={{
            color: theme.text,
            fontSize: 22,
            lineHeight: 28,
            fontWeight: "700",
            letterSpacing: -0.3,
          }}
        >
          {copy.title}
        </Text>
        <Text
          style={{
            color: theme.textMuted,
            fontSize: 15,
            lineHeight: 22,
            fontWeight: "400",
          }}
        >
          {copy.body}
        </Text>
      </View>

      <View
        style={{
          borderRadius: metrics.radii.lg,
          padding: metrics.spacing.md,
          gap: metrics.spacing.md,
          backgroundColor: theme.cardMuted,
        }}
      >
        <StatRow
          icon="chatbox-ellipses-outline"
          label={copy.openLabel}
          value={openCountLabel}
          theme={theme}
        />
        <StatRow
          icon="checkmark-done-outline"
          label={copy.answeredLabel}
          value={answeredCountLabel}
          theme={theme}
        />
        <StatRow
          icon="help-circle-outline"
          label={copy.faqLabel}
          value={faqCountLabel}
          theme={theme}
        />
      </View>

      <Pressable
        onPress={onOpenComposer}
        style={({ pressed }) => ({
          minHeight: 48,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: COLORS.brandPrimary,
          opacity: pressed ? 0.92 : 1,
        })}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 16,
            lineHeight: 20,
            fontWeight: "700",
            letterSpacing: -0.2,
          }}
        >
          {copy.primaryAction}
        </Text>
      </Pressable>
    </View>
  );
}

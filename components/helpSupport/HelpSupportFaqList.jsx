import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { COLORS } from "../../constants/colors";
import { HELP_SUPPORT_SCREEN_COPY } from "./helpSupport.content";

function FaqRow({ faq, expanded, onPress, theme, metrics }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: metrics.radii.lg,
        padding: metrics.spacing.md,
        gap: metrics.spacing.sm,
        backgroundColor: theme.cardMuted,
        opacity: pressed ? 0.95 : 1,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: metrics.spacing.sm,
        }}
      >
        <View style={{ flex: 1, gap: metrics.spacing.xs }}>
          <Text
            style={{
              color: theme.text,
              fontSize: 15,
              lineHeight: 21,
              fontWeight: "600",
              letterSpacing: -0.15,
            }}
          >
            {faq.question}
          </Text>
          {faq.category ? (
            <Text
              style={{
                color: COLORS.brandPrimary,
                fontSize: 12,
                lineHeight: 16,
                fontWeight: "500",
              }}
            >
              {faq.category}
            </Text>
          ) : null}
        </View>
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            backgroundColor: expanded ? theme.pillActive : theme.card,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={expanded ? "remove" : "add"}
            size={16}
            color={expanded ? COLORS.brandPrimary : theme.textMuted}
          />
        </View>
      </View>
      {expanded ? (
        <Text
          style={{
            color: theme.textMuted,
            fontSize: 14,
            lineHeight: 21,
            fontWeight: "400",
          }}
        >
          {faq.answer}
        </Text>
      ) : null}
    </Pressable>
  );
}

function FaqSkeleton({ theme, metrics }) {
  const rows = [0, 1, 2];
  return (
    <View style={{ gap: metrics.spacing.sm }}>
      {rows.map((row) => (
        <View
          key={row}
          style={{
            borderRadius: metrics.radii.lg,
            padding: metrics.spacing.md,
            gap: metrics.spacing.sm,
            backgroundColor: theme.cardMuted,
          }}
        >
          <View
            style={{
              width: row === 1 ? "74%" : "88%",
              height: 16,
              borderRadius: 999,
              backgroundColor: theme.skeletonBase,
            }}
          />
          <View
            style={{
              width: "30%",
              height: 12,
              borderRadius: 999,
              backgroundColor: theme.skeletonSoft,
            }}
          />
        </View>
      ))}
    </View>
  );
}

export default function HelpSupportFaqList({
  faqs,
  loading = false,
  theme,
  metrics,
  expandedFaqIds,
  onToggleFaq,
}) {
  if (loading) {
    return <FaqSkeleton theme={theme} metrics={metrics} />;
  }

  if (!faqs.length) {
    return (
      <View
        style={{
          borderRadius: metrics.radii.lg,
          padding: metrics.spacing.lg,
          gap: metrics.spacing.sm,
          backgroundColor: theme.cardMuted,
        }}
      >
        <Text
          style={{
            color: theme.text,
            fontSize: 16,
            lineHeight: 22,
            fontWeight: "600",
          }}
        >
          {HELP_SUPPORT_SCREEN_COPY.center.emptyFaqTitle}
        </Text>
        <Text
          style={{
            color: theme.textMuted,
            fontSize: 14,
            lineHeight: 21,
            fontWeight: "400",
          }}
        >
          {HELP_SUPPORT_SCREEN_COPY.center.emptyFaqBody}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: metrics.spacing.sm }}>
      {faqs.map((faq) => (
        <FaqRow
          key={faq.id}
          faq={faq}
          expanded={expandedFaqIds.has(faq.id)}
          onPress={() => onToggleFaq(faq.id)}
          theme={theme}
          metrics={metrics}
        />
      ))}
    </View>
  );
}

import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "react-native";
import { COLORS } from "../../constants/colors";
import { HELP_SUPPORT_SCREEN_COPY } from "./helpSupport.content";

function FeedbackButton({ icon, label, selected, onPress, theme, metrics }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 36,
        flexDirection: "row",
        alignItems: "center",
        gap: metrics.spacing.xs,
        paddingHorizontal: metrics.spacing.sm,
        borderRadius: 999,
        backgroundColor: selected ? theme.pillActive : theme.card,
        opacity: pressed ? 0.82 : 1,
      })}
    >
      <Ionicons
        name={icon}
        size={15}
        color={selected ? COLORS.brandPrimary : theme.textMuted}
      />
      <Text
        style={{
          color: selected ? COLORS.brandPrimary : theme.textMuted,
          fontSize: 12,
          lineHeight: 16,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function HelpSupportAskIVisit({
  query,
  proposal,
  feedback,
  onQueryChange,
  onSubmit,
  onFeedback,
  onEscalate,
  theme,
  metrics,
}) {
  const copy = HELP_SUPPORT_SCREEN_COPY.ask;
  const hasQuery = query.trim().length > 0;
  const hasProposal = proposal?.kind && proposal.kind !== "idle";
  const hasSource = proposal?.kind === "faq_answer" && proposal.source;

  return (
    <View
      style={{
        borderRadius: metrics.radii.lg,
        padding: metrics.spacing.md,
        gap: metrics.spacing.md,
        backgroundColor: theme.cardMuted,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.pillActive,
          }}
        >
          <Ionicons
            name="sparkles-outline"
            size={19}
            color={COLORS.brandPrimary}
          />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              color: theme.text,
              fontSize: 16,
              lineHeight: 21,
              fontWeight: "700",
              letterSpacing: -0.15,
            }}
          >
            {copy.title}
          </Text>
          <Text
            style={{
              color: theme.textMuted,
              fontSize: 13,
              lineHeight: 18,
              fontWeight: "400",
            }}
          >
            {copy.body}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: metrics.spacing.sm,
        }}
      >
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          onSubmitEditing={onSubmit}
          placeholder={copy.placeholder}
          placeholderTextColor={theme.textMuted}
          returnKeyType="search"
          accessibilityLabel={copy.inputLabel}
          maxLength={500}
          style={{
            minHeight: 44,
            flex: 1,
            borderRadius: metrics.radii.md,
            paddingHorizontal: metrics.spacing.md,
            color: theme.text,
            fontSize: 14,
            lineHeight: 20,
            backgroundColor: theme.card,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.askAction}
          accessibilityState={{ disabled: !hasQuery }}
          disabled={!hasQuery}
          onPress={onSubmit}
          style={({ pressed }) => ({
            minWidth: 44,
            minHeight: 44,
            borderRadius: metrics.radii.md,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: hasQuery ? COLORS.brandPrimary : theme.card,
            opacity: pressed ? 0.84 : hasQuery ? 1 : 0.58,
          })}
        >
          <Ionicons
            name="arrow-up"
            size={18}
            color={hasQuery ? "#FFFFFF" : theme.textMuted}
          />
        </Pressable>
      </View>

      {hasProposal ? (
        <View style={{ gap: metrics.spacing.sm }}>
          <Text
            style={{
              color: theme.text,
              fontSize: 14,
              lineHeight: 21,
              fontWeight: "400",
            }}
          >
            {proposal.answer}
          </Text>

          {hasSource ? (
            <View style={{ gap: 2 }}>
              <Text
                style={{
                  color: COLORS.brandPrimary,
                  fontSize: 12,
                  lineHeight: 16,
                  fontWeight: "600",
                }}
              >
                {copy.sourceLabel}: {proposal.source.label}
              </Text>
              <Text
                numberOfLines={2}
                style={{
                  color: theme.textMuted,
                  fontSize: 12,
                  lineHeight: 17,
                  fontWeight: "400",
                }}
              >
                {proposal.source.question}
              </Text>
            </View>
          ) : null}

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              gap: metrics.spacing.sm,
            }}
          >
            <Text
              style={{
                color: theme.textMuted,
                fontSize: 12,
                lineHeight: 16,
                fontWeight: "500",
              }}
            >
              {copy.feedbackPrompt}
            </Text>
            <FeedbackButton
              icon="thumbs-up-outline"
              label={copy.usefulAction}
              selected={feedback === "useful"}
              onPress={() => onFeedback("useful")}
              theme={theme}
              metrics={metrics}
            />
            <FeedbackButton
              icon="thumbs-down-outline"
              label={copy.notUsefulAction}
              selected={feedback === "not_useful"}
              onPress={() => onFeedback("not_useful")}
              theme={theme}
              metrics={metrics}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onEscalate}
            style={({ pressed }) => ({
              alignSelf: "flex-start",
              minHeight: 38,
              justifyContent: "center",
              paddingHorizontal: metrics.spacing.sm,
              borderRadius: 999,
              backgroundColor: theme.card,
              opacity: pressed ? 0.82 : 1,
            })}
          >
            <Text
              style={{
                color: COLORS.brandPrimary,
                fontSize: 13,
                lineHeight: 18,
                fontWeight: "700",
              }}
            >
              {copy.escalateAction}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

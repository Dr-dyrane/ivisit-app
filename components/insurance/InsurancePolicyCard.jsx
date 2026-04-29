import React, { useMemo, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../constants/colors";
import { INSURANCE_SCREEN_COPY } from "./insuranceScreen.content";

function maskPolicyNumber(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "Not provided";
  const visible = trimmed.slice(-4);
  return trimmed.length <= 4 ? trimmed : `**** ${visible}`;
}

function renderLinkedPaymentSummary(linkedPayment) {
  if (!linkedPayment) return null;
  if (typeof linkedPayment === "string") return "Linked card";

  const brand = linkedPayment.brand || linkedPayment.type || "Card";
  const last4 = linkedPayment.last4 ? `**** ${linkedPayment.last4}` : "";
  const expiry = linkedPayment.expiry ? ` | ${linkedPayment.expiry}` : "";
  return `${brand} ${last4}${expiry}`.trim();
}

// PULLBACK NOTE: Insurance keeps a richer artifact card than the mini-profile blades.
// The card still supports reveal/default/payment actions, but the typography and copy now follow the calmer stack-screen grammar.

export default function InsurancePolicyCard({
  policy,
  isDarkMode,
  theme,
  metrics,
  onEdit,
  onDelete,
  onSetDefault,
  onLinkPayment,
}) {
  const [unmasked, setUnmasked] = useState(false);
  const [selected, setSelected] = useState(false);

  const linkedPaymentSummary = useMemo(
    () => renderLinkedPaymentSummary(policy?.linked_payment_method),
    [policy?.linked_payment_method],
  );

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setUnmasked((current) => !current);
      }}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelected((current) => !current);
      }}
      style={({ pressed }) => ({
        backgroundColor: theme.card,
        borderRadius: metrics.radii.xl,
        borderCurve: "continuous",
        padding: metrics.spacing.lg,
        gap: metrics.spacing.md,
        borderWidth: policy?.is_default || selected || unmasked ? 1.5 : 1,
        borderColor: policy?.is_default
          ? COLORS.brandPrimary
          : selected || unmasked
            ? `${COLORS.brandPrimary}55`
            : theme.border,
        shadowColor: policy?.is_default ? COLORS.brandPrimary : "#000000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: isDarkMode ? 0.24 : 0.08,
        shadowRadius: 18,
        elevation: 6,
        opacity: pressed ? 0.98 : 1,
        transform: [{ scale: pressed ? 0.995 : 1 }],
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: metrics.spacing.md,
        }}
      >
        <View style={{ flex: 1, gap: 6 }}>
          {policy?.is_default ? (
            <View
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 999,
                borderCurve: "continuous",
                backgroundColor: `${COLORS.brandPrimary}14`,
              }}
            >
              <Text
                style={{
                  color: COLORS.brandPrimary,
                  fontSize: 11,
                  lineHeight: 14,
                  fontWeight: "600",
                }}
              >
                {INSURANCE_SCREEN_COPY.policyCard.defaultPill}
              </Text>
            </View>
          ) : null}

          <Text
            style={{
              color: theme.text,
              fontSize: Math.max(metrics.typography.title.fontSize + 2, 22),
              lineHeight: Math.max(metrics.typography.title.lineHeight + 2, 28),
              fontWeight: "700",
              letterSpacing: -0.3,
            }}
          >
            {policy?.provider_name || "Coverage provider"}
          </Text>
        </View>

        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 16,
            borderCurve: "continuous",
            backgroundColor: `${COLORS.brandPrimary}16`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={unmasked ? "eye-off-outline" : "shield-checkmark-outline"}
            size={22}
            color={COLORS.brandPrimary}
          />
        </View>
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
        <PolicyMetaBlock
          label={INSURANCE_SCREEN_COPY.editor.policyLabel}
          value={
            unmasked
              ? policy?.policy_number || "Not provided"
              : maskPolicyNumber(policy?.policy_number)
          }
          theme={theme}
          metrics={metrics}
          mono
        />

        {unmasked && policy?.group_number ? (
          <PolicyMetaBlock
            label={INSURANCE_SCREEN_COPY.policyCard.groupLabel}
            value={policy.group_number}
            theme={theme}
            metrics={metrics}
          />
        ) : null}

        {unmasked && policy?.policy_holder_name ? (
          <PolicyMetaBlock
            label={INSURANCE_SCREEN_COPY.policyCard.holderLabel}
            value={policy.policy_holder_name}
            theme={theme}
            metrics={metrics}
          />
        ) : null}

        {linkedPaymentSummary ? (
          <PolicyMetaBlock
            label={INSURANCE_SCREEN_COPY.policyCard.paymentLinkedLabel}
            value={linkedPaymentSummary}
            theme={theme}
            metrics={metrics}
          />
        ) : null}
      </View>

      {!unmasked ? (
        <Text
          style={{
            color: theme.textMuted,
            fontSize: metrics.typography.caption.fontSize,
            lineHeight: metrics.typography.caption.lineHeight,
            fontWeight: "400",
            textAlign: "center",
          }}
        >
          {INSURANCE_SCREEN_COPY.policyCard.hint}
        </Text>
      ) : (
        <View style={{ gap: metrics.spacing.sm }}>
          <View style={{ flexDirection: "row", gap: metrics.spacing.sm }}>
            {!policy?.is_default ? (
              <ActionButton
                label={INSURANCE_SCREEN_COPY.policyCard.setDefault}
                tone="tint"
                onPress={() => onSetDefault?.(policy.id)}
                theme={theme}
                metrics={metrics}
              />
            ) : null}
            <ActionButton
              label={
                linkedPaymentSummary
                  ? INSURANCE_SCREEN_COPY.policyCard.updateCard
                  : INSURANCE_SCREEN_COPY.policyCard.linkPayment
              }
              tone="neutral"
              onPress={() => onLinkPayment?.(policy)}
              theme={theme}
              metrics={metrics}
            />
          </View>

          <View style={{ flexDirection: "row", gap: metrics.spacing.sm }}>
            <ActionButton
              label={INSURANCE_SCREEN_COPY.policyCard.edit}
              tone="neutral"
              onPress={() => onEdit?.(policy)}
              theme={theme}
              metrics={metrics}
            />
            <ActionButton
              label={
                policy?.is_default
                  ? INSURANCE_SCREEN_COPY.policyCard.removeDisabled
                  : INSURANCE_SCREEN_COPY.policyCard.remove
              }
              tone={policy?.is_default ? "muted" : "destructive"}
              onPress={() => onDelete?.(policy.id, policy.is_default)}
              disabled={policy?.is_default}
              theme={theme}
              metrics={metrics}
            />
          </View>
        </View>
      )}
    </Pressable>
  );
}

function PolicyMetaBlock({ label, value, theme, metrics, mono = false }) {
  return (
    <View style={{ gap: 4 }}>
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
          fontSize: 15,
          lineHeight: 20,
          fontWeight: "600",
          fontFamily:
            mono && Platform.OS === "ios"
              ? "Courier"
              : mono && Platform.OS !== "ios"
                ? "monospace"
                : undefined,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  tone,
  onPress,
  disabled = false,
  theme,
  metrics,
}) {
  const backgroundColor =
    tone === "tint"
      ? `${COLORS.brandPrimary}16`
      : tone === "destructive"
        ? "rgba(239,68,68,0.12)"
        : theme.cardMuted;
  const textColor =
    tone === "tint"
      ? COLORS.brandPrimary
      : tone === "destructive"
        ? COLORS.error
        : theme.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: metrics.sizing.buttonHeight,
        borderRadius: metrics.radii.lg,
        borderCurve: "continuous",
        backgroundColor,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
      })}
    >
      <Text
        style={{
          color: textColor,
          fontSize: 13,
          lineHeight: 18,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

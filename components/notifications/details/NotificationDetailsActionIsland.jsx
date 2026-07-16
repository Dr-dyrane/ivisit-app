import React from "react";
import { Pressable, Text, View } from "react-native";
import { NOTIFICATION_DETAILS_COPY } from "./notificationDetails.content";

function IslandButton({
  label,
  onPress,
  theme,
  primary = false,
  disabled = false,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        minHeight: 52,
        borderRadius: 18,
        paddingHorizontal: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: primary ? "#86100E" : theme.cardMuted,
        opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
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

        {model.cashApproval ? (
          <CashApprovalActions model={model} theme={theme} />
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

function CashApprovalActions({ model, theme }) {
  if (model.cashApprovalOutcome) {
    return (
      <Text
        style={{
          color: theme.textMuted,
          fontSize: 14,
          fontWeight: "600",
          lineHeight: 20,
        }}
      >
        {model.cashApprovalOutcome === "approved"
          ? NOTIFICATION_DETAILS_COPY.messages.cashApprovedOutcome
          : NOTIFICATION_DETAILS_COPY.messages.cashDeclinedOutcome}
      </Text>
    );
  }

  if (!model.canActOnCashApproval) {
    return (
      <Text
        style={{
          color: theme.textMuted,
          fontSize: 14,
          fontWeight: "500",
          lineHeight: 20,
        }}
      >
        {NOTIFICATION_DETAILS_COPY.messages.cashReadOnly}
      </Text>
    );
  }

  const isBusy = model.cashApprovalPending !== null;

  return (
    <>
      <IslandButton
        label={
          model.cashApprovalPending === "approve"
            ? NOTIFICATION_DETAILS_COPY.rows.approvingCash
            : NOTIFICATION_DETAILS_COPY.rows.approveCash
        }
        onPress={model.approveCashPayment}
        theme={theme}
        disabled={isBusy}
        primary
      />
      <IslandButton
        label={
          model.cashApprovalPending === "decline"
            ? NOTIFICATION_DETAILS_COPY.rows.decliningCash
            : NOTIFICATION_DETAILS_COPY.rows.declineCash
        }
        onPress={model.declineCashPayment}
        theme={theme}
        disabled={isBusy}
      />
    </>
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

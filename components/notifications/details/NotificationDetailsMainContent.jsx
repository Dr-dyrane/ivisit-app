import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getNotificationIcon } from "../../../constants/notifications";
import { NOTIFICATION_DETAILS_COPY } from "./notificationDetails.content";

function SkeletonBlock({ width, height, theme, radius = 14 }) {
  return (
    <View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: theme.skeletonBase,
      }}
    />
  );
}

function ActionButton({
  label,
  onPress,
  theme,
  destructive = false,
  disabled = false,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        height: 54,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: destructive ? "#86100E" : theme.actionSurface,
        opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
      })}
    >
      <Text
        style={{
          color: destructive ? "#FFFFFF" : theme.text,
          fontSize: 16,
          fontWeight: "700",
          letterSpacing: -0.2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CashApprovalCard({ model, theme, metrics }) {
  const outcome = model.cashApprovalOutcome;
  const isBusy = model.cashApprovalPending !== null;

  return (
    <DetailCard theme={theme} metrics={metrics}>
      <Text
        style={{
          color: theme.text,
          fontSize: 18,
          fontWeight: "700",
          letterSpacing: -0.2,
        }}
      >
        {NOTIFICATION_DETAILS_COPY.center.cashApprovalLabel}
      </Text>

      {outcome ? (
        <Text
          style={{
            color: theme.textMuted,
            fontSize: 15,
            lineHeight: 22,
            fontWeight: "600",
          }}
        >
          {outcome === "approved"
            ? NOTIFICATION_DETAILS_COPY.messages.cashApprovedOutcome
            : NOTIFICATION_DETAILS_COPY.messages.cashDeclinedOutcome}
        </Text>
      ) : !model.canActOnCashApproval ? (
        <Text
          style={{
            color: theme.textMuted,
            fontSize: 15,
            lineHeight: 22,
            fontWeight: "400",
          }}
        >
          {NOTIFICATION_DETAILS_COPY.messages.cashReadOnly}
        </Text>
      ) : (
        <>
          <ActionButton
            label={
              model.cashApprovalPending === "approve"
                ? NOTIFICATION_DETAILS_COPY.rows.approvingCash
                : NOTIFICATION_DETAILS_COPY.rows.approveCash
            }
            onPress={model.approveCashPayment}
            theme={theme}
            disabled={isBusy}
            destructive
          />
          <ActionButton
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
      )}
    </DetailCard>
  );
}

function DetailCard({ children, theme, metrics }) {
  return (
    <View
      style={{
        borderRadius: 24,
        padding: metrics.spacing.lg,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
        gap: metrics.spacing.md,
      }}
    >
      {children}
    </View>
  );
}

function MetadataRow({ label, value, theme }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
      }}
    >
      <Text
        style={{
          color: theme.textMuted,
          fontSize: 14,
          fontWeight: "500",
          flexShrink: 0,
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

export default function NotificationDetailsMainContent({
  model,
  theme,
  metrics,
  contentPaddingHorizontal = 0,
}) {
  if (model.isLoading) {
    return (
      <View style={{ gap: metrics.spacing.lg }}>
        <DetailCard theme={theme} metrics={metrics}>
          <SkeletonBlock width={56} height={56} theme={theme} radius={18} />
          <SkeletonBlock width="64%" height={18} theme={theme} />
          <SkeletonBlock width="92%" height={58} theme={theme} />
        </DetailCard>
        <DetailCard theme={theme} metrics={metrics}>
          <SkeletonBlock width="100%" height={16} theme={theme} />
          <SkeletonBlock width="84%" height={16} theme={theme} />
          <SkeletonBlock width="76%" height={16} theme={theme} />
        </DetailCard>
      </View>
    );
  }

  if (model.isMissing) {
    return (
      <DetailCard theme={theme} metrics={metrics}>
        <Text
          style={{
            color: theme.text,
            fontSize: 24,
            lineHeight: 30,
            fontWeight: "700",
            letterSpacing: -0.3,
          }}
        >
          {NOTIFICATION_DETAILS_COPY.center.missingTitle}
        </Text>
        <Text
          style={{
            color: theme.textMuted,
            fontSize: 15,
            lineHeight: 22,
            fontWeight: "400",
          }}
        >
          {NOTIFICATION_DETAILS_COPY.center.missingBody}
        </Text>
        <ActionButton
          label={NOTIFICATION_DETAILS_COPY.center.missingPrimary}
          onPress={model.openInbox}
          theme={theme}
          destructive
        />
      </DetailCard>
    );
  }

  const notification = model.notification;

  return (
    <View style={{ gap: metrics.spacing.lg, paddingHorizontal: contentPaddingHorizontal }}>
      <DetailCard theme={theme} metrics={metrics}>
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: `${model.priorityColor}18`,
          }}
        >
          <Ionicons
            name={getNotificationIcon(notification?.type)}
            size={28}
            color={model.priorityColor}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text
            style={{
              color: model.priorityColor,
              fontSize: 12,
              fontWeight: "600",
              letterSpacing: 0.3,
            }}
          >
            {model.headerSubtitle}
          </Text>
          <Text
            style={{
              color: theme.text,
              fontSize: 28,
              lineHeight: 34,
              fontWeight: "700",
              letterSpacing: -0.45,
            }}
          >
            {notification?.title}
          </Text>
        </View>

        <Text
          style={{
            color: theme.textMuted,
            fontSize: 16,
            lineHeight: 24,
            fontWeight: "400",
          }}
        >
          {notification?.message}
        </Text>
      </DetailCard>

      <DetailCard theme={theme} metrics={metrics}>
        <MetadataRow
          label={NOTIFICATION_DETAILS_COPY.center.statusLabel}
          value={model.statusLabel}
          theme={theme}
        />
        <MetadataRow
          label={NOTIFICATION_DETAILS_COPY.center.typeLabel}
          value={model.typeLabel}
          theme={theme}
        />
        <MetadataRow
          label={NOTIFICATION_DETAILS_COPY.center.priorityLabel}
          value={model.priorityLabel}
          theme={theme}
        />
        <MetadataRow
          label={NOTIFICATION_DETAILS_COPY.center.recordLabel}
          value={model.recordedAtLabel || model.relativeTime || "Unknown"}
          theme={theme}
        />
      </DetailCard>

      {model.cashApproval ? (
        <CashApprovalCard model={model} theme={theme} metrics={metrics} />
      ) : null}

      {model.linkedVisit ? (
        <DetailCard theme={theme} metrics={metrics}>
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: "700",
              letterSpacing: -0.2,
            }}
          >
            {NOTIFICATION_DETAILS_COPY.center.linkedVisitLabel}
          </Text>
          <Text
            style={{
              color: theme.text,
              fontSize: 16,
              fontWeight: "600",
            }}
          >
            {model.linkedVisit.title}
          </Text>
          <Text
            style={{
              color: theme.textMuted,
              fontSize: 14,
              lineHeight: 20,
              fontWeight: "400",
            }}
          >
            {model.linkedVisit.subtitle}
          </Text>
          <ActionButton
            label={NOTIFICATION_DETAILS_COPY.rows.openVisit}
            onPress={model.openLinkedVisit}
            theme={theme}
          />
        </DetailCard>
      ) : null}

      <View style={{ gap: metrics.spacing.sm }}>
        {model.primaryActionLabel ? (
          <ActionButton
            label={model.primaryActionLabel}
            onPress={model.onPrimaryAction}
            theme={theme}
            destructive
          />
        ) : null}
        <ActionButton
          label={NOTIFICATION_DETAILS_COPY.rows.openInbox}
          onPress={model.openInbox}
          theme={theme}
        />
      </View>
    </View>
  );
}

import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { COLORS } from "../../constants/colors";
import { SETTINGS_SCREEN_COPY } from "./settingsScreen.content";

function StatusRow({ icon, label, value, isDarkMode }) {
  const text = isDarkMode ? "#FFFFFF" : "#0F172A";
  const textMuted = isDarkMode ? "#94A3B8" : "#64748B";
  const surface = isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          borderCurve: "continuous",
          backgroundColor: surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={13} color={COLORS.brandPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, fontWeight: "400", color: textMuted }}>
          {label}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: "600", color: text }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  isDarkMode,
  destructive = false,
}) {
  const foreground = destructive ? COLORS.error : COLORS.brandPrimary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderCurve: "continuous",
        backgroundColor: pressed
          ? isDarkMode
            ? "rgba(255,255,255,0.1)"
            : "rgba(0,0,0,0.07)"
          : isDarkMode
            ? "rgba(255,255,255,0.06)"
            : "rgba(0,0,0,0.04)",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      })}
    >
      <Ionicons name={icon} size={15} color={foreground} />
      <Text style={{ fontSize: 13, fontWeight: "600", color: foreground }}>
        {label}
      </Text>
    </Pressable>
  );
}

function SkeletonStatusRow({ isDarkMode }) {
  const surface = isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const skeletonBase = isDarkMode
    ? "rgba(255,255,255,0.08)"
    : "rgba(15,23,42,0.07)";
  const skeletonSoft = isDarkMode
    ? "rgba(255,255,255,0.05)"
    : "rgba(15,23,42,0.05)";

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          borderCurve: "continuous",
          backgroundColor: surface,
        }}
      />
      <View style={{ flex: 1, gap: 6 }}>
        <View
          style={{
            width: "34%",
            height: 11,
            borderRadius: 999,
            backgroundColor: skeletonSoft,
          }}
        />
        <View
          style={{
            width: "52%",
            height: 13,
            borderRadius: 999,
            backgroundColor: skeletonBase,
          }}
        />
      </View>
    </View>
  );
}

function SkeletonQuickAction({ isDarkMode }) {
  return (
    <View
      style={{
        height: 40,
        borderRadius: 12,
        borderCurve: "continuous",
        backgroundColor: isDarkMode
          ? "rgba(255,255,255,0.06)"
          : "rgba(0,0,0,0.04)",
      }}
    />
  );
}

export default function SettingsActionIsland({
  isDarkMode,
  securitySummary,
  paymentsSummary,
  supportSummary,
  onPasswordPress,
  onPaymentsPress,
  onHelpPress,
  onContactSupportPress,
  onSignOutPress,
  passwordLabel,
  loading = false,
}) {
  const copy = SETTINGS_SCREEN_COPY.island;
  const text = isDarkMode ? "#FFFFFF" : "#0F172A";
  const textMuted = isDarkMode ? "#94A3B8" : "#64748B";
  const separator = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  if (loading) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 20, gap: 0 }}>
        <View style={{ gap: 16, paddingBottom: 20 }}>
          <View
            style={{
              width: 132,
              height: 18,
              borderRadius: 999,
              backgroundColor: isDarkMode
                ? "rgba(255,255,255,0.08)"
                : "rgba(15,23,42,0.07)",
            }}
          />
          <SkeletonStatusRow isDarkMode={isDarkMode} />
          <SkeletonStatusRow isDarkMode={isDarkMode} />
          <SkeletonStatusRow isDarkMode={isDarkMode} />
        </View>

        <View
          style={{ height: 1, backgroundColor: separator, marginBottom: 20 }}
        />

        <View style={{ gap: 12, paddingBottom: 20 }}>
          <View
            style={{
              width: 80,
              height: 12,
              borderRadius: 999,
              backgroundColor: isDarkMode
                ? "rgba(255,255,255,0.05)"
                : "rgba(15,23,42,0.05)",
            }}
          />
          <SkeletonQuickAction isDarkMode={isDarkMode} />
          <SkeletonQuickAction isDarkMode={isDarkMode} />
          <SkeletonQuickAction isDarkMode={isDarkMode} />
          <SkeletonQuickAction isDarkMode={isDarkMode} />
          <SkeletonQuickAction isDarkMode={isDarkMode} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 20, gap: 0 }}>
      <View style={{ gap: 16, paddingBottom: 20 }}>
        <Text
          style={{
            fontSize: 17,
            lineHeight: 22,
            fontWeight: "700",
            color: text,
          }}
        >
          {copy.title}
        </Text>
        <StatusRow
          icon="lock-closed-outline"
          label={copy.securityLabel}
          value={securitySummary}
          isDarkMode={isDarkMode}
        />
        <StatusRow
          icon="card-outline"
          label={copy.paymentsLabel}
          value={paymentsSummary}
          isDarkMode={isDarkMode}
        />
        <StatusRow
          icon="help-circle-outline"
          label={copy.supportLabel}
          value={supportSummary}
          isDarkMode={isDarkMode}
        />
      </View>

      <View
        style={{ height: 1, backgroundColor: separator, marginBottom: 20 }}
      />

      <View style={{ gap: 12, paddingBottom: 20 }}>
        <Text
          style={{
            fontSize: 12,
            lineHeight: 16,
            fontWeight: "600",
            color: textMuted,
          }}
        >
          {copy.quickActionsTitle}
        </Text>
        <QuickAction
          icon="lock-closed-outline"
          label={passwordLabel}
          onPress={onPasswordPress}
          isDarkMode={isDarkMode}
        />
        <QuickAction
          icon="card-outline"
          label={SETTINGS_SCREEN_COPY.rows.managePayments}
          onPress={onPaymentsPress}
          isDarkMode={isDarkMode}
        />
        <QuickAction
          icon="help-circle-outline"
          label={SETTINGS_SCREEN_COPY.rows.helpCenter}
          onPress={onHelpPress}
          isDarkMode={isDarkMode}
        />
        <QuickAction
          icon="chatbubble-ellipses-outline"
          label={SETTINGS_SCREEN_COPY.rows.contactSupport}
          onPress={onContactSupportPress}
          isDarkMode={isDarkMode}
        />
        <QuickAction
          icon="log-out-outline"
          label={SETTINGS_SCREEN_COPY.rows.signOut}
          onPress={onSignOutPress}
          isDarkMode={isDarkMode}
          destructive
        />
      </View>
    </View>
  );
}

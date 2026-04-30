import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { PROFILE_SCREEN_COPY } from "./profileScreen.content";

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

function QuickAction({ icon, label, onPress, isDarkMode }) {
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
      <Ionicons name={icon} size={15} color={COLORS.brandPrimary} />
      <Text
        style={{ fontSize: 13, fontWeight: "600", color: COLORS.brandPrimary }}
      >
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
            width: "38%",
            height: 11,
            borderRadius: 999,
            backgroundColor: skeletonSoft,
          }}
        />
        <View
          style={{
            width: "54%",
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

export default function ProfileActionIsland({
  isDarkMode,
  profileCompletionLabel,
  emergencyCountLabel,
  healthStatusLabel,
  coverageStatusLabel,
  onEditPersonalInfo,
  onOpenEmergencyContacts,
  onOpenHealthInfo,
  onOpenCoverage,
  loading = false,
}) {
  const copy = PROFILE_SCREEN_COPY.island;
  const text = isDarkMode ? "#FFFFFF" : "#0F172A";
  const textMuted = isDarkMode ? "#94A3B8" : "#64748B";
  const separator = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  if (loading) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 20, gap: 0 }}>
        <View style={{ gap: 16, paddingBottom: 20 }}>
          <View
            style={{
              width: 148,
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
          <SkeletonStatusRow isDarkMode={isDarkMode} />
        </View>

        <View
          style={{ height: 1, backgroundColor: separator, marginBottom: 20 }}
        />

        <View style={{ gap: 12, paddingBottom: 20 }}>
          <View
            style={{
              width: 92,
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
          icon="person-circle-outline"
          label={copy.primaryProfileLabel}
          value={profileCompletionLabel}
          isDarkMode={isDarkMode}
        />
        <StatusRow
          icon="people-outline"
          label={copy.emergencyLabel}
          value={emergencyCountLabel}
          isDarkMode={isDarkMode}
        />
        <StatusRow
          icon="medical-outline"
          label={copy.healthLabel}
          value={healthStatusLabel}
          isDarkMode={isDarkMode}
        />
        <StatusRow
          icon="shield-checkmark-outline"
          label={copy.coverageLabel}
          value={coverageStatusLabel}
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
          icon="create-outline"
          label={PROFILE_SCREEN_COPY.context.primaryAction}
          onPress={onEditPersonalInfo}
          isDarkMode={isDarkMode}
        />
        <QuickAction
          icon="people-outline"
          label={copy.emergencyLabel}
          onPress={onOpenEmergencyContacts}
          isDarkMode={isDarkMode}
        />
        <QuickAction
          icon="medical-outline"
          label={copy.healthLabel}
          onPress={onOpenHealthInfo}
          isDarkMode={isDarkMode}
        />
        <QuickAction
          icon="shield-checkmark-outline"
          label={copy.coverageLabel}
          onPress={onOpenCoverage}
          isDarkMode={isDarkMode}
        />
      </View>
    </View>
  );
}

import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import { EMERGENCY_CONTACTS_COPY } from "./emergencyContacts.content";

// PULLBACK NOTE: EmergencyContacts XL right context island.
// Owns: the right-side action/status surface that fills wide-screen dead space.
// Does NOT own: canonical list rendering or migration queue decisions.

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

export default function EmergencyContactsActionIsland({
  isDarkMode,
  primaryContact,
  reachableCount = 0,
  reviewCount = 0,
  selectionCount = 0,
  backendUnavailable = false,
  syncNotice = "",
  onAddContact,
  onReviewFirst,
}) {
  const copy = EMERGENCY_CONTACTS_COPY.island;
  const text = isDarkMode ? "#FFFFFF" : "#0F172A";
  const textMuted = isDarkMode ? "#94A3B8" : "#64748B";
  const separator = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const ghostBg = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const primaryTitle = primaryContact?.name || copy.primaryEmptyTitle;
  const primaryMeta = primaryContact?.relationship || "Emergency contact";
  const primaryPhone = primaryContact?.phone || copy.primaryEmptyBody;
  const hasReview = reviewCount > 0;
  const actionLabel = hasReview ? copy.reviewAction : copy.addAction;
  const actionIcon = hasReview ? "alert-circle-outline" : "person-add-outline";
  const actionPress = hasReview ? onReviewFirst : onAddContact;
  const statusValue = backendUnavailable ? copy.stateLocal : copy.stateServer;
  const footerText = syncNotice || copy.footerReady;

  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 20, gap: 0 }}>
      <View style={{ paddingBottom: 20, gap: 14 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            letterSpacing: 0.1,
            color: textMuted,
          }}
        >
          {copy.primaryTitle}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              borderCurve: "continuous",
              backgroundColor: ghostBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={primaryContact ? "call" : "person-outline"}
              size={18}
              color={COLORS.brandPrimary}
            />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                fontSize: 17,
                lineHeight: 22,
                fontWeight: "700",
                color: text,
              }}
            >
              {primaryTitle}
            </Text>
            <Text
              style={{
                fontSize: 13,
                lineHeight: 18,
                fontWeight: "400",
                color: textMuted,
              }}
            >
              {primaryMeta}
            </Text>
            <Text
              style={{
                fontSize: 13,
                lineHeight: 18,
                fontWeight: "600",
                color: text,
              }}
            >
              {primaryPhone}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={actionPress}
          style={({ pressed }) => ({
            marginTop: 4,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            borderCurve: "continuous",
            backgroundColor: pressed
              ? isDarkMode
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.07)"
              : ghostBg,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          })}
        >
          <Ionicons name={actionIcon} size={14} color={COLORS.brandPrimary} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: COLORS.brandPrimary,
              letterSpacing: 0.2,
            }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      </View>

      <View
        style={{ height: 1, backgroundColor: separator, marginBottom: 20 }}
      />

      <View style={{ gap: 16, paddingBottom: 20 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            letterSpacing: 0.1,
            color: textMuted,
          }}
        >
          {copy.stateTitle}
        </Text>
        <StatusRow
          icon="checkmark-done"
          label={copy.reachableLabel}
          value={`${reachableCount} contact${reachableCount === 1 ? "" : "s"}`}
          isDarkMode={isDarkMode}
        />
        <StatusRow
          icon={hasReview ? "alert-circle" : "shield-checkmark"}
          label={hasReview ? copy.reviewTitle : copy.reviewReady}
          value={
            hasReview
              ? `${reviewCount} contact${reviewCount === 1 ? "" : "s"}`
              : copy.reviewClear
          }
          isDarkMode={isDarkMode}
        />
        <StatusRow
          icon={backendUnavailable ? "cloud-offline" : "cloud-done"}
          label={copy.stateStorage}
          value={statusValue}
          isDarkMode={isDarkMode}
        />
        {selectionCount > 0 ? (
          <StatusRow
            icon="checkbox"
            label={copy.stateSelection}
            value={`${selectionCount} contact${selectionCount === 1 ? "" : "s"}`}
            isDarkMode={isDarkMode}
          />
        ) : null}
      </View>

      <View
        style={{ height: 1, backgroundColor: separator, marginBottom: 16 }}
      />

      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <Ionicons
          name="shield-checkmark"
          size={11}
          color={textMuted}
          style={{ marginTop: 1 }}
        />
        <Text
          style={{
            flex: 1,
            fontSize: 11,
            lineHeight: 16,
            fontWeight: "400",
            color: textMuted,
          }}
        >
          {footerText}
        </Text>
      </View>
    </View>
  );
}

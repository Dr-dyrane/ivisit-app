import React from "react";
import { View, Text, Pressable, Image, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";
import { getStatusColor, getVisitTypeIcon } from "../../constants/visits";

export default function VisitCard({ visit, isSelected, onSelect, onViewDetails, onDelete }) {
  const { isDarkMode } = useTheme();
  if (!visit) return null;

  // Theme-Based Color Logic (No Hard-coded Hex)
  const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
  const mutedColor = isDarkMode ? COLORS.textMutedDark : COLORS.textMuted;
  const cardBase = isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt;

  const activeBG = isSelected
    ? COLORS.brandPrimary + "15"
    : cardBase;

  const formatDate = (dateStr) => {
    if (!dateStr) return "No date";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const isUpcoming = visit?.status === "upcoming" || visit?.status === "in_progress";

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect?.(visit?.id);
      }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: activeBG,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          shadowColor: isSelected ? COLORS.brandPrimary : "#000",
          shadowOpacity: isDarkMode ? 0.3 : 0.08,
        },
      ]}
    >
      {/* Hero Image Section */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: visit?.image }} style={styles.image} resizeMode="cover" />
        <View style={[styles.statusBadge, { backgroundColor: COLORS.brandPrimary }]}>
          <Text style={styles.statusText}>
            {visit?.status?.replace("_", " ") || "pending"}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.headerRow}>
          <Text style={[styles.hospitalName, { color: textColor }]} numberOfLines={1}>
            {visit?.hospital || "Hospital"}
          </Text>
          <Text style={[styles.visitType, { color: mutedColor }]}>
            {visit?.type || "Appointment"}
          </Text>
        </View>

        {/* Identity Widget: Nested Squircle */}
        <View style={[styles.doctorWidget, { backgroundColor: isDarkMode ? COLORS.bgDark : COLORS.bgLight }]}>
          <View style={[styles.doctorSquircle, { backgroundColor: COLORS.brandPrimary + "15" }]}>
            <Text style={[styles.doctorInitials, { color: COLORS.brandPrimary }]}>
              {visit?.doctor?.split(" ")?.map(n => n?.[0])?.join("") || "D"}
            </Text>
          </View>
          <View style={styles.doctorInfo}>
            <Text style={[styles.doctorName, { color: textColor }]}>{visit?.doctor || "Doctor"}</Text>
            <Text style={[styles.specialtyText, { color: mutedColor }]}>{visit?.specialty || "Specialty"}</Text>
          </View>
        </View>

        {/* Meta Stats Pills */}
        <View style={styles.pillRow}>
          <View style={[styles.statPill, { backgroundColor: isDarkMode ? COLORS.bgDark : COLORS.bgLight }]}>
            <Ionicons name="calendar" size={12} color={COLORS.brandPrimary} />
            <Text style={[styles.statText, { color: textColor }]}>{formatDate(visit?.date)}</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: isDarkMode ? COLORS.bgDark : COLORS.bgLight }]}>
            <Ionicons name="time" size={12} color={COLORS.brandPrimary} />
            <Text style={[styles.statText, { color: textColor }]}>{visit?.time || "No time"}</Text>
          </View>
        </View>
      </View>

      {/* Selection Signature & Actions */}
      {isSelected ? (
        <View style={styles.actionContainer}>
          <Pressable
            onPress={() => onDelete?.(visit?.id)}
            style={styles.deleteSquircle}
          >
            <Ionicons name="trash" size={20} color={COLORS.brandPrimary} />
          </Pressable>

          <Pressable
            onPress={() => onViewDetails?.(visit?.id)}
            style={[styles.primaryAction, { backgroundColor: COLORS.brandPrimary }]}
          >
            <Text style={styles.actionText}>
              {isUpcoming ? "View Details" : "Summary"}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
          </Pressable>
        </View>
      ) : (
        /* The Corner Seal */
        isSelected && (
          <View style={styles.checkmarkWrapper}>
            <Ionicons name="checkmark-circle" size={32} color={COLORS.brandPrimary} />
          </View>
        )
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 36,
    padding: 16,
    marginBottom: 20,
    minHeight: 220,
    position: "relative",
    elevation: 4,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 15,
  },
  imageContainer: {
    width: "100%",
    height: 150,
    borderRadius: 26,
    overflow: "hidden",
    marginBottom: 16,
  },
  image: { width: "100%", height: "100%" },
  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: COLORS.textLight,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  content: { paddingHorizontal: 4 },
  headerRow: { marginBottom: 16 },
  hospitalName: { fontSize: 22, fontWeight: "900", letterSpacing: -0.8 },
  visitType: { fontSize: 14, fontWeight: "600", marginTop: 2 },
  doctorWidget: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 20,
    marginBottom: 16,
  },
  doctorSquircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  doctorInitials: { fontSize: 16, fontWeight: "800" },
  doctorInfo: { marginLeft: 12, flex: 1 },
  doctorName: { fontSize: 15, fontWeight: "800" },
  specialtyText: { fontSize: 12, fontWeight: "600" },
  pillRow: { flexDirection: "row", gap: 8 },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
  },
  statText: { fontSize: 12, fontWeight: "700" },
  actionContainer: { flexDirection: "row", gap: 12, marginTop: 20 },
  deleteSquircle: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: "rgba(134, 16, 14, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryAction: {
    flex: 1,
    height: 54,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionText: { color: COLORS.textLight, fontSize: 15, fontWeight: "800" },
});
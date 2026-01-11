// components/visits/VisitCard.jsx - Visit card component

import { View, Text, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";
import { getStatusColor, getVisitTypeIcon } from "../../constants/visits";

export default function VisitCard({
  visit,
  isSelected,
  onSelect,
  onViewDetails,
  onDelete,
}) {
  const { isDarkMode } = useTheme();

  if (!visit) return null;

  // Solid card colors matching app design system (no borders)
  const colors = {
    card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
    cardSelected: isDarkMode ? `${COLORS.brandPrimary}18` : `${COLORS.brandPrimary}10`,
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    textMuted: isDarkMode ? "#94A3B8" : "#64748B",
  };

  const statusColor = getStatusColor(visit?.status);
  const typeIcon = getVisitTypeIcon(visit?.type);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect?.(visit?.id);
  };

  const handleViewDetails = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onViewDetails?.(visit?.id);
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onDelete?.(visit?.id);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "No date";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const isUpcoming = visit?.status === "upcoming" || visit?.status === "in_progress";

  return (
    <Pressable
      onPress={handlePress}
      style={{
        backgroundColor: isSelected ? colors.cardSelected : colors.card,
        borderRadius: 30, // More rounded, no border
        padding: 16,
        marginBottom: 16,
        shadowColor: isSelected ? COLORS.brandPrimary : "#000",
        shadowOffset: { width: 0, height: isSelected ? 6 : 3 },
        shadowOpacity: isSelected ? 0.15 : 0.04,
        shadowRadius: isSelected ? 12 : 6,
        elevation: isSelected ? 4 : 2,
      }}
    >
      {/* Hospital Image */}
      <Image
        source={{ uri: visit?.image }}
        style={{
          width: "100%",
          height: 140,
          borderRadius: 20,
          marginBottom: 12,
          backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
        }}
        resizeMode="cover"
      />

      {/* Header: Hospital & Status Badge */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "500", color: colors.text, marginBottom: 4 }}>
            {visit?.hospital || "Hospital"}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>
            {visit?.type || "Appointment"}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: `${statusColor}20`,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 14, // More rounded
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "500", color: statusColor, textTransform: "capitalize" }}>
            {visit?.status?.replace("_", " ") || "pending"}
          </Text>
        </View>
      </View>

      {/* Doctor Info */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: `${COLORS.brandPrimary}15`,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: COLORS.brandPrimary }}>
            {visit?.doctor?.split(" ")?.map(n => n?.[0])?.join("") || "D"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight:'400', color: colors.text }}>
            {visit?.doctor || "Doctor"}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>
            {visit?.specialty || "Specialty"}
          </Text>
        </View>
      </View>

      {/* Date, Time, Location */}
      <View style={{ flexDirection: "row", marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.brandPrimary} />
          <Text style={{ fontSize: 13, color: colors.textMuted, marginLeft: 6 }}>
            {formatDate(visit?.date)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Ionicons name="time-outline" size={14} color={COLORS.brandPrimary} />
          <Text style={{ fontSize: 13, color: colors.textMuted, marginLeft: 6 }}>
            {visit?.time || "No time"}
          </Text>
        </View>
      </View>

      {/* Expanded Actions (when selected) */}
      {isSelected && (
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
          {/* Delete Icon */}
          <Pressable
            onPress={handleDelete}
            style={{
              backgroundColor: isDarkMode ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.1)",
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name="remove" size={20} color="#EF4444" />
          </Pressable>

          {/* CTA Button */}
          <Pressable
            onPress={handleViewDetails}
            style={{
              backgroundColor: isUpcoming ? COLORS.brandPrimary : (isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"),
              paddingVertical: 14,
              paddingHorizontal: 20,
              borderRadius: 20, // More rounded
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              flex: 1,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name={typeIcon} size={18} color={isUpcoming ? "#FFFFFF" : colors.text} />
              <Text style={{ color: isUpcoming ? "#FFFFFF" : colors.text, fontSize: 14, fontWeight:'400', marginLeft: 10 }}>
                {isUpcoming ? "View Details" : "View Summary"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={isUpcoming ? "#FFFFFF" : colors.textMuted} />
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}


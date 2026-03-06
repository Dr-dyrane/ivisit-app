import React from "react";
import { View, Text, Pressable, Image, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";

const DEFAULT_VISIT_HOSPITAL_IMAGES = [
  "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1632833239869-a37e3a5806d2?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1551190822-a9333d879b1f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1200&q=80",
];

const hashString = (seed) => {
  const input = String(seed || "hospital");
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const pickDefaultHospitalImage = (seed) =>
  DEFAULT_VISIT_HOSPITAL_IMAGES[hashString(seed) % DEFAULT_VISIT_HOSPITAL_IMAGES.length];

export default function VisitCard({ visit, isSelected, onSelect, onViewDetails, onDelete }) {
  const { isDarkMode } = useTheme();

  const rawHospitalLabel =
    (typeof visit?.hospitalName === "string" && visit.hospitalName) ||
    (typeof visit?.hospital === "string" && visit.hospital) ||
    "Hospital";
  const isDemoVisit = /\(demo\)/i.test(rawHospitalLabel);
  const hospitalLabel = rawHospitalLabel.replace(/\s*\(demo\)\s*/gi, " ").trim();
  const primaryHospitalImageUri =
    (typeof visit?.image === "string" && visit.image.trim()) ||
    (typeof visit?.hospitalImage === "string" && visit.hospitalImage.trim()) ||
    null;
  const fallbackHospitalImageUri = pickDefaultHospitalImage(
    visit?.hospitalId || hospitalLabel || visit?.id
  );
  const [imageLoadFailed, setImageLoadFailed] = React.useState(false);
  React.useEffect(() => {
    setImageLoadFailed(false);
  }, [visit?.id, primaryHospitalImageUri]);
  const hospitalImageUri =
    !imageLoadFailed && primaryHospitalImageUri
      ? primaryHospitalImageUri
      : fallbackHospitalImageUri;
  if (!visit) return null;
  const doctorLabel =
    (typeof visit?.doctorName === "string" && visit.doctorName) ||
    (typeof visit?.doctor === "string" && visit.doctor) ||
    "Doctor";

  // Theme-Based Color Logic (No Hard-coded Hex)
  const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
  const mutedColor = isDarkMode ? COLORS.textMutedDark : COLORS.textMuted;
  const cardBase = isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt;
  const isAndroid = Platform.OS === "android";
  const selectedCardSurface = isAndroid
    ? (isDarkMode ? "rgba(134, 16, 14, 0.24)" : "rgba(134, 16, 14, 0.12)")
    : COLORS.brandPrimary + "15";
  const defaultCardSurface = isAndroid
    ? (isDarkMode ? "rgba(18, 24, 38, 0.74)" : "rgba(255, 255, 255, 0.76)")
    : cardBase;
  const accentSurface = isAndroid
    ? (isDarkMode ? "rgba(43, 26, 26, 0.62)" : "rgba(253, 236, 236, 0.72)")
    : COLORS.brandPrimary + "15";
  const shadowLayerColor = isSelected
    ? (isDarkMode ? "rgba(134, 16, 14, 0.20)" : "rgba(134, 16, 14, 0.12)")
    : (isDarkMode ? "rgba(0, 0, 0, 0.20)" : "rgba(15, 23, 42, 0.10)");
  const cardShadowOpacity = isAndroid ? 0 : (isDarkMode ? 0.3 : 0.08);
  const cardElevation = isAndroid ? 0 : 4;

  const activeBG = isSelected
    ? selectedCardSurface
    : defaultCardSurface;

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
          shadowOpacity: cardShadowOpacity,
          elevation: cardElevation,
        },
      ]}
    >
      {isAndroid && (
        <View
          pointerEvents="none"
          style={[styles.androidShadowLayer, { backgroundColor: shadowLayerColor }]}
        />
      )}

      {/* Hero Image Section */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: hospitalImageUri }}
          style={styles.image}
          resizeMode="cover"
          onError={() => {
            if (!imageLoadFailed) setImageLoadFailed(true);
          }}
        />
        <View style={[styles.statusBadge, { backgroundColor: COLORS.brandPrimary }]}>
          <Text style={styles.statusText}>
            {visit?.status?.replace("_", " ") || "pending"}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.headerRow}>
          <View style={styles.hospitalTitleRow}>
            <Text style={[styles.hospitalName, { color: textColor }]} numberOfLines={1}>
              {hospitalLabel || "Hospital"}
            </Text>
            {isDemoVisit ? (
              <View style={[styles.demoIconBadge, { backgroundColor: COLORS.brandPrimary + "22" }]}>
                <Ionicons name="flask-outline" size={12} color={COLORS.brandPrimary} />
              </View>
            ) : null}
          </View>
          <Text style={[styles.visitType, { color: mutedColor }]}>
            {visit?.type || "Appointment"}
          </Text>
        </View>

        {/* Identity Widget: Nested Squircle */}
        <View style={[styles.doctorWidget, { backgroundColor: isDarkMode ? COLORS.bgDark : COLORS.bgLight }]}>
          <View style={[styles.doctorSquircle, { backgroundColor: accentSurface }]}>
            <Text style={[styles.doctorInitials, { color: COLORS.brandPrimary }]}>
              {doctorLabel?.split(" ")?.map(n => n?.[0])?.join("") || "D"}
            </Text>
          </View>
          <View style={styles.doctorInfo}>
            <Text style={[styles.doctorName, { color: textColor }]}>{doctorLabel}</Text>
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
            style={[
              styles.deleteSquircle,
              Platform.OS === "android" && { backgroundColor: isDarkMode ? "#2B1A1A" : "#FDECEC" },
            ]}
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
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 15,
  },
  androidShadowLayer: {
    position: "absolute",
    top: 2,
    left: 0,
    right: 0,
    bottom: -2,
    borderRadius: 36,
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
  hospitalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hospitalName: { fontSize: 22, fontWeight: "900", letterSpacing: -0.8, flexShrink: 1 },
  demoIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
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
    width: 60,
    height: 60,
    borderRadius: 24, // Manifesto: Card-in-Card
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryAction: {
    flex: 1,
    height: 60,
    borderRadius: 24, // Manifesto: Card-in-Card
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    // Manifesto: Active Glow
    shadowColor: COLORS.brandPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  actionText: { color: COLORS.textLight, fontSize: 16, fontWeight: "900", letterSpacing: 0.5 },
});

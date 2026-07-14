import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  formatScheduledVisitParts,
  getScheduledCareModeLabel,
  SCHEDULED_CARE_MODES,
} from "../../../utils/scheduledVisitProjection";

function SummaryRow({ icon, label, value, colors }) {
  if (!value) return null;
  return (
    <View style={styles.summaryRow}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={16} color={COLORS.brandPrimary} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.summaryValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function BookingSummary({
  bookingData,
  isSubmitting,
  onConfirm,
  onNotesChange,
  showHeader = true,
  error = null,
}) {
  const { isDarkMode } = useTheme();
  const colors = {
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    textMuted: isDarkMode ? "#94A3B8" : "#64748B",
    cardBg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
    inputBg: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)",
  };
  const slotParts = useMemo(
    () =>
      formatScheduledVisitParts({
        scheduledStartAt: bookingData.slot?.scheduledStartAt,
        scheduledTimezone: bookingData.slot?.scheduledTimezone,
      }),
    [bookingData.slot?.scheduledStartAt, bookingData.slot?.scheduledTimezone],
  );
  const careModeLabel = getScheduledCareModeLabel(bookingData.type);
  const isAsync = bookingData.type === SCHEDULED_CARE_MODES.ASYNC_CONSULT;

  const handleConfirmPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm?.();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {showHeader ? (
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Confirm booking</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Review the details before you book.</Text>
        </View>
      ) : null}

      <View style={[styles.summaryCard, { backgroundColor: colors.cardBg }]}>
        <View style={styles.summaryHeader}>
          <View style={[styles.summaryIcon, { backgroundColor: `${COLORS.brandPrimary}15` }]}>
            <Ionicons name={isAsync ? "chatbubbles" : "business"} size={26} color={COLORS.brandPrimary} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={[styles.summaryType, { color: colors.text }]}>{careModeLabel || "Scheduled visit"}</Text>
            <Text style={[styles.summarySpecialty, { color: colors.textMuted }]}>{bookingData.specialty}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]} />

        <View style={styles.detailsList}>
          <SummaryRow icon="location" label="Facility" value={bookingData.hospital?.name} colors={colors} />
          <SummaryRow icon="calendar" label="Date" value={slotParts.dateLabel} colors={colors} />
          <SummaryRow icon="time" label="Time" value={slotParts.timeLabel} colors={colors} />
          <SummaryRow icon="globe-outline" label="Timezone" value={slotParts.timezoneLabel || bookingData.slot?.scheduledTimezone} colors={colors} />
        </View>

        <View style={[styles.assignmentNote, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="people-outline" size={19} color={COLORS.brandPrimary} />
          <Text style={[styles.assignmentText, { color: colors.textMuted }]}>A clinician will be assigned automatically.</Text>
        </View>

        <View style={styles.notesSection}>
          <Text style={[styles.notesLabel, { color: colors.textMuted }]}>Notes for the care team (optional)</Text>
          <TextInput
            value={bookingData.notes || ""}
            onChangeText={onNotesChange}
            editable={!isSubmitting}
            multiline
            maxLength={1000}
            placeholder="Add context for this visit"
            placeholderTextColor={colors.textMuted}
            style={[styles.notesInput, { color: colors.text, backgroundColor: colors.inputBg }]}
            accessibilityLabel="Optional visit notes"
          />
        </View>
      </View>

      {error ? (
        <View style={[styles.errorPanel, { backgroundColor: colors.cardBg }]}>
          <Ionicons name="alert-circle-outline" size={19} color={COLORS.brandPrimary} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error.message || "Unable to book this visit right now."}</Text>
        </View>
      ) : null}

      <View style={styles.policyContainer}>
        <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.brandPrimary} />
        <Text style={[styles.policyText, { color: colors.textMuted }]}>Your clinician is assigned automatically when the booking is confirmed.</Text>
      </View>

      <Pressable
        onPress={handleConfirmPress}
        disabled={isSubmitting}
        accessibilityRole="button"
        accessibilityState={{ busy: isSubmitting, disabled: isSubmitting }}
        style={({ pressed }) => [styles.primaryButton, { opacity: isSubmitting ? 0.72 : pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      >
        {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />}
        <Text style={styles.primaryButtonText}>{isSubmitting ? "Booking..." : "Confirm booking"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 100 },
  header: { paddingVertical: 24 },
  title: { fontSize: 24, fontWeight: "700", letterSpacing: 0, marginBottom: 8 },
  subtitle: { fontSize: 16, lineHeight: 22, fontWeight: "400" },
  summaryCard: { borderRadius: 36, padding: 24 },
  summaryHeader: { flexDirection: "row", gap: 16, alignItems: "center", marginBottom: 24 },
  summaryIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  rowCopy: { flex: 1, minWidth: 0 },
  summaryType: { fontSize: 19, fontWeight: "700", letterSpacing: 0 },
  summarySpecialty: { fontSize: 14, fontWeight: "400", marginTop: 2 },
  divider: { height: 1, marginBottom: 24 },
  detailsList: { gap: 20 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  iconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(134,16,14,0.08)", alignItems: "center", justifyContent: "center" },
  summaryLabel: { fontSize: 12, fontWeight: "500", letterSpacing: 0, marginBottom: 2 },
  summaryValue: { fontSize: 16, lineHeight: 21, fontWeight: "600", letterSpacing: 0 },
  assignmentNote: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 18, marginTop: 24 },
  assignmentText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "500" },
  notesSection: { marginTop: 22, gap: 8 },
  notesLabel: { fontSize: 13, fontWeight: "600" },
  notesInput: { minHeight: 92, maxHeight: 160, borderRadius: 18, padding: 14, fontSize: 15, lineHeight: 21, textAlignVertical: "top" },
  errorPanel: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 14, borderRadius: 18, marginTop: 16 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 19 },
  policyContainer: { flexDirection: "row", gap: 12, marginTop: 24, paddingHorizontal: 8, alignItems: "center" },
  policyText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "400" },
  primaryButton: { minHeight: 64, borderRadius: 24, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 12, marginTop: 28, backgroundColor: COLORS.brandPrimary },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", letterSpacing: 0 },
});

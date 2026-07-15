import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";
import ScheduledVisitRecoveryNotice from "../ScheduledVisitRecoveryNotice";
import { BOOK_VISIT_SCREEN_COPY } from "../bookVisit/bookVisit.content";

const formatDayCard = (day) => {
  const slot = day?.slots?.[0];
  if (!slot?.scheduledStartAt) return { weekday: "Day", dayNumber: "-" };
  const date = new Date(slot.scheduledStartAt);
  try {
    return {
      weekday: new Intl.DateTimeFormat(undefined, {
        timeZone: slot.scheduledTimezone || undefined,
        weekday: "short",
      }).format(date),
      dayNumber: new Intl.DateTimeFormat(undefined, {
        timeZone: slot.scheduledTimezone || undefined,
        day: "numeric",
      }).format(date),
    };
  } catch (_error) {
    return { weekday: "Day", dayNumber: day?.key?.slice(-2) || "-" };
  }
};

function AvailabilitySkeleton({ backgroundColor }) {
  return (
    <View style={styles.skeletonWrap} accessibilityLabel="Loading available times">
      <View style={styles.skeletonDates}>
        {[0, 1, 2, 3].map((key) => <View key={key} style={[styles.skeletonDate, { backgroundColor }]} />)}
      </View>
      <View style={styles.skeletonSlots}>
        {[0, 1, 2, 3, 4, 5].map((key) => <View key={key} style={[styles.skeletonSlot, { backgroundColor }]} />)}
      </View>
    </View>
  );
}

function StateAction({ label, onPress, secondary = false }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.stateAction, secondary ? styles.stateActionSecondary : styles.stateActionPrimary]}
    >
      <Text style={secondary ? styles.stateActionSecondaryText : styles.stateActionPrimaryText}>{label}</Text>
    </Pressable>
  );
}

export default function DateTimeSelection({
  availabilityDays = [],
  selectedDayKey = null,
  selectedSlot = null,
  onSelectDate,
  onSelectTime,
  onConfirm,
  showHeader = true,
  loading = false,
  refreshing = false,
  error = null,
  timezoneReady = false,
  onRetry,
  onChangeDates,
  onChangeFacility,
  onChangeSpecialty,
  recoveryNotice = null,
}) {
  const { isDarkMode } = useTheme();
  const colors = {
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    textMuted: isDarkMode ? "#94A3B8" : "#64748B",
    cardBg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
    selectedBg: COLORS.brandPrimary,
  };
  const selectedDay = useMemo(
    () => availabilityDays.find((day) => day.key === selectedDayKey) || availabilityDays[0] || null,
    [availabilityDays, selectedDayKey],
  );
  const selectedStartAt = selectedSlot?.scheduledStartAt || null;

  const handleDatePress = (dateKey) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectDate?.(dateKey);
  };
  const handleTimePress = (slot) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectTime?.(slot);
  };

  const showState = !loading && (!timezoneReady || error || availabilityDays.length === 0);
  const stateTitle = !timezoneReady
    ? BOOK_VISIT_SCREEN_COPY.messages.timezoneUnconfirmed
    : error
      ? "Available times could not be loaded."
      : BOOK_VISIT_SCREEN_COPY.messages.noAvailability;
  const stateBody = !timezoneReady
    ? "Choose another facility or check again after its scheduling timezone is confirmed."
    : error
      ? "Your choices are saved. Try loading available times again."
      : "Try later dates, another facility, or another specialty.";

  return (
    <View style={styles.container}>
      {showHeader ? (
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Select date and time</Text>
        </View>
      ) : null}

      <ScheduledVisitRecoveryNotice
        message={recoveryNotice}
        busy={loading || refreshing}
        style={styles.recoveryNotice}
      />

      {loading ? <AvailabilitySkeleton backgroundColor={colors.cardBg} /> : null}

      {showState ? (
        <View style={[styles.statePanel, { backgroundColor: colors.cardBg }]}>
          <Ionicons name={!timezoneReady ? "time-outline" : error ? "cloud-offline-outline" : "calendar-outline"} size={28} color={colors.textMuted} />
          <Text
            accessible
            accessibilityRole="header"
            style={[styles.stateTitle, { color: colors.text }]}
          >
            {stateTitle}
          </Text>
          <Text style={[styles.stateBody, { color: colors.textMuted }]}>{stateBody}</Text>
          <View style={styles.stateActions}>
            {timezoneReady && error ? <StateAction label="Try again" onPress={onRetry} /> : null}
            {timezoneReady && !error ? <StateAction label="Change dates" onPress={onChangeDates} /> : null}
            <StateAction label="Change facility" onPress={onChangeFacility} secondary={timezoneReady} />
            <StateAction label="Change specialty" onPress={onChangeSpecialty} secondary />
          </View>
        </View>
      ) : null}

      {!loading && !showState ? (
        <>
          <View style={styles.dateSection}>
            <View style={styles.sectionHeadingRow}>
              <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>Choose date</Text>
              {refreshing ? <ActivityIndicator size="small" color={COLORS.brandPrimary} /> : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateList}>
              {availabilityDays.map((day) => {
                const isSelected = day.key === selectedDay?.key;
                const card = formatDayCard(day);
                return (
                  <Pressable
                    key={day.key}
                    onPress={() => handleDatePress(day.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={[styles.dateCard, { backgroundColor: isSelected ? colors.selectedBg : colors.cardBg }]}>
                      <Text style={[styles.dayName, { color: isSelected ? "#FFFFFF" : colors.textMuted }]}>{card.weekday}</Text>
                      <Text style={[styles.dayNumber, { color: isSelected ? "#FFFFFF" : colors.text }]}>{card.dayNumber}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.slotSection}>
            <Text
              accessible
              accessibilityRole="header"
              style={[styles.sectionHeader, { color: colors.textMuted }]}
            >
              Available slots
            </Text>
            <FlatList
              data={selectedDay?.slots || []}
              numColumns={3}
              keyExtractor={(item) => item.scheduledStartAt}
              columnWrapperStyle={styles.slotRow}
              contentContainerStyle={styles.slotList}
              renderItem={({ item }) => {
                const isSelected = selectedStartAt === item.scheduledStartAt;
                return (
                  <Pressable
                    onPress={() => handleTimePress(item)}
                    style={styles.slotPressable}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={[styles.timeSlot, { backgroundColor: isSelected ? colors.selectedBg : colors.cardBg }]}>
                      <Text style={[styles.timeText, { color: isSelected ? "#FFFFFF" : colors.text }]}>{item.timeLabel}</Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>

          <Pressable
            onPress={() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onConfirm?.();
            }}
            disabled={!selectedStartAt}
            accessibilityRole="button"
            accessibilityState={{ disabled: !selectedStartAt }}
            style={({ pressed }) => [
              styles.primaryButton,
              { opacity: !selectedStartAt ? 0.5 : pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { paddingVertical: 24 },
  title: { fontSize: 24, fontWeight: "700", letterSpacing: 0 },
  skeletonWrap: { gap: 28 },
  skeletonDates: { flexDirection: "row", gap: 12 },
  skeletonDate: { width: 74, height: 84, borderRadius: 22 },
  skeletonSlots: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  skeletonSlot: { width: "30%", minWidth: 86, height: 54, borderRadius: 20 },
  recoveryNotice: { marginBottom: 18 },
  statePanel: { alignItems: "center", padding: 24, borderRadius: 28, gap: 9 },
  stateTitle: { fontSize: 17, lineHeight: 23, fontWeight: "700", textAlign: "center" },
  stateBody: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  stateActions: { width: "100%", gap: 8, marginTop: 8 },
  stateAction: { minHeight: 46, borderRadius: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  stateActionPrimary: { backgroundColor: COLORS.brandPrimary },
  stateActionSecondary: { backgroundColor: "rgba(100,116,139,0.12)" },
  stateActionPrimaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  stateActionSecondaryText: { color: COLORS.brandPrimary, fontSize: 14, fontWeight: "700" },
  dateSection: { marginBottom: 32 },
  sectionHeadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionHeader: { fontSize: 13, fontWeight: "600", letterSpacing: 0, marginBottom: 16 },
  dateList: { gap: 12 },
  dateCard: { width: 74, height: 84, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  dayName: { fontSize: 12, fontWeight: "600", marginBottom: 4, letterSpacing: 0 },
  dayNumber: { fontSize: 22, fontWeight: "700", letterSpacing: 0 },
  slotSection: { flex: 1 },
  slotRow: { gap: 12 },
  slotList: { gap: 12 },
  slotPressable: { flex: 1 },
  timeSlot: { minHeight: 54, borderRadius: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  timeText: { fontSize: 15, fontWeight: "600", letterSpacing: 0 },
  primaryButton: { flexDirection: "row", minHeight: 64, borderRadius: 24, alignItems: "center", justifyContent: "center", gap: 12, marginVertical: 20, backgroundColor: COLORS.brandPrimary },
  primaryButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700", letterSpacing: 0 },
});

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { useToast } from "../../../contexts/ToastContext";
import { useBookVisitAvailabilityQuery } from "../../../hooks/visits/useBookVisitAvailabilityQuery";
import { useBookingFacilityQuery } from "../../../hooks/visits/useBookingFacilitiesQuery";
import { useScheduledVisitMutations } from "../../../hooks/visits/useScheduledVisitMutations";
import { scheduledVisitReleaseGates } from "../../../services/scheduledVisitsService";
import {
  formatScheduledVisitParts,
  groupAvailabilitySlots,
  toValidIsoString,
} from "../../../utils/scheduledVisitProjection";
import MapModalShell from "../surfaces/MapModalShell";

const buildColors = (isDarkMode) => ({
  text: isDarkMode ? "#F8FAFC" : "#0F172A",
  muted: isDarkMode ? "#94A3B8" : "#64748B",
  softSurface: isDarkMode ? "rgba(148,163,184,0.12)" : "#F1F5F9",
  hairline: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
  danger: isDarkMode ? "#FDA4AF" : "#BE123C",
});

const getDayParts = (day) => {
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
    return { weekday: "Day", dayNumber: day.key?.slice(-2) || "-" };
  }
};

const resolveTransitionError = (error) => {
  if (!error) return null;
  if (error.code === "slot_unavailable") {
    return "That time is no longer available. Choose another time.";
  }
  if (error.code === "policy_window") {
    return "This visit is outside the allowed rescheduling window.";
  }
  if (error.code === "authorization_denied") {
    return "You do not have permission to reschedule this visit.";
  }
  return "This visit could not be rescheduled. Review the time and try again.";
};

function AvailabilitySkeleton({ colors }) {
  return (
    <View style={styles.skeleton} accessibilityLabel="Loading available times">
      <View style={[styles.skeletonLabel, { backgroundColor: colors.softSurface }]} />
      <View style={styles.skeletonDays}>
        {[0, 1, 2, 3].map((key) => (
          <View
            key={`reschedule-day-${key}`}
            style={[styles.skeletonDay, { backgroundColor: colors.softSurface }]}
          />
        ))}
      </View>
      <View style={[styles.skeletonLabel, { backgroundColor: colors.softSurface }]} />
      <View style={styles.skeletonSlots}>
        {[0, 1, 2, 3, 4, 5].map((key) => (
          <View
            key={`reschedule-slot-${key}`}
            style={[styles.skeletonSlot, { backgroundColor: colors.softSurface }]}
          />
        ))}
      </View>
    </View>
  );
}

function AvailabilityState({ icon, title, body, onRetry, colors }) {
  return (
    <View style={[styles.state, { backgroundColor: colors.softSurface }]}>
      <Ionicons name={icon} size={28} color={colors.muted} />
      <Text style={[styles.stateTitle, { color: colors.text }]}>{title}</Text>
      {body ? <Text style={[styles.stateBody, { color: colors.muted }]}>{body}</Text> : null}
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          style={({ pressed }) => [styles.retryButton, { opacity: pressed ? 0.84 : 1 }]}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function ScheduledVisitRescheduleModal({
  visible,
  historyItem,
  onClose,
  onSuccess,
  userId,
}) {
  const { isDarkMode } = useTheme();
  const { showToast } = useToast();
  const colors = useMemo(() => buildColors(isDarkMode), [isDarkMode]);
  const visitId = historyItem?.id ? String(historyItem.id) : null;
  const hospitalId = historyItem?.hospitalId || null;
  const specialty = historyItem?.specialty || null;
  const careMode = historyItem?.careMode || null;
  const currentStartAt = toValidIsoString(historyItem?.scheduledStartAt);
  const eligibleVisit =
    historyItem?.sourceKind === "scheduled_visit" &&
    historyItem?.canReschedule === true &&
    Boolean(visitId && hospitalId && specialty && careMode && currentStartAt);
  const featureEnabled = scheduledVisitReleaseGates.scheduledVisits;
  const availabilityWindow = useMemo(() => {
    const from = new Date();
    const to = new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);
    return { fromAt: from.toISOString(), toAt: to.toISOString() };
  }, [visitId, visible]);
  const [selectedDayKey, setSelectedDayKey] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const facilityQuery = useBookingFacilityQuery({
    hospitalId,
    enabled: visible && featureEnabled && eligibleVisit,
  });
  const facility = facilityQuery.data || null;
  const timezoneConfirmedAt = toValidIsoString(
    facility?.timezoneConfirmedAt || facility?.timezone_confirmed_at,
  );
  const availabilityQuery = useBookVisitAvailabilityQuery({
    hospitalId,
    specialty,
    careMode,
    fromAt: availabilityWindow.fromAt,
    toAt: availabilityWindow.toAt,
    timezoneConfirmedAt,
    enabled:
      visible &&
      featureEnabled &&
      eligibleVisit &&
      Boolean(facility && timezoneConfirmedAt),
  });
  const {
    transitionVisit,
    isTransitioning,
    transitionError,
    resetTransition,
  } = useScheduledVisitMutations({ userId });

  const availableRows = useMemo(
    () =>
      (Array.isArray(availabilityQuery.data) ? availabilityQuery.data : [])
        .filter(
          (slot) =>
            String(slot?.hospitalId || "") === String(hospitalId || "") &&
            slot?.careMode === careMode &&
            String(slot?.specialty || "").toLowerCase() ===
              String(specialty || "").toLowerCase(),
        )
        .filter(
          (slot) =>
            toValidIsoString(slot?.scheduledStartAt) !== currentStartAt,
        ),
    [availabilityQuery.data, careMode, currentStartAt, hospitalId, specialty],
  );
  const availabilityDays = useMemo(
    () => groupAvailabilitySlots(availableRows),
    [availableRows],
  );
  const selectedDay =
    availabilityDays.find((day) => day.key === selectedDayKey) ||
    availabilityDays[0] ||
    null;
  const currentParts = formatScheduledVisitParts({
    scheduledStartAt: currentStartAt,
    scheduledTimezone: historyItem?.scheduledTimezone,
  });

  useEffect(() => {
    setSelectedDayKey(null);
    setSelectedSlot(null);
    resetTransition();
  }, [resetTransition, visitId, visible]);

  useEffect(() => {
    if (availabilityDays.length === 0) {
      setSelectedDayKey(null);
      setSelectedSlot(null);
      return;
    }
    if (!availabilityDays.some((day) => day.key === selectedDayKey)) {
      setSelectedDayKey(availabilityDays[0].key);
      setSelectedSlot(null);
    }
  }, [availabilityDays, selectedDayKey]);

  const handleSelectDay = useCallback(
    (dayKey) => {
      setSelectedDayKey(dayKey);
      setSelectedSlot(null);
      if (transitionError) resetTransition();
    },
    [resetTransition, transitionError],
  );

  const handleSelectSlot = useCallback(
    (slot) => {
      setSelectedSlot(slot);
      if (transitionError) resetTransition();
    },
    [resetTransition, transitionError],
  );

  const handleSubmit = useCallback(async () => {
    if (!eligibleVisit || isTransitioning || !selectedSlot?.scheduledStartAt) {
      return;
    }
    const canonicalSlot = availableRows.find(
      (slot) => slot.scheduledStartAt === selectedSlot.scheduledStartAt,
    );
    if (!canonicalSlot) return;
    try {
      const updatedVisit = await transitionVisit({
        visitId,
        action: "reschedule",
        scheduledStartAt: canonicalSlot.scheduledStartAt,
        reason: null,
      });
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      } catch (_error) {
        // Haptics are optional on unsupported devices.
      }
      showToast("Visit rescheduled", "success");
      onSuccess?.(updatedVisit);
    } catch (error) {
      if (error?.code === "slot_unavailable") {
        setSelectedSlot(null);
        await availabilityQuery.refetch();
      }
    }
  }, [
    availabilityQuery.refetch,
    availableRows,
    eligibleVisit,
    isTransitioning,
    onSuccess,
    selectedSlot?.scheduledStartAt,
    transitionVisit,
    showToast,
    visitId,
  ]);

  const canSubmit = Boolean(selectedSlot?.scheduledStartAt) && !isTransitioning;
  const footerSlot =
    featureEnabled && eligibleVisit && facility && timezoneConfirmedAt ? (
      <View style={[styles.footer, { borderTopColor: colors.hairline }]}>
        {transitionError ? (
          <Text style={[styles.transitionError, { color: colors.danger }]}>
            {resolveTransitionError(transitionError)}
          </Text>
        ) : null}
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit, busy: isTransitioning }}
          style={({ pressed }) => [
            styles.submitButton,
            { opacity: canSubmit ? (pressed ? 0.84 : 1) : 0.45 },
          ]}
        >
          {isTransitioning ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
          <Text style={styles.submitText}>{isTransitioning ? "Rescheduling..." : "Confirm new time"}</Text>
        </Pressable>
      </View>
    ) : null;

  let selector = null;
  if (!eligibleVisit) {
    selector = (
      <AvailabilityState
        icon="calendar-outline"
        title="Rescheduling unavailable"
        body="This visit cannot be rescheduled here."
        colors={colors}
      />
    );
  } else if (!featureEnabled) {
    selector = (
      <AvailabilityState
        icon="calendar-outline"
        title="Rescheduling unavailable"
        body="Online rescheduling cannot be opened right now."
        colors={colors}
      />
    );
  } else if (facilityQuery.isLoading) {
    selector = <AvailabilitySkeleton colors={colors} />;
  } else if (facilityQuery.error || !facility) {
    selector = (
      <AvailabilityState
        icon="cloud-offline-outline"
        title="Visit location unavailable"
        body="We could not load this facility."
        onRetry={facilityQuery.refetch}
        colors={colors}
      />
    );
  } else if (!timezoneConfirmedAt) {
    selector = (
      <AvailabilityState
        icon="time-outline"
        title="Online rescheduling is not ready"
        body="This facility is not accepting online schedule changes yet."
        colors={colors}
      />
    );
  } else if (availabilityQuery.isLoading) {
    selector = <AvailabilitySkeleton colors={colors} />;
  } else if (availabilityQuery.error) {
    selector = (
      <AvailabilityState
        icon="cloud-offline-outline"
        title="Times unavailable"
        body="Your current visit has not changed."
        onRetry={availabilityQuery.refetch}
        colors={colors}
      />
    );
  } else if (availabilityDays.length === 0) {
    selector = (
      <AvailabilityState
        icon="calendar-outline"
        title="No other times available"
        body="Your current visit has not changed. Check again later."
        onRetry={availabilityQuery.refetch}
        colors={colors}
      />
    );
  } else {
    selector = (
      <View style={styles.selector}>
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>Choose a date</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayList}
        >
          {availabilityDays.map((day) => {
            const selected = day.key === selectedDay?.key;
            const parts = getDayParts(day);
            return (
              <Pressable
                key={day.key}
                onPress={() => handleSelectDay(day.key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.dayButton,
                  { backgroundColor: selected ? COLORS.brandPrimary : colors.softSurface },
                ]}
              >
                <Text style={[styles.weekday, { color: selected ? "#FFFFFF" : colors.muted }]}>{parts.weekday}</Text>
                <Text style={[styles.dayNumber, { color: selected ? "#FFFFFF" : colors.text }]}>{parts.dayNumber}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>Choose a time</Text>
        <View style={styles.slotGrid}>
          {(selectedDay?.slots || []).map((slot) => {
            const selected =
              slot.scheduledStartAt === selectedSlot?.scheduledStartAt;
            return (
              <Pressable
                key={slot.scheduledStartAt}
                onPress={() => handleSelectSlot(slot)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.slotButton,
                  { backgroundColor: selected ? COLORS.brandPrimary : colors.softSurface },
                ]}
              >
                <Text style={[styles.slotText, { color: selected ? "#FFFFFF" : colors.text }]}>{slot.timeLabel}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <MapModalShell
      visible={visible}
      onClose={onClose}
      title="Reschedule visit"
      headerLayout="leading"
      enableSnapDetents={false}
      matchExpandedSheetHeight
      minHeightRatio={0.7}
      maxHeightRatio={0.9}
      footerSlot={footerSlot}
      contentContainerStyle={styles.shellContent}
    >
      <View style={[styles.currentVisit, { backgroundColor: colors.softSurface }]}>
        <View style={styles.currentHeader}>
          <Ionicons name="calendar-outline" size={18} color={COLORS.brandPrimary} />
          <Text style={[styles.currentLabel, { color: colors.muted }]}>Current time</Text>
        </View>
        <Text style={[styles.currentTime, { color: colors.text }]}>
          {currentParts.dateTimeLabel || "Time unavailable"}
        </Text>
        <Text style={[styles.currentFacility, { color: colors.muted }]}>
          {historyItem?.facilityName || historyItem?.title || "Care facility"}
        </Text>
      </View>
      {selector}
    </MapModalShell>
  );
}

const styles = StyleSheet.create({
  shellContent: { gap: 16, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  currentVisit: { gap: 5, padding: 14, borderRadius: 8 },
  currentHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  currentLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  currentTime: { fontSize: 16, lineHeight: 22, fontWeight: "700" },
  currentFacility: { fontSize: 12, lineHeight: 17 },
  state: { alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 28, borderRadius: 8 },
  stateTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  stateBody: { maxWidth: 320, fontSize: 13, lineHeight: 19, textAlign: "center" },
  skeleton: { gap: 12 },
  skeletonLabel: { width: 92, height: 12, borderRadius: 6 },
  skeletonDays: { flexDirection: "row", gap: 8 },
  skeletonDay: { width: 64, height: 68, borderRadius: 8 },
  skeletonSlots: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skeletonSlot: { width: "31%", minWidth: 84, height: 46, borderRadius: 8 },
  retryButton: { minHeight: 42, justifyContent: "center", marginTop: 4, paddingHorizontal: 18, borderRadius: 8, backgroundColor: COLORS.brandPrimary },
  retryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  selector: { gap: 12 },
  sectionLabel: { fontSize: 12, lineHeight: 17, fontWeight: "700" },
  dayList: { gap: 8, paddingBottom: 4 },
  dayButton: { width: 64, height: 68, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  weekday: { fontSize: 11, fontWeight: "600" },
  dayNumber: { marginTop: 3, fontSize: 20, fontWeight: "700" },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotButton: { width: "31%", minWidth: 84, minHeight: 46, alignItems: "center", justifyContent: "center", paddingHorizontal: 8, borderRadius: 8 },
  slotText: { fontSize: 14, fontWeight: "700" },
  footer: { gap: 8, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10 },
  transitionError: { fontSize: 12, lineHeight: 17, textAlign: "center" },
  submitButton: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 8, backgroundColor: COLORS.brandPrimary },
  submitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});

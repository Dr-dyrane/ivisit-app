import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, isSameDay } from "date-fns";
import { useTheme } from "../../../contexts/ThemeContext";
import { COLORS } from "../../../constants/colors";
import { BOOK_VISIT_TIME_SLOTS } from "../bookVisit/bookVisit.content";
import * as Haptics from "expo-haptics";

export default function DateTimeSelection({
  dates,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  onConfirm,
  showHeader = true,
}) {
  const { isDarkMode } = useTheme();

  const colors = {
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    textMuted: isDarkMode ? "#94A3B8" : "#64748B",
    cardBg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
    selectedBg: COLORS.brandPrimary,
  };

  const handleDatePress = (date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectDate(date);
  };

  const handleTimePress = (time) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectTime(time);
  };

  const handleConfirmPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm();
  };

  return (
    <View style={styles.container}>
      {showHeader ? (
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Select date and time
          </Text>
        </View>
      ) : null}

      <View style={{ marginBottom: 32 }}>
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
          Choose date
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12 }}
        >
          {dates.map((date, index) => {
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            return (
              <Pressable key={index} onPress={() => handleDatePress(date)}>
                <View
                  style={[
                    styles.dateCard,
                    {
                      backgroundColor: isSelected
                        ? colors.selectedBg
                        : colors.cardBg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayName,
                      { color: isSelected ? "#FFFFFF" : colors.textMuted },
                    ]}
                  >
                    {format(date, "EEE")}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumber,
                      { color: isSelected ? "#FFFFFF" : colors.text },
                    ]}
                  >
                    {format(date, "d")}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
          Available slots
        </Text>
        <FlatList
          data={BOOK_VISIT_TIME_SLOTS}
          numColumns={3}
          keyExtractor={(item) => item}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }) => {
            const isSelected = selectedTime === item;
            return (
              <Pressable
                onPress={() => handleTimePress(item)}
                style={{ flex: 1 }}
              >
                <View
                  style={[
                    styles.timeSlot,
                    {
                      backgroundColor: isSelected
                        ? colors.selectedBg
                        : colors.cardBg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.timeText,
                      { color: isSelected ? "#FFFFFF" : colors.text },
                    ]}
                  >
                    {item}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      </View>

      <Pressable
        onPress={handleConfirmPress}
        style={({ pressed }) => [
          styles.primaryButton,
          {
            backgroundColor: COLORS.brandPrimary,
            opacity: !selectedDate || !selectedTime ? 0.5 : pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
        disabled={!selectedDate || !selectedTime}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingVertical: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -1,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.2,
    marginBottom: 16,
  },
  dateCard: {
    width: 74,
    height: 84,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  dayName: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  dayNumber: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  timeSlot: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  timeText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  primaryButton: {
    flexDirection: "row",
    height: 64,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginVertical: 20,
    shadowColor: COLORS.brandPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
});

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";
import { BOOK_VISIT_SERVICE_OPTIONS } from "../bookVisit/bookVisit.content";

export default function ServiceSelection({
  onSelect,
  showHeader = true,
  enabled = true,
}) {
  const { isDarkMode } = useTheme();
  const colors = {
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    textMuted: isDarkMode ? "#94A3B8" : "#64748B",
    cardBg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
  };

  const handlePress = (careMode) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect?.(careMode);
  };

  return (
    <View style={styles.container}>
      {showHeader ? (
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>How would you like to be seen?</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Choose the kind of scheduled care you need.</Text>
        </View>
      ) : null}

      {!enabled ? (
        <View style={[styles.notice, { backgroundColor: colors.cardBg }]}>
          <Ionicons name="information-circle" size={20} color={colors.textMuted} />
          <Text style={[styles.noticeText, { color: colors.textMuted }]}>
            Scheduled booking is temporarily unavailable. Your current care and emergency options are unchanged.
          </Text>
        </View>
      ) : null}

      <View style={styles.optionsContainer}>
        {BOOK_VISIT_SERVICE_OPTIONS.map((option) => (
          <Pressable
            key={option.key}
            onPress={() => handlePress(option.key)}
            disabled={!enabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: !enabled }}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: colors.cardBg,
                opacity: enabled ? 1 : 0.5,
                transform: [{ scale: pressed && enabled ? 0.98 : 1 }],
              },
            ]}
          >
            <View style={styles.cardContent}>
              <View style={styles.identityWidget}>
                <View style={[styles.iconCircle, { backgroundColor: `${COLORS.brandPrimary}15` }]}>
                  <Ionicons name={option.icon} size={28} color={COLORS.brandPrimary} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{option.title}</Text>
                  <Text style={[styles.cardDesc, { color: colors.textMuted }]}>{option.body}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { paddingVertical: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8, letterSpacing: 0, lineHeight: 30 },
  subtitle: { fontSize: 16, lineHeight: 22, fontWeight: "400" },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 16, borderRadius: 20, marginBottom: 16 },
  noticeText: { flex: 1, fontSize: 14, lineHeight: 20 },
  optionsContainer: { gap: 12 },
  card: { borderRadius: 32, padding: 24 },
  cardContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  identityWidget: { flexDirection: "row", alignItems: "center", flex: 1, gap: 16 },
  iconCircle: { width: 60, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  textContainer: { flex: 1 },
  cardTitle: { fontSize: 19, fontWeight: "700", letterSpacing: 0, marginBottom: 2 },
  cardDesc: { fontSize: 13, lineHeight: 18, fontWeight: "400" },
});

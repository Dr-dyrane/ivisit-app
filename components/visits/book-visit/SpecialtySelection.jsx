import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";
import { BOOK_VISIT_SCREEN_COPY } from "../bookVisit/bookVisit.content";

const SPECIALTY_ICONS = {
  Cardiology: "heart",
  Dermatology: "water",
  "General Practice": "medkit",
  Neurology: "headset",
  Orthopedics: "accessibility",
  Pediatrics: "happy",
  Psychiatry: "chatbubbles",
  Dentistry: "nutrition",
  Ophthalmology: "eye",
  ENT: "ear",
};

const getSpecialtyIcon = (specialty) =>
  Object.entries(SPECIALTY_ICONS).find(([key]) => specialty.includes(key))?.[1] || "medical";

function SpecialtySkeleton({ backgroundColor }) {
  return (
    <View style={styles.skeletonList} accessibilityLabel="Loading specialties">
      {[0, 1, 2, 3].map((key) => (
        <View key={key} style={[styles.skeletonRow, { backgroundColor }]} />
      ))}
    </View>
  );
}

export default function SpecialtySelection({
  specialties,
  onSelect,
  onSearchPress,
  showHeader = true,
  loading = false,
  error = null,
  onRetry,
}) {
  const { isDarkMode } = useTheme();
  const colors = {
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    textMuted: isDarkMode ? "#94A3B8" : "#64748B",
    searchBg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
    cardBg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
  };

  const handlePress = (item) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect?.(item);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {showHeader ? <Text style={[styles.title, { color: colors.text }]}>Select a specialty</Text> : null}
        <Pressable
          onPress={onSearchPress}
          disabled={loading || Boolean(error)}
          accessibilityRole="button"
          accessibilityState={{ disabled: loading || Boolean(error) }}
          style={({ pressed }) => [
            styles.searchTrigger,
            { backgroundColor: colors.searchBg, opacity: loading || error ? 0.5 : pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <Text style={[styles.searchPlaceholder, { color: colors.textMuted }]}>Search specialties</Text>
        </Pressable>
      </View>

      {loading ? <SpecialtySkeleton backgroundColor={colors.cardBg} /> : null}

      {!loading && error ? (
        <View style={[styles.statePanel, { backgroundColor: colors.cardBg }]}>
          <Ionicons name="cloud-offline-outline" size={24} color={colors.textMuted} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>Specialties are unavailable</Text>
          <Text style={[styles.stateBody, { color: colors.textMuted }]}>We could not load booking specialties right now.</Text>
          <Pressable onPress={onRetry} style={styles.retryButton} accessibilityRole="button">
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !error && specialties.length === 0 ? (
        <View style={[styles.statePanel, { backgroundColor: colors.cardBg }]}>
          <Ionicons name="calendar-outline" size={24} color={colors.textMuted} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>{BOOK_VISIT_SCREEN_COPY.messages.noSpecialties}</Text>
          <Text style={[styles.stateBody, { color: colors.textMuted }]}>Check again when facilities publish bookable care.</Text>
          <Pressable onPress={onRetry} style={styles.retryButton} accessibilityRole="button">
            <Text style={styles.retryText}>Refresh</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !error && specialties.length > 0 ? (
        <FlatList
          data={specialties}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handlePress(item)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.listItem,
                { backgroundColor: colors.cardBg, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <View style={styles.row}>
                <View style={styles.contentRow}>
                  <View style={[styles.iconBox, { backgroundColor: `${COLORS.brandPrimary}15` }]}>
                    <Ionicons name={getSpecialtyIcon(item)} size={24} color={COLORS.brandPrimary} />
                  </View>
                  <Text style={[styles.listTitle, { color: colors.text }]}>{item}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            </Pressable>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { paddingVertical: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16, letterSpacing: 0 },
  searchTrigger: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 20 },
  searchPlaceholder: { fontSize: 16, fontWeight: "400", letterSpacing: 0 },
  skeletonList: { gap: 12 },
  skeletonRow: { minHeight: 80, borderRadius: 28 },
  statePanel: { alignItems: "center", padding: 24, borderRadius: 28, gap: 8 },
  stateTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  stateBody: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  retryButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 18, marginTop: 6, borderRadius: 18, backgroundColor: COLORS.brandPrimary },
  retryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  listContent: { paddingBottom: 100, gap: 12 },
  listItem: { padding: 16, borderRadius: 28, minHeight: 80, justifyContent: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  contentRow: { flexDirection: "row", alignItems: "center", gap: 16, flex: 1 },
  iconBox: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  listTitle: { flex: 1, fontSize: 17, fontWeight: "700", letterSpacing: 0 },
});

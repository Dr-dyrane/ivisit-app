import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";

export default function VisitFilters({ filters, selectedFilter, onSelect, counts = {} }) {
  const { isDarkMode } = useTheme();

  const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
  const mutedColor = isDarkMode ? COLORS.textMutedDark : COLORS.textMuted;
  const cardBase = isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {filters.map((filter) => {
          const isSelected = selectedFilter === filter.id;
          const count = counts[filter.id] || 0;

          const activeBG = isSelected
            ? COLORS.brandPrimary + "15"
            : cardBase;

          return (
            <Pressable
              key={filter.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onSelect(filter.id);
              }}
              style={({ pressed }) => [
                styles.filterCard,
                {
                  backgroundColor: activeBG,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                  shadowColor: isSelected ? COLORS.brandPrimary : "#000",
                  shadowOpacity: isDarkMode ? 0.2 : 0.05,
                },
              ]}
            >
              <View style={styles.contentRow}>
                <Text style={[styles.label, { color: isSelected ? COLORS.brandPrimary : textColor }]}>
                  {filter.label}
                </Text>

                {count > 0 && (
                  <View style={[styles.badge, { backgroundColor: isSelected ? COLORS.brandPrimary : (isDarkMode ? COLORS.bgDark : COLORS.bgLight) }]}>
                    <Text style={[styles.badgeText, { color: isSelected ? COLORS.textLight : COLORS.brandPrimary }]}>
                      {count}
                    </Text>
                  </View>
                )}
              </View>

              {/* The Signature Checkmark Seal */}
              {isSelected && (
                <View style={styles.checkmarkWrapper}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.brandPrimary} />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8},
  scrollContent: { paddingLeft: 4, paddingRight: 20, gap: 12, paddingBottom: 8 },
  filterCard: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 28,
    minWidth: 100,
    position: "relative",
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  contentRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 14, fontWeight: "800", letterSpacing: -0.4 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 11, fontWeight: "900" },
  checkmarkWrapper: { position: "absolute", right: -4, bottom: -4 },
});
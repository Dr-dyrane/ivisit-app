import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";

export default function NotificationFilters({ filters, selectedFilter, onSelect, counts = {} }) {
  const { isDarkMode } = useTheme();

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {filters.map((filter) => {
          const isSelected = selectedFilter === filter.id;
          const count = counts[filter.id] || 0;
          
          const activeBG = isSelected 
            ? (COLORS.brandPrimary + "15") 
            : (isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt);

          return (
            <Pressable
              key={filter.id}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onSelect(filter.id); }}
              style={({ pressed }) => [
                styles.filterCard,
                { backgroundColor: activeBG, transform: [{ scale: pressed ? 0.96 : 1 }] }
              ]}
            >
              <Text style={[styles.label, { color: isSelected ? COLORS.brandPrimary : (isDarkMode ? COLORS.textLight : COLORS.textPrimary) }]}>
                {filter.label.toUpperCase()}
              </Text>

              {count > 0 && (
                <View style={[styles.badge, { backgroundColor: isSelected ? COLORS.brandPrimary : (isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)") }]}>
                  <Text style={[styles.badgeText, { color: isSelected ? "#FFF" : COLORS.brandPrimary }]}>
                    {count}
                  </Text>
                </View>
              )}
              
              {/* Signature Seal for Filter */}
              {isSelected && (
                <View style={styles.filterSeal}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.brandPrimary} />
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
  container: { marginVertical: 16 },
  scrollContent: { paddingLeft: 4, gap: 12, paddingBottom: 8 },
  filterCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24, // Widget Layer rounding
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  badge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: { fontSize: 10, fontWeight: "900" },
  filterSeal: { position: 'absolute', bottom: -4, right: -4 }
});
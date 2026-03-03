import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";

export default function NotificationFilters({ filters, selectedFilter, onSelect, counts = {} }) {
  const { isDarkMode } = useTheme();
  const isAndroid = Platform.OS === "android";

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {filters.map((filter) => {
          const isSelected = selectedFilter === filter.id;
          const count = counts[filter.id] || 0;
          
          const activeBG = isSelected 
            ? (isAndroid
              ? (isDarkMode ? "rgba(134, 16, 14, 0.24)" : "rgba(134, 16, 14, 0.12)")
              : (COLORS.brandPrimary + "15"))
            : (isAndroid
              ? (isDarkMode ? "rgba(18, 24, 38, 0.74)" : "rgba(255, 255, 255, 0.78)")
              : (isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt));
          const shadowLayerColor = isSelected
            ? (isDarkMode ? "rgba(134, 16, 14, 0.20)" : "rgba(134, 16, 14, 0.12)")
            : (isDarkMode ? "rgba(0, 0, 0, 0.22)" : "rgba(15, 23, 42, 0.10)");

          return (
            <Pressable
              key={filter.id}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onSelect(filter.id); }}
              style={({ pressed }) => [
                styles.filterCard,
                {
                  backgroundColor: activeBG,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                  shadowOpacity: isAndroid ? 0 : (isDarkMode ? 0.2 : 0.05),
                  elevation: isAndroid ? 0 : 3,
                }
              ]}
            >
              {isAndroid && (
                <View
                  pointerEvents="none"
                  style={[styles.androidShadowLayer, { backgroundColor: shadowLayerColor }]}
                />
              )}

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
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  androidShadowLayer: {
    position: "absolute",
    top: 2,
    left: 0,
    right: 0,
    bottom: -2,
    borderRadius: 24,
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

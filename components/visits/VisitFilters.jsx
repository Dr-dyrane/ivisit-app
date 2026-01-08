// components/visits/VisitFilters.jsx - Filter tabs for visits

import { View, Text, Pressable, ScrollView } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";

export default function VisitFilters({
  filters,
  selectedFilter,
  onSelect,
  counts = {},
}) {
  const { isDarkMode } = useTheme();

  // Solid colors matching app design system (no borders)
  const colors = {
    background: isDarkMode ? "#0B0F1A" : "#F3E7E7",
    backgroundSelected: COLORS.brandPrimary,
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    textMuted: isDarkMode ? "#94A3B8" : "#64748B",
  };

  const handleSelect = (filterId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(filterId);
  };

  return (
    <View style={{ marginBottom: 20 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10 }}
      >
        {filters.map((filter) => {
          const isSelected = selectedFilter === filter.id;
          const count = counts[filter.id] || 0;

          return (
            <Pressable
              key={filter.id}
              onPress={() => handleSelect(filter.id)}
              style={({ pressed }) => ({
                backgroundColor: isSelected
                  ? colors.backgroundSelected
                  : colors.background,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20, // No border, just background
                flexDirection: "row",
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: isSelected ? "700" : "500",
                  color: isSelected ? "#FFFFFF" : colors.text,
                }}
              >
                {filter.label}
              </Text>
              {count > 0 && (
                <View
                  style={{
                    backgroundColor: isSelected
                      ? "rgba(255,255,255,0.25)"
                      : `${COLORS.brandPrimary}20`,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                    marginLeft: 8,
                    minWidth: 24,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: isSelected ? "#FFFFFF" : COLORS.brandPrimary,
                    }}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}


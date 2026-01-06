// components/notifications/NotificationFilters.jsx - Filter tabs

import { View, Text, Pressable, ScrollView } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";

export default function NotificationFilters({
  filters,
  selectedFilter,
  onSelect,
  counts = {},
}) {
  const { isDarkMode } = useTheme();

  const colors = {
    background: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt,
    backgroundSelected: COLORS.brandPrimary,
    text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
    textMuted: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted,
    border: isDarkMode ? COLORS.border : COLORS.borderLight,
  };

  const handleSelect = (filterId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(filterId);
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
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
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 16,
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: isSelected
                  ? colors.backgroundSelected
                  : colors.border,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 13,
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
                      : `${COLORS.brandPrimary}15`,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 8,
                    marginLeft: 6,
                    minWidth: 20,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
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


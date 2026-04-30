import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../constants/colors";

export default function NotificationsFilterStrip({
  filters,
  selectedFilter,
  counts,
  onSelect,
  theme,
  metrics,
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 10, paddingHorizontal: 0, paddingBottom: 2 }}
    >
      {filters.map((filter) => {
        const isActive = selectedFilter === filter.id;
        const count = counts?.[filter.id] || 0;

        return (
          <Pressable
            key={filter.id}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect?.(filter.id);
            }}
            style={({ pressed }) => ({
              minHeight: metrics.sizing.chipHeight,
              borderRadius: 999,
              borderCurve: "continuous",
              paddingHorizontal: 14,
              paddingVertical: 8,
              backgroundColor: isActive ? theme.pillActive : theme.pillInactive,
              opacity: pressed ? 0.88 : 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            })}
          >
            <Text
              style={{
                color: isActive ? COLORS.brandPrimary : theme.text,
                fontSize: metrics.typography.caption.fontSize,
                lineHeight: metrics.typography.caption.lineHeight,
                fontWeight: "600",
              }}
            >
              {filter.label}
            </Text>
            {count > 0 ? (
              <View
                style={{
                  minWidth: 20,
                  height: 20,
                  paddingHorizontal: 6,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isActive
                    ? "rgba(134,16,14,0.18)"
                    : theme.cardMuted,
                }}
              >
                <Text
                  style={{
                    color: isActive ? COLORS.brandPrimary : theme.textMuted,
                    fontSize: 11,
                    lineHeight: 14,
                    fontWeight: "600",
                  }}
                >
                  {count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}


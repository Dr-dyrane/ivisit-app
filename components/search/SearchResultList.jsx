import React from "react";
import { Text, View } from "react-native";
import { COLORS } from "../../constants/colors";
import SearchGroupedRows from "./SearchGroupedRows";

export default function SearchResultList({
  title,
  subtitle = null,
  countLabel = null,
  rows,
  isDarkMode,
  loading = false,
  emptyTitle,
  emptyBody,
  contentPaddingHorizontal = 0,
}) {
  return (
    <View style={{ gap: 14 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 12,
          paddingHorizontal: contentPaddingHorizontal,
        }}
      >
        <View style={{ flex: 1, gap: subtitle ? 4 : 0 }}>
          <Text
            style={{
              color: isDarkMode ? "#FFFFFF" : "#0F172A",
              fontSize: 19,
              lineHeight: 25,
              fontWeight: "700",
              letterSpacing: -0.3,
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{
                color: isDarkMode ? "#94A3B8" : "#64748B",
                fontSize: 13,
                lineHeight: 18,
                fontWeight: "400",
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {countLabel ? (
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: isDarkMode
                ? "rgba(134,16,14,0.18)"
                : "rgba(134,16,14,0.10)",
            }}
          >
            <Text
              style={{
                color: COLORS.brandPrimary,
                fontSize: 11,
                lineHeight: 15,
                fontWeight: "600",
              }}
            >
              {countLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <SearchGroupedRows
        rows={rows}
        isDarkMode={isDarkMode}
        loading={loading}
        emptyTitle={emptyTitle}
        emptyBody={emptyBody}
        contentPaddingHorizontal={contentPaddingHorizontal}
      />
    </View>
  );
}

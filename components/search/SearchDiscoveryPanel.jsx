import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { COLORS } from "../../constants/colors";
import { SEARCH_SCREEN_COPY } from "./searchScreen.content";
import SearchGroupedRows from "./SearchGroupedRows";
import SearchSpecialtyStrip from "./SearchSpecialtyStrip";

export default function SearchDiscoveryPanel({
  isDarkMode,
  theme,
  discoveryTabs,
  activeTab,
  onTabChange,
  quickActionRows,
  trendingRows,
  trendingLoading,
  healthNewsRows,
  healthNewsLoading,
  specialtyOptions,
  onSpecialtySelect,
  contentPaddingHorizontal = 0,
}) {
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 12, paddingHorizontal: contentPaddingHorizontal }}>
        <Text
          style={{
            color: isDarkMode ? "#FFFFFF" : "#0F172A",
            fontSize: 19,
            lineHeight: 25,
            fontWeight: "700",
            letterSpacing: -0.3,
          }}
        >
          {SEARCH_SCREEN_COPY.sections.discoveryTitle}
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingRight: 12 }}
        >
          {discoveryTabs.map((tab) => {
            const selected = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                onPress={() => onTabChange?.(tab.key)}
                style={({ pressed }) => ({
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: selected
                    ? theme.pillActive
                    : theme.pillInactive,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text
                  style={{
                    color: selected ? COLORS.brandPrimary : theme.textMuted,
                    fontSize: 13,
                    lineHeight: 18,
                    fontWeight: "600",
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {activeTab === "quick-actions" ? (
        <SearchGroupedRows
          rows={quickActionRows}
          isDarkMode={isDarkMode}
          contentPaddingHorizontal={contentPaddingHorizontal}
          maxRowsPerGroup={2}
        />
      ) : null}

      {activeTab === "specialties" ? (
        <View style={{ paddingHorizontal: contentPaddingHorizontal }}>
          <SearchSpecialtyStrip
            specialties={specialtyOptions}
            onSelect={onSpecialtySelect}
            isDarkMode={isDarkMode}
          />
        </View>
      ) : null}

      {activeTab === "trending" ? (
        <SearchGroupedRows
          rows={trendingRows}
          isDarkMode={isDarkMode}
          loading={trendingLoading}
          emptyTitle={SEARCH_SCREEN_COPY.sections.noTrendingTitle}
          emptyBody={SEARCH_SCREEN_COPY.sections.noTrendingBody}
          contentPaddingHorizontal={contentPaddingHorizontal}
        />
      ) : null}

      {activeTab === "health-news" ? (
        <SearchGroupedRows
          rows={healthNewsRows}
          isDarkMode={isDarkMode}
          loading={healthNewsLoading}
          emptyTitle={SEARCH_SCREEN_COPY.sections.noNewsTitle}
          emptyBody={SEARCH_SCREEN_COPY.sections.noNewsBody}
          contentPaddingHorizontal={contentPaddingHorizontal}
        />
      ) : null}
    </View>
  );
}

import React from "react";
import { Text, View } from "react-native";
import EmergencySearchBar from "../emergency/EmergencySearchBar";
import { SEARCH_SCREEN_COPY } from "./searchScreen.content";
import SearchDiscoveryPanel from "./SearchDiscoveryPanel";
import SearchResultList from "./SearchResultList";
import SearchSpecialtyStrip from "./SearchSpecialtyStrip";

export default function SearchMainContent({
  model,
  isDarkMode,
  theme,
  metrics,
  contentPaddingHorizontal = 0,
}) {
  return (
    <View style={{ gap: metrics.spacing.lg }}>
      <View style={{ paddingHorizontal: contentPaddingHorizontal }}>
        <EmergencySearchBar
          value={model.query}
          onChangeText={model.setSearchQuery}
          onBlur={model.onQueryBlur}
          onClear={model.onClearQuery}
          placeholder="Search hospitals, doctors, specialties..."
          showSuggestions={false}
          glassSurface
        />
      </View>

      {model.showSpecialtyFilter ? (
        <View style={{ gap: 12 }}>
          <View style={{ paddingHorizontal: contentPaddingHorizontal }}>
            <Text
              style={{
                color: isDarkMode ? "#FFFFFF" : "#0F172A",
                fontSize: 19,
                lineHeight: 25,
                fontWeight: "700",
                letterSpacing: -0.3,
              }}
            >
              {SEARCH_SCREEN_COPY.sections.filterTitle}
            </Text>
          </View>
          <View style={{ paddingHorizontal: contentPaddingHorizontal }}>
            <SearchSpecialtyStrip
              specialties={model.filterSpecialties}
              selectedSpecialty={model.selectedSpecialty}
              counts={model.specialtyCounts}
              onSelect={model.onFilterSpecialtySelect}
              isDarkMode={isDarkMode}
              showCounts
            />
          </View>
        </View>
      ) : null}

      {model.hasQuery ? (
        <SearchResultList
          title={SEARCH_SCREEN_COPY.sections.resultsTitle}
          countLabel={model.resultCountLabel}
          rows={model.resultRows}
          isDarkMode={isDarkMode}
          emptyTitle={SEARCH_SCREEN_COPY.sections.noResultsTitle}
          emptyBody={SEARCH_SCREEN_COPY.sections.noResultsBody}
          contentPaddingHorizontal={contentPaddingHorizontal}
        />
      ) : (
        <SearchDiscoveryPanel
          isDarkMode={isDarkMode}
          theme={theme}
          discoveryTabs={model.discoveryTabs}
          activeTab={model.activeDiscoveryTab}
          onTabChange={model.onDiscoveryTabChange}
          quickActionRows={model.quickActionRows}
          trendingRows={model.trendingRows}
          trendingLoading={model.trendingLoading}
          healthNewsRows={model.healthNewsRows}
          healthNewsLoading={model.healthNewsLoading}
          specialtyOptions={model.discoverySpecialties}
          onSpecialtySelect={model.onDiscoverySpecialtySelect}
          contentPaddingHorizontal={contentPaddingHorizontal}
        />
      )}

      {model.showRecentSection ? (
        <SearchResultList
          title={SEARCH_SCREEN_COPY.sections.recentTitle}
          rows={model.recentRows}
          isDarkMode={isDarkMode}
          loading={model.historyLoading}
          emptyTitle={SEARCH_SCREEN_COPY.messages.noRecent}
          emptyBody=""
          contentPaddingHorizontal={contentPaddingHorizontal}
        />
      ) : null}
    </View>
  );
}

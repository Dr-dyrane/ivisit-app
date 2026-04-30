import React from "react";
import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SEARCH_SCREEN_COPY } from "./searchScreen.content";
import SearchGroupedRows from "./SearchGroupedRows";

export default function SearchActionIsland({
  theme,
  metrics,
  isDarkMode,
  resultCountLabel,
  recentCountLabel,
  topTrendLabel,
  primaryActionLabel,
  onPrimaryAction,
  trendingRows,
  recentRows,
  trendingLoading,
  historyLoading,
}) {
  return (
    <View style={{ gap: metrics.spacing.lg }}>
      <View style={{ gap: metrics.spacing.sm }}>
        <Text
          style={{
            color: theme.text,
            fontSize: 18,
            lineHeight: 24,
            fontWeight: "700",
            letterSpacing: -0.3,
          }}
        >
          {SEARCH_SCREEN_COPY.island.title}
        </Text>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: metrics.radii.xl,
            borderCurve: "continuous",
            padding: metrics.spacing.md,
            gap: metrics.spacing.sm,
          }}
        >
          <MetricRow
            icon="search"
            label={SEARCH_SCREEN_COPY.island.searchLabel}
            value={resultCountLabel}
            theme={theme}
            metrics={metrics}
          />
          <MetricRow
            icon="time"
            label={SEARCH_SCREEN_COPY.island.recentLabel}
            value={recentCountLabel}
            theme={theme}
            metrics={metrics}
          />
          <MetricRow
            icon="trending-up"
            label={SEARCH_SCREEN_COPY.island.trendLabel}
            value={topTrendLabel}
            theme={theme}
            metrics={metrics}
          />
        </View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPrimaryAction?.();
          }}
          style={({ pressed }) => ({
            minHeight: metrics.sizing.buttonHeight,
            borderRadius: metrics.radii.lg,
            borderCurve: "continuous",
            backgroundColor: COLORS.brandPrimary,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: metrics.typography.body.fontSize,
              lineHeight: metrics.typography.body.lineHeight,
              fontWeight: "600",
              letterSpacing: 0.1,
            }}
          >
            {primaryActionLabel}
          </Text>
        </Pressable>
      </View>

      <View style={{ gap: 12 }}>
        <Text
          style={{
            color: theme.text,
            fontSize: 15,
            lineHeight: 21,
            fontWeight: "600",
            letterSpacing: -0.2,
          }}
        >
          {SEARCH_SCREEN_COPY.island.trendingSection}
        </Text>
        <SearchGroupedRows
          rows={trendingRows}
          isDarkMode={isDarkMode}
          loading={trendingLoading}
          emptyTitle={SEARCH_SCREEN_COPY.sections.noTrendingTitle}
          emptyBody=""
          contentPaddingHorizontal={0}
          maxRowsPerGroup={4}
          skeletonPattern={[3]}
        />
      </View>

      {historyLoading || recentRows.length > 0 ? (
        <View style={{ gap: 12 }}>
          <Text
            style={{
              color: theme.text,
              fontSize: 15,
              lineHeight: 21,
              fontWeight: "600",
              letterSpacing: -0.2,
            }}
          >
            {SEARCH_SCREEN_COPY.island.historySection}
          </Text>
          <SearchGroupedRows
            rows={recentRows}
            isDarkMode={isDarkMode}
            loading={historyLoading}
            emptyTitle=""
            emptyBody=""
            contentPaddingHorizontal={0}
            maxRowsPerGroup={4}
            skeletonPattern={[3]}
          />
        </View>
      ) : null}
    </View>
  );
}

function MetricRow({ icon, label, value, theme, metrics }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.cardMuted,
        }}
      >
        <Ionicons name={icon} size={14} color={COLORS.brandPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: metrics.typography.caption.fontSize,
            lineHeight: metrics.typography.caption.lineHeight,
            fontWeight: "400",
            color: theme.textMuted,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: 13,
            lineHeight: 18,
            fontWeight: "600",
            color: theme.text,
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

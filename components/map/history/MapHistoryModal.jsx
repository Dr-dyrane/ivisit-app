import React, { useCallback, useMemo } from "react";
import { useAtom } from "jotai";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { visitHistoryFilterAtom } from "../../../atoms/visitsAtoms";
import { useTheme } from "../../../contexts/ThemeContext";
import { useVisits } from "../../../contexts/VisitsContext";
import useResponsiveSurfaceMetrics from "../../../hooks/ui/useResponsiveSurfaceMetrics";
import {
  REQUEST_HISTORY_GROUP_LABELS,
  selectGroupedHistoryBuckets,
  selectHistoryItems,
} from "../../../hooks/visits/useVisitHistorySelectors";
import MapModalShell from "../surfaces/MapModalShell";
import MapHistoryGroup from "./MapHistoryGroup";
import buildHistoryThemeTokens from "./history.theme";
import {
  HISTORY_EMPTY_STATE_BY_FILTER,
  HISTORY_FILTER_KEYS,
  HISTORY_FILTER_OPTIONS,
  HISTORY_MODAL_BOTTOM_ACTION_COPY,
  HISTORY_MODAL_COPY,
} from "./history.content";
import {
  buildHistoryFilterCounts,
  filterHistoryItemsByKey,
} from "./history.presentation";
import { historyModalStyles } from "./history.styles";
import { MAP_SHEET_SNAP_STATES } from "../core/mapSheet.constants";

/**
 * FilterChip — matches hospital list's specialtyPill voice exactly:
 *   - squircle(18), no border, compact paddings
 *   - inline count text (not badge circle)
 *   - surface: filterChipSurface / filterChipSurfaceActive (brand-red wash)
 *   - label: filterChipLabel / filterChipLabelActive (brand-red in active)
 */
function FilterChip({ option, isActive, count, theme, onPress }) {
  return (
    <Pressable
      onPress={() => onPress(option.key)}
      style={({ pressed }) => [
        historyModalStyles.filterChip,
        {
          backgroundColor: isActive
            ? theme.filterChipSurfaceActive
            : theme.filterChipSurface,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`${option.label}${count ? ` (${count})` : ""}`}
    >
      <Text
        style={[
          historyModalStyles.filterChipLabel,
          {
            color: isActive
              ? theme.filterChipLabelActive
              : theme.filterChipLabel,
          },
        ]}
      >
        {option.label}
      </Text>
      {count > 0 ? (
        <Text
          style={[
            historyModalStyles.filterChipCountText,
            {
              color: isActive
                ? theme.filterChipLabelActive
                : theme.filterChipCountText,
            },
          ]}
        >
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}

function HistorySkeletonGroup({
  theme,
  rowMetrics,
  containerRadius,
  rows = 3,
}) {
  return (
    <View style={historyModalStyles.skeletonGroup}>
      <View
        style={[
          historyModalStyles.skeletonHeader,
          { backgroundColor: theme.skeletonSoftColor },
        ]}
      />
      <View
        style={[
          historyModalStyles.skeletonContainer,
          {
            backgroundColor: theme.groupSurface,
            borderRadius: containerRadius,
          },
        ]}
      >
        {Array.from({ length: rows }).map((_, index) => (
          <React.Fragment key={`history-skeleton-row-${index}`}>
            <View style={historyModalStyles.skeletonRow}>
              <View
                style={[
                  historyModalStyles.skeletonOrb,
                  {
                    width: rowMetrics.orbSize,
                    height: rowMetrics.orbSize,
                    backgroundColor: theme.skeletonSoftColor,
                  },
                ]}
              />
              <View style={historyModalStyles.skeletonCopy}>
                <View
                  style={[
                    historyModalStyles.skeletonLinePrimary,
                    { backgroundColor: theme.skeletonBaseColor },
                  ]}
                />
                <View
                  style={[
                    historyModalStyles.skeletonLineSecondary,
                    { backgroundColor: theme.skeletonSoftColor },
                  ]}
                />
              </View>
              <View
                style={[
                  historyModalStyles.skeletonChip,
                  { backgroundColor: theme.skeletonBaseColor },
                ]}
              />
            </View>
            {index < rows - 1 ? (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: theme.hairlineDivider,
                  marginLeft:
                    theme.rowPaddingX + rowMetrics.orbSize + rowMetrics.gap,
                }}
              />
            ) : null}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

/**
 * MapHistoryModal v2
 *
 * Canonical /map history surface with full legacy VisitsScreen parity:
 *   - Filter chip strip (All / Active / Upcoming / Completed / Cancelled) + counts
 *   - Pull-to-refresh via VisitsContext.refreshVisits
 *   - Grouped buckets when filter === "all"; flat list for specific filters
 *   - Filter-aware empty states
 *   - Optional bottom CTA: "Book a visit" or "Choose care"
 *
 * Voice (per MAP_VISITS_SYSTEM_AUDIT_V1 section 10.2):
 *   - iVisit liquid-glass grouped container from MapHistoryGroup
 *   - subtle hairline dividers inside groups
 *   - requestType-muted leading orb (ambulance/bed/visit palette)
 *
 * Props
 *   - visible
 *   - onClose
 *   - onSelectVisit(item)      tap row → open MapVisitDetailsModal
 *   - onBookVisit              optional — shows "Book a visit" CTA
 *   - onChooseCare             optional — shows "Choose care" CTA (empty-state fallback)
 */
export default function MapHistoryModal({
  visible,
  onClose,
  onSelectVisit,
  onBookVisit,
  onChooseCare,
}) {
  const { isDarkMode } = useTheme();
  const viewportMetrics = useResponsiveSurfaceMetrics({
    presentationMode: "modal",
  });
  const { visits = [], isLoading, refreshVisits } = useVisits();
  const [filter, setFilter] = useAtom(visitHistoryFilterAtom);

  const theme = useMemo(
    () => buildHistoryThemeTokens({ isDarkMode, surface: "row" }),
    [isDarkMode],
  );

  // Canonical flat + grouped projections (one selector call each).
  const allItems = useMemo(() => selectHistoryItems(visits), [visits]);
  const groupedBuckets = useMemo(
    () => selectGroupedHistoryBuckets(visits),
    [visits],
  );
  const filterCounts = useMemo(
    () => buildHistoryFilterCounts(allItems),
    [allItems],
  );
  const filteredItems = useMemo(
    () => filterHistoryItemsByKey(allItems, filter),
    [allItems, filter],
  );

  const rowMetrics = useMemo(() => {
    const iconSize = Math.max(20, Math.round(viewportMetrics.type.body * 1.22));
    const orbSize = Math.max(
      40,
      Math.round(viewportMetrics.radius.card * 1.44),
    );
    return {
      iconSize,
      orbSize,
      gap: Math.max(12, viewportMetrics.insets.sectionGap),
      titleSize: Math.max(15, viewportMetrics.type.body),
      titleLineHeight: Math.max(20, viewportMetrics.type.bodyLineHeight - 4),
      subtitleSize: viewportMetrics.type.caption,
      subtitleLineHeight: Math.max(
        17,
        viewportMetrics.type.captionLineHeight + 1,
      ),
      chevronSize: 16,
    };
  }, [viewportMetrics]);

  const headerMetrics = useMemo(
    () => ({
      titleSize: 13,
      titleLineHeight: 17,
      paddingBottom: 10,
      chevronSize: 14,
    }),
    [],
  );

  const emptyMetrics = useMemo(
    () => ({
      paddingHorizontal: Math.max(18, viewportMetrics.modal.contentPadding),
      paddingVertical: Math.max(22, viewportMetrics.insets.largeGap),
      titleSize: Math.max(16, viewportMetrics.type.title - 1),
      titleLineHeight: Math.max(21, viewportMetrics.type.titleLineHeight - 3),
      bodySize: viewportMetrics.type.body,
      bodyLineHeight: viewportMetrics.type.bodyLineHeight,
      actionMarginTop: Math.max(16, viewportMetrics.insets.sectionGap),
      actionPaddingHorizontal: Math.max(
        16,
        viewportMetrics.modal.contentPadding - 2,
      ),
      actionPaddingVertical: 14,
      actionTextSize: Math.max(15, viewportMetrics.type.body),
      actionTextLineHeight: Math.max(
        20,
        viewportMetrics.type.bodyLineHeight - 4,
      ),
    }),
    [viewportMetrics],
  );

  const containerRadius = viewportMetrics.radius.card;

  const handleFilterChange = useCallback((nextKey) => {
    setFilter(nextKey);
  }, []);

  const emptyCopy =
    HISTORY_EMPTY_STATE_BY_FILTER[filter] ||
    HISTORY_EMPTY_STATE_BY_FILTER[HISTORY_FILTER_KEYS.ALL];

  const hasAny = filteredItems.length > 0;
  const isAllFilter = filter === HISTORY_FILTER_KEYS.ALL;
  const shouldShowSkeletons = Boolean(isLoading && allItems.length === 0);

  // Bottom action: prefer onBookVisit (primary care intent). Falls back to
  // onChooseCare when booking is not wired.
  const bottomAction = (() => {
    if (typeof onBookVisit === "function") {
      return {
        label: HISTORY_MODAL_BOTTOM_ACTION_COPY.bookVisit,
        onPress: onBookVisit,
      };
    }
    if (typeof onChooseCare === "function") {
      return {
        label: HISTORY_MODAL_BOTTOM_ACTION_COPY.chooseCare,
        onPress: onChooseCare,
      };
    }
    return null;
  })();

  return (
    <MapModalShell
      visible={visible}
      onClose={onClose}
      title={HISTORY_MODAL_COPY.withHistory}
      headerLayout="leading"
      defaultSnapState={MAP_SHEET_SNAP_STATES.EXPANDED}
      minHeightRatio={0.82}
      scrollEnabled={false}
      contentContainerStyle={historyModalStyles.content}
    >
      <ScrollView
        style={historyModalStyles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={historyModalStyles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(isLoading)}
            onRefresh={refreshVisits}
            tintColor={theme.tone.icon}
            colors={[theme.tone.icon]}
          />
        }
      >
        {/* Filter strip */}
        <View style={historyModalStyles.filterStripWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={historyModalStyles.filterStripContent}
          >
            {HISTORY_FILTER_OPTIONS.map((option) => (
              <FilterChip
                key={option.key}
                option={option}
                isActive={filter === option.key}
                count={filterCounts[option.key] || 0}
                theme={theme}
                onPress={handleFilterChange}
              />
            ))}
          </ScrollView>
        </View>

        {/* Body: grouped (all) / flat (filtered) / empty */}
        {shouldShowSkeletons ? (
          <View style={historyModalStyles.groupStack}>
            <HistorySkeletonGroup
              theme={theme}
              rowMetrics={rowMetrics}
              containerRadius={containerRadius}
              rows={3}
            />
            <HistorySkeletonGroup
              theme={theme}
              rowMetrics={rowMetrics}
              containerRadius={containerRadius}
              rows={2}
            />
          </View>
        ) : hasAny ? (
          isAllFilter ? (
            <View style={historyModalStyles.groupStack}>
              {groupedBuckets.map((group) => (
                <MapHistoryGroup
                  key={group.key}
                  label={
                    group.label ||
                    REQUEST_HISTORY_GROUP_LABELS[group.key] ||
                    null
                  }
                  items={group.items}
                  onSelectItem={onSelectVisit}
                  metrics={rowMetrics}
                  containerRadius={containerRadius}
                  headerMetrics={headerMetrics}
                  isDarkMode={isDarkMode}
                />
              ))}
            </View>
          ) : (
            <MapHistoryGroup
              items={filteredItems}
              onSelectItem={onSelectVisit}
              metrics={rowMetrics}
              containerRadius={containerRadius}
              isDarkMode={isDarkMode}
            />
          )
        ) : (
          <View
            style={[
              historyModalStyles.emptyCard,
              {
                paddingHorizontal: emptyMetrics.paddingHorizontal,
                paddingVertical: emptyMetrics.paddingVertical,
                backgroundColor: theme.groupSurface,
                borderRadius: containerRadius,
              },
            ]}
          >
            <Text
              style={[
                historyModalStyles.emptyTitle,
                {
                  color: theme.titleColor,
                  fontSize: emptyMetrics.titleSize,
                  lineHeight: emptyMetrics.titleLineHeight,
                },
              ]}
            >
              {emptyCopy.title}
            </Text>
            <Text
              style={[
                historyModalStyles.emptyBody,
                {
                  color: theme.mutedColor,
                  fontSize: emptyMetrics.bodySize,
                  lineHeight: emptyMetrics.bodyLineHeight,
                  marginTop: 8,
                },
              ]}
            >
              {emptyCopy.body}
            </Text>
          </View>
        )}

        {/* Bottom action (primary CTA) */}
        {bottomAction ? (
          <Pressable
            onPress={bottomAction.onPress}
            style={({ pressed }) => [
              historyModalStyles.bottomAction,
              {
                backgroundColor: theme.neutralActionSurface,
                borderRadius: Math.max(16, containerRadius - 4),
                opacity: pressed ? 0.9 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={bottomAction.label}
          >
            <Text
              style={[
                historyModalStyles.bottomActionText,
                { color: theme.titleColor },
              ]}
            >
              {bottomAction.label}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </MapModalShell>
  );
}

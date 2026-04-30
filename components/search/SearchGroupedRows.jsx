import React, { useMemo } from "react";
import { Text, View } from "react-native";
import MiniProfileShortcutGroup from "../emergency/miniProfile/MiniProfileShortcutGroup";
import {
  getMiniProfileColors,
  getMiniProfileLayout,
  getMiniProfileTones,
} from "../emergency/miniProfile/miniProfile.model";

function chunkRows(rows, size) {
  const groups = [];
  for (let index = 0; index < rows.length; index += size) {
    groups.push(rows.slice(index, index + size));
  }
  return groups;
}

function normalizeRows(rows, tones) {
  return rows.map((row) => ({
    ...row,
    tone: tones[row.toneKey] || tones.system,
  }));
}

export default function SearchGroupedRows({
  rows,
  isDarkMode,
  loading = false,
  emptyTitle = "",
  emptyBody = "",
  contentPaddingHorizontal = 0,
  maxRowsPerGroup = 4,
  skeletonPattern = [3, 3],
}) {
  const colors = useMemo(() => getMiniProfileColors(isDarkMode), [isDarkMode]);
  const tones = useMemo(() => getMiniProfileTones(isDarkMode), [isDarkMode]);
  const layout = useMemo(
    () =>
      getMiniProfileLayout(
        {
          insets: {
            sectionGap: 12,
            horizontal: 20,
          },
          type: {
            body: 16,
            headerTitle: 26,
            caption: 13,
          },
          radius: {
            card: 28,
          },
        },
        { preferDrawerPresentation: false },
      ),
    [],
  );
  const normalizedRows = useMemo(
    () => normalizeRows(Array.isArray(rows) ? rows : [], tones),
    [rows, tones],
  );
  const groups = useMemo(
    () => chunkRows(normalizedRows, maxRowsPerGroup),
    [maxRowsPerGroup, normalizedRows],
  );

  if (loading) {
    return (
      <View style={{ gap: 16, paddingHorizontal: contentPaddingHorizontal }}>
        {skeletonPattern.map((count, groupIndex) => (
          <View
            key={`search-skeleton-group-${groupIndex}`}
            style={{
              backgroundColor: colors.card,
              borderRadius: layout.groups.radius,
              overflow: "hidden",
            }}
          >
            {Array.from({ length: count }).map((_, rowIndex) => (
              <View
                key={`search-skeleton-row-${groupIndex}-${rowIndex}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  minHeight: layout.row.minHeight,
                  paddingLeft: layout.row.paddingLeft,
                  paddingRight: layout.row.paddingRight,
                }}
              >
                <View
                  style={{
                    width: layout.row.orbSize,
                    height: layout.row.orbSize,
                    borderRadius: 999,
                    marginRight: layout.row.orbGap,
                    backgroundColor: colors.cardStrong,
                  }}
                />
                <View
                  style={{
                    flex: 1,
                    minHeight: layout.row.minHeight,
                    justifyContent: "center",
                    gap: 6,
                    borderBottomWidth: rowIndex === count - 1 ? 0 : 1,
                    borderBottomColor: colors.divider,
                  }}
                >
                  <View
                    style={{
                      width: rowIndex % 2 === 0 ? "44%" : "56%",
                      height: 14,
                      borderRadius: 999,
                      backgroundColor: colors.cardStrong,
                    }}
                  />
                  <View
                    style={{
                      width: rowIndex % 2 === 0 ? "58%" : "46%",
                      height: 11,
                      borderRadius: 999,
                      backgroundColor: colors.card,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }

  if (!groups.length) {
    return (
      <View
        style={{
          paddingHorizontal: contentPaddingHorizontal,
        }}
      >
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: layout.groups.radius,
            paddingHorizontal: 18,
            paddingVertical: 20,
            gap: 6,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 16,
              lineHeight: 22,
              fontWeight: "600",
              letterSpacing: -0.2,
            }}
          >
            {emptyTitle}
          </Text>
          {emptyBody ? (
            <Text
              style={{
                color: colors.muted,
                fontSize: 14,
                lineHeight: 20,
                fontWeight: "400",
              }}
            >
              {emptyBody}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 16, paddingHorizontal: contentPaddingHorizontal }}>
      {groups.map((groupRows, groupIndex) => (
        <MiniProfileShortcutGroup
          key={`search-group-${groupIndex}`}
          rows={groupRows}
          colors={colors}
          layout={layout}
        />
      ))}
    </View>
  );
}

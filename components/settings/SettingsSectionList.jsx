import React from "react";
import { View } from "react-native";
import {
  getMiniProfileColors,
  getMiniProfileLayout,
} from "../emergency/miniProfile/miniProfile.model";
import {
  SettingsCard,
  SettingsChevron,
  SettingsGroup,
  SettingsToggle,
} from "./SettingsCard";

// PULLBACK NOTE: SettingsSectionList keeps the grouped blade grammar stable while the shell changes.
// Rows come from the screen model; this component only renders the grouped list surface.

export default function SettingsSectionList({
  sections,
  isDarkMode,
  contentPaddingHorizontal = 12,
  loading = false,
}) {
  if (loading) {
    const colors = getMiniProfileColors(isDarkMode);
    const layout = getMiniProfileLayout({});

    return (
      <>
        {[2, 3, 2, 2].map((rows, groupIndex) => (
          <SettingsGroup
            key={`settings-skeleton-group-${groupIndex}`}
            style={{
              marginBottom: 16,
              marginHorizontal: contentPaddingHorizontal,
            }}
          >
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <View
                key={`settings-skeleton-row-${groupIndex}-${rowIndex}`}
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
                    backgroundColor: colors.cardStrong,
                    marginRight: layout.row.orbGap,
                  }}
                />
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    minHeight: layout.row.minHeight,
                    borderBottomWidth: rowIndex === rows - 1 ? 0 : 1,
                    borderBottomColor: colors.divider,
                  }}
                >
                  <View
                    style={{
                      width: rowIndex % 2 === 0 ? "46%" : "58%",
                      height: 14,
                      borderRadius: 999,
                      backgroundColor: colors.cardStrong,
                    }}
                  />
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 999,
                      backgroundColor: colors.card,
                    }}
                  />
                </View>
              </View>
            ))}
          </SettingsGroup>
        ))}
      </>
    );
  }

  return (
    <>
      {sections.map((section) => (
        <SettingsGroup
          key={section.key}
          style={{
            marginBottom: 16,
            marginHorizontal: contentPaddingHorizontal,
          }}
        >
          {section.rows.map((row, index) => (
            <SettingsCard
              key={row.key}
              iconName={row.iconName}
              title={row.title}
              tone={row.tone}
              destructive={row.destructive === true}
              disabled={row.disabled === true}
              isLast={index === section.rows.length - 1}
              onPress={row.onPress}
              rightElement={buildRightElement({
                row,
                isDarkMode,
              })}
            />
          ))}
        </SettingsGroup>
      ))}
    </>
  );
}

function buildRightElement({ row, isDarkMode }) {
  if (row.trailing === "toggle") {
    return (
      <SettingsToggle
        value={row.value === true}
        disabled={row.disabled === true}
      />
    );
  }

  if (row.trailing === "chevron") {
    return <SettingsChevron isDarkMode={isDarkMode} />;
  }

  return null;
}

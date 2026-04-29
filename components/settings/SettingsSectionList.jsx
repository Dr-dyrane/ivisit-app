import React from "react";
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
}) {
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

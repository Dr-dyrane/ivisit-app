import React, { useMemo } from "react";
import { Platform, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import MiniProfileShortcutGroup from "../emergency/miniProfile/MiniProfileShortcutGroup";
import {
  getMiniProfileColors,
  getMiniProfileLayout,
  getMiniProfileTones,
} from "../emergency/miniProfile/miniProfile.model";

// PULLBACK NOTE: Summary list now shares the mini-profile grouped blade grammar.
// Medical profile still gets multi-line value previews, but spacing, orb rhythm, and action affordances come from the shared stack surface language.

const ROW_TONES = {
  bloodType: "profile",
  allergies: "care",
  medications: "care",
  conditions: "system",
  surgeries: "system",
  notes: "map",
};

function buildSkeletonSections() {
  return [
    { key: "current", rowCount: 3 },
    { key: "history", rowCount: 3 },
  ];
}

export default function MedicalProfileSummaryList({
  sections,
  isDarkMode,
  theme,
  metrics,
  onEditProfile,
  contentPaddingHorizontal = 12,
  footerNotice = null,
  loading = false,
}) {
  const colors = useMemo(() => getMiniProfileColors(isDarkMode), [isDarkMode]);
  const tones = useMemo(() => getMiniProfileTones(isDarkMode), [isDarkMode]);
  const layout = useMemo(
    () =>
      getMiniProfileLayout(
        {
          content: { paddingHorizontal: contentPaddingHorizontal },
        },
        { preferDrawerPresentation: false },
      ),
    [contentPaddingHorizontal],
  );

  if (loading) {
    return (
      <>
        {buildSkeletonSections().map((section) => (
          <View
            key={section.key}
            style={{
              marginHorizontal: contentPaddingHorizontal,
              marginBottom: metrics.spacing.lg,
              gap: metrics.spacing.sm,
            }}
          >
            <View
              style={{
                width: 132,
                height: 13,
                borderRadius: 999,
                backgroundColor: theme.skeletonSoft,
              }}
            />

            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: layout.groups.radius,
                borderCurve: Platform.OS === "ios" ? "continuous" : undefined,
                overflow: "hidden",
              }}
            >
              {Array.from({ length: section.rowCount }).map((_, index) => (
                <View
                  key={`${section.key}-skeleton-${index}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    minHeight: layout.row.minHeight + 8,
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
                      backgroundColor: theme.skeletonSoft,
                    }}
                  />
                  <View
                    style={{
                      flex: 1,
                      minHeight: layout.row.minHeight + 8,
                      justifyContent: "center",
                      gap: 8,
                      borderBottomWidth: index === section.rowCount - 1 ? 0 : 1,
                      borderBottomColor: colors.divider,
                    }}
                  >
                    <View
                      style={{
                        width: index % 2 === 0 ? "42%" : "56%",
                        height: 15,
                        borderRadius: 999,
                        backgroundColor: theme.skeletonBase,
                      }}
                    />
                    <View
                      style={{
                        width: index % 2 === 0 ? "72%" : "64%",
                        height: 12,
                        borderRadius: 999,
                        backgroundColor: theme.skeletonSoft,
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </>
    );
  }

  return (
    <>
      {sections.map((section) => (
        <View
          key={section.key}
          style={{
            marginHorizontal: contentPaddingHorizontal,
            marginBottom: metrics.spacing.lg,
            gap: metrics.spacing.sm,
          }}
        >
          <Text
            style={{
              color: colors.muted,
              fontSize: 13,
              lineHeight: 18,
              fontWeight: "600",
            }}
          >
            {section.title}
          </Text>

          <MiniProfileShortcutGroup
            rows={section.rows.map((row) => ({
              key: row.key,
              label: row.label,
              subtitle: row.isEmpty ? null : row.value,
              icon: row.iconName,
              tone: tones[ROW_TONES[row.key] || "system"],
              badge: row.isEmpty ? "Add" : null,
              subtitleColor: colors.muted,
              onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onEditProfile?.();
              },
            }))}
            colors={colors}
            layout={layout}
          />
        </View>
      ))}

      {footerNotice ? (
        <Text
          style={{
            marginHorizontal: contentPaddingHorizontal,
            color: colors.muted,
            fontSize: 13,
            lineHeight: 18,
            fontWeight: "400",
          }}
        >
          {footerNotice}
        </Text>
      ) : null}
    </>
  );
}

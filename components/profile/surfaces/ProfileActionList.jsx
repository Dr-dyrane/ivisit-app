import React from "react";
import { View, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import MiniProfileShortcutGroup from "../../emergency/miniProfile/MiniProfileShortcutGroup";
import {
  getMiniProfileColors,
  getMiniProfileLayout,
  getMiniProfileTones,
} from "../../emergency/miniProfile/miniProfile.model";

// PULLBACK NOTE: ProfileActionList - Modular action list component
// Extracted from ProfileScreen to follow /map module pattern
// REASON: Separation of concerns, easier debugging and maintenance

export default function ProfileActionList({
  emergencyContacts,
  user,
  isDarkMode,
  router,
  navigateToEmergencyContacts,
  navigateToMedicalProfile,
  navigateToInsurance,
  onPersonalInfoPress,
  onDeleteAccountPress,
  onSignOutPress,
  fadeAnim,
  slideAnim,
  contentPaddingHorizontal = 12,
  loading = false,
}) {
  const miniProfileColors = getMiniProfileColors(isDarkMode);
  const miniProfileTones = getMiniProfileTones(isDarkMode);

  const layout = getMiniProfileLayout(
    {
      content: { paddingHorizontal: 12 },
    },
    { preferDrawerPresentation: false },
  );

  if (loading) {
    return (
      <View style={{ gap: 16, paddingHorizontal: contentPaddingHorizontal }}>
        {[1, 2, 2, 2].map((rows, groupIndex) => (
          <View
            key={`profile-skeleton-group-${groupIndex}`}
            style={{
              backgroundColor: miniProfileColors.card,
              borderRadius: layout.groups.radius,
              overflow: "hidden",
            }}
          >
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <View
                key={`profile-skeleton-row-${groupIndex}-${rowIndex}`}
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
                    backgroundColor: miniProfileColors.cardStrong,
                  }}
                />
                <View
                  style={{
                    flex: 1,
                    minHeight: layout.row.minHeight,
                    justifyContent: "center",
                    borderBottomWidth: rowIndex === rows - 1 ? 0 : 1,
                    borderBottomColor: miniProfileColors.divider,
                  }}
                >
                  <View
                    style={{
                      width: rowIndex % 2 === 0 ? "48%" : "58%",
                      height: 14,
                      borderRadius: 999,
                      backgroundColor: miniProfileColors.cardStrong,
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

  const actionGroups = [
    [
      {
        key: "personal-info",
        label: "Personal Information",
        icon: "person",
        tone: miniProfileTones.profile,
        badge: null,
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPersonalInfoPress();
        },
      },
    ],
    [
      {
        key: "emergency-contacts",
        label: "Emergency Contacts",
        icon: "people",
        tone: miniProfileTones.contacts,
        badge: Array.isArray(emergencyContacts) ? emergencyContacts.length : 0,
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigateToEmergencyContacts({ router });
        },
      },
      {
        key: "health-info",
        label: "Health Information",
        icon: "medical",
        tone: miniProfileTones.care,
        badge: null,
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigateToMedicalProfile({ router });
        },
      },
    ],
    [
      {
        key: "coverage",
        label: "Coverage",
        icon: "shield-checkmark",
        tone: miniProfileTones.payment,
        badge: user?.hasInsurance ? 1 : 0,
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigateToInsurance({ router });
        },
      },
    ],
    [
      {
        key: "sign-out",
        label: "Sign Out",
        icon: "exit",
        tone: miniProfileTones.destructive,
        badge: null,
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSignOutPress();
        },
      },
      {
        key: "delete-account",
        label: "Delete Account",
        icon: "trash",
        tone: miniProfileTones.destructive,
        badge: null,
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onDeleteAccountPress();
        },
      },
    ],
  ];

  const content = (
    <View style={{ gap: 16, paddingHorizontal: contentPaddingHorizontal }}>
      {actionGroups.map((rows, groupIndex) => (
        <MiniProfileShortcutGroup
          key={`group-${groupIndex}`}
          rows={rows}
          colors={miniProfileColors}
          layout={layout}
        />
      ))}
    </View>
  );

  if (!fadeAnim && !slideAnim) {
    return content;
  }

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      {content}
    </Animated.View>
  );
}

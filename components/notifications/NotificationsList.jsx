import React, { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getMiniProfileColors,
  getMiniProfileLayout,
  getMiniProfileTones,
} from "../emergency/miniProfile/miniProfile.model";
import {
  getNotificationIcon,
  getRelativeTime,
} from "../../constants/notifications";
import { getPriorityColor } from "../../constants/notifications";
import { COLORS } from "../../constants/colors";
import { NOTIFICATIONS_SCREEN_COPY } from "./notificationsScreen.content";
import NotificationsSectionClearModal from "./NotificationsSectionClearModal";

export default function NotificationsList({
  sections,
  isDarkMode,
  loading = false,
  emptyTitle,
  emptyBody,
  contentPaddingHorizontal = 0,
  onPrimaryAction,
  primaryActionLabel,
  isSelectMode = false,
  selectedIdSet,
  onPrepareSectionSelection,
  onDeleteSection,
  onClearSectionSelection,
  onPressNotification,
  onLongPressNotification,
}) {
  const colors = useMemo(() => getMiniProfileColors(isDarkMode), [isDarkMode]);
  const tones = useMemo(() => getMiniProfileTones(isDarkMode), [isDarkMode]);
  const [pendingClearSection, setPendingClearSection] = useState(null);
  const [isDeletingSection, setIsDeletingSection] = useState(false);
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

  const handleRequestSectionClear = useCallback(
    (section) => {
      if (!section?.items?.length) return;
      onPrepareSectionSelection?.(section);
      setPendingClearSection(section);
    },
    [onPrepareSectionSelection],
  );

  const handleCancelSectionClear = useCallback(() => {
    setPendingClearSection(null);
    onClearSectionSelection?.();
  }, [onClearSectionSelection]);

  const handleConfirmSectionClear = useCallback(async () => {
    if (!pendingClearSection) return;
    setIsDeletingSection(true);
    try {
      await onDeleteSection?.(pendingClearSection);
      setPendingClearSection(null);
    } finally {
      setIsDeletingSection(false);
    }
  }, [onDeleteSection, pendingClearSection]);

  if (loading) {
    return (
      <View style={{ gap: 16, paddingHorizontal: contentPaddingHorizontal }}>
        {[3, 2, 3].map((count, groupIndex) => (
          <View
            key={`notifications-skeleton-${groupIndex}`}
            style={{ gap: 10 }}
          >
            <View
              style={{
                width: groupIndex === 1 ? 96 : 74,
                height: 12,
                borderRadius: 999,
                backgroundColor: colors.cardStrong,
              }}
            />
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: layout.groups.radius,
                overflow: "hidden",
              }}
            >
              {Array.from({ length: count }).map((_, rowIndex) => (
                <View
                  key={`notifications-skeleton-row-${groupIndex}-${rowIndex}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    minHeight: layout.row.minHeight + 12,
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
                      minHeight: layout.row.minHeight + 12,
                      justifyContent: "center",
                      gap: 6,
                      borderBottomWidth: rowIndex === count - 1 ? 0 : 1,
                      borderBottomColor: colors.divider,
                    }}
                  >
                    <View
                      style={{
                        width: rowIndex % 2 === 0 ? "48%" : "58%",
                        height: 14,
                        borderRadius: 999,
                        backgroundColor: colors.cardStrong,
                      }}
                    />
                    <View
                      style={{
                        width: rowIndex % 2 === 0 ? "70%" : "62%",
                        height: 11,
                        borderRadius: 999,
                        backgroundColor: colors.card,
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (!sections.length) {
    return (
      <View style={{ paddingHorizontal: contentPaddingHorizontal }}>
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: layout.groups.radius,
            paddingHorizontal: 18,
            paddingVertical: 20,
            gap: 8,
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
          {primaryActionLabel ? (
            <Pressable
              onPress={onPrimaryAction}
              style={({ pressed }) => ({
                marginTop: 6,
                minHeight: 42,
                borderRadius: 999,
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
                  fontSize: 14,
                  lineHeight: 20,
                  fontWeight: "600",
                }}
              >
                {primaryActionLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 16, paddingHorizontal: contentPaddingHorizontal }}>
      {sections.map((section) => (
        <View key={section.key} style={{ gap: 10 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: 12,
                lineHeight: 16,
                fontWeight: "600",
                flex: 1,
              }}
            >
              {section.label}
            </Text>
            {!isSelectMode ? (
              <Pressable
                onPress={() => handleRequestSectionClear(section)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                  paddingVertical: 2,
                })}
              >
                <Text
                  style={{
                    color: COLORS.brandPrimary,
                    fontSize: 12,
                    lineHeight: 16,
                    fontWeight: "600",
                  }}
                >
                  {NOTIFICATIONS_SCREEN_COPY.rows.clearSection}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: layout.groups.radius,
              overflow: "hidden",
            }}
          >
            {section.items.map((notification, rowIndex) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                isLast={rowIndex === section.items.length - 1}
                colors={colors}
                tones={tones}
                layout={layout}
                isSelectMode={isSelectMode}
                isSelected={selectedIdSet?.has(notification.id) === true}
                onPress={() => onPressNotification?.(notification)}
                onLongPress={() => onLongPressNotification?.(notification)}
              />
            ))}
          </View>
        </View>
      ))}

      <NotificationsSectionClearModal
        visible={Boolean(pendingClearSection)}
        sectionLabel={pendingClearSection?.label}
        count={pendingClearSection?.items?.length || 0}
        onClose={handleCancelSectionClear}
        onConfirm={handleConfirmSectionClear}
        loading={isDeletingSection}
        theme={{
          text: colors.text,
        }}
      />
    </View>
  );
}

function NotificationRow({
  notification,
  isLast,
  colors,
  tones,
  layout,
  isSelectMode,
  isSelected,
  onPress,
  onLongPress,
}) {
  const tone = getTone(notification, tones);
  const isUnread = notification?.read !== true;
  const priorityColor = getPriorityColor(notification?.priority);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        minHeight: layout.row.minHeight + 14,
        paddingLeft: layout.row.paddingLeft,
        paddingRight: layout.row.paddingRight,
        opacity: pressed ? 0.88 : 1,
      })}
    >
      <View
        style={{
          width: layout.row.orbSize,
          height: layout.row.orbSize,
          borderRadius: 999,
          backgroundColor: tone.bg,
          alignItems: "center",
          justifyContent: "center",
          marginRight: layout.row.orbGap,
        }}
      >
        <Ionicons
          name={getNotificationIcon(notification?.type)}
          size={layout.row.iconSize}
          color={tone.icon}
        />
      </View>

      <View
        style={{
          flex: 1,
          minHeight: layout.row.minHeight + 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: layout.row.contentGap,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: colors.divider,
        }}
      >
        <View style={{ flex: 1, gap: 2, paddingVertical: 10 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: layout.row.labelSize,
              lineHeight: layout.row.labelLineHeight,
              fontWeight: isUnread ? "600" : layout.row.labelWeight,
              letterSpacing: -0.12,
            }}
            numberOfLines={1}
          >
            {notification?.title}
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontSize: 13,
              lineHeight: 18,
              fontWeight: "400",
            }}
            numberOfLines={2}
          >
            {notification?.message}
          </Text>
        </View>

        <View
          style={{
            alignItems: "flex-end",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 10,
            marginLeft: 10,
          }}
        >
          <Text
            style={{
              color: colors.subtle,
              fontSize: 11,
              lineHeight: 14,
              fontWeight: "500",
            }}
          >
            {getRelativeTime(notification?.timestamp)}
          </Text>

          {isSelectMode ? (
            <Ionicons
              name={isSelected ? "checkmark-circle" : "ellipse-outline"}
              size={20}
              color={isSelected ? COLORS.brandPrimary : colors.subtle}
            />
          ) : isUnread ? (
            <View
              style={{
                minHeight: 22,
                paddingHorizontal: 8,
                borderRadius: 999,
                backgroundColor: `${priorityColor}16`,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: priorityColor,
                  fontSize: 11,
                  lineHeight: 14,
                  fontWeight: "600",
                }}
              >
                {NOTIFICATIONS_SCREEN_COPY.rows.unreadBadge}
              </Text>
            </View>
          ) : (
            <Ionicons
              name="chevron-forward"
              size={layout.row.chevronSize}
              color={colors.subtle}
            />
          )}
        </View>
      </View>
    </Pressable>
  );
}

function getTone(notification, tones) {
  if (notification?.type === "emergency") return tones.destructive;
  if (notification?.type === "support") return tones.contacts;
  if (notification?.type === "appointment" || notification?.type === "visit") {
    return tones.profile;
  }
  if (notification?.type === "system") return tones.system;
  return tones.payment;
}

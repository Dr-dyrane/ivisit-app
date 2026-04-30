import React from "react";
import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { NOTIFICATIONS_SCREEN_COPY } from "./notificationsScreen.content";

export default function NotificationsActionIsland({
  theme,
  metrics,
  model,
  loading = false,
}) {
  if (loading) {
    return (
      <View style={{ gap: metrics.spacing.lg }}>
        <View
          style={{
            width: 144,
            height: 18,
            borderRadius: 999,
            backgroundColor: theme.skeletonBase,
          }}
        />
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: metrics.radii.xl,
            borderCurve: "continuous",
            padding: metrics.spacing.md,
            gap: metrics.spacing.sm,
          }}
        >
          {[1, 2, 3, 4].map((index) => (
            <View
              key={`notifications-island-skeleton-row-${index}`}
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  borderCurve: "continuous",
                  backgroundColor: theme.cardMuted,
                }}
              />
              <View style={{ flex: 1, gap: 6 }}>
                <View
                  style={{
                    width: "34%",
                    height: 11,
                    borderRadius: 999,
                    backgroundColor: theme.skeletonSoft,
                  }}
                />
                <View
                  style={{
                    width: "56%",
                    height: 13,
                    borderRadius: 999,
                    backgroundColor: theme.skeletonBase,
                  }}
                />
              </View>
            </View>
          ))}
        </View>

        <View
          style={{
            minHeight: metrics.sizing.buttonHeight,
            borderRadius: metrics.radii.lg,
            borderCurve: "continuous",
            backgroundColor: theme.skeletonBase,
          }}
        />

        <View style={{ gap: 12 }}>
          <View
            style={{
              width: 112,
              height: 14,
              borderRadius: 999,
              backgroundColor: theme.skeletonSoft,
            }}
          />
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: metrics.radii.xl,
              borderCurve: "continuous",
              overflow: "hidden",
            }}
          >
            {[1, 2, 3].map((index) => (
              <View
                key={`notifications-island-skeleton-item-${index}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderBottomWidth: index === 3 ? 0 : 1,
                  borderBottomColor: theme.border,
                }}
              >
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    backgroundColor: theme.cardMuted,
                  }}
                />
                <View style={{ flex: 1, gap: 6 }}>
                  <View
                    style={{
                      width: "58%",
                      height: 12,
                      borderRadius: 999,
                      backgroundColor: theme.skeletonBase,
                    }}
                  />
                  <View
                    style={{
                      width: "76%",
                      height: 11,
                      borderRadius: 999,
                      backgroundColor: theme.skeletonSoft,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  const latestUnread = model.notifications
    .filter((notification) => notification?.read !== true)
    .slice(0, 3);

  return (
    <View style={{ gap: metrics.spacing.lg }}>
      <Text
        style={{
          color: theme.text,
          fontSize: 18,
          lineHeight: 24,
          fontWeight: "700",
          letterSpacing: -0.3,
        }}
      >
        {NOTIFICATIONS_SCREEN_COPY.island.title}
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
          icon="mail-unread-outline"
          label={NOTIFICATIONS_SCREEN_COPY.island.unreadLabel}
          value={model.contextUnreadLabel}
          theme={theme}
          metrics={metrics}
        />
        <MetricRow
          icon="albums-outline"
          label={NOTIFICATIONS_SCREEN_COPY.island.totalLabel}
          value={model.contextTotalLabel}
          theme={theme}
          metrics={metrics}
        />
        <MetricRow
          icon="funnel-outline"
          label={NOTIFICATIONS_SCREEN_COPY.island.filterLabel}
          value={model.focusLabel}
          theme={theme}
          metrics={metrics}
        />
        <MetricRow
          icon="checkbox-outline"
          label={NOTIFICATIONS_SCREEN_COPY.island.selectedLabel}
          value={`${model.selectedCount} selected`}
          theme={theme}
          metrics={metrics}
        />
      </View>

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          model.onPrimaryAction?.();
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
          {model.primaryActionLabel}
        </Text>
      </Pressable>

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
          {NOTIFICATIONS_SCREEN_COPY.island.latestSection}
        </Text>

        {latestUnread.length > 0 ? (
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: metrics.radii.xl,
              borderCurve: "continuous",
              overflow: "hidden",
            }}
          >
            {latestUnread.map((notification, index) => (
              <Pressable
                key={notification.id}
                onPress={() => model.onNotificationPress(notification)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderBottomWidth: index === latestUnread.length - 1 ? 0 : 1,
                  borderBottomColor: theme.border,
                  opacity: pressed ? 0.88 : 1,
                })}
              >
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    backgroundColor: "rgba(134,16,14,0.12)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={14}
                    color={COLORS.brandPrimary}
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 13,
                      lineHeight: 18,
                      fontWeight: "600",
                    }}
                    numberOfLines={1}
                  >
                    {notification.title}
                  </Text>
                  <Text
                    style={{
                      color: theme.textMuted,
                      fontSize: 12,
                      lineHeight: 16,
                      fontWeight: "400",
                    }}
                    numberOfLines={1}
                  >
                    {notification.message}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: metrics.radii.xl,
              borderCurve: "continuous",
              paddingHorizontal: 16,
              paddingVertical: 18,
            }}
          >
            <Text
              style={{
                color: theme.textMuted,
                fontSize: 14,
                lineHeight: 20,
                fontWeight: "400",
              }}
            >
              {NOTIFICATIONS_SCREEN_COPY.messages.latestUnreadEmpty}
            </Text>
          </View>
        )}
      </View>
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

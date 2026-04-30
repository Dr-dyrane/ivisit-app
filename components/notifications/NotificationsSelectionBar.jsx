import React from "react";
import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { NOTIFICATIONS_SCREEN_COPY } from "./notificationsScreen.content";

export default function NotificationsSelectionBar({
  model,
  theme,
  metrics,
}) {
  if (!model.isSelectMode) return null;

  return (
    <View
      style={{
        backgroundColor: theme.selectionSurface,
        borderRadius: metrics.radii.lg,
        borderCurve: "continuous",
        padding: metrics.spacing.md,
        gap: metrics.spacing.md,
      }}
    >
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
            color: theme.text,
            fontSize: metrics.typography.body.fontSize,
            lineHeight: metrics.typography.body.lineHeight,
            fontWeight: "600",
          }}
        >
          {model.selectedCount} selected
        </Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            model.onCloseSelectionMode();
          }}
          style={({ pressed }) => ({
            opacity: pressed ? 0.76 : 1,
            padding: 4,
          })}
        >
          <Text
            style={{
              color: theme.textMuted,
              fontSize: metrics.typography.caption.fontSize,
              lineHeight: metrics.typography.caption.lineHeight,
              fontWeight: "600",
            }}
          >
            {NOTIFICATIONS_SCREEN_COPY.rows.done}
          </Text>
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <SelectionAction
          label={
            model.allFilteredSelected
              ? NOTIFICATIONS_SCREEN_COPY.rows.clearAll
              : NOTIFICATIONS_SCREEN_COPY.rows.selectAll
          }
          icon="checkbox-outline"
          onPress={model.onToggleSelectAll}
          theme={theme}
          metrics={metrics}
        />
        <SelectionAction
          label={NOTIFICATIONS_SCREEN_COPY.rows.markRead}
          icon="checkmark-done-outline"
          onPress={model.onMarkSelectedRead}
          theme={theme}
          metrics={metrics}
          disabled={model.selectedCount === 0}
        />
        <SelectionAction
          label={NOTIFICATIONS_SCREEN_COPY.rows.delete}
          icon="trash-outline"
          onPress={model.onDeleteSelected}
          theme={theme}
          metrics={metrics}
          disabled={model.selectedCount === 0}
          destructive
        />
      </View>
    </View>
  );
}

function SelectionAction({
  label,
  icon,
  onPress,
  theme,
  metrics,
  destructive = false,
  disabled = false,
}) {
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      style={({ pressed }) => ({
        minHeight: 36,
        borderRadius: 999,
        borderCurve: "continuous",
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: disabled
          ? theme.cardMuted
          : destructive
            ? "rgba(239,68,68,0.12)"
            : theme.card,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        opacity: pressed ? 0.82 : disabled ? 0.5 : 1,
      })}
    >
      <Ionicons
        name={icon}
        size={16}
        color={destructive ? "#EF4444" : COLORS.brandPrimary}
      />
      <Text
        style={{
          color: destructive ? "#EF4444" : theme.text,
          fontSize: metrics.typography.caption.fontSize,
          lineHeight: metrics.typography.caption.lineHeight,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}


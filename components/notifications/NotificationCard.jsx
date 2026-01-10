// components/notifications/NotificationCard.jsx - Individual notification card

import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";
import { 
  getNotificationIcon, 
  getPriorityColor, 
  getRelativeTime,
  NOTIFICATION_PRIORITY,
} from "../../constants/notifications";

export default function NotificationCard({
  notification,
  onPress,
  onMarkRead,
  onDelete,
}) {
  const { isDarkMode } = useTheme();

  const colors = {
    card: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt,
    cardUnread: isDarkMode ? `${COLORS.brandPrimary}08` : `${COLORS.brandPrimary}05`,
    text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
    textMuted: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted,
    border: isDarkMode ? COLORS.border : COLORS.borderLight,
  };

  const icon = getNotificationIcon(notification.type);
  const priorityColor = getPriorityColor(notification.priority);
  const timeAgo = getRelativeTime(notification.timestamp);
  const isUrgent = notification.priority === NOTIFICATION_PRIORITY.URGENT;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!notification.read) {
      onMarkRead?.(notification.id);
    }
    onPress?.(notification);
  };

  const handleSwipeDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete?.(notification.id);
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleSwipeDelete}
      style={({ pressed }) => ({
        backgroundColor: notification.read ? colors.card : colors.cardUnread,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: notification.read ? colors.border : `${COLORS.brandPrimary}20`,
        borderLeftWidth: notification.read ? 1 : 4,
        borderLeftColor: notification.read ? colors.border : priorityColor,
        opacity: pressed ? 0.8 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        {/* Icon */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: `${priorityColor}15`,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
          }}
        >
          <Ionicons name={icon} size={20} color={priorityColor} />
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          {/* Header row */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: notification.read ? "500" : "700",
                color: colors.text,
                flex: 1,
                marginRight: 8,
              }}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>
              {timeAgo}
            </Text>
          </View>

          {/* Message */}
          <Text
            style={{
              fontSize: 13,
              color: colors.textMuted,
              lineHeight: 18,
            }}
            numberOfLines={2}
          >
            {notification.message}
          </Text>

          {/* Action hint for urgent */}
          {isUrgent && notification.actionType && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: COLORS.brandPrimary }}>
                Tap to view details
              </Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.brandPrimary} />
            </View>
          )}
        </View>

        {/* Unread indicator */}
        {!notification.read && (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: COLORS.brandPrimary,
              marginLeft: 8,
              marginTop: 6,
            }}
          />
        )}
      </View>
    </Pressable>
  );
}


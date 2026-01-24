import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";
import { getNotificationIcon, getPriorityColor, getRelativeTime, NOTIFICATION_PRIORITY } from "../../constants/notifications";

export default function NotificationCard({ notification, onPress, onMarkRead, onDelete, isSelectMode = false, isSelected = false, onToggleSelection }) {
  const { isDarkMode } = useTheme();

  // Check for explicit icon/color first, then fall back to defaults
  const icon = notification.icon || getNotificationIcon(notification.type);
  const priorityColor = notification.color || getPriorityColor(notification.priority);
  const timeAgo = getRelativeTime(notification.timestamp);

  const activeBG = isSelected
    ? (COLORS.brandPrimary + "20")
    : !notification.read
      ? (isDarkMode ? COLORS.bgDarkAlt : "#FFF")
      : (isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)");

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isSelectMode) { onToggleSelection?.(notification.id); return; }
    if (!notification.read) onMarkRead?.(notification.id);
    onPress?.(notification);
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={!isSelectMode ? () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onDelete?.(notification.id); } : undefined}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: activeBG,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          shadowColor: !notification.read ? priorityColor : "#000",
          shadowOpacity: isDarkMode ? 0.3 : 0.08,
        }
      ]}
    >
      <View style={styles.row}>
        {/* ICON IDENTITY: 14px Nested Squircle */}
        <View style={[styles.iconBox, { backgroundColor: priorityColor + '15' }]}>
          <Ionicons name={icon} size={22} color={priorityColor} />
          {!notification.read && <View style={[styles.unreadPulse, { backgroundColor: priorityColor }]} />}
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={[styles.subtitle, { color: priorityColor }]}>
              {notification.priority.toUpperCase()}
            </Text>
            <Text style={[styles.timeText, { color: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted }]}>
              {timeAgo.toUpperCase()}
            </Text>
          </View>

          <Text style={[styles.title, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]} numberOfLines={1}>
            {notification.title}
          </Text>

          <Text style={[styles.message, { color: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted }]} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>

        {/* THE CORNER SEAL SIGNATURE */}
        {isSelected && (
          <View style={styles.cornerSeal}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.brandPrimary} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 36, // Primary Artifact Layer
    padding: 20,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
    overflow: 'visible',
  },
  row: { flexDirection: "row", alignItems: "center" },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14, // Detail Layer Nesting
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  unreadPulse: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  content: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  subtitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  timeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  title: { fontSize: 17, fontWeight: '900', letterSpacing: -1.0, marginBottom: 2 },
  message: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  cornerSeal: { position: 'absolute', bottom: -6, right: -6 },
});
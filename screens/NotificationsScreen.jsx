// screens/NotificationsScreen.jsx - Notifications center

import { useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  RefreshControl,
  Animated,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../contexts/ThemeContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { COLORS } from "../constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NotificationCard from "../components/notifications/NotificationCard";
import NotificationFilters from "../components/notifications/NotificationFilters";
import * as Haptics from "expo-haptics";

const NotificationsScreen = () => {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  
  const {
    filteredNotifications,
    filter,
    filters,
    filterCounts,
    unreadCount,
    isLoading,
    setFilterType,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  } = useNotifications();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleNotificationPress = useCallback((notification) => {
    // Handle different action types
    if (notification.actionType === "view_appointment") {
      router.push("/(user)/(tabs)/visits");
    } else if (notification.actionType === "track") {
      router.push("/(user)/(tabs)");
    }
  }, [router]);

  const handleMarkAllRead = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    markAllAsRead();
  }, [markAllAsRead]);

  const colors = {
    background: isDarkMode ? COLORS.bgDark : COLORS.bgLight,
    text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
    textMuted: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted,
    card: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt,
  };

  const hasNotifications = filteredNotifications.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshNotifications}
            tintColor={COLORS.brandPrimary}
            colors={[COLORS.brandPrimary]}
          />
        }
      >
        {/* Header */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            marginBottom: 20,
          }}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                Notifications
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
              </Text>
            </View>
            {unreadCount > 0 && (
              <Pressable
                onPress={handleMarkAllRead}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: `${COLORS.brandPrimary}10`,
                })}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.brandPrimary }}>
                  Mark all read
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* Filters */}
        <NotificationFilters
          filters={filters}
          selectedFilter={filter}
          onSelect={setFilterType}
          counts={filterCounts}
        />

        {/* Notification Cards or Empty State */}
        {hasNotifications ? (
          <Animated.View style={{ opacity: fadeAnim }}>
            {filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onPress={handleNotificationPress}
                onMarkRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))}
          </Animated.View>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <Ionicons
              name="notifications-off-outline"
              size={64}
              color={COLORS.brandPrimary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Notifications
            </Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {filter === "unread"
                ? "You're all caught up!"
                : "No notifications to display"}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { flexGrow: 1, padding: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40, borderRadius: 20, marginTop: 40 },
  emptyTitle: { fontSize: 20, fontWeight: "bold", marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});

export default NotificationsScreen;


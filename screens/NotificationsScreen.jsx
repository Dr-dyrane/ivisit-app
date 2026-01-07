"use client";

import { useRef, useCallback } from "react";
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
import { useRouter, useFocusEffect } from "expo-router";
import { useTheme } from "../contexts/ThemeContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { COLORS } from "../constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NotificationCard from "../components/notifications/NotificationCard";
import NotificationFilters from "../components/notifications/NotificationFilters";
import * as Haptics from "expo-haptics";
import HeaderBackButton from "../components/navigation/HeaderBackButton";

const NotificationsScreen = () => {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const fadeAnim = useRef(new Animated.Value(1)).current;

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

	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();

	const backButton = useCallback(() => <HeaderBackButton />, []);

	const rightComponent = useCallback(
		() =>
			unreadCount > 0 ? (
				<Pressable
					onPress={() => {
						Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
						markAllAsRead();
					}}
					style={({ pressed }) => ({
						opacity: pressed ? 0.7 : 1,
					})}
					hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
				>
					<Ionicons
						name="checkmark-done"
						size={24}
						color={isDarkMode ? COLORS.textLight : COLORS.textPrimary}
					/>
				</Pressable>
			) : null,
		[unreadCount, markAllAsRead, isDarkMode]
	);

	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: "Notifications",
				subtitle: unreadCount > 0 ? `${unreadCount} UNREAD` : "ALL CAUGHT UP",
				icon: <Ionicons name="notifications" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				badge: null,
				leftComponent: backButton(),
				rightComponent: rightComponent(),
			});
		}, [
			setHeaderState,
			backButton,
			rightComponent,
			unreadCount,
			resetTabBar,
			resetHeader,
		])
	);

	const handleScroll = useCallback(
		(event) => {
			handleTabBarScroll(event);
			handleHeaderScroll(event);
		},
		[handleTabBarScroll, handleHeaderScroll]
	);

	const handleNotificationPress = useCallback((notification) => {}, [router]);

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

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;
	const headerHeight = 70;
	const topPadding = 20;

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[
					styles.content,
					{ paddingTop: topPadding, paddingBottom: bottomPadding },
				]}
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
				onScroll={handleScroll}
				refreshControl={
					<RefreshControl
						refreshing={isLoading}
						onRefresh={refreshNotifications}
						tintColor={COLORS.brandPrimary}
						colors={[COLORS.brandPrimary]}
					/>
				}
			>
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
	emptyState: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 40,
		borderRadius: 20,
		marginTop: 40,
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: "bold",
		marginTop: 16,
		marginBottom: 8,
	},
	emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});

export default NotificationsScreen;
